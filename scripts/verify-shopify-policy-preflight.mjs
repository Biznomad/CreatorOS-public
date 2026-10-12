import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const platformRoot = join(root, '..');

function read(relativePath) {
  return readFileSync(join(root, relativePath), 'utf8');
}

function readPlatform(relativePath) {
  return readFileSync(join(platformRoot, relativePath), 'utf8');
}

function listFiles(directory, predicate, results = []) {
  for (const entry of readdirSync(directory)) {
    if (['.git', '.next', 'node_modules'].includes(entry)) continue;
    const fullPath = join(directory, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      listFiles(fullPath, predicate, results);
    } else if (predicate(fullPath)) {
      results.push(fullPath);
    }
  }
  return results;
}

let failed = false;

function pass(message) {
  console.log(`PASS ${message}`);
}

function fail(message) {
  failed = true;
  console.error(`FAIL ${message}`);
}

function assert(condition, message) {
  if (condition) pass(message);
  else fail(message);
}

function stripComments(value) {
  return value
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
}

const packageJson = JSON.parse(read('package.json'));
const dashboardApiRaw = readPlatform('dashboard_api.py');
const dashboardApi = stripComments(dashboardApiRaw);
const embeddedPage = read('src/app/shopify/embedded/route.ts');
const proxyRoute = read('src/app/api/proxy/[...path]/route.ts');
const termsPage = read('src/app/terms-of-service/page.tsx');
const landingPage = read('src/app/page.tsx');
const privacyPage = read('src/app/privacy-policy/page.tsx');
const billingPage = read('src/app/dashboard/billing/billing-client.tsx');
const payoutPage = read('src/features/payouts/components/payouts-page.tsx');
const creatorDetailDrawer = read('src/features/creators/components/creator-detail-drawer.tsx');
const shopifyImportPage = read('src/features/shopify-import/components/shopify-import-page.tsx');
const integrationsPage = read('src/features/integrations/components/integrations-page.tsx');
const orgSwitcher = read('src/components/org-switcher.tsx');
const workspacesPage = read('src/features/workspaces/components/workspaces-page.tsx');
const shopifyProductCatalogPage = read('src/features/products/components/shopify-product-catalog-page.tsx');
const giftingPage = read('src/features/gifting/components/gifting-page.tsx');

const dependencyNames = [
  ...Object.keys(packageJson.dependencies || {}),
  ...Object.keys(packageJson.devDependencies || {}),
  ...Object.keys(packageJson.optionalDependencies || {}),
].map((name) => name.toLowerCase());

const allSource = [
  dashboardApi,
  embeddedPage,
  proxyRoute,
  landingPage,
  termsPage,
  privacyPage,
  billingPage,
  payoutPage,
  creatorDetailDrawer,
  shopifyImportPage,
].join('\n');

