import { create } from 'zustand';
import { useBrandStore } from '@/components/org-switcher';
import { withLocalQaMarker } from '@/lib/whitelabel-api';
import { toast } from 'sonner';

export type Platform = 'instagram' | 'tiktok' | 'email';

export type CreatorCard = {
  id: string;
  handle: string;
  platform: Platform;
  display_name: string;
  avatar_url: string;
  follower_count?: number;
  engagement_rate?: number;
  score?: number;
  niche: string;
  status?: string;
  location?: string;
  email?: string;
  bio?: string;
  discovered_via?: string;
  is_shopify_customer?: boolean;
  order_count?: number;
  total_spent?: number;
  shopify_customer_id?: string | null;
  shopify_store?: string | null;
  customer_since?: string | null;
  last_order_at?: string | null;
  last_order_id?: string | null;
  last_order_name?: string | null;
  meta?: Record<string, unknown>;
  shopify?: {
    customer_id?: string | null;
    store?: string | null;
    order_count?: number;
    total_spent?: number;
    customer_since?: string | null;
    last_order_at?: string | null;
  };
};

type CreatorStatusResponse = Partial<CreatorCard> & {
  id?: string | number;
};

type KanbanState = {
  columns: Record<string, CreatorCard[]>;
  counts: Record<string, number>;
  loading: boolean;
  loaded: boolean;
  loadedBrandId: string;
  setColumns: (columns: Record<string, CreatorCard[]>) => void;
  addTask: (handle: string, platform: Platform, display_name: string, niche: string) => Promise<CreatorCard>;
  fetchCreators: () => Promise<void>;
};

const API_BASE = '/api/proxy';

const emptyColumns: Record<string, CreatorCard[]> = {
  discovered: [],
  contacted: [],
  replied: [],
  negotiating: [],
  onboarded: [],
  active: []
};

const pipelineStatuses = new Set(Object.keys(emptyColumns));

function parseOptionalNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

async function readApiError(response: Response, fallback: string) {
  try {
    const data = await response.json() as { detail?: string; error?: string };
    return data.detail || data.error || fallback;
  } catch {
    return fallback;
  }
}

