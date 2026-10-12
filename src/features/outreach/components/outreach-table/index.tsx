'use client';

import { DataTable } from '@/components/ui/table/data-table';
import { DataTableToolbar } from '@/components/ui/table/data-table-toolbar';
import { useDataTable } from '@/hooks/use-data-table';
import { useSuspenseQuery } from '@tanstack/react-query';
import { parseAsInteger, parseAsString, useQueryStates } from 'nuqs';
import { getSortingStateParser } from '@/lib/parsers';
import { outreachQueryOptions } from '../../api/queries';
import { columns } from './columns';
import { useBrandStore } from '@/components/org-switcher';
import { Input } from '@/components/ui/input';
import { Icons } from '@/components/icons';

const columnIds = columns.map((c) => c.id).filter(Boolean) as string[];

export function OutreachTable() {
  const activeBrandId = useBrandStore((s) => s.activeBrand.id);
  const [params, setParams] = useQueryStates(
    {
      page: parseAsInteger.withDefault(1),
      perPage: parseAsInteger.withDefault(10),
      creator: parseAsString,
      status: parseAsString,
      channel: parseAsString,
      sort: getSortingStateParser(columnIds).withDefault([])
    },
    { shallow: true }
  );

  const filters = {
    page: params.page,
    limit: params.perPage,
    brand_id: activeBrandId,
    ...(params.creator && { search: params.creator }),
    ...(params.status && { status: params.status }),
    ...(params.channel && { channel: params.channel }),
    ...(params.sort.length > 0 && { sort: JSON.stringify(params.sort) })
  };

  const { data } = useSuspenseQuery(outreachQueryOptions(filters));

  const pageCount = Math.ceil(data.total_outreach / params.perPage);

  const { table } = useDataTable({
    data: data.outreach,
    columns,
    pageCount,
    shallow: true,
    debounceMs: 500,
    initialState: {
      columnPinning: { right: ['actions'] }
    }
  });

  return (
    <div>
      <div className='flex items-center gap-2 mb-4'>
        <Icons.search className='size-4 text-muted-foreground' />
        <Input
          aria-label='Search outreach creators'
          placeholder='Search creators...'
          value={params.creator || ''}
          onChange={(e) => setParams({ creator: e.target.value || null })}
          className='h-8 max-w-xs text-sm'
        />
      </div>
      <DataTable table={table}>
        <DataTableToolbar table={table} />
      </DataTable>
    </div>
  );
}

export function OutreachTableSkeleton() {
  return (
    <div className='flex flex-1 animate-pulse flex-col gap-4'>
      <div className='bg-muted h-10 w-full rounded' />
      <div className='bg-muted h-96 w-full rounded-lg' />
      <div className='bg-muted h-10 w-full rounded' />
    </div>
  );
}
