'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Icons } from '@/components/icons';
import { Separator } from '@/components/ui/separator';
import { useBrandStore } from '@/components/org-switcher';
import { withLocalQaMarker } from '@/lib/whitelabel-api';
import type { Creator } from '../api/types';

interface CreatorDetailDrawerProps {
  creator: Creator | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type CreatorDetail = Creator & {
  meta?: {
    ai_analysis?: {
      text?: string;
    };
    private_notes?: string;
  };
  shopify?: {
    customer_id?: string | null;
  };
  total_spent?: number;
  order_count?: number;
};

type PayoutMethod = 'cash' | 'store_credit' | 'points';

type PayoutForm = {
  method: PayoutMethod;
  paypal_email: string;
  shopify_customer_id: string;
  smile_customer_id: string;
};

type OutreachItem = {
  id?: string;
  creator_id?: string;
  handle?: string;
  status?: string;
  created_at?: string;
  sent_at?: string;
  channel?: string;
  message?: string;
  message_preview?: string;
  subject?: string;
};

function formatFollowers(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return String(count);
}

function formatNiche(niche: string): string {
  if (!niche) return '';
  return niche
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function hasMeasuredValue(value?: number | null) {
  return Number.isFinite(Number(value)) && Number(value) > 0;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

const STATUS_COLORS: Record<string, string> = {
  sent: 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300',
  delivered: 'bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-300',
  replied: 'bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300',
  opened: 'bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300',
  failed: 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300',
  pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/50 dark:text-yellow-300'
};

async function readApiErrorMessage(response: Response, fallback: string) {
  try {
    const payload = await response.json();
    const detail = payload?.detail || payload?.error;
    if (typeof detail === 'string' && detail.trim()) return detail;
  } catch {}
  return fallback;
}

export function CreatorDetailDrawer({ creator, open, onOpenChange }: CreatorDetailDrawerProps) {
  const activeBrandId = useBrandStore((s) => s.activeBrand.id);
  const [fullData, setFullData] = useState<CreatorDetail | null>(null);
  const [outreach, setOutreach] = useState<OutreachItem[]>([]);
  const [outreachLoading, setOutreachLoading] = useState(false);
  const [notes, setNotes] = useState('');
  const [activeTab, setActiveTab] = useState('profile');
  const [similar, setSimilar] = useState<CreatorDetail[]>([]);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [proposing, setProposing] = useState(false);
  const [pendingDrawerAction, setPendingDrawerAction] = useState<'analysis' | 'proposal' | 'payout' | null>(null);
  const [savingNotes, setSavingNotes] = useState(false);
  const [savingPayout, setSavingPayout] = useState(false);
  const [payoutForm, setPayoutForm] = useState<PayoutForm>({
    method: 'cash',
    paypal_email: '',
    shopify_customer_id: '',
    smile_customer_id: ''
  });

  useEffect(() => {
    if (!open || !creator) return;
    const brandId = creator.brand_id || activeBrandId;
    setFullData(null);
    setActiveTab('profile');
    setAnalysis(null);
    setOutreach([]);
    setSimilar([]);
    setNotes('');
    setPayoutForm({
      method: creator.payout_method || 'cash',
      paypal_email: creator.paypal_email || creator.email || '',
      shopify_customer_id: creator.shopify_customer_id || '',
      smile_customer_id: creator.smile_customer_id || ''
    });
    if (!brandId) return;
    fetch(withLocalQaMarker(`/api/proxy/api/creators/${creator.id}?brand_id=${encodeURIComponent(brandId)}`))
      .then((r) => r.ok ? r.json() : null)
      .then((data: CreatorDetail | null) => {
        setFullData(data);
        if (typeof data?.meta?.private_notes === 'string') {
          setNotes(data.meta.private_notes);
        } else {
          setNotes('');
        }
        if (data?.meta?.ai_analysis?.text) {
          setAnalysis(data.meta.ai_analysis.text);
        } else {
          setAnalysis(null);
        }
        if (data) {
          setPayoutForm({
            method: data.payout_method || 'cash',
            paypal_email: data.paypal_email || data.email || '',
            shopify_customer_id: data.shopify_customer_id || data.shopify?.customer_id || '',
            smile_customer_id: data.smile_customer_id || ''
          });
        }
      })
      .catch(() => setFullData(null));
  }, [activeBrandId, open, creator]);

  useEffect(() => {
    if (!open || !creator) return;
    setOutreachLoading(true);
    const brandId = creator.brand_id || activeBrandId;
    if (!brandId) {
      setOutreach([]);
      setOutreachLoading(false);
      return;
    }
    fetch(withLocalQaMarker(`/api/proxy/api/outreach?brand_id=${encodeURIComponent(brandId)}&limit=50`))
      .then((r) => r.json())
      .then((rows: OutreachItem[]) => {
        const filtered = (rows || []).filter((r) =>
          r.creator_id === creator.id || r.handle === creator.handle
        );
        setOutreach(filtered);
      })
      .catch(() => setOutreach([]))
      .finally(() => setOutreachLoading(false));
  }, [activeBrandId, open, creator]);

  useEffect(() => {
    if (!open || !creator) return;
    const brandId = creator.brand_id || activeBrandId;
    if (!brandId) {
      setSimilar([]);
      return;
    }
    const minScore = Math.max(0, (creator.score || 0) - 15);
    fetch(withLocalQaMarker(`/api/proxy/api/creators?brand_id=${encodeURIComponent(brandId)}&limit=6&min_score=${minScore}`))
      .then((r) => r.json())
      .then((data: { creators?: CreatorDetail[] }) => {
        const filtered = (data.creators || [])
          .filter((c) => c.id !== creator.id && c.handle !== creator.handle)
          .slice(0, 5);
        setSimilar(filtered);
      })
      .catch(() => setSimilar([]));
  }, [activeBrandId, open, creator]);

  async function saveNotes() {
    if (!creator) return;
    const brandId = creator.brand_id || activeBrandId;
    if (!brandId) {
      toast.error('Select a client brand before saving creator notes.');
      return;
    }
    setSavingNotes(true);
    try {
      const res = await fetch(withLocalQaMarker(`/api/proxy/api/creators/${creator.id}?brand_id=${encodeURIComponent(brandId)}`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brand_id: brandId, private_notes: notes })
      });
      if (!res.ok) {
        throw new Error(await readApiErrorMessage(res, 'CreatorOS could not save these notes.'));
      }
      const updated = await res.json() as CreatorDetail;
      setFullData(updated);
      toast.success('Notes saved');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Notes save failed');
    } finally {
      setSavingNotes(false);
    }
  }

  async function handleReanalyze() {
    if (!creator) return;
    const brandId = creator.brand_id || activeBrandId;
    if (!brandId) {
      toast.error('Select a client brand before analyzing a creator.');
      return;
    }
    setAnalyzing(true);
    try {
      const res = await fetch(withLocalQaMarker('/api/proxy/api/ai/analyze-creator'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brand_id: brandId, handle: creator.handle })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.detail || 'Analysis failed');
      setAnalysis(data.analysis);
      if (data.creator) {
        setFullData(data.creator);
      }
      toast.success('Analysis complete');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Analysis failed');
    } finally {
      setPendingDrawerAction(null);
      setAnalyzing(false);
    }
  }

