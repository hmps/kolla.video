# Project Structure

This is a pnpm workspace monorepo.

## Structure

- `apps/` - Applications
  - `web/` - Next.js app with Tailwind CSS, shadcn-ui, tRPC, and Clerk (auth/user management)
- `packages/` - Shared packages
  - `db/` - Database schemas and configuration using Drizzle ORM (SQLite) - see [Drizzle SQLite docs](https://orm.drizzle.team/docs/get-started-sqlite)
