import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query-client';
import { searchParamsCache } from '@/lib/searchparams';
import { outreachQueryOptions } from '../api/queries';
import { OutreachTable, OutreachTableSkeleton } from './outreach-table';
import { Suspense } from 'react';

export default function OutreachListingPage() {
  const page = searchParamsCache.get('page');
  const pageLimit = searchParamsCache.get('perPage');
  const status = searchParamsCache.get('status');
  const channel = searchParamsCache.get('channel');
  const sort = searchParamsCache.get('sort');

  const filters = {
    page,
    limit: pageLimit,
    ...(status && { status }),
    ...(channel && { channel }),
    ...(sort && { sort })
  };

  const queryClient = getQueryClient();

  void queryClient.prefetchQuery(outreachQueryOptions(filters));

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Suspense fallback={<OutreachTableSkeleton />}>
        <OutreachTable />
      </Suspense>
    </HydrationBoundary>
  );
}
