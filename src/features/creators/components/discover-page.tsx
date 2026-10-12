'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Icons } from '@/components/icons';
import { toast } from 'sonner';
import { useBrandStore } from '@/components/org-switcher';
import { withLocalQaMarker } from '@/lib/whitelabel-api';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';

export default function DiscoverPage() {
  const activeBrandId = useBrandStore((s) => s.activeBrand.id);
  const [keywords, setKeywords] = useState('');
  const [platform, setPlatform] = useState<'instagram' | 'tiktok'>('instagram');
  const [limit, setLimit] = useState(50);
  const [discovering, setDiscovering] = useState(false);
  const [previewingDiscovery, setPreviewingDiscovery] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [previewingEnrichment, setPreviewingEnrichment] = useState(false);
  const [pendingBulkAction, setPendingBulkAction] = useState<'discover' | 'enrich' | null>(null);
  const [results, setResults] = useState<{ discovered?: number; enriched?: number; discoveryPreview?: number; enrichmentPreview?: number } | null>(null);

  async function handleDiscover(dryRun = false) {
    if (!activeBrandId) {
      toast.error(`Select a client brand before ${dryRun ? 'previewing' : 'running'} discovery.`);
      return;
    }
    if (!keywords.trim()) {
      toast.error('Enter at least one keyword or hashtag');
      return;
    }
    if (dryRun) {
      setPreviewingDiscovery(true);
    } else {
      setDiscovering(true);
    }
    setResults(null);
    toast.info(`${dryRun ? 'Previewing' : 'Searching'} ${platform} for "${keywords}"...`);
    try {
      const res = await fetch(withLocalQaMarker('/api/proxy/api/discover'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand_id: activeBrandId,
          platform,
          keywords: keywords.split(',').map((k) => k.trim()).filter(Boolean),
          limit,
          dry_run: dryRun
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || data.error || `${res.status}`);
      const discovered = Number(data.discovered ?? data.count ?? data.creators?.length ?? 0);
      const previewCount = Number(data.would_create_creators ?? data.count ?? data.creators?.length ?? 0);
      setResults(dryRun ? { discoveryPreview: previewCount } : { discovered });
      toast.success(data.message || 'Discovery started! Creators will appear in your list as they are found.');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Discovery failed');
    } finally {
      if (dryRun) {
        setPreviewingDiscovery(false);
      } else {
        setPendingBulkAction(null);
        setDiscovering(false);
      }
    }
  }

  async function handleEnrich(dryRun = false) {
    if (!activeBrandId) {
      toast.error(`Select a client brand before ${dryRun ? 'previewing enrichment for' : 'enriching'} creators.`);
      return;
    }
    if (dryRun) {
      setPreviewingEnrichment(true);
    } else {
      setEnriching(true);
    }
    toast.info(`${dryRun ? 'Previewing enrichment for' : 'Enriching'} creators with Instagram data...`);
    try {
      const res = await fetch(withLocalQaMarker('/api/proxy/api/enrich'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand_id: activeBrandId,
          limit: 50,
          dry_run: dryRun
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || data.error || `${res.status}`);
      const enriched = Number(data.enriched ?? data.creators?.length ?? 0);
      const previewCount = Number(data.would_enrich ?? data.creators?.length ?? 0);
      setResults((prev) => ({ ...prev, ...(dryRun ? { enrichmentPreview: previewCount } : { enriched }) }));
      toast.success(data.message || 'Enrichment started! Profiles will update as they complete.');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Enrichment failed');
    } finally {
      if (dryRun) {
        setPreviewingEnrichment(false);
      } else {
        setPendingBulkAction(null);
        setEnriching(false);
      }
    }
  }

  function requestDiscover() {
    if (!activeBrandId) {
      toast.error('Select a client brand before running discovery.');
      return;
    }
    if (!keywords.trim()) {
      toast.error('Enter at least one keyword or hashtag');
      return;
    }
    setPendingBulkAction('discover');
  }

  function requestEnrich() {
    if (!activeBrandId) {
      toast.error('Select a client brand before enriching creators.');
      return;
    }
    setPendingBulkAction('enrich');
  }

  return (
    <div className='flex flex-col gap-6'>
      {/* Discovery Form */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Icons.search className='size-5' />
            Search for Creators
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className='flex flex-col gap-4'>
            <div className='grid gap-4 md:grid-cols-[1fr_160px_120px]'>
              <div>
                <label htmlFor='discover-keywords' className='text-sm font-medium mb-1.5 block'>
                  Keywords / Hashtags
                </label>
                <Input
                  id='discover-keywords'
                  aria-label='Creator discovery keywords'
                  placeholder='e.g. matcha, adaptogens, gut health'
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  disabled={discovering}
                />
                <p className='text-xs text-muted-foreground mt-1'>
                  Separate multiple keywords with commas
                </p>
              </div>
              <div>
                <label htmlFor='discover-platform' className='text-sm font-medium mb-1.5 block'>
                  Platform
                </label>
                <Select value={platform} onValueChange={(v: 'instagram' | 'tiktok') => setPlatform(v)}>
                  <SelectTrigger id='discover-platform' aria-label='Creator discovery platform' className='min-h-11'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='instagram'>Instagram</SelectItem>
                    <SelectItem value='tiktok'>TikTok</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label htmlFor='discover-limit' className='text-sm font-medium mb-1.5 block'>
                  Limit
                </label>
                <Select value={String(limit)} onValueChange={(v) => setLimit(Number(v))}>
                  <SelectTrigger id='discover-limit' aria-label='Creator discovery limit' className='min-h-11'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='25'>25</SelectItem>
                    <SelectItem value='50'>50</SelectItem>
                    <SelectItem value='100'>100</SelectItem>
                    <SelectItem value='200'>200</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className='flex flex-wrap gap-2'>
              <Button
                variant='outline'
                onClick={() => void handleDiscover(true)}
                disabled={discovering || previewingDiscovery || !keywords.trim() || !activeBrandId}
                className='min-h-11 w-fit'
                aria-label='Preview creator discovery'
              >
                {previewingDiscovery ? (
                  <>
                    <Icons.spinner className='mr-2 size-4 animate-spin' />
                    Previewing...
                  </>
                ) : (
                  <>
                    <Icons.search className='mr-2 size-4' />
                    Preview Discovery
                  </>
                )}
              </Button>
              <Button
                onClick={requestDiscover}
                disabled={discovering || previewingDiscovery || !keywords.trim() || !activeBrandId}
                className='min-h-11 w-fit'
                aria-label='Discover creators'
              >
                {discovering ? (
                  <>
                    <Icons.spinner className='mr-2 size-4 animate-spin' />
                    Discovering...
                  </>
                ) : (
                  <>
                    <Icons.search className='mr-2 size-4' />
                    Discover Creators
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Enrich Existing */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Icons.sparkles className='size-5' />
            Enrich Existing Creators
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className='text-sm text-muted-foreground mb-4'>
            Pull follower counts, bios, engagement rates, and profile photos from Instagram
            for creators already in your database.
          </p>
          <div className='flex flex-wrap gap-2'>
            <Button
              onClick={() => void handleEnrich(true)}
              disabled={enriching || previewingEnrichment || !activeBrandId}
              variant='outline'
              className='min-h-11'
              aria-label='Preview creator enrichment'
            >
              {previewingEnrichment ? (
                <>
                  <Icons.spinner className='mr-2 size-4 animate-spin' />
                  Previewing...
                </>
              ) : (
                <>
                  <Icons.sparkles className='mr-2 size-4' />
                  Preview Enrichment
                </>
              )}
            </Button>
            <Button
              onClick={requestEnrich}
              disabled={enriching || previewingEnrichment || !activeBrandId}
              variant='outline'
              className='min-h-11'
              aria-label='Enrich creator profiles'
            >
              {enriching ? (
                <>
                  <Icons.spinner className='mr-2 size-4 animate-spin' />
                  Enriching...
                </>
              ) : (
                <>
                  <Icons.sparkles className='mr-2 size-4' />
                  Enrich 50 Creators
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {results && (
        <Card>
          <CardContent className='pt-6'>
            <div className='flex flex-wrap gap-4'>
              {results.discovered != null && (
                <Badge variant='secondary' className='text-sm px-3 py-1'>
                  <Icons.teams className='mr-1.5 size-3.5' />
                  Added {results.discovered} creator{results.discovered === 1 ? '' : 's'} to review
                </Badge>
              )}
              {results.discoveryPreview != null && (
                <Badge variant='outline' className='text-sm px-3 py-1'>
                  <Icons.teams className='mr-1.5 size-3.5' />
                  Would add {results.discoveryPreview} creator{results.discoveryPreview === 1 ? '' : 's'} to review
                </Badge>
              )}
              {results.enriched != null && (
                <Badge variant='secondary' className='text-sm px-3 py-1'>
                  <Icons.sparkles className='mr-1.5 size-3.5' />
                  Enriched {results.enriched} creator profile{results.enriched === 1 ? '' : 's'}
                </Badge>
              )}
              {results.enrichmentPreview != null && (
                <Badge variant='outline' className='text-sm px-3 py-1'>
                  <Icons.sparkles className='mr-1.5 size-3.5' />
                  Would enrich {results.enrichmentPreview} creator profile{results.enrichmentPreview === 1 ? '' : 's'}
                </Badge>
              )}
              <Button variant='link' size='sm' asChild>
                <Link href='/dashboard/creators'>View all creators &rarr;</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      <AlertDialog open={Boolean(pendingBulkAction)} onOpenChange={(open) => !open && setPendingBulkAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingBulkAction === 'enrich' ? 'Enrich creator profiles?' : 'Discover creators?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingBulkAction === 'enrich'
                ? 'CreatorOS will update existing creator profiles with external social data and profile photos. Use Preview Enrichment first if you need a read-only check.'
                : `CreatorOS will search ${platform} for "${keywords}" and add matching creators to review. Use Preview Discovery first if you need a read-only check.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={discovering || enriching}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={discovering || enriching}
              onClick={() => {
                if (pendingBulkAction === 'enrich') {
                  void handleEnrich();
                } else if (pendingBulkAction === 'discover') {
                  void handleDiscover();
                }
              }}
            >
              {pendingBulkAction === 'enrich' ? 'Enrich creators' : 'Discover creators'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
