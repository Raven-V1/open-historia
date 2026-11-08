import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import worker, { verifyAccessJwt, resetAccessKeyCache } from "./worker.js";

const TEAM = "https://belvenar.cloudflareaccess.com";
const AUD = "test-aud-123";

// D1's prepared-statement surface over a real SQLite database.
const fakeD1 = () => {
  const db = new DatabaseSync(":memory:");
  db.exec(readFileSync(new URL("./schema.sql", import.meta.url), "utf8"));
  const statement = (sql, params = []) => ({
    bind: (...values) => statement(sql, values),
    first: async () => db.prepare(sql).get(...params) ?? null,
    all: async () => ({ results: db.prepare(sql).all(...params) }),
    run: async () => {
      const info = db.prepare(sql).run(...params);
      return { meta: { changes: Number(info.changes) } };
    },
  });
  return { prepare: (sql) => statement(sql), raw: db };
};

const fakeR2 = () => {
  const objects = new Map();
  return {
    objects,
    put: async (key, value) => { objects.set(key, new Uint8Array(value)); },
    get: async (key) => (objects.has(key) ? { body: objects.get(key) } : null),
    delete: async (key) => { objects.delete(key); },
  };
};

const b64url = (bytes) =>
  Buffer.from(bytes).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

let keyPair;
let certsBody;
const signToken = async (claims, { kid = "k1", pair = keyPair } = {}) => {
  const header = b64url(Buffer.from(JSON.stringify({ alg: "RS256", kid })));
  const payload = b64url(Buffer.from(JSON.stringify(claims)));
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", pair.privateKey, new TextEncoder().encode(`${header}.${payload}`));
  return `${header}.${payload}.${b64url(new Uint8Array(signature))}`;
};
const goodClaims = (email = "Carlos@Example.com") => ({
  aud: [AUD], iss: TEAM, email, exp: Math.floor(Date.now() / 1000) + 600,
});

const fetchCerts = async (url) => {
  assert.equal(url, `${TEAM}/cdn-cgi/access/certs`);
  return new Response(JSON.stringify(certsBody));
};

const zipBytes = (fill = 1, length = 64) => {
  const bytes = new Uint8Array(length).fill(fill);
  bytes[0] = 0x50; bytes[1] = 0x4b; bytes[2] = 3; bytes[3] = 4;
  return bytes;
};

let env;
const call = async (method, path, { token, body, meta, headers = {} } = {}) => {
  const original = globalThis.fetch;
  globalThis.fetch = fetchCerts;
  try {
    const request = new Request(`https://belvenar-historia.example.workers.dev${path}`, {
      method,
      body,
      headers: {
        ...(token ? { "cf-access-jwt-assertion": token } : {}),
        ...(meta ? { "x-cloud-meta": encodeURIComponent(JSON.stringify(meta)) } : {}),
        ...headers,
      },
    });
    return await worker.fetch(request, env);
  } finally {
    globalThis.fetch = original;
  }
};

beforeEach(async () => {
  resetAccessKeyCache();
  keyPair ??= await crypto.subtle.generateKey(
    { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
    true,
    ["sign", "verify"],
  );
  const jwk = await crypto.subtle.exportKey("jwk", keyPair.publicKey);
  certsBody = { keys: [{ ...jwk, kid: "k1", alg: "RS256" }] };
  env = {
    ACCESS_TEAM_DOMAIN: "belvenar.cloudflareaccess.com",
    ACCESS_AUD: AUD,
    DB: fakeD1(),
    SAVES: fakeR2(),
    ASSETS: { fetch: async () => new Response("static", { status: 200 }) },
  };
});

test("non-cloud paths go to the static assets untouched", async () => {
  const response = await call("GET", "/play/index.html");
  assert.equal(await response.text(), "static");
});

test("a valid Access token is accepted and the email is lower-cased", async () => {
  const token = await signToken(goodClaims());
  const response = await call("GET", "/cloud/v1/me", { token });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { email: "carlos@example.com" });
});

