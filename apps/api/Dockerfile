FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/
RUN pnpm install --frozen-lockfile

FROM base AS build
# pnpm workspace deps live under each package's node_modules, not only at repo root
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY . .
RUN pnpm --filter @whats-up/shared build
RUN pnpm --filter api exec prisma generate
RUN pnpm --filter api build

FROM base AS runner
RUN apk add --no-cache openssl wget
ENV NODE_ENV=production
# Keep monorepo layout so pnpm symlinks (apps/api/node_modules → ../../node_modules/.pnpm) resolve
WORKDIR /app/apps/api
COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/packages/shared /app/packages/shared
COPY --from=build /app/apps/api/dist ./dist
COPY --from=build /app/apps/api/package.json ./package.json
COPY --from=build /app/apps/api/prisma ./prisma
COPY --from=build /app/apps/api/scripts ./scripts
COPY --from=build /app/apps/api/node_modules ./node_modules
RUN chmod +x ./scripts/docker-start.sh
ENV PORT=4000
ENV PATH="/app/apps/api/node_modules/.bin:${PATH}"
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s \
  CMD wget -qO- http://127.0.0.1:${PORT}/api/v1/health || exit 1
CMD ["./scripts/docker-start.sh"]
