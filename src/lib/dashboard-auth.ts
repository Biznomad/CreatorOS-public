'use client';

const LOCAL_QA_AUTH_KEY = 'creatoros:qa-auth';
const LOCAL_QA_AUTH_COOKIE = 'creatoros_qa_auth=1; Path=/; SameSite=Lax';

export type ShopifyDashboardSession = {
  ok?: boolean;
  brand_id?: string;
  shop?: string;
  owner_email?: string;
};

function isLocalHostName(hostname: string) {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
}

export function isLocalQaAuthEnabled() {
  if (typeof window === 'undefined') return false;
  if (!isLocalHostName(window.location.hostname)) return false;
  if (
    process.env.NEXT_PUBLIC_CREATOROS_QA_AUTH_BYPASS === 'true' ||
    window.location.search.includes('qa=1')
  ) {
    return true;
  }
  try {
    return window.localStorage.getItem(LOCAL_QA_AUTH_KEY) === 'true';
  } catch {
    return false;
  }
}

export function rememberLocalQaAuth() {
  if (typeof window === 'undefined') return;
  if (!isLocalHostName(window.location.hostname)) return;
  try {
    window.localStorage.setItem(LOCAL_QA_AUTH_KEY, 'true');
  } catch {
    // Some embedded browser contexts block localStorage; the qa query/cookie still unlocks local QA.
  }
  document.cookie = LOCAL_QA_AUTH_COOKIE;
}

export function withLocalQaMarker(path: string) {
  if (!isLocalQaAuthEnabled()) return path;
  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}qa=1`;
}

export function isUsableShopifySession(
  session: ShopifyDashboardSession | null | undefined
) {
  return Boolean(
    session?.ok &&
      session.brand_id?.trim() &&
      session.shop?.trim() &&
      session.owner_email?.trim()
  );
}

export async function fetchUsableShopifySession() {
  const response = await fetch('/api/proxy/api/shopify/session', {
    cache: 'no-store',
    credentials: 'include'
  });
  if (!response.ok) return null;
  const session = (await response.json().catch(() => null)) as ShopifyDashboardSession | null;
  return isUsableShopifySession(session) ? session : null;
}

export function getSignInUrl() {
  if (typeof window === 'undefined') return '/auth/sign-in';
  const returnTo = `${window.location.pathname}${window.location.search}`;
  return `/auth/sign-in?redirect_url=${encodeURIComponent(returnTo)}`;
}
