-- Cloud saves: one row per save slot, the zip itself lives in R2 (r2_key).
-- owner is a short SHA-256 of the Cloudflare Access email, never the email.
CREATE TABLE IF NOT EXISTS cloud_saves (
  owner         TEXT    NOT NULL,
  slot_id       TEXT    NOT NULL,
  revision      INTEGER NOT NULL,
  name          TEXT,
  country       TEXT,
  game_date     TEXT,
  round         INTEGER,
  scenario_name TEXT,
  device        TEXT,
  bytes         INTEGER,
  r2_key        TEXT    NOT NULL,
  created_at    TEXT    NOT NULL,
  updated_at    TEXT    NOT NULL,
  PRIMARY KEY (owner, slot_id)
);

-- Append-only: one line per upload. Kept for later analysis of how campaigns
-- progress (rounds, dates, countries over time); nothing in the game reads it.
CREATE TABLE IF NOT EXISTS cloud_save_log (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  owner     TEXT    NOT NULL,
  slot_id   TEXT    NOT NULL,
  revision  INTEGER NOT NULL,
  round     INTEGER,
  game_date TEXT,
  country   TEXT,
  device    TEXT,
  bytes     INTEGER,
  saved_at  TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS cloud_save_log_slot ON cloud_save_log (owner, slot_id, revision);
