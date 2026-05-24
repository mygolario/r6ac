FROM hub.hamdocker.ir/library/node:20-alpine AS builder
ARG VITE_API_BASE_URL
ARG VITE_WS_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_WS_URL=$VITE_WS_URL
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

# Copy the dashboard app
COPY apps/dashboard/ ./apps/dashboard/

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Build the dashboard
RUN pnpm --filter @r6ac/dashboard build

# ──────────────────────────────────────────────
# Use node:20-alpine (already cached on Liara) instead of nginx:alpine
# nginx:alpine requires pulling from Docker Hub which is blocked from Iran servers
FROM hub.hamdocker.ir/library/node:20-alpine AS runner
WORKDIR /app

# Use Liara npm mirror to install serve
RUN npm config set registry https://package-mirror.liara.ir/repository/npm/ && \
    npm install -g serve

COPY --from=builder /app/apps/dashboard/dist ./dist

EXPOSE 3000
CMD ["serve", "-s", "dist", "-l", "3000"]
