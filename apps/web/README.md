# Kolla Web App

Next.js application for video upload and distribution.

## Getting Started

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Set Up Environment Variables

Create a `.env.local` file with:

```bash
# Clerk Authentication
CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
CLERK_WEBHOOK_SECRET=whsec_...

# Database
DATABASE_URL=file:../../packages/db/local.db

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Set Up Clerk Webhooks (Local Development)

Install svix CLI:

```bash
brew install svix/svix/svix
```

Start the svix listener (in a separate terminal):

```bash
svix listen http://localhost:3000/api/webhooks/clerk
```

This will output a URL like `https://play.svix.com/in/...`

Configure the webhook in Clerk Dashboard:
1. Go to [Clerk Dashboard](https://dashboard.clerk.com) → Webhooks
2. Click "Add Endpoint"
3. Paste the svix URL from above
4. Subscribe to events: `user.created`, `user.updated`, `user.deleted`
5. Copy the webhook signing secret
6. Add to `.env.local` as `CLERK_WEBHOOK_SECRET`

### 4. Run Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

## Webhooks

User data syncs automatically via Clerk webhooks:
- `user.created` → Creates user in database
- `user.updated` → Updates user in database
- `user.deleted` → Deletes user from database

The webhook endpoint is at `/api/webhooks/clerk` and handles verification using svix.
