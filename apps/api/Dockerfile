FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/
RUN npm install -g pnpm && pnpm install --frozen-lockfile
RUN pnpm --filter @r6ac/api build

FROM node:20-alpine AS runner
WORKDIR /app
RUN addgroup -S r6ac && adduser -S r6ac -G r6ac
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/package.json ./
COPY --from=builder /app/node_modules ./node_modules
USER r6ac
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:3001/health || exit 1
CMD ["node", "dist/index.js"]
