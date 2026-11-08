// Cloud saves for the self-hosted website (belvenar-historia).
//
// The site itself stays static: every path that is not /cloud/* is handed to
// the assets binding untouched, so the game's IndexedDB backend works exactly
// as before. /cloud/* is the one thing this Worker answers:
//
//   GET    /cloud/v1/me                    who Cloudflare Access says is signed in
//   GET    /cloud/v1/saves                 that player's cloud save slots (D1)
//   PUT    /cloud/v1/saves/:slot           upload a game zip (R2) as the slot's next revision
//   GET    /cloud/v1/saves/:slot/file      download the slot's current zip
//   DELETE /cloud/v1/saves/:slot           remove a slot and its file
//
// Identity: the site is behind Cloudflare Access, which signs every request it
// lets through with a JWT (Cf-Access-Jwt-Assertion). That token is VERIFIED
// here (signature, audience, issuer, expiry), never just trusted, because a
// Worker can be reached on addresses Access may not cover (preview URLs). With
// ACCESS_TEAM_DOMAIN or ACCESS_AUD unset, every /cloud call is refused.
//
// Storage: a slot's metadata row lives in D1 (cloud_saves) and its zip in R2,
// one object per revision. A new revision is written to R2 first, then claimed
// in D1 with a conditional update on the revision the device last saw; if
// another device got there first the claim fails, the new object is deleted and
// the device is told (409) instead of silently overwriting newer progress.

const SLOT_ID = /^[A-Za-z0-9_-]{8,64}$/;
const MAX_UPLOAD_BYTES = 95 * 1024 * 1024; // Workers accept 100 MB bodies on the free plan.
const CERTS_TTL_MS = 60 * 60 * 1000;

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });

const fail = (status, error, extra = {}) => json({ error, ...extra }, status);

// ---------------------------------------------------------------- Access JWT

const b64urlToBytes = (text) => {
  const base64 = text.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(text.length / 4) * 4, "=");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
};

const decodeJsonPart = (part) => JSON.parse(new TextDecoder().decode(b64urlToBytes(part)));

let certsCache = { url: "", at: 0, keys: [] };

const loadAccessKeys = async (certsUrl, fetchImpl) => {
  if (certsCache.url === certsUrl && Date.now() - certsCache.at < CERTS_TTL_MS && certsCache.keys.length) {
    return certsCache.keys;
  }
  const response = await fetchImpl(certsUrl);
  if (!response.ok) throw new Error(`Access certs answered ${response.status}`);
  const { keys = [] } = await response.json();
  certsCache = { url: certsUrl, at: Date.now(), keys };
  return keys;
};

export const resetAccessKeyCache = () => {
  certsCache = { url: "", at: 0, keys: [] };
};

const normalizeTeamDomain = (value) => {
  const raw = String(value || "").trim().replace(/\/+$/, "");
  if (!raw) return "";
  return raw.startsWith("https://") ? raw : `https://${raw}`;
};

// Resolves to the verified email, or null. Never throws for a bad token.
export const verifyAccessJwt = async (token, env, { fetchImpl = fetch, now = Date.now() } = {}) => {
  const team = normalizeTeamDomain(env.ACCESS_TEAM_DOMAIN);
  const aud = String(env.ACCESS_AUD || "").trim();
  if (!team || !aud || !token) return null;

  const parts = String(token).split(".");
  if (parts.length !== 3) return null;

  let header;
  let payload;
  try {
    header = decodeJsonPart(parts[0]);
    payload = decodeJsonPart(parts[1]);
  } catch {
    return null;
  }
  if (header.alg !== "RS256") return null;

  let keys;
  try {
    keys = await loadAccessKeys(`${team}/cdn-cgi/access/certs`, fetchImpl);
  } catch {
    return null;
  }
  const jwk = keys.find((key) => key.kid === header.kid);
  if (!jwk) return null;

  try {
    const key = await crypto.subtle.importKey(
      "jwk",
      jwk,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"],
    );
    const ok = await crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5",
      key,
      b64urlToBytes(parts[2]),
      new TextEncoder().encode(`${parts[0]}.${parts[1]}`),
    );
    if (!ok) return null;
  } catch {
    return null;
  }

  const seconds = Math.floor(now / 1000);
  const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (!audiences.includes(aud)) return null;
  if (payload.iss !== team) return null;
  if (typeof payload.exp !== "number" || payload.exp < seconds) return null;
  if (typeof payload.nbf === "number" && payload.nbf > seconds + 60) return null;

  const email = String(payload.email || "").trim().toLowerCase();
  return email || null;
};

