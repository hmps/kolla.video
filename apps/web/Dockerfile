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

# Run database migrations to create schema files
WORKDIR /app/packages/db
RUN pnpm db:migrate

# Build the application
# Create a temporary database directory for build (relative to apps/web)
RUN mkdir -p /app/data && touch /app/data/app.sqlite
WORKDIR /app/apps/web
RUN pnpm exec next build

# Debug: Check what was created
RUN echo "=== Checking standalone output here ===" && \
    ls -la /app/apps/web/.next/standalone && \
    echo "=== Looking for server.js here ===" && \
    find /app/apps/web/.next/standalone -name "server.js"

# Stage 4: Extract production dependencies with pnpm deploy
FROM base AS dependencies
WORKDIR /app

# Copy package files for deploy
COPY --from=deps /app/pnpm-workspace.yaml ./
COPY --from=deps /app/package.json ./
COPY --from=deps /app/apps/web/package.json ./apps/web/
COPY --from=deps /app/packages/db/package.json ./packages/db/

# Copy pnpm lock file
COPY --from=deps /app/pnpm-lock.yaml ./

# Use pnpm deploy to flatten dependencies and resolve symlinks
# This creates a proper node_modules structure for Docker
# --legacy flag required for pnpm v10+ to deploy without inject-workspace-packages
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm --filter=./apps/web deploy --legacy --prod /prod/web

# Stage 5: Production runtime
FROM base AS runner
WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy standalone build - Next.js puts it at .next/standalone/
# The standalone output mirrors the workspace structure, but includes symlinked node_modules
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./

# Copy static assets and public files
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./public

# Replace symlinked node_modules with flattened ones from deploy stage
# This overwrites the standalone's symlinked node_modules with real files
COPY --from=dependencies --chown=nextjs:nodejs /prod/web/node_modules ./node_modules

# Copy database package for migrations
COPY --from=builder --chown=nextjs:nodejs /app/packages/db ./packages/db

# Create data directory for SQLite
RUN mkdir -p /data && chown nextjs:nodejs /data

RUN mkdir -p .next/cache && chown -R 1001:1001 .next
RUN mkdir -p .next/cache/fetch-cache && chown -R 1001:1001 .next

USER nextjs

EXPOSE 3345

ENV NODE_ENV=production
ENV PORT=3345
ENV HOSTNAME="0.0.0.0"

# The standalone build puts server.js at apps/web/server.js
CMD ["node", "server.js"]
