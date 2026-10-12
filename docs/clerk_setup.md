# Clerk Setup Guide

This guide covers the Clerk identity features used by CreatorOS.

## Clerk Scopes Required

- **Authentication** - User sign-in/sign-up and session management
- **Organizations** - Multi-tenant workspace and team membership management

## Clerk Organizations Setup

CreatorOS uses Clerk Organizations for workspace membership and role context. Brand data, integrations, billing state, and activation workflows are scoped by the CreatorOS backend.

### Enable Organizations

1. Go to [Clerk Dashboard](https://dashboard.clerk.com).
2. Navigate to **Configure**.
3. Open **Organizations settings**.
4. Configure default roles and permissions for operators who will manage client workspaces.

### Navigation RBAC

- Client-side navigation filtering uses the `useNav` hook.
- Navigation items are configured in `src/config/nav-config.ts`.
- Server and API routes must still enforce authenticated workspace access through Clerk and the backend.
- See `docs/nav-rbac.md` for implementation details.

### Billing Note

CreatorOS does not use Clerk Billing for subscriptions. The dashboard billing screen creates and manages Shopify app subscription approvals through the active brand's Shopify admin flow. Configure Shopify credentials from `/dashboard/integrations` or `/dashboard/shopify`, then verify billing from `/dashboard/billing`.

### References

- [Clerk Organizations documentation](https://clerk.com/docs/organizations/overview)
- [Multi-tenant authentication guide](https://clerk.com/blog/how-to-build-multitenant-authentication-with-clerk)
