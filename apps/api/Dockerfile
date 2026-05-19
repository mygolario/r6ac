FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/
RUN npm config set registry https://package-mirror.liara.ir/repository/npm/ && \
    npm install -g pnpm && \
    pnpm config set registry https://package-mirror.liara.ir/repository/npm/ && \
    pnpm install --frozen-lockfile
RUN pnpm --filter @r6ac/api build

FROM node:20-alpine AS runner
WORKDIR /app
RUN apk add --no-cache curl && \
    addgroup -S r6ac && adduser -S r6ac -G r6ac

# Copy workspace root files needed for pnpm to resolve packages
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=builder /app/pnpm-workspace.yaml ./pnpm-workspace.yaml

# Copy packages (workspace deps — types, etc.)
COPY --from=builder /app/packages ./packages

# Copy API app dist and package.json
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json

# Copy all node_modules (hoisted pnpm store)
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules

WORKDIR /app/apps/api
USER r6ac
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1
CMD ["node", "dist/index.js"]
