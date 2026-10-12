import { promises as fs } from 'node:fs';
import path from 'node:path';
import { NextResponse } from 'next/server';

type LaunchBrand = {
  id: string;
  name: string;
  niche?: string;
  shopify_store?: string | null;
  target_audience?: string | null;
  product_focus?: string | null;
  owner_email?: string | null;
  active?: boolean;
};

type IntegrationRecord = {
  connected: boolean;
  connected_at?: string | null;
  last_tested_at?: string | null;
  last_sync_at?: string | null;
  last_error?: string | null;
  setup_mode?: string;
  [key: string]: unknown;
};

type ImportJob = {
  id: string;
  ad_id?: string;
  brand_id: string;
  store: string;
  status: string;
  imported: number;
  error: string | null;
  created_at: string;
  completed_at?: string;
};

type CreatorRecord = {
  id: string;
  brand_id: string;
  handle: string;
  platform: 'instagram' | 'tiktok' | 'email';
  display_name: string;
  avatar_url: string;
  follower_count: number;
  engagement_rate: number;
  score: number;
  niche: string;
  status: string;
  email?: string;
  location?: string;
  bio?: string;
  ig_handle?: string;
  order_count: number;
  total_spent: number;
  discovered_via: string;
  last_enriched_at?: string;
  meta?: {
    private_notes?: string;
    [key: string]: unknown;
  };
};

type OutreachRecord = {
  id: string;
  brand_id: string;
  creator_id?: string;
  handle: string;
  platform: string;
  display_name: string;
  avatar_url: string;
  channel: string;
  subject?: string;
  message: string;
  status: string;
  score: number;
  created_at: string;
  sent_at?: string;
  delivery_pending_reason?: string;
};

type ShipmentRecord = {
  id: string;
  brand_id: string;
  handle: string;
  display_name: string;
  avatar_url: string;
  products: string;
  discount_code: string;
  tracking_number?: string;
  carrier?: string;
  stage: string;
  status: string;
  created_at: string;
};

type CampaignRecord = {
  id: string;
  ad_id?: string;
  brand_id: string;
  handle: string;
  creator_handle: string;
  creator_platform: 'instagram' | 'tiktok';
  ad_type: 'partnership_ad' | 'spark_ad' | 'brand_ad';
  platform: 'meta' | 'tiktok';
  status: 'draft' | 'active' | 'paused' | 'completed';
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpm: number;
  conversions: number;
  revenue: number;
  roas: number;
  daily_budget: number;
  created_at: string;
  last_synced_at?: string;
};

type ApplicationRecord = {
  id: string;
  brand_id: string;
  name: string;
  email?: string;
  instagram_handle?: string;
  tiktok_handle?: string;
  follower_count?: number;
  niche?: string;
  location?: string;
  content_examples: string[];
  why_interested?: string;
  status: 'pending' | 'approved' | 'rejected';
  creator_id?: string;
  created_at: string;
  reviewed_at?: string;
};

type BriefRecord = {
  id: string;
  brand_id: string;
  creator_id?: string;
  title: string;
  content_type: string;
  scripts: { title: string; content: string }[];
  visual_notes?: string;
  posting_guidelines?: string;
  created_at: string;
  handle?: string;
  platform?: string;
};

type NotificationRecord = {
  id: string;
  title: string;
  body: string;
  status: 'unread' | 'read';
  createdAt: string;
  actions?: { id: string; label: string; type: 'redirect'; style: 'primary' | 'danger' | 'default' }[];
};

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

type NotificationStateRecord = {
  status?: 'unread' | 'read' | 'archived';
  dismissed?: boolean;
  updated_at: string;
};

type AgentChatSessionRecord = {
  id: string;
  title: string;
  messages: unknown[];
  createdAt: number;
  updatedAt: number;
};

type LaunchStore = {
  brands: LaunchBrand[];
  integrations: Record<string, Record<string, IntegrationRecord>>;
  jobs: Record<string, ImportJob>;
  creators: Record<string, CreatorRecord[]>;
  outreach: Record<string, OutreachRecord[]>;
  shipments: Record<string, ShipmentRecord[]>;
  campaigns: Record<string, CampaignRecord[]>;
  applications: Record<string, ApplicationRecord[]>;
  briefs: Record<string, BriefRecord[]>;
  agent_sessions: Record<string, AgentChatSessionRecord[]>;
  notification_states: Record<string, Record<string, NotificationStateRecord>>;
  waitlist: { email: string; source?: string; plan_interest?: string; created_at: string }[];
};

const DEFAULT_BRAND_ID = 'demo-brand';
const FALLBACK_PROFILE_PHOTOS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=160&h=160&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=160&h=160&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=160&h=160&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=160&h=160&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=160&h=160&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=160&h=160&fit=crop&crop=face'
];

function fallbackProfilePhoto(index: number) {
  return FALLBACK_PROFILE_PHOTOS[index % FALLBACK_PROFILE_PHOTOS.length];
}

const SAMPLE_CREATORS: CreatorRecord[] = [
  {
    id: 'local-creator-1',
    brand_id: DEFAULT_BRAND_ID,
    handle: 'wellnesswithkaia',
    platform: 'instagram',
    display_name: 'Kaia Wellness',
    avatar_url: fallbackProfilePhoto(0),
    follower_count: 48200,
    engagement_rate: 4.8,
    score: 91,
    niche: 'Wellness',
    status: 'discovered',
    email: 'kaia@example.com',
    location: 'Austin, TX',
    bio: 'Clean wellness routines, daily adaptogens, and realistic gut health habits.',
    ig_handle: 'wellnesswithkaia',
    order_count: 6,
    total_spent: 812,
    discovered_via: 'shopify_customer'
  },
  {
    id: 'local-creator-2',
    brand_id: DEFAULT_BRAND_ID,
    handle: 'glowbymara',
    platform: 'tiktok',
    display_name: 'Mara Glow',
    avatar_url: fallbackProfilePhoto(1),
    follower_count: 28700,
    engagement_rate: 5.4,
    score: 84,
    niche: 'Beauty and supplements',
    status: 'contacted',
    email: 'mara@example.com',
    location: 'Miami, FL',
    bio: 'Beauty, supplement stacks, skin prep, and founder-led product demos.',
    ig_handle: 'glowbymara',
    order_count: 3,
    total_spent: 426,
    discovered_via: 'shopify_customer'
  },
  {
    id: 'local-creator-3',
    brand_id: DEFAULT_BRAND_ID,
    handle: 'cleanroutineclub',
    platform: 'instagram',
    display_name: 'Clean Routine Club',
    avatar_url: fallbackProfilePhoto(2),
    follower_count: 61400,
    engagement_rate: 3.9,
    score: 79,
    niche: 'Clean lifestyle',
    status: 'replied',
    email: 'hello@cleanroutineclub.example',
    location: 'Brooklyn, NY',
    bio: 'Clean home, clean pantry, and low-friction wellness swaps.',
    ig_handle: 'cleanroutineclub',
    order_count: 1,
    total_spent: 128,
    discovered_via: 'discovered'
  }
];

function sampleOutreach(): OutreachRecord[] {
  const now = new Date().toISOString();
  return SAMPLE_CREATORS.map((creator, index) => ({
    id: `local-outreach-${index + 1}`,
    brand_id: creator.brand_id,
    creator_id: creator.id,
    handle: creator.handle,
    platform: creator.platform,
    display_name: creator.display_name,
    avatar_url: creator.avatar_url,
    channel: creator.platform === 'tiktok' ? 'email' : 'dm',
    subject: 'CreatorOS launch collaboration',
    message: buildProposalMessage(creator),
    status: index === 2 ? 'replied' : 'pending',
    score: creator.score,
    created_at: now,
    sent_at: index === 2 ? now : undefined
  }));
}

function sampleCampaigns(): CampaignRecord[] {
  const now = new Date().toISOString();
  return [
    {
      id: 'local-campaign-1',
      brand_id: DEFAULT_BRAND_ID,
      handle: 'wellnesswithkaia',
      creator_handle: 'wellnesswithkaia',
      creator_platform: 'instagram',
      ad_type: 'partnership_ad',
      platform: 'meta',
      status: 'active',
      spend: 1840,
      impressions: 92400,
      clicks: 3511,
      ctr: 3.8,
      cpm: 19.91,
      conversions: 87,
      revenue: 8460,
      roas: 4.6,
      daily_budget: 125,
      created_at: now
    },
    {
      id: 'local-campaign-2',
      brand_id: DEFAULT_BRAND_ID,
      handle: 'glowbymara',
      creator_handle: 'glowbymara',
      creator_platform: 'tiktok',
      ad_type: 'spark_ad',
      platform: 'tiktok',
      status: 'paused',
      spend: 920,
      impressions: 68750,
      clicks: 2131,
      ctr: 3.1,
      cpm: 13.38,
      conversions: 34,
      revenue: 2580,
      roas: 2.8,
      daily_budget: 75,
      created_at: now
    }
  ];
}

function sampleApplications(): ApplicationRecord[] {
  const now = new Date().toISOString();
  return [
    {
      id: 'local-application-1',
      brand_id: DEFAULT_BRAND_ID,
      name: 'Nia Roots',
      email: 'nia@example.com',
      instagram_handle: 'niarootswellness',
      follower_count: 34200,
      niche: 'Smoothie recipes',
      location: 'Charlotte, NC',
      content_examples: ['https://instagram.com/reel/local-demo-1'],
      why_interested: 'I already use matcha in my Sunday reset content and want a structured product partnership.',
      status: 'pending',
      created_at: now
    },
    {
      id: 'local-application-2',
      brand_id: DEFAULT_BRAND_ID,
      name: 'Jordan Clean Glow',
      email: 'jordan@example.com',
      tiktok_handle: 'jordancleanglow',
      follower_count: 18600,
      niche: 'Clean skincare routines',
      location: 'Tampa, FL',
      content_examples: ['https://tiktok.com/@jordancleanglow/video/local-demo-2'],
      why_interested: 'My audience asks for body care swaps, and the oat milk soap fits my content.',
      status: 'pending',
      created_at: now
    }
  ];
}

const STORE_PATH = path.join(process.cwd(), '.gstack', 'local-launch-store.json');
const SECRET_FIELDS = new Set(['access_token', 'api_key', 'secret_key', 'api_token']);
const INTERNAL_FIELDS = new Set(['oauth_nonce', 'oauth_state_issued_at']);
const SUPPORTED_INTEGRATIONS = new Set(['shopify', 'meta', 'klaviyo', 'mailgun', 'resend', 'tiktok', 'apify', 'scrapling']);
const REQUIRED_FIELDS: Record<string, string[]> = {
  shopify: ['store', 'access_token'],
  meta: ['access_token', 'ig_user_id', 'page_id', 'ad_account_id'],
  klaviyo: ['api_key'],
  mailgun: ['api_key', 'domain', 'from_email'],
  resend: ['api_key', 'from_email'],
  tiktok: ['access_token', 'advertiser_id'],
  apify: ['api_token'],
  scrapling: ['api_key', 'lookup_url']
};

function defaultStore(): LaunchStore {
  return {
    brands: [
      {
        id: DEFAULT_BRAND_ID,
        name: 'Demo Brand',
        niche: 'Health Supplements',
        shopify_store: 'brand.myshopify.com',
        active: true
      }
    ],
    integrations: {},
    jobs: {},
    creators: { [DEFAULT_BRAND_ID]: SAMPLE_CREATORS },
    outreach: { [DEFAULT_BRAND_ID]: sampleOutreach() },
    shipments: {
      [DEFAULT_BRAND_ID]: [
        {
          id: 'local-shipment-1',
          brand_id: DEFAULT_BRAND_ID,
          handle: 'glowbymara',
          display_name: 'Mara Glow',
          avatar_url: fallbackProfilePhoto(1),
          products: 'Starter bundle, matcha powder, creator card',
          discount_code: 'MARA20',
          tracking_number: 'LOCAL-READY-1001',
          stage: 'shipped',
          status: 'shipped',
          created_at: new Date().toISOString()
        },
        {
          id: 'local-shipment-2',
          brand_id: DEFAULT_BRAND_ID,
          handle: 'cleanroutineclub',
          display_name: 'Clean Routine Club',
          avatar_url: fallbackProfilePhoto(2),
          products: 'VIP sample kit',
          discount_code: 'CLEAN15',
          stage: 'content_pending',
          status: 'content_pending',
          created_at: new Date().toISOString()
        }
      ]
    },
    campaigns: { [DEFAULT_BRAND_ID]: sampleCampaigns() },
    applications: { [DEFAULT_BRAND_ID]: sampleApplications() },
    briefs: {},
    agent_sessions: {},
    notification_states: {},
    waitlist: []
  };
}

async function readStore(): Promise<LaunchStore> {
  try {
    const raw = await fs.readFile(STORE_PATH, 'utf8');
    const parsed = JSON.parse(raw) as Partial<LaunchStore>;
    return {
      brands: parsed.brands?.length ? parsed.brands : defaultStore().brands,
      integrations: parsed.integrations || {},
      jobs: parsed.jobs || {},
      creators: parsed.creators || defaultStore().creators,
      outreach: parsed.outreach || defaultStore().outreach,
      shipments: parsed.shipments || defaultStore().shipments,
      campaigns: parsed.campaigns || defaultStore().campaigns,
      applications: parsed.applications || defaultStore().applications,
      briefs: parsed.briefs || {},
      agent_sessions: parsed.agent_sessions || {},
      notification_states: parsed.notification_states || {},
      waitlist: parsed.waitlist || []
    };
  } catch {
    return defaultStore();
  }
}

async function writeStore(store: LaunchStore) {
  await fs.mkdir(path.dirname(STORE_PATH), { recursive: true });
  await fs.writeFile(STORE_PATH, `${JSON.stringify(store, null, 2)}\n`);
}

function slugifyBrandId(name: string) {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 64) || `brand-${Date.now()}`;
}

function normalizeStoreUrl(value: string) {
  return value.trim().replace(/^https?:\/\//, '').replace(/\/$/, '').toLowerCase();
}

function normalizeOwnerEmail(value?: string | null) {
  return value?.trim().toLowerCase() || '';
}

function getRequestOwnerEmail(req: Request) {
  return normalizeOwnerEmail(req.headers.get('x-creatoros-user-email'));
}

function localAgencyOwnerEmails() {
  return new Set(
    (process.env.CREATOROS_AGENCY_EMAILS || '')
      .split(',')
      .map((email) => normalizeOwnerEmail(email))
      .filter(Boolean)
  );
}

function canAccessLocalBrand(brand: LaunchBrand, ownerEmail: string) {
  if (brand.id === DEFAULT_BRAND_ID) return true;
  if (!brand.owner_email) return true;
  if (!ownerEmail) return false;
  if (localAgencyOwnerEmails().has(ownerEmail)) return true;
  return normalizeOwnerEmail(brand.owner_email) === ownerEmail;
}

function isValidShopifyStore(value: string) {
  return /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(normalizeStoreUrl(value));
}

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { 'x-creatoros-fallback': 'local-launch-store' } });
}

