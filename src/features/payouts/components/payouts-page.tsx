'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Icons } from '@/components/icons';
import { useBrandStore } from '@/components/org-switcher';
import { useEffectiveBrandId } from '@/hooks/use-effective-brand';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import { withLocalQaMarker } from '@/lib/whitelabel-api';
import { toast } from 'sonner';

const API_BASE = '/api/proxy';

type ViewProgram = {
  enabled: boolean;
  rate_per_1k_usd: number;
  store_credit_multiplier: number;
  points_multiplier: number;
  points_per_usd: number;
  min_payout_usd: number;
  organic_post_cap_usd: number;
  manual_review_usd: number;
  require_disclosure: boolean;
};

type PayoutStatus = 'pending' | 'approved' | 'held' | 'paid' | 'failed' | 'rejected';

type Payout = {
  id: string;
  brand_id: string;
  creator_id?: string | null;
  snapshot_id?: string | null;
  source: string;
  views_counted?: number | null;
  bounty_usd?: number | null;
  method?: string | null;
  multiplier?: number | null;
  payout_amount?: number | null;
  points_amount?: number | null;
  status: PayoutStatus | string;
  hold_reason?: string | null;
  external_provider?: string | null;
  external_ref?: string | null;
  error?: string | null;
  approved_by?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  paid_at?: string | null;
};

type PayoutsResponse = {
  payouts: Payout[];
};

type PayoutProviderReadiness = {
  live_settlement_ready?: boolean;
  cash_configured?: boolean;
  points_configured?: boolean;
  held_review_notifications_configured?: boolean;
};

type ActionState = 'idle' | 'saving' | 'accruing' | 'dry-running' | 'settling' | string;
type PayoutConfirmationAction = 'save' | 'accrue' | 'settle' | null;
type PayoutReviewConfirmation = {
  payout: Payout;
  decision: 'approve' | 'reject';
} | null;

const DEFAULT_PROGRAM: ViewProgram = {
  enabled: false,
  rate_per_1k_usd: 2,
  store_credit_multiplier: 1.5,
  points_multiplier: 2,
  points_per_usd: 100,
  min_payout_usd: 25,
  organic_post_cap_usd: 100,
  manual_review_usd: 150,
  require_disclosure: true
};

const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2
});

const wholeNumber = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

async function readApiError(response: Response, fallback: string) {
  try {
    const payload = await response.json();
    const detail = payload?.detail || payload?.error;
    if (typeof detail === 'string' && detail.trim()) return detail;
  } catch {}
  return fallback;
}

function normalizeProgram(data: Partial<ViewProgram> | null | undefined): ViewProgram {
  return {
    enabled: Boolean(data?.enabled),
    rate_per_1k_usd: Number(data?.rate_per_1k_usd ?? DEFAULT_PROGRAM.rate_per_1k_usd),
    store_credit_multiplier: Number(data?.store_credit_multiplier ?? DEFAULT_PROGRAM.store_credit_multiplier),
    points_multiplier: Number(data?.points_multiplier ?? DEFAULT_PROGRAM.points_multiplier),
    points_per_usd: Number(data?.points_per_usd ?? DEFAULT_PROGRAM.points_per_usd),
    min_payout_usd: Number(data?.min_payout_usd ?? DEFAULT_PROGRAM.min_payout_usd),
    organic_post_cap_usd: Number(data?.organic_post_cap_usd ?? DEFAULT_PROGRAM.organic_post_cap_usd),
    manual_review_usd: Number(data?.manual_review_usd ?? DEFAULT_PROGRAM.manual_review_usd),
    require_disclosure: data?.require_disclosure ?? DEFAULT_PROGRAM.require_disclosure
  };
}

function statusBadge(status: string) {
  const normalized = status.toLowerCase();
  if (normalized === 'paid') return 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20';
  if (normalized === 'held') return 'bg-amber-500/10 text-amber-700 border-amber-500/20';
  if (normalized === 'failed' || normalized === 'rejected') return 'bg-destructive/10 text-destructive border-destructive/20';
  if (normalized === 'approved') return 'bg-blue-500/10 text-blue-700 border-blue-500/20';
  return 'bg-muted text-muted-foreground';
}

function fieldValue(program: ViewProgram, key: keyof ViewProgram) {
  return String(program[key]);
}

