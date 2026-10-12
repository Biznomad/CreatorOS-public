'use client';

import { useCallback, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
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
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Icons } from '@/components/icons';
import { apiPost } from '@/lib/whitelabel-api';
import { creatorKeys } from '../api/queries';
import { getCreatorPhotoCoverage, type CreatorPhotoCoverage } from '../api/service';

type Props = {
  brandId: string;
};

type EnrichmentSource = 'discovered' | 'shopify_customer';

export function PhotoCoveragePanel({ brandId }: Props) {
  const queryClient = useQueryClient();
  const [coverage, setCoverage] = useState<CreatorPhotoCoverage | null>(null);
  const [loading, setLoading] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [previewing, setPreviewing] = useState<EnrichmentSource | null>(null);
  const [pendingSource, setPendingSource] = useState<EnrichmentSource | null>(null);
  const [previewResult, setPreviewResult] = useState<{ source: EnrichmentSource; count: number } | null>(null);

  const loadCoverage = useCallback(async () => {
    if (!brandId) return;
    setLoading(true);
    try {
      setCoverage(await getCreatorPhotoCoverage(brandId));
    } finally {
      setLoading(false);
    }
  }, [brandId]);

  useEffect(() => {
    void loadCoverage();
  }, [loadCoverage]);

  async function runPhotoEnrichment(source: EnrichmentSource, dryRun = false) {
    if (!brandId) return;
    if (dryRun) {
      setPreviewing(source);
    } else {
      setEnriching(true);
    }
    const sourceLabel = source === 'discovered' ? 'discovered creators' : 'Shopify customers';
    const sourceProfileLabel = source === 'discovered' ? 'discovered creator' : 'Shopify customer';
    try {
      const data = await apiPost<{
        status?: string;
        dry_run?: boolean;
        enriched?: number;
        would_enrich?: number;
        message?: string;
      }>('/api/enrichment/run', {
        brand_id: brandId,
        source,
        limit: 50,
        dry_run: dryRun
      });
      const enriched = Number(data?.enriched || 0);
      const previewCount = Number(data?.would_enrich ?? enriched);
      if (data?.status === 'needs_provider') {
        toast.warning(
          data.message || `A profile-photo provider is required for remaining ${sourceLabel}.`
        );
      } else if (dryRun) {
        setPreviewResult({ source, count: previewCount });
        toast.info(
          `Preview found ${previewCount.toLocaleString()} ${sourceProfileLabel} profile${previewCount === 1 ? '' : 's'} ready for enrichment.`
        );
      } else if (enriched === 0) {
        toast.info(data?.message || `No additional photos were found for ${sourceLabel}.`);
      } else {
        toast.success(
          `Updated ${enriched.toLocaleString()} ${sourceLabel} profile photo${enriched === 1 ? '' : 's'}.`
        );
      }
      if (!dryRun) {
        setPendingSource(null);
        setPreviewResult(null);
        await loadCoverage();
        await queryClient.invalidateQueries({ queryKey: creatorKeys.all });
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Photo enrichment failed');
    } finally {
      if (dryRun) {
        setPreviewing(null);
      } else {
        setEnriching(false);
      }
    }
  }

  if (!brandId || !coverage) return null;

  const shopify = coverage.coverage.shopify_customer;
  const discovered = coverage.coverage.discovered;
  const hasProvider = coverage.providers.apify || coverage.providers.scrapling;
  const providerLabel = hasProvider ? 'Provider ready' : 'Provider needed';

  const pendingSourceLabel = pendingSource === 'discovered' ? 'discovered creators' : 'Shopify customers';
  const pendingBucket = pendingSource === 'discovered' ? discovered : shopify;

  return (
    <>
      <Alert className='border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-100'>
        <Icons.product className='size-4' />
        <AlertTitle className='flex flex-wrap items-center gap-2'>
          Creator photo coverage
          <Badge variant={hasProvider ? 'default' : 'outline'}>{providerLabel}</Badge>
          {coverage.providers.meta && <Badge variant='secondary'>Meta connected</Badge>}
        </AlertTitle>
        <AlertDescription>
          <div className='mt-2 grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end'>
            <div className='space-y-2'>
              <div className='flex items-center justify-between gap-3 text-xs'>
                <span>Shopify customers with photos</span>
                <span className='font-medium'>
                  {shopify.with_photo.toLocaleString()} / {shopify.total.toLocaleString()}
                </span>
              </div>
              <Progress value={shopify.photo_percent} />
              <p className='text-xs opacity-80'>
                {shopify.missing_photo.toLocaleString()} missing photos,{' '}
                {shopify.enrichable_missing_photo.toLocaleString()} eligible for the next provider pass,{' '}
                {shopify.with_customer_stats.toLocaleString()} with customer/order stats.
              </p>
            </div>
            <div className='space-y-2'>
              <div className='flex items-center justify-between gap-3 text-xs'>
                <span>Discovered creators with photos</span>
                <span className='font-medium'>
                  {discovered.with_photo.toLocaleString()} / {discovered.total.toLocaleString()}
                </span>
              </div>
              <Progress value={discovered.photo_percent} />
              <p className='text-xs opacity-80'>
                {discovered.missing_photo.toLocaleString()} missing photos,{' '}
                {discovered.enrichable_missing_photo.toLocaleString()} eligible for the next provider pass. Program stats coverage:{' '}
                {discovered.program_stats_percent}%.
              </p>
            </div>
            <div className='grid grid-cols-2 gap-2 sm:flex sm:flex-wrap md:max-w-[21rem]'>
              <Button
                size='sm'
                variant='outline'
                className='min-h-11 gap-2 bg-background/80'
                onClick={loadCoverage}
                disabled={loading || enriching || Boolean(previewing)}
              >
                {loading ? (
                  <Icons.spinner className='size-3.5 animate-spin' />
                ) : (
                  <Icons.refresh className='size-3.5' />
                )}
                Recheck
              </Button>
              <Button
                size='sm'
                variant='outline'
                className='min-h-11 gap-2 bg-background/80'
                onClick={() => runPhotoEnrichment('discovered', true)}
                disabled={enriching || Boolean(previewing) || discovered.enrichable_missing_photo === 0}
              >
                {previewing === 'discovered' ? (
                  <Icons.spinner className='size-3.5 animate-spin' />
                ) : (
                  <Icons.product className='size-3.5' />
                )}
                Preview discovered
              </Button>
              <Button
                size='sm'
                variant='outline'
                className='min-h-11 gap-2 bg-background/80'
                onClick={() => runPhotoEnrichment('shopify_customer', true)}
                disabled={enriching || Boolean(previewing) || shopify.enrichable_missing_photo === 0}
              >
                {previewing === 'shopify_customer' ? (
                  <Icons.spinner className='size-3.5 animate-spin' />
                ) : (
                  <Icons.product className='size-3.5' />
                )}
                Preview Shopify
              </Button>
              <Button
                size='sm'
                className='min-h-11 gap-2'
                onClick={() => setPendingSource('discovered')}
                disabled={enriching || Boolean(previewing) || discovered.enrichable_missing_photo === 0}
              >
                <Icons.product className='size-3.5' />
                Get discovered
              </Button>
              <Button
                size='sm'
                variant='outline'
                className='min-h-11 gap-2 bg-background/80'
                onClick={() => setPendingSource('shopify_customer')}
                disabled={enriching || Boolean(previewing) || shopify.enrichable_missing_photo === 0}
              >
                <Icons.product className='size-3.5' />
                Get Shopify
              </Button>
            </div>
          </div>
          {previewResult && (
            <p className='mt-3 text-xs font-medium'>
              Preview found {previewResult.count.toLocaleString()}{' '}
              {previewResult.source === 'discovered' ? 'discovered creators' : 'Shopify customers'} ready for enrichment.
            </p>
          )}
          {coverage.blocker && <p className='mt-3 text-xs font-medium'>{coverage.blocker}</p>}
        </AlertDescription>
      </Alert>
      <AlertDialog open={Boolean(pendingSource)} onOpenChange={(open) => !open && setPendingSource(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Run profile-photo enrichment?</AlertDialogTitle>
            <AlertDialogDescription>
              CreatorOS will check up to 50 {pendingSourceLabel} with the configured photo provider and save only renderable real profile photos. {pendingBucket?.enrichable_missing_photo.toLocaleString()} rows are currently eligible; use Preview first if you need a read-only count.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={enriching}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={enriching || !pendingSource} onClick={() => pendingSource && void runPhotoEnrichment(pendingSource)}>
              {enriching ? 'Running...' : 'Run enrichment'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