function getPayload(body: unknown) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return {};
  const maybeWrapped = body as { data?: unknown };
  if (maybeWrapped.data && typeof maybeWrapped.data === 'object' && !Array.isArray(maybeWrapped.data)) {
    return maybeWrapped.data as Record<string, unknown>;
  }
  return body as Record<string, unknown>;
}

function validateIntegration(service: string, payload: Record<string, unknown>) {
  if (!SUPPORTED_INTEGRATIONS.has(service)) {
    return `Unsupported integration: ${service}`;
  }
  const missing = (REQUIRED_FIELDS[service] || []).filter((field) => !String(payload[field] || '').trim());
  if (missing.length) {
    return `Missing required ${service} credential fields: ${missing.map((field) => field.replace(/_/g, ' ')).join(', ')}`;
  }
  if (service === 'shopify' && !isValidShopifyStore(String(payload.store || ''))) {
    return 'Enter a Shopify store URL like brand.myshopify.com';
  }
  if (service === 'meta') {
    const igUserId = String(payload.ig_user_id || '').trim();
    const pageId = String(payload.page_id || '').trim();
    const adAccountId = String(payload.ad_account_id || '').trim();
    const token = String(payload.access_token || '').trim();
    if (!/^\d{6,}$/.test(igUserId)) return 'IG Business Account ID must be a numeric Meta ID';
    if (!/^\d{6,}$/.test(pageId)) return 'Facebook Page ID must be a numeric Meta ID';
    if (!/^act_\d{6,}$/.test(adAccountId)) return 'Ad Account ID must look like act_123456789';
    if (token.length < 20 || /^fake|^test|placeholder/i.test(token)) return 'Meta access token must be a real long-lived token';
  }
  if (service === 'tiktok') {
    const advertiserId = String(payload.advertiser_id || '').trim();
    const token = String(payload.access_token || '').trim();
    if (!/^\d{6,}$/.test(advertiserId)) return 'TikTok Advertiser ID must be numeric';
    if (token.length < 20 || /^fake|^test|placeholder/i.test(token)) return 'TikTok access token must be a real advertiser token';
  }
  if (service === 'klaviyo') {
    const apiKey = String(payload.api_key || '').trim();
    if (apiKey.length < 20 || /^fake|^test|placeholder/i.test(apiKey)) return 'Klaviyo private API key must be a real private key';
  }
  if (service === 'mailgun') {
    const apiKey = String(payload.api_key || '').trim();
    const domain = String(payload.domain || '').trim();
    const fromEmail = String(payload.from_email || '').trim();
    if (!apiKey.startsWith('key-') || apiKey.length < 20) return 'Mailgun API key must start with key-';
    if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain)) return 'Mailgun sending domain must be a valid domain';
    if (!/^[^@\s<>]+(?:\s*<[^@\s<>]+@[^@\s<>]+\.[^@\s<>]+>|@[^@\s<>]+\.[^@\s<>]+)$/i.test(fromEmail)) {
      return 'Mailgun from email must be an email address or Name <email@domain>';
    }
  }
  if (service === 'resend') {
    const apiKey = String(payload.api_key || '').trim();
    const fromEmail = String(payload.from_email || '').trim();
    if (!apiKey.startsWith('re_') || apiKey.length < 20) return 'Resend API key must start with re_';
    if (!/^[^@\s<>]+(?:\s*<[^@\s<>]+@[^@\s<>]+\.[^@\s<>]+>|@[^@\s<>]+\.[^@\s<>]+)$/i.test(fromEmail)) {
      return 'Resend from email must be an email address or Name <email@domain>';
    }
  }
  if (service === 'apify') {
    const apiToken = String(payload.api_token || '').trim();
    if (!apiToken.startsWith('apify_api_') || apiToken.length < 20) return 'Apify API token must start with apify_api_';
  }
  if (service === 'scrapling') {
    const apiKey = String(payload.api_key || '').trim();
    const lookupUrl = String(payload.lookup_url || '').trim();
    if (apiKey.length < 20 || /^fake|^test|placeholder/i.test(apiKey)) return 'Scrapling API key must be a real key';
    try {
      const url = new URL(lookupUrl);
      if (!['http:', 'https:'].includes(url.protocol)) return 'Scrapling lookup URL must be an http(s) URL';
    } catch {
      return 'Scrapling lookup URL must be a valid URL';
    }
  }
  return null;
}

function redactPayload(payload: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(payload)
      .filter(([key]) => !SECRET_FIELDS.has(key) && !INTERNAL_FIELDS.has(key))
      .map(([key, value]) => [key, key === 'store' ? normalizeStoreUrl(String(value)) : value])
  );
}

function getBrand(store: LaunchStore, brandId: string) {
  return store.brands.find((brand) => brand.id === brandId);
}

function getBrandIdFromSearch(req: Request) {
  try {
    return new URL(req.url).searchParams.get('brand_id') || DEFAULT_BRAND_ID;
  } catch {
    return DEFAULT_BRAND_ID;
  }
}

function resolveMetaWebhookBrandId(store: LaunchStore, recipientId?: string) {
  const normalizedRecipientId = String(recipientId || '').trim();
  if (!normalizedRecipientId) return DEFAULT_BRAND_ID;

  for (const [brandId, integrations] of Object.entries(store.integrations)) {
    const meta = integrations.meta;
    if (!meta?.connected) continue;
    const pageId = String(meta.page_id || '').trim();
    const igUserId = String(meta.ig_user_id || '').trim();
    if (normalizedRecipientId === pageId || normalizedRecipientId === igUserId) {
      return brandId;
    }
  }

  return DEFAULT_BRAND_ID;
}

function getSearchParam(req: Request, key: string) {
  try {
    return new URL(req.url).searchParams.get(key);
  } catch {
    return null;
  }
}

