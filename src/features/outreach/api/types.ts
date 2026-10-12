export type OutreachMessage = {
  id: number | string;
  brand_id?: string;
  creator_handle: string;
  creator_platform: string;
  creator_display_name: string;
  channel: string;
  message: string;
  status: string;
  sent_at: string | null;
  replied_at: string | null;
  follow_up_count: number;
  created_at: string;
};

export type OutreachFilters = {
  page?: number;
  limit?: number;
  status?: string;
  channel?: string;
  search?: string;
  sort?: string;
  brand_id?: string;
};

export type OutreachResponse = {
  success: boolean;
  time: string;
  message: string;
  total_outreach: number;
  offset: number;
  limit: number;
  outreach: OutreachMessage[];
};
