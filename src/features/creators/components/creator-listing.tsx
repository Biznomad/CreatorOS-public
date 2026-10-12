import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query-client';
import { searchParamsCache } from '@/lib/searchparams';
import { creatorsQueryOptions } from '../api/queries';
import { CreatorsTable, CreatorsTableSkeleton } from './creators-table';
import { CreatorGrid, CreatorGridSkeleton } from './creator-grid';
import { Suspense } from 'react';

export default function CreatorListingPage({
  view
}: {
  view?: 'grid' | 'table';
}) {
  const page = searchParamsCache.get('page');
  const search = searchParamsCache.get('name');
  const pageLimit = searchParamsCache.get('perPage');
  const status = searchParamsCache.get('status');
  const platform = searchParamsCache.get('platform');

  const activeView = view ?? 'grid';

  const filters = {
    page,
    limit: pageLimit,
    ...(search && { search }),
    ...(status && { status }),
    ...(platform && { platform })
  };

  const queryClient = getQueryClient();

  void queryClient.prefetchQuery(creatorsQueryOptions(filters));

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div className='flex flex-col gap-4'>
        {activeView === 'table' ? (
          <Suspense fallback={<CreatorsTableSkeleton />}>
            <CreatorsTable />
          </Suspense>
        ) : (
          <Suspense fallback={<CreatorGridSkeleton />}>
            <CreatorGrid />
          </Suspense>
        )}
      </div>
    </HydrationBoundary>
  );
}
