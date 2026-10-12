'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import type { Creator } from '../../api/types';
import { Icons } from '@/components/icons';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useBrandStore } from '@/components/org-switcher';
import { withLocalQaMarker } from '@/lib/whitelabel-api';

interface CellActionProps {
  data: Creator;
  onViewProfile: (creator: Creator) => void;
}

export function CellAction({ data, onViewProfile }: CellActionProps) {
  const router = useRouter();
  const activeBrandId = useBrandStore((s) => s.activeBrand.id);
  const [pendingCreatorAction, setPendingCreatorAction] = useState<'dm' | 'brief' | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleGenerateDM(dryRun = false) {
    const brandId = data.brand_id || activeBrandId;
    if (!brandId) {
      toast.error(`Select a client brand before ${dryRun ? 'previewing' : 'generating'} a DM.`);
      return;
    }
    if (!dryRun) setBusy(true);
    toast.info(`${dryRun ? 'Previewing' : 'Generating'} DM for @${data.handle}...`);
    try {
      const res = await fetch(withLocalQaMarker('/api/proxy/api/outreach'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand_id: brandId,
          creator_id: data.id,
          handle: data.handle,
          platform: data.platform,
          channel: 'dm',
          dry_run: dryRun
        })
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(result.detail || result.error || `${res.status}`);
      if (dryRun) {
        toast.success(result.message ? `Dry run ready: ${result.message}` : `Dry run ready: would create a DM draft for @${data.handle}.`);
      } else {
        toast.success(result.existing ? `Existing DM draft found for @${data.handle}.` : `DM generated for @${data.handle}! Check AI Proposals.`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Failed to ${dryRun ? 'preview' : 'generate'} DM for @${data.handle}.`);
    } finally {
      if (!dryRun) {
        setPendingCreatorAction(null);
        setBusy(false);
      }
    }
  }

  async function handleCreateBrief() {
    const brandId = data.brand_id || activeBrandId;
    if (!brandId) {
      toast.error('Select a client brand before creating a brief.');
      return;
    }
    setBusy(true);
    toast.info(`Creating content brief for @${data.handle}...`);
    try {
      const res = await fetch(withLocalQaMarker('/api/proxy/api/briefs'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand_id: brandId,
          handle: data.handle,
          content_type: 'reel',
          title: `Reel brief for @${data.handle}`
        })
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(result.detail || result.error || 'Brief creation failed');
      toast.success(`Saved brief for @${data.handle}.`);
      router.push('/dashboard/ai-tools');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Could not create brief for @${data.handle}.`);
    } finally {
      setPendingCreatorAction(null);
      setBusy(false);
    }
  }

  function requestGenerateDM() {
    const brandId = data.brand_id || activeBrandId;
    if (!brandId) {
      toast.error('Select a client brand before generating a DM.');
      return;
    }
    setPendingCreatorAction('dm');
  }

  function requestCreateBrief() {
    const brandId = data.brand_id || activeBrandId;
    if (!brandId) {
      toast.error('Select a client brand before creating a brief.');
      return;
    }
    setPendingCreatorAction('brief');
  }

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            variant='ghost'
            className='min-h-11 min-w-11 p-0'
            disabled={busy}
            aria-label={`Open creator actions for ${data.handle || data.display_name || data.id}`}
          >
            <span className='sr-only'>Open menu</span>
            {busy ? <Icons.spinner className='h-4 w-4 animate-spin' /> : <Icons.ellipsis className='h-4 w-4' />}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end'>
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuItem className='min-h-11' onClick={() => onViewProfile(data)}>
            <Icons.user2 className='mr-2 h-4 w-4' /> View Profile
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className='min-h-11' onClick={() => void handleGenerateDM(true)}>
            <Icons.search className='mr-2 h-4 w-4' /> Preview DM
          </DropdownMenuItem>
          <DropdownMenuItem className='min-h-11' onClick={requestGenerateDM}>
            <Icons.send className='mr-2 h-4 w-4' /> Generate DM
          </DropdownMenuItem>
          <DropdownMenuItem className='min-h-11' onClick={requestCreateBrief}>
            <Icons.forms className='mr-2 h-4 w-4' /> Create Brief
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={Boolean(pendingCreatorAction)} onOpenChange={(open) => !open && setPendingCreatorAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingCreatorAction === 'brief' ? 'Create content brief?' : 'Generate DM draft?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingCreatorAction === 'brief'
                ? `CreatorOS will save a new reel brief for @${data.handle} and open AI Tools.`
                : `CreatorOS will create or reuse an outreach DM draft for @${data.handle}. Use Preview DM first if you need a read-only check.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className='min-h-11' disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className='min-h-11'
              aria-label={pendingCreatorAction === 'brief' ? `Confirm content brief for ${data.handle || data.id}` : `Confirm DM draft for ${data.handle || data.id}`}
              disabled={busy}
              onClick={() => {
                if (pendingCreatorAction === 'brief') {
                  void handleCreateBrief();
                } else if (pendingCreatorAction === 'dm') {
                  void handleGenerateDM();
                }
              }}
            >
              {pendingCreatorAction === 'brief' ? 'Create brief' : 'Generate DM'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
