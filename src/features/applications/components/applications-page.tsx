'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Icons } from '@/components/icons';
import { useEffectiveBrandId } from '@/hooks/use-effective-brand';
import { cn } from '@/lib/utils';
import { withLocalQaMarker } from '@/lib/whitelabel-api';
import { toast } from 'sonner';

type ApplicationStatus = 'pending' | 'approved' | 'rejected';

type CreatorApplication = {
  id: string;
  brand_id: string;
  name: string;
  email?: string;
  instagram_handle?: string;
  tiktok_handle?: string;
  follower_count?: number;
  niche?: string;
  location?: string;
  content_examples?: string[];
  why_interested?: string;
  status: ApplicationStatus;
  creator_id?: string;
  created_at?: string;
  reviewed_at?: string;
};

function formatNumber(value?: number) {
  if (!value) return 'No follower count';
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M followers`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K followers`;
  return `${value.toLocaleString()} followers`;
}

function formatDate(value?: string) {
  if (!value) return 'Recently';
  return new Date(value).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

function statusClass(status: ApplicationStatus) {
  if (status === 'approved') return 'border-green-200 bg-green-100 text-green-700 dark:border-green-900/60 dark:bg-green-950/50 dark:text-green-300';
  if (status === 'rejected') return 'border-red-200 bg-red-100 text-red-700 dark:border-red-900/60 dark:bg-red-950/50 dark:text-red-300';
  return 'border-amber-200 bg-amber-100 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/50 dark:text-amber-300';
}

function primaryHandle(application: CreatorApplication) {
  const handle = application.instagram_handle || application.tiktok_handle;
  return handle ? `@${handle.replace(/^@/, '')}` : 'No handle';
}

function applicationDisplayName(application: CreatorApplication) {
  const name = application.name?.trim();
  if (name && name.length <= 40) return name;
  if (name) return `${name.slice(0, 37)}...`;

  const handle = primaryHandle(application);
  if (handle !== 'No handle') return handle;
  if (application.email?.trim()) return application.email.trim();
  return `Application ${application.id.slice(0, 8)}`;
}

export function ApplicationsPage() {
  const activeBrandId = useEffectiveBrandId();
  const [applications, setApplications] = useState<CreatorApplication[]>([]);
  const [allApplications, setAllApplications] = useState<CreatorApplication[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | ApplicationStatus>('pending');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [pendingReview, setPendingReview] = useState<{
    application: CreatorApplication;
    action: 'approve' | 'reject';
  } | null>(null);

  const counts = useMemo(() => ({
    pending: allApplications.filter((application) => application.status === 'pending').length,
    approved: allApplications.filter((application) => application.status === 'approved').length,
    rejected: allApplications.filter((application) => application.status === 'rejected').length
  }), [allApplications]);

  const loadApplications = useCallback(async () => {
    if (!activeBrandId) {
      setApplications([]);
      setAllApplications([]);
      setLoadError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const allParams = new URLSearchParams({ brand_id: activeBrandId });
      const viewParams = new URLSearchParams({ brand_id: activeBrandId });
      if (statusFilter !== 'all') viewParams.set('status', statusFilter);

      const allResponse = await fetch(withLocalQaMarker(`/api/proxy/api/applications?${allParams.toString()}`));
      const allPayload = await allResponse.json().catch(() => []);

      if (!allResponse.ok) {
        throw new Error(allPayload.detail || allPayload.error || 'Could not load application totals');
      }

      let viewPayload = allPayload;
      if (statusFilter !== 'all') {
        const viewResponse = await fetch(withLocalQaMarker(`/api/proxy/api/applications?${viewParams.toString()}`));
        viewPayload = await viewResponse.json().catch(() => []);
        if (!viewResponse.ok) {
          throw new Error(viewPayload.detail || viewPayload.error || 'Could not load applications');
        }
      }
      setAllApplications(Array.isArray(allPayload) ? allPayload : []);
      setApplications(Array.isArray(viewPayload) ? viewPayload : []);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not load applications';
      toast.error(message);
      setLoadError(message);
      setApplications([]);
      setAllApplications([]);
    } finally {
      setLoading(false);
    }
  }, [activeBrandId, statusFilter]);

  useEffect(() => {
    void loadApplications();
  }, [loadApplications]);

  const publicApplicationPath = activeBrandId ? `/apply/${encodeURIComponent(activeBrandId)}` : '';

  async function copyPublicApplicationLink() {
    if (!publicApplicationPath) {
      toast.error('Select a client brand before sharing the application form.');
      return;
    }
    const url = `${window.location.origin}${publicApplicationPath}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Application link copied.');
    } catch {
      toast.error('Could not copy the link.');
    }
  }

  function openPublicApplicationForm() {
    if (!publicApplicationPath) {
      toast.error('Select a client brand before opening the application form.');
      return;
    }
    window.open(publicApplicationPath, '_blank', 'noopener,noreferrer');
  }

  async function reviewApplication(application: CreatorApplication, action: 'approve' | 'reject', dryRun = false) {
    if (!activeBrandId) {
      toast.error('Select a client brand before reviewing applications.');
      return;
    }
    const actionId = `${application.id}:${action}`;
    if (dryRun) {
      setPreviewId(actionId);
    } else {
      setBusyId(actionId);
    }
    try {
      const response = await fetch(withLocalQaMarker(`/api/proxy/api/applications/${application.id}/${action}?brand_id=${encodeURIComponent(activeBrandId)}`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brand_id: activeBrandId, dry_run: dryRun })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.detail || payload.error || `Could not ${action} application`);
      }
      if (dryRun) {
        const displayName = applicationDisplayName(application);
        if (action === 'approve') {
          const preview = payload.creator_preview || {};
          toast.success(`Dry run ready: would approve ${displayName} as @${preview.handle || primaryHandle(application).replace(/^@/, '')}.`);
        } else {
          toast.success(`Dry run ready: would reject ${displayName}.`);
        }
        return;
      }
      const displayName = applicationDisplayName(application);
      toast.success(action === 'approve' ? `${displayName} was approved and added to creators.` : `${displayName} was rejected.`);
      await loadApplications();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Could not ${action} application`);
    } finally {
      if (dryRun) {
        setPreviewId(null);
      } else {
        setBusyId(null);
      }
    }
  }

  function requestLiveReview(application: CreatorApplication, action: 'approve' | 'reject') {
    if (application.status !== 'pending' || previewId?.startsWith(`${application.id}:`) || busyId?.startsWith(`${application.id}:`)) return;
    setPendingReview({ application, action });
  }

  async function confirmLiveReview() {
    if (!pendingReview) return;
    const { application, action } = pendingReview;
    setPendingReview(null);
    await reviewApplication(application, action);
  }

  const pendingReviewCopy = pendingReview
    ? {
        title: pendingReview.action === 'approve' ? 'Approve creator application?' : 'Reject creator application?',
        description:
          pendingReview.action === 'approve'
            ? `${applicationDisplayName(pendingReview.application)} will be added to the creator CRM for ${primaryHandle(pendingReview.application)}. Run a dry-run first if you want to preview the creator record.`
            : `${applicationDisplayName(pendingReview.application)} will be marked rejected and removed from the pending review queue. This keeps the application record for audit history.`,
        actionLabel: pendingReview.action === 'approve' ? 'Approve application' : 'Reject application'
      }
    : null;

  return (
    <div className='space-y-6'>
      <AlertDialog open={Boolean(pendingReview)} onOpenChange={(open) => !open && setPendingReview(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{pendingReviewCopy?.title}</AlertDialogTitle>
            <AlertDialogDescription>{pendingReviewCopy?.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className='min-h-11'>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className='min-h-11'
              aria-label={`Confirm ${pendingReviewCopy?.actionLabel || 'application review'}`}
              onClick={() => void confirmLiveReview()}
            >
              {pendingReviewCopy?.actionLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className='grid gap-3 sm:grid-cols-3'>
        <Card>
          <CardContent className='p-4'>
            <p className='text-xs font-medium text-muted-foreground'>Pending review</p>
            <p className='mt-2 text-2xl font-bold'>{counts.pending.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className='p-4'>
            <p className='text-xs font-medium text-muted-foreground'>Approved</p>
            <p className='mt-2 text-2xl font-bold'>{counts.approved.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className='p-4'>
            <p className='text-xs font-medium text-muted-foreground'>Rejected</p>
            <p className='mt-2 text-2xl font-bold'>{counts.rejected.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className='gap-4 sm:flex-row sm:items-start sm:justify-between'>
          <div>
            <CardTitle>Creator applications</CardTitle>
            <CardDescription>Review inbound creators, approve strong fits into the creator CRM, or reject mismatched applicants.</CardDescription>
          </div>
          <div className='flex flex-wrap gap-2'>
            <Button
              aria-label='Copy public creator application form link'
              variant='outline'
              className='min-h-11 gap-2'
              onClick={copyPublicApplicationLink}
              disabled={!activeBrandId}
            >
              <Icons.clipboard className='size-4' />
              Copy Form Link
            </Button>
            <Button
              aria-label='Open public creator application form'
              variant='outline'
              className='min-h-11 gap-2'
              onClick={openPublicApplicationForm}
              disabled={!activeBrandId}
            >
              <Icons.externalLink className='size-4' />
              Open Form
            </Button>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}>
              <SelectTrigger className='min-h-11 w-[160px]' aria-label='Filter creator applications by status'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='pending'>Pending</SelectItem>
                <SelectItem value='approved'>Approved</SelectItem>
                <SelectItem value='rejected'>Rejected</SelectItem>
                <SelectItem value='all'>All</SelectItem>
              </SelectContent>
            </Select>
            <Button aria-label='Refresh creator applications' variant='outline' className='min-h-11 gap-2' onClick={loadApplications} disabled={loading}>
              <Icons.refresh className={cn('size-4', loading && 'animate-spin')} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loadError ? (
            <Alert variant='destructive'>
              <Icons.alertCircle className='size-4' />
              <AlertTitle>Applications unavailable</AlertTitle>
              <AlertDescription className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
                <span className='min-w-0 break-words'>{loadError}</span>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  className='min-h-11 shrink-0'
                  aria-label='Retry creator applications load'
                  onClick={() => void loadApplications()}
                >
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          ) : loading ? (
            <div className='flex items-center gap-2 rounded-lg border border-dashed p-6 text-sm text-muted-foreground'>
              <Icons.spinner className='size-4 animate-spin' />
              Loading applications...
            </div>
          ) : applications.length === 0 ? (
            <div className='rounded-lg border border-dashed p-8 text-center'>
              <Icons.user className='mx-auto mb-3 size-8 text-muted-foreground' />
              <h3 className='text-sm font-semibold'>No applications in this view</h3>
              <p className='mt-1 text-sm text-muted-foreground'>New creator applications will appear here once submitted.</p>
            </div>
          ) : (
            <div className='space-y-3'>
              {applications.map((application) => {
                const reviewInFlight = Boolean(previewId?.startsWith(`${application.id}:`) || busyId?.startsWith(`${application.id}:`));
                const canReview = application.status === 'pending' && !reviewInFlight;
                const displayName = applicationDisplayName(application);
                const applicationActionLabel = `${displayName} application ${application.id.slice(0, 8)}`;
                return (
                <div key={application.id} className='min-w-0 rounded-lg border p-4'>
                  <div className='flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'>
                    <div className='min-w-0 flex-1'>
                      <div className='flex min-w-0 flex-wrap items-center gap-2'>
                        <h3 className='min-w-0 max-w-full break-words text-base font-semibold'>{displayName}</h3>
                        <Badge variant='outline' className={statusClass(application.status)}>{application.status}</Badge>
                      </div>
                      <div className='mt-2 flex min-w-0 flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground'>
                        <span className='min-w-0 max-w-full break-words'>{primaryHandle(application)}</span>
                        <span className='min-w-0 max-w-full break-words'>{formatNumber(application.follower_count)}</span>
                        {application.niche && <span className='min-w-0 max-w-full break-words'>{application.niche}</span>}
                        {application.location && <span className='min-w-0 max-w-full break-words'>{application.location}</span>}
                        <span className='min-w-0 max-w-full break-words'>Applied {formatDate(application.created_at)}</span>
                      </div>
                      {application.email && <p className='mt-2 max-w-full break-words text-sm'>{application.email}</p>}
                      {application.why_interested && (
                        <p className='mt-3 max-w-3xl break-words text-sm leading-6 text-muted-foreground'>{application.why_interested}</p>
                      )}
                      {application.content_examples?.length ? (
                        <div className='mt-3 flex flex-wrap gap-2'>
                          {application.content_examples.map((example) => (
                            <Badge key={example} variant='secondary' className='max-w-full truncate font-mono text-[11px]'>
                              {example}
                            </Badge>
                          ))}
                        </div>
                      ) : null}
                    </div>
                    <div className='flex w-full min-w-0 flex-wrap gap-2 lg:w-auto lg:shrink-0 lg:justify-end'>
                      <Button
                        size='sm'
                        variant='outline'
                        className='min-h-11 min-w-[8.5rem] flex-1 gap-2 sm:flex-none'
                        aria-label={`Dry run approve application for ${applicationActionLabel}`}
                        disabled={!canReview}
                        onClick={() => void reviewApplication(application, 'approve', true)}
                      >
                        {previewId === `${application.id}:approve` ? <Icons.spinner className='size-3.5 animate-spin' /> : <Icons.checks className='size-3.5' />}
                        Dry Run Approve
                      </Button>
                      <Button
                        size='sm'
                        className='min-h-11 min-w-[6.5rem] flex-1 gap-2 sm:flex-none'
                        aria-label={`Approve application for ${applicationActionLabel}`}
                        disabled={!canReview}
                        onClick={() => requestLiveReview(application, 'approve')}
                      >
                        {busyId === `${application.id}:approve` ? <Icons.spinner className='size-3.5 animate-spin' /> : <Icons.check className='size-3.5' />}
                        Approve
                      </Button>
                      <Button
                        size='sm'
                        variant='outline'
                        className='min-h-11 min-w-[8rem] flex-1 gap-2 sm:flex-none'
                        aria-label={`Dry run reject application for ${applicationActionLabel}`}
                        disabled={!canReview}
                        onClick={() => void reviewApplication(application, 'reject', true)}
                      >
                        {previewId === `${application.id}:reject` ? <Icons.spinner className='size-3.5 animate-spin' /> : <Icons.checks className='size-3.5' />}
                        Dry Run Reject
                      </Button>
                      <Button
                        size='sm'
                        variant='outline'
                        className='min-h-11 min-w-[6.5rem] flex-1 gap-2 border-red-300 text-red-600 hover:bg-red-50 sm:flex-none dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/30'
                        aria-label={`Reject application for ${applicationActionLabel}`}
                        disabled={!canReview}
                        onClick={() => requestLiveReview(application, 'reject')}
                      >
                        <Icons.close className='size-3.5' />
                        Reject
                      </Button>
                    </div>
                  </div>
                </div>
              );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
