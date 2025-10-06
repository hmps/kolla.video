# Database Package

Shared Drizzle ORM schema and SQLite client for Kolla application.

## Tech Stack

- **ORM**: Drizzle ORM v0.44
- **Database**: SQLite via @libsql/client v0.15
- **Migrations**: Drizzle Kit v0.31
- **Runtime**: tsx for TypeScript execution
- **Mode**: WAL (Write-Ahead Logging) enabled

## Project Structure

```
packages/db/
├── src/
│   ├── schema.ts        # All table definitions
│   ├── client.ts        # Drizzle client instance
│   ├── migrate.ts       # Migration runner with WAL setup
│   └── index.ts         # Package exports
├── migrations/          # Generated SQL migrations
│   └── 0000_*.sql
├── data/                # SQLite database files
│   ├── app.sqlite
│   ├── app.sqlite-shm
│   └── app.sqlite-wal
├── drizzle.config.ts    # Drizzle Kit configuration
└── package.json
```

## Schema Overview

All tables use:
- Integer auto-increment primary keys
- Integer timestamps with `mode: "timestamp"` (stored as unixepoch)
- Foreign keys with cascade behavior

### Tables

**users**
- Clerk user integration
- Fields: `id`, `clerkUserId` (unique), `email`, `createdAt`

**teams**
- Team entities
- Fields: `id`, `name`, `createdAt`

**team_memberships**
- User-team relationships with roles
- Fields: `id`, `teamId` (FK), `userId` (FK), `role` (coach/player), `createdAt`

**events**
- Games and practices
- Fields: `id`, `teamId` (FK), `type` (game/practice), `title`, `date`, `notes`, `createdAt`

**clips**
- Video clips with processing status
- Fields: `id`, `teamId` (FK), `eventId` (FK), `uploaderId` (FK), `storageKey`, `hlsPrefix`, `durationS`, `width`, `height`, `status` (uploaded/processing/ready/failed), `failReason`, `createdAt`

**clip_tags**
- Tag classification for clips
- Fields: `id`, `clipId` (FK), `tag` (offense/defense)

**players**
- Team roster
- Fields: `id`, `teamId` (FK), `name`, `number`, `externalId`

**clip_players**
- Many-to-many join table
- Fields: `clipId` (FK), `playerId` (FK)

**comments**
- Clip annotations (coach-only in app logic)
- Fields: `id`, `clipId` (FK), `authorId` (FK), `body`, `createdAt`

**share_links**
- Token-based event sharing
- Fields: `id`, `teamId` (FK), `eventId` (FK), `token` (unique), `expiresAt`, `allowPublic`, `createdAt`

## Usage

### Import in Web App

```typescript
import { db, users, teams, events } from "db"

// Query
const allTeams = await db.select().from(teams)

// Insert
await db.insert(users).values({
  clerkUserId: "user_123",
  email: "coach@example.com"
})

// Update
await db.update(events)
  .set({ title: "Updated Title" })
  .where(eq(events.id, 1))
```

### Export Client

```typescript
// src/client.ts
export const db = drizzle(client, { schema })
```

Client uses `DATABASE_URL` environment variable (defaults to `file:./data/app.sqlite`).

## Scripts

```bash
# Generate migration from schema changes
pnpm db:generate

# Run migrations (includes WAL mode setup)
pnpm db:migrate

# Push schema directly to DB (dev only, skips migrations)
pnpm db:push

# Launch Drizzle Studio (visual DB browser)
pnpm db:studio
```

## Configuration

### drizzle.config.ts

```typescript
export default defineConfig({
  schema: "./src/schema.ts",
  out: "./migrations",
  dialect: "sqlite",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "file:./data/app.sqlite"
  },
  verbose: true,
  strict: true
})
```

### Migration Runner (src/migrate.ts)

Custom migration script that:
1. Creates libSQL client
2. Runs pending migrations
3. Enables WAL mode: `PRAGMA journal_mode = WAL`
4. Exits with status code

Run with: `pnpm db:migrate`

## WAL Mode

Write-Ahead Logging is enabled for better concurrency:
- Readers don't block writers
- Writers don't block readers
- Better performance for concurrent access
- Creates `.sqlite-shm` and `.sqlite-wal` files

## Environment Variables

- `DATABASE_URL` - Path to SQLite database (default: `file:./data/app.sqlite`)

For production with Turso/libSQL, use connection string:
```
DATABASE_URL=libsql://your-db.turso.io?authToken=...
```

## Adding New Tables

1. Define table in `src/schema.ts`:
```typescript
export const newTable = sqliteTable("new_table", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`)
})
```

2. Generate migration:
```bash
pnpm db:generate
```

3. Review SQL in `migrations/` directory

4. Run migration:
```bash
pnpm db:migrate
```

## Type Safety

All table schemas are exported and can be used for type inference:

```typescript
import type { users } from "db"

type User = typeof users.$inferSelect
type NewUser = typeof users.$inferInsert
```
