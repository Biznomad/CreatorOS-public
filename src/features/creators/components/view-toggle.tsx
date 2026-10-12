'use client';

import { parseAsString, parseAsStringLiteral, useQueryState } from 'nuqs';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { useBrandStore } from '@/components/org-switcher';
import { withLocalQaMarker } from '@/lib/whitelabel-api';

export type CreatorView = 'grid' | 'table';

export const creatorViewParser = parseAsStringLiteral(['grid', 'table'] as const).withDefault(
  'grid'
);

export function useCreatorView() {
  return useQueryState('view', creatorViewParser);
}

export function useSourceFilter() {
  return useQueryState('source', parseAsString.withDefault(''));
}

type ExportCreator = {
  handle?: string;
  display_name?: string;
  platform?: string;
  follower_count?: number;
  engagement_rate?: number;
  score?: number;
  status?: string;
  email?: string;
  location?: string;
  discovered_via?: string;
};

type CsvValue = string | number | null | undefined;

export function ViewToggle({ counts }: { counts?: { all: number; shopify: number; discovered: number } }) {
  const [view, setView] = useCreatorView();
  const [source, setSource] = useSourceFilter();
  const activeBrandId = useBrandStore((s) => s.activeBrand.id);

  function handleExport() {
    if (!activeBrandId) {
      toast.error('Select a client brand before exporting creators.');
      return;
    }

    fetch(withLocalQaMarker(`/api/proxy/api/creators?brand_id=${encodeURIComponent(activeBrandId)}&limit=10000`))
      .then((r) => r.json())
      .then((data: { creators?: ExportCreator[] }) => {
        const creators = data.creators || [];
        const headers = ['Handle', 'Display Name', 'Platform', 'Followers', 'Engagement Rate', 'Score', 'Status', 'Email', 'Location', 'Source'];
        const rows: CsvValue[][] = creators.map((c) => [
          c.handle, c.display_name, c.platform, c.follower_count || 0,
          c.engagement_rate || 0, c.score || 0, c.status, c.email || '',
          c.location || '', c.discovered_via || ''
        ]);
        const csv = [headers, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `creators-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success(`Exported ${creators.length} creators`);
      })
      .catch(() => toast.error('Export failed'));
  }

  return (
    <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
      <Tabs value={source || 'all'} onValueChange={(v) => setSource(v === 'all' ? '' : v)} className='w-full min-w-0 sm:w-auto'>
        <TabsList className='grid h-auto w-full min-w-0 grid-cols-1 gap-1 overflow-visible sm:inline-flex sm:w-fit'>
          <TabsTrigger value='all' className='min-h-11 w-full cursor-pointer justify-start gap-1.5 whitespace-normal text-left text-xs sm:w-auto sm:justify-center sm:whitespace-nowrap'>
            <Icons.teams className='size-3.5' />
            All{counts ? ` (${counts.all.toLocaleString()})` : ''}
          </TabsTrigger>
          <TabsTrigger value='shopify_customer' className='min-h-11 w-full cursor-pointer justify-start gap-1.5 whitespace-normal text-left text-xs sm:w-auto sm:justify-center sm:whitespace-nowrap'>
            <Icons.product className='size-3.5 text-emerald-600' />
            Shopify Customers{counts ? ` (${counts.shopify.toLocaleString()})` : ''}
          </TabsTrigger>
          <TabsTrigger value='discovered' className='min-h-11 w-full cursor-pointer justify-start gap-1.5 whitespace-normal text-left text-xs sm:w-auto sm:justify-center sm:whitespace-nowrap'>
            <Icons.search className='size-3.5 text-indigo-600' />
            Discovered{counts ? ` (${counts.discovered.toLocaleString()})` : ''}
          </TabsTrigger>
        </TabsList>
      </Tabs>
      <div className='flex items-center gap-2'>
        <Button variant='outline' size='sm' className='min-h-11 gap-1.5 text-xs' onClick={handleExport} disabled={!activeBrandId}>
          <Icons.download className='size-3.5' />
          Export CSV
        </Button>
        <Button
          variant={view === 'grid' ? 'default' : 'ghost'}
          size='sm'
          className='min-h-11 min-w-11 p-0'
          onClick={() => setView('grid', { shallow: false })}
          aria-label='Grid view'
          aria-pressed={view === 'grid'}
        >
          <Icons.grid className='size-4' />
        </Button>
        <Button
          variant={view === 'table' ? 'default' : 'ghost'}
          size='sm'
          className='min-h-11 min-w-11 p-0'
          onClick={() => setView('table', { shallow: false })}
          aria-label='Table view'
          aria-pressed={view === 'table'}
        >
          <Icons.list className='size-4' />
        </Button>
      </div>
    </div>
  );
}
