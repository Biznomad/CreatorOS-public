'use client';

import Link from 'next/link';
import { DataTable } from '@/components/ui/table/data-table';
import { DataTablePagination } from '@/components/ui/table/data-table-pagination';
import { DataTableToolbar } from '@/components/ui/table/data-table-toolbar';
import { useDataTable } from '@/hooks/use-data-table';
import { useSuspenseQuery } from '@tanstack/react-query';
import { useQueryClient } from '@tanstack/react-query';
import { parseAsInteger, parseAsString, useQueryStates } from 'nuqs';
import { getSortingStateParser } from '@/lib/parsers';
import { campaignKeys, campaignsQueryOptions } from '../../api/queries';
import { columns } from './columns';
import { useEffectiveBrandId } from '@/hooks/use-effective-brand';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { CellAction } from './cell-action';
import { importMetaCampaigns } from '../../api/service';
import { toast } from 'sonner';
import { useEffect, useState } from 'react';
import type { Campaign } from '../../api/types';
import { withLocalQaMarker } from '@/lib/whitelabel-api';

const columnIds = columns.map((c) => c.id).filter(Boolean) as string[];

type IntegrationRecord = {
  connected?: boolean;
  connected_at?: string | null;
  status?: string | null;
};

function isIntegrationConnected(integration?: IntegrationRecord) {
  return Boolean(integration?.connected === true || integration?.status === 'connected');
}

function isMetaSetupError(message: string) {
  return message.toLowerCase().includes('connect meta');
}

const AD_TYPE_LABELS: Record<Campaign['ad_type'], string> = {
  partnership_ad: 'Partnership',
  spark_ad: 'Spark',
  brand_ad: 'Brand'
};

const STATUS_VARIANT: Record<Campaign['status'], 'default' | 'secondary' | 'outline' | 'destructive'> = {
  active: 'default',
  draft: 'outline',
  paused: 'secondary',
  completed: 'secondary'
};

