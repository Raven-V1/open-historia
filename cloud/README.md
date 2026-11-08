# Cloud saves (belvenar-historia)

Lets a game saved on one device be opened on another. The site stays the static
`dist-web` build; a small Worker (`worker.js`) answers only `/cloud/*`:

- **Identity**: Cloudflare Access. The Worker verifies the `Cf-Access-Jwt-Assertion`
  token (signature, audience, issuer, expiry) and keys saves by a hash of the email.
  With `ACCESS_TEAM_DOMAIN` or `ACCESS_AUD` unset, every cloud call is refused.
- **Files**: R2 bucket `belvenar-historia-saves`, one zip per save revision (the same
  zip the game's Export makes, so a custom scenario travels with it).
- **Index**: D1 database `belvenar-historia`: `cloud_saves` (one row per save slot)
  and `cloud_save_log` (one row per upload: round, in-game date, country, device,
  size, time; nothing in the game reads it, it is there for later analysis).

In the game: a game card's menu has **Save to cloud**; the Games page has a **Cloud
saves** shelf with **Open** and delete. A game saved to the cloud uploads itself
again every 3 rounds while played on that device. If another device saved since,
the upload stops and asks before replacing anything; opening a newer cloud copy
moves this device's older copy to Recently deleted.

## One-time setup

Run from the repo root, logged in with `npx wrangler login`.

```bash
# 1. R2 (enable R2 in the dashboard first: R2 Object Storage → Purchase / enable; free tier)
npx wrangler r2 bucket create belvenar-historia-saves

# 2. D1: create, paste the printed database_id into wrangler.jsonc, then create the tables
npx wrangler d1 create belvenar-historia
npx wrangler d1 execute belvenar-historia --remote --file cloud/schema.sql
```

3. In `wrangler.jsonc`, fill in the two Access values:
   - `ACCESS_TEAM_DOMAIN`: Zero Trust → Settings → Custom pages → Team domain
     (`<team>.cloudflareaccess.com`).
   - `ACCESS_AUD`: Zero Trust → Access → Applications → the belvenar-historia app →
     Overview → Application Audience (AUD) Tag.

```bash
# 4. Build and deploy (Worker + static assets together)
npm run build:web
npx wrangler deploy
```

5. Check it: open the site (log in through Access) and visit `/cloud/v1/me`. It should
   show your email. The Games page then shows the Cloud saves shelf.

## Checking the data

```bash
npx wrangler d1 execute belvenar-historia --remote \
  --command "SELECT name, revision, round, game_date, device, bytes, updated_at FROM cloud_saves"
npx wrangler d1 execute belvenar-historia --remote \
  --command "SELECT revision, round, game_date, country, saved_at FROM cloud_save_log ORDER BY id DESC LIMIT 20"
```

## Tests

`node --test cloud/worker.test.js` (part of `npm test`): auth refusals, upload,
list, download, delete, revision conflicts and per-player isolation, against real
SQLite standing in for D1.
