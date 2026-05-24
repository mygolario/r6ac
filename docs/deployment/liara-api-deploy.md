# Deploying r6ac-api to Liara

## API token security

If a token was ever shared in chat or committed by mistake:

1. Liara Console → **Settings** → **API Tokens** → revoke the old token.
2. Create a new token and set it only in your shell (never in git):

```powershell
$env:LIARA_API_TOKEN = "your-new-token"
```

CI uses the `LIARA_TOKEN` GitHub secret (same value). See [github-secrets.md](./github-secrets.md).

---

## Why a deploy shows "معلق" (Pending)

Upload and Docker **build often already succeeded** (you will see an image in تاریخچه). Pending usually means **zero-downtime rollout** is waiting for a health check before switching traffic.

| Symptom | Meaning |
|---------|---------|
| Image URL present, no end time | Build done; rollout stuck |
| Apps overview "روشن" | Old release still serving |
| No deployment logs | Tiny Dockerfile; check **رویدادها** / app **لاگ‌ها** |

`pnpm deploy:api` now ships a `healthCheck` on `/health/live` (always HTTP 200) so Liara can promote the new release.

### Console quick fix

1. **تاریخچه** → **لغو** on pending releases.
2. **تنظیمات** → disable **استقرار بدون اختلال** (zero-downtime) if you need an immediate unblock.
3. Redeploy: `pnpm deploy:api`

Or disable zero-downtime via API:

```powershell
$env:LIARA_API_TOKEN = "your-token"
pnpm liara:disable-zdt
```

---

## Build location: Iran vs Germany

Liara offers two build regions ([docs](https://docs.liara.ir/paas/details/build-location)):

| Location | Best for |
|----------|----------|
| **iran** (default for this project) | Faster push to Liara registry; uses Liara mirrors; ideal when building from Iran |
| **germany** | Rare packages missing from Iran mirror; slower registry push |

This project uses **iran** because `pnpm deploy:api` uploads a pre-built `server.cjs` — Liara only pulls `node:20-alpine` and copies one file. No `pnpm install` runs on Liara, so Germany’s package advantage does not apply.

### Liara mirrors (used during Iran builds)

- NPM: `https://package-mirror.liara.ir/repository/npm/`
- DockerHub: `https://docker-mirror.liara.ir` ([docs](https://docs.liara.ir/mirrors/docker/))

Health checks use **Node** (no `apk add wget` — Alpine CDN often fails on Iran build hosts) and **`127.0.0.1`**, not `localhost`.

---

## Deploy flow

`pnpm deploy:api`:

1. Bundles the API locally → `deploy/r6ac-api/server.cjs` (~2.6 MB).
2. Uploads only that folder (~500 KB compressed).
3. Liara builds a minimal image in **Iran** (`COPY server.cjs` + `node:20-alpine`).
4. CLI uses `--detach` and `--build-location=iran` — watch **Console → r6ac-api → تاریخچه** (موقعیت Build should show ایران).

```powershell
cd c:\R6AC-Project
pnpm deploy:api
```

To wait for the CLI until finished: `pnpm deploy:api:watch`

### Diagnose releases

```powershell
$env:LIARA_API_TOKEN = "your-token"
pnpm liara:diagnose
```

---

## Required env vars (Liara console)

| Variable | Example (Liara default URLs) |
|----------|------------------------------|
| `DATABASE_URL` | Liara Postgres private URL |
| `REDIS_URL` | Liara Redis private URL |
| `JWT_ACCESS_SECRET` | strong secret (`JWT_SECRET` also accepted by code) |
| `JWT_REFRESH_SECRET` | strong secret |
| `NODE_ENV` | `production` |
| `CORS_ORIGIN` | `https://r6ac-dashboard.liara.run` |
| `PORT` | `3001` |

---

## Until r6ac.ir is ready

- API: `https://r6ac-api.liara.run`
- Dashboard: `https://r6ac-dashboard.liara.run`
- Set `CORS_ORIGIN` and dashboard `VITE_*` to these URLs.

Liara may show a DNS notice for `*.liara.run`; internal health checks use `127.0.0.1:3001`.

---

## Verification

| Check | Expected |
|-------|----------|
| Liara تاریخچه | Latest release **موفق** (not معلق) |
| `https://r6ac-api.liara.run/health/live` | `{"status":"ok",...}` |
| `https://r6ac-api.liara.run/health` | 200 if DB/Redis OK; 503 if not (app still runs) |
| App logs | `R6AC Backend API running at http://0.0.0.0:3001` |

## Database migrations

```powershell
cd apps/api
pnpm db:push
pnpm tsx scripts/migrate.ts
```
