import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { handleLaunchFallback } from './launch-fallback';

export const runtime = 'nodejs';

const API_BASE = (
  process.env.WHITELABEL_API_INTERNAL ||
  process.env.NEXT_PUBLIC_WHITELABEL_API ||
  ''
).replace(/\/$/, '');
const DEFAULT_API_PROXY_TIMEOUT_MS = 20000;
const SHOPIFY_WEBHOOK_PROXY_TIMEOUT_MS = 30000;
const DEFAULT_LOCAL_QA_EMAIL = 'qa@example.com';

type ProxyContext = { params: Promise<{ path: string[] }> };
type ProxyMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
type ShopifyInstallSession = {
  ok?: boolean;
  brand_id?: string;
  shop?: string;
  owner_email?: string;
};
type ShopifySessionTokenAuth = ShopifyInstallSession;

function getProxyTimeoutMs(apiPath?: string) {
  const configured = Number.parseInt(process.env.WHITELABEL_API_PROXY_TIMEOUT_MS || '', 10);
  if (Number.isFinite(configured) && configured > 0) return configured;
  if (apiPath?.startsWith('/api/webhooks/shopify/')) return SHOPIFY_WEBHOOK_PROXY_TIMEOUT_MS;
  return DEFAULT_API_PROXY_TIMEOUT_MS;
}

function isAbortError(error: unknown) {
  return error instanceof Error && error.name === 'AbortError';
}

function normalizeEmail(value?: string | null) {
  return value?.trim().toLowerCase() || '';
}

function hasUsableShopifySessionPayload(data: unknown) {
  if (!data || typeof data !== 'object') return false;
  const session = data as ShopifyInstallSession;
  return Boolean(
    session.ok &&
      session.brand_id?.trim() &&
      session.shop?.trim() &&
      session.owner_email?.trim()
  );
}

function isLocalRequest(req: NextRequest) {
  const hostCandidates = [
    req.nextUrl.hostname,
    req.headers.get('host'),
    req.headers.get('x-forwarded-host')
  ].filter(Boolean) as string[];

  return hostCandidates.some((value) => {
    const host = value.replace(/^\[/, '').replace(/\]$/, '').split(':')[0];
    return host === 'localhost' || host === '127.0.0.1' || host === '::1';
  });
}

function canUseLaunchFallback(req: NextRequest) {
  return isLocalRequest(req) || process.env.CREATOROS_ENABLE_LAUNCH_FALLBACK === 'true';
}

function hasLocalQaMarker(req: NextRequest) {
  if (req.nextUrl.searchParams.get('qa') === '1') return true;
  if (req.cookies.get('creatoros_qa_auth')?.value === '1') return true;
  const referer = req.headers.get('referer');
  if (!referer) return false;
  try {
    const url = new URL(referer);
    const host = url.hostname;
    return (host === 'localhost' || host === '127.0.0.1' || host === '::1') && url.searchParams.get('qa') === '1';
  } catch {
    return false;
  }
}