function getProgramValidationError(program: ViewProgram) {
  const numericFields: Array<[keyof ViewProgram, string]> = [
    ['rate_per_1k_usd', 'Rate per 1K views'],
    ['min_payout_usd', 'Minimum payout'],
    ['organic_post_cap_usd', 'Organic post cap'],
    ['manual_review_usd', 'Manual review threshold'],
    ['store_credit_multiplier', 'Store credit multiplier'],
    ['points_multiplier', 'Points multiplier'],
    ['points_per_usd', 'Points per dollar']
  ];

  for (const [key, label] of numericFields) {
    const value = Number(program[key]);
    if (!Number.isFinite(value) || value < 0) return `${label} must be zero or higher.`;
  }
  if (program.min_payout_usd <= 0) return 'Minimum payout must be greater than zero.';
  if (program.points_per_usd <= 0) return 'Points per dollar must be greater than zero.';
  return null;
}

export default function PayoutsPage() {
  const activeBrandId = useEffectiveBrandId();
  const brandLoading = useBrandStore((s) => s.loading);
  const [program, setProgram] = useState<ViewProgram>(DEFAULT_PROGRAM);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [source, setSource] = useState('both');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionState, setActionState] = useState<ActionState>('idle');
  const [payoutProviders, setPayoutProviders] = useState<PayoutProviderReadiness | null>(null);
  const [pendingConfirmation, setPendingConfirmation] = useState<PayoutConfirmationAction>(null);
  const [pendingPayoutReview, setPendingPayoutReview] = useState<PayoutReviewConfirmation>(null);
  const actionBusy = actionState !== 'idle';

  const filteredPayouts = useMemo(() => {
    if (statusFilter === 'all') return payouts;
    return payouts.filter((payout) => payout.status === statusFilter);
  }, [payouts, statusFilter]);

  const totals = useMemo(() => {
    return payouts.reduce(
      (acc, payout) => {
        const bounty = Number(payout.bounty_usd || 0);
        const payoutAmount = Number(payout.payout_amount || 0);
        acc.bounty += bounty;
        acc.payouts += payoutAmount || bounty;
        if (payout.status === 'held') acc.held += 1;
        if (payout.status === 'pending' || payout.status === 'approved') acc.ready += 1;
        return acc;
      },
      { bounty: 0, payouts: 0, held: 0, ready: 0 }
    );
  }, [payouts]);

  const providerBlockingReasons = useMemo(() => {
    const readyRows = payouts.filter((payout) => payout.status === 'pending' || payout.status === 'approved');
    const methods = new Set(readyRows.map((payout) => payout.method).filter(Boolean));
    const reasons: string[] = [];
    if (methods.has('cash') && payoutProviders?.cash_configured === false) {
      reasons.push('cash payouts need Tremendous API, funding source, and campaign IDs');
    }
    if (methods.has('points') && payoutProviders?.points_configured === false) {
      reasons.push('points payouts need Smile.io API credentials');
    }
    return reasons;
  }, [payoutProviders, payouts]);

  const liveSettlementBlocked = providerBlockingReasons.length > 0;
  const programValidationError = useMemo(() => getProgramValidationError(program), [program]);

  const loadData = useCallback(async () => {
    if (!activeBrandId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [programResponse, payoutsResponse] = await Promise.all([
        fetch(withLocalQaMarker(`${API_BASE}/api/brands/${encodeURIComponent(activeBrandId)}/view-program`)),
        fetch(withLocalQaMarker(`${API_BASE}/api/brands/${encodeURIComponent(activeBrandId)}/payouts?limit=100`))
      ]);

      if (!programResponse.ok) {
        throw new Error(await readApiError(programResponse, 'View program settings are unavailable.'));
      }
      if (!payoutsResponse.ok) {
        throw new Error(await readApiError(payoutsResponse, 'Payout ledger is unavailable.'));
      }

      const programPayload = await programResponse.json();
      const payoutsPayload = (await payoutsResponse.json()) as PayoutsResponse;
      setProgram(normalizeProgram(programPayload));
      setPayouts(Array.isArray(payoutsPayload.payouts) ? payoutsPayload.payouts : []);
      fetch(withLocalQaMarker(`${API_BASE}/api/readiness`))
        .then((response) => response.ok ? response.json() : null)
        .then((payload) => {
          const providers = payload?.checks?.payout_providers;
          setPayoutProviders(providers && typeof providers === 'object' ? providers : null);
        })
        .catch(() => setPayoutProviders(null));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'CreatorOS could not load payouts.');
    } finally {
      setLoading(false);
    }
  }, [activeBrandId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  function updateNumber(key: keyof ViewProgram, value: string) {
    const parsed = Number(value);
    setProgram((current) => ({
      ...current,
      [key]: Number.isFinite(parsed) ? parsed : 0
    }));
  }

  function requestSaveProgram() {
    if (!activeBrandId) {
      toast.error('Select a client brand before saving payout settings.');
      return;
    }
    const validationError = programValidationError;
    if (validationError) {
      toast.error(validationError);
      return;
    }
    if (actionBusy) return;
    setPendingConfirmation('save');
  }

  async function saveProgram() {
    if (!activeBrandId) return;
    const validationError = programValidationError;
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setActionState('saving');
    try {
      const response = await fetch(withLocalQaMarker(`${API_BASE}/api/brands/${encodeURIComponent(activeBrandId)}/view-program`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(program)
      });
      if (!response.ok) throw new Error(await readApiError(response, 'Payout settings could not be saved.'));
      const payload = await response.json();
      setProgram(normalizeProgram(payload));
      toast.success('View payout program saved.');
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : 'Payout settings could not be saved.');
    } finally {
      setActionState('idle');
    }
  }

  function requestAccrueViews() {
    if (!activeBrandId) {
      toast.error('Select a client brand before accruing views.');
      return;
    }
    if (actionBusy) return;
    setPendingConfirmation('accrue');
  }

  async function confirmAccrueViews() {
    if (actionBusy) return;
    setActionState('accruing');
    try {
      const response = await fetch(
        withLocalQaMarker(`${API_BASE}/api/brands/${encodeURIComponent(activeBrandId)}/views/accrue?source=${encodeURIComponent(source)}`),
        { method: 'POST' }
      );
      if (!response.ok) throw new Error(await readApiError(response, 'CreatorOS could not accrue views.'));
      const payload = await response.json();
      const createdRows = Number(payload.created ?? payload.payouts_created ?? 0);
      const sourceRows = Number(payload.whitelisted ?? 0) + Number(payload.organic ?? 0);
      toast.success(`Accrual finished: ${createdRows || sourceRows} payout row(s) created.`);
      await loadData();
    } catch (accrueError) {
      toast.error(accrueError instanceof Error ? accrueError.message : 'CreatorOS could not accrue views.');
    } finally {
      setPendingConfirmation(null);
      setActionState('idle');
    }
  }

  function requestSettlePayouts() {
    if (!activeBrandId) {
      toast.error('Select a client brand before settling payouts.');
      return;
    }
    if (actionBusy) return;
    if (liveSettlementBlocked) {
      toast.error(`Live settlement is not ready: ${providerBlockingReasons.join('; ')}.`);
      return;
    }
    setPendingConfirmation('settle');
  }

  async function confirmSettlePayouts() {
    if (actionBusy) return;
    setActionState('settling');
    try {
      const response = await fetch(withLocalQaMarker(`${API_BASE}/api/brands/${encodeURIComponent(activeBrandId)}/payouts/settle`), {
        method: 'POST'
      });
      if (!response.ok) throw new Error(await readApiError(response, 'CreatorOS could not settle payouts.'));
      const payload = await response.json();
      const paid = Number(payload.paid || 0);
      const held = Number(payload.held || 0);
      const pending = Number(payload.pending || 0);
      const failed = Number(payload.failed || 0);
      const summary = `${paid} paid, ${held} held, ${pending} pending, ${failed} failed.`;
      if (failed > 0) {
        toast.error(`Settlement needs attention: ${summary}`);
      } else {
        toast.success(`Settlement finished: ${summary}`);
      }
      await loadData();
    } catch (settleError) {
      toast.error(settleError instanceof Error ? settleError.message : 'CreatorOS could not settle payouts.');
    } finally {
      setPendingConfirmation(null);
      setActionState('idle');
    }
  }

  async function dryRunSettlement() {
    if (!activeBrandId) {
      toast.error('Select a client brand before previewing settlement.');
      return;
    }
    if (actionBusy) return;

    setActionState('dry-running');
    try {
      const response = await fetch(withLocalQaMarker(`${API_BASE}/api/brands/${encodeURIComponent(activeBrandId)}/payouts/settle?dry_run=true`), {
        method: 'POST'
      });
      if (!response.ok) throw new Error(await readApiError(response, 'CreatorOS could not preview settlement.'));
      const payload = await response.json();
      const plans = Array.isArray(payload.plans) ? payload.plans : [];
      const wouldPay = plans.filter((plan: { status?: string }) => plan.status === 'would_pay').length;
      const held = plans.filter((plan: { status?: string }) => plan.status === 'held').length;
      const pending = plans.filter((plan: { status?: string }) => plan.status === 'pending').length;
      const failed = plans.filter((plan: { status?: string }) => plan.status === 'would_fail').length;
      toast.success(`Dry run: ${wouldPay} would pay, ${held} held, ${pending} pending, ${failed} blocked.`);
    } catch (settleError) {
      toast.error(settleError instanceof Error ? settleError.message : 'CreatorOS could not preview settlement.');
    } finally {
      setActionState('idle');
    }
  }

  async function reviewPayout(payoutId: string, decision: 'approve' | 'reject') {
    if (!activeBrandId || actionBusy) return;
    setActionState(`${decision}:${payoutId}`);
    try {
      const response = await fetch(
        withLocalQaMarker(`${API_BASE}/api/brands/${encodeURIComponent(activeBrandId)}/payouts/${encodeURIComponent(payoutId)}/${decision}`),
        { method: 'POST' }
      );
      if (!response.ok) throw new Error(await readApiError(response, `Payout could not be ${decision}d.`));
      toast.success(`Payout ${decision}d.`);
      await loadData();
    } catch (reviewError) {
      toast.error(reviewError instanceof Error ? reviewError.message : `Payout could not be ${decision}d.`);
    } finally {
      setActionState('idle');
    }
  }

  function requestPayoutReview(payout: Payout, decision: 'approve' | 'reject') {
    if (actionBusy || payout.status !== 'held') return;
    setPendingPayoutReview({ payout, decision });
  }

  async function confirmPayoutReview() {
    if (!pendingPayoutReview || actionBusy) return;
    const { payout, decision } = pendingPayoutReview;
    setPendingPayoutReview(null);
    await reviewPayout(payout.id, decision);
  }

  if (!activeBrandId && brandLoading) {
    return (
      <div className='space-y-4' aria-label='Loading payout workspace'>
        <div className='grid gap-3 md:grid-cols-4'>
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className='h-28 animate-pulse rounded-lg bg-muted' />
          ))}
        </div>
        <div className='h-96 animate-pulse rounded-lg bg-muted' />
      </div>
    );
  }

  if (!activeBrandId) {
    return (
      <Alert>
        <Icons.info className='size-4' />
        <AlertTitle>Select a workspace</AlertTitle>
        <AlertDescription>
          <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
            <span>Choose a client brand before managing affiliate view payouts.</span>
            <Button asChild variant='outline' className='min-h-11 w-full gap-2 sm:w-fit'>
              <Link aria-label='Open workspaces to select a payout brand' href='/dashboard/workspaces'>
                <Icons.workspace className='size-4' />
                Open workspaces
              </Link>
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  if (loading) {
    return (
      <div className='space-y-4' aria-label='Loading payout settings and ledger'>
        <div className='grid gap-3 md:grid-cols-4'>
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className='h-28 animate-pulse rounded-lg bg-muted' />
          ))}
        </div>
        <div className='h-96 animate-pulse rounded-lg bg-muted' />
      </div>
    );
  }

  const confirmationCopy = pendingConfirmation === 'save'
    ? {
        title: 'Save payout program settings?',
        description: 'CreatorOS will update the view payout economics used for new creator payout calculations in this workspace.',
        action: 'Save payout settings',
        onConfirm: saveProgram
      }
    : pendingConfirmation === 'settle'
      ? {
          title: 'Settle ready payouts?',
          description: 'CreatorOS will attempt to settle pending and approved payout rows using the connected payout providers.',
          action: 'Settle payouts',
          onConfirm: confirmSettlePayouts
        }
      : {
        title: 'Accrue creator views?',
        description: 'CreatorOS will calculate view earnings for this workspace and may create new payout ledger rows.',
        action: 'Accrue views',
        onConfirm: confirmAccrueViews
      };

  const pendingPayoutReviewCopy = pendingPayoutReview
    ? {
        title: pendingPayoutReview.decision === 'approve' ? 'Approve held payout?' : 'Reject held payout?',
        description:
          pendingPayoutReview.decision === 'approve'
            ? `This will release the held payout for creator ${pendingPayoutReview.payout.creator_id?.slice(0, 8) || 'unassigned'} into the approved queue.`
            : `This will reject the held payout for creator ${pendingPayoutReview.payout.creator_id?.slice(0, 8) || 'unassigned'} and keep the ledger row for audit history.`,
        action: pendingPayoutReview.decision === 'approve' ? 'Approve payout' : 'Reject payout'
      }
    : null;

  return (
    <div className='space-y-6'>
      <AlertDialog open={Boolean(pendingConfirmation)} onOpenChange={(open) => !open && setPendingConfirmation(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmationCopy.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirmationCopy.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className='min-h-11'>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className='min-h-11'
              aria-label={`Confirm ${confirmationCopy.action.toLowerCase()}`}
              disabled={actionBusy}
              onClick={() => void confirmationCopy.onConfirm()}
            >
              {confirmationCopy.action}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={Boolean(pendingPayoutReview)} onOpenChange={(open) => !open && setPendingPayoutReview(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{pendingPayoutReviewCopy?.title}</AlertDialogTitle>
            <AlertDialogDescription>{pendingPayoutReviewCopy?.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className='min-h-11'>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className='min-h-11'
              aria-label={`Confirm ${pendingPayoutReviewCopy?.action.toLowerCase() || 'payout review'}`}
              disabled={actionBusy}
              onClick={() => void confirmPayoutReview()}
            >
              {pendingPayoutReviewCopy?.action}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {error && (
        <Alert variant='destructive'>
          <Icons.warning className='size-4' />
          <AlertTitle>Payouts unavailable</AlertTitle>
          <AlertDescription className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
            <span className='min-w-0 break-words'>{error}</span>
            <Button
              type='button'
              variant='outline'
              size='sm'
              className='min-h-11 w-full shrink-0 sm:w-auto'
              aria-label='Retry payout settings and ledger load'
              onClick={() => void loadData()}
              disabled={loading}
            >
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {!program.enabled && (
        <Alert>
          <Icons.info className='size-4' />
          <AlertTitle>View payouts are paused for this workspace</AlertTitle>
          <AlertDescription>
            Enable the program when this brand is ready to pay creators for organic and whitelisted views.
          </AlertDescription>
        </Alert>
      )}

      {liveSettlementBlocked && (
        <Alert>
          <Icons.info className='size-4' />
          <AlertTitle>Live payout settlement needs provider setup</AlertTitle>
          <AlertDescription>
            {providerBlockingReasons.join('; ')}. Dry Run remains available for routing checks.
          </AlertDescription>
        </Alert>
      )}

      <div className='grid gap-3 md:grid-cols-4'>
        <Card className='rounded-lg'>
          <CardHeader className='pb-2'>
            <CardDescription>Program</CardDescription>
            <CardTitle className='flex items-center gap-2 text-2xl'>
              {program.enabled ? 'Live' : 'Paused'}
              <Badge variant='outline' className={program.enabled ? 'border-emerald-500/20 text-emerald-700' : ''}>
                {program.enabled ? 'Enabled' : 'Disabled'}
              </Badge>
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className='rounded-lg'>
          <CardHeader className='pb-2'>
            <CardDescription>Rate per 1K views</CardDescription>
            <CardTitle className='text-2xl'>{money.format(program.rate_per_1k_usd)}</CardTitle>
          </CardHeader>
        </Card>
        <Card className='rounded-lg'>
          <CardHeader className='pb-2'>
            <CardDescription>Open payout value</CardDescription>
            <CardTitle className='text-2xl'>{money.format(totals.payouts)}</CardTitle>
          </CardHeader>
        </Card>
        <Card className='rounded-lg'>
          <CardHeader className='pb-2'>
            <CardDescription>Needs review</CardDescription>
            <CardTitle className='text-2xl'>{wholeNumber.format(totals.held)}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card className='rounded-lg'>
        <CardHeader>
          <div className='flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between'>
            <div>
              <CardTitle>View Program Settings</CardTitle>
              <CardDescription>Control the economics used when CreatorOS turns tracked views into payouts.</CardDescription>
            </div>
            <div className='flex items-center gap-3'>
              <Label htmlFor='program-enabled'>Enabled</Label>
              <Switch
                id='program-enabled'
                aria-label='Enable view payout program'
                checked={program.enabled}
                onCheckedChange={(checked) => setProgram((current) => ({ ...current, enabled: checked }))}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className='space-y-5'>
          <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
            {[
              ['rate_per_1k_usd', 'Rate per 1K views', '0.01'],
              ['min_payout_usd', 'Minimum payout', '1'],
              ['organic_post_cap_usd', 'Organic post cap', '1'],
              ['manual_review_usd', 'Manual review threshold', '1'],
              ['store_credit_multiplier', 'Store credit multiplier', '0.05'],
              ['points_multiplier', 'Points multiplier', '0.05'],
              ['points_per_usd', 'Points per dollar', '1']
            ].map(([key, label, step]) => (
              <div key={key} className='space-y-2'>
                <Label htmlFor={key}>{label}</Label>
                <Input
                  id={key}
                  aria-label={label}
                  className='min-h-11'
                  type='number'
                  min={key === 'min_payout_usd' ? '1' : '0'}
                  step={step}
                  value={fieldValue(program, key as keyof ViewProgram)}
                  onChange={(event) => updateNumber(key as keyof ViewProgram, event.target.value)}
                />
              </div>
            ))}
            <div className='flex items-center justify-between rounded-lg border px-3 py-2'>
              <Label htmlFor='require-disclosure' className='leading-snug'>Require disclosure</Label>
              <Switch
                id='require-disclosure'
                aria-label='Require creator disclosure'
                checked={program.require_disclosure}
                onCheckedChange={(checked) => setProgram((current) => ({ ...current, require_disclosure: checked }))}
              />
            </div>
          </div>
          <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
            <div className='min-w-0 space-y-1'>
              <p className='text-sm text-muted-foreground'>
                Store credit pays {program.store_credit_multiplier}x. Points pay {program.points_multiplier}x at {program.points_per_usd} points per dollar.
              </p>
              {programValidationError && (
                <p className='break-words text-sm text-destructive'>
                  {programValidationError}
                </p>
              )}
            </div>
            <Button className='min-h-11 w-full sm:w-auto' aria-label='Save payout program settings' onClick={requestSaveProgram} isLoading={actionState === 'saving'} disabled={actionBusy || Boolean(programValidationError)}>
              <Icons.check className='size-4' />
              Save Settings
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className='rounded-lg'>
        <CardHeader>
          <div className='flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between'>
            <div>
              <CardTitle>Payout Ledger</CardTitle>
              <CardDescription>Review held payouts, accrue new view earnings, and settle approved rows.</CardDescription>
            </div>
            <div className='flex min-w-0 flex-col gap-2 sm:grid sm:grid-cols-2 lg:flex lg:flex-row lg:flex-wrap lg:items-center lg:justify-end'>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className='min-h-11 w-full lg:w-36' aria-label='Filter payouts by status'>
                  <SelectValue placeholder='Status' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>All statuses</SelectItem>
                  <SelectItem value='pending'>Pending</SelectItem>
                  <SelectItem value='approved'>Approved</SelectItem>
                  <SelectItem value='held'>Held</SelectItem>
                  <SelectItem value='paid'>Paid</SelectItem>
                  <SelectItem value='failed'>Failed</SelectItem>
                  <SelectItem value='rejected'>Rejected</SelectItem>
                </SelectContent>
              </Select>
              <Select value={source} onValueChange={setSource}>
                <SelectTrigger className='min-h-11 w-full lg:w-36' aria-label='Filter payouts by view source'>
                  <SelectValue placeholder='Source' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='both'>All views</SelectItem>
                  <SelectItem value='whitelisted'>Whitelisted</SelectItem>
                  <SelectItem value='organic'>Organic</SelectItem>
                </SelectContent>
              </Select>
              <Button className='min-h-11 w-full lg:w-auto' aria-label='Refresh payout ledger' variant='outline' onClick={() => void loadData()} disabled={actionBusy}>
                <Icons.refresh className='size-4' />
                Refresh
              </Button>
              <Button
                className='min-h-11 w-full lg:w-auto'
                aria-label='Accrue creator views into payout ledger'
                variant='outline'
                onClick={requestAccrueViews}
                isLoading={actionState === 'accruing'}
                disabled={!program.enabled || actionBusy}
              >
                <Icons.trendingUp className='size-4' />
                Accrue Views
              </Button>
              <Button
                className='min-h-11 w-full lg:w-auto'
                aria-label='Preview payout settlement dry run'
                variant='outline'
                onClick={dryRunSettlement}
                isLoading={actionState === 'dry-running'}
                disabled={totals.ready + totals.held === 0 || actionBusy}
              >
                <Icons.checks className='size-4' />
                Dry Run
              </Button>
              <Button
                className='min-h-11 w-full lg:w-auto'
                aria-label='Settle approved payout rows'
                onClick={requestSettlePayouts}
                isLoading={actionState === 'settling'}
                disabled={totals.ready + totals.held === 0 || liveSettlementBlocked || actionBusy}
              >
                <Icons.creditCard className='size-4' />
                Settle
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredPayouts.length === 0 ? (
            <div className='flex min-h-52 flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center'>
              <Icons.creditCard className='mb-3 size-8 text-muted-foreground' />
              <h3 className='text-base font-semibold'>No payout rows yet</h3>
              <p className='mt-1 max-w-md text-sm text-muted-foreground'>
                Enable the view program, import campaign performance, then accrue views once creators have tracked activity.
              </p>
              <Button asChild variant='outline' className='mt-4 min-h-11'>
                <Link aria-label='Open campaigns to generate payout activity' href='/dashboard/campaigns'>
                  <Icons.trendingUp className='size-4' />
                  Campaigns
                </Link>
              </Button>
            </div>
          ) : (
            <div className='overflow-x-auto'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Creator</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead className='text-right'>Views</TableHead>
                    <TableHead className='text-right'>Bounty</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead className='text-right'>Payout</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className='text-right'>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayouts.map((payout) => {
                    const isHeld = payout.status === 'held';
                    const payoutLabel = payout.method === 'points' && payout.points_amount
                      ? `${wholeNumber.format(payout.points_amount)} pts`
                      : money.format(Number(payout.payout_amount || payout.bounty_usd || 0));
                    return (
                      <TableRow key={payout.id}>
                        <TableCell>
                          <Badge variant='outline' className={cn('capitalize', statusBadge(payout.status))}>
                            {payout.status}
                          </Badge>
                          {payout.hold_reason && (
                            <div className='mt-1 max-w-40 truncate text-xs text-muted-foreground'>{payout.hold_reason}</div>
                          )}
                          {payout.error && (
                            <div className='mt-1 max-w-48 whitespace-normal text-xs text-destructive'>{payout.error}</div>
                          )}
                        </TableCell>
                        <TableCell className='font-mono text-xs'>
                          {payout.creator_id ? payout.creator_id.slice(0, 8) : 'Unassigned'}
                        </TableCell>
                        <TableCell className='capitalize'>{payout.source.replaceAll('_', ' ')}</TableCell>
                        <TableCell className='text-right tabular-nums'>{wholeNumber.format(Number(payout.views_counted || 0))}</TableCell>
                        <TableCell className='text-right tabular-nums'>{money.format(Number(payout.bounty_usd || 0))}</TableCell>
                        <TableCell className='capitalize'>{payout.method || 'Not set'}</TableCell>
                        <TableCell className='text-right tabular-nums'>{payoutLabel}</TableCell>
                        <TableCell>{formatDate(payout.created_at ?? undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</TableCell>
                        <TableCell>
                          <div className='flex justify-end gap-2'>
                            {isHeld ? (
                              <>
                                <Button
                                  aria-label={`Reject held payout ${payout.id}`}
                                  size='sm'
                                  variant='outline'
                                  className='min-h-11'
                                  onClick={() => requestPayoutReview(payout, 'reject')}
                                  isLoading={actionState === `reject:${payout.id}`}
                                  disabled={actionBusy}
                                >
                                  Reject
                                </Button>
                                <Button
                                  aria-label={`Approve held payout ${payout.id}`}
                                  size='sm'
                                  className='min-h-11'
                                  onClick={() => requestPayoutReview(payout, 'approve')}
                                  isLoading={actionState === `approve:${payout.id}`}
                                  disabled={actionBusy}
                                >
                                  Approve
                                </Button>
                              </>
                            ) : (
                              <span className='text-xs text-muted-foreground'>No action</span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
