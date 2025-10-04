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

### Server (`src/server/`)

```typescript
// trpc.ts - Context and procedure builders
export const createTRPCContext = async (opts: { headers: Headers }) => ({})
export const publicProcedure = t.procedure
export const router = t.router

// routers/_app.ts - Root router
export const appRouter = router({
  hello: publicProcedure
    .input(z.object({ name: z.string().optional() }))
    .query(({ input }) => ({ greeting: `Hello ${input.name ?? "World"}!` }))
})
```

### Client (`src/trpc/`)

```typescript
// react.tsx - React provider with TanStack Query
export function TRPCReactProvider({ children }) {
  const queryClient = new QueryClient()
  const trpcClient = api.createClient(...)
  return (
    <QueryClientProvider client={queryClient}>
      <api.Provider client={trpcClient} queryClient={queryClient}>
        {children}
      </api.Provider>
    </QueryClientProvider>
  )
}
```

### Usage in Components

```typescript
import { api } from "@/trpc/react"

const data = api.hello.useQuery({ name: "World" })
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

# Lint
pnpm lint

# Format
pnpm format
```

## Next Steps

- Add RBAC middleware to tRPC procedures
- Implement Events CRUD routers
- Create Roster management UI
- Add S3 storage adapter integration
