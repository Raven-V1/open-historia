// Cloud saves: a game's export zip kept in the website's own cloud storage
// (cloud/worker.js: an R2 file per save, a D1 row listing it), so a campaign
// started on one device can be carried on from another.
//
// Nothing here replaces the library: games still live in this browser's store,
// and a cloud save is the very zip Export makes (runtime/gameZip.js), opened on
// another device the way Import opens one. Only a site that answers /cloud/v1/me
// offers it; everywhere else (the desktop app, a site without the Worker) the
// probe fails and no cloud control is shown.
//
// Which local game belongs to which cloud save is kept on this device
// (localStorage, LINKS_KEY): { [localGameId]: { slotId, revision, syncedRound,
// syncedDate, conflict? } }. The revision is the one this device last uploaded
// or opened; an upload names it, and the Worker refuses one made from an older
// revision (409), so a phone that fell behind cannot silently overwrite the
// laptop's newer turns.
import { useSyncExternalStore } from "react";
import { buildGameZipBlob } from "./gameZip.js";
import { getLibraryState } from "./library.js";

const API = "/cloud/v1";
const LINKS_KEY = "oh-cloud-links-v1";
const DEVICE_KEY = "oh-cloud-device-v1";

// After a game linked to the cloud has moved on this many rounds, its new state
// is uploaded by itself once the game has been quiet for AUTO_QUIET_MS.
export const AUTO_SAVE_EVERY_ROUNDS = 3;
const AUTO_QUIET_MS = 20_000;

// ------------------------------------------------------------- local records

const storage = () => {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
};

