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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
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
import { useEffectiveBrandId } from '@/hooks/use-effective-brand';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import { withLocalQaMarker } from '@/lib/whitelabel-api';
import { toast } from 'sonner';

const API_BASE = '/api/proxy';

type AgreementStatus = 'draft' | 'sent' | 'signed' | 'expired' | 'terminated' | string;

type Agreement = {
  id: string;
  creator_id: string;
  brand_id: string;
  handle?: string | null;
  platform?: string | null;
  agreement_type: string;
  terms?: Record<string, unknown> | string | null;
  commission_rate?: number | null;
  flat_fee?: number | null;
  usage_duration_days?: number | null;
  exclusivity?: boolean | null;
  pdf_url?: string | null;
  status: AgreementStatus;
  sent_at?: string | null;
  signed_at?: string | null;
  expires_at?: string | null;
  created_at?: string | null;
};

type CreatorOption = {
  id: string;
  handle: string;
  display_name?: string | null;
  platform?: string | null;
};

type AgreementForm = {
  creator_id: string;
  agreement_type: string;
  usage_duration_days: string;
  commission_rate_percent: string;
  flat_fee: string;
  usage_rights: string;
  territory: string;
  compensation: string;
  exclusivity: boolean;
};

type AgreementDocument = {
  id: string;
  status?: string | null;
  agreement_type?: string | null;
  brand?: { id?: string; name?: string | null };
  creator?: {
    id?: string;
    handle?: string | null;
    display_name?: string | null;
    platform?: string | null;
    email?: string | null;
  };
  terms?: Record<string, unknown>;
  commission_rate?: number | null;
  flat_fee?: number | null;
  usage_duration_days?: number | null;
  exclusivity?: boolean | null;
  sent_at?: string | null;
  signed_at?: string | null;
  expires_at?: string | null;
  created_at?: string | null;
};

const DEFAULT_FORM: AgreementForm = {
  creator_id: '',
  agreement_type: 'whitelisting',
  usage_duration_days: '90',
  commission_rate_percent: '10',
  flat_fee: '0',
  usage_rights: 'Paid social usage, whitelisting, and creator content promotion',
  territory: 'United States',
  compensation: 'Commission, product gifting, and any agreed flat fee',
  exclusivity: false
};

const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0
});

function statusClass(status: string) {
  const normalized = status.toLowerCase();
  if (normalized === 'signed') return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700';
  if (normalized === 'sent') return 'border-blue-500/20 bg-blue-500/10 text-blue-700';
  if (normalized === 'expired' || normalized === 'terminated') return 'border-destructive/20 bg-destructive/10 text-destructive';
  return 'border-muted bg-muted text-muted-foreground';
}

function formatAgreementType(value: string) {
  return value.replaceAll('_', ' ');
}

function parseTerms(terms: Agreement['terms']) {
  if (!terms) return {};
  if (typeof terms === 'string') {
    try {
      const parsed = JSON.parse(terms);
      return typeof parsed === 'object' && parsed ? parsed as Record<string, unknown> : {};
    } catch {
      return {};
    }
  }
  return terms;
}

function summarizeCompensation(agreement: Agreement) {
  const parts = [];
  if (typeof agreement.commission_rate === 'number') {
    parts.push(`${Math.round(agreement.commission_rate * 100)}% commission`);
  }
  if (typeof agreement.flat_fee === 'number' && agreement.flat_fee > 0) {
    parts.push(money.format(agreement.flat_fee));
  }
  if (agreement.exclusivity) parts.push('exclusive');
  return parts.join(' + ') || 'Terms only';
}

function summarizeTerms(agreement: Agreement) {
  const terms = parseTerms(agreement.terms);
  const values = ['usage_rights', 'territory', 'compensation']
    .map((key) => terms[key])
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0);
  if (values.length) return values.join(' · ');
  if (agreement.usage_duration_days) return `${agreement.usage_duration_days} day usage window`;
  return 'No summary saved';
}

function agreementCreatorLabel(agreement: Agreement) {
  return agreement.handle ? `@${agreement.handle}` : `creator ${agreement.creator_id.slice(0, 8)}`;
}

function agreementActionLabel(agreement: Agreement) {
  return `${agreementCreatorLabel(agreement)} ${agreement.status} agreement ${agreement.id.slice(0, 8)}`;
}

