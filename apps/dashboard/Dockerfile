FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/ ./packages/
COPY apps/dashboard/ ./apps/dashboard/
RUN npm install -g pnpm && pnpm install --frozen-lockfile
RUN pnpm --filter @r6ac/dashboard build

FROM nginx:alpine AS runner
COPY --from=builder /app/apps/dashboard/dist /usr/share/nginx/html
COPY apps/dashboard/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