export const readCloudLinks = () => {
  try {
    const parsed = JSON.parse(storage()?.getItem(LINKS_KEY) || "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
};

const writeCloudLinks = (links) => {
  try {
    storage()?.setItem(LINKS_KEY, JSON.stringify(links));
  } catch {
    /* storage full or blocked: the link is lost, the cloud save is not */
  }
  publish();
};

export const setCloudLink = (gameId, link) => {
  const links = readCloudLinks();
  if (link) links[gameId] = link;
  else delete links[gameId];
  writeCloudLinks(links);
};

export const localGameForSlot = (slotId, links = readCloudLinks()) =>
  Object.keys(links).find((gameId) => links[gameId]?.slotId === slotId) ?? null;

// A short name for this device, shown on each cloud save ("saved from Android").
export const describeDevice = (userAgent = typeof navigator === "undefined" ? "" : navigator.userAgent) => {
  const ua = String(userAgent);
  if (/Android/i.test(ua)) return "Android";
  if (/iPhone|iPad|iPod/i.test(ua)) return "iPhone or iPad";
  if (/Windows/i.test(ua)) return "Windows";
  if (/Macintosh|Mac OS X/i.test(ua)) return "Mac";
  if (/CrOS/i.test(ua)) return "Chromebook";
  if (/Linux/i.test(ua)) return "Linux";
  return "Browser";
};

export const deviceName = () => storage()?.getItem(DEVICE_KEY) || describeDevice();

// Whether the local game has turns the cloud copy it is linked to does not.
export const hasUnsyncedProgress = (game, link) => {
  if (!game || !link) return false;
  const round = Number(game.round) || 1;
  const synced = Number(link.syncedRound) || 1;
  const date = String(game.currentDate ?? game.gameDate ?? "");
  const syncedDate = String(link.syncedDate || "");
  return round > synced || (round === synced && Boolean(date) && Boolean(syncedDate) && date !== syncedDate);
};

// ------------------------------------------------------------------- state

let state = { checked: false, enabled: false, email: "", saves: [], error: "", working: "" };
let links = readCloudLinks();
const listeners = new Set();
const snapshot = () => ({ ...state, links });
let current = snapshot();

function publish() {
  links = readCloudLinks();
  current = snapshot();
  for (const listener of listeners) listener();
}

const setState = (patch) => {
  state = { ...state, ...patch };
  publish();
};

export const getCloudState = () => current;
export const subscribeCloudState = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
export const useCloudSaves = () => useSyncExternalStore(subscribeCloudState, getCloudState, getCloudState);

// ------------------------------------------------------------------ requests

const readError = async (response) => {
  try {
    const body = await response.json();
    return body?.error || `HTTP ${response.status}`;
  } catch {
    return `HTTP ${response.status}`;
  }
};

const cloudFetch = (path, init) => fetch(`${API}${path}`, { credentials: "same-origin", cache: "no-store", ...init });

let probe = null;
// Once a page: does this site keep cloud saves, and who is signed in?
export const checkCloudSaves = () => {
  probe ??= (async () => {
    try {
      const response = await cloudFetch("/me");
      const type = response.headers.get("content-type") || "";
      if (!response.ok || !type.includes("application/json")) {
        setState({ checked: true, enabled: false });
        return false;
      }
      const { email = "" } = await response.json();
      setState({ checked: true, enabled: true, email });
      await refreshCloudSaves();
      return true;
    } catch {
      setState({ checked: true, enabled: false });
      return false;
    }
  })();
  return probe;
};

export const refreshCloudSaves = async () => {
  try {
    const response = await cloudFetch("/saves");
    if (!response.ok) throw new Error(await readError(response));
    const { saves = [] } = await response.json();
    setState({ saves, error: "" });
    return saves;
  } catch (error) {
    setState({ error: error.message });
    return state.saves;
  }
};

const newSlotId = () =>
  (typeof crypto !== "undefined" && crypto.randomUUID)
    ? crypto.randomUUID()
    : `s${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;

// Uploads `game` (a library card entry) as its cloud save's next revision.
// Resolves to { save } on success, { conflict: save } when another device has
// saved to it since this one last saw it (retry with force to overwrite), or
// throws with something a player can read.
export const uploadGameToCloud = async (game, { force = false, live = null } = {}) => {
  const link = readCloudLinks()[game.id] ?? null;
  const slotId = link?.slotId ?? newSlotId();
  setState({ working: game.id });
  try {
    // The map always travels when no other device could fetch it: a cloud save
    // the other device cannot open is no save at all.
    const result = await buildGameZipBlob(game.id, { confirmCarryingScenario: () => true });
    if (!result?.blob) throw new Error("This game could not be packed for the cloud.");

    const round = Number(live?.round ?? game.round) || 1;
    const gameDate = String(live?.gameDate ?? game.currentDate ?? game.gameDate ?? "");
    const meta = {
      name: game.name,
      country: game.country,
      gameDate,
      round,
      scenarioName: game.scenarioName,
      device: deviceName(),
    };
    const query = new URLSearchParams();
    if (link?.revision) query.set("baseRevision", String(link.revision));
    if (force) query.set("force", "1");
    const response = await cloudFetch(`/saves/${encodeURIComponent(slotId)}?${query}`, {
      method: "PUT",
      body: result.blob,
      headers: {
        "content-type": "application/zip",
        "x-cloud-meta": encodeURIComponent(JSON.stringify(meta)),
      },
    });
    if (response.status === 409) {
      const body = await response.json().catch(() => ({}));
      setCloudLink(game.id, { ...(link ?? { slotId }), conflict: body.save ?? { updatedAt: "" } });
      return { conflict: body.save ?? null };
    }
    if (!response.ok) throw new Error(await readError(response));

    const { save } = await response.json();
    setCloudLink(game.id, { slotId, revision: save.revision, syncedRound: round, syncedDate: gameDate });
    await refreshCloudSaves();
    return { save, oversizeScenario: result.oversizeScenario ?? null };
  } finally {
    setState({ working: "" });
  }
};

export const downloadCloudSave = async (slotId) => {
  const response = await cloudFetch(`/saves/${encodeURIComponent(slotId)}/file`);
  if (!response.ok) throw new Error(await readError(response));
  return response.arrayBuffer();
};

export const deleteCloudSave = async (slotId) => {
  const response = await cloudFetch(`/saves/${encodeURIComponent(slotId)}`, { method: "DELETE" });
  if (!response.ok) throw new Error(await readError(response));
  const all = readCloudLinks();
  for (const gameId of Object.keys(all)) if (all[gameId]?.slotId === slotId) delete all[gameId];
  writeCloudLinks(all);
  await refreshCloudSaves();
};

// ----------------------------------------------------------------- auto save

let autoStarted = false;
let quietTimer = null;
let autoRunning = false;
let latestGame = null;

const runAutoSave = async () => {
  quietTimer = null;
  if (autoRunning || !state.enabled) return;
  const library = getLibraryState();
  const gameId = library?.activeGameId;
  const link = gameId ? readCloudLinks()[gameId] : null;
  if (!link || link.conflict) return;
  const round = Number(latestGame?.round) || 0;
  if (round - (Number(link.syncedRound) || 1) < AUTO_SAVE_EVERY_ROUNDS) return;
  const entry = (library?.games ?? []).find((game) => game.id === gameId);
  if (!entry) return;

  autoRunning = true;
  try {
    await uploadGameToCloud(entry, { live: latestGame });
  } catch (error) {
    setState({ error: `Auto-save to the cloud failed: ${error.message}` });
  } finally {
    autoRunning = false;
  }
};

// Listens for the open game moving on (every turn writes game.json, which the
// runtime announces as oh:game-updated) and uploads a linked game once it has
// gone AUTO_SAVE_EVERY_ROUNDS rounds past its last cloud save and then stayed
// quiet, so the zip is never built in the middle of a turn being written.
export const startCloudAutoSave = () => {
  if (autoStarted || typeof window === "undefined") return;
  autoStarted = true;
  window.addEventListener("oh:game-updated", (event) => {
    const game = event?.detail?.game;
    if (!game || typeof game !== "object") return;
    latestGame = { round: game.round, gameDate: game.gameDate };
    if (quietTimer) clearTimeout(quietTimer);
    quietTimer = setTimeout(runAutoSave, AUTO_QUIET_MS);
  });
};
