import { queryOptions } from '@tanstack/react-query';
import { getCampaigns, getComparison } from './service';
import type { Campaign, CampaignFilters } from './types';

export type { Campaign };

export const campaignKeys = {
  all: ['campaigns'] as const,
  list: (filters: CampaignFilters) => [...campaignKeys.all, 'list', filters] as const,
  comparison: (brand_id: string) => [...campaignKeys.all, 'comparison', brand_id] as const
};

export const campaignsQueryOptions = (filters: CampaignFilters) =>
  queryOptions({
    queryKey: campaignKeys.list(filters),
    queryFn: () => getCampaigns(filters)
  });

export const comparisonQueryOptions = (brand_id: string) =>
  queryOptions({
    queryKey: campaignKeys.comparison(brand_id),
    queryFn: () => getComparison(brand_id)
  });
