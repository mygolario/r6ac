# R6AC Production Readiness Checklist

## Infrastructure
- [ ] Liara app r6ac-api created (Node platform, port 3001)
- [ ] Liara app r6ac-dashboard created (Docker platform, port 80)
- [ ] Liara PostgreSQL database r6ac-db created
- [ ] Liara Redis instance r6ac-redis created
- [ ] All GitHub secrets set (see github-secrets.md)
- [ ] ArvanCloud domain r6ac.ir added and nameservers updated
- [ ] ArvanCloud DNS records pointing to Liara
- [ ] SSL certificate active (ArvanCloud auto-issues)

## Application
- [ ] Database migrations ran successfully
- [ ] Health endpoint returns 200: https://api.r6ac.ir/health
- [ ] Dashboard loads: https://r6ac.ir
- [ ] Login flow works end-to-end
- [ ] WebSocket connection established (check browser DevTools)
- [ ] FA/RTL layout correct on production
- [ ] EN toggle works on production

## Security
- [ ] JWT_SECRET is a real random 256-bit value (not default)
- [ ] JWT_REFRESH_SECRET is a real random 256-bit value
- [ ] CORS_ORIGIN set to https://r6ac.ir only
- [ ] Rate limiting active on auth endpoints
- [ ] HTTPS forced (no HTTP access)
- [ ] Database not publicly accessible (Liara private network only)

## Monitoring
- [ ] Liara app logs accessible
- [ ] Health check passing in Liara dashboard
- [ ] Error alerting set up (Liara notifications)
