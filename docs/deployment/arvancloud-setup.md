# ArvanCloud DNS + CDN Setup for R6AC

## Step 1 — Add Domain
1. Login to panel.arvancloud.ir
2. Add Domain → r6ac.ir
3. Copy the two ArvanCloud nameservers shown
4. Go to your domain registrar → update nameservers to ArvanCloud's

## Step 2 — DNS Records

| Type | Name | Value | Proxy |
|---|---|---|---|
| A | @ | [Liara dashboard IP] | ON |
| A | api | [Liara API IP] | ON |
| CNAME | www | r6ac.ir | ON |

Get Liara IPs from: liara.ir → App → r6ac-dashboard → Domains

## Step 3 — SSL
ArvanCloud provides free TLS automatically when proxy is ON.
Force HTTPS: ArvanCloud → Security → HTTPS → Enable

## Step 4 — CDN Rules (Optional optimization)
- Cache static assets: *.js, *.css, *.woff2 → Cache TTL: 1 year
- Bypass cache for: /api/* → No cache
- Bypass cache for: /health → No cache

## Step 5 — Security Rules
- Enable DDoS protection: ArvanCloud → Security → DDoS Protection → ON
- Rate limit: /api/auth/login → 5 req/min per IP
- Block non-Iranian IPs (optional for tournament phase 1):
  ArvanCloud → Security → IP Access Rules → Allow only IR
