export type Creator = {
  id: string;
  handle: string;
  platform: 'instagram' | 'tiktok';
  display_name: string;
  follower_count: number;
  engagement_rate: number;
  score: number;
  status: 'discovered' | 'contacted' | 'replied' | 'negotiating' | 'onboarded' | 'active';
  niche: string;
  location: string;
  avatar_url: string;
  bio: string;
  email: string;
  brand_id: string;
  discovered_at: string;
  total_spent: number;
  order_count: number;
  payout_method?: 'cash' | 'store_credit' | 'points' | null;
  paypal_email?: string | null;
  shopify_customer_id?: string | null;
  smile_customer_id?: string | null;
  discovered_via: 'apify' | 'shopify_customer' | 'manual' | 'application';
  milestones_achieved: number;
  total_earned: number;
};

export type CreatorFilters = {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  platform?: string;
  brand_id?: string;
  discovered_via?: string;
};

export type CreatorsResponse = {
  success: boolean;
  time: string;
  message: string;
  total_creators: number;
  offset: number;
  limit: number;
  creators: Creator[];
};
