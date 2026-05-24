# Required GitHub Secrets for CI/CD

Go to: GitHub Repo → Settings → Secrets and variables → Actions → New repository secret

| Secret Name | Description | Where to get it |
|---|---|---|
| LIARA_TOKEN | Liara API token (rotate if exposed; never commit) | liara.ir → Settings → API Tokens |
| DATABASE_URL | PostgreSQL connection string | Liara Console → Database → r6ac-db → Connection String |
| REDIS_URL | Redis connection string | Liara Console → Database → r6ac-redis → Connection String |
| JWT_ACCESS_SECRET | 256-bit random string (API reads this; `JWT_SECRET` also works) | Run: openssl rand -hex 32 |
| JWT_REFRESH_SECRET | 256-bit random string | Run: openssl rand -hex 32 |
| VITE_API_BASE_URL | https://api.r6ac.ir | Your Liara custom domain |
| VITE_WS_URL | wss://api.r6ac.ir | Your Liara custom domain |
| ARVAN_ACCESS_KEY | ArvanCloud storage key | ArvanCloud → Object Storage |
| ARVAN_SECRET_KEY | ArvanCloud storage secret | ArvanCloud → Object Storage |