export const useTaskStore = create<KanbanState>()((set, get) => ({
  columns: emptyColumns,
  counts: {},
  loading: false,
  loaded: false,
  loadedBrandId: '',

  setColumns: (columns) => {
    const prev = get().columns;
    set({ columns });

    // Detect card moves between columns and persist status to API
    const { activeBrand } = useBrandStore.getState();
    const brandId = activeBrand.id;
    const movedCards: Array<{ card: CreatorCard; newStatus: string }> = [];

    for (const [newStatus, cards] of Object.entries(columns)) {
      if (!pipelineStatuses.has(newStatus)) continue;
      for (const card of cards) {
        const wasInPrev = prev[newStatus]?.some((c) => c.id === card.id);
        if (!wasInPrev) {
          movedCards.push({ card, newStatus });
        }
      }
    }

    if (!movedCards.length) return;
    if (!brandId) {
      set({ columns: prev });
      toast.error('Select a workspace before moving creators.');
      return;
    }

    void (async () => {
      try {
        for (const { card, newStatus } of movedCards) {
          const statusResponse = await fetch(
            withLocalQaMarker(`${API_BASE}/api/creators/${card.id}/status?brand_id=${encodeURIComponent(brandId)}`),
            {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ brand_id: brandId, status: newStatus })
            }
          );
          if (!statusResponse.ok) {
            throw new Error(await readApiError(statusResponse, 'Pipeline move failed'));
          }
        }
      } catch (error) {
        set({ columns: prev });
        toast.error(error instanceof Error ? error.message : 'Pipeline move failed');
      }
    })();
  },

  addTask: async (handle, platform, display_name, niche) => {
    const { activeBrand } = useBrandStore.getState();
    const brandId = activeBrand.id;
    if (!brandId) throw new Error('Select a workspace before adding creators');

    const res = await fetch(withLocalQaMarker(`${API_BASE}/api/creators`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        brand_id: brandId,
        handle,
        platform,
        display_name,
        niche,
        status: 'discovered',
        discovered_via: 'manual'
      })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.detail || data.error || 'Failed to save creator');
    }

    const saved: CreatorCard = {
      id: String(data.id),
      handle: data.handle || handle,
      platform: (data.platform as Platform) || platform,
      display_name: data.display_name || display_name,
      avatar_url: data.avatar_url || '',
      follower_count: parseOptionalNumber(data.follower_count),
      engagement_rate: parseOptionalNumber(data.engagement_rate),
      score: parseOptionalNumber(data.score),
      niche: data.niche || niche,
      status: typeof data.status === 'string' ? data.status : 'discovered',
      location: typeof data.location === 'string' ? data.location : '',
      email: typeof data.email === 'string' ? data.email : '',
      bio: typeof data.bio === 'string' ? data.bio : '',
      discovered_via: typeof data.discovered_via === 'string' ? data.discovered_via : 'manual',
      is_shopify_customer: Boolean(data.is_shopify_customer),
      order_count: Number(data.order_count || 0),
      total_spent: Number(data.total_spent || 0),
      shopify_customer_id: typeof data.shopify_customer_id === 'string' ? data.shopify_customer_id : null,
      shopify_store: typeof data.shopify_store === 'string' ? data.shopify_store : null,
      customer_since: typeof data.customer_since === 'string' ? data.customer_since : null,
      last_order_at: typeof data.last_order_at === 'string' ? data.last_order_at : null,
      last_order_id: typeof data.last_order_id === 'string' ? data.last_order_id : null,
      last_order_name: typeof data.last_order_name === 'string' ? data.last_order_name : null,
      meta: typeof data.meta === 'object' && data.meta !== null ? data.meta as Record<string, unknown> : undefined,
      shopify: typeof data.shopify === 'object' && data.shopify !== null ? data.shopify as CreatorCard['shopify'] : undefined
    };

    set((state) => {
      const previousDiscovered = state.columns.discovered ?? [];
      const alreadyVisible = previousDiscovered.some((creator) => creator.id === saved.id);
      const visibleCount = previousDiscovered.length + (alreadyVisible ? 0 : 1);
      const storedCount = state.counts.discovered ?? previousDiscovered.length;
      return {
        columns: {
          ...state.columns,
          discovered: [
            saved,
            ...previousDiscovered.filter((creator) => creator.id !== saved.id)
          ]
        },
        counts: {
          ...state.counts,
          discovered: Math.max(storedCount + (alreadyVisible ? 0 : 1), visibleCount)
        }
      };
    });
    return saved;
  },

  fetchCreators: async () => {
    const { activeBrand } = useBrandStore.getState();
    const brandId = activeBrand.id;
    if (!brandId) {
      set({ columns: emptyColumns, counts: {}, loaded: true, loadedBrandId: '', loading: false });
      return;
    }
    set({ loading: true });
    try {
      const res = await fetch(withLocalQaMarker(`${API_BASE}/api/creators/by-status?brand_id=${encodeURIComponent(brandId)}&limit=25`));
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json() as Record<string, CreatorStatusResponse[] | Record<string, number> | undefined>;

      const counts = (data._counts || {}) as Record<string, number>;
      const columns: Record<string, CreatorCard[]> = { ...emptyColumns };
      for (const status of Object.keys(emptyColumns)) {
        const rows = (data[status] || []) as CreatorStatusResponse[];
        columns[status] = rows.map((c) => ({
          id: String(c.id),
          handle: c.handle || '',
          platform: (c.platform as Platform) || 'instagram',
          display_name: c.display_name || c.handle || '',
          avatar_url: c.avatar_url || '',
          follower_count: parseOptionalNumber(c.follower_count),
          engagement_rate: parseOptionalNumber(c.engagement_rate),
          score: parseOptionalNumber(c.score),
          niche: c.niche || '',
          status: typeof c.status === 'string' ? c.status : status,
          location: typeof c.location === 'string' ? c.location : '',
          email: typeof c.email === 'string' ? c.email : '',
          bio: typeof c.bio === 'string' ? c.bio : '',
          discovered_via: typeof c.discovered_via === 'string' ? c.discovered_via : '',
          is_shopify_customer: Boolean(c.is_shopify_customer),
          order_count: Number(c.order_count || 0),
          total_spent: Number(c.total_spent || 0),
          shopify_customer_id: typeof c.shopify_customer_id === 'string' ? c.shopify_customer_id : null,
          shopify_store: typeof c.shopify_store === 'string' ? c.shopify_store : null,
          customer_since: typeof c.customer_since === 'string' ? c.customer_since : null,
          last_order_at: typeof c.last_order_at === 'string' ? c.last_order_at : null,
          last_order_id: typeof c.last_order_id === 'string' ? c.last_order_id : null,
          last_order_name: typeof c.last_order_name === 'string' ? c.last_order_name : null,
          meta: typeof c.meta === 'object' && c.meta !== null ? c.meta as Record<string, unknown> : undefined,
          shopify: typeof c.shopify === 'object' && c.shopify !== null ? c.shopify as CreatorCard['shopify'] : undefined
        }));
      }
      set({ columns, counts, loaded: true, loadedBrandId: brandId });
    } catch {
      set({ loaded: true });
    } finally {
      set({ loading: false });
    }
  }
}));