function getAgreementFormError(form: AgreementForm) {
  if (!form.creator_id) return 'Choose a creator for this agreement.';

  const duration = Number(form.usage_duration_days);
  if (!Number.isInteger(duration) || duration < 1 || duration > 1095) {
    return 'Usage window must be a whole number between 1 and 1095 days.';
  }

  const commissionPercent = Number(form.commission_rate_percent);
  if (!Number.isFinite(commissionPercent) || commissionPercent < 0 || commissionPercent > 100) {
    return 'Commission percent must be between 0 and 100.';
  }

  const flatFee = Number(form.flat_fee);
  if (!Number.isFinite(flatFee) || flatFee < 0) {
    return 'Flat fee must be 0 or greater.';
  }

  if (!form.usage_rights.trim()) return 'Usage rights are required.';
  if (!form.territory.trim()) return 'Territory is required.';
  if (!form.compensation.trim()) return 'Compensation summary is required.';

  return null;
}

async function readApiError(response: Response, fallback: string) {
  try {
    const payload = await response.json();
    const detail = payload?.detail || payload?.error;
    if (typeof detail === 'string' && detail.trim()) return detail;
  } catch {}
  return fallback;
}

export default function AgreementsPage() {
  const activeBrandId = useEffectiveBrandId();
  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [creators, setCreators] = useState<CreatorOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingCreators, setLoadingCreators] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [statusActionId, setStatusActionId] = useState<string | null>(null);
  const [documentOpen, setDocumentOpen] = useState(false);
  const [documentLoadingId, setDocumentLoadingId] = useState<string | null>(null);
  const [activeDocument, setActiveDocument] = useState<AgreementDocument | null>(null);
  const [pendingStatusUpdate, setPendingStatusUpdate] = useState<{
    agreement: Agreement;
    status: AgreementStatus;
  } | null>(null);
  const [form, setForm] = useState<AgreementForm>(DEFAULT_FORM);

  const loadAgreements = useCallback(async () => {
    if (!activeBrandId) {
      setAgreements([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(withLocalQaMarker(`${API_BASE}/api/agreements?brand_id=${encodeURIComponent(activeBrandId)}`));
      if (!response.ok) throw new Error(await readApiError(response, 'Agreements unavailable'));
      const payload = await response.json();
      setAgreements(Array.isArray(payload) ? payload : []);
    } catch (caughtError) {
      setAgreements([]);
      setError(caughtError instanceof Error ? caughtError.message : 'Agreements unavailable');
    } finally {
      setLoading(false);
    }
  }, [activeBrandId]);

  useEffect(() => {
    void loadAgreements();
  }, [loadAgreements]);

  const loadCreators = useCallback(async () => {
    if (!activeBrandId) return;
    setLoadingCreators(true);
    try {
      const response = await fetch(withLocalQaMarker(`${API_BASE}/api/creators?brand_id=${encodeURIComponent(activeBrandId)}&limit=100`));
      if (!response.ok) throw new Error(await readApiError(response, 'Creators unavailable'));
      const payload = await response.json();
      setCreators((Array.isArray(payload) ? payload : (payload.creators || [])) as CreatorOption[]);
    } catch (caughtError) {
      toast.error(caughtError instanceof Error ? caughtError.message : 'Creators unavailable');
      setCreators([]);
    } finally {
      setLoadingCreators(false);
    }
  }, [activeBrandId]);

  function updateForm<K extends keyof AgreementForm>(key: K, value: AgreementForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function openCreateDialog() {
    setForm(DEFAULT_FORM);
    setDialogOpen(true);
    void loadCreators();
  }

  async function createAgreement() {
    if (!activeBrandId) {
      toast.error('Select a workspace before creating agreements.');
      return;
    }
    if (!form.creator_id) {
      toast.error('Choose a creator for this agreement.');
      return;
    }
    const validationError = getAgreementFormError(form);
    if (validationError) {
      toast.error(validationError);
      return;
    }
    const duration = Number(form.usage_duration_days);
    const commissionPercent = Number(form.commission_rate_percent);
    const flatFee = Number(form.flat_fee);
    setCreating(true);
    try {
      const response = await fetch(withLocalQaMarker(`${API_BASE}/api/agreements`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand_id: activeBrandId,
          creator_id: form.creator_id,
          agreement_type: form.agreement_type,
          usage_duration_days: duration,
          commission_rate: Number.isFinite(commissionPercent) ? commissionPercent / 100 : undefined,
          flat_fee: Number.isFinite(flatFee) ? flatFee : undefined,
          usage_rights: form.usage_rights.trim(),
          territory: form.territory.trim(),
          compensation: form.compensation.trim(),
          exclusivity: form.exclusivity
        })
      });
      if (!response.ok) throw new Error(await readApiError(response, 'Agreement creation failed'));
      const payload = await response.json();
      const created = payload?.agreement;
      if (created?.id) {
        setAgreements((current) => [created, ...current]);
      } else {
        await loadAgreements();
      }
      setDialogOpen(false);
      toast.success('Agreement draft created.');
    } catch (caughtError) {
      toast.error(caughtError instanceof Error ? caughtError.message : 'Agreement creation failed');
    } finally {
      setCreating(false);
    }
  }

  async function updateAgreementStatus(agreement: Agreement, status: AgreementStatus) {
    if (!activeBrandId) {
      toast.error('Select a workspace before updating agreements.');
      return;
    }
    setStatusActionId(`${agreement.id}:${status}`);
    try {
      const response = await fetch(withLocalQaMarker(`${API_BASE}/api/agreements/${encodeURIComponent(agreement.id)}/status`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (!response.ok) throw new Error(await readApiError(response, 'Agreement status update failed'));
      const payload = await response.json();
      const updated = payload?.agreement;
      if (updated?.id) {
        setAgreements((current) => current.map((item) => item.id === updated.id ? updated : item));
      } else {
        await loadAgreements();
      }
      toast.success(`Agreement marked ${status}.`);
    } catch (caughtError) {
      toast.error(caughtError instanceof Error ? caughtError.message : 'Agreement status update failed');
    } finally {
      setStatusActionId(null);
    }
  }

  function requestAgreementStatusUpdate(agreement: Agreement, status: AgreementStatus) {
    setPendingStatusUpdate({ agreement, status });
  }

  async function confirmAgreementStatusUpdate() {
    if (!pendingStatusUpdate) return;
    const { agreement, status } = pendingStatusUpdate;
    setPendingStatusUpdate(null);
    await updateAgreementStatus(agreement, status);
  }

  async function openAgreementDocument(agreement: Agreement) {
    setDocumentLoadingId(agreement.id);
    try {
      const response = await fetch(withLocalQaMarker(`${API_BASE}/api/agreements/${encodeURIComponent(agreement.id)}/document`));
      if (!response.ok) throw new Error(await readApiError(response, 'Agreement terms unavailable'));
      const payload = await response.json();
      setActiveDocument(payload?.document || null);
      setDocumentOpen(true);
    } catch (caughtError) {
      toast.error(caughtError instanceof Error ? caughtError.message : 'Agreement terms unavailable');
    } finally {
      setDocumentLoadingId(null);
    }
  }

  const totals = useMemo(() => {
    return agreements.reduce(
      (acc, agreement) => {
        acc.total += 1;
        if (agreement.status === 'signed') acc.signed += 1;
        if (agreement.status === 'sent') acc.sent += 1;
        if (agreement.expires_at && new Date(agreement.expires_at).getTime() < Date.now()) acc.expiring += 1;
        return acc;
      },
      { total: 0, signed: 0, sent: 0, expiring: 0 }
    );
  }, [agreements]);
  const formValidationError = useMemo(() => getAgreementFormError(form), [form]);

  const pendingStatusCopy = pendingStatusUpdate
    ? {
        title:
          pendingStatusUpdate.status === 'terminated'
            ? 'Terminate agreement?'
            : pendingStatusUpdate.status === 'signed'
              ? 'Mark agreement signed?'
              : 'Mark agreement sent?',
        description:
          pendingStatusUpdate.status === 'terminated'
            ? `This will terminate the ${formatAgreementType(pendingStatusUpdate.agreement.agreement_type)} agreement for @${pendingStatusUpdate.agreement.handle || pendingStatusUpdate.agreement.creator_id.slice(0, 8)}.`
            : pendingStatusUpdate.status === 'signed'
              ? `This will mark the ${formatAgreementType(pendingStatusUpdate.agreement.agreement_type)} agreement for @${pendingStatusUpdate.agreement.handle || pendingStatusUpdate.agreement.creator_id.slice(0, 8)} as signed.`
              : `This will mark the ${formatAgreementType(pendingStatusUpdate.agreement.agreement_type)} agreement for @${pendingStatusUpdate.agreement.handle || pendingStatusUpdate.agreement.creator_id.slice(0, 8)} as sent.`,
        actionLabel:
          pendingStatusUpdate.status === 'terminated'
            ? 'Terminate agreement'
            : pendingStatusUpdate.status === 'signed'
              ? 'Mark signed'
              : 'Mark sent'
      }
    : null;

  function renderAgreementActions(agreement: Agreement, compact = false) {
    const actionLabel = agreementActionLabel(agreement);

    return (
      <div className={cn(compact ? 'grid grid-cols-2 gap-2' : 'flex max-w-72 flex-wrap justify-end gap-2 justify-self-end')}>
        <Button
          size='sm'
          variant='outline'
          className={cn('min-h-11', compact && 'min-w-0')}
          aria-label={`View terms for ${actionLabel}`}
          onClick={() => void openAgreementDocument(agreement)}
          isLoading={documentLoadingId === agreement.id}
        >
          View Terms
        </Button>
        {agreement.status === 'draft' && (
          <Button
            size='sm'
            variant='outline'
            className={cn('min-h-11', compact && 'min-w-0')}
            aria-label={`Mark agreement sent for ${actionLabel}`}
            onClick={() => requestAgreementStatusUpdate(agreement, 'sent')}
            isLoading={statusActionId === `${agreement.id}:sent`}
          >
            Mark Sent
          </Button>
        )}
        {(agreement.status === 'draft' || agreement.status === 'sent') && (
          <Button
            size='sm'
            className={cn('min-h-11', compact && 'min-w-0')}
            aria-label={`Mark agreement signed for ${actionLabel}`}
            onClick={() => requestAgreementStatusUpdate(agreement, 'signed')}
            isLoading={statusActionId === `${agreement.id}:signed`}
          >
            Mark Signed
          </Button>
        )}
        {!['terminated', 'expired'].includes(agreement.status) && (
          <Button
            size='sm'
            variant='outline'
            className={cn('min-h-11', compact && 'min-w-0')}
            aria-label={`Terminate agreement for ${actionLabel}`}
            onClick={() => requestAgreementStatusUpdate(agreement, 'terminated')}
            isLoading={statusActionId === `${agreement.id}:terminated`}
          >
            Terminate
          </Button>
        )}
      </div>
    );
  }

  if (!activeBrandId) {
    return (
      <Alert>
        <Icons.workspace className='size-4' />
        <AlertTitle>Select a workspace</AlertTitle>
        <AlertDescription>Choose a client brand before reviewing whitelisting agreements.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className='min-w-0 space-y-6'>
      <AlertDialog open={Boolean(pendingStatusUpdate)} onOpenChange={(open) => !open && setPendingStatusUpdate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{pendingStatusCopy?.title}</AlertDialogTitle>
            <AlertDialogDescription>{pendingStatusCopy?.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className='min-h-11'>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className='min-h-11'
              aria-label={`Confirm agreement status update: ${pendingStatusCopy?.actionLabel || 'update agreement'}`}
              onClick={() => void confirmAgreementStatusUpdate()}
            >
              {pendingStatusCopy?.actionLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className='grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-4'>
        {[
          { label: 'Total', value: totals.total },
          { label: 'Signed', value: totals.signed },
          { label: 'Sent', value: totals.sent },
          { label: 'Past expiry', value: totals.expiring }
        ].map((item) => (
          <Card key={item.label}>
            <CardHeader className='pb-2'>
              <CardDescription>{item.label}</CardDescription>
              <CardTitle className='text-2xl'>{item.value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card className='min-w-0 overflow-hidden'>
        <CardHeader className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
          <div>
            <CardTitle>Agreement Ledger</CardTitle>
            <CardDescription>Track whitelisting, affiliate, UGC license, and Spark Ads terms by creator.</CardDescription>
          </div>
          <div className='flex w-full flex-wrap gap-2 sm:w-auto sm:justify-end'>
            <Button
              variant='outline'
              className='min-h-11 min-w-0 flex-1 sm:flex-none'
              aria-label='Refresh agreement ledger'
              onClick={() => void loadAgreements()}
              disabled={loading}
            >
              <Icons.refresh className={cn('size-4', loading && 'animate-spin')} />
              Refresh
            </Button>
            <Button className='min-h-11 min-w-0 flex-1 sm:flex-none' aria-label='Create new agreement draft' onClick={openCreateDialog}>
              <Icons.add className='size-4' />
              New Agreement
            </Button>
            <Button asChild className='min-h-11 min-w-0 flex-1 sm:flex-none'>
              <Link href='/dashboard/creators' aria-label='Open Creators'>
                <Icons.user className='size-4' />
                Open Creators
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {error ? (
            <Alert variant='destructive'>
              <Icons.alertCircle className='size-4' />
              <AlertTitle>Agreements unavailable</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : loading ? (
            <div className='space-y-3'>
              {[0, 1, 2].map((item) => (
                <div key={item} className='h-14 animate-pulse rounded-md bg-muted' />
              ))}
            </div>
          ) : agreements.length === 0 ? (
            <div className='py-14 text-center'>
              <Icons.fileTypeDoc className='mx-auto mb-3 size-9 text-muted-foreground' />
              <h3 className='text-sm font-semibold'>No agreements yet</h3>
              <p className='mx-auto mt-2 max-w-md text-sm text-muted-foreground'>
                Signed creator terms will appear here after whitelisting, affiliate, or content usage agreements are created.
              </p>
              <div className='mt-4 flex justify-center gap-2'>
                <Button asChild variant='outline' className='min-h-11'>
                  <Link href='/dashboard/outreach'>Review outreach</Link>
                </Button>
                <Button asChild className='min-h-11'>
                  <Link href='/dashboard/creators'>Open creators</Link>
                </Button>
              </div>
            </div>
          ) : (
            <>
            <div className='grid gap-3 xl:hidden'>
              {agreements.map((agreement) => (
                <div key={agreement.id} className='min-w-0 rounded-lg border p-3'>
                  <div className='flex min-w-0 items-start justify-between gap-3'>
                    <div className='min-w-0'>
                      <p className='truncate text-sm font-semibold'>@{agreement.handle || agreement.creator_id.slice(0, 8)}</p>
                      <p className='text-xs capitalize text-muted-foreground'>
                        {agreement.platform || 'creator'} · {formatAgreementType(agreement.agreement_type)}
                      </p>
                    </div>
                    <Badge variant='outline' className={cn('shrink-0 capitalize', statusClass(agreement.status))}>
                      {agreement.status}
                    </Badge>
                  </div>
                  <dl className='mt-3 grid gap-2 text-sm'>
                    <div className='min-w-0'>
                      <dt className='text-xs font-medium uppercase text-muted-foreground'>Compensation</dt>
                      <dd className='break-words'>{summarizeCompensation(agreement)}</dd>
                    </div>
                    <div className='min-w-0'>
                      <dt className='text-xs font-medium uppercase text-muted-foreground'>Terms</dt>
                      <dd className='line-clamp-2 break-words text-muted-foreground'>{summarizeTerms(agreement)}</dd>
                    </div>
                    <div className='grid grid-cols-2 gap-2'>
                      <div className='min-w-0'>
                        <dt className='text-xs font-medium uppercase text-muted-foreground'>Signed</dt>
                        <dd className='truncate'>
                          {agreement.signed_at
                            ? formatDate(agreement.signed_at, { month: 'short', day: 'numeric', year: 'numeric' })
                            : 'Not signed'}
                        </dd>
                      </div>
                      <div className='min-w-0'>
                        <dt className='text-xs font-medium uppercase text-muted-foreground'>Expires</dt>
                        <dd className='truncate'>
                          {agreement.expires_at
                            ? formatDate(agreement.expires_at, { month: 'short', day: 'numeric', year: 'numeric' })
                            : 'No expiry'}
                        </dd>
                      </div>
                    </div>
                  </dl>
                  <div className='mt-3'>
                    {renderAgreementActions(agreement, true)}
                  </div>
                </div>
              ))}
            </div>
            <div className='hidden max-w-full overflow-x-auto xl:block'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Creator</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Compensation</TableHead>
                    <TableHead>Terms</TableHead>
                    <TableHead>Signed</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead className='text-right'>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agreements.map((agreement) => (
                    <TableRow key={agreement.id}>
                      <TableCell>
                        <Badge variant='outline' className={cn('capitalize', statusClass(agreement.status))}>
                          {agreement.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className='font-medium'>@{agreement.handle || agreement.creator_id.slice(0, 8)}</div>
                        <div className='text-xs capitalize text-muted-foreground'>{agreement.platform || 'creator'}</div>
                      </TableCell>
                      <TableCell className='capitalize'>{formatAgreementType(agreement.agreement_type)}</TableCell>
                      <TableCell>{summarizeCompensation(agreement)}</TableCell>
                      <TableCell className='max-w-72 truncate text-muted-foreground'>{summarizeTerms(agreement)}</TableCell>
                      <TableCell>{agreement.signed_at ? formatDate(agreement.signed_at, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Not signed'}</TableCell>
                      <TableCell>{agreement.expires_at ? formatDate(agreement.expires_at, { month: 'short', day: 'numeric', year: 'numeric' }) : 'No expiry'}</TableCell>
                      <TableCell className='pr-4 text-right'>
                        {renderAgreementActions(agreement)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className='flex max-h-[calc(100dvh-2rem)] flex-col overflow-hidden sm:max-w-2xl'>
          <DialogHeader className='shrink-0'>
            <DialogTitle>Create Agreement</DialogTitle>
            <DialogDescription>Create a draft agreement record before sending or collecting signatures.</DialogDescription>
          </DialogHeader>
          <div className='grid min-h-0 gap-4 overflow-y-auto py-2 pr-1 md:grid-cols-2'>
            <div className='space-y-2 md:col-span-2'>
              <Label htmlFor='agreement-creator'>Creator</Label>
              <Select value={form.creator_id} onValueChange={(value) => updateForm('creator_id', value)} disabled={loadingCreators || creators.length === 0}>
                <SelectTrigger id='agreement-creator' className='min-h-11 w-full min-w-0 [&>span]:truncate'>
                  <SelectValue placeholder={loadingCreators ? 'Loading creators...' : 'Choose creator'} />
                </SelectTrigger>
                <SelectContent>
                  {creators.map((creator) => (
                    <SelectItem key={creator.id} value={creator.id}>
                      @{creator.handle} {creator.platform ? `· ${creator.platform}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className='space-y-2'>
              <Label htmlFor='agreement-type'>Type</Label>
              <Select value={form.agreement_type} onValueChange={(value) => updateForm('agreement_type', value)}>
                <SelectTrigger id='agreement-type' className='min-h-11 w-full min-w-0 [&>span]:truncate'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='whitelisting'>Whitelisting</SelectItem>
                  <SelectItem value='ugc_license'>UGC license</SelectItem>
                  <SelectItem value='affiliate'>Affiliate</SelectItem>
                  <SelectItem value='spark_ads'>Spark Ads</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className='space-y-2'>
              <Label htmlFor='agreement-duration'>Usage window</Label>
              <Input id='agreement-duration' type='number' min='1' max='1095' value={form.usage_duration_days} onChange={(event) => updateForm('usage_duration_days', event.target.value)} />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='agreement-commission'>Commission percent</Label>
              <Input id='agreement-commission' type='number' min='0' max='100' step='0.1' value={form.commission_rate_percent} onChange={(event) => updateForm('commission_rate_percent', event.target.value)} />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='agreement-flat-fee'>Flat fee</Label>
              <Input id='agreement-flat-fee' type='number' min='0' step='1' value={form.flat_fee} onChange={(event) => updateForm('flat_fee', event.target.value)} />
            </div>
            <div className='space-y-2 md:col-span-2'>
              <Label htmlFor='agreement-usage-rights'>Usage rights</Label>
              <Input id='agreement-usage-rights' value={form.usage_rights} onChange={(event) => updateForm('usage_rights', event.target.value)} />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='agreement-territory'>Territory</Label>
              <Input id='agreement-territory' value={form.territory} onChange={(event) => updateForm('territory', event.target.value)} />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='agreement-compensation'>Compensation summary</Label>
              <Input id='agreement-compensation' value={form.compensation} onChange={(event) => updateForm('compensation', event.target.value)} />
            </div>
            <div className='flex items-center justify-between rounded-md border p-3 md:col-span-2'>
              <div>
                <Label htmlFor='agreement-exclusivity'>Exclusivity</Label>
                <p className='text-xs text-muted-foreground'>Reserve this creator/category for the brand during the usage window.</p>
              </div>
              <Switch id='agreement-exclusivity' checked={form.exclusivity} onCheckedChange={(checked) => updateForm('exclusivity', checked)} />
            </div>
            {formValidationError && (
              <p className='break-words text-sm text-muted-foreground md:col-span-2'>
                {formValidationError}
              </p>
            )}
          </div>
          <DialogFooter className='shrink-0'>
            <Button variant='outline' className='min-h-11' onClick={() => setDialogOpen(false)} disabled={creating}>
              Cancel
            </Button>
            <Button
              className='min-h-11'
              onClick={createAgreement}
              isLoading={creating}
              disabled={loadingCreators || creators.length === 0 || Boolean(formValidationError)}
            >
              Create Draft
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={documentOpen} onOpenChange={setDocumentOpen}>
        <DialogContent className='flex max-h-[calc(100dvh-2rem)] flex-col overflow-hidden sm:max-w-3xl'>
          <DialogHeader className='shrink-0'>
            <DialogTitle>
              {activeDocument ? `${formatAgreementType(activeDocument.agreement_type || 'agreement')} agreement` : 'Agreement Terms'}
            </DialogTitle>
            <DialogDescription>
              {activeDocument?.brand?.name || 'Brand'} x @{activeDocument?.creator?.handle || 'creator'}
            </DialogDescription>
          </DialogHeader>
          {activeDocument && (
            <div className='min-h-0 space-y-5 overflow-y-auto pr-1 text-sm'>
              <div className='grid gap-3 rounded-md border p-4 md:grid-cols-3'>
                <div>
                  <p className='text-xs text-muted-foreground'>Status</p>
                  <p className='font-medium capitalize'>{activeDocument.status || 'draft'}</p>
                </div>
                <div>
                  <p className='text-xs text-muted-foreground'>Usage window</p>
                  <p className='font-medium'>{activeDocument.usage_duration_days || 0} days</p>
                </div>
                <div>
                  <p className='text-xs text-muted-foreground'>Expires</p>
                  <p className='font-medium'>
                    {activeDocument.expires_at ? formatDate(activeDocument.expires_at, { month: 'short', day: 'numeric', year: 'numeric' }) : 'No expiry'}
                  </p>
                </div>
              </div>

              <div className='grid gap-4 md:grid-cols-2'>
                <div className='rounded-md border p-4'>
                  <p className='mb-2 text-xs font-medium uppercase text-muted-foreground'>Parties</p>
                  <p><span className='font-medium'>Brand:</span> {activeDocument.brand?.name || activeDocument.brand?.id}</p>
                  <p><span className='font-medium'>Creator:</span> {activeDocument.creator?.display_name || activeDocument.creator?.handle}</p>
                  <p className='capitalize'><span className='font-medium'>Platform:</span> {activeDocument.creator?.platform || 'creator'}</p>
                </div>
                <div className='rounded-md border p-4'>
                  <p className='mb-2 text-xs font-medium uppercase text-muted-foreground'>Compensation</p>
                  <p><span className='font-medium'>Commission:</span> {typeof activeDocument.commission_rate === 'number' ? `${Math.round(activeDocument.commission_rate * 100)}%` : 'None'}</p>
                  <p><span className='font-medium'>Flat fee:</span> {typeof activeDocument.flat_fee === 'number' ? money.format(activeDocument.flat_fee) : 'None'}</p>
                  <p><span className='font-medium'>Exclusivity:</span> {activeDocument.exclusivity ? 'Yes' : 'No'}</p>
                </div>
              </div>

              <div className='rounded-md border p-4'>
                <p className='mb-2 text-xs font-medium uppercase text-muted-foreground'>Terms</p>
                <dl className='grid gap-3 md:grid-cols-3'>
                  {['usage_rights', 'territory', 'compensation'].map((key) => (
                    <div key={key}>
                      <dt className='text-xs capitalize text-muted-foreground'>{key.replaceAll('_', ' ')}</dt>
                      <dd>{typeof activeDocument.terms?.[key] === 'string' ? activeDocument.terms[key] as string : 'Not set'}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              <div className='grid gap-3 text-xs text-muted-foreground md:grid-cols-3'>
                <p>Created: {activeDocument.created_at ? formatDate(activeDocument.created_at, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Unknown'}</p>
                <p>Sent: {activeDocument.sent_at ? formatDate(activeDocument.sent_at, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Not sent'}</p>
                <p>Signed: {activeDocument.signed_at ? formatDate(activeDocument.signed_at, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Not signed'}</p>
              </div>
            </div>
          )}
          <DialogFooter className='shrink-0'>
            <Button className='min-h-11' onClick={() => setDocumentOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
