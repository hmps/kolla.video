# Web App

Next.js 15 application for VUDL video platform with dark mode UI, Clerk auth, and tRPC API.

## Tech Stack

- **Framework**: Next.js 15.5 with App Router, Turbopack
- **React**: v19.1
- **Styling**: Tailwind CSS v4 with dark mode (class strategy)
- **UI Components**: shadcn-ui with class-variance-authority (CVA)
- **Auth**: Clerk v6.33
- **API**: tRPC v11.6 with TanStack Query
- **Validation**: Zod v4.1
- **Env Management**: dotenvx (wraps all npm scripts)
- **Linting**: Biome v2.2

## Project Structure

```
apps/web/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── layout.tsx          # Root layout with Clerk + dark mode
│   │   ├── page.tsx            # Homepage
│   │   ├── globals.css         # Global styles + CSS variables
│   │   ├── health/             # Health check endpoint
│   │   │   └── route.ts
│   │   └── api/
│   │       └── trpc/           # tRPC endpoint
│   ├── components/
│   │   └── ui/                 # shadcn-ui components
│   │       └── button.tsx
│   ├── lib/
│   │   └── utils.ts            # cn() helper for class merging
│   ├── server/                 # Server-side code
│   │   ├── trpc.ts             # tRPC context & procedure setup
│   │   └── routers/
│   │       └── _app.ts         # Root tRPC router
│   └── trpc/
│       ├── client.ts           # tRPC vanilla client
│       └── react.tsx           # tRPC React provider
├── public/                     # Static assets
├── .env.local                  # Local environment variables
├── middleware.ts               # Clerk auth middleware
├── next.config.ts
├── postcss.config.mjs
├── tsconfig.json
└── package.json
```

## Dark Mode

Dark mode is **enabled by default** with class strategy:

- `<html class="dark">` in `app/layout.tsx`
- CSS variables for light/dark in `globals.css`
- Uses HSL color space with shadcn-ui color palette
- No theme toggle in MVP

## shadcn-ui Components

Installed components:
- **Button** - Multiple variants (default, secondary, outline, ghost, link, destructive)

To add more components, manually create in `src/components/ui/` following shadcn-ui patterns.

## tRPC Setup

**⚠️ Important**: This project uses **`@trpc/tanstack-react-query`** (the new recommended pattern), **NOT** the deprecated `@trpc/react-query`.

**📚 See [src/trpc/AGENTS.md](./src/trpc/AGENTS.md) for complete setup guide, examples, and migration instructions.**

### Quick Usage

```typescript
import { useTRPC } from "@/trpc/client"
import { useQuery, useMutation } from "@tanstack/react-query"

function MyComponent() {
  const trpc = useTRPC();

  // Queries
  const userQuery = useQuery(trpc.auth.getMe.queryOptions());

  // Mutations
  const createTeam = useMutation(trpc.teams.create.mutationOptions());
}
```

## Authentication (Clerk)

Clerk components used:
- `ClerkProvider` - Wraps app in `layout.tsx`
- `SignInButton`, `SignUpButton` - For signed-out users
- `UserButton` - Profile dropdown for signed-in users
- `SignedIn`, `SignedOut` - Conditional rendering

Middleware at `middleware.ts` protects routes.

## Environment Variables

Scripts use dotenvx:

```json
{
  "dev": "dotenvx run -- next dev --turbopack",
  "build": "dotenvx run -- next build --turbopack",
  "start": "dotenvx run -- next start"
}
```

Required variables in `.env.local`:
- `CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `DATABASE_URL` (if using db package)

## API Routes

- **`/health`** - Health check returning `{ status, timestamp, service, version }`
- **`/api/trpc/[trpc]`** - tRPC API endpoint

## Styling Utilities

### cn() Helper

```typescript
import { cn } from "@/lib/utils"

<div className={cn("base-classes", conditional && "extra-class")} />
```

Combines `clsx` and `tailwind-merge` for optimal class merging.

## Development

```bash
# Run dev server with Turbopack
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Type check
pnpm typecheck

# Lint
pnpm lint

# Lint with auto-fix
pnpm lint --fix

# Format
pnpm format
```

## Code Quality Guidelines

### Always Run After Making Changes

1. **TypeScript Type Checking**
   ```bash
   pnpm typecheck
   ```
   - Run after any code changes to catch type errors
   - Fix all type errors before considering the task complete

2. **Linting and Formatting**
   ```bash
   pnpm lint --fix
   ```
   - Run to ensure code follows project style guidelines
   - Auto-fixes formatting issues
   - Address any remaining lint errors

### TODO Comments

- **Never leave TODO comments unimplemented**
- If you add a TODO comment, you must implement the actual functionality
- Check for TODO comments before completing a task:
  ```bash
  grep -rn "TODO" src/
  ```
- If a TODO represents future work that's out of scope, discuss with the user first before leaving it in the code

## Next Steps

- Add RBAC middleware to tRPC procedures
- Implement Events CRUD routers
- Create Roster management UI
- Add S3 storage adapter integration
