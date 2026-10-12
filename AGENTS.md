# CreatorOS — Agent Development Guide

## Project Overview
CreatorOS is an influencer whitelisting and creator management SaaS. Next.js 16 + shadcn/ui frontend on Netlify, FastAPI backend (configured via NEXT_PUBLIC_WHITELABEL_API), PostgreSQL database.

## Tech Stack
- **Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, shadcn/ui, Zustand, TanStack React Query, nuqs
- **Auth:** Clerk (organizations, sign-in/sign-up)
- **Backend:** FastAPI (Python), asyncpg, httpx
- **Database:** PostgreSQL 16
- **Deployment:** Netlify (frontend), VPS (API)

## Critical Conventions
- **React Query** for all data fetching — `useSuspenseQuery` on client, `HydrationBoundary` for hydration
- **API layer** per feature — `api/types.ts` → `api/service.ts` → `api/queries.ts`
- **Icons** — only import from `@/components/icons`, never from `@tabler/icons-react` directly
- **Formatting** — single quotes, no trailing commas, 2-space indent
- **No Stripe** — billing through Shopify only (Stripe account permanently banned)
- **Brand store** — `useBrandStore` from `@/components/org-switcher` for multi-brand context

## Architecture
```
src/
├── app/                    # Next.js app router pages
│   ├── api/proxy/          # API proxy to VPS backend
│   ├── dashboard/          # All dashboard routes
│   └── auth/               # Clerk auth pages
├── components/             # Shared UI components
│   ├── layout/             # Header, sidebar, providers
│   ├── ui/                 # shadcn/ui components
│   └── icons.tsx           # Icon registry (tabler icons)
├── features/               # Feature modules
│   ├── creators/           # Creator grid, table, cards, discovery
│   ├── kanban/             # Pipeline kanban board
│   ├── outreach/           # Outreach messages table
│   ├── proposals/          # AI proposals review
│   ├── campaigns/          # Ad campaigns
│   ├── activation/         # Shopify customer activation
│   ├── gifting/            # Product gifting
│   ├── milestones/         # Creator milestones
│   └── notifications/      # Notification center
├── config/                 # Navigation config
├── hooks/                  # Custom hooks (breadcrumbs, data table)
└── lib/                    # Utilities, API client, query client
```

## API Proxy
All client-side API calls go through `/api/proxy/[...path]` which forwards to the VPS backend. Server-side calls use `WHITELABEL_API_INTERNAL` env var directly. Do NOT add auth middleware to the proxy — Clerk auth() breaks on Netlify serverless functions.

## Key Environment Variables
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` — Clerk auth
- `CLERK_SECRET_KEY` — Clerk server-side auth
- `WHITELABEL_API_INTERNAL` — VPS API URL (server-side only, required on Netlify)
- Do NOT hardcode the VPS IP address anywhere in source code

## Testing
- `npm run build` — TypeScript type checking + Next.js build
- After any change, verify `/api/proxy/health` returns `{"status":"ok","db":"connected"}`
- Always build before deploying — never deploy a broken build

## Branch Strategy
- `main` — production, always deployable
- `feature/*` — feature branches, create PR to merge
- `fix/*` — bug fix branches
- Never push directly to main — always use PRs

## DANGER ZONES — Do NOT modify without understanding
- `src/app/api/proxy/[...path]/route.ts` — API proxy, any changes here can break ALL data loading
- `.env.local` — contains secrets, never commit
- `src/components/org-switcher.tsx` — brand store used everywhere
- `src/proxy.ts` — Clerk middleware, affects all routing

## Work Items — Status

### COMPLETED
1. [x] Activation page: Source tabs (Shopify Customers vs Discovered)
2. [x] Activation page: Engagement rate, tier, spend, search filters
3. [x] Creator detail drawer: 3-tab layout (Profile, Outreach History, Notes)
4. [x] Pipeline (Kanban): status changes persist to PATCH /api/creators/{id}/status
5. [x] Overview dashboard: real stats via StatsProvider, empty states on all charts
6. [x] Search bars on Outreach and Campaigns pages
7. [x] Gifting page: brand filtering, create shipment button
8. [x] Mobile responsive: tabs scroll, filters wrap, pagination adapts
9. [x] Billing page: pricing tiers (Growth/Scale/Agency), Shopify billing placeholder
10. [x] Onboarding wizard: 4-step first-visit modal
11. [x] CSV export button on Creators page
12. [x] Performance: email VIPs capped at 500 client-side
13. [x] Landing page video placeholder (keeping play button until Loom recording)

### REMAINING
14. [ ] Wire "Approve Klaviyo Email" to real Klaviyo API (requires Klaviyo V8fsvS key)
15. [ ] Campaigns page: wire to real Meta Ads API data (has ads_management permission)
16. [ ] Outreach page: wire "Send" action to actually deliver DM via Instagram API
17. [ ] Add webhook endpoints for real-time notifications
18. [ ] Dark mode polish
19. [ ] Shopify billing integration (subscription management via Shopify Admin API)
20. [ ] Gifting: wire "Create Shipment" to Shopify draft order creation
