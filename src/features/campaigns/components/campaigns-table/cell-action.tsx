'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import type { Campaign } from '../../api/types';
import { Icons } from '@/components/icons';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { campaignKeys } from '../../api/queries';
import { syncCampaignMetrics, updateCampaignStatus } from '../../api/service';
import { useBrandStore } from '@/components/org-switcher';

interface CellActionProps {
  data: Campaign;
}

export function CellAction({ data }: CellActionProps) {
  const queryClient = useQueryClient();
  const activeBrandId = useBrandStore((s) => s.activeBrand.id);
  const brandId = data.brand_id || activeBrandId;
  const [busy, setBusy] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [pendingCampaignAction, setPendingCampaignAction] = useState<'status' | 'sync' | null>(null);

  const nextStatus = data.status === 'active' ? 'paused' : 'active';
  const nextStatusLabel = nextStatus === 'active' ? 'resume' : 'pause';

  async function refreshCampaigns() {
    await queryClient.invalidateQueries({ queryKey: campaignKeys.all });
  }

  async function handlePauseResume() {
    if (!brandId) {
      toast.error('Select a client brand before updating campaign status.');
      return;
    }
    setBusy(true);
    try {
      const result = await updateCampaignStatus(data.id, nextStatus, brandId);
      const actionLabel = nextStatus === 'active' ? 'resumed' : 'paused';
      if (result.provider_update?.synced) {
        toast.success(`Campaign ${actionLabel} and Meta updated.`);
      } else if (result.provider_update?.synced === false) {
        toast.warning(`Campaign ${actionLabel} in CreatorOS. ${result.provider_update.reason || 'Meta was not updated.'}`);
      } else if (data.platform === 'meta' && !data.ad_id) {
        toast.warning(`Campaign ${actionLabel} in CreatorOS. No linked Meta ad ID was found.`);
      } else {
        toast.success(`Campaign ${actionLabel}.`);
      }
      await refreshCampaigns();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Campaign status update failed');
    } finally {
      setPendingCampaignAction(null);
      setBusy(false);
    }
  }

  async function handleSyncMetrics() {
    if (!brandId) {
      toast.error('Select a client brand before syncing campaign metrics.');
      return;
    }
    setBusy(true);
    try {
      const result = await syncCampaignMetrics(brandId);
      toast.success(`Synced ${result.synced || 0} active campaign${result.synced === 1 ? '' : 's'}.`);
      await refreshCampaigns();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Campaign sync failed');
    } finally {
      setPendingCampaignAction(null);
      setBusy(false);
    }
  }

  function requestPauseResume() {
    if (!brandId) {
      toast.error('Select a client brand before updating campaign status.');
      return;
    }
    setPendingCampaignAction('status');
  }

  function requestSyncMetrics() {
    if (!brandId) {
      toast.error('Select a client brand before syncing campaign metrics.');
      return;
    }
    setPendingCampaignAction('sync');
  }

  async function handlePreviewSyncMetrics() {
    if (!brandId) {
      toast.error('Select a client brand before previewing campaign metrics sync.');
      return;
    }
    setBusy(true);
    try {
      const result = await syncCampaignMetrics(brandId, true);
      const wouldSync = Number(result.would_sync || 0).toLocaleString();
      const active = Number(result.active_campaigns || 0).toLocaleString();
      const setupNote = result.meta_connected === false ? ' Connect Meta before live Meta metrics sync.' : '';
      toast.success(`Dry run ready: ${wouldSync} of ${active} active campaigns would sync.${setupNote}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Campaign sync dry run failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button variant='ghost' className='min-h-11 min-w-11 p-0' disabled={busy} aria-label={`Open campaign actions for ${data.creator_handle || data.id}`}>
            <span className='sr-only'>Open menu</span>
            {busy ? <Icons.spinner className='h-4 w-4 animate-spin' /> : <Icons.ellipsis className='h-4 w-4' />}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end'>
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuItem className='min-h-11' onClick={() => setDetailsOpen(true)}>
            <Icons.externalLink className='mr-2 h-4 w-4' /> View Details
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className='min-h-11' onClick={requestPauseResume} disabled={!brandId}>
            {data.status === 'active' ? (
              <>
                <Icons.minus className='mr-2 h-4 w-4' /> Pause
              </>
            ) : (
              <>
                <Icons.circleCheck className='mr-2 h-4 w-4' /> Resume
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuItem className='min-h-11' onClick={requestSyncMetrics} disabled={!brandId}>
            <Icons.adjustments className='mr-2 h-4 w-4' /> Sync Metrics
          </DropdownMenuItem>
          <DropdownMenuItem className='min-h-11' onClick={handlePreviewSyncMetrics} disabled={!brandId}>
            <Icons.checks className='mr-2 h-4 w-4' /> Dry Run Metrics
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={Boolean(pendingCampaignAction)} onOpenChange={(open) => !open && setPendingCampaignAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingCampaignAction === 'sync' ? 'Sync campaign metrics?' : `${nextStatusLabel[0].toUpperCase()}${nextStatusLabel.slice(1)} campaign?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingCampaignAction === 'sync'
                ? 'CreatorOS will fetch current provider metrics and update active campaigns for this workspace. Use Dry Run Metrics first if you need to preview the sync.'
                : `CreatorOS will ${nextStatusLabel} this campaign in the workspace${data.platform === 'meta' && data.ad_id ? ' and attempt the matching Meta ad status update' : ''}.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className='min-h-11' disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className='min-h-11'
              aria-label={pendingCampaignAction === 'sync' ? `Confirm campaign metrics sync for ${data.creator_handle || data.id}` : `Confirm ${nextStatusLabel} campaign for ${data.creator_handle || data.id}`}
              disabled={busy}
              onClick={() => {
                if (pendingCampaignAction === 'sync') {
                  void handleSyncMetrics();
                } else if (pendingCampaignAction === 'status') {
                  void handlePauseResume();
                }
              }}
            >
              {pendingCampaignAction === 'sync' ? 'Sync metrics' : `${nextStatusLabel[0].toUpperCase()}${nextStatusLabel.slice(1)} campaign`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className='flex max-h-[calc(100dvh-2rem)] max-w-[calc(100vw-2rem)] flex-col overflow-hidden sm:max-w-lg'>
          <DialogHeader className='shrink-0'>
            <DialogTitle>Campaign Details</DialogTitle>
            <DialogDescription>
              @{data.creator_handle} on {data.platform === 'meta' ? 'Meta' : 'TikTok'}.
            </DialogDescription>
          </DialogHeader>
          <div className='min-h-0 space-y-4 overflow-y-auto pr-1'>
            <div className='flex flex-wrap items-center gap-2'>
              <Badge variant='outline'>{data.status}</Badge>
              <Badge variant='secondary'>{data.ad_type.replace(/_/g, ' ')}</Badge>
              <Badge variant='secondary'>{data.creator_platform === 'tiktok' ? 'TikTok creator' : 'Instagram creator'}</Badge>
            </div>
            <div className='grid gap-3 sm:grid-cols-2'>
              {[
                { label: 'Spend', value: `$${Number(data.spend || 0).toLocaleString()}` },
                { label: 'Revenue', value: `$${Number(data.revenue || 0).toLocaleString()}` },
                { label: 'ROAS', value: `${Number(data.roas || 0).toFixed(1)}x` },
                { label: 'CTR', value: `${Number(data.ctr || 0).toFixed(2)}%` },
                { label: 'Impressions', value: Number(data.impressions || 0).toLocaleString() },
                { label: 'Clicks', value: Number(data.clicks || 0).toLocaleString() },
                { label: 'CPM', value: `$${Number(data.cpm || 0).toFixed(2)}` },
                { label: 'Conversions', value: Number(data.conversions || 0).toLocaleString() }
              ].map((metric) => (
                <div key={metric.label} className='rounded-lg border p-3'>
                  <p className='text-xs font-medium text-muted-foreground'>{metric.label}</p>
                  <p className='mt-1 text-lg font-semibold tabular-nums'>{metric.value}</p>
                </div>
              ))}
            </div>
            <div className='rounded-lg border p-3'>
              <p className='text-xs font-medium text-muted-foreground'>Daily budget</p>
              <p className='mt-1 text-sm font-semibold'>${Number(data.daily_budget || 0).toLocaleString()}</p>
              <p className='mt-1 text-xs text-muted-foreground'>Created {data.created_at ? new Date(data.created_at).toLocaleString() : 'date unavailable'}</p>
            </div>
            <div className='rounded-lg border p-3'>
              <p className='text-xs font-medium text-muted-foreground'>Provider link</p>
              <div className='mt-2 space-y-1 text-xs'>
                <p className='break-words'><span className='text-muted-foreground'>Ad account:</span> <span className='font-mono break-all'>{data.ad_account_id || 'Not linked'}</span></p>
                <p className='break-words'><span className='text-muted-foreground'>Campaign:</span> <span className='font-mono break-all'>{data.campaign_id || 'Not linked'}</span></p>
                <p className='break-words'><span className='text-muted-foreground'>Ad set:</span> <span className='font-mono break-all'>{data.adset_id || 'Not linked'}</span></p>
                <p className='break-words'><span className='text-muted-foreground'>Ad:</span> <span className='font-mono break-all'>{data.ad_id || 'Not linked'}</span></p>
                <p><span className='text-muted-foreground'>Last synced:</span> {data.last_synced_at ? new Date(data.last_synced_at).toLocaleString() : 'Not synced'}</p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
