// ============================================================
// Creator Service — Data Access Layer
// ============================================================
// Fetches from the real FastAPI backend. Returns empty on error.
// ============================================================

import { apiGet } from '@/lib/whitelabel-api';
import type { Creator, CreatorFilters, CreatorsResponse } from './types';

type CreatorCountsRow = {
  all?: number;
  total?: number;
  shopify?: number;
  discovered?: number;
};

type CreatorRow = {
  id: string;
  handle: string;
  platform?: 'instagram' | 'tiktok';
  display_name?: string;
  follower_count?: number;
  engagement_rate?: number;
  score?: number;
  status?: string;
  niche?: string;
  location?: string;
  avatar_url?: string;
  bio?: string;
  email?: string;
  brand_id?: string;
  discovered_at?: string;
  created_at?: string;
  discovered_via?: string;
  payout_method?: 'cash' | 'store_credit' | 'points' | null;
  paypal_email?: string | null;
  shopify_customer_id?: string | null;
  smile_customer_id?: string | null;
  meta?: {
    source?: string;
    profile_photo_source?: string;
    profile_photo_checked_at?: string;
    shopify?: {
      total_spent?: number;
      order_count?: number;
    };
  };
};

type CreatorsApiResponse = {
  total?: number;
  offset?: number;
  limit?: number;
  creators?: CreatorRow[];
};

function toCreatorStatus(value?: string): Creator['status'] {
  if (
    value === 'contacted' ||
    value === 'replied' ||
    value === 'negotiating' ||
    value === 'onboarded' ||
    value === 'active'
  ) {
    return value;
  }
  return 'discovered';
}

function toDiscoveredVia(value?: string): Creator['discovered_via'] {
  if (value === 'apify' || value === 'shopify_customer' || value === 'application') {
    return value;
  }
  return 'manual';
}

function hasRealAvatar(creator: Pick<CreatorRow, 'avatar_url'>) {
  const url = creator.avatar_url?.trim() || '';
  return Boolean(url) && !url.includes('api.dicebear.com/9.x/initials/');
}

function hasProgramStats(creator: CreatorRow) {
  return Number(creator.follower_count) > 0 &&
    Number(creator.engagement_rate) > 0 &&
    Number(creator.score) > 0;
}

function isSyntheticCreator(creator: Pick<CreatorRow, 'handle' | 'display_name'>) {
  const handle = creator.handle || '';
  const name = creator.display_name || '';
  return /^(hvproxyqa|creatoros_smoke|creatoros_|test_|smoke|meta-account)/i.test(handle) ||
    /smoke|proxyqa|meta account/i.test(name);
}

function isProgramReadyCreator(creator: CreatorRow) {
  return hasRealAvatar(creator) && hasProgramStats(creator) && !isSyntheticCreator(creator);
}

function avatarRank(creator: CreatorRow) {
  if (!hasRealAvatar(creator)) return 0;
  if (creator.meta?.profile_photo_source === 'meta_business_discovery') return 2;
  if (creator.meta?.source === 'meta_business_discovery') return 2;
  return 1;
}

export type CreatorCounts = {
  total: number;
  shopify: number;
  discovered: number;
};

export type CreatorCoverageBucket = {
  total: number;
  with_photo: number;
  missing_photo: number;
  photo_percent: number;
  enrichable_missing_photo: number;
  provider_needed: number;
  with_program_stats: number;
  program_stats_percent: number;
  with_customer_stats: number;
  customer_stats_percent: number;
};

export type CreatorPhotoCoverage = {
  ok: boolean;
  brand_id: string;
  coverage: {
    all: CreatorCoverageBucket;
    shopify_customer: CreatorCoverageBucket;
    discovered: CreatorCoverageBucket;
  };
  providers: {
    meta: boolean;
    apify: boolean;
    scrapling: boolean;
  };
  blocker?: string;
};