function getBrandIdFromPath(apiPath: string) {
  const match = apiPath.match(/^\/api\/brands\/([^/]+)/);
  if (!match?.[1]) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

function getBrandIdFromQuery(req: NextRequest) {
  return req.nextUrl.searchParams.get('brand_id');
}

function parseJsonBody(body?: string) {
  if (!body?.trim()) return null;
  try {
    const parsed = JSON.parse(body);
    return parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function validatePublicProxyPayload(apiPath: string, method: ProxyMethod, body?: string) {
  const payload = parseJsonBody(body);
  if (method === 'POST' && apiPath === '/api/applications') {
    if (!payload) return NextResponse.json({ detail: 'Application payload is required' }, { status: 422 });
    const name = String(payload.name || '').trim();
    if (!name) return NextResponse.json({ detail: 'Application name is required' }, { status: 422 });
    if (name.length > 120) return NextResponse.json({ detail: 'Use 120 characters or fewer for your name' }, { status: 422 });
    const email = String(payload.email || '').trim();
    if (!email || !isValidEmail(email)) return NextResponse.json({ detail: 'Add a valid email address' }, { status: 422 });
    if (email.length > 254) return NextResponse.json({ detail: 'Use 254 characters or fewer for your email address' }, { status: 422 });
    const instagramHandle = String(payload.instagram_handle || '').trim().replace(/^@+/, '');
    const tiktokHandle = String(payload.tiktok_handle || '').trim().replace(/^@+/, '');
    if (instagramHandle.length > 50 || tiktokHandle.length > 50) return NextResponse.json({ detail: 'Use 50 characters or fewer for social handles' }, { status: 422 });
    if (!instagramHandle && !tiktokHandle) return NextResponse.json({ detail: 'Add at least one Instagram or TikTok handle' }, { status: 400 });
    const followerCount = Number(payload.follower_count);
    if (!Number.isFinite(followerCount) || followerCount < 1000) return NextResponse.json({ detail: 'Select your follower count range' }, { status: 422 });
    const niche = String(payload.niche || '').trim();
    if (!niche) return NextResponse.json({ detail: 'Select your content niche' }, { status: 422 });
    const contentExamples = Array.isArray(payload.content_examples)
      ? (payload.content_examples as unknown[]).map((example) => String(example).trim()).filter(Boolean)
      : [];
    if (contentExamples.some((example) => example.length > 500)) {
      return NextResponse.json({ detail: 'Use 500 characters or fewer for content links' }, { status: 422 });
    }
    if (contentExamples.some((example) => !isValidHttpUrl(example))) {
      return NextResponse.json({ detail: 'Use a valid http or https content link' }, { status: 422 });
    }
  }

  if (method === 'POST' && apiPath === '/api/support/public/message') {
    if (!payload) return NextResponse.json({ detail: 'Support message payload is required' }, { status: 422 });
    const email = String(payload.customer_email || '').trim();
    if (email && !isValidEmail(email)) return NextResponse.json({ detail: 'Add a valid email address or leave email blank' }, { status: 422 });
    const message = String(payload.message || '').trim();
    if (!message) return NextResponse.json({ detail: 'Add a support question before sending' }, { status: 422 });
  }

  return null;
}

function normalizeShopifyStore(value?: unknown) {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/^https?:\/\//, '').replace(/\/$/, '').toLowerCase();
}

function getShopFromRequest(req: NextRequest, body?: string) {
  const queryShop = normalizeShopifyStore(req.nextUrl.searchParams.get('shop'));
  if (queryShop) return queryShop;
  const bodyJson = parseJsonBody(body);
  return normalizeShopifyStore(bodyJson?.shop || bodyJson?.store);
}

async function getShopifySessionEmail(req: NextRequest, brandId: string | null) {
  if (!API_BASE) return '';
  const cookie = req.headers.get('cookie');
  if (!cookie) return '';
  try {
    const res = await fetch(`${API_BASE}/api/shopify/session`, {
      headers: { cookie },
      cache: 'no-store'
    });
    if (!res.ok) return '';
    const session = await res.json().catch(() => null) as ShopifyInstallSession | null;
    if (!session?.ok) return '';
    if (brandId && session.brand_id !== brandId) return '';
    return normalizeEmail(session.owner_email);
  } catch {
    return '';
  }
}

async function getShopifySessionTokenEmail(req: NextRequest, brandId: string | null, body?: string) {
  if (!API_BASE) return '';
  const authorization = req.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) return '';
  const shop = getShopFromRequest(req, body);
  if (!shop) return '';

  try {
    const res = await fetch(`${API_BASE}/api/shopify/session-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        authorization
      },
      body: JSON.stringify({
        shop,
        ...(brandId ? { brand_id: brandId } : {})
      }),
      cache: 'no-store'
    });
    if (!res.ok) return '';
    const session = await res.json().catch(() => null) as ShopifySessionTokenAuth | null;
    if (!session?.ok) return '';
    if (brandId && session.brand_id !== brandId) return '';
    return normalizeEmail(session.owner_email);
  } catch {
    return '';
  }
}

async function getSignedInEmail(req: NextRequest, brandId: string | null, body?: string) {
  const localQaBypassEnabled =
    process.env.CREATOROS_QA_AUTH_BYPASS === 'true' ||
    process.env.NEXT_PUBLIC_CREATOROS_QA_AUTH_BYPASS === 'true';
  const localQaRequested = hasLocalQaMarker(req);
  const localQaEmail = normalizeEmail(
    process.env.CREATOROS_QA_USER_EMAIL ||
      process.env.NEXT_PUBLIC_CREATOROS_QA_USER_EMAIL ||
      (localQaRequested || localQaBypassEnabled ? DEFAULT_LOCAL_QA_EMAIL : '')
  );
  if (isLocalRequest(req) && (localQaBypassEnabled || localQaRequested) && localQaEmail) {
    return localQaEmail;
  }

  try {
    const user = await currentUser();
    const email = normalizeEmail(user?.primaryEmailAddress?.emailAddress || user?.emailAddresses?.[0]?.emailAddress);
    if (email) return email;
  } catch {
    // Fall through to the Shopify install session and localhost-only QA bypass below.
  }
  const shopifySessionEmail = await getShopifySessionEmail(req, brandId);
  if (shopifySessionEmail) return shopifySessionEmail;

  const shopifySessionTokenEmail = await getShopifySessionTokenEmail(req, brandId, body);
  if (shopifySessionTokenEmail) return shopifySessionTokenEmail;
  return '';
}

async function fetchBackendJson(path: string, email: string, signal?: AbortSignal) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      'x-creatoros-user-email': email
    },
    signal
  });
  const data = await res.json().catch(() => null);
  return { res, data };
}

async function proxyJson(req: NextRequest, { params }: ProxyContext, method: ProxyMethod) {
  const { path } = await params;
  const apiPath = '/' + path.join('/');
  const brandId = getBrandIdFromPath(apiPath) || getBrandIdFromQuery(req);
  const hasBody = method === 'POST' || method === 'PUT' || method === 'PATCH';
  const body = hasBody ? await req.text() : undefined;
  const publicPayloadError = validatePublicProxyPayload(apiPath, method, body);
  if (publicPayloadError) return publicPayloadError;
  const signedInEmail = await getSignedInEmail(req, brandId, body);
  const isPublicApiPath =
    apiPath === '/api/waitlist' ||
    apiPath === '/api/waitlist/count' ||
    apiPath === '/api/shopify/install' ||
    apiPath === '/api/shopify/oauth/callback' ||
    apiPath === '/api/shopify/session' ||
    apiPath === '/api/shopify/session-token' ||
    (method === 'POST' && apiPath === '/api/applications') ||
    apiPath.startsWith('/api/support/public/') ||
    apiPath.startsWith('/api/webhooks/');

  if (!signedInEmail && apiPath.startsWith('/api/') && !isPublicApiPath) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  }

  const createFallbackRequest = () => new Request(req.url, {
    method,
    headers: {
      'Content-Type': req.headers.get('content-type') || 'application/json',
      'x-creatoros-user-email': signedInEmail
    },
    body
  });

  const launchFallbackAllowed = canUseLaunchFallback(req);
  const preferLaunchFallback = isLocalRequest(req) && hasLocalQaMarker(req);

  if (preferLaunchFallback) {
    const fallback = await handleLaunchFallback(createFallbackRequest(), apiPath, method);
    if (fallback) return fallback;
  }

  if (!API_BASE) {
    if (!launchFallbackAllowed) {
      return NextResponse.json({ error: 'API not configured' }, { status: 503 });
    }
    const fallback = await handleLaunchFallback(createFallbackRequest(), apiPath, method);
    if (fallback) return fallback;
    return NextResponse.json({ error: 'API not configured' }, { status: 503 });
  }

  const timeoutMs = getProxyTimeoutMs(apiPath);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const incomingAuthorization = req.headers.get('authorization');
  const incomingCookie = req.headers.get('cookie');
  const shopifyWebhookHeaders = apiPath.startsWith('/api/webhooks/shopify/')
    ? {
        ...(req.headers.get('x-shopify-hmac-sha256') ? { 'x-shopify-hmac-sha256': req.headers.get('x-shopify-hmac-sha256')! } : {}),
        ...(req.headers.get('x-shopify-topic') ? { 'x-shopify-topic': req.headers.get('x-shopify-topic')! } : {}),
        ...(req.headers.get('x-shopify-shop-domain') ? { 'x-shopify-shop-domain': req.headers.get('x-shopify-shop-domain')! } : {}),
        ...(req.headers.get('x-shopify-webhook-id') ? { 'x-shopify-webhook-id': req.headers.get('x-shopify-webhook-id')! } : {}),
        ...(req.headers.get('x-shopify-api-version') ? { 'x-shopify-api-version': req.headers.get('x-shopify-api-version')! } : {})
      }
    : {};

  try {
    if (method === 'GET' && apiPath === '/api/brands') {
      const { res, data } = await fetchBackendJson(`${apiPath}${req.nextUrl.search}`, signedInEmail, controller.signal);
      return NextResponse.json(data, { status: res.status });
    }

    if (brandId && !(method === 'POST' && apiPath === '/api/brands')) {
      const { res: brandRes, data: brand } = await fetchBackendJson(`/api/brands/${encodeURIComponent(brandId)}`, signedInEmail, controller.signal);
      if (!brandRes.ok) {
        return NextResponse.json(brand || { error: 'Brand workspace not available for this user' }, { status: brandRes.status });
      }
    }

    const res = await fetch(`${API_BASE}${apiPath}${req.nextUrl.search}`, {
      method,
      redirect: 'manual',
      headers: {
        'Content-Type': 'application/json',
        'x-creatoros-user-email': signedInEmail,
        ...(incomingAuthorization ? { authorization: incomingAuthorization } : {}),
        ...(apiPath === '/api/shopify/session' && incomingCookie ? { cookie: incomingCookie } : {}),
        ...shopifyWebhookHeaders
      },
      body,
      signal: controller.signal
    });

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get('location');
      if (location) {
        const redirect = NextResponse.redirect(location, { status: res.status });
        const setCookie = res.headers.get('set-cookie');
        if (setCookie) redirect.headers.set('set-cookie', setCookie);
        return redirect;
      }
    }

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      const text = await res.text();
      if (launchFallbackAllowed) {
        const fallback = await handleLaunchFallback(createFallbackRequest(), apiPath, method);
        if (fallback) return fallback;
      }
      return NextResponse.json({ error: 'Non-JSON response from API', detail: text.slice(0, 200) }, { status: 502 });
    }

    const data = await res.json();
    if (
      res.ok &&
      (apiPath === '/api/shopify/session' || apiPath === '/api/shopify/session-token') &&
      !hasUsableShopifySessionPayload(data)
    ) {
      return NextResponse.json({ error: 'Shopify session requires a workspace owner' }, { status: 401 });
    }
    if (apiPath.startsWith('/api/webhooks/') && res.status === 404) {
      if (launchFallbackAllowed) {
        const fallback = await handleLaunchFallback(createFallbackRequest(), apiPath, method);
        if (fallback) return fallback;
      }
    }
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    if (launchFallbackAllowed) {
      const fallback = await handleLaunchFallback(createFallbackRequest(), apiPath, method);
      if (fallback) return fallback;
    }
    if (isAbortError(error)) {
      return NextResponse.json({ error: 'API request timed out', timeout_ms: timeoutMs }, { status: 504 });
    }
    return NextResponse.json({ error: 'API unreachable' }, { status: 502 });
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET(req: NextRequest, context: ProxyContext) {
  return proxyJson(req, context, 'GET');
}

export async function POST(req: NextRequest, context: ProxyContext) {
  return proxyJson(req, context, 'POST');
}

export async function PUT(req: NextRequest, context: ProxyContext) {
  return proxyJson(req, context, 'PUT');
}

export async function PATCH(req: NextRequest, context: ProxyContext) {
  return proxyJson(req, context, 'PATCH');
}

export async function DELETE(req: NextRequest, context: ProxyContext) {
  return proxyJson(req, context, 'DELETE');
}
