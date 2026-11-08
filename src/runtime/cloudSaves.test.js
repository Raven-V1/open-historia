import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";

const memory = new Map();
globalThis.localStorage = {
  getItem: (key) => (memory.has(key) ? memory.get(key) : null),
  setItem: (key, value) => memory.set(key, String(value)),
  removeItem: (key) => memory.delete(key),
};

const {
  describeDevice,
  hasUnsyncedProgress,
  localGameForSlot,
  readCloudLinks,
  setCloudLink,
  getCloudState,
} = await import("./cloudSaves.js");

beforeEach(() => memory.clear());

test("devices are named from the user agent", () => {
  assert.equal(describeDevice("Mozilla/5.0 (Linux; Android 14; Pixel 8)"), "Android");
  assert.equal(describeDevice("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)"), "iPhone or iPad");
  assert.equal(describeDevice("Mozilla/5.0 (Windows NT 10.0; Win64; x64)"), "Windows");
  assert.equal(describeDevice("Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0)"), "Mac");
  assert.equal(describeDevice("Mozilla/5.0 (X11; Linux x86_64)"), "Linux");
  assert.equal(describeDevice(""), "Browser");
});

test("unsynced progress is a later round, or the same round on another date", () => {
  const link = { syncedRound: 5, syncedDate: "1860-01-01" };
  assert.equal(hasUnsyncedProgress({ round: 5, gameDate: "1860-01-01" }, link), false);
  assert.equal(hasUnsyncedProgress({ round: 6, gameDate: "1860-04-01" }, link), true);
  assert.equal(hasUnsyncedProgress({ round: 5, gameDate: "1860-02-01" }, link), true);
  assert.equal(hasUnsyncedProgress({ round: 4, gameDate: "1859-10-01" }, link), false);
  // The library's cards name the date currentDate; an unknown date on either side is no evidence.
  assert.equal(hasUnsyncedProgress({ round: 5, currentDate: "1860-02-01" }, link), true);
  assert.equal(hasUnsyncedProgress({ round: 5, currentDate: "1860-01-01" }, link), false);
  assert.equal(hasUnsyncedProgress({ round: 5, currentDate: "1860-02-01" }, { syncedRound: 5, syncedDate: "" }), false);
  assert.equal(hasUnsyncedProgress(null, link), false);
  assert.equal(hasUnsyncedProgress({ round: 9 }, null), false);
});

test("links are kept per local game and found by their cloud slot", () => {
  setCloudLink("mexico-1857", { slotId: "slot-1", revision: 2, syncedRound: 10 });
  setCloudLink("other", { slotId: "slot-2", revision: 1, syncedRound: 1 });
  assert.equal(localGameForSlot("slot-1"), "mexico-1857");
  assert.equal(localGameForSlot("missing"), null);
  assert.equal(getCloudState().links["other"].slotId, "slot-2");

  setCloudLink("mexico-1857", null);
  assert.deepEqual(Object.keys(readCloudLinks()), ["other"]);
});

test("a corrupt link record reads as none", () => {
  memory.set("oh-cloud-links-v1", "{not json");
  assert.deepEqual(readCloudLinks(), {});
  memory.set("oh-cloud-links-v1", "[1,2]");
  assert.deepEqual(readCloudLinks(), {});
});