  async function handleAutoPropose(dryRun = false) {
    if (!creator) return;
    const brandId = creator.brand_id || activeBrandId;
    if (!brandId) {
      toast.error(`Select a client brand before ${dryRun ? 'previewing' : 'generating'} a proposal.`);
      return;
    }
    if (!dryRun) setProposing(true);
    toast.info(`${dryRun ? 'Previewing' : 'Generating'} personalized proposal...`);
    try {
      const res = await fetch(withLocalQaMarker('/api/proxy/api/outreach'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand_id: brandId,
          creator_id: creator.id,
          handle: creator.handle,
          platform: creator.platform || 'instagram',
          channel: 'dm',
          dry_run: dryRun
        })
      });
      if (!res.ok) {
        throw new Error(await readApiErrorMessage(res, 'CreatorOS could not generate this proposal.'));
      }
      const draft = await res.json().catch(() => null) as OutreachItem | null;
      if (draft && !dryRun) {
        setOutreach((current) => [draft, ...current.filter((item) => item.id !== draft.id)]);
      }
      toast.success(dryRun ? 'Dry run ready: proposal draft can be created.' : 'Proposal generated! Check Outreach CRM.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Proposal ${dryRun ? 'preview' : 'generation'} failed`);
    } finally {
      if (!dryRun) {
        setPendingDrawerAction(null);
        setProposing(false);
      }
    }
  }

  function requestReanalyze() {
    if (!creator) return;
    const brandId = creator.brand_id || activeBrandId;
    if (!brandId) {
      toast.error('Select a client brand before analyzing a creator.');
      return;
    }
    setPendingDrawerAction('analysis');
  }

  function requestAutoPropose() {
    if (!creator) return;
    const brandId = creator.brand_id || activeBrandId;
    if (!brandId) {
      toast.error('Select a client brand before generating a proposal.');
      return;
    }
    setPendingDrawerAction('proposal');
  }

  function updatePayoutForm<K extends keyof PayoutForm>(key: K, value: PayoutForm[K]) {
    setPayoutForm((current) => ({ ...current, [key]: value }));
  }

  async function savePayoutMethod() {
    if (!creator) return;

    const paypalEmail = payoutForm.paypal_email.trim();
    const shopifyCustomerId = payoutForm.shopify_customer_id.trim();
    const smileCustomerId = payoutForm.smile_customer_id.trim();

    if (payoutForm.method === 'cash' && !paypalEmail) {
      toast.error('Add a PayPal email before saving cash payouts.');
      return;
    }
    if (payoutForm.method === 'store_credit' && !shopifyCustomerId) {
      toast.error('Add a Shopify customer ID before saving store credit payouts.');
      return;
    }
    if (payoutForm.method === 'points' && !smileCustomerId) {
      toast.error('Add a Smile customer ID before saving points payouts.');
      return;
    }

    setSavingPayout(true);
    try {
      const res = await fetch(withLocalQaMarker(`/api/proxy/api/creators/${creator.id}/payout-method`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: payoutForm.method,
          paypal_email: paypalEmail || undefined,
          shopify_customer_id: shopifyCustomerId || undefined,
          smile_customer_id: smileCustomerId || undefined
        })
      });
      if (!res.ok) {
        throw new Error(await readApiErrorMessage(res, 'CreatorOS could not save this payout method.'));
      }
      const payload = await res.json().catch(() => null) as { creator?: CreatorDetail } | null;
      if (payload?.creator) {
        setFullData(payload.creator);
        setPayoutForm({
          method: payload.creator.payout_method || payoutForm.method,
          paypal_email: payload.creator.paypal_email || payload.creator.email || paypalEmail,
          shopify_customer_id: payload.creator.shopify_customer_id || payload.creator.shopify?.customer_id || shopifyCustomerId,
          smile_customer_id: payload.creator.smile_customer_id || smileCustomerId
        });
      }
      toast.success('Payout method saved');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Payout method save failed');
    } finally {
      setPendingDrawerAction(null);
      setSavingPayout(false);
    }
  }

  function requestPayoutMethodSave() {
    if (!creator) return;

    const paypalEmail = payoutForm.paypal_email.trim();
    const shopifyCustomerId = payoutForm.shopify_customer_id.trim();
    const smileCustomerId = payoutForm.smile_customer_id.trim();

    if (payoutForm.method === 'cash' && !paypalEmail) {
      toast.error('Add a PayPal email before saving cash payouts.');
      return;
    }
    if (payoutForm.method === 'store_credit' && !shopifyCustomerId) {
      toast.error('Add a Shopify customer ID before saving store credit payouts.');
      return;
    }
    if (payoutForm.method === 'points' && !smileCustomerId) {
      toast.error('Add a Smile customer ID before saving points payouts.');
      return;
    }

    setPendingDrawerAction('payout');
  }

  if (!creator) return null;

  const detail = fullData || creator;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className='w-full min-w-0 overflow-x-hidden overflow-y-auto sm:max-w-lg'>
        <SheetHeader className='min-w-0'>
          <SheetTitle>Creator Profile</SheetTitle>
        </SheetHeader>

        {/* Header — always visible */}
        <div className='mt-6 flex min-w-0 items-start gap-4'>
          <Avatar className='size-16 ring-2 ring-border'>
            <AvatarImage src={detail.avatar_url} alt={detail.display_name} />
            <AvatarFallback className='text-lg font-semibold'>
              {detail.display_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          <div className='flex-1 min-w-0'>
            <h3 className='break-words text-lg font-semibold'>{detail.display_name}</h3>
            <p className='break-words text-muted-foreground text-sm'>@{detail.handle}</p>
            <div className='mt-1.5 flex flex-wrap gap-1.5'>
              <Badge variant='secondary' className='text-xs'>
                {detail.platform === 'tiktok' ? 'TikTok' : 'Instagram'}
              </Badge>
              <Badge variant='outline' className='text-xs capitalize'>
                {detail.status}
              </Badge>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className='mt-6 min-w-0 overflow-hidden'>
          <TabsList className='grid min-h-12 w-full grid-cols-2 gap-1 sm:inline-flex sm:w-fit'>
            <TabsTrigger value='profile' className='min-h-11 min-w-0 cursor-pointer gap-1.5 px-2 text-xs'>
              <Icons.user className='size-3.5' />
              Profile
            </TabsTrigger>
            <TabsTrigger value='insights' className='min-h-11 min-w-0 cursor-pointer gap-1.5 px-2 text-xs'>
              <Icons.sparkles className='size-3.5' />
              AI Insights
            </TabsTrigger>
            <TabsTrigger value='outreach' className='min-h-11 min-w-0 cursor-pointer gap-1.5 px-2 text-xs'>
              <Icons.send className='size-3.5' />
              Outreach
            </TabsTrigger>
            <TabsTrigger value='notes' className='min-h-11 min-w-0 cursor-pointer gap-1.5 px-2 text-xs'>
              <Icons.notes className='size-3.5' />
              Notes
            </TabsTrigger>
            <TabsTrigger value='similar' className='col-span-2 min-h-11 min-w-0 cursor-pointer gap-1.5 px-2 text-xs sm:col-span-1'>
              <Icons.teams className='size-3.5' />
              Similar
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value='profile' className='mt-4 space-y-6'>
            {/* Bio */}
            {detail.bio && (
              <div className='min-w-0'>
                <h4 className='text-sm font-medium mb-1'>Bio</h4>
                <p className='break-words text-sm text-muted-foreground leading-relaxed'>{detail.bio}</p>
              </div>
            )}

            {/* Stats */}
            <Separator />
            <div className='grid grid-cols-3 gap-4'>
              <div className='text-center'>
                <p className='text-lg font-bold tabular-nums'>{formatFollowers(detail.follower_count || 0)}</p>
                <p className='text-xs text-muted-foreground'>Followers</p>
              </div>
              <div className='text-center'>
                <p className={`text-lg font-bold tabular-nums ${hasMeasuredValue(detail.engagement_rate) ? '' : 'text-muted-foreground'}`}>
                  {hasMeasuredValue(detail.engagement_rate) ? `${detail.engagement_rate.toFixed(1)}%` : 'Pending'}
                </p>
                <p className='text-xs text-muted-foreground'>Engagement</p>
              </div>
              <div className='text-center'>
                <p className={`text-lg font-bold tabular-nums ${hasMeasuredValue(detail.score) ? '' : 'text-muted-foreground'}`}>
                  {hasMeasuredValue(detail.score) ? detail.score : 'Unscored'}
                </p>
                <p className='text-xs text-muted-foreground'>Score</p>
              </div>
            </div>

            {/* Details */}
            <Separator />
            <div className='min-w-0 space-y-3'>
              <h4 className='text-sm font-medium'>Details</h4>
              {detail.location && (
                <div className='flex min-w-0 items-center justify-between gap-3 text-sm'>
                  <span className='text-muted-foreground flex shrink-0 items-center gap-1.5'>
                    <Icons.mapPin className='size-3.5' /> Location
                  </span>
                  <span className='min-w-0 break-words text-right'>{detail.location}</span>
                </div>
              )}
              {detail.niche && (
                <div className='flex min-w-0 items-center justify-between gap-3 text-sm'>
                  <span className='shrink-0 text-muted-foreground'>Niche</span>
                  <span className='min-w-0 break-words text-right'>{formatNiche(detail.niche)}</span>
                </div>
              )}
              {detail.email && (
                <div className='flex min-w-0 items-center justify-between gap-3 text-sm'>
                  <span className='shrink-0 text-muted-foreground'>Email</span>
                  <span className='min-w-0 break-all text-right'>{detail.email}</span>
                </div>
              )}
              <div className='flex min-w-0 items-center justify-between gap-3 text-sm'>
                <span className='shrink-0 text-muted-foreground'>Discovered via</span>
                <span className='min-w-0 break-words text-right capitalize'>{(detail.discovered_via || 'manual').replace('_', ' ')}</span>
              </div>
            </div>

            {/* Shopify data */}
            {(detail.total_spent > 0 || detail.order_count > 0) && (
              <>
                <Separator />
                <div className='space-y-3'>
                  <h4 className='text-sm font-medium'>Shopify Data</h4>
                  <div className='grid grid-cols-2 gap-3 rounded-lg border bg-muted/30 p-3'>
                    <div className='text-center'>
                      <p className='text-sm font-bold'>${(detail.total_spent || 0).toLocaleString()}</p>
                      <p className='text-xs text-muted-foreground'>Lifetime Spend</p>
                    </div>
                    <div className='text-center'>
                      <p className='text-sm font-bold'>{detail.order_count || 0}</p>
                      <p className='text-xs text-muted-foreground'>Orders</p>
                    </div>
                  </div>
                </div>
              </>
            )}

            <Separator />
            <div className='min-w-0 space-y-3'>
              <div className='flex min-w-0 items-start justify-between gap-3'>
                <div className='min-w-0'>
                  <h4 className='text-sm font-medium'>Payout Method</h4>
                  <p className='mt-1 text-xs text-muted-foreground'>
                    Used by view payouts when this creator reaches the settlement threshold.
                  </p>
                </div>
                <Badge variant={detail.payout_method ? 'default' : 'secondary'} className='shrink-0 capitalize'>
                  {detail.payout_method ? detail.payout_method.replace('_', ' ') : 'Missing'}
                </Badge>
              </div>

              <div className='space-y-2'>
                <Label htmlFor='creator-payout-method'>Method</Label>
                <Select
                  value={payoutForm.method}
                  onValueChange={(value) => updatePayoutForm('method', value as PayoutMethod)}
                >
                  <SelectTrigger id='creator-payout-method' className='min-h-11 w-full min-w-0 [&>span]:truncate'>
                    <SelectValue placeholder='Select payout method' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='cash'>Cash</SelectItem>
                    <SelectItem value='store_credit'>Store credit</SelectItem>
                    <SelectItem value='points'>Points</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {payoutForm.method === 'cash' && (
                <div className='space-y-2'>
                  <Label htmlFor='creator-paypal-email'>PayPal email</Label>
                  <Input
                    id='creator-paypal-email'
                    type='email'
                    value={payoutForm.paypal_email}
                    onChange={(event) => updatePayoutForm('paypal_email', event.target.value)}
                    placeholder='creator@example.com'
                  />
                </div>
              )}

              {payoutForm.method === 'store_credit' && (
                <div className='space-y-2'>
                  <Label htmlFor='creator-shopify-customer-id'>Shopify customer ID</Label>
                  <Input
                    id='creator-shopify-customer-id'
                    value={payoutForm.shopify_customer_id}
                    onChange={(event) => updatePayoutForm('shopify_customer_id', event.target.value)}
                    placeholder='8088299634883 or gid://shopify/Customer/123'
                  />
                </div>
              )}

              {payoutForm.method === 'points' && (
                <div className='space-y-2'>
                  <Label htmlFor='creator-smile-customer-id'>Smile customer ID</Label>
                  <Input
                    id='creator-smile-customer-id'
                    value={payoutForm.smile_customer_id}
                    onChange={(event) => updatePayoutForm('smile_customer_id', event.target.value)}
                    placeholder='smile_customer_123'
                  />
                </div>
              )}

              <Button size='sm' onClick={requestPayoutMethodSave} disabled={savingPayout} className='min-h-11 gap-1.5'>
                {savingPayout ? <Icons.spinner className='size-3.5 animate-spin' /> : <Icons.creditCard className='size-3.5' />}
                {savingPayout ? 'Saving...' : 'Save Payout Method'}
              </Button>
            </div>
          </TabsContent>

          {/* AI Insights Tab */}
          <TabsContent value='insights' className='mt-4 min-w-0'>
            {analysis ? (
              <div className='min-w-0 space-y-3'>
                <div className='min-w-0 overflow-hidden rounded-lg bg-indigo-500/5 border border-indigo-500/20 p-3'>
                  <pre className='whitespace-pre-wrap break-words text-xs leading-relaxed'>{analysis}</pre>
                </div>
                <div className='flex min-w-0 flex-wrap gap-2'>
                  <Button size='sm' variant='outline' className='min-h-11 gap-1 text-xs' onClick={requestReanalyze} disabled={analyzing || proposing}>
                    {analyzing ? <><Icons.spinner className='size-3 animate-spin' /> Analyzing...</> : <><Icons.sparkles className='size-3' /> Re-analyze</>}
                  </Button>
                  <Button size='sm' variant='outline' className='min-h-11 gap-1 text-xs' onClick={() => void handleAutoPropose(true)} disabled={analyzing || proposing}>
                    <Icons.search className='size-3' /> Preview Proposal
                  </Button>
                  <Button size='sm' className='min-h-11 gap-1 text-xs' onClick={requestAutoPropose} disabled={analyzing || proposing}>
                    {proposing ? <><Icons.spinner className='size-3 animate-spin' /> Saving...</> : <><Icons.send className='size-3' /> Auto-Propose</>}
                  </Button>
                </div>
              </div>
            ) : (
              <div className='text-center py-8'>
                <Icons.sparkles className='mx-auto mb-3 size-8 text-muted-foreground/30' />
                <p className='text-sm font-medium'>No AI analysis yet</p>
                <p className='text-xs text-muted-foreground mt-1 mb-3'>Run an analysis to get insights on this creator</p>
                <Button size='sm' onClick={requestReanalyze} disabled={analyzing || proposing} className='min-h-11 gap-1'>
                  {analyzing ? <><Icons.spinner className='size-3 animate-spin' /> Analyzing...</> : <><Icons.sparkles className='size-3' /> Analyze Creator</>}
                </Button>
              </div>
            )}
          </TabsContent>

          {/* Outreach Tab */}
          <TabsContent value='outreach' className='mt-4 min-w-0'>
            {outreachLoading ? (
              <div className='flex items-center justify-center py-12'>
                <Icons.spinner className='size-5 animate-spin text-muted-foreground' />
              </div>
            ) : outreach.length === 0 ? (
              <div className='flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center'>
                <Icons.send className='text-muted-foreground mb-2 size-6' />
                <p className='text-sm font-medium'>No outreach history</p>
                <p className='text-muted-foreground mt-1 text-xs'>
                  Messages sent to this creator will appear here.
                </p>
              </div>
            ) : (
              <div className='min-w-0 space-y-3'>
                {outreach.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    className='min-w-0 overflow-hidden rounded-lg border bg-card p-3 space-y-2'
                  >
                    <div className='flex min-w-0 items-center justify-between gap-3'>
                      <Badge
                        className={`shrink-0 text-[10px] ${STATUS_COLORS[item.status || 'pending'] || STATUS_COLORS.pending}`}
                      >
                        {(item.status || 'pending').toUpperCase()}
                      </Badge>
                      <span className='min-w-0 break-words text-right text-muted-foreground text-[10px]'>
                        {formatDate(item.created_at || item.sent_at || '')}
                      </span>
                    </div>
                    {item.channel && (
                      <p className='break-words text-muted-foreground text-xs capitalize'>
                        via {item.channel}
                      </p>
                    )}
                    {(item.message || item.message_preview) && (
                      <p className='break-words text-sm leading-relaxed line-clamp-3'>
                        {item.message || item.message_preview}
                      </p>
                    )}
                    {item.subject && (
                      <p className='break-words text-xs text-muted-foreground'>
                        Subject: {item.subject}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Notes Tab */}
          <TabsContent value='notes' className='mt-4 min-w-0'>
            <div className='min-w-0 space-y-3'>
              <p className='text-sm text-muted-foreground'>
                Private notes about this creator. Saved to the active creator profile.
              </p>
              <textarea
                className='w-full min-w-0 min-h-[200px] rounded-lg border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y'
                placeholder='Add notes about this creator...'
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
              <Button size='sm' onClick={saveNotes} disabled={savingNotes} className='min-h-11 gap-1.5'>
                <Icons.check className='size-3.5' />
                {savingNotes ? 'Saving...' : 'Save Notes'}
              </Button>
            </div>
          </TabsContent>

          {/* Similar Tab */}
          <TabsContent value='similar' className='mt-4 min-w-0'>
            {similar.length === 0 ? (
              <p className='text-sm text-muted-foreground text-center py-8'>No similar creators found</p>
            ) : (
              <div className='min-w-0 space-y-3'>
                <p className='text-xs text-muted-foreground'>Creators with similar scores and profiles</p>
                {similar.map((c) => (
                  <div key={c.id || c.handle} className='flex min-w-0 items-center gap-3 overflow-hidden rounded-lg border p-2.5'>
                    <Avatar className='size-8'>
                      <AvatarImage src={c.avatar_url} alt={c.display_name || c.handle} />
                      <AvatarFallback className='text-[10px]'>
                        {(c.display_name || c.handle || '').slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className='min-w-0 flex-1'>
                      <p className='text-xs font-semibold truncate'>@{c.handle}</p>
                      <p className='text-[10px] text-muted-foreground truncate'>{c.display_name}</p>
                    </div>
                    <div className='flex shrink-0 items-center gap-2 text-xs'>
                      <span className='tabular-nums text-muted-foreground'>
                        {(c.follower_count || 0) >= 1000 ? `${((c.follower_count || 0) / 1000).toFixed(1)}K` : c.follower_count || 0}
                      </span>
                      <Badge variant='outline' className='text-[10px] px-1.5'>
                        {c.score || 0}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </SheetContent>
      <AlertDialog open={Boolean(pendingDrawerAction)} onOpenChange={(nextOpen) => !nextOpen && setPendingDrawerAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingDrawerAction === 'proposal'
                ? 'Create proposal draft?'
                : pendingDrawerAction === 'payout'
                  ? 'Save payout method?'
                  : 'Analyze creator?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDrawerAction === 'proposal'
                ? `CreatorOS will save a personalized outreach proposal draft for @${creator.handle}. Use Preview Proposal first if you need a read-only check.`
                : pendingDrawerAction === 'payout'
                  ? `CreatorOS will update how payouts are routed for @${creator.handle}. Confirm the payout destination before saving.`
                : `CreatorOS will run AI analysis for @${creator.handle} and cache the result on this creator profile.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={analyzing || proposing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={analyzing || proposing}
              onClick={() => {
                if (pendingDrawerAction === 'proposal') {
                  void handleAutoPropose();
                } else if (pendingDrawerAction === 'payout') {
                  void savePayoutMethod();
                } else if (pendingDrawerAction === 'analysis') {
                  void handleReanalyze();
                }
              }}
            >
              {pendingDrawerAction === 'proposal'
                ? 'Create proposal'
                : pendingDrawerAction === 'payout'
                  ? 'Save payout method'
                  : 'Analyze creator'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sheet>
  );
}
