'use client';

import { useEffect, useState } from 'react';
import { useSuspenseQuery } from '@tanstack/react-query';
import { parseAsInteger, parseAsString, useQueryStates } from 'nuqs';
import { creatorsQueryOptions } from '../api/queries';
import { getCreatorCounts, type CreatorCounts } from '../api/service';
import { CreatorCard } from './creator-card';
import { CreatorPagination } from './creator-pagination';
import { PhotoCoveragePanel } from './photo-coverage-panel';
import { useBrandStore } from '@/components/org-switcher';
import { useSourceFilter, ViewToggle } from './view-toggle';

const DEFAULT_BRAND_ID = process.env.NEXT_PUBLIC_CREATOROS_DEFAULT_BRAND_ID || 'demo-brand';

export function CreatorGrid() {
  const activeBrandId = useBrandStore((s) => s.activeBrand.id);
  const fetchBrands = useBrandStore((s) => s.fetchBrands);
  const effectiveBrandId = activeBrandId || DEFAULT_BRAND_ID;
  const [source] = useSourceFilter();
  const [counts, setCounts] = useState<CreatorCounts>({ total: 0, shopify: 0, discovered: 0 });

  const [params] = useQueryStates(
    {
      page: parseAsInteger.withDefault(1),
      perPage: parseAsInteger.withDefault(50),
      name: parseAsString,
      status: parseAsString,
      platform: parseAsString
    },
    { shallow: true }
  );

  useEffect(() => {
    void fetchBrands();
  }, [fetchBrands]);

  // Fetch real counts from API
  useEffect(() => {
    if (!effectiveBrandId) {
      setCounts({ total: 0, shopify: 0, discovered: 0 });
      return;
    }
    getCreatorCounts(effectiveBrandId).then(setCounts);
  }, [effectiveBrandId]);

  const filters = {
    page: params.page,
    limit: params.perPage,
    brand_id: effectiveBrandId,
    ...(params.name && { search: params.name }),
    ...(params.status && { status: params.status }),
    ...(params.platform && { platform: params.platform }),
    ...(source && { discovered_via: source })
  };

  const { data } = useSuspenseQuery(creatorsQueryOptions(filters));

  if (data.creators.length === 0) {
    return (
      <div className='flex flex-col gap-4'>
        <ViewToggle counts={{ all: counts.total, shopify: counts.shopify, discovered: counts.discovered }} />
        {effectiveBrandId && <PhotoCoveragePanel brandId={effectiveBrandId} />}
        <div className='flex flex-col items-center justify-center py-16 text-center'>
          <p className='text-muted-foreground text-sm'>No creators found.</p>
          <p className='text-muted-foreground mt-1 text-xs'>
            {source === 'discovered'
              ? 'Use the Discover page to find creators on Instagram and TikTok.'
              : source === 'shopify_customer'
                ? 'Run a Shopify sync to import customers.'
                : 'Try adjusting your filters.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className='flex flex-col gap-4'>
      <ViewToggle counts={{ all: counts.total, shopify: counts.shopify, discovered: counts.discovered }} />
      {effectiveBrandId && <PhotoCoveragePanel brandId={effectiveBrandId} />}
      <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
        {data.creators.map((creator) => (
          <CreatorCard key={creator.id} creator={creator} />
        ))}
      </div>
      <CreatorPagination totalCreators={data.total_creators} />
    </div>
  );
}

export function CreatorGridSkeleton() {
  return (
    <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className='bg-card animate-pulse rounded-xl border shadow-sm'>
          <div className='flex items-start gap-3 border-b p-4 pb-3'>
            <div className='bg-muted size-14 shrink-0 rounded-full' />
            <div className='flex-1 space-y-2'>
              <div className='bg-muted h-3 w-2/3 rounded' />
              <div className='bg-muted h-3 w-1/2 rounded' />
              <div className='bg-muted h-3 w-3/4 rounded' />
            </div>
          </div>
          <div className='grid grid-cols-3 divide-x py-3'>
            {[0, 1, 2].map((j) => (
              <div key={j} className='flex flex-col items-center gap-1 px-3'>
                <div className='bg-muted h-4 w-10 rounded' />
                <div className='bg-muted h-2 w-14 rounded' />
              </div>
            ))}
          </div>
          <div className='space-y-2 border-t px-4 py-3'>
            {[0, 1, 2, 3].map((j) => (
              <div key={j} className='flex justify-between'>
                <div className='bg-muted h-3 w-16 rounded' />
                <div className='bg-muted h-3 w-20 rounded' />
              </div>
            ))}
          </div>
          <div className='grid grid-cols-2 gap-2 border-t px-4 py-3'>
            <div className='bg-muted h-8 rounded-md' />
            <div className='bg-muted h-8 rounded-md' />
          </div>
        </div>
      ))}
    </div>
  );
}
