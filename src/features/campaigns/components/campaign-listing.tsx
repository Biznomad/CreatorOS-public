import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query-client';
import { searchParamsCache } from '@/lib/searchparams';
import { campaignsQueryOptions } from '../api/queries';
import { CampaignsTable, CampaignsTableSkeleton } from './campaigns-table';
import { Suspense } from 'react';

export default function CampaignListingPage() {
  const page = searchParamsCache.get('page');
  const pageLimit = searchParamsCache.get('perPage');
  const status = searchParamsCache.get('status');
  const platform = searchParamsCache.get('platform');
  const ad_type = searchParamsCache.get('ad_type');
  const sort = searchParamsCache.get('sort');

  const filters = {
    page,
    limit: pageLimit,
    ...(status && { status }),
    ...(platform && { platform }),
    ...(ad_type && { ad_type }),
    ...(sort && { sort })
  };

  const queryClient = getQueryClient();

  void queryClient.prefetchQuery(campaignsQueryOptions(filters));

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Suspense fallback={<CampaignsTableSkeleton />}>
        <CampaignsTable />
      </Suspense>
    </HydrationBoundary>
  );
}