export function CampaignsTable() {
  const activeBrandId = useEffectiveBrandId();
  const queryClient = useQueryClient();
  const [importingMeta, setImportingMeta] = useState(false);
  const [previewingMeta, setPreviewingMeta] = useState(false);
  const [pendingMetaImport, setPendingMetaImport] = useState(false);
  const [metaConnected, setMetaConnected] = useState<boolean | null>(null);
  const [params, setParams] = useQueryStates(
    {
      page: parseAsInteger.withDefault(1),
      perPage: parseAsInteger.withDefault(10),
      creator: parseAsString,
      status: parseAsString,
      platform: parseAsString,
      ad_type: parseAsString,
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
    ...(params.platform && { platform: params.platform }),
    ...(params.ad_type && { ad_type: params.ad_type }),
    ...(params.sort.length > 0 && { sort: JSON.stringify(params.sort) })
  };

  const { data } = useSuspenseQuery(campaignsQueryOptions(filters));
  const needsMetaSetup = Boolean(activeBrandId && metaConnected === false);

  const pageCount = Math.ceil(data.total_campaigns / params.perPage);

  const { table } = useDataTable({
    data: data.campaigns,
    columns,
    pageCount,
    shallow: true,
    debounceMs: 500,
    initialState: {
      columnPinning: { right: ['actions'] }
    }
  });
  const mobileRows = table.getRowModel().rows.map((row) => row.original);

  useEffect(() => {
    if (!activeBrandId) {
      setMetaConnected(null);
      return;
    }

    let cancelled = false;
    fetch(withLocalQaMarker(`/api/proxy/api/brands/${encodeURIComponent(activeBrandId)}/integrations`))
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.detail || payload.error || 'Integrations unavailable');
        if (!cancelled) setMetaConnected(isIntegrationConnected(payload.meta));
      })
      .catch(() => {
        if (!cancelled) setMetaConnected(null);
      });

    return () => {
      cancelled = true;
    };
  }, [activeBrandId]);

  async function handleImportMeta() {
    if (!activeBrandId) {
      toast.error('Select a client brand before importing Meta ads.');
      return;
    }
    setImportingMeta(true);
    try {
      const result = await importMetaCampaigns(activeBrandId);
      toast.success(`Imported ${result.imported || 0} Meta ad${result.imported === 1 ? '' : 's'}.`);
      await queryClient.invalidateQueries({ queryKey: campaignKeys.all });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Meta import failed';
      if (isMetaSetupError(message)) setMetaConnected(false);
      toast.error(message);
    } finally {
      setPendingMetaImport(false);
      setImportingMeta(false);
    }
  }

  function requestImportMeta() {
    if (!activeBrandId) {
      toast.error('Select a client brand before importing Meta ads.');
      return;
    }
    setPendingMetaImport(true);
  }

  async function handlePreviewImportMeta() {
    if (!activeBrandId) {
      toast.error('Select a client brand before previewing Meta import.');
      return;
    }
    setPreviewingMeta(true);
    try {
      const result = await importMetaCampaigns(activeBrandId, true);
      if (result.meta_connected === false) {
        setMetaConnected(false);
        toast.warning(result.reason || 'Connect Meta before live import.');
        return;
      }
      const creates = Number(result.would_create || 0).toLocaleString();
      const updates = Number(result.would_update || 0).toLocaleString();
      const seen = Number(result.seen || 0).toLocaleString();
      toast.success(`Dry run ready: ${creates} Meta ads would be created and ${updates} updated from ${seen} seen.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Meta import dry run failed';
      if (isMetaSetupError(message)) setMetaConnected(false);
      toast.error(message);
    } finally {
      setPreviewingMeta(false);
    }
  }

  return (
    <div className='min-w-0'>
      {needsMetaSetup && (
        <Alert className='mb-4'>
          <Icons.info className='size-4' />
          <AlertTitle>Connect Meta to import whitelisted ad performance</AlertTitle>
          <AlertDescription>
            This workspace needs a Meta access token and ad account before CreatorOS can import campaign metrics.
          </AlertDescription>
        </Alert>
      )}
      <div className='mb-4 flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
        <div className='flex min-w-0 items-center gap-2'>
          <Icons.search className='size-4 text-muted-foreground' />
          <Input
            aria-label='Search campaigns'
            placeholder='Search campaigns...'
            value={params.creator || ''}
            onChange={(e) => setParams({ creator: e.target.value || null })}
            className='h-8 w-full min-w-0 text-sm sm:max-w-xs'
          />
        </div>
        {needsMetaSetup ? (
          <Button asChild size='sm' variant='outline' className='min-h-11 w-full min-w-0 gap-2 sm:w-auto'>
            <Link aria-label='Connect Meta in integrations before importing ads' href='/dashboard/integrations'>
              <Icons.settings className='size-4' />
              Connect Meta
            </Link>
          </Button>
        ) : (
          <div className='flex min-w-0 flex-wrap items-center gap-2'>
            <Button
              size='sm'
              variant='outline'
              className='min-h-11 min-w-0 gap-2'
              aria-label='Preview Meta ads import dry run'
              onClick={handlePreviewImportMeta}
              disabled={importingMeta || previewingMeta || !activeBrandId}
            >
              {previewingMeta ? <Icons.spinner className='size-4 animate-spin' /> : <Icons.checks className='size-4' />}
              Dry Run
            </Button>
            <Button
              size='sm'
              variant='outline'
              className='min-h-11 min-w-0 gap-2'
              aria-label='Request live Meta ads import'
              onClick={requestImportMeta}
              disabled={importingMeta || previewingMeta || !activeBrandId}
            >
              {importingMeta ? <Icons.spinner className='size-4 animate-spin' /> : <Icons.adjustments className='size-4' />}
              Import Meta Ads
            </Button>
          </div>
        )}
      </div>
      <DataTableToolbar table={table} />
      <div className='grid gap-3 md:hidden'>
        {mobileRows.length ? (
          mobileRows.map((campaign) => (
            <div key={campaign.id} className='min-w-0 rounded-lg border p-3'>
              <div className='flex min-w-0 items-start justify-between gap-3'>
                <div className='min-w-0'>
                  <p className='truncate text-sm font-semibold'>@{campaign.creator_handle}</p>
                  <p className='text-xs capitalize text-muted-foreground'>{campaign.creator_platform}</p>
                </div>
                <CellAction data={campaign} />
              </div>
              <div className='mt-3 flex flex-wrap gap-1.5'>
                <Badge variant='outline'>{AD_TYPE_LABELS[campaign.ad_type]}</Badge>
                <Badge variant='outline'>{campaign.platform === 'meta' ? 'Meta' : 'TikTok'}</Badge>
                <Badge variant={STATUS_VARIANT[campaign.status]} className='capitalize'>
                  {campaign.status}
                </Badge>
              </div>
              <dl className='mt-3 grid grid-cols-2 gap-3 text-sm'>
                <div className='min-w-0'>
                  <dt className='text-xs font-medium uppercase text-muted-foreground'>Spend</dt>
                  <dd className='font-semibold tabular-nums'>${Number(campaign.spend || 0).toLocaleString()}</dd>
                </div>
                <div className='min-w-0'>
                  <dt className='text-xs font-medium uppercase text-muted-foreground'>ROAS</dt>
                  <dd className='font-semibold tabular-nums'>{Number(campaign.roas || 0).toFixed(2)}x</dd>
                </div>
                <div className='min-w-0'>
                  <dt className='text-xs font-medium uppercase text-muted-foreground'>CTR</dt>
                  <dd className='tabular-nums'>{Number(campaign.ctr || 0).toFixed(2)}%</dd>
                </div>
                <div className='min-w-0'>
                  <dt className='text-xs font-medium uppercase text-muted-foreground'>Conversions</dt>
                  <dd className='tabular-nums'>{Number(campaign.conversions || 0).toLocaleString()}</dd>
                </div>
              </dl>
            </div>
          ))
        ) : (
          <div className='rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground'>
            No campaigns match the current filters.
          </div>
        )}
        <DataTablePagination table={table} />
      </div>
      <div className='hidden md:block'>
        <DataTable table={table} />
      </div>
      <AlertDialog open={pendingMetaImport} onOpenChange={setPendingMetaImport}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Import Meta ads?</AlertDialogTitle>
            <AlertDialogDescription>
              CreatorOS will import live Meta ad performance and update campaign records for this workspace. Use Dry Run first if you need a read-only preview.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className='min-h-11' disabled={importingMeta}>Cancel</AlertDialogCancel>
            <AlertDialogAction className='min-h-11' aria-label='Confirm live Meta ads import' disabled={importingMeta} onClick={() => void handleImportMeta()}>
              Import Meta ads
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export function CampaignsTableSkeleton() {
  return (
    <div className='flex flex-1 animate-pulse flex-col gap-4'>
      <div className='bg-muted h-10 w-full rounded' />
      <div className='bg-muted h-96 w-full rounded-lg' />
      <div className='bg-muted h-10 w-full rounded' />
    </div>
  );
}
