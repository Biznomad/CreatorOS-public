// ============================================================
// Outreach Service — Data Access Layer
// ============================================================
// Fetches from the real FastAPI backend. Returns empty on error.
// ============================================================

import { apiGet, withLocalQaMarker } from '@/lib/whitelabel-api';
import type { OutreachMessage, OutreachFilters, OutreachResponse } from './types';

type OutreachRow = Partial<OutreachMessage> & {
  id?: string | number;
  handle?: string;
  platform?: string;
  display_name?: string;
};

const OUTREACH_FETCH_LIMIT = 10000;

export async function getOutreach(filters: OutreachFilters): Promise<OutreachResponse> {
  try {
    if (!filters.brand_id) {
      return {
        success: true,
        time: new Date().toISOString(),
        message: 'Select a brand to load outreach.',
        total_outreach: 0,
        offset: 0,
        limit: filters.limit || 10,
        outreach: [],
      };
    }

    const params = new URLSearchParams();
    params.set('brand_id', filters.brand_id);
    params.set('limit', String(OUTREACH_FETCH_LIMIT));
    if (filters.status) params.set('status', filters.status);
    if (filters.channel) params.set('channel', filters.channel);
    if (filters.search) params.set('search', filters.search);

    const rows = await apiGet<OutreachRow[]>(`/api/outreach?${params.toString()}`);

    const all: OutreachMessage[] = (rows || []).map((r, i) => ({
      id: r.id || i,
      brand_id: filters.brand_id,
      creator_handle: r.handle || r.creator_handle || '',
      creator_platform: r.platform || r.creator_platform || 'instagram',
      creator_display_name: r.display_name || r.creator_display_name || r.handle || '',
      channel: r.channel || 'dm',
      message: r.message || '',
      status: r.status || 'pending',
      sent_at: r.sent_at || null,
      replied_at: r.replied_at || null,
      follow_up_count: r.follow_up_count || 0,
      created_at: r.created_at || new Date().toISOString(),
    }));

    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const offset = (page - 1) * limit;

    let filtered = all;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      filtered = all.filter(
        (m) =>
          m.creator_handle.toLowerCase().includes(q) ||
          m.creator_display_name.toLowerCase().includes(q)
      );
    }
    if (filters.channel) {
      const channels = filters.channel.split(/[.,]/);
      filtered = filtered.filter((m) => channels.includes(m.channel));
    }

    const paginated = filtered.slice(offset, offset + limit);

    return {
      success: true,
      time: new Date().toISOString(),
      message: 'OK',
      total_outreach: filtered.length,
      offset,
      limit,
      outreach: paginated,
    };
  } catch {
    return {
      success: false,
      time: new Date().toISOString(),
      message: 'API unreachable',
      total_outreach: 0,
      offset: 0,
      limit: filters.limit || 10,
      outreach: [],
    };
  }
}

export async function updateOutreachStatus(id: number | string, status: string, brandId?: string): Promise<void> {
  if (!brandId) {
    throw new Error('Select a client workspace before updating outreach.');
  }

  const res = await fetch(withLocalQaMarker(`/api/proxy/api/outreach/${id}?brand_id=${encodeURIComponent(brandId)}`), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ brand_id: brandId, status })
  });
  if (!res.ok) throw new Error(`Failed to update outreach ${id}: ${res.status}`);
}
