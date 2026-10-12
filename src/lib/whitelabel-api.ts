// ============================================================
// WhiteLabel API Client
// ============================================================
// Client-side: uses /api/proxy/* (Next.js route → VPS, avoids mixed content)
// Server-side: hits VPS directly via WHITELABEL_API_INTERNAL
// ============================================================

function getApiBase(): string {
  // Server-side (Node): use direct VPS connection
  if (typeof window === 'undefined') {
    return process.env.WHITELABEL_API_INTERNAL || '';
  }
  // Client-side (browser): use proxy to avoid mixed content http/https
  return '/api/proxy';
}

function shouldUseLocalQaMarker() {
  if (typeof window === 'undefined') return false;
  const isLocalHost =
    window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  if (!isLocalHost) return false;
  if (
    process.env.NEXT_PUBLIC_CREATOROS_QA_AUTH_BYPASS === 'true' ||
    window.location.search.includes('qa=1')
  ) {
    return true;
  }
  try {
    return window.localStorage.getItem('creatoros:qa-auth') === 'true';
  } catch {
    return false;
  }
}

export function withLocalQaMarker(path: string) {
  if (!shouldUseLocalQaMarker()) return path;
  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}qa=1`;
}

export async function apiGet<T>(path: string): Promise<T> {
  const base = getApiBase();
  const res = await fetch(`${base}${withLocalQaMarker(path)}`, {
    headers: { 'Content-Type': 'application/json' }
  });
  if (!res.ok) throw new Error(`WhiteLabel API ${res.status}: ${path}`);
  return res.json();
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const base = getApiBase();
  const res = await fetch(`${base}${withLocalQaMarker(path)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`WhiteLabel API ${res.status}: ${path}`);
  return res.json();
}
