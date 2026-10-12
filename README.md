# CreatorOS

CreatorOS is a command center for creator whitelisting: turning customers into creators, product gifting, outreach, and onboarding for Shopify, Meta, Klaviyo, and TikTok integrations.

This repository is the Next.js dashboard. It talks to a separate FastAPI backend (not included) through the built-in proxy at `/api/proxy`. Point `NEXT_PUBLIC_WHITELABEL_API` at your own backend.

## Stack

- Next.js 16 (App Router), React, TypeScript
- shadcn/ui + Tailwind CSS
- TanStack Query, TanStack Form + Zod, nuqs
- Clerk for auth, organizations, and billing

## Getting Started

```bash
cp env.example.txt .env.local   # fill in your keys
npm install
npm run dev
```

The dashboard runs at `http://localhost:3000`. Use `PORT=3100 npm run dev` if that port is taken.

## Onboarding a Brand

- Create or select a brand from the brand switcher.
- Open `/dashboard/integrations` to connect Shopify, Meta, Klaviyo, TikTok, and enrichment providers.
- Open `/dashboard/shopify` for the guided Shopify setup.
- When the backend is unavailable in local development, onboarding endpoints can fall back to a local store at `.gstack/local-launch-store.json` (non-secret setup state only).

## Providers

Provider credentials are listed in `env.example.txt` and can also be saved from Dashboard > Settings > Integrations. Resend is the preferred email provider (Mailgun is supported as a fallback). Apify or a Scrapling lookup provider is required for creator profile-photo enrichment.

## Checks

```bash
npm run lint
npm run verify:production
npm run verify:shopify
```

## Docs

- [AGENTS.md](./AGENTS.md): project structure and conventions
- [docs/forms.md](./docs/forms.md): form system
- [docs/themes.md](./docs/themes.md): theming
- [docs/nav-rbac.md](./docs/nav-rbac.md): navigation access control
- [docs/clerk_setup.md](./docs/clerk_setup.md): Clerk setup
