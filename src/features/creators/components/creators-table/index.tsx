'use client';

import { DataTable } from '@/components/ui/table/data-table';
import { DataTableToolbar } from '@/components/ui/table/data-table-toolbar';
import { useDataTable } from '@/hooks/use-data-table';
import { useSuspenseQuery } from '@tanstack/react-query';
import { parseAsInteger, parseAsString, useQueryStates } from 'nuqs';
import { getSortingStateParser } from '@/lib/parsers';
import { creatorsQueryOptions } from '../../api/queries';
import type { Creator } from '../../api/types';
import { CreatorDetailDrawer } from '../creator-detail-drawer';
import { getColumns } from './columns';
import { useMemo, useState } from 'react';
import { useBrandStore } from '@/components/org-switcher';
import { useSourceFilter, ViewToggle } from '../view-toggle';
import { getCreatorCounts, type CreatorCounts } from '../../api/service';
import { useEffect } from 'react';
import { PhotoCoveragePanel } from '../photo-coverage-panel';

const baseColumns = getColumns(() => undefined);
const columnIds = baseColumns.map((c) => c.id).filter(Boolean) as string[];
const DEFAULT_BRAND_ID = process.env.NEXT_PUBLIC_CREATOROS_DEFAULT_BRAND_ID || 'demo-brand';


export function CreatorsTable() {
  const activeBrandId = useBrandStore((s) => s.activeBrand.id);
  const fetchBrands = useBrandStore((s) => s.fetchBrands);
  const effectiveBrandId = activeBrandId || DEFAULT_BRAND_ID;
  const [source] = useSourceFilter();
  const [counts, setCounts] = useState<CreatorCounts>({ total: 0, shopify: 0, discovered: 0 });
  const [selectedCreator, setSelectedCreator] = useState<Creator | null>(null);
  const [params] = useQueryStates(
    {
      page: parseAsInteger.withDefault(1),
      perPage: parseAsInteger.withDefault(10),
      name: parseAsString,
      status: parseAsString,
      platform: parseAsString,
      sort: getSortingStateParser(columnIds).withDefault([])
    },
    { shallow: true }
  );

  useEffect(() => {
    void fetchBrands();
  }, [fetchBrands]);

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
    ...(source && { discovered_via: source }),
    ...(params.sort.length > 0 && { sort: JSON.stringify(params.sort) })
  };

  const { data } = useSuspenseQuery(creatorsQueryOptions(filters));

  const pageCount = Math.ceil(data.total_creators / params.perPage);
  const columns = useMemo(() => getColumns(setSelectedCreator), []);

  const { table } = useDataTable({
    data: data.creators,
    columns,
    pageCount,
    shallow: true,
    debounceMs: 500,
    initialState: {
      columnPinning: { right: ['actions'] }
    }
  });

  return (
    <>
      <div className='mb-4'>
        <ViewToggle counts={{ all: counts.total, shopify: counts.shopify, discovered: counts.discovered }} />
      </div>
      {effectiveBrandId && <PhotoCoveragePanel brandId={effectiveBrandId} />}
      <DataTable table={table}>
        <DataTableToolbar table={table} />
      </DataTable>
      <CreatorDetailDrawer
        creator={selectedCreator}
        open={Boolean(selectedCreator)}
        onOpenChange={(open) => {
          if (!open) setSelectedCreator(null);
        }}
      />
    </>
  );
}

export function CreatorsTableSkeleton() {
  return (
    <div className='flex flex-1 animate-pulse flex-col gap-4'>
      <div className='bg-muted h-10 w-full rounded' />
      <div className='bg-muted h-96 w-full rounded-lg' />
      <div className='bg-muted h-10 w-full rounded' />
    </div>
  );
}
