# Kolla - Video Upload and Distribution Platform

This is a pnpm workspace monorepo for sports teams to upload, organize, and share game/practice video clips.

## Architecture Overview

- **Web App** (`apps/web`) - Next.js 15 application with Clerk auth, tRPC API, and dark-mode UI
- **Database** (`packages/db`) - Shared Drizzle ORM schema and client for SQLite
- **Worker** (planned) - Node 23 service for video transcoding with BullMQ + Redis

## Workspace Structure

```
kolla/
├── apps/
│   └── web/              # Next.js web application
├── packages/
│   └── db/               # Database package (Drizzle ORM + SQLite)
├── docs/
│   └── plan.md           # Full implementation plan
├── pnpm-workspace.yaml   # pnpm workspace config
└── package.json
```

## Key Technologies

- **Package Manager**: pnpm v10.17
- **Monorepo**: pnpm workspaces
- **Database**: SQLite with WAL mode
- **Auth**: Clerk
- **API**: tRPC v11
- **Frontend**: Next.js 15, React 19, Tailwind CSS v4, shadcn-ui
- **Video Processing** (planned): FFmpeg, HLS transcoding
- **Storage** (planned): Cloudflare R2 (S3-compatible)
- **Queue** (planned): BullMQ + Redis

## Environment Variables


Common variables across services:
- `DATABASE_URL` - SQLite database path
- `CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` - Auth
- `S3_*` variables - Object storage (R2)
- `REDIS_URL` - Queue backend
- `JOB_SHARED_SECRET` - App/worker auth

## Development

```bash
# Install dependencies
pnpm install

# Run web app
cd apps/web
pnpm dev

# Run migrations
cd packages/db
pnpm db:migrate

# Generate new migration
pnpm db:generate
```

## Project Status

See `docs/plan.md` for detailed implementation plan and progress.

**Completed**: Phase 1 foundation (Next.js, Tailwind, Clerk, tRPC, Drizzle schema, migrations, WAL mode)

**Next**: RBAC middleware, Events CRUD, Roster management, S3 storage adapter


<agent-tools>
# Agent Tools CLI (agt)

Agent Tools is a comprehensive CLI toolkit available in this environment that provides agents with enhanced capabilities for skill management, service integrations, and utility functions.

Agent Tools is designed for LLM consumption with:
- Plain text, structured output optimized for agent parsing
- Direct access to skill repository containing development best practices

## How to Use Agent Tools in Your Work

1. **Discover relevant commands**: `agt --help` will list all available commands and their descriptions.
2. Find a short description of each command below.

## Available Commands

### Skill Management
The `agt skill` command helps you discover and utilize pre-built agent skills:

```bash
# Search for skills by keywords
agt skill search [keywords...]

# List all available skills
agt skill all

# Get full content of a specific skill
agt skill get <name>
```

**Use skills to enhance your capabilities**: Skills contain proven patterns, code examples, and best practices that you can apply to solve common problems more effectively.

**Recommendation**: Proactively use `agt skill search` when starting complex tasks to discover relevant skills that can guide your implementation approach.

</agent-tools>