# tRPC Setup

**⚠️ Important**: This project uses `@trpc/tanstack-react-query` (the new recommended approach), **NOT** the deprecated `@trpc/react-query`.

## Dependencies

```json
{
  "@trpc/server": "11.6.0",
  "@trpc/client": "11.6.0",
  "@trpc/tanstack-react-query": "11.6.0",
  "@tanstack/react-query": "5.90.2"
}
```

## Server Setup (`src/server/`)

### Context and Procedures (`trpc.ts`)

```typescript
import { initTRPC, TRPCError } from "@trpc/server";
import { cache } from "react";
import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db, users, teamMemberships } from "@kolla/db";

export const createContext = cache(async () => {
  const { userId } = await auth();

  let dbUser = null;
  if (userId) {
    const existingUser = await db.query.users.findFirst({
      where: eq(users.clerkUserId, userId),
    });
    if (existingUser) {
      dbUser = existingUser;
    }
  }

  return {
    clerkUserId: userId,
    user: dbUser,
  };
});

const t = initTRPC.context<typeof createContext>().create();

// Middleware to ensure user is authenticated
const isAuthed = t.middleware(async ({ ctx, next }) => {
  if (!ctx.clerkUserId || !ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: {
      clerkUserId: ctx.clerkUserId,
      user: ctx.user,
    },
  });
});

export const router = t.router;
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(isAuthed);
export const teamProcedure = t.procedure.use(isAuthed).use(isTeamMember);
```

### Root Router (`routers/_app.ts`)

```typescript
import { router } from "../trpc";
import { authRouter } from "./auth";
import { teamsRouter } from "./teams";

export const appRouter = router({
  auth: authRouter,
  teams: teamsRouter,
  events: eventsRouter,
  players: playersRouter,
  clips: clipsRouter,
  comments: commentsRouter,
  shares: sharesRouter,
});

export type AppRouter = typeof appRouter;
```

## Client Setup (`src/trpc/`)

### Context Export (`client.ts`)

```typescript
"use client";

import { createTRPCContext } from "@trpc/tanstack-react-query";
import type { AppRouter } from "@/server/routers/_app";

export const { TRPCProvider, useTRPC, useTRPCClient } = createTRPCContext<AppRouter>();
```

### React Provider (`react.tsx`)

```typescript
"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { TRPCProvider } from "./client";

export function TRPCReactProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: { staleTime: 60 * 1000 },
    },
  }));

  const [trpcClient] = useState(() =>
    createTRPCClient<AppRouter>({
      links: [
        httpBatchLink({
          url: `${process.env.NEXT_PUBLIC_APP_URL}/api/trpc`,
        }),
      ],
    }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
        {children}
      </TRPCProvider>
    </QueryClientProvider>
  );
}
```

## Usage in Components

### Basic Query

```typescript
"use client";

import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";

export default function MyComponent() {
  const trpc = useTRPC();
  const userQuery = useQuery(trpc.auth.getMe.queryOptions());

  if (userQuery.isLoading) return <div>Loading...</div>;
  return <div>Hello {userQuery.data?.email}</div>;
}
```

### Query with Input

```typescript
const teamQuery = useQuery(
  trpc.teams.get.queryOptions({ teamId: 1 })
);
```

### Mutation

```typescript
const createTeam = useMutation(
  trpc.teams.create.mutationOptions({
    onSuccess: (data) => {
      queryClient.invalidateQueries(trpc.teams.list.queryFilter());
      router.push(`/teams/${data.id}`);
    }
  })
);
```

## Migration from Classic React Client

### Old Pattern (❌ @trpc/react-query)

```typescript
import { trpc } from "@/trpc/client"

const data = trpc.hello.useQuery({ name: "World" })
const mutation = trpc.createUser.useMutation()
```

### New Pattern (✅ @trpc/tanstack-react-query)

```typescript
import { useTRPC } from "@/trpc/client"
import { useQuery, useMutation } from "@tanstack/react-query"

const trpc = useTRPC();
const greetingQuery = useQuery(trpc.greeting.queryOptions({ name: "World" }));
const createUserMutation = useMutation(trpc.createUser.mutationOptions());
```

## Key Differences

1. **Import**: `useTRPC()` hook instead of direct `trpc` object
2. **Queries**: `useQuery(trpc.*.queryOptions(...))`
3. **Mutations**: `useMutation(trpc.*.mutationOptions(...))`
4. **Invalidation**: `queryClient.invalidateQueries(trpc.*.queryFilter())`

## Benefits

- Better TypeScript inference
- Smaller bundle size (tree-shaking)
- TanStack Query native features
- SSR friendly (Next.js App Router)
- Official recommended approach