export async function getCreatorCounts(brandId: string): Promise<CreatorCounts> {
  if (!brandId) {
    return { total: 0, shopify: 0, discovered: 0 };
  }

  try {
    const data = await apiGet<CreatorCountsRow>(`/api/creators/counts?brand_id=${encodeURIComponent(brandId)}`);
    return {
      total: data.total || data.all || 0,
      shopify: data.shopify || 0,
      discovered: data.discovered || 0
    };
  } catch {
    return { total: 0, shopify: 0, discovered: 0 };
  }
}

export async function getCreatorPhotoCoverage(brandId: string): Promise<CreatorPhotoCoverage | null> {
  if (!brandId) return null;
  try {
    return await apiGet<CreatorPhotoCoverage>(`/api/creators/photo-coverage?brand_id=${encodeURIComponent(brandId)}`);
  } catch {
    return null;
  }
}

export async function getCreators(filters: CreatorFilters): Promise<CreatorsResponse> {
  try {
    if (!filters.brand_id) {
      return {
        success: true,
        time: new Date().toISOString(),
        message: 'Select a brand to load creators.',
        total_creators: 0,
        offset: 0,
        limit: filters.limit || 50,
        creators: [],
      };
    }

    const requestedPage = filters.page || 1;
    const requestedLimit = filters.limit || 50;
    const useProgramReadyPool = filters.discovered_via === 'discovered' && !filters.search && !filters.status && !filters.platform;

    const params = new URLSearchParams();
    params.set('brand_id', filters.brand_id);
    if (!useProgramReadyPool && filters.page) params.set('offset', String((filters.page - 1) * requestedLimit));
    params.set('limit', String(useProgramReadyPool ? 1000 : requestedLimit));
    if (filters.status) params.set('status', filters.status);
    if (filters.platform) params.set('platform', filters.platform);
    if (filters.search) params.set('search', filters.search);
    if (filters.discovered_via) params.set('discovered_via', filters.discovered_via);

    const data = await apiGet<CreatorsApiResponse>(`/api/creators?${params.toString()}`);
    const sortedRows = (data.creators || [])
      .filter((creator) => !useProgramReadyPool || isProgramReadyCreator(creator))
      .toSorted((a, b) => avatarRank(b) - avatarRank(a) || (b.score || 0) - (a.score || 0));
    const visibleRows = useProgramReadyPool
      ? sortedRows.slice((requestedPage - 1) * requestedLimit, requestedPage * requestedLimit)
      : sortedRows;

    return {
      success: true,
      time: new Date().toISOString(),
      message: 'OK',
      total_creators: useProgramReadyPool ? sortedRows.length : data.total || 0,
      offset: useProgramReadyPool ? (requestedPage - 1) * requestedLimit : data.offset || 0,
      limit: requestedLimit,
      creators: visibleRows
        .map((c): Creator => ({
          id: c.id,
          handle: c.handle,
          platform: c.platform || 'instagram',
          display_name: c.display_name || c.handle,
          follower_count: c.follower_count || 0,
          engagement_rate: c.engagement_rate || 0,
          score: c.score || 0,
          status: toCreatorStatus(c.status),
          niche: c.niche || '',
          location: c.location || '',
          avatar_url: c.avatar_url || '',
          bio: c.bio || '',
          email: c.email || '',
          brand_id: c.brand_id || filters.brand_id || '',
          discovered_at: c.discovered_at || c.created_at || new Date().toISOString(),
          total_spent: c.meta?.shopify?.total_spent || 0,
          order_count: c.meta?.shopify?.order_count || 0,
          payout_method: c.payout_method || null,
          paypal_email: c.paypal_email || null,
          shopify_customer_id: c.shopify_customer_id || null,
          smile_customer_id: c.smile_customer_id || null,
          discovered_via: toDiscoveredVia(c.discovered_via),
          milestones_achieved: 0,
          total_earned: 0,
        })),
    };
  } catch {
    return {
      success: false,
      time: new Date().toISOString(),
      message: 'API unreachable',
      total_creators: 0,
      offset: 0,
      limit: filters.limit || 50,
      creators: [],
    };
  }
}