function getSearchValues(req: Request, key: string) {
  return (getSearchParam(req, key) || '')
    .split(/[.,]/)
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

function hasRealProfilePhoto(creator: Pick<CreatorRecord, 'avatar_url'>) {
  const url = creator.avatar_url?.trim() || '';
  return Boolean(url) && !/anonymous|placeholder|dicebear\.com\/9\.x\/initials/i.test(url);
}

function creatorMatchesEnrichmentSource(creator: CreatorRecord, source: string) {
  if (!source || source === 'all') return true;
  if (source === 'shopify_customer') return creator.discovered_via === 'shopify_customer';
  if (source === 'discovered') return creator.discovered_via !== 'shopify_customer';
  return creator.discovered_via === source;
}

function hasConfiguredPhotoProvider(store: LaunchStore, brandId: string) {
  const integrations = store.integrations[brandId] || {};
  return Boolean(
    integrations.apify?.connected ||
      integrations.scrapling?.connected ||
      process.env.APIFY_API_TOKEN ||
      process.env.SCRAPLING_API_KEY
  );
}

function getListWindow(req: Request, defaultLimit = 50, maxLimit = 500) {
  const limit = Math.max(1, Math.min(Number(getSearchParam(req, 'limit') || defaultLimit), maxLimit));
  const offset = Math.max(0, Number(getSearchParam(req, 'offset') || 0));
  return { limit, offset };
}

function cloneCreatorForBrand(creator: CreatorRecord, brandId: string): CreatorRecord {
  return { ...creator, brand_id: brandId, id: creator.id.replace(/^local-creator/, `${brandId}-creator`) };
}

function getCreators(store: LaunchStore, brandId: string) {
  if (store.creators[brandId]?.length) return store.creators[brandId];
  return SAMPLE_CREATORS.map((creator) => cloneCreatorForBrand(creator, brandId));
}

function setCreators(store: LaunchStore, brandId: string, creators: CreatorRecord[]) {
  store.creators[brandId] = creators;
}

function getApplications(store: LaunchStore, brandId: string) {
  if (store.applications[brandId]?.length) return store.applications[brandId];
  return sampleApplications().map((application) => ({
    ...application,
    brand_id: brandId,
    id: application.id.replace('local-', `${brandId}-`)
  }));
}

function setApplications(store: LaunchStore, brandId: string, applications: ApplicationRecord[]) {
  store.applications[brandId] = applications;
}

function reconcileOutreachWithCreators(store: LaunchStore, brandId: string, outreach: OutreachRecord[]) {
  const creators = getCreators(store, brandId);
  return outreach.map((item) => {
    const creator = creators.find((candidate) => (
      candidate.id === item.creator_id
      || candidate.handle.toLowerCase() === item.handle.toLowerCase()
    ));
    if (!creator) return item;
    return {
      ...item,
      display_name: item.display_name || creator.display_name,
      avatar_url: item.avatar_url || creator.avatar_url,
      score: Number.isFinite(Number(creator.score)) ? creator.score : 0
    };
  });
}

function getOutreach(store: LaunchStore, brandId: string) {
  if (store.outreach[brandId]?.length) return reconcileOutreachWithCreators(store, brandId, store.outreach[brandId]);
  return getCreators(store, brandId).map((creator, index) => ({
    id: `${brandId}-outreach-${index + 1}`,
    brand_id: brandId,
    creator_id: creator.id,
    handle: creator.handle,
    platform: creator.platform,
    display_name: creator.display_name,
    avatar_url: creator.avatar_url,
    channel: creator.platform === 'tiktok' ? 'email' : 'dm',
    subject: 'CreatorOS launch collaboration',
    message: buildProposalMessage(creator),
    status: index === 2 ? 'replied' : 'pending',
    score: creator.score,
    created_at: new Date().toISOString(),
    sent_at: index === 2 ? new Date().toISOString() : undefined
  }));
}

function buildProposalMessage(creator: Pick<CreatorRecord, 'display_name' | 'handle' | 'niche' | 'score'>) {
  const fitContext = Number(creator.score) > 0
    ? `Your audience fit score is ${creator.score},`
    : `Your ${creator.niche.toLowerCase()} audience looks relevant for this launch,`;
  return `Hey ${creator.display_name || `@${creator.handle}`}, we are building a small creator whitelisting launch around ${creator.niche.toLowerCase()}. ${fitContext} so we would love to send product, review fit, and talk through paid usage rights once you approve the concept.`;
}

function buildContentBrief(handle: string, contentType: string) {
  return [
    `Creator brief for @${handle.replace(/^@/, '')}`,
    '',
    `Format: ${contentType}`,
    'Hook: Show the daily routine problem before the product appears.',
    'Proof: Mention one concrete benefit, one texture or taste detail, and who it is best for.',
    'CTA: Invite viewers to comment for the routine or use the creator code after approval.',
    'Compliance: Avoid medical claims, guaranteed results, and unsupported before/after language.'
  ].join('\n');
}

function buildCreatorAnalysis(creator: CreatorRecord | { handle: string }) {
  const handle = creator.handle.replace(/^@/, '');
  const score = 'score' in creator ? creator.score : 82;
  const niche = 'niche' in creator ? creator.niche : 'wellness';
  return `@${handle} is a strong ${niche.toLowerCase()} fit with an estimated creator score of ${score}. Recommended next step: send a reviewed DM proposal, request media kit or Spark/whitelisting access, and keep initial usage rights to a 30-day test window.`;
}

function creatorCounts(creators: CreatorRecord[]) {
  return {
    all: creators.length,
    shopify: creators.filter((creator) => creator.discovered_via === 'shopify_customer').length,
    discovered: creators.filter((creator) => creator.discovered_via !== 'shopify_customer').length
  };
}

function previewMetricsForStore(store: string) {
  const seed = store.split('').reduce((total, char) => total + char.charCodeAt(0), 0);
  const estimatedCustomers = 2400 + (seed % 6400);
  const socialMatchRate = 22 + (seed % 18);
  const creatorCandidates = Math.round(estimatedCustomers * (socialMatchRate / 100) * 0.52);
  const vipBuyerLtv = 18000 + (seed % 52000);
  return {
    estimated_customers: estimatedCustomers,
    social_match_rate: socialMatchRate,
    creator_candidates: creatorCandidates,
    vip_buyer_ltv: vipBuyerLtv
  };
}

function buildNotifications(store: LaunchStore, brandId: string): NotificationRecord[] {
  const now = new Date().toISOString();
  const notifications: NotificationRecord[] = [];
  const integrations = store.integrations[brandId] || {};
  const missingIntegrations = ['shopify', 'meta', 'klaviyo'].filter((service) => !integrations[service]?.connected);
  const applications = getApplications(store, brandId);
  const outreach = getOutreach(store, brandId);
  const campaigns = store.campaigns[brandId] || (brandId === DEFAULT_BRAND_ID ? defaultStore().campaigns[DEFAULT_BRAND_ID] : []) || [];
  const creators = getCreators(store, brandId);
  const shipments = store.shipments[brandId] || [];

  if (missingIntegrations.length) {
    notifications.push({
      id: `${brandId}:integrations`,
      title: 'Launch integrations need attention',
      body: `Connect ${missingIntegrations.join(', ')} before running the full whitelisting workflow.`,
      status: 'unread',
      createdAt: now,
      actions: [{ id: 'integrations', label: 'Review integrations', type: 'redirect', style: 'primary' }]
    });
  }

  const pendingApplications = applications.filter((application) => application.status === 'pending').length;
  if (pendingApplications) {
    notifications.push({
      id: `${brandId}:applications`,
      title: 'Creator applications are waiting',
      body: `${pendingApplications} creator application${pendingApplications === 1 ? ' is' : 's are'} ready for review.`,
      status: 'unread',
      createdAt: now,
      actions: [{ id: 'applications', label: 'Review applications', type: 'redirect', style: 'primary' }]
    });
  }

  const repliedOutreach = outreach.filter((item) => item.status === 'replied').length;
  const pendingOutreach = outreach.filter((item) => ['pending', 'draft'].includes(item.status)).length;
  if (repliedOutreach) {
    notifications.push({
      id: `${brandId}:replies`,
      title: 'Creators replied to outreach',
      body: `${repliedOutreach} creator repl${repliedOutreach === 1 ? 'y needs' : 'ies need'} terms, gifting, or whitelisting follow-up.`,
      status: 'unread',
      createdAt: now,
      actions: [{ id: 'kanban', label: 'Open pipeline', type: 'redirect', style: 'primary' }]
    });
  } else if (pendingOutreach) {
    notifications.push({
      id: `${brandId}:proposals`,
      title: 'Outreach proposals are queued',
      body: `${pendingOutreach} proposal${pendingOutreach === 1 ? ' is' : 's are'} ready to review or send.`,
      status: 'unread',
      createdAt: now,
      actions: [{ id: 'proposals', label: 'Review proposals', type: 'redirect', style: 'primary' }]
    });
  }

  const contentPending = shipments.filter((shipment) => shipment.stage === 'content_pending' || shipment.status === 'content_pending').length;
  if (contentPending) {
    notifications.push({
      id: `${brandId}:gifting`,
      title: 'Gifting follow-up is due',
      body: `${contentPending} creator shipment${contentPending === 1 ? ' is' : 's are'} waiting on content follow-up.`,
      status: 'unread',
      createdAt: now,
      actions: [{ id: 'gifting', label: 'Track gifting', type: 'redirect', style: 'primary' }]
    });
  }

  const activeCampaigns = campaigns.filter((campaign) => campaign.status === 'active').length;
  if (activeCampaigns) {
    notifications.push({
      id: `${brandId}:campaigns`,
      title: 'Active campaigns are running',
      body: `${activeCampaigns} campaign${activeCampaigns === 1 ? ' is' : 's are'} active. Check delivery and spend before scaling.`,
      status: 'read',
      createdAt: now,
      actions: [{ id: 'campaigns', label: 'View campaigns', type: 'redirect', style: 'primary' }]
    });
  }

  const highFitCreators = creators.filter((creator) => creator.status === 'discovered' && creator.score >= 80).length;
  if (highFitCreators) {
    notifications.push({
      id: `${brandId}:creators`,
      title: 'High-fit creators are ready',
      body: `${highFitCreators} discovered creator${highFitCreators === 1 ? ' matches' : 's match'} the launch score threshold.`,
      status: 'unread',
      createdAt: now,
      actions: [{ id: 'creators', label: 'Review creators', type: 'redirect', style: 'primary' }]
    });
  }

  if (!notifications.length) {
    notifications.push({
      id: `${brandId}:ready`,
      title: 'Workspace is ready',
      body: 'No launch blockers are currently waiting in integrations, outreach, applications, or campaigns.',
      status: 'read',
      createdAt: now,
      actions: [{ id: 'workspaces', label: 'View workspace', type: 'redirect', style: 'primary' }]
    });
  }

  return notifications;
}

function notificationStateKey(brandId: string) {
  return brandId;
}

function applyNotificationState(store: LaunchStore, brandId: string, notifications: NotificationRecord[]) {
  const states = store.notification_states[notificationStateKey(brandId)] || {};
  return notifications
    .filter((notification) => !states[notification.id]?.dismissed)
    .map((notification) => ({
      ...notification,
      status: states[notification.id]?.status || notification.status
    }));
}

function updateNotificationStates(
  store: LaunchStore,
  brandId: string,
  notificationIds: string[],
  status?: string,
  dismissed?: boolean
) {
  const allowedStatuses = new Set(['unread', 'read', 'archived']);
  const nextStatus = status ? status.trim().toLowerCase() : undefined;
  if (nextStatus && !allowedStatuses.has(nextStatus)) {
    return 'Notification status must be unread, read, or archived';
  }
  const key = notificationStateKey(brandId);
  const existing = store.notification_states[key] || {};
  const now = new Date().toISOString();
  for (const notificationId of notificationIds) {
    existing[notificationId] = {
      ...existing[notificationId],
      ...(nextStatus ? { status: nextStatus as NotificationStateRecord['status'] } : {}),
      ...(typeof dismissed === 'boolean' ? { dismissed } : {}),
      updated_at: now
    };
  }
  store.notification_states[key] = existing;
  return null;
}

function buildAtlasReadinessPlaybook(brandName: string) {
  const evidence = [
    'awesome-llm-apps agent skills: package reusable instructions plus optional scripts/references.',
    'awesome-llm-apps RAG routing: route questions to the right knowledge domain before answering.',
    'awesome-llm-apps RAG diagnostics clinic: classify failures into reusable patterns and propose minimal structural fixes.'
  ];

  return {
    evidence,
    summary: `${brandName} is in a production-readiness loop: verify Shopify submission gates, keep provider credentials aligned, maintain creator photo/stat coverage, and run live writes through preview or confirmation first.`,
    actions: [
      {
        type: 'feature_brief',
        label: 'Open Shopify readiness playbook',
        params: {
          content: [
            `Atlas readiness playbook for ${brandName}:`,
            '',
            '1. Run `npm run verify:production` before every release handoff.',
            '2. Keep `npm run verify:shopify` green.',
            '3. Confirm Resend or Mailgun readiness for reviewed outbound email.',
            '4. Confirm Apify or Scrapling readiness for profile-photo enrichment.',
            '5. Keep discovered creator photos above the strict readiness threshold and rerun capped enrichment when coverage regresses.',
            '6. Treat every live outreach, payout, shipment, agreement, and billing action as preview-first or confirmation-gated.',
            '',
            'Pattern source: adapted from awesome-llm-apps agent skills, RAG routing, and RAG failure diagnostics examples.'
          ].join('\n')
        }
      },
      {
        type: 'feature_brief',
        label: 'Diagnose readiness drift',
        params: {
          content: [
            'Readiness drift diagnosis:',
            '',
            '- P09 Evaluation blind spot: a page can render while a workflow button, provider, or mobile state is broken. Keep source guards plus in-app browser checks.',
            '- P10 Startup ordering: a deployment can pass build while backend services or provider checks are not ready yet. Check readiness endpoints after deploy.',
            '- P11 Config drift: local, VPS, and Netlify can diverge on Resend, Apify, Scrapling, Shopify, or operator acknowledgement flags.',
            '- P12 Multi-tenant interference: every API probe and fallback record must stay scoped to the active brand/workspace.'
          ].join('\n')
        }
      }
    ],
    suggestions: [
      {
        type: 'readiness',
        message: 'Run the production autopilot gate and compare the output to the Shopify submission packet.',
        action: {
          type: 'feature_brief',
          label: 'Production gate checklist',
          params: {
            content: 'Run `npm run creatoros:autopilot`, then verify the output still shows green Shopify readiness, provider readiness, profile-photo coverage, and only truthful external Shopify operator acknowledgements remaining.'
          }
        }
      },
      {
        type: 'integration',
        message: 'Check Resend/Mailgun plus Apify/Scrapling readiness before any live creator campaign run.',
        action: {
          type: 'feature_brief',
          label: 'Provider readiness checklist',
          params: {
            content: 'Provider readiness: Resend is preferred for outbound email; Mailgun remains a fallback. Profile photos should use Apify or a complete Scrapling lookup provider. Do not treat a credential as ready until the backend readiness endpoint reports the required fields are present and verified.'
          }
        }
      },
      {
        type: 'qa',
        message: 'Use the in-app browser for confirmation-dialog and mobile checks on payouts, applications, agreements, campaigns, support, outreach, and integrations.',
        action: {
          type: 'feature_brief',
          label: 'Browser QA checklist',
          params: {
            content: 'Browser QA checklist: verify each route loads, mobile controls stay contained, profile and integration images are not broken, live-write buttons open a confirmation, cancel paths work, and no Atlas floating button blocks dense forms.'
          }
        }
      }
    ]
  };
}

function sampleSupportTickets(brandId = DEFAULT_BRAND_ID) {
  const now = new Date().toISOString();
  return [
    {
      id: 'local-support-ticket-1',
      brand_id: brandId,
      customer_name: 'Nia Roots',
      customer_email: 'nia@example.com',
      status: 'open',
      priority: 'normal',
      subject: 'Application status and gifting timeline',
      summary: 'Creator asked when product gifting begins after approval.',
      escalated: false,
      last_ai_confidence: 0.86,
      last_message_at: now,
      updated_at: now
    },
    {
      id: 'local-support-ticket-2',
      brand_id: brandId,
      customer_name: 'Mara Glow',
      customer_email: 'mara@example.com',
      status: 'escalated',
      priority: 'high',
      subject: 'Affiliate link question',
      summary: 'Creator needs a human answer about affiliate tracking before posting.',
      escalated: true,
      last_ai_confidence: 0.58,
      last_message_at: now,
      updated_at: now
    }
  ];
}

function sampleSupportMessages(ticketId: string) {
  const now = new Date().toISOString();
  return [
    {
      id: `${ticketId}-message-1`,
      ticket_id: ticketId,
      role: 'user',
      content: 'Hi, I applied for the Demo Brand creator program. When would product gifting start if I am approved?',
      created_at: now
    },
    {
      id: `${ticketId}-message-2`,
      ticket_id: ticketId,
      role: 'assistant',
      content: 'Thanks for applying. Approved creators usually receive next steps for product gifting after the team reviews fit, shipping location, and content timing.',
      confidence: 0.86,
      created_at: now
    }
  ];
}

function sampleViewProgram() {
  return {
    enabled: true,
    rate_per_1k_usd: 2,
    store_credit_multiplier: 1.5,
    points_multiplier: 2,
    points_per_usd: 100,
    min_payout_usd: 25,
    organic_post_cap_usd: 100,
    manual_review_usd: 150,
    require_disclosure: true
  };
}

function samplePayouts(brandId = DEFAULT_BRAND_ID) {
  const now = new Date().toISOString();
  return [
    {
      id: 'local-payout-1',
      brand_id: brandId,
      creator_id: 'local-creator-1',
      source: 'organic_post',
      views_counted: 18400,
      bounty_usd: 36.8,
      method: 'store_credit',
      multiplier: 1.5,
      payout_amount: 55.2,
      points_amount: 5520,
      status: 'held',
      hold_reason: 'Manual review required before release',
      external_provider: 'shopify_store_credit',
      created_at: now,
      updated_at: now
    },
    {
      id: 'local-payout-2',
      brand_id: brandId,
      creator_id: 'local-creator-2',
      source: 'whitelisted_ad',
      views_counted: 9200,
      bounty_usd: 18.4,
      method: 'points',
      multiplier: 2,
      payout_amount: 36.8,
      points_amount: 3680,
      status: 'pending',
      external_provider: 'loyalty_points',
      created_at: now,
      updated_at: now
    }
  ];
}

async function parseBody(req: Request) {
  try {
    return await req.json();
  } catch {
    return {};
  }
}

function safeDecodePathSegment(segment: string) {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

export async function handleLaunchFallback(req: Request, apiPath: string, method: string) {
  const segments = apiPath.replace(/^\/+/, '').split('/').filter(Boolean).map(safeDecodePathSegment);
  if (segments[0] !== 'api') return null;

  const store = await readStore();

  if (method === 'GET' && segments[1] === 'readiness' && segments.length === 2) {
    return json({
      status: 'ready',
      mode: 'local_launch_store',
      detail: 'Using the local QA service because the configured API does not expose the onboarding endpoints.',
      checks: {
        database: { ok: true, mode: 'local_launch_store' },
        brand_integrations_migration: { ok: true, mode: 'local_launch_store' },
        integration_secret_storage: { ok: true, mode: 'server_redacted_local_store' },
        shopify_import_jobs: { ok: true, mode: 'local_launch_store' },
        shopify_oauth: { ok: true, mode: 'manual_token_or_configured_oauth' },
        outreach_providers: {
          ok: true,
          email_configured: true,
          email_provider: 'local-resend-sim',
          mode: 'local_launch_store'
        },
        profile_photo_providers: {
          ok: false,
          meta_configured: false,
          apify_configured: false,
          scrapling_configured: false,
          mode: 'local_launch_store'
        }
      }
    });
  }

  if (segments[1] === 'support' && segments[2] === 'tickets') {
    const brandId = getBrandIdFromSearch(req) || DEFAULT_BRAND_ID;
    const tickets = sampleSupportTickets(brandId);
    if (method === 'GET' && segments.length === 3) {
      return json({ tickets });
    }
    const ticketId = segments[3];
    const ticket = tickets.find((item) => item.id === ticketId) || tickets[0];
    if (method === 'GET' && ticketId && segments.length === 4) {
      return json({ ticket, messages: sampleSupportMessages(ticket.id) });
    }
    if (method === 'POST' && ticketId && segments[4] === 'reply') {
      const body = await parseBody(req);
      const message = String(body.message || '').trim();
      if (!message) return json({ detail: 'Reply message is required' }, 422);
      return json({
        ok: true,
        ticket,
        message: {
          id: `${ticket.id}-staff-${Date.now()}`,
          ticket_id: ticket.id,
          role: 'staff',
          content: message,
          created_at: new Date().toISOString()
        }
      });
    }
  }

  if (method === 'POST' && segments[1] === 'support' && segments[2] === 'public' && segments[3] === 'message') {
    const body = await parseBody(req);
    const brandId = String(body.brand_id || DEFAULT_BRAND_ID);
    const message = String(body.message || '').trim();
    const email = String(body.customer_email || body.email || '').trim().toLowerCase();
    if (!message) return json({ detail: 'Message is required' }, 422);
    if (email && !isValidEmail(email)) return json({ detail: 'Enter a valid email address' }, 422);
    const ticket = sampleSupportTickets(brandId)[0];
    return json({
      ok: true,
      ticket_id: ticket.id,
      response: 'I created a Demo Brand support ticket and added the creator program context for the team.',
      ticket
    }, 201);
  }

  if (segments[1] === 'brands' && segments[3] === 'view-program') {
    if (method === 'GET') return json(sampleViewProgram());
    if (method === 'PUT') {
      const body = await parseBody(req);
      return json({ ...sampleViewProgram(), ...body });
    }
  }

  if (method === 'GET' && segments[1] === 'brands' && segments[3] === 'payouts' && segments.length === 4) {
    return json({ payouts: samplePayouts(segments[2] || DEFAULT_BRAND_ID) });
  }

  if (method === 'POST' && segments[1] === 'brands' && segments[3] === 'views' && segments[4] === 'accrue') {
    return json({ ok: true, created: 2, payouts_created: 2, organic: 1, whitelisted: 1 });
  }

  if (method === 'POST' && segments[1] === 'brands' && segments[3] === 'payouts' && segments[4] === 'settle') {
    const dryRun = new URL(req.url).searchParams.get('dry_run') === 'true';
    const payouts = samplePayouts(segments[2] || DEFAULT_BRAND_ID);
    if (dryRun) {
      return json({
        dry_run: true,
        plans: payouts.map((payout) => ({
          payout_id: payout.id,
          amount: payout.payout_amount,
          method: payout.method,
          status: payout.status === 'pending' ? 'pending' : 'held',
          reason: payout.hold_reason || null
        }))
      });
    }
    return json({ ok: true, paid: 0, held: 1, pending: 1, failed: 0 });
  }

  if (
    method === 'POST' &&
    segments[1] === 'brands' &&
    segments[3] === 'payouts' &&
    segments[4] &&
    (segments[5] === 'approve' || segments[5] === 'reject')
  ) {
    return json({ ok: true, payout_id: segments[4], status: segments[5] === 'approve' ? 'approved' : 'rejected' });
  }

  if (method === 'GET' && segments[1] === 'notifications' && segments.length === 2) {
    const brandId = getBrandIdFromSearch(req);
    return json(applyNotificationState(store, brandId, buildNotifications(store, brandId)));
  }

  if (method === 'PATCH' && segments[1] === 'notifications' && segments[2] === 'read') {
    const body = await parseBody(req);
    const brandId = String(body.brand_id || getBrandIdFromSearch(req));
    const notificationIds = Array.isArray(body.notification_ids)
      ? body.notification_ids.map((id: unknown) => String(id)).filter(Boolean)
      : [];
    const error = updateNotificationStates(
      store,
      brandId,
      notificationIds,
      body.status ? String(body.status) : 'read',
      typeof body.dismissed === 'boolean' ? body.dismissed : undefined
    );
    if (error) return json({ detail: error }, 400);
    await writeStore(store);
    return json({ ok: true, updated: notificationIds.length });
  }

  if (method === 'PATCH' && segments[1] === 'notifications' && segments[2]) {
    const body = await parseBody(req);
    const brandId = String(body.brand_id || getBrandIdFromSearch(req));
    const error = updateNotificationStates(
      store,
      brandId,
      [segments[2]],
      body.status ? String(body.status) : undefined,
      typeof body.dismissed === 'boolean' ? body.dismissed : undefined
    );
    if (error) return json({ detail: error }, 400);
    await writeStore(store);
    return json({ ok: true, id: segments[2] });
  }

  if (method === 'GET' && segments[1] === 'waitlist' && segments[2] === 'count') {
    return json({ count: store.waitlist.length });
  }

  if (method === 'POST' && segments[1] === 'waitlist' && segments.length === 2) {
    const body = await parseBody(req);
    const email = String(body.email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: 'Enter a valid email address' }, 400);
    const alreadyJoined = store.waitlist.some((entry) => entry.email === email);
    if (!alreadyJoined) {
      store.waitlist.push({
        email,
        source: body.source ? String(body.source) : 'landing',
        plan_interest: body.plan_interest ? String(body.plan_interest) : undefined,
        created_at: new Date().toISOString()
      });
      await writeStore(store);
    }
    return json({
      ok: true,
      email,
      message: alreadyJoined ? 'You are already on the launch list.' : "You're on the launch list."
    }, alreadyJoined ? 200 : 201);
  }

  if (method === 'GET' && segments[1] === 'ai' && segments[2] === 'agent-suggestions') {
    const brandId = getBrandIdFromSearch(req);
    const brand = getBrand(store, brandId);
    const playbook = buildAtlasReadinessPlaybook(brand?.name || 'the active workspace');
    return json({
      mode: 'agentic_readiness_playbook',
      evidence: playbook.evidence,
      suggestions: [
        ...playbook.suggestions,
        {
          type: 'discovery',
          message: 'Run discovery only after the client confirms niche keywords and target creator tiers.',
          action: { type: 'discover', label: 'Run discovery', params: { limit: 50 } }
        }
      ]
    });
  }

  if (segments[1] === 'ai' && segments[2] === 'chat-sessions') {
    if (method === 'GET') {
      const brandId = getBrandIdFromSearch(req);
      return json({
        sessions: store.agent_sessions[brandId] || [],
        updated_at: null
      });
    }
    if (method === 'PUT') {
      const body = await parseBody(req);
      const brandId = String(body.brand_id || DEFAULT_BRAND_ID);
      const sessions = Array.isArray(body.sessions) ? body.sessions as AgentChatSessionRecord[] : [];
      store.agent_sessions[brandId] = sessions;
      await writeStore(store);
      return json({ ok: true, sessions, updated_at: new Date().toISOString() });
    }
  }

  if (method === 'GET' && segments[1] === 'ai' && segments[2] === 'smart-queue') {
    const brandId = getBrandIdFromSearch(req);
    const queue = getCreators(store, brandId)
      .toSorted((a, b) => b.score - a.score)
      .slice(0, Number(getSearchParam(req, 'limit') || 10))
      .map((creator, index) => ({
        ...creator,
        priority: index < 2 ? 'high' : index < 5 ? 'medium' : 'low',
        ai_action: creator.status === 'replied'
          ? 'Prepare whitelisting terms and usage rights'
          : 'Generate reviewed outreach proposal'
      }));
    return json({ queue });
  }

  if (method === 'POST' && segments[1] === 'ai' && segments[2] === 'chat') {
    const body = await parseBody(req);
    const brandId = String(body.brand_id || DEFAULT_BRAND_ID);
    const brand = getBrand(store, brandId);
    const creators = getCreators(store, brandId);
    const message = String(body.message || '').trim();
    if (!message) return json({ detail: 'Message cannot be empty' }, 422);
    const playbook = buildAtlasReadinessPlaybook(brand?.name || 'the launch workspace');
    return json({
      response:
        `${playbook.summary}\n\nI adapted the agent-skills, query-routing, and diagnostics patterns from awesome-llm-apps into a concrete CreatorOS readiness loop, so Atlas can answer with QA evidence and next-best actions instead of generic AI advice.`,
      actions: [
        ...playbook.actions,
        { type: 'discover', label: 'Prepare creator discovery', params: { limit: 50 } }
      ],
      creator_cards: creators.slice(0, 2),
      evidence: playbook.evidence,
      suggestions: playbook.suggestions
    });
  }

  if (method === 'POST' && segments[1] === 'ai' && segments[2] === 'analyze-creator') {
    const body = await parseBody(req);
    const brandId = String(body.brand_id || DEFAULT_BRAND_ID);
    const handle = String(body.handle || '').replace(/^@/, '').trim();
    if (!handle) return json({ detail: 'Creator handle is required' }, 422);
    const creators = getCreators(store, brandId);
    const creator = creators.find((item) => item.handle === handle);
    const analysis = buildCreatorAnalysis(creator || { handle });
    let savedCreator: CreatorRecord | null = creator || null;
    const generatedAt = new Date().toISOString();
    if (body.dry_run) {
      return json({
        ok: true,
        dry_run: true,
        handle,
        analysis,
        creator: savedCreator,
        would_update_creator_meta: Boolean(creator),
        meta_preview: {
          ai_analysis: {
            text: analysis,
            generated_at: generatedAt,
            source: 'creatoros-local'
          }
        }
      });
    }
    if (creator) {
      const updatedCreator: CreatorRecord = {
        ...creator,
        meta: {
          ...creator.meta,
          ai_analysis: {
            text: analysis,
            generated_at: generatedAt,
            source: 'creatoros-local'
          }
        }
      };
      setCreators(store, brandId, creators.map((item) => item.id === creator.id ? updatedCreator : item));
      await writeStore(store);
      savedCreator = updatedCreator;
    }
    return json({
      ok: true,
      handle,
      analysis,
      creator: savedCreator
    });
  }

  if (method === 'POST' && segments[1] === 'ai' && segments[2] === 'content-brief') {
    const body = await parseBody(req);
    const brandId = String(body.brand_id || DEFAULT_BRAND_ID);
    const handle = String(body.handle || '').replace(/^@/, '').trim();
    if (!handle) return json({ detail: 'Creator handle is required' }, 422);
    const contentType = String(body.content_type || 'reel');
    const creator = getCreators(store, brandId).find((item) => item.handle === handle || item.id === body.creator_id);
    const targetHandle = creator?.handle || handle;
    const briefText = buildContentBrief(targetHandle, contentType);
    const title = `${contentType.replace(/_/g, ' ')} brief for @${targetHandle}`;
    const savedBrief: BriefRecord = {
      id: crypto.randomUUID(),
      brand_id: brandId,
      creator_id: creator?.id,
      title,
      content_type: contentType,
      scripts: [{ title, content: briefText }],
      visual_notes: briefText,
      posting_guidelines: 'Review generated brief before sending to creator.',
      created_at: new Date().toISOString(),
      handle: targetHandle,
      platform: creator?.platform
    };
    if (body.dry_run) {
      return json({
        ok: true,
        dry_run: true,
        handle: targetHandle,
        content_type: contentType,
        brief: briefText,
        would_create_brief: true,
        saved_brief_preview: {
          ...savedBrief,
          id: `dry-run:${creator?.id || targetHandle}`
        },
        message: 'Dry run ready: would generate a content brief in local launch mode.'
      });
    }
    store.briefs[brandId] = [savedBrief, ...(store.briefs[brandId] || [])];
    await writeStore(store);
    return json({
      ok: true,
      handle: targetHandle,
      content_type: contentType,
      brief: briefText,
      brief_id: savedBrief.id,
      saved_brief: savedBrief,
      message: 'Content brief generated in local launch mode.'
    });
  }

  if (method === 'POST' && segments[1] === 'ai' && segments[2] === 'batch-proposals') {
    const body = await parseBody(req);
    const brandId = String(body.brand_id || DEFAULT_BRAND_ID);
    const limit = Math.max(1, Math.min(Number(body.limit || 5), 50));
    const creators = getCreators(store, brandId).slice(0, limit);
    const existing = getOutreach(store, brandId);
    const now = new Date().toISOString();
    const proposals = creators.map((creator) => ({
      id: crypto.randomUUID(),
      brand_id: brandId,
      creator_id: creator.id,
      handle: creator.handle,
      platform: creator.platform,
      display_name: creator.display_name,
      avatar_url: creator.avatar_url,
      channel: creator.platform === 'tiktok' ? 'email' : 'dm',
      subject: 'CreatorOS launch collaboration',
      message: buildProposalMessage(creator),
      status: 'pending',
      score: creator.score,
      created_at: now
    }));
    if (body.dry_run) {
      return json({
        ok: true,
        dry_run: true,
        sent: 0,
        count: proposals.length,
        would_create_outreach_rows: proposals.length,
        proposals: proposals.map((proposal) => ({
          ...proposal,
          id: `dry-run:${proposal.creator_id}`,
          outreach_id: null,
          message_preview: proposal.message.length > 150 ? `${proposal.message.slice(0, 150)}...` : proposal.message
        })),
        message: `Dry run ready: would generate ${proposals.length} reviewed creator proposal${proposals.length === 1 ? '' : 's'}.`
      });
    }
    store.outreach[brandId] = [...proposals, ...existing];
    await writeStore(store);
    return json({
      ok: true,
      count: proposals.length,
      sent: proposals.length,
      proposals,
      message: `Generated ${proposals.length} reviewed creator proposal${proposals.length === 1 ? '' : 's'}.`
    });
  }

  if (method === 'POST' && segments[1] === 'discover') {
    const body = await parseBody(req);
    const brandId = String(body.brand_id || DEFAULT_BRAND_ID);
    const keywords = Array.isArray(body.keywords) ? body.keywords.map(String).filter(Boolean) : [String(body.keywords || 'wellness')];
    const platform = body.platform === 'tiktok' ? 'tiktok' : 'instagram';
    const limit = Math.max(1, Math.min(Number(body.limit || 10), 25));
    const existing = getCreators(store, brandId);
    const newCreators: CreatorRecord[] = Array.from({ length: Math.min(limit, 6) }).map((_, index) => {
      const keyword = keywords[index % keywords.length] || 'wellness';
      const handle = `${keyword.toLowerCase().replace(/[^a-z0-9]+/g, '') || 'creator'}daily${index + 1}`;
      return {
        id: crypto.randomUUID(),
        brand_id: brandId,
        handle,
        platform,
        display_name: handle.replace(/\d+$/, '').replace(/^\w/, (char) => char.toUpperCase()),
        avatar_url: fallbackProfilePhoto(index + 3),
        follower_count: 12000 + index * 7400,
        engagement_rate: 3.4 + index * 0.3,
        score: 76 + index,
        niche: keyword,
        status: 'discovered',
        email: `${handle}@example.com`,
        location: index % 2 === 0 ? 'Los Angeles, CA' : 'Atlanta, GA',
        bio: `Local launch discovery candidate for ${keyword}.`,
        ig_handle: handle,
        order_count: 0,
        total_spent: 0,
        discovered_via: 'discovered'
      };
    });
    if (body.dry_run) {
      return json({
        ok: true,
        dry_run: true,
        status: 'preview',
        discovered: 0,
        count: newCreators.length,
        would_create_creators: newCreators.length,
        creators: newCreators.map((creator) => ({ ...creator, id: `dry-run:${creator.handle}` })),
        message: `Dry run ready: would add ${newCreators.length} creator candidate${newCreators.length === 1 ? '' : 's'}.`,
        keywords,
        platform,
        source: 'local_launch_store'
      });
    }
    setCreators(store, brandId, [...newCreators, ...existing]);
    await writeStore(store);
    return json({
      ok: true,
      discovered: newCreators.length,
      count: newCreators.length,
      creators: newCreators,
      message: `Discovery added ${newCreators.length} launch-mode creators.`
    }, 201);
  }

  if (segments[1] === 'applications') {
    const brandId = getBrandIdFromSearch(req);

    if (method === 'GET' && segments.length === 2) {
      const status = getSearchParam(req, 'status');
      const applications = getApplications(store, brandId)
        .filter((application) => !status || application.status === status)
        .toSorted((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      return json(applications);
    }

    if (method === 'POST' && segments.length === 2) {
      const body = await parseBody(req);
      const requestBrandId = String(body.brand_id || brandId || DEFAULT_BRAND_ID);
      const name = String(body.name || '').trim();
      if (!name) return json({ detail: 'Application name is required' }, 422);
      if (name.length > 120) return json({ detail: 'Use 120 characters or fewer for your name' }, 422);
      const email = String(body.email || '').trim();
      if (!email || !isValidEmail(email)) return json({ detail: 'Add a valid email address' }, 422);
      if (email.length > 254) return json({ detail: 'Use 254 characters or fewer for your email address' }, 422);
      const instagramHandle = body.instagram_handle ? String(body.instagram_handle).trim().replace(/^@+/, '') : '';
      const tiktokHandle = body.tiktok_handle ? String(body.tiktok_handle).trim().replace(/^@+/, '') : '';
      if (instagramHandle.length > 50 || tiktokHandle.length > 50) return json({ detail: 'Use 50 characters or fewer for social handles' }, 422);
      if (!instagramHandle && !tiktokHandle) return json({ detail: 'Add at least one Instagram or TikTok handle' }, 400);
      const followerCount = Number(body.follower_count);
      if (!Number.isFinite(followerCount) || followerCount < 1000) return json({ detail: 'Select your follower count range' }, 422);
      const niche = String(body.niche || '').trim();
      if (!niche) return json({ detail: 'Select your content niche' }, 422);
      const contentExamples = Array.isArray(body.content_examples)
        ? (body.content_examples as unknown[]).map((example) => String(example).trim()).filter(Boolean)
        : [];
      if (contentExamples.some((example) => example.length > 500)) return json({ detail: 'Use 500 characters or fewer for content links' }, 422);
      if (contentExamples.some((example) => !isValidHttpUrl(example))) return json({ detail: 'Use a valid http or https content link' }, 422);
      const application: ApplicationRecord = {
        id: crypto.randomUUID(),
        brand_id: requestBrandId,
        name,
        email,
        instagram_handle: instagramHandle || undefined,
        tiktok_handle: tiktokHandle || undefined,
        follower_count: followerCount,
        niche,
        location: body.location ? String(body.location) : undefined,
        content_examples: contentExamples,
        why_interested: body.why_interested ? String(body.why_interested) : undefined,
        status: 'pending',
        created_at: new Date().toISOString()
      };
      setApplications(store, requestBrandId, [application, ...getApplications(store, requestBrandId)]);
      await writeStore(store);
      return json({ id: application.id, status: application.status }, 201);
    }

    if (method === 'PATCH' && segments[2] && ['approve', 'reject'].includes(segments[3] || '')) {
      const body = await parseBody(req);
      const requestBrandId = String(body.brand_id || brandId || '').trim();
      if (!requestBrandId) return json({ detail: 'brand_id is required' }, 400);
      const applications = getApplications(store, requestBrandId);
      const target = applications.find((application) => application.id === segments[2]);
      if (!target) return json({ detail: 'Application not found' }, 404);
      if (target.status !== 'pending') {
        return json({
          detail: segments[3] === 'approve'
            ? 'Only pending applications can be approved'
            : 'Only pending applications can be rejected'
        }, 409);
      }
      const platform = target.instagram_handle ? 'instagram' : 'tiktok';
      const handle = (target.instagram_handle || target.tiktok_handle || target.name.toLowerCase().replace(/[^a-z0-9]+/g, '')).replace(/^@/, '');
      const existingCreator = getCreators(store, requestBrandId).find((creator) => (
        creator.platform === platform && creator.handle === handle
      ));
      if (body.dry_run) {
        if (segments[3] === 'approve') {
          return json({
            ok: true,
            dry_run: true,
            application_id: target.id,
            brand_id: requestBrandId,
            would_approve_application: true,
            would_create_or_update_creator: true,
            would_update_existing_creator: Boolean(existingCreator),
            creator_preview: {
              platform,
              handle,
              display_name: target.name,
              email: target.email,
              status: 'onboarded',
              discovered_via: 'application',
              existing_creator_id: existingCreator?.id || null
            }
          });
        }
        return json({
          ok: true,
          dry_run: true,
          application_id: target.id,
          brand_id: requestBrandId,
          would_reject_application: true,
          would_create_or_update_creator: false,
          status_preview: 'rejected'
        });
      }
      const reviewedAt = new Date().toISOString();
      let creatorId = target.creator_id;
      if (segments[3] === 'approve' && !creatorId) {
        const creator: CreatorRecord = {
          id: crypto.randomUUID(),
          brand_id: requestBrandId,
          handle,
          platform,
          display_name: target.name,
          avatar_url: fallbackProfilePhoto(3),
          follower_count: target.follower_count || 0,
          engagement_rate: 0,
          score: 0,
          niche: target.niche || 'Creator application',
          status: 'onboarded',
          email: target.email,
          location: target.location,
          bio: target.why_interested,
          ig_handle: target.instagram_handle,
          order_count: 0,
          total_spent: 0,
          discovered_via: 'application'
        };
        setCreators(store, requestBrandId, [creator, ...getCreators(store, requestBrandId)]);
        creatorId = creator.id;
      }
      const nextStatus: ApplicationRecord['status'] = segments[3] === 'approve' ? 'approved' : 'rejected';
      const updated = applications.map((application) => application.id === segments[2]
        ? { ...application, status: nextStatus, creator_id: creatorId, reviewed_at: reviewedAt }
        : application);
      setApplications(store, requestBrandId, updated);
      await writeStore(store);
      return json({ ok: true, status: nextStatus, creator_id: creatorId });
    }
  }

  if (segments[1] === 'briefs') {
    const brandId = getBrandIdFromSearch(req);

    if (method === 'GET' && segments.length === 2) {
      const limit = Math.max(1, Math.min(Number(getSearchParam(req, 'limit') || 50), 500));
      return json((store.briefs[brandId] || []).slice(0, limit));
    }

    if (method === 'GET' && segments[2]) {
      const target = (store.briefs[brandId] || []).find((brief) => brief.id === segments[2]);
      if (!target) return json({ detail: 'Brief not found' }, 404);
      return json(target);
    }

    if (method === 'POST' && segments.length === 2) {
      const body = await parseBody(req);
      const requestBrandId = String(body.brand_id || brandId || DEFAULT_BRAND_ID);
      const handle = String(body.handle || '').replace(/^@/, '').trim();
      const contentType = String(body.content_type || 'reel');
      const creator = getCreators(store, requestBrandId).find((item) => item.handle === handle || item.id === body.creator_id);
      if (!creator && !handle) return json({ detail: 'Creator handle is required' }, 422);
      const targetHandle = creator?.handle || handle;
      const title = String(body.title || `${contentType.replace(/_/g, ' ')} brief for @${targetHandle}`);
      const content = String(body.content || buildContentBrief(targetHandle, contentType));
      const brief: BriefRecord = {
        id: crypto.randomUUID(),
        brand_id: requestBrandId,
        creator_id: creator?.id,
        title,
        content_type: contentType,
        scripts: [{ title, content }],
        visual_notes: content,
        posting_guidelines: 'Review generated brief before sending to creator.',
        created_at: new Date().toISOString(),
        handle: targetHandle,
        platform: creator?.platform
      };
      store.briefs[requestBrandId] = [brief, ...(store.briefs[requestBrandId] || [])];
      await writeStore(store);
      return json(brief, 201);
    }
  }

  if (method === 'POST' && (segments[1] === 'enrich' || (segments[1] === 'enrichment' && segments[2] === 'run'))) {
    const body = await parseBody(req);
    const brandId = String(body.brand_id || DEFAULT_BRAND_ID);
    const limit = Math.max(1, Math.min(Number(body.limit || 10), 100));
    const creatorId = body.creator_id ? String(body.creator_id) : '';
    const handle = body.handle ? String(body.handle).replace(/^@/, '').trim() : '';
    const source = String(body.source || 'all').trim().toLowerCase();
    const originalCreators = getCreators(store, brandId);
    const targetIndex = creatorId || handle
      ? originalCreators.findIndex((creator) => creator.id === creatorId || creator.handle === handle || creator.ig_handle === handle)
      : -1;

    if ((creatorId || handle) && targetIndex === -1) {
      return json({ detail: 'Creator not found for enrichment' }, 404);
    }

    const targetIndexes = targetIndex >= 0
      ? [targetIndex]
      : originalCreators
          .map((creator, index) => ({ creator, index }))
          .filter(({ creator }) => creatorMatchesEnrichmentSource(creator, source) && !hasRealProfilePhoto(creator))
          .slice(0, limit)
          .map(({ index }) => index);
    const targets = targetIndexes.map((index) => originalCreators[index]).filter(Boolean);

    if (body.dry_run) {
      return json({
        ok: true,
        dry_run: true,
        status: 'preview',
        enriched: 0,
        would_enrich: targets.length,
        source,
        creators: targets,
        message: `Dry run ready: would attempt enrichment for ${targets.length} creator profile${targets.length === 1 ? '' : 's'}.`
      });
    }

    if (!hasConfiguredPhotoProvider(store, brandId)) {
      return json({
        ok: true,
        status: 'needs_provider',
        enriched: 0,
        source,
        would_enrich: targets.length,
        message: 'Connect Apify or Scrapling before running live profile-photo enrichment.'
      });
    }

    return json({
      ok: true,
      status: 'needs_provider',
      enriched: 0,
      source,
      would_enrich: targets.length,
      message: 'Local launch fallback can preview enrichment queues, but live profile-photo writes require the provider-backed API so CreatorOS only saves real renderable photos.'
    });
  }

  if (method === 'GET' && segments[1] === 'campaigns' && segments[2] === 'compare') {
    const brandId = getBrandIdFromSearch(req);
    const campaigns = store.campaigns[brandId] || (brandId === DEFAULT_BRAND_ID ? defaultStore().campaigns[DEFAULT_BRAND_ID] : []) || [];
    const monthOrder = new Map<string, { month: string; monthIndex: number; whitelisted: number; brand: number }>();
    for (const campaign of campaigns) {
      const date = campaign.created_at ? new Date(campaign.created_at) : new Date();
      const monthIndex = Number.isNaN(date.getTime()) ? new Date().getMonth() : date.getMonth();
      const month = Number.isNaN(date.getTime())
        ? 'Current'
        : date.toLocaleString('en-US', { month: 'short' });
      const current = monthOrder.get(month) || { month, monthIndex, whitelisted: 0, brand: 0 };
      const value = Number(campaign.revenue || campaign.spend || 0);
      if (campaign.ad_type === 'partnership_ad' || campaign.ad_type === 'spark_ad') {
        current.whitelisted += value;
      } else {
        current.brand += value;
      }
      monthOrder.set(month, current);
    }
    return json({
      months: Array.from(monthOrder.values())
        .toSorted((a, b) => a.monthIndex - b.monthIndex)
        .map(({ month, whitelisted, brand }) => ({
          month,
          whitelisted: Math.round(whitelisted * 100) / 100,
          brand: Math.round(brand * 100) / 100
        }))
    });
  }

  if (segments[1] === 'campaigns' && segments.length >= 2) {
    const brandId = getBrandIdFromSearch(req);

    if (method === 'GET' && segments.length === 2) {
      return json(store.campaigns[brandId] || (brandId === DEFAULT_BRAND_ID ? defaultStore().campaigns[DEFAULT_BRAND_ID] : []) || []);
    }

    if (method === 'POST' && segments[2] === 'sync') {
      const body = await parseBody(req);
      const requestBrandId = String(body.brand_id || brandId || DEFAULT_BRAND_ID);
      const now = new Date().toISOString();
      const campaigns = store.campaigns[requestBrandId] || (requestBrandId === DEFAULT_BRAND_ID ? defaultStore().campaigns[DEFAULT_BRAND_ID] : []) || [];
      const updated = campaigns.map((campaign) => campaign.status === 'active'
        ? {
            ...campaign,
            spend: Math.round((campaign.spend + 37) * 100) / 100,
            impressions: campaign.impressions + 1450,
            clicks: campaign.clicks + 54,
            conversions: campaign.conversions + 2,
            revenue: Math.round((campaign.revenue + 188) * 100) / 100,
            roas: Math.round(((campaign.revenue + 188) / Math.max(campaign.spend + 37, 1)) * 100) / 100,
            last_synced_at: now
          }
        : campaign);
      if (body.dry_run) {
        const active = campaigns.filter((campaign) => campaign.status === 'active');
        const metaWithAdId = active.filter((campaign) => campaign.platform === 'meta' && campaign.ad_id);
        const metaWithoutAdId = active.filter((campaign) => campaign.platform === 'meta' && !campaign.ad_id);
        const tiktokCampaigns = active.filter((campaign) => campaign.platform === 'tiktok');
        return json({
          ok: true,
          dry_run: true,
          meta_connected: Boolean((store.integrations[requestBrandId] || {}).meta?.connected),
          active_campaigns: active.length,
          would_sync: metaWithAdId.length + tiktokCampaigns.length,
          meta_campaigns_with_ad_id: metaWithAdId.length,
          meta_campaigns_without_ad_id: metaWithoutAdId.length,
          tiktok_campaigns: tiktokCampaigns.length,
          provider_notes: metaWithoutAdId.length
            ? [`${metaWithoutAdId.length} Meta campaign${metaWithoutAdId.length === 1 ? '' : 's'} need ad IDs before live sync.`]
            : []
        });
      }
      store.campaigns[requestBrandId] = updated;
      await writeStore(store);
      return json({ ok: true, synced: updated.filter((campaign) => campaign.status === 'active').length });
    }

    if (method === 'POST' && segments[2] === 'import-meta') {
      const body = await parseBody(req);
      const requestBrandId = String(body.brand_id || brandId || DEFAULT_BRAND_ID);
      const existing = store.campaigns[requestBrandId] || [];
      const now = new Date().toISOString();
      const imported: CampaignRecord[] = [
        {
          id: `${requestBrandId}-local-meta-wellnesswithkaia`,
          ad_id: `${requestBrandId}-local-meta-ad-wellnesswithkaia`,
          brand_id: requestBrandId,
          handle: 'wellnesswithkaia',
          creator_handle: 'wellnesswithkaia',
          creator_platform: 'instagram',
          ad_type: 'partnership_ad',
          platform: 'meta',
          status: 'active',
          spend: 2140,
          impressions: 112400,
          clicks: 4386,
          ctr: 3.9,
          cpm: 19.04,
          conversions: 104,
          revenue: 10120,
          roas: 4.73,
          daily_budget: 150,
          created_at: now,
          last_synced_at: now
        }
      ];
      const deduped = [
        ...imported,
        ...existing.filter((campaign) => !imported.some((item) => item.id === campaign.id))
      ];
      if (body.dry_run) {
        const existingIds = new Set(existing.map((campaign) => campaign.id));
        return json({
          ok: true,
          dry_run: true,
          meta_connected: Boolean((store.integrations[requestBrandId] || {}).meta?.connected),
          would_fetch_ads: true,
          seen: imported.length,
          would_import: imported.length,
          would_create: imported.filter((campaign) => !existingIds.has(campaign.id)).length,
          would_update: imported.filter((campaign) => existingIds.has(campaign.id)).length,
          ads_preview: imported.map((campaign) => ({
            ad_id: campaign.ad_id || campaign.id,
            name: campaign.handle,
            status: campaign.status,
            campaign_id: campaign.id,
            campaign_name: campaign.handle,
            has_insights: true,
            would_update_existing: existingIds.has(campaign.id)
          }))
        });
      }
      store.campaigns[requestBrandId] = deduped;
      await writeStore(store);
      return json({ ok: true, imported: imported.length, seen: imported.length, campaign_ids: imported.map((item) => item.id) });
    }

    if (method === 'PATCH' && segments[2] && segments[3] === 'status') {
      const body = await parseBody(req);
      const requestBrandId = String(body.brand_id || brandId || '').trim();
      const nextStatus = String(body.status || '').trim().toLowerCase();
      if (!['draft', 'active', 'paused', 'completed'].includes(nextStatus)) {
        return json({ detail: 'Campaign status must be draft, active, paused, or completed' }, 400);
      }
      if (!requestBrandId) return json({ detail: 'brand_id is required' }, 422);
      const campaigns = store.campaigns[requestBrandId] || [];
      const updated = campaigns.map((campaign) => campaign.id === segments[2]
        ? { ...campaign, status: nextStatus as CampaignRecord['status'] }
        : campaign);
      const changed = updated.find((campaign) => campaign.id === segments[2]);
      if (!changed) return json({ detail: 'Campaign not found' }, 404);
      store.campaigns[requestBrandId] = updated;
      await writeStore(store);
      return json({ ok: true, campaign: changed });
    }
  }

  if (method === 'GET' && segments[1] === 'stats' && segments[2]) {
    const brandId = segments[2];
    const creators = getCreators(store, brandId);
    const campaigns = store.campaigns[brandId] || (brandId === DEFAULT_BRAND_ID ? defaultStore().campaigns[DEFAULT_BRAND_ID] : []) || [];
    const activeCampaigns = campaigns.filter((campaign) => campaign.status === 'active');
    const totalSpend = campaigns.reduce((total, campaign) => total + Number(campaign.spend || 0), 0);
    const totalRevenue = campaigns.reduce((total, campaign) => total + Number(campaign.revenue || 0), 0);
    const byStatus = {
      discovered: creators.filter((creator) => creator.status === 'discovered').length,
      contacted: creators.filter((creator) => creator.status === 'contacted').length,
      replied: creators.filter((creator) => creator.status === 'replied').length,
      negotiating: creators.filter((creator) => creator.status === 'negotiating').length,
      onboarded: creators.filter((creator) => creator.status === 'onboarded').length,
      active: creators.filter((creator) => creator.status === 'active').length
    };
    return json({
      pipeline: {
        total: creators.length,
        by_status: byStatus,
        ...byStatus
      },
      campaigns: {
        active_count: activeCampaigns.length,
        blended_roas: totalSpend > 0 ? Math.round((totalRevenue / totalSpend) * 100) / 100 : 0,
        total_spend: Math.round(totalSpend * 100) / 100,
        total_revenue: Math.round(totalRevenue * 100) / 100
      },
      top_creators: creators.toSorted((a, b) => b.score - a.score).slice(0, 5)
    });
  }

  if (method === 'GET' && segments[1] === 'creators' && segments[2] === 'counts') {
    const brandId = getBrandIdFromSearch(req);
    const counts = creatorCounts(getCreators(store, brandId));
    return json({
      total: counts.all,
      all: counts.all,
      shopify: counts.shopify,
      discovered: counts.discovered
    });
  }

  if (method === 'GET' && segments[1] === 'creators' && segments[2] === 'by-status') {
    const brandId = getBrandIdFromSearch(req);
    const creators = getCreators(store, brandId);
    return json({
      discovered: creators.filter((creator) => creator.status === 'discovered'),
      contacted: creators.filter((creator) => creator.status === 'contacted'),
      replied: creators.filter((creator) => creator.status === 'replied'),
      negotiating: creators.filter((creator) => creator.status === 'negotiating'),
      onboarded: creators.filter((creator) => creator.status === 'onboarded'),
      active: creators.filter((creator) => creator.status === 'active'),
      _counts: {
        discovered: creators.filter((creator) => creator.status === 'discovered').length,
        contacted: creators.filter((creator) => creator.status === 'contacted').length,
        replied: creators.filter((creator) => creator.status === 'replied').length,
        negotiating: creators.filter((creator) => creator.status === 'negotiating').length,
        onboarded: creators.filter((creator) => creator.status === 'onboarded').length,
        active: creators.filter((creator) => creator.status === 'active').length
      }
    });
  }

  if (method === 'GET' && segments[1] === 'creators' && segments[2] === 'segments') {
    const brandId = getBrandIdFromSearch(req);
    const source = getSearchParam(req, 'source');
    const creators = getCreators(store, brandId).filter((creator) => !source || creator.discovered_via === source);
    const igVerified = creators.filter((creator) => creator.discovered_via === 'shopify_customer' && creator.ig_handle);
    const socialUnverified = creators.filter((creator) => creator.discovered_via !== 'shopify_customer');
    const emailVips = creators.filter((creator) => creator.email && !creator.ig_handle);
    return json({
      ig_verified: igVerified,
      social_unverified: socialUnverified,
      email_vips: emailVips,
      counts: {
        ig_verified: igVerified.length,
        social_unverified: socialUnverified.length,
        email_only: emailVips.length
      }
    });
  }

  if (method === 'POST' && segments[1] === 'activation' && segments[2] === 'klaviyo-sync') {
    const body = await parseBody(req);
    const brandId = String(body.brand_id || DEFAULT_BRAND_ID);
    const approvedIds = Array.isArray(body.creator_ids)
      ? (body.creator_ids as unknown[]).map((value: unknown) => String(value)).filter(Boolean)
      : [];
    if (!approvedIds.length) return json({ detail: 'Approve at least one email VIP before syncing to Klaviyo' }, 400);
    const creators = getCreators(store, brandId).filter((creator) => approvedIds.includes(creator.id) && creator.email);
    if (!creators.length) return json({ detail: 'No approved email VIPs with valid emails were found' }, 400);
    const now = new Date().toISOString();
    const records = creators.map((creator) => ({
      id: crypto.randomUUID(),
      brand_id: brandId,
      creator_id: creator.id,
      handle: creator.handle,
      platform: 'email',
      display_name: creator.display_name,
      avatar_url: creator.avatar_url,
      channel: 'email',
      subject: 'CreatorOS Klaviyo activation approved',
      message: `Approved Klaviyo activation for ${creator.display_name || creator.email}. Profile queued from CreatorOS email VIP segment.`,
      status: 'sent',
      score: creator.score,
      created_at: now,
      sent_at: now
    }));
    const brandIntegrations = store.integrations[brandId] || {};
    const listId = brandIntegrations.klaviyo?.list_id || null;
    if (body.dry_run) {
      return json({
        ok: true,
        dry_run: true,
        synced: 0,
        profile_count: creators.length,
        klaviyo_connected: Boolean(brandIntegrations.klaviyo?.connected || brandIntegrations.klaviyo?.api_key),
        list_id: listId,
        revision: brandIntegrations.klaviyo?.klaviyo_revision || '2026-04-15',
        would_create_profile_import_job: true,
        would_create_outreach_rows: creators.length,
        profiles_preview: creators.slice(0, 5).map((creator) => ({
          creator_id: creator.id,
          handle: creator.handle,
          display_name: creator.display_name,
          email_domain: creator.email ? creator.email.split('@').pop() || null : null,
          score: creator.score || 0,
          order_count: creator.order_count || 0,
          total_spent: creator.total_spent || 0
        }))
      });
    }
    store.outreach[brandId] = [...records, ...getOutreach(store, brandId)];
    brandIntegrations.klaviyo = {
      ...brandIntegrations.klaviyo,
      connected: true,
      setup_mode: brandIntegrations.klaviyo?.setup_mode || 'local_launch_backend',
      last_sync_at: now,
      synced_email_vips: (Number(brandIntegrations.klaviyo?.synced_email_vips) || 0) + creators.length
    };
    store.integrations[brandId] = brandIntegrations;
    await writeStore(store);
    return json({
      ok: true,
      mode: 'local_launch_backend',
      synced: creators.length,
      klaviyo_job_id: `local-klaviyo-${Date.now()}`,
      list_id: brandIntegrations.klaviyo?.list_id || null
    });
  }

  if (segments[1] === 'creators' && !['by-status', 'segments'].includes(segments[2] || '')) {
    const brandId = getBrandIdFromSearch(req);
    const creators = getCreators(store, brandId);

    if (method === 'GET' && segments.length === 2) {
      const { limit, offset } = getListWindow(req, 50, 10000);
      const statuses = getSearchValues(req, 'status');
      const platforms = getSearchValues(req, 'platform');
      const discoveredVia = getSearchValues(req, 'discovered_via');
      const source = getSearchValues(req, 'source');
      const search = (getSearchParam(req, 'search') || '').trim().toLowerCase();
      const minScore = Number(getSearchParam(req, 'min_score') || 0);
      const filtered = creators.filter((creator) => {
        if (statuses.length && !statuses.includes(creator.status.toLowerCase())) return false;
        if (platforms.length && !platforms.includes(creator.platform.toLowerCase())) return false;
        if (discoveredVia.length && !discoveredVia.includes(creator.discovered_via.toLowerCase())) return false;
        if (source.length && !source.includes(creator.discovered_via.toLowerCase())) return false;
        if (minScore && Number(creator.score || 0) < minScore) return false;
        if (search) {
          const haystack = [
            creator.handle,
            creator.display_name,
            creator.email,
            creator.niche,
            creator.location,
            creator.bio
          ].filter(Boolean).join(' ').toLowerCase();
          if (!haystack.includes(search)) return false;
        }
        return true;
      });
      return json({
        creators: filtered.slice(offset, offset + limit),
        total: filtered.length,
        offset,
        limit,
        counts: creatorCounts(filtered)
      });
    }

    if (method === 'POST' && segments.length === 2) {
      const body = await parseBody(req);
      const requestBrandId = String(body.brand_id || brandId);
      const handle = String(body.handle || '').replace(/^@/, '').trim();
      if (!handle) return json({ detail: 'Creator handle is required' }, 422);
      const platform = String(body.platform || 'instagram').trim().toLowerCase();
      if (!['instagram', 'tiktok', 'email'].includes(platform)) {
        return json({ detail: 'Platform must be instagram, tiktok, or email' }, 400);
      }
      const status = String(body.status || 'discovered').trim().toLowerCase();
      if (!['discovered', 'contacted', 'replied', 'negotiating', 'onboarded', 'active'].includes(status)) {
        return json({ detail: 'Status must be a valid pipeline stage' }, 400);
      }
      const now = new Date().toISOString();
      const existing = getCreators(store, requestBrandId).filter(
        (creator) => !(creator.handle === handle && creator.platform === platform)
      );
      const record: CreatorRecord = {
        id: crypto.randomUUID(),
        brand_id: requestBrandId,
        handle,
        platform: platform as CreatorRecord['platform'],
        display_name: String(body.display_name || handle),
        avatar_url: String(body.avatar_url || ''),
        follower_count: Number(body.follower_count || 0),
        engagement_rate: Number(body.engagement_rate || 0),
        score: Number(body.score || 0),
        niche: String(body.niche || ''),
        status,
        email: body.email ? String(body.email) : undefined,
        location: body.location ? String(body.location) : undefined,
        bio: body.bio ? String(body.bio) : undefined,
        order_count: 0,
        total_spent: 0,
        discovered_via: 'manual',
        last_enriched_at: now,
        meta: {
          manual_entry: true,
          created_from: 'kanban'
        }
      };
      setCreators(store, requestBrandId, [record, ...existing]);
      await writeStore(store);
      return json(record, 201);
    }

    if (method === 'GET' && segments[2]) {
      const creator = creators.find((item) => item.id === segments[2] || item.handle === segments[2]);
      if (!creator) return json({ detail: 'Creator not found' }, 404);
      return json(creator);
    }

    if (method === 'PATCH' && segments[2] && !segments[3]) {
      const body = await parseBody(req);
      const updated = creators.map((creator) => {
        if (creator.id !== segments[2]) return creator;
        return {
          ...creator,
          meta: {
            ...creator.meta,
            private_notes: typeof body.private_notes === 'string' ? body.private_notes : creator.meta?.private_notes
          }
        };
      });
      const changed = updated.find((creator) => creator.id === segments[2]);
      if (!changed) return json({ detail: 'Creator not found' }, 404);
      setCreators(store, brandId, updated);
      await writeStore(store);
      return json(changed);
    }

    if (method === 'PATCH' && segments[2] && segments[3] === 'status') {
      const body = await parseBody(req);
      const requestBrandId = String(body.brand_id || brandId);
      const scopedCreators = requestBrandId === brandId ? creators : getCreators(store, requestBrandId);
      const nextStatus = String(body.status || '').trim();
      if (!nextStatus) return json({ detail: 'Status is required' }, 422);
      if (!['discovered', 'contacted', 'replied', 'negotiating', 'onboarded', 'active'].includes(nextStatus)) {
        return json({ detail: 'Status must be a valid pipeline stage' }, 400);
      }
      const updated = scopedCreators.map((creator) => creator.id === segments[2] ? { ...creator, status: nextStatus } : creator);
      const changed = updated.find((creator) => creator.id === segments[2]);
      if (!changed) return json({ detail: 'Creator not found' }, 404);
      setCreators(store, requestBrandId, updated);
      await writeStore(store);
      return json(changed);
    }
  }

  if (segments[1] === 'outreach') {
    const brandId = getBrandIdFromSearch(req);

    if (method === 'GET' && segments[2] === 'follow-ups') {
      const limit = Math.max(1, Math.min(Number(getSearchParam(req, 'limit') || 20), 100));
      const followUps = getOutreach(store, brandId)
        .filter((item) => ['sent', 'pending'].includes(item.status))
        .slice(0, limit)
        .map((item) => ({
          ...item,
          follow_up_draft: `Hey ${item.display_name || `@${item.handle}`}, circling back on the CreatorOS whitelisting idea. If you are open to it, we can start with product fit, usage rights, and a small paid test so the first collaboration is easy to approve.`
        }));
      return json(followUps);
    }

    if (method === 'GET' && segments.length === 2) {
      const { limit, offset } = getListWindow(req, 50, 500);
      const statuses = getSearchValues(req, 'status');
      const channels = getSearchValues(req, 'channel');
      const search = (getSearchParam(req, 'search') || '').trim().toLowerCase();
      const filtered = getOutreach(store, brandId).filter((item) => {
        if (statuses.length && !statuses.includes(item.status.toLowerCase())) return false;
        if (channels.length && !channels.includes(item.channel.toLowerCase())) return false;
        if (search) {
          const haystack = [
            item.handle,
            item.display_name,
            item.subject,
            item.message,
            item.platform
          ].filter(Boolean).join(' ').toLowerCase();
          if (!haystack.includes(search)) return false;
        }
        return true;
      });
      return json(filtered.slice(offset, offset + limit));
    }

    if (method === 'POST' && segments.length === 2) {
      const body = await parseBody(req);
      const requestBrandId = String(body.brand_id || brandId);
      const handle = String(body.handle || '').replace(/^@/, '').trim();
      const creator = getCreators(store, requestBrandId).find((item) => item.id === body.creator_id || item.handle === handle);
      const targetHandle = handle || creator?.handle;
      if (!targetHandle) return json({ detail: 'Creator handle or id is required' }, 422);
      const pendingOutreach = getOutreach(store, requestBrandId).find((item) => (
        item.creator_id === creator?.id
        && item.channel === String(body.channel || 'dm')
        && item.status === 'pending'
      ));
      if (!body.message && pendingOutreach) {
        return json({
          ok: true,
          dry_run: Boolean(body.dry_run),
          would_reuse_existing: Boolean(body.dry_run),
          ...pendingOutreach,
          existing: true
        });
      }
      const message = body.message ? String(body.message) : buildProposalMessage(creator || {
        display_name: targetHandle,
        handle: targetHandle,
        niche: 'creator whitelisting',
        score: 0
      });
      if (body.dry_run) {
        return json({
          ok: true,
          dry_run: true,
          would_create_outreach: true,
          creator_id: creator?.id || (body.creator_id ? String(body.creator_id) : undefined),
          handle: targetHandle,
          platform: String(body.platform || creator?.platform || 'instagram'),
          display_name: creator?.display_name || targetHandle,
          avatar_url: creator?.avatar_url || '',
          channel: String(body.channel || 'dm'),
          subject: body.subject ? String(body.subject) : undefined,
          message,
          status: 'would_create',
          score: creator?.score ?? 0,
          order_count: creator?.order_count,
          total_spent: creator?.total_spent
        });
      }
      const record: OutreachRecord = {
        id: crypto.randomUUID(),
        brand_id: requestBrandId,
        creator_id: creator?.id || (body.creator_id ? String(body.creator_id) : undefined),
        handle: targetHandle,
        platform: String(body.platform || creator?.platform || 'instagram'),
        display_name: creator?.display_name || targetHandle,
        avatar_url: creator?.avatar_url || '',
        channel: String(body.channel || 'dm'),
        subject: body.subject ? String(body.subject) : undefined,
        message,
        status: 'pending',
        score: creator?.score ?? 0,
        created_at: new Date().toISOString()
      };
      store.outreach[requestBrandId] = [record, ...getOutreach(store, requestBrandId)];
      await writeStore(store);
      return json(record, 201);
    }

    if (method === 'POST' && segments[2] === 'send') {
      const body = await parseBody(req);
      const requestBrandId = String(body.brand_id || brandId);
      const handle = String(body.handle || '').replace(/^@/, '').trim();
      const creator = getCreators(store, requestBrandId).find((item) => item.id === body.creator_id || item.handle === handle);
      const targetHandle = handle || creator?.handle;
      if (!targetHandle) return json({ detail: 'Creator handle or id is required' }, 422);
      const channel = String(body.channel || 'dm');
      const isEmail = channel === 'email';
      const canDeliverLocally = isEmail ? Boolean(creator?.email) : false;
      const reason = canDeliverLocally
        ? undefined
        : isEmail
          ? 'Local mode saved this email as pending because no creator email was found'
          : 'Local mode saved this Instagram DM as pending. Live Meta delivery needs a scoped recipient ID from Instagram messaging webhooks.';
      if (body.dry_run) {
        return json({
          ok: true,
          dry_run: true,
          would_create_outreach: true,
          would_attempt_delivery: canDeliverLocally,
          channel,
          creator_id: creator?.id || (body.creator_id ? String(body.creator_id) : undefined),
          handle: targetHandle,
          status: canDeliverLocally ? 'would_send' : 'would_save_pending',
          delivery: canDeliverLocally
            ? { deliverable: true, delivered: false, provider: 'local-mailgun-sim' }
            : { deliverable: false, delivered: false, reason },
          message_preview: String(body.message || buildProposalMessage(creator || {
            display_name: targetHandle,
            handle: targetHandle,
            niche: 'creator whitelisting',
            score: 0
          })).slice(0, 180)
        });
      }
      const record: OutreachRecord = {
        id: crypto.randomUUID(),
        brand_id: requestBrandId,
        creator_id: creator?.id || (body.creator_id ? String(body.creator_id) : undefined),
        handle: targetHandle,
        platform: String(body.platform || creator?.platform || 'instagram'),
        display_name: creator?.display_name || targetHandle,
        avatar_url: creator?.avatar_url || '',
        channel,
        subject: body.subject ? String(body.subject) : undefined,
        message: body.message ? String(body.message) : buildProposalMessage(creator || {
          display_name: targetHandle,
          handle: targetHandle,
          niche: 'creator whitelisting',
          score: 0
        }),
        status: canDeliverLocally ? 'sent' : 'pending',
        score: creator?.score ?? 0,
        created_at: new Date().toISOString(),
        sent_at: canDeliverLocally ? new Date().toISOString() : undefined,
        delivery_pending_reason: reason
      };
      store.outreach[requestBrandId] = [record, ...getOutreach(store, requestBrandId)];
      await writeStore(store);
      return json({
        ok: canDeliverLocally,
        delivered: canDeliverLocally,
        delivery: canDeliverLocally
          ? { delivered: true, provider: 'local-mailgun-sim' }
          : { delivered: false, reason },
        ...record
      }, 201);
    }

    if (method === 'PATCH' && segments[2]) {
      const body = await parseBody(req);
      const requestBrandId = String(body.brand_id || brandId || '').trim();
      if (!requestBrandId) return json({ detail: 'brand_id is required' }, 400);
      const outreach = getOutreach(store, requestBrandId);
      const nextStatus = body.status ? String(body.status).trim().toLowerCase() : undefined;
      const allowedStatuses = new Set(['pending', 'approved', 'rejected', 'sent', 'delivered', 'replied', 'declined', 'failed']);
      if (nextStatus && !allowedStatuses.has(nextStatus)) {
        return json({ detail: 'Status must be pending, approved, rejected, sent, delivered, replied, declined, or failed' }, 400);
      }
      const updated = outreach.map((item) => {
        if (item.id !== segments[2]) return item;
        if (segments[3] === 'sent') {
          return { ...item, status: 'sent', sent_at: new Date().toISOString() };
        }
        const statusTiming = nextStatus && ['sent', 'delivered'].includes(nextStatus)
          ? { sent_at: item.sent_at || new Date().toISOString() }
          : {};
        return {
          ...item,
          message: body.message ? String(body.message) : item.message,
          subject: body.subject ? String(body.subject) : item.subject,
          status: nextStatus || item.status,
          ...statusTiming
        };
      });
      const changed = updated.find((item) => item.id === segments[2]);
      if (!changed) return json({ detail: 'Outreach record not found' }, 404);
      store.outreach[requestBrandId] = updated;
      await writeStore(store);
      return json(changed);
    }
  }

  if (segments[1] === 'webhooks' && segments[2] === 'meta' && segments[3] === 'instagram') {
    if (method === 'GET') {
      const mode = getSearchParam(req, 'hub.mode');
      const token = getSearchParam(req, 'hub.verify_token');
      const challenge = getSearchParam(req, 'hub.challenge');
      const expected = process.env.META_WEBHOOK_VERIFY_TOKEN || process.env.META_VERIFY_TOKEN || 'creatoros-local-webhook';
      if (mode === 'subscribe' && token === expected && challenge) {
        return new NextResponse(challenge, { status: 200, headers: { 'Content-Type': 'text/plain' } });
      }
      return json({ detail: 'Meta webhook verification failed' }, 403);
    }

    if (method === 'POST') {
      const body = await parseBody(req);
      const events = Array.isArray(body.entry)
        ? body.entry.flatMap((entry: { messaging?: unknown[] }) => Array.isArray(entry.messaging) ? entry.messaging : [])
        : [];
      const records: OutreachRecord[] = [];
      for (const event of events as Array<Record<string, unknown>>) {
        const sender = event.sender as { id?: string } | undefined;
        const recipient = event.recipient as { id?: string } | undefined;
        const message = event.message as { text?: string; mid?: string; is_echo?: boolean } | undefined;
        const text = String(message?.text || '').trim();
        const senderId = String(sender?.id || '').trim();
        if (!senderId || !text || message?.is_echo) continue;
        const brandId = resolveMetaWebhookBrandId(store, recipient?.id);
        const creators = getCreators(store, brandId);
        let creator = creators.find((item) => item.id === senderId || item.handle === `ig_${senderId.slice(-8)}`);
        if (!creator) {
          creator = {
            id: crypto.randomUUID(),
            brand_id: brandId,
            handle: `ig_${senderId.slice(-8)}`,
            platform: 'instagram',
            display_name: `Instagram user ${senderId.slice(-6)}`,
            avatar_url: '',
            follower_count: 0,
            engagement_rate: 0,
            score: 0,
            niche: 'Instagram inbound',
            status: 'replied',
            order_count: 0,
            total_spent: 0,
            discovered_via: 'instagram_webhook',
            last_enriched_at: new Date().toISOString()
          };
          setCreators(store, brandId, [creator, ...creators]);
        }
        const record: OutreachRecord = {
          id: crypto.randomUUID(),
          brand_id: brandId,
          creator_id: creator.id,
          handle: creator.handle,
          platform: 'instagram',
          display_name: creator.display_name,
          avatar_url: creator.avatar_url,
          channel: 'dm',
          message: text,
          status: 'replied',
          score: creator.score,
          created_at: new Date().toISOString(),
          sent_at: new Date().toISOString(),
          delivery_pending_reason: `Inbound Instagram webhook from ${senderId} to ${String(recipient?.id || 'local')}`
        };
        records.push(record);
      }
      if (records.length) {
        const recordsByBrand = records.reduce<Record<string, OutreachRecord[]>>((groups, record) => {
          groups[record.brand_id] = [...(groups[record.brand_id] || []), record];
          return groups;
        }, {});
        for (const [brandId, brandRecords] of Object.entries(recordsByBrand)) {
          store.outreach[brandId] = [...brandRecords, ...getOutreach(store, brandId)];
        }
        await writeStore(store);
      }
      return json({ ok: true, processed: records.length, events: records });
    }
  }

  if (method === 'GET' && segments[1] === 'shipments') {
    const brandId = getBrandIdFromSearch(req);
    return json(store.shipments[brandId] || (brandId === DEFAULT_BRAND_ID ? defaultStore().shipments[DEFAULT_BRAND_ID] : []));
  }

  if (method === 'POST' && segments[1] === 'shipments') {
    const body = await parseBody(req);
    const brandId = String(body.brand_id || getBrandIdFromSearch(req) || DEFAULT_BRAND_ID);
    const creatorId = String(body.creator_id || '');
    const variants: string[] = Array.isArray(body.product_variant_ids)
      ? (body.product_variant_ids as unknown[]).map((value: unknown) => String(value).trim()).filter(Boolean)
      : [];
    const creator = getCreators(store, brandId).find((item) => item.id === creatorId);
    if (!creator) return json({ detail: 'Select a creator for this shipment' }, 400);
    if (!variants.length) return json({ detail: 'Add at least one Shopify variant ID' }, 400);
    if (variants.some((variant) => !variant.startsWith('gid://shopify/ProductVariant/'))) {
      return json({ detail: 'Shopify product variant IDs must use gid://shopify/ProductVariant/... format' }, 400);
    }
    if (body.dry_run) {
      return json({
        ok: true,
        dry_run: true,
        store: (store.integrations[brandId] || {}).shopify?.store || 'brand.myshopify.com',
        creator: {
          id: creator.id,
          handle: creator.handle,
          display_name: creator.display_name || creator.handle
        },
        line_items: variants.map((variantId, index) => ({
          variant_id: variantId,
          quantity: 1,
          product_title: `Local product ${index + 1}`,
          variant_title: `Variant ${index + 1}`,
          inventory_quantity: 99
        })),
        would_create: {
          shopify_draft_order: true,
          creator_discount_code: true,
          shipment_row: true
        }
      }, 201);
    }
    const now = new Date().toISOString();
    const shipment: ShipmentRecord = {
      id: crypto.randomUUID(),
      brand_id: brandId,
      handle: creator.handle,
      display_name: creator.display_name,
      avatar_url: creator.avatar_url,
      products: variants.map((variant, index) => `Variant ${index + 1}: ${variant}`).join(', '),
      discount_code: `${creator.handle.replace(/[^a-z0-9]/gi, '').slice(0, 10).toUpperCase()}${Math.random().toString(16).slice(2, 6).toUpperCase()}`,
      tracking_number: '',
      stage: 'ordered',
      status: 'ordered',
      created_at: now
    };
    store.shipments[brandId] = [shipment, ...(store.shipments[brandId] || [])];
    await writeStore(store);
    return json({ ok: true, shipment }, 201);
  }

  if (method === 'PATCH' && segments[1] === 'shipments' && segments[2]) {
    const body = await parseBody(req);
    const nextStatus = String(body.status || '').trim();
    const allowed = new Set(['ordered', 'shipped', 'delivered', 'content_pending', 'content_received']);
    if (!allowed.has(nextStatus)) return json({ detail: 'Unsupported shipment status' }, 400);
    const requestBrandId = String(body.brand_id || getBrandIdFromSearch(req) || '').trim();
    if (!requestBrandId) return json({ detail: 'brand_id is required' }, 400);
    const shipments = store.shipments[requestBrandId] || [];
    const updated = shipments.map((shipment) => shipment.id === segments[2]
      ? {
          ...shipment,
          stage: nextStatus,
          status: nextStatus,
          tracking_number: body.tracking_number ? String(body.tracking_number) : shipment.tracking_number,
          carrier: body.carrier ? String(body.carrier) : shipment.carrier
        }
      : shipment);
    const changed = updated.find((shipment) => shipment.id === segments[2]);
    if (!changed) return json({ detail: 'Shipment not found' }, 404);
    store.shipments[requestBrandId] = updated;
    await writeStore(store);
    return json({ ok: true, shipment: changed });
  }

  if (method === 'GET' && segments[1] === 'milestones' && segments[2] === 'leaderboard') {
    const brandId = getBrandIdFromSearch(req);
    const limit = Math.max(1, Math.min(Number(getSearchParam(req, 'limit') || 10), 50));
    return json(getCreators(store, brandId)
      .toSorted((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((creator, index) => ({
        id: creator.id,
        handle: creator.handle,
        display_name: creator.display_name,
        avatar_url: creator.avatar_url,
        platform: creator.platform,
        score: creator.score,
        milestones_achieved: Number(creator.meta?.milestones_achieved ?? Math.max(0, 3 - index)),
        total_earned: Number(creator.meta?.total_earned ?? Math.max(0, 850 - index * 175)),
        pending_rewards: String(creator.meta?.pending_rewards ?? (index === 0 ? 'Bonus gifting kit' : 'None'))
      })));
  }

  if (method === 'PATCH' && segments[1] === 'milestones' && segments[2] === 'creators' && segments[4] === 'reward') {
    const body = await parseBody(req);
    const brandId = String(body.brand_id || getBrandIdFromSearch(req) || DEFAULT_BRAND_ID);
    const creators = getCreators(store, brandId);
    const target = creators.find((creator) => creator.id === segments[3]);
    if (!target) return json({ detail: 'Creator not found' }, 404);
    const pendingReward = String(target.meta?.pending_rewards || '').trim();
    const reward = String(body.reward || pendingReward || 'Reward');
    if (body.dry_run) {
      return json({
        ok: true,
        dry_run: true,
        creator_id: target.id,
        brand_id: brandId,
        pending_rewards: pendingReward || reward,
        would_fulfill_reward: reward,
        would_clear_pending_rewards: true,
        would_append_fulfilled_reward: true
      });
    }
    const updated = creators.map((creator) => {
      if (creator.id !== segments[3]) return creator;
      const fulfilledRewards = Array.isArray(creator.meta?.fulfilled_rewards) ? creator.meta.fulfilled_rewards : [];
      return {
        ...creator,
        meta: {
          ...creator.meta,
          pending_rewards: 'None',
          last_reward_fulfilled_at: new Date().toISOString(),
          fulfilled_rewards: [
            ...fulfilledRewards,
            { reward, fulfilled_at: new Date().toISOString() }
          ]
        }
      };
    });
    const changed = updated.find((creator) => creator.id === segments[3]);
    if (!changed) return json({ detail: 'Creator not found' }, 404);
    setCreators(store, brandId, updated);
    await writeStore(store);
    return json({ ok: true, creator_id: changed.id, pending_rewards: 'None' });
  }

  if (method === 'GET' && segments[1] === 'milestones' && segments.length === 2) {
    return json([
      { id: 1, title: 'First Approval', threshold: 'Creator approves whitelisting terms', reward: '$50 bonus', icon: 'badgeCheck' },
      { id: 2, title: 'First Sale', threshold: 'First attributed order from creator traffic', reward: 'Gift card upgrade', icon: 'exclusive' },
      { id: 3, title: '10K Paid Reach', threshold: 'Whitelisted ad reaches 10,000 people', reward: 'Paid boost extension', icon: 'trendingUp' }
    ]);
  }

  if (segments[1] === 'brands' && segments.length === 2) {
    if (method === 'GET') {
      const ownerEmail = getRequestOwnerEmail(req);
      return json(store.brands.filter((brand) => canAccessLocalBrand(brand, ownerEmail)));
    }
    if (method === 'POST') {
      const body = await parseBody(req);
      const ownerEmail = getRequestOwnerEmail(req);
      const name = String(body.name || '').trim();
      if (name.length < 2) return json({ detail: 'Brand name is required' }, 400);
      const brandId = slugifyBrandId(name);
      if (getBrand(store, brandId)) return json({ detail: 'A brand with this name already exists' }, 409);
      const shopifyStore = body.shopify_store ? normalizeStoreUrl(String(body.shopify_store)) : null;
      if (shopifyStore && !isValidShopifyStore(shopifyStore)) {
        return json({ detail: 'Enter a Shopify store URL like brand.myshopify.com' }, 400);
      }
      const brand: LaunchBrand = {
        id: brandId,
        name,
        niche: String(body.niche || 'General'),
        shopify_store: shopifyStore,
        target_audience: body.target_audience ? String(body.target_audience) : null,
        product_focus: body.product_focus ? String(body.product_focus) : null,
        owner_email: ownerEmail || null,
        active: true
      };
      store.brands.push(brand);
      await writeStore(store);
      return json(brand, 201);
    }
  }

  if (segments[1] === 'brands' && segments[2]) {
    const brandId = segments[2];
    const brand = getBrand(store, brandId);
    if (!brand) return json({ detail: 'Brand not found' }, 404);
    if (!canAccessLocalBrand(brand, getRequestOwnerEmail(req))) {
      return json({ detail: 'Brand workspace not available for this user' }, 403);
    }

    if (method === 'GET' && segments.length === 3) return json(brand);

    if (segments[3] === 'billing') {
      const brandIntegrations = store.integrations[brandId] || {};
      const billing = brandIntegrations.billing || {};
      const plans = {
        growth: { name: 'CreatorOS Growth', amount: 199, interval: 'EVERY_30_DAYS', trial_days: 7 },
        scale: { name: 'CreatorOS Scale', amount: 499, interval: 'EVERY_30_DAYS', trial_days: 7 },
        agency: { name: 'CreatorOS Agency', amount: 999, interval: 'EVERY_30_DAYS', trial_days: 7 }
      };

      if (method === 'GET' && segments[4] === 'status') {
        const currentPlan = typeof billing.current_plan === 'string' ? billing.current_plan : 'growth';
        return json({
          ok: true,
          connected: true,
          store: brand.shopify_store || 'brand.myshopify.com',
          plans,
          current_plan: currentPlan,
          test_mode: true,
          active_subscriptions: currentPlan ? [{
            id: `local-subscription-${currentPlan}`,
            name: plans[currentPlan as keyof typeof plans]?.name || 'CreatorOS Growth',
            status: 'ACTIVE',
            test: true,
            trialDays: 7,
            currentPeriodEnd: new Date(Date.now() + 30 * 86400000).toISOString(),
            lineItems: []
          }] : []
        });
      }

      if (method === 'POST' && segments[4] === 'subscribe') {
        const body = await parseBody(req);
        const plan = String(body.plan || '').toLowerCase();
        if (!plans[plan as keyof typeof plans]) return json({ detail: 'Choose Growth, Scale, or Agency before starting Shopify billing' }, 400);
        const subscriptionPreview = {
          name: plans[plan as keyof typeof plans].name,
          amount: plans[plan as keyof typeof plans].amount,
          currency: 'USD',
          interval: plans[plan as keyof typeof plans].interval,
          trial_days: plans[plan as keyof typeof plans].trial_days,
          replacement_behavior: 'APPLY_IMMEDIATELY'
        };
        if (body.dry_run) {
          return json({
            ok: true,
            dry_run: true,
            would_create_subscription: true,
            plan,
            store: brand.shopify_store || 'brand.myshopify.com',
            return_url: body.return_url || `/dashboard/billing?billing=local-approved&plan=${encodeURIComponent(plan)}`,
            test_mode: true,
            subscription_preview: subscriptionPreview
          });
        }
        const updatedBilling: IntegrationRecord = {
          ...billing,
          connected: true,
          connected_at: billing.connected_at || new Date().toISOString(),
          last_tested_at: new Date().toISOString(),
          setup_mode: 'local_shopify_billing',
          current_plan: plan,
          billing_pending_plan: plan,
          billing_pending_subscription_id: `local-subscription-${plan}`
        };
        store.integrations[brandId] = { ...brandIntegrations, billing: updatedBilling };
        await writeStore(store);
        return json({
          ok: true,
          plan,
          store: brand.shopify_store || 'brand.myshopify.com',
          confirmation_url: `/dashboard/billing?billing=local-approved&plan=${encodeURIComponent(plan)}`,
          subscription_preview: subscriptionPreview,
          subscription: {
            id: `local-subscription-${plan}`,
            name: plans[plan as keyof typeof plans].name,
            status: 'ACTIVE',
            test: true
          },
          test_mode: true
        });
      }
    }

    if (segments[3] === 'integrations') {
      const brandIntegrations = store.integrations[brandId] || {};
      if (method === 'GET' && segments.length === 4) return json(brandIntegrations);

      const service = segments[4]?.toLowerCase();
      if (!service || !SUPPORTED_INTEGRATIONS.has(service)) return json({ detail: `Unsupported integration: ${service || ''}` }, 400);

      if (method === 'PUT' && segments.length === 5) {
        const payload = getPayload(await parseBody(req));
        const validation = validateIntegration(service, payload);
        if (validation) return json({ detail: validation }, 400);
        const now = new Date().toISOString();
        const previous = brandIntegrations[service];
        const record: IntegrationRecord = {
          ...previous,
          connected: true,
          connected_at: previous?.connected_at || now,
          last_tested_at: now,
          last_error: null,
          setup_mode: 'local_launch_backend',
          ...redactPayload(payload)
        };
        store.integrations[brandId] = { ...brandIntegrations, [service]: record };
        await writeStore(store);
        return json(record);
      }

      if (method === 'DELETE' && segments.length === 5) {
        delete brandIntegrations[service];
        store.integrations[brandId] = brandIntegrations;
        await writeStore(store);
        return json({ ok: true, connected: false });
      }
    }

    if (segments[3] === 'shopify') {
      if (method === 'GET' && segments[4] === 'products') {
        return json({
          ok: true,
          store: brand.shopify_store || 'brand.myshopify.com',
          products: [
            {
              id: 'gid://shopify/Product/local-1',
              title: 'Creator Starter Bundle',
              variants: [
                {
                  id: 'gid://shopify/ProductVariant/local-variant-1',
                  title: 'Default',
                  price: '0.00',
                  inventoryQuantity: 48
                }
              ]
            },
            {
              id: 'gid://shopify/Product/local-2',
              title: 'Premium Wellness Kit',
              variants: [
                {
                  id: 'gid://shopify/ProductVariant/local-variant-2',
                  title: 'Full Size',
                  price: '0.00',
                  inventoryQuantity: 24
                }
              ]
            }
          ]
        });
      }

      if (method === 'POST' && segments[4] === 'managed-install' && segments[5] === 'finalize') {
        const body = await parseBody(req);
        const params = getPayload(body);
        const shop = normalizeStoreUrl(String(params.shop || (params.params as { shop?: string } | undefined)?.shop || ''));
        if (!isValidShopifyStore(shop)) return json({ detail: 'Enter a Shopify store URL like brand.myshopify.com' }, 400);
        const now = new Date().toISOString();
        const brandIntegrations = store.integrations[brandId] || {};
        brandIntegrations.shopify = {
          ...brandIntegrations.shopify,
          connected: true,
          connected_at: brandIntegrations.shopify?.connected_at || now,
          last_tested_at: now,
          setup_mode: 'local_managed_install',
          installed_via: 'local_launch_backend',
          store: shop,
          shop_name: brand.name,
          scopes: 'read_customers,read_orders,read_products,write_draft_orders'
        };
        store.integrations[brandId] = brandIntegrations;
        await writeStore(store);
        return json({
          ok: true,
          mode: 'local_launch_backend',
          integration: brandIntegrations.shopify,
          checks: { store_access: true, customers: true, products: true, orders: true },
          shop: { name: brand.name, myshopify_domain: shop, primary_domain: shop }
        });
      }

      if (method === 'POST' && segments[4] === 'oauth' && segments[5] === 'start') {
        const body = await parseBody(req);
        const shop = normalizeStoreUrl(String(body.store || ''));
        if (!isValidShopifyStore(shop)) return json({ detail: 'Enter a Shopify store URL like brand.myshopify.com' }, 400);
        return json({
          ok: true,
          store: shop,
          mode: 'local_launch_backend',
          authorize_url: `/dashboard/shopify?shopify=manual_setup&shop=${encodeURIComponent(shop)}`,
          redirect_uri: '/dashboard/shopify',
          scopes: 'read_customers,read_orders,read_products,write_draft_orders'
        });
      }

      if (method === 'POST' && segments[4] === 'test') {
        const body = await parseBody(req);
        const shop = normalizeStoreUrl(String(body.store || ''));
        const token = String(body.access_token || '');
        if (!isValidShopifyStore(shop)) return json({ detail: 'Enter a Shopify store URL like brand.myshopify.com' }, 400);
        if (!token.trim()) return json({ detail: 'Shopify Admin API access token required' }, 400);
        const now = new Date().toISOString();
        const brandIntegrations = store.integrations[brandId] || {};
        brandIntegrations.shopify = {
          ...brandIntegrations.shopify,
          connected: true,
          connected_at: brandIntegrations.shopify?.connected_at || now,
          last_tested_at: now,
          setup_mode: 'local_launch_backend',
          store: shop,
          shop_name: brand.name
        };
        store.integrations[brandId] = brandIntegrations;
        await writeStore(store);
        return json({
          ok: true,
          mode: 'local_launch_backend',
          integration: brandIntegrations.shopify,
          checks: { store_access: true, customers: true, products: true, orders: true },
          shop: { name: brand.name, myshopify_domain: shop, primary_domain: shop }
        });
      }

      if (method === 'POST' && segments[4] === 'preview') {
        const body = await parseBody(req);
        const shop = normalizeStoreUrl(String(body.store || ''));
        if (!isValidShopifyStore(shop)) return json({ detail: 'Enter a Shopify store URL like brand.myshopify.com' }, 400);
        return json({
          ok: true,
          mode: 'local_launch_backend',
          store: shop,
          metrics: previewMetricsForStore(shop),
          top_candidates: []
        });
      }

      if (method === 'POST' && segments[4] === 'import') {
        const body = await parseBody(req);
        const shop = normalizeStoreUrl(String(body.store || ''));
        if (!isValidShopifyStore(shop)) return json({ detail: 'Enter a Shopify store URL like brand.myshopify.com' }, 400);
        const jobId = crypto.randomUUID();
        const metrics = previewMetricsForStore(shop);
        const now = new Date().toISOString();
        store.jobs[jobId] = {
          id: jobId,
          brand_id: brandId,
          store: shop,
          status: 'completed',
          imported: metrics.estimated_customers,
          error: null,
          created_at: now,
          completed_at: now
        };
        const existingCreators = store.creators[brandId] || [];
        const existingHandles = new Set(existingCreators.map((creator) => creator.handle.toLowerCase()));
        const importedCreators = SAMPLE_CREATORS
          .filter((creator) => creator.discovered_via === 'shopify_customer')
          .map((creator) => ({
            ...cloneCreatorForBrand(creator, brandId),
            discovered_via: 'shopify_customer',
            last_enriched_at: now,
            meta: {
              ...creator.meta,
              shopify: {
                store: shop,
                order_count: creator.order_count,
                total_spent: creator.total_spent,
                imported_at: now
              }
            }
          }))
          .filter((creator) => !existingHandles.has(creator.handle.toLowerCase()));
        if (importedCreators.length) {
          setCreators(store, brandId, [...importedCreators, ...existingCreators]);
        } else if (!store.creators[brandId]) {
          setCreators(store, brandId, getCreators(store, brandId));
        }
        const brandIntegrations = store.integrations[brandId] || {};
        brandIntegrations.shopify = {
          ...brandIntegrations.shopify,
          connected: true,
          last_sync_at: now,
          store: shop
        };
        store.integrations[brandId] = brandIntegrations;
        await writeStore(store);
        return json({ ok: true, job_id: jobId, status: 'completed', mode: 'local_launch_backend' });
      }

      if (method === 'GET' && segments[4] === 'import' && segments[5]) {
        const job = store.jobs[segments[5]];
        if (!job || job.brand_id !== brandId) return json({ detail: 'Shopify import job not found' }, 404);
        return json(job);
      }
    }
  }

  return null;
}
