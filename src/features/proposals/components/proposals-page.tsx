'use client';

import { useCallback, useEffect, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Icons } from '@/components/icons';
import { toast } from 'sonner';
import { useEffectiveBrandId } from '@/hooks/use-effective-brand';
import { withLocalQaMarker } from '@/lib/whitelabel-api';

const API_BASE = '/api/proxy';

type ProposalStatus = 'pending' | 'approved' | 'rejected' | 'sent' | 'delivered' | 'replied' | 'declined' | 'failed';

interface Proposal {
  id: string;
  handle: string;
  platform: string;
  display_name: string;
  score: number;
  avatar_url: string;
  message: string;
  channel: string;
  status: ProposalStatus;
  created_at: string;
  editing: boolean;
}

type ProposalRow = Partial<Proposal> & {
  id?: string | number;
  creator_handle?: string;
  creator_platform?: string;
  creator_display_name?: string;
};

type PendingStatusConfirmation = {
  id: string;
  handle: string;
  status: Extract<ProposalStatus, 'approved' | 'rejected'>;
};

const statusConfig: Record<ProposalStatus, { label: string; className: string }> = {
  pending: { label: 'Pending Review', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' },
  approved: { label: 'Approved', className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
  rejected: { label: 'Rejected', className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
  sent: { label: 'Sent', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
  delivered: { label: 'Delivered', className: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400' },
  replied: { label: 'Replied', className: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' },
  declined: { label: 'Declined', className: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' },
  failed: { label: 'Failed', className: 'bg-zinc-100 text-zinc-800 dark:bg-zinc-900/30 dark:text-zinc-300' }
};

function normalizeProposalStatus(status: unknown): ProposalStatus {
  const nextStatus = String(status || 'pending').toLowerCase();
  if (nextStatus in statusConfig) return nextStatus as ProposalStatus;
  return 'pending';
}

function getProposalRows(data: unknown): ProposalRow[] {
  if (Array.isArray(data)) return data as ProposalRow[];
  if (data && typeof data === 'object' && Array.isArray((data as { outreach?: unknown }).outreach)) {
    return (data as { outreach: ProposalRow[] }).outreach;
  }
  return [];
}

function normalizeScore(value: unknown) {
  const score = Number(value);
  return Number.isFinite(score) && score > 0 ? score : 0;
}

function formatProposalScore(score: number) {
  return score > 0 ? `Score ${score}` : 'Unscored';
}

export default function ProposalsPage() {
  const activeBrandId = useEffectiveBrandId();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editTexts, setEditTexts] = useState<Record<string, string>>({});
  const [bulkAction, setBulkAction] = useState<'approving' | 'previewing-send' | 'sending' | null>(null);
  const [pendingBulkConfirmation, setPendingBulkConfirmation] = useState<'approve' | 'send' | null>(null);
  const [pendingStatusConfirmation, setPendingStatusConfirmation] = useState<PendingStatusConfirmation | null>(null);

  const loadProposals = useCallback(() => {
    if (!activeBrandId) {
      setProposals([]);
      setEditTexts({});
      setLoadError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError(null);

    async function fetchProposals() {
      try {
        const res = await fetch(withLocalQaMarker(`${API_BASE}/api/outreach?brand_id=${encodeURIComponent(activeBrandId)}&limit=50`));
        if (!res.ok) throw new Error(`${res.status}`);
        const data = await res.json();
        const rows = getProposalRows(data);
        setProposals(
          (rows || []).map((r) => ({
            id: String(r.id),
            handle: r.handle || r.creator_handle || '',
            platform: r.platform || r.creator_platform || 'instagram',
            display_name: r.display_name || r.creator_display_name || r.handle || r.creator_handle || '',
            score: normalizeScore(r.score),
            avatar_url: r.avatar_url || '',
            message: r.message || '',
            channel: r.channel || 'dm',
            status: normalizeProposalStatus(r.status),
            created_at: r.created_at || '',
            editing: false
          }))
        );
        setEditTexts({});
      } catch (error) {
        setProposals([]);
        setEditTexts({});
        setLoadError(error instanceof Error ? `AI proposals could not be loaded (${error.message}).` : 'AI proposals could not be loaded.');
      } finally {
        setLoading(false);
      }
    }
    void fetchProposals();
  }, [activeBrandId]);

  useEffect(() => {
    loadProposals();
  }, [loadProposals]);

  async function patchProposal(id: string, payload: { message?: string; status?: ProposalStatus }) {
    if (!activeBrandId) {
      throw new Error('Select a client workspace before updating proposals.');
    }

    const res = await fetch(withLocalQaMarker(`${API_BASE}/api/outreach/${id}?brand_id=${encodeURIComponent(activeBrandId)}`), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, brand_id: activeBrandId })
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.detail || data?.error || `Update failed (${res.status})`);
    return data as ProposalRow;
  }

  async function setStatus(id: string, status: ProposalStatus) {
    try {
      await patchProposal(id, { status });
      setProposals((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status, editing: false } : p))
      );
      if (status === 'approved') {
        toast.success('Proposal approved.');
      } else if (status === 'rejected') {
        toast.error('Proposal rejected.');
      } else if (status === 'sent') {
        toast.success('Proposal marked sent.');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update proposal.');
    }
  }

  function requestStatusUpdate(proposal: Proposal, status: PendingStatusConfirmation['status']) {
    setPendingStatusConfirmation({ id: proposal.id, handle: proposal.handle, status });
  }

  function toggleEdit(id: string, currentText: string) {
    setProposals((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        if (!p.editing) {
          setEditTexts((t) => ({ ...t, [id]: currentText }));
        }
        return { ...p, editing: !p.editing };
      })
    );
  }

  async function saveEdit(id: string) {
    const newMsg = editTexts[id];
    try {
      await patchProposal(id, { message: newMsg });
      setProposals((prev) =>
        prev.map((p) =>
          p.id === id ? { ...p, message: newMsg ?? p.message, editing: false } : p
        )
      );
      toast.success('Proposal updated.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save proposal.');
    }
  }

  const pendingCount = proposals.filter((p) => p.status === 'pending').length;
  const approvedCount = proposals.filter((p) => p.status === 'approved').length;

  async function sendExistingProposal(id: string, dryRun = false) {
    if (!activeBrandId) {
      throw new Error('Select a client workspace before sending proposals.');
    }

    const res = await fetch(withLocalQaMarker(`${API_BASE}/api/outreach/${id}/send`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brand_id: activeBrandId, dry_run: dryRun })
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.detail || data?.error || `Send failed (${res.status})`);
    return data as { delivered?: boolean; status?: ProposalStatus; delivery?: { deliverable?: boolean; reason?: string } };
  }

  async function approveAllPending() {
    const pending = proposals.filter((p) => p.status === 'pending');
    if (!pending.length) return;
    setBulkAction('approving');
    try {
      await Promise.all(pending.map((proposal) => patchProposal(proposal.id, { status: 'approved' })));
      setProposals((prev) =>
        prev.map((p) => (p.status === 'pending' ? { ...p, status: 'approved' } : p))
      );
      toast.success(`${pending.length} proposals approved.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not approve proposals.');
    } finally {
      setPendingBulkConfirmation(null);
      setBulkAction(null);
    }
  }

  function requestApproveAllPending() {
    if (pendingCount === 0) return;
    setPendingBulkConfirmation('approve');
  }

  async function previewSendApproved() {
    const approved = proposals.filter((p) => p.status === 'approved');
    if (!approved.length) return;
    setBulkAction('previewing-send');
    try {
      const results = await Promise.all(approved.map((proposal) => sendExistingProposal(proposal.id, true)));
      const deliverable = results.filter((result) => result.delivery?.deliverable).length;
      const held = results.length - deliverable;
      if (held > 0) {
        toast.warning(`Dry run ready: ${deliverable} can send now, ${held} would stay approved pending delivery setup.`);
      } else {
        toast.success(`Dry run ready: ${deliverable} approved proposal${deliverable === 1 ? '' : 's'} can send now.`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not preview approved proposal sends.');
    } finally {
      setPendingBulkConfirmation(null);
      setBulkAction(null);
    }
  }

  function requestSendApproved() {
    if (approvedCount === 0) return;
    setPendingBulkConfirmation('send');
  }

  async function sendApproved() {
    const approved = proposals.filter((p) => p.status === 'approved');
    if (!approved.length) return;
    setBulkAction('sending');
    try {
      const results = await Promise.all(approved.map(async (proposal) => ({
        id: proposal.id,
        result: await sendExistingProposal(proposal.id)
      })));
      const sentIds = new Set(results.filter(({ result }) => result.delivered || result.status === 'sent').map(({ id }) => id));
      setProposals((prev) =>
        prev.map((p) => (sentIds.has(p.id) ? { ...p, status: 'sent' } : p))
      );
      const held = approved.length - sentIds.size;
      if (held > 0) {
        toast.warning(`${sentIds.size} sent, ${held} stayed approved pending delivery setup.`);
      } else {
        toast.success(`${sentIds.size} approved proposal${sentIds.size === 1 ? '' : 's'} sent.`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not send approved proposals.');
    } finally {
      setBulkAction(null);
    }
  }

  if (loading) {
    return (
      <div className='flex flex-col gap-3'>
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className='animate-pulse'>
            <CardContent className='pt-6'>
              <div className='flex gap-4'>
                <div className='bg-muted h-10 w-10 rounded-full' />
                <div className='flex flex-1 flex-col gap-2'>
                  <div className='bg-muted h-4 w-32 rounded' />
                  <div className='bg-muted h-3 w-full rounded' />
                  <div className='bg-muted h-3 w-3/4 rounded' />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (proposals.length === 0) {
    return (
      <div className='flex min-w-0 flex-col gap-4 overflow-hidden'>
        {loadError ? (
          <Alert variant='destructive'>
            <Icons.warning className='size-4' />
            <AlertTitle>AI proposals unavailable</AlertTitle>
            <AlertDescription className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
              <span>{loadError}</span>
              <Button
                aria-label='Retry AI proposals load'
                type='button'
                variant='outline'
                size='sm'
                className='w-full sm:w-auto'
                onClick={loadProposals}
                disabled={loading}
              >
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}
        <div className='flex items-center justify-center rounded-lg border border-dashed p-6 sm:p-12'>
          <div className='text-center'>
            <Icons.sparkles className='text-muted-foreground mx-auto mb-3 h-8 w-8' />
            <h3 className='text-base font-medium'>
              {activeBrandId ? 'No proposals yet' : 'Select a workspace'}
            </h3>
            <p className='text-muted-foreground mt-1 text-sm'>
              {activeBrandId
                ? 'Run outreach generation to create AI proposals for your creators.'
                : 'Choose a client workspace before reviewing or approving AI proposals.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='flex min-w-0 flex-col gap-6 overflow-hidden'>
      <AlertDialog open={Boolean(pendingStatusConfirmation)} onOpenChange={(open) => !open && setPendingStatusConfirmation(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingStatusConfirmation?.status === 'approved' ? 'Approve this proposal?' : 'Reject this proposal?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingStatusConfirmation?.status === 'approved'
                ? `CreatorOS will mark @${pendingStatusConfirmation.handle} approved and keep the proposal ready for delivery.`
                : `CreatorOS will reject @${pendingStatusConfirmation?.handle}'s proposal and remove it from the approved send queue.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!pendingStatusConfirmation) return;
                void setStatus(pendingStatusConfirmation.id, pendingStatusConfirmation.status);
                setPendingStatusConfirmation(null);
              }}
            >
              {pendingStatusConfirmation?.status === 'approved' ? 'Approve proposal' : 'Reject proposal'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={Boolean(pendingBulkConfirmation)} onOpenChange={(open) => !open && setPendingBulkConfirmation(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingBulkConfirmation === 'send' ? 'Send approved proposals?' : 'Approve all pending proposals?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingBulkConfirmation === 'send'
                ? `CreatorOS will attempt delivery for ${approvedCount} approved proposal${approvedCount === 1 ? '' : 's'}. Run Preview Send first if you need to confirm provider readiness.`
                : `CreatorOS will mark ${pendingCount} pending proposal${pendingCount === 1 ? '' : 's'} approved for this workspace.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkAction !== null}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={bulkAction !== null}
              onClick={() => {
                if (pendingBulkConfirmation === 'send') {
                  void sendApproved();
                } else if (pendingBulkConfirmation === 'approve') {
                  void approveAllPending();
                }
              }}
            >
              {pendingBulkConfirmation === 'send' ? 'Send proposals' : 'Approve proposals'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {loadError ? (
        <Alert variant='destructive'>
          <Icons.warning className='size-4' />
          <AlertTitle>AI proposals may be stale</AlertTitle>
          <AlertDescription className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
            <span>{loadError}</span>
            <Button
              aria-label='Retry AI proposals load'
              type='button'
              variant='outline'
              size='sm'
              className='w-full sm:w-auto'
              onClick={loadProposals}
              disabled={loading}
            >
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      {/* Proposals list */}
      <div className='flex min-w-0 flex-col gap-4'>
        {proposals.map((proposal) => {
          const initials = (proposal.display_name || proposal.handle).slice(0, 2).toUpperCase();
          const proposalActionLabel = `@${proposal.handle} proposal ${proposal.id.slice(0, 8)}`;
          return (
            <Card key={proposal.id} className='min-w-0 overflow-hidden'>
              <CardContent className='pt-6'>
                <div className='flex min-w-0 flex-col gap-4 md:flex-row md:gap-6'>
                  {/* Left: creator info */}
                  <div className='flex min-w-0 shrink-0 flex-col items-center gap-2 text-center md:w-36'>
                    <Avatar className='h-10 w-10'>
                      <AvatarImage src={proposal.avatar_url} alt={proposal.display_name || proposal.handle} />
                      <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>
                    <div className='min-w-0 max-w-full'>
                      <p className='break-words text-sm font-semibold'>@{proposal.handle}</p>
                      <Badge variant='secondary' className='mt-1 text-xs'>
                        {proposal.platform === 'tiktok' ? 'TikTok' : 'Instagram'}
                      </Badge>
                    </div>
                    <div className='flex items-center gap-1'>
                      <Icons.sparkles className='text-yellow-500 h-3 w-3' />
                      <span className='text-xs font-medium'>{formatProposalScore(proposal.score)}</span>
                    </div>
                    <Badge variant='secondary' className='text-xs'>
                      {proposal.channel}
                    </Badge>
                    <Badge
                      className={`text-xs ${statusConfig[proposal.status]?.className || ''}`}
                      variant='outline'
                    >
                      {statusConfig[proposal.status]?.label || proposal.status}
                    </Badge>
                  </div>

                  {/* Center: proposal text */}
                  <div className='min-w-0 flex-1'>
                    {proposal.editing ? (
                      <div className='flex min-w-0 flex-col gap-2'>
                        <Textarea
                          aria-label={`Edit proposal message for ${proposalActionLabel}`}
                          value={editTexts[proposal.id] ?? proposal.message}
                          onChange={(e) =>
                            setEditTexts((t) => ({ ...t, [proposal.id]: e.target.value }))
                          }
                          rows={12}
                          className='min-w-0 text-sm'
                        />
                        <div className='grid min-w-0 grid-cols-2 gap-2 sm:flex'>
                          <Button size='sm' className='min-h-11 min-w-0' onClick={() => saveEdit(proposal.id)}>
                            Save
                          </Button>
                          <Button
                            size='sm'
                            variant='outline'
                            className='min-h-11 min-w-0'
                            onClick={() => toggleEdit(proposal.id, proposal.message)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className='whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground'>
                        {proposal.message}
                      </p>
                    )}
                  </div>

                  {/* Right: action buttons */}
                  <div className='grid min-w-0 shrink-0 grid-cols-3 gap-2 md:flex md:w-28 md:flex-col md:items-stretch'>
                    <Button
                      size='sm'
                      className='min-h-11 min-w-0 bg-green-600 px-2 text-white hover:bg-green-700'
                      disabled={proposal.status === 'approved'}
                      aria-label={`Approve proposal for ${proposalActionLabel}`}
                      onClick={() => requestStatusUpdate(proposal, 'approved')}
                    >
                      <Icons.check className='h-3 w-3 shrink-0 sm:mr-1' />
                      <span className='truncate'>Approve</span>
                    </Button>
                    <Button
                      size='sm'
                      variant='outline'
                      className='min-h-11 min-w-0 px-2'
                      disabled={proposal.editing}
                      aria-label={`Edit proposal message for ${proposalActionLabel}`}
                      onClick={() => toggleEdit(proposal.id, proposal.message)}
                    >
                      <Icons.edit className='h-3 w-3 shrink-0 sm:mr-1' />
                      <span className='truncate'>Edit</span>
                    </Button>
                    <Button
                      size='sm'
                      variant='outline'
                      className='min-h-11 min-w-0 border-red-300 px-2 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/30'
                      disabled={proposal.status === 'rejected'}
                      aria-label={`Reject proposal for ${proposalActionLabel}`}
                      onClick={() => requestStatusUpdate(proposal, 'rejected')}
                    >
                      <Icons.close className='h-3 w-3 shrink-0 sm:mr-1' />
                      <span className='truncate'>Reject</span>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Bulk actions */}
      <Card className='min-w-0 overflow-hidden'>
        <CardContent className='flex min-w-0 flex-col gap-3 pt-6 sm:flex-row sm:flex-wrap sm:items-center'>
          <span className='text-sm font-medium text-muted-foreground'>Bulk Actions:</span>
          <Button
            variant='outline'
            size='sm'
            className='min-h-11 w-full min-w-0 sm:w-auto'
            disabled={pendingCount === 0 || bulkAction !== null}
            onClick={requestApproveAllPending}
          >
            {bulkAction === 'approving' ? <Icons.spinner className='mr-2 h-4 w-4 animate-spin' /> : <Icons.checks className='mr-2 h-4 w-4' />}
            <span className='truncate'>{bulkAction === 'approving' ? 'Approving...' : `Approve All Pending (${pendingCount})`}</span>
          </Button>
          <Button
            variant='outline'
            size='sm'
            className='min-h-11 w-full min-w-0 sm:w-auto'
            disabled={approvedCount === 0 || bulkAction !== null}
            onClick={previewSendApproved}
          >
            {bulkAction === 'previewing-send' ? <Icons.spinner className='mr-2 h-4 w-4 animate-spin' /> : <Icons.send className='mr-2 h-4 w-4' />}
            <span className='truncate'>{bulkAction === 'previewing-send' ? 'Previewing...' : `Preview Send (${approvedCount})`}</span>
          </Button>
          <Button
            size='sm'
            className='min-h-11 w-full min-w-0 sm:w-auto'
            disabled={approvedCount === 0 || bulkAction !== null}
            onClick={requestSendApproved}
          >
            {bulkAction === 'sending' ? <Icons.spinner className='mr-2 h-4 w-4 animate-spin' /> : <Icons.send className='mr-2 h-4 w-4' />}
            <span className='truncate'>{bulkAction === 'sending' ? 'Sending...' : `Send Approved (${approvedCount})`}</span>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
