# Monorepo context: deploy from repo root with
#   liara deploy --path . --dockerfile apps/api/Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app

RUN npm config set registry https://package-mirror.liara.ir/repository/npm/ \
  && npm install -g pnpm esbuild@0.28.0

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/config ./packages/config/
COPY packages/types ./packages/types/
COPY apps/api/ ./apps/api/

# Install only what the API needs (workspace + api package)
RUN pnpm install --frozen-lockfile --filter @r6ac/api...

WORKDIR /app/apps/api
RUN esbuild src/server.ts \
  --bundle \
  --platform=node \
  --target=node20 \
  --format=cjs \
  --outfile=dist/server.cjs

# ── Minimal runtime image (no node_modules, no pnpm symlinks) ──
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001
ENV HOST=0.0.0.0

COPY --from=builder /app/apps/api/dist/server.cjs ./server.cjs

EXPOSE 3001
CMD ["node", "server.cjs"]