const readAccessToken = (request) => {
  const header = request.headers.get("cf-access-jwt-assertion");
  if (header) return header;
  const cookie = request.headers.get("cookie") || "";
  const match = cookie.match(/(?:^|;\s*)CF_Authorization=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : "";
};

// ------------------------------------------------------------------- helpers

const ownerKey = async (email) => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(email));
  return Array.from(new Uint8Array(digest).slice(0, 12), (b) => b.toString(16).padStart(2, "0")).join("");
};

const clip = (value, max) => {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text ? text.slice(0, max) : null;
};

const intOrNull = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.trunc(number) : null;
};

const readMeta = (request) => {
  const raw = request.headers.get("x-cloud-meta");
  if (!raw) return {};
  try {
    const parsed = JSON.parse(decodeURIComponent(raw));
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

const rowToSlot = (row) => ({
  slotId: row.slot_id,
  revision: row.revision,
  name: row.name,
  country: row.country,
  gameDate: row.game_date,
  round: row.round,
  scenarioName: row.scenario_name,
  device: row.device,
  bytes: row.bytes,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const getSlotRow = (env, owner, slotId) =>
  env.DB.prepare("SELECT * FROM cloud_saves WHERE owner = ? AND slot_id = ?").bind(owner, slotId).first();

// ------------------------------------------------------------------- routes

const handleList = async (env, owner) => {
  const { results = [] } = await env.DB
    .prepare("SELECT * FROM cloud_saves WHERE owner = ? ORDER BY updated_at DESC")
    .bind(owner)
    .all();
  return json({ saves: results.map(rowToSlot) });
};

const handleUpload = async (request, env, owner, slotId, url) => {
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_UPLOAD_BYTES) {
    return fail(413, "This save is too large to upload (over 95 MB).");
  }
  const body = await request.arrayBuffer();
  if (!body.byteLength) return fail(400, "The upload was empty.");
  if (body.byteLength > MAX_UPLOAD_BYTES) return fail(413, "This save is too large to upload (over 95 MB).");
  const head = new Uint8Array(body, 0, Math.min(4, body.byteLength));
  if (!(head[0] === 0x50 && head[1] === 0x4b)) return fail(400, "That upload is not a game zip.");

  const force = url.searchParams.get("force") === "1";
  const baseParam = url.searchParams.get("baseRevision");
  const baseRevision = baseParam === null || baseParam === "" ? null : intOrNull(baseParam);

  const current = await getSlotRow(env, owner, slotId);
  if (current && !force && baseRevision !== current.revision) {
    return fail(409, "The cloud copy was saved from another device since this one last saw it.", { save: rowToSlot(current) });
  }

  const nextRevision = (current?.revision ?? 0) + 1;
  const r2Key = `saves/${owner}/${slotId}/r${nextRevision}.zip`;
  const meta = readMeta(request);
  const now = new Date().toISOString();
  const fields = {
    name: clip(meta.name, 200),
    country: clip(meta.country, 120),
    gameDate: clip(meta.gameDate, 40),
    round: intOrNull(meta.round),
    scenarioName: clip(meta.scenarioName, 200),
    device: clip(meta.device, 80),
  };

  await env.SAVES.put(r2Key, body, { httpMetadata: { contentType: "application/zip" } });

  let claimed;
  if (current) {
    const result = await env.DB.prepare(
      `UPDATE cloud_saves SET revision = ?, name = ?, country = ?, game_date = ?, round = ?,
         scenario_name = ?, device = ?, bytes = ?, r2_key = ?, updated_at = ?
       WHERE owner = ? AND slot_id = ? AND revision = ?`,
    ).bind(
      nextRevision, fields.name, fields.country, fields.gameDate, fields.round,
      fields.scenarioName, fields.device, body.byteLength, r2Key, now,
      owner, slotId, current.revision,
    ).run();
    claimed = (result?.meta?.changes ?? 0) === 1;
  } else {
    const result = await env.DB.prepare(
      `INSERT OR IGNORE INTO cloud_saves
         (owner, slot_id, revision, name, country, game_date, round, scenario_name, device, bytes, r2_key, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      owner, slotId, nextRevision, fields.name, fields.country, fields.gameDate, fields.round,
      fields.scenarioName, fields.device, body.byteLength, r2Key, now, now,
    ).run();
    claimed = (result?.meta?.changes ?? 0) === 1;
  }

  if (!claimed) {
    await env.SAVES.delete(r2Key);
    const winner = await getSlotRow(env, owner, slotId);
    return fail(409, "Another device saved to this slot at the same moment.", { save: winner ? rowToSlot(winner) : null });
  }

  if (current?.r2_key && current.r2_key !== r2Key) await env.SAVES.delete(current.r2_key);

  // One line per upload, for looking at how campaigns progress later.
  await env.DB.prepare(
    `INSERT INTO cloud_save_log (owner, slot_id, revision, round, game_date, country, device, bytes, saved_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).bind(owner, slotId, nextRevision, fields.round, fields.gameDate, fields.country, fields.device, body.byteLength, now)
    .run()
    .catch(() => {});

  return json({ save: rowToSlot(await getSlotRow(env, owner, slotId)) }, current ? 200 : 201);
};

const handleDownload = async (env, owner, slotId) => {
  const row = await getSlotRow(env, owner, slotId);
  if (!row) return fail(404, "That cloud save no longer exists.");
  const object = await env.SAVES.get(row.r2_key);
  if (!object) return fail(404, "That cloud save's file is missing.");
  return new Response(object.body, {
    headers: {
      "content-type": "application/zip",
      "cache-control": "no-store",
      "x-cloud-revision": String(row.revision),
    },
  });
};

const handleDelete = async (env, owner, slotId) => {
  const row = await getSlotRow(env, owner, slotId);
  if (!row) return json({ deleted: false });
  await env.DB.prepare("DELETE FROM cloud_saves WHERE owner = ? AND slot_id = ?").bind(owner, slotId).run();
  await env.SAVES.delete(row.r2_key);
  return json({ deleted: true });
};

export const handleCloud = async (request, env, { fetchImpl = fetch } = {}) => {
  const url = new URL(request.url);
  const email = await verifyAccessJwt(readAccessToken(request), env, { fetchImpl });
  if (!email) return fail(401, "Not signed in through Cloudflare Access.");
  if (!env.DB || !env.SAVES) return fail(503, "Cloud saves are not configured on this site.");

  const owner = await ownerKey(email);
  const path = url.pathname.replace(/\/+$/, "");
  const method = request.method.toUpperCase();

  if (path === "/cloud/v1/me" && method === "GET") return json({ email });
  if (path === "/cloud/v1/saves" && method === "GET") return handleList(env, owner);

  const match = path.match(/^\/cloud\/v1\/saves\/([^/]+)(\/file)?$/);
  if (match) {
    const slotId = decodeURIComponent(match[1]);
    if (!SLOT_ID.test(slotId)) return fail(400, "Bad save id.");
    if (match[2]) {
      if (method === "GET") return handleDownload(env, owner, slotId);
    } else if (method === "PUT") {
      return handleUpload(request, env, owner, slotId, url);
    } else if (method === "DELETE") {
      return handleDelete(env, owner, slotId);
    }
    return fail(405, "Method not allowed.");
  }
  return fail(404, "Not found.");
};

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (pathname === "/cloud" || pathname.startsWith("/cloud/")) {
      try {
        return await handleCloud(request, env);
      } catch (error) {
        console.error("cloud saves", error);
        return fail(500, "The cloud save service failed. Try again.");
      }
    }
    return env.ASSETS.fetch(request);
  },
};
