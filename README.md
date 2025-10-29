# Whop Forum Wrapper App

A minimal Whop app that displays forum posts for the host experience where it is installed. Built with Next.js App Router, Tailwind, and `@whop/react`.

## Prerequisites
- Whop developer account and an app created in your dashboard
- Node 18+
- pnpm (recommended) or npm/yarn

## Environment Variables
Create a `.env.local` (or use the existing `.env` for local only) with:

```
NEXT_PUBLIC_WHOP_APP_ID=app_XXXXXXXXXXXXXX
WHOP_API_KEY=whop_XXXXXXXXXXXXXXXXXXXXXXXX
```

Optional (useful for local testing UI hints):
```
NEXT_PUBLIC_WHOP_AGENT_USER_ID=user_XXXXXXXXXXXX
NEXT_PUBLIC_WHOP_COMPANY_ID=biz_XXXXXXXXXXXXXX
```

## Install & Run

```bash
pnpm install
pnpm dev
# open http://localhost:3000
```

## Configure Hosting in Whop
- In your app’s Hosting section, set App View to:
  - `/experiences/[experienceId]`
- Use your app’s Install URL to add it to a test Whop; enable Localhost mode when testing locally.

## Where the forum is rendered
- Experience page: `app/experiences/[experienceId]/page.tsx`
  - Fetches forum posts for the current experience and renders a simple feed.

## SDK setup
- Provider: `app/layout.tsx` wraps your app with `<WhopApp />` from `@whop/react`.
- SDK client: `lib/whop-sdk.ts` initializes the `@whop/sdk` client using `WHOP_API_KEY`.

If the SDK version you use exposes different factory/constructor names or methods, tweak `lib/whop-sdk.ts` and the list call in `app/experiences/[experienceId]/page.tsx` accordingly.

## Deploy
- Deploy to Vercel (or similar)
- Update Hosting URL in Whop dashboard to your production domain

## Notes
- The host must have Forums enabled on the experience being viewed
- Your app must request/receive the `forum:read` permission on install to read forum posts