const restAdminEndpointMatches = [...dashboardApi.matchAll(/admin\/api\/[^"'\s]+/g)]
  .map((match) => match[0])
  .filter((endpoint) => !endpoint.includes('/graphql.json'));

const extensionFiles = listFiles(root, (file) => /\.(toml|liquid)$/.test(file) || /extension/i.test(file));
const hasShopifyAdminExtensionFile = extensionFiles.some((file) => /admin\.(block|action|link)|shopify\.extension\.toml/i.test(file));
const hasCheckoutExtensionFile = extensionFiles.some((file) => /checkout|post[-_]?purchase|thank[-_]?you|purchase/i.test(file));
const hasThemeOrLiquidFile = extensionFiles.some((file) => /\.liquid$|theme/i.test(file));

const backendPaymentProcessorSignals = /stripe_(secret|publishable)|paypal_client|api\.paypal\.com|braintree|square_access/i.test(dashboardApi);
const paypalSdkOrApiSignals = /paypal_client|api\.paypal\.com|@paypal|paypal\/checkout|paypal\.Buttons/i.test(allSource);

console.log('CreatorOS Shopify policy preflight');

assert(
  dashboardApi.includes('appSubscriptionCreate')
    && dashboardApi.includes('AppSubscriptionReplacementBehavior')
    && billingPage.includes('/billing/subscribe')
    && billingPage.includes('confirmation_url')
    && !billingPage.includes('mailto:')
    && !billingPage.includes('salesContactHref')
    && billingPage.includes("cta: 'Start Agency'"),
  'merchant app billing uses Shopify Billing API subscription approval flow'
);

assert(
  !dependencyNames.some((name) => ['stripe', '@stripe/stripe-js', 'paypal', '@paypal/react-paypal-js', 'braintree', 'square'].includes(name))
    && !backendPaymentProcessorSignals
    && !paypalSdkOrApiSignals
    && dashboardApi.includes('cash payouts require a PayPal email or creator email')
    && dashboardApi.includes('"live_settlement_ready"'),
  'no off-platform merchant billing or payment processor integration is present'
);

assert(
  billingPage.includes('plans.map((plan)')
    && billingPage.includes('requestUpgrade(plan.key)')
    && billingPage.includes('pendingPlanChange')
    && billingPage.includes('Open Shopify approval')
    && billingPage.includes('handlePreviewUpgrade(plan.key)')
    && dashboardApi.includes('AppSubscriptionReplacementBehavior')
    && dashboardApi.includes('"replacementBehavior": "APPLY_IMMEDIATELY"'),
  'pricing plan changes are available in-app through Shopify Billing API approvals'
);

assert(
  dashboardApi.includes('/graphql.json')
    && restAdminEndpointMatches.length === 0,
  'Shopify Admin API calls use GraphQL rather than REST resource endpoints'
);

assert(
  !/orderCreate\s*\(|transactionCreate\s*\(|\/checkouts\b|\/transactions\b|\/orders\.json|checkoutCreate\s*\(/i.test(dashboardApi)
    && termsPage.includes('does not replace Shopify checkout'),
  'app does not bypass Shopify checkout or create offsite buyer payment flows'
);

assert(
  !/refundCreate\s*\(|returnProcess\s*\(|\/refunds\b|gift card refund|cashback wallet/i.test(allSource)
    && termsPage.includes('process refunds outside the original Shopify'),
  'app does not implement refund handling outside Shopify payment flow'
);

assert(
  !/\/themes\b|themeCreate|themeUpdate|AssetInput|scriptTagCreate|theme app extension/i.test(dashboardApi),
  'app does not install, download, or modify merchant themes'
);

assert(
  !/read_all_orders|write_payment_mandate|write_checkout_extensions_apis|read_checkout_extensions_chat|read_advanced_dom_pixel_events|write_payment_gateways|read_payment_gateways/i.test(allSource),
  'app does not request sensitive Shopify scopes that are outside current functionality'
);

assert(
  !landingPage.includes('useState(247)')
    && !landingPage.includes('Math.max(247')
    && !/fake reviews|false purchase|recent purchase notification|fabricated/i.test(allSource)
    && !/only platform|What early adopters are saying|avg ROAS|Average result|Within a week|found 1,400|47 creators|10\+ hrs|5\.2x|4\.1x|3\.6x|3\.2x|2–5x|1\.4x/i.test(landingPage)
    && !/SARAL|CreatorIQ|Aspire|Features they charge|Why Switch|competitors won/i.test(landingPage)
    && !/Apify-powered|Claude AI|fully automated|Zero manual|No guesswork|8\.7% avg engagement|4x higher|2-hour response SLA|Scale winners|Pause losers|not estimates/i.test(landingPage)
    && !/unique discount codes|Auto-generate Shopify draft orders|under 2 minutes|Product Tour|Play product tour|Whitelisted ad tracking & ROAS/i.test(landingPage)
    && !/SOC 2|Unlimited creators|White-label ready|Unlimited everything|No per-client|no creator caps|zero CreatorOS|No per-creator|No hidden|founder pricing|after beta|Priority Slack|Full REST API|every webhook|Custom domain|Dedicated account manager|Client self-serve|White-label dashboard|Lock in Founder/i.test(landingPage)
    && landingPage.includes("fetch('/api/proxy/api/waitlist/count')"),
  'public messaging avoids fabricated metrics, unsupported provider claims, unsupported agency/pricing claims, unsupported competitor comparisons, and waitlist counts come from live API data'
);

assert(
  !/cash advance|merchant loan|capital loan|receivables financing|lending/i.test(allSource)
    && !/seller registration|multi-seller|seller dashboard|payment splitting|freelance marketplace|hire a developer/i.test(allSource)
    && !/clover|lightspeed|square pos|third-party pos/i.test(allSource),
  'app does not implement marketplace, merchant-lending, external agency marketplace, or third-party POS functionality'
);

assert(
  shopifyImportPage.includes('Shopify app install')
    && shopifyImportPage.includes('The store is supplied by Shopify during installation')
    && !/SHOPIFY_PUBLIC_APP_MODE|canUseGuidedTokenSetup|setupMode|guided token|Admin API access token|shopify-admin-token|shopify-store-url|brand\.myshopify\.com|shpat_|client token|custom-distributed|token test/i.test(shopifyImportPage),
  'public Shopify install flow is OAuth-only and relies on Shopify-supplied shop context'
);

assert(
  integrationsPage.includes("key: 'shopify'")
    && integrationsPage.includes('fields: []')
    && integrationsPage.includes('Shopify is connected through the approved app install flow')
    && integrationsPage.includes('/dashboard/shopify')
    && !integrationsPage.includes('Admin API Access Token')
    && !integrationsPage.includes('yourstore.myshopify.com'),
  'Integrations page treats Shopify as OAuth-managed and does not expose manual store/token fields'
);

assert(
  !orgSwitcher.includes("updateFormValue('shopify_store'")
    && !orgSwitcher.includes('brand-shopify')
    && !orgSwitcher.includes('brand.myshopify.com')
    && !workspacesPage.includes("updateFormValue('shopify_store'")
    && !workspacesPage.includes('workspace-store')
    && !workspacesPage.includes('brand.myshopify.com'),
  'workspace creation does not request manual Shopify store domains'
);

assert(
  dashboardApi.includes('@app.get("/api/shopify/install")')
    && dashboardApi.includes('_verify_shopify_hmac(params)')
    && dashboardApi.includes('return RedirectResponse(_build_shopify_authorize_url(shop, state), status_code=303)')
    && dashboardApi.includes('@app.get("/api/shopify/oauth/callback")')
    && dashboardApi.includes('f"https://{shop}/admin/oauth/access_token"')
    && dashboardApi.includes('"installed_via": "oauth"')
    && dashboardApi.includes('status="connected"')
    && dashboardApi.includes('await _clear_shopify_oauth_session(brand_id)')
    && dashboardApi.includes('_attach_shopify_install_cookie(response, brand_id, shop)'),
  'Shopify public install immediately redirects through OAuth, updates existing integration records, and returns to the app UI'
);

assert(
  !/fullscreen|ResourcePicker|Max modal/i.test(allSource)
    && !hasShopifyAdminExtensionFile,
  'app does not auto-launch Max modal or ship promotional Shopify admin extensions'
);

assert(
  !hasCheckoutExtensionFile
    && !hasThemeOrLiquidFile
    && !/checkout ui extension|purchase\.checkout|post_purchase|purchase\.thank-you|sellingPlanGroup|fulfillmentOrderSubmitFulfillmentRequest|customerPaymentMethod|countdown timer/i.test(allSource),
  'app does not ship checkout, purchase-option, subscription, product-sourcing, or storefront theme extensions'
);

assert(
  !/copy the product|duplicate product|clone product|import from any store|from any website|product sourcing|dropship|dropshipping|supplier catalog|resell products/i.test(allSource)
    && !/Shopify Admin API token|Admin API access token|shopify admin api access token/i.test(shopifyProductCatalogPage)
    && !/Shopify Admin API token|Admin API access token|shopify admin api access token/i.test(giftingPage)
    && shopifyProductCatalogPage.includes("Products come from the active brand's Shopify connection")
    && giftingPage.includes('Install or reconnect the Shopify app before CreatorOS can load product variants'),
  'product and gifting surfaces only use merchant-owned Shopify catalog data from the approved app connection'
);

assert(
  embeddedPage.includes('https://cdn.shopify.com/shopifycloud/app-bridge.js')
    && !/<script[^>]+shopifycloud\/app-bridge\.js[^>]+(async|defer|type=)/i.test(embeddedPage)
    && shopifyImportPage.includes('window.shopify.idToken()')
    && shopifyImportPage.includes('const shopifyFetch = useCallback')
    && shopifyImportPage.includes('headers.set(\'Authorization\', `Bearer ${shopifyIdToken}`)')
    && shopifyImportPage.includes('url.searchParams.set(\'shop\', shopifyAdminShop)')
    && dashboardApi.includes('_exchange_shopify_session_token')
    && dashboardApi.includes('@app.post("/api/shopify/session-token")')
    && proxyRoute.includes('getShopifySessionEmail'),
  'embedded app includes App Bridge first and supports Shopify session token exchange'
);

assert(
  proxyRoute.includes('getShopifySessionTokenEmail')
    && proxyRoute.includes('/api/shopify/session-token')
    && proxyRoute.includes('body: JSON.stringify({')
    && proxyRoute.includes('brand_id: brandId')
    && dashboardApi.includes('class ShopifySessionTokenRequest')
    && dashboardApi.includes('Shopify session token required'),
  'embedded Admin API requests can authenticate through Shopify session tokens without third-party cookies'
);

assert(
  dashboardApi.includes('@app.post("/api/webhooks/shopify/app/uninstalled")')
    && dashboardApi.includes('@app.post("/api/webhooks/shopify/customers/data_request")')
    && dashboardApi.includes('@app.post("/api/webhooks/shopify/customers/redact")')
    && dashboardApi.includes('@app.post("/api/webhooks/shopify/shop/redact")')
    && dashboardApi.includes('_read_verified_shopify_webhook')
    && dashboardApi.includes('_verify_shopify_webhook_hmac')
    && dashboardApi.includes("shopify_customer_id = NULL")
    && dashboardApi.includes("- 'email'")
    && dashboardApi.includes("- 'first_name'")
    && dashboardApi.includes("- 'last_name'")
    && dashboardApi.includes("- 'phone'")
    && dashboardApi.includes("- 'shopify_customer_id'")
    && dashboardApi.includes("- 'shopify_customer_gid'")
    && dashboardApi.includes("- 'shopify_store'")
    && privacyPage.includes('customers/data_request')
    && privacyPage.includes('customers/redact'),
  'Shopify compliance webhooks verify HMAC signatures, redact Shopify customer data, and are disclosed in privacy policy'
);

assert(
  payoutPage.includes('Live payout settlement needs provider setup')
    && dashboardApi.includes('"live_settlement_ready"')
    && dashboardApi.includes('cash payouts require a PayPal email or creator email'),
  'creator payout metadata is separated from merchant billing and guarded by provider readiness'
);

if (failed) {
  console.error('CreatorOS Shopify policy preflight failed.');
  process.exit(1);
}

console.log('CreatorOS Shopify policy preflight passed.');
