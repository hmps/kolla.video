# syntax=docker/dockerfile:1

# Stage 1: Base image with pnpm
FROM node:23-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@10.17.1 --activate

# Stage 2: Install dependencies
FROM base AS deps
WORKDIR /app

# Copy workspace config and package files
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/web/package.json ./apps/web/
COPY packages/db/package.json ./packages/db/

# Install dependencies
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# Stage 3: Build application
FROM base AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=deps /app/packages/db/node_modules ./packages/db/node_modules

# Copy workspace files
COPY pnpm-workspace.yaml package.json ./
COPY apps/web ./apps/web
COPY packages/db ./packages/db

# Build the application
# Create a temporary database directory for build (relative to apps/web)
RUN mkdir -p /app/data && touch /app/data/app.sqlite
WORKDIR /app/apps/web
RUN pnpm exec next build

# Stage 4: Production runtime
FROM base AS runner
WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files from builder
COPY --from=builder /app/apps/web/public ./public
COPY --from=builder /app/apps/web/package.json ./package.json

# Copy standalone build
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static

# Copy database package for migrations
COPY --from=builder --chown=nextjs:nodejs /app/packages/db ./packages/db

# Copy entrypoint script
COPY --from=builder /app/apps/web/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

# Create data directory for SQLite
RUN mkdir -p /data && chown nextjs:nodejs /data

USER nextjs

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

ENTRYPOINT ["/app/docker-entrypoint.sh"]
