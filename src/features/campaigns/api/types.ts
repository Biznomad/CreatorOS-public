export type Campaign = {
  id: string;
  creator_handle: string;
  creator_platform: 'instagram' | 'tiktok';
  brand_id: string;
  ad_type: 'partnership_ad' | 'spark_ad' | 'brand_ad';
  platform: 'meta' | 'tiktok';
  ad_account_id?: string | null;
  campaign_id?: string | null;
  adset_id?: string | null;
  ad_id?: string | null;
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
  last_synced_at?: string | null;
};

export type CampaignFilters = {
  page?: number;
  limit?: number;
  status?: string;
  platform?: string;
  ad_type?: string;
  search?: string;
  sort?: string;
  brand_id?: string;
};

export type CampaignsResponse = {
  success: boolean;
  time: string;
  message: string;
  total_campaigns: number;
  offset: number;
  limit: number;
  campaigns: Campaign[];
};

export type ComparisonData = {
  success?: boolean;
  brand_id?: string;
  months?: { month: string; whitelisted: number; brand: number }[];
  brand_ads?: {
    count: number;
    avg_roas: number;
    avg_ctr: number;
    avg_cpm: number;
  };
  whitelisted_ads?: {
    count: number;
    avg_roas: number;
    avg_ctr: number;
    avg_cpm: number;
  };
};
