import { NextRequest } from 'next/server';

const SHOPIFY_CLIENT_ID =
  process.env.NEXT_PUBLIC_SHOPIFY_CLIENT_ID || 'a29a9f876eee6b80a370854f4c19109a';

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function dashboardTargetUrl(req: NextRequest) {
  const target = new URL('/dashboard/shopify', req.url);
  req.nextUrl.searchParams.forEach((value, key) => {
    if (key !== 'target') target.searchParams.set(key, value);
  });
  target.searchParams.set('embedded', 'shopify');
  return `${target.pathname}${target.search}`;
}

export function GET(req: NextRequest) {
  const targetUrl = dashboardTargetUrl(req);
  const escapedTargetUrl = escapeHtml(targetUrl);
  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="shopify-api-key" content="${escapeHtml(SHOPIFY_CLIENT_ID)}">
    <script src="https://cdn.shopify.com/shopifycloud/app-bridge.js"></script>
    <title>CreatorOS Shopify App</title>
    <style>
      html,
      body {
        block-size: 100%;
        margin: 0;
        background: #f8fafc;
        color: #0f172a;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }

      .creatoros-shell {
        position: fixed;
        inset: 0;
        display: grid;
        background: #f8fafc;
      }

      .creatoros-frame {
        block-size: 100%;
        inline-size: 100%;
        border: 0;
        background: #fff;
      }

      .creatoros-loading {
        position: fixed;
        inset: 0;
        display: grid;
        place-items: center;
        gap: 12px;
        background: #f8fafc;
        font-size: 14px;
      }

      .creatoros-spinner {
        block-size: 32px;
        inline-size: 32px;
        border: 4px solid #e2e8f0;
        border-top-color: #0f172a;
        border-radius: 999px;
        animation: creatoros-spin 800ms linear infinite;
      }

      @keyframes creatoros-spin {
        to {
          transform: rotate(360deg);
        }
      }
    </style>
  </head>
  <body>
    <div class="creatoros-shell">
      <div class="creatoros-loading" aria-hidden="true">
        <div class="creatoros-spinner"></div>
        <div>Loading CreatorOS...</div>
      </div>
      <iframe
        class="creatoros-frame"
        title="CreatorOS dashboard"
        src="${escapedTargetUrl}"
        allow="clipboard-read; clipboard-write"
        onload="document.querySelector('.creatoros-loading')?.remove()"
      ></iframe>
    </div>
  </body>
</html>`;

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store, max-age=0'
    }
  });
}
