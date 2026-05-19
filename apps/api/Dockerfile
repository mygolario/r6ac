FROM node:20-alpine AS builder
WORKDIR /app

# Set npm/pnpm registry to Liara's mirror FIRST (before any installs)
RUN npm config set registry https://package-mirror.liara.ir/repository/npm/

# Install pnpm
RUN npm install -g pnpm
RUN pnpm config set registry https://package-mirror.liara.ir/repository/npm/

# Copy workspace manifest files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy workspace packages source
COPY packages/ ./packages/

# Copy the API app
COPY apps/api/ ./apps/api/

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Build the API
RUN pnpm --filter @r6ac/api build

# ──────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

# Install curl for health checks
RUN apk add --no-cache curl

# Create non-root user
RUN addgroup -S r6ac && adduser -S r6ac -G r6ac

# Replicate workspace layout so symlinks resolve correctly
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /app/apps/api/dist ./apps/api/dist

WORKDIR /app/apps/api
USER r6ac
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

CMD ["node", "dist/index.js"]