test("missing, forged, expired, wrong-audience and wrong-issuer tokens are refused", async () => {
  assert.equal((await call("GET", "/cloud/v1/me")).status, 401);

  const otherPair = await crypto.subtle.generateKey(
    { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
    true,
    ["sign", "verify"],
  );
  const forged = await signToken(goodClaims(), { pair: otherPair });
  assert.equal((await call("GET", "/cloud/v1/me", { token: forged })).status, 401);

  const expired = await signToken({ ...goodClaims(), exp: Math.floor(Date.now() / 1000) - 5 });
  assert.equal((await call("GET", "/cloud/v1/me", { token: expired })).status, 401);

  const wrongAud = await signToken({ ...goodClaims(), aud: ["someone-else"] });
  assert.equal((await call("GET", "/cloud/v1/me", { token: wrongAud })).status, 401);

  const wrongIss = await signToken({ ...goodClaims(), iss: "https://evil.cloudflareaccess.com" });
  assert.equal((await call("GET", "/cloud/v1/me", { token: wrongIss })).status, 401);
});

test("with Access not configured every cloud call is refused (fails closed)", async () => {
  const token = await signToken(goodClaims());
  assert.equal(await verifyAccessJwt(token, { ACCESS_AUD: AUD }, { fetchImpl: fetchCerts }), null);
  assert.equal(await verifyAccessJwt(token, { ACCESS_TEAM_DOMAIN: TEAM }, { fetchImpl: fetchCerts }), null);
});

test("upload, list, download and delete a slot", async () => {
  const token = await signToken(goodClaims());
  const meta = { name: "Mexico 1857", country: "Mexico", gameDate: "1859-03-01", round: 12, device: "Windows PC" };

  const created = await call("PUT", "/cloud/v1/saves/slot-abc-123", { token, body: zipBytes(1), meta });
  assert.equal(created.status, 201);
  const { save } = await created.json();
  assert.equal(save.revision, 1);
  assert.equal(save.round, 12);
  assert.equal(save.bytes, 64);

  const list = await (await call("GET", "/cloud/v1/saves", { token })).json();
  assert.equal(list.saves.length, 1);
  assert.equal(list.saves[0].name, "Mexico 1857");

  const file = await call("GET", "/cloud/v1/saves/slot-abc-123/file", { token });
  assert.equal(file.status, 200);
  assert.equal(file.headers.get("x-cloud-revision"), "1");
  assert.deepEqual(new Uint8Array(await file.arrayBuffer()), zipBytes(1));

  const removed = await call("DELETE", "/cloud/v1/saves/slot-abc-123", { token });
  assert.deepEqual(await removed.json(), { deleted: true });
  assert.equal(env.SAVES.objects.size, 0);
  assert.equal((await (await call("GET", "/cloud/v1/saves", { token })).json()).saves.length, 0);
});

test("a second revision replaces the first file and logs both uploads", async () => {
  const token = await signToken(goodClaims());
  await call("PUT", "/cloud/v1/saves/slot-abc-123", { token, body: zipBytes(1), meta: { round: 1 } });
  const second = await call("PUT", "/cloud/v1/saves/slot-abc-123?baseRevision=1", { token, body: zipBytes(2), meta: { round: 4 } });
  assert.equal(second.status, 200);
  assert.equal((await second.json()).save.revision, 2);
  assert.deepEqual([...env.SAVES.objects.keys()].map((k) => k.split("/").pop()), ["r2.zip"]);
  const log = env.DB.raw.prepare("SELECT revision, round FROM cloud_save_log ORDER BY id").all();
  assert.deepEqual(log.map((row) => [row.revision, row.round]), [[1, 1], [2, 4]]);
});

test("a stale device gets 409 and nothing is overwritten; force overrides", async () => {
  const token = await signToken(goodClaims());
  await call("PUT", "/cloud/v1/saves/slot-abc-123", { token, body: zipBytes(1) });
  await call("PUT", "/cloud/v1/saves/slot-abc-123?baseRevision=1", { token, body: zipBytes(2) });

  const stale = await call("PUT", "/cloud/v1/saves/slot-abc-123?baseRevision=1", { token, body: zipBytes(3) });
  assert.equal(stale.status, 409);
  assert.equal((await stale.json()).save.revision, 2);
  assert.equal(env.SAVES.objects.size, 1);
  const kept = await call("GET", "/cloud/v1/saves/slot-abc-123/file", { token });
  assert.equal(new Uint8Array(await kept.arrayBuffer())[10], 2);

  const forced = await call("PUT", "/cloud/v1/saves/slot-abc-123?baseRevision=1&force=1", { token, body: zipBytes(3) });
  assert.equal(forced.status, 200);
  assert.equal((await forced.json()).save.revision, 3);
});

test("one player cannot see or touch another player's slots", async () => {
  const carlos = await signToken(goodClaims("carlos@example.com"));
  const other = await signToken(goodClaims("someone@example.com"));
  await call("PUT", "/cloud/v1/saves/slot-abc-123", { token: carlos, body: zipBytes(1) });

  assert.equal((await (await call("GET", "/cloud/v1/saves", { token: other })).json()).saves.length, 0);
  assert.equal((await call("GET", "/cloud/v1/saves/slot-abc-123/file", { token: other })).status, 404);
  assert.deepEqual(await (await call("DELETE", "/cloud/v1/saves/slot-abc-123", { token: other })).json(), { deleted: false });
  assert.equal(env.SAVES.objects.size, 1);
});

test("non-zip uploads and bad slot ids are rejected", async () => {
  const token = await signToken(goodClaims());
  const notZip = await call("PUT", "/cloud/v1/saves/slot-abc-123", { token, body: new Uint8Array([1, 2, 3, 4]) });
  assert.equal(notZip.status, 400);
  const badId = await call("PUT", "/cloud/v1/saves/..%2Fescape", { token, body: zipBytes() });
  assert.equal(badId.status, 400);
  assert.equal(env.SAVES.objects.size, 0);
});
