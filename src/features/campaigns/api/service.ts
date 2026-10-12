// ============================================================
// Campaigns Service — Data Access Layer
// ============================================================
// Fetches from the real FastAPI backend. Returns empty on error.
// ============================================================

import { apiGet, withLocalQaMarker } from '@/lib/whitelabel-api';
import type { Campaign, CampaignFilters, CampaignsResponse, ComparisonData } from './types';

type CampaignRow = {
  id?: string | number;
  handle?: string;
  creator_handle?: string;
  creator_platform?: string;
  brand_id?: string;
  ad_type?: string;
  platform?: string;
  ad_account_id?: string | null;
  campaign_id?: string | null;
  adset_id?: string | null;
  ad_id?: string | null;
  status?: string;
  spend?: number;
  impressions?: number;
  clicks?: number;
  ctr?: number;
  cpm?: number;
  conversions?: number;
  revenue?: number;
  roas?: number;
  daily_budget?: number;
  created_at?: string;
  last_synced_at?: string | null;
};

type CampaignStatusUpdateResponse = {
  ok?: boolean;
  campaign?: Campaign;
  provider_update?: null | {
    synced?: boolean;
    reason?: string;
    meta_status?: string;
  };
};

export async function getCampaigns(filters: CampaignFilters): Promise<CampaignsResponse> {
  try {
    if (!filters.brand_id) {
      return {
        success: true,
        time: new Date().toISOString(),
        message: 'Select a brand to load campaigns.',
        total_campaigns: 0,
        offset: 0,
        limit: filters.limit || 10,
        campaigns: [],
      };
    }
    const params = new URLSearchParams();
    params.set('brand_id', filters.brand_id);

    const rows = await apiGet<CampaignRow[]>(`/api/campaigns?${params.toString()}`);

    const all: Campaign[] = (rows || []).map((r, i) => ({
      id: r.id ? String(r.id) : `campaign-${i + 1}`,
      creator_handle: r.handle || r.creator_handle || '',
      creator_platform: r.creator_platform === 'tiktok' ? 'tiktok' : 'instagram',
      brand_id: r.brand_id || filters.brand_id || '',
      ad_type: r.ad_type === 'partnership_ad' || r.ad_type === 'spark_ad' ? r.ad_type : 'brand_ad',
      platform: r.platform === 'tiktok' ? 'tiktok' : 'meta',
      ad_account_id: r.ad_account_id || null,
      campaign_id: r.campaign_id || null,
      adset_id: r.adset_id || null,
      ad_id: r.ad_id || null,
      status: r.status === 'active' || r.status === 'paused' || r.status === 'completed' ? r.status : 'draft',
      spend: r.spend || 0,
      impressions: r.impressions || 0,
      clicks: r.clicks || 0,
      ctr: r.ctr || 0,
      cpm: r.cpm || 0,
      conversions: r.conversions || 0,
      revenue: r.revenue || 0,
      roas: r.roas || 0,
      daily_budget: r.daily_budget || 0,
      created_at: r.created_at || new Date().toISOString(),
      last_synced_at: r.last_synced_at || null,
    }));

    let filtered = all;
    if (filters.status) {
      const statuses = String(filters.status).split(/[.,]/);
      filtered = filtered.filter((c) => statuses.includes(c.status));
    }
    if (filters.platform) {
      const platforms = String(filters.platform).split(/[.,]/);
      filtered = filtered.filter((c) => platforms.includes(c.platform));
    }
    if (filters.ad_type) {
      const adTypes = String(filters.ad_type).split(/[.,]/);
      filtered = filtered.filter((c) => adTypes.includes(c.ad_type));
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      filtered = filtered.filter((c) => c.creator_handle.toLowerCase().includes(q));
    }

    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const offset = (page - 1) * limit;
    const paginated = filtered.slice(offset, offset + limit);

    return {
      success: true,
      time: new Date().toISOString(),
      message: 'OK',
      total_campaigns: filtered.length,
      offset,
      limit,
      campaigns: paginated,
    };
  } catch {
    return {
      success: false,
      time: new Date().toISOString(),
      message: 'API unreachable',
      total_campaigns: 0,
      offset: 0,
      limit: filters.limit || 10,
      campaigns: [],
    };
  }
}

export async function updateCampaignStatus(campaignId: string, status: Campaign['status'], brandId?: string) {
  if (!brandId) {
    throw new Error('Select a client workspace before updating campaign status.');
  }

  const res = await fetch(withLocalQaMarker(`/api/proxy/api/campaigns/${encodeURIComponent(campaignId)}/status?brand_id=${encodeURIComponent(brandId)}`), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ brand_id: brandId, status })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || data.error || 'Campaign status update failed');
  return data as CampaignStatusUpdateResponse;
}

export async function syncCampaignMetrics(brandId: string, dryRun = false) {
  if (!brandId) {
    throw new Error('Select a client workspace before syncing campaign metrics.');
  }

  const res = await fetch(withLocalQaMarker('/api/proxy/api/campaigns/sync'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ brand_id: brandId, dry_run: dryRun })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || data.error || (dryRun ? 'Campaign sync dry run failed' : 'Campaign sync failed'));
  return data as {
    ok?: boolean;
    dry_run?: boolean;
    synced?: number;
    active_campaigns?: number;
    would_sync?: number;
    meta_connected?: boolean;
    meta_campaigns_with_ad_id?: number;
    meta_campaigns_without_ad_id?: number;
    tiktok_campaigns?: number;
    provider_notes?: string[];
  };
}

export async function importMetaCampaigns(brandId: string, dryRun = false) {
  if (!brandId) {
    throw new Error('Select a client workspace before importing Meta ads.');
  }

  const res = await fetch(withLocalQaMarker('/api/proxy/api/campaigns/import-meta'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ brand_id: brandId, limit: 50, date_preset: 'last_30d', dry_run: dryRun })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || data.error || (dryRun ? 'Meta import dry run failed' : 'Meta import failed'));
  return data as {
    ok?: boolean;
    dry_run?: boolean;
    imported?: number;
    seen?: number;
    would_import?: number;
    would_create?: number;
    would_update?: number;
    meta_connected?: boolean;
    would_fetch_ads?: boolean;
    reason?: string;
  };
}

export async function getComparison(brand_id: string): Promise<ComparisonData> {
  try {
    if (!brand_id) return { months: [] };
    const data = await apiGet<ComparisonData>(`/api/campaigns/compare?brand_id=${encodeURIComponent(brand_id)}`);
    return data;
  } catch {
    return { months: [] };
  }
}
