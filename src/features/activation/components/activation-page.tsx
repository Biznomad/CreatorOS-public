'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Icons } from '@/components/icons';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useBrandStore } from '@/components/org-switcher';

const API_BASE = '/api/proxy';
const DEFAULT_BRAND_ID = process.env.NEXT_PUBLIC_CREATOROS_DEFAULT_BRAND_ID || 'demo-brand';

function shouldUseLocalQaMarker() {
  if (typeof window === 'undefined') return false;
  const isLocalHost =
    window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  if (!isLocalHost) return false;
  if (
    process.env.NEXT_PUBLIC_CREATOROS_QA_AUTH_BYPASS === 'true' ||
    window.location.search.includes('qa=1')
  ) {
    return true;
  }
  try {
    return window.localStorage.getItem('creatoros:qa-auth') === 'true';
  } catch {
    return false;
  }
}

function withLocalQaMarker(path: string) {
  if (!shouldUseLocalQaMarker()) return path;
  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}qa=1`;
}

type Creator = {
  id: string;
  handle: string;
  display_name: string;
  avatar_url?: string;
  follower_count?: number;
  score: number;
  email?: string;
  bio?: string;
  ig_handle?: string;
  order_count: number;
  total_spent: number;
  discovered_via?: string;
  engagement_rate?: number;
  location?: string;
  is_shopify_customer?: boolean;
  shopify?: {
    customer_id?: string;
    store?: string;
    order_count?: number;
    total_spent?: number;
  };
};

type SegmentData = {
  ig_verified: Creator[];
  social_unverified: Creator[];
  email_vips: Creator[];
  counts: {
    ig_verified: number;
    social_unverified: number;
    email_only: number;
  };
};

type IntegrationRecord = {
  connected?: boolean;
  connected_at?: string | null;
  status?: string | null;
};

const EMPTY_SEGMENT_DATA: SegmentData = {
  ig_verified: [],
  social_unverified: [],
  email_vips: [],
  counts: {
    ig_verified: 0,
    social_unverified: 0,
    email_only: 0
  }
};

function normalizeSegmentData(data: Partial<SegmentData> | null | undefined): SegmentData {
  const igVerified = Array.isArray(data?.ig_verified) ? data.ig_verified : [];
  const socialUnverified = Array.isArray(data?.social_unverified) ? data.social_unverified : [];
  const emailVips = Array.isArray(data?.email_vips) ? data.email_vips : [];

  return {
    ig_verified: igVerified,
    social_unverified: socialUnverified,
    email_vips: emailVips,
    counts: {
      ig_verified: Number(data?.counts?.ig_verified ?? igVerified.length),
      social_unverified: Number(data?.counts?.social_unverified ?? socialUnverified.length),
      email_only: Number(data?.counts?.email_only ?? emailVips.length)
    }
  };
}

function isIntegrationConnected(integration?: IntegrationRecord) {
  return Boolean(
    integration?.connected || integration?.connected_at || integration?.status === 'connected'
  );
}

function isValidHandle(handle?: string): boolean {
  if (!handle) return false;
  const alphaRatio = (handle.match(/[a-zA-Z]/g) || []).length / handle.length;
  return handle.length >= 3 && alphaRatio >= 0.5;
}

function initials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function formatMoney(n: number) {
  return n >= 1000 ? `$${(n / 1000).toFixed(1)}K` : `$${n.toFixed(0)}`;
}

function hasUsefulNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function formatFollowers(value?: number) {
  if (!hasUsefulNumber(value)) return 'Unavailable';
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toLocaleString();
}

function formatEngagement(value?: number) {
  if (!hasUsefulNumber(value)) return 'Unavailable';
  return `${value.toFixed(1)}%`;
}

function getCreatorHandleLabel(creator: Creator) {
  return `@${creator.ig_handle || creator.handle}`;
}

function hasShopifyHistory(creator: Creator) {
  return (
    creator.is_shopify_customer ||
    creator.discovered_via === 'shopify_customer' ||
    creator.order_count > 0 ||
    creator.total_spent > 0
  );
}

async function readApiErrorMessage(response: Response, fallback: string) {
  try {
    const payload = await response.json();
    const detail = payload?.detail || payload?.error;
    if (typeof detail === 'string' && detail.trim()) return detail;
  } catch {}
  return fallback;
}

// ─── Whitelisting Ready Card ─────────────────────────────────────────────────

function WhitelistCard({ creator }: { creator: Creator }) {
  const activeBrandId = useBrandStore((s) => s.activeBrand.id);
  const creatorHandle = getCreatorHandleLabel(creator);
  const [proposalState, setProposalState] = useState<
    'idle' | 'previewing' | 'previewed' | 'saving' | 'saved'
  >('idle');
  const [pendingProposalDraft, setPendingProposalDraft] = useState(false);

  async function handleProposal(dryRun: boolean) {
    if (!activeBrandId) {
      toast.error('Select a client brand before generating a proposal.');
      return;
    }
    setProposalState(dryRun ? 'previewing' : 'saving');
    toast.info(
      `${dryRun ? 'Previewing' : 'Creating'} proposal for ${creatorHandle}...`
    );
    try {
      const res = await fetch(withLocalQaMarker('/api/proxy/api/outreach'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand_id: activeBrandId,
          creator_id: creator.id,
          handle: creator.handle || creator.ig_handle,
          platform: 'instagram',
          channel: 'dm',
          dry_run: dryRun
        })
      });
      if (!res.ok) {
        throw new Error(
          await readApiErrorMessage(res, 'CreatorOS could not generate this proposal.')
        );
      }
      setProposalState(dryRun ? 'previewed' : 'saved');
      toast.success(
        dryRun
          ? `Dry run ready for ${creatorHandle}.`
          : `Whitelist proposal draft created for ${creatorHandle}.`
      );
    } catch (error) {
      setProposalState('idle');
      toast.error(
        error instanceof Error ? error.message : 'CreatorOS could not generate this proposal.'
      );
    }
  }

  return (
    <Card className='overflow-hidden transition-all duration-200 hover:border-indigo-500/30 hover:shadow-lg hover:shadow-indigo-500/5'>
      <CardContent className='p-4'>
        <div className='flex items-start gap-3'>
          <Avatar className='size-10 ring-2 ring-indigo-500/20'>
            <AvatarImage src={creator.avatar_url} alt={creator.display_name || creator.handle} />
            <AvatarFallback className='text-xs'>
              {initials(creator.display_name || creator.handle)}
            </AvatarFallback>
          </Avatar>
          <div className='min-w-0 flex-1'>
            <div className='flex items-center gap-1.5'>
              <p className='truncate text-sm font-semibold'>{creator.display_name}</p>
              <Icons.badgeCheck className='size-3.5 shrink-0 text-indigo-500' />
            </div>
            <p className='text-xs text-muted-foreground'>@{creator.ig_handle || creator.handle}</p>
          </div>
          <div className='flex flex-col items-end gap-1'>
            <div className='rounded-md bg-indigo-500/10 px-2 py-0.5 text-xs font-bold tabular-nums text-indigo-600'>
              {creator.score}
            </div>
            {hasUsefulNumber(creator.follower_count) && (
              <span className='text-[10px] text-muted-foreground'>
                {formatFollowers(creator.follower_count)} followers
              </span>
            )}
          </div>
        </div>

        {creator.bio && (
          <p className='mt-2 line-clamp-2 text-xs text-muted-foreground'>{creator.bio}</p>
        )}

        <div className='mt-3 grid grid-cols-4 gap-1 rounded-lg border bg-muted/30 p-2'>
          <div className='text-center'>
            <p className='text-sm font-bold tabular-nums'>
              {formatFollowers(creator.follower_count)}
            </p>
            <p className='text-[10px] text-muted-foreground'>Followers</p>
          </div>
          <div className='text-center'>
            <p className='text-sm font-bold tabular-nums'>
              {formatEngagement(creator.engagement_rate)}
            </p>
            <p className='text-[10px] text-muted-foreground'>Eng. Rate</p>
          </div>
          <div className='text-center'>
            <p className='text-sm font-bold tabular-nums'>{creator.order_count}</p>
            <p className='text-[10px] text-muted-foreground'>Orders</p>
          </div>
          <div className='text-center'>
            <p className='text-sm font-bold tabular-nums'>{formatMoney(creator.total_spent)}</p>
            <p className='text-[10px] text-muted-foreground'>Spent</p>
          </div>
        </div>
        {creator.location && (
          <p className='mt-1.5 flex items-center gap-1 text-[10px] text-muted-foreground'>
            <Icons.mapPin className='size-3 shrink-0' />
            {creator.location}
          </p>
        )}

        <div className='mt-3 grid grid-cols-2 gap-2'>
          <Button
            size='sm'
            variant='outline'
            className='min-h-11 cursor-pointer text-xs'
            disabled={
              proposalState === 'previewing' ||
              proposalState === 'saving' ||
              proposalState === 'saved'
            }
            aria-label={`Preview whitelist proposal for ${creatorHandle}`}
            onClick={() => handleProposal(true)}
          >
            {proposalState === 'previewing' ? (
              <>
                <Icons.spinner className='mr-1 size-3 animate-spin' /> Previewing
              </>
            ) : proposalState === 'previewed' ? (
              <>
                <Icons.check className='mr-1 size-3' /> Previewed
              </>
            ) : (
              <>
                <Icons.sparkles className='mr-1 size-3' /> Preview
              </>
            )}
          </Button>
          <Button
            size='sm'
            className={cn(
              'min-h-11 cursor-pointer text-xs',
              proposalState === 'saved'
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700'
            )}
            disabled={
              proposalState === 'previewing' ||
              proposalState === 'saving' ||
              proposalState === 'saved'
            }
            aria-label={`Create whitelist proposal draft for ${creatorHandle}`}
            onClick={() => setPendingProposalDraft(true)}
          >
            {proposalState === 'saving' ? (
              <>
                <Icons.spinner className='mr-1 size-3 animate-spin' /> Saving
              </>
            ) : proposalState === 'saved' ? (
              <>
                <Icons.check className='mr-1 size-3' /> Draft Ready
              </>
            ) : (
              <>
                <Icons.send className='mr-1 size-3' /> Draft
              </>
            )}
          </Button>
        </div>
        <Badge className='mt-2 w-full justify-center bg-green-500/10 text-green-600 border-green-200 text-[10px]'>
          {hasShopifyHistory(creator)
            ? 'Shopify customer · Ready for Meta Partnership Ads'
            : 'Ready for Meta Partnership Ads'}
        </Badge>
        <AlertDialog open={pendingProposalDraft} onOpenChange={setPendingProposalDraft}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Create whitelist proposal draft?</AlertDialogTitle>
              <AlertDialogDescription>
                CreatorOS will save a whitelist proposal draft for {creatorHandle}. Use Preview first if you need a read-only check.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={proposalState === 'saving'}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                disabled={proposalState === 'saving'}
                aria-label={`Confirm whitelist proposal draft for ${creatorHandle}`}
                onClick={() => void handleProposal(false)}
              >
                Create draft
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}

// ─── Social Detected Card ────────────────────────────────────────────────────

function SocialDetectedCard({ creator }: { creator: Creator }) {
  const activeBrandId = useBrandStore((s) => s.activeBrand.id);
  const creatorHandle = getCreatorHandleLabel(creator);
  const [verifying, setVerifying] = useState(false);

  async function handleVerify() {
    if (!activeBrandId) {
      toast.error('Select a client brand before verifying profiles.');
      return;
    }
    setVerifying(true);
    try {
      const res = await fetch(withLocalQaMarker('/api/proxy/api/enrich'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand_id: activeBrandId,
          creator_id: creator.id,
          handle: creator.ig_handle || creator.handle,
          limit: 1
        })
      });
      if (!res.ok) {
        throw new Error(await readApiErrorMessage(res, 'Failed to verify profile'));
      }
      const data = await res.json();
      toast.success(data.message || 'Enrichment started — profile will update shortly');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to verify profile');
    } finally {
      setVerifying(false);
    }
  }

  return (
    <Card className='transition-all duration-200 hover:shadow-md'>
      <CardContent className='p-4'>
        <div className='flex items-start gap-3'>
          <Avatar className='size-10 ring-2 ring-amber-500/20'>
            <AvatarImage src={creator.avatar_url} alt={creator.display_name || creator.handle} />
            <AvatarFallback className='text-xs'>
              {initials(creator.display_name || creator.handle)}
            </AvatarFallback>
          </Avatar>
          <div className='min-w-0 flex-1'>
            <p className='truncate text-sm font-semibold'>{creator.display_name}</p>
            {isValidHandle(creator.ig_handle || creator.handle) ? (
              <p className='text-xs text-amber-600'>
                @{creator.ig_handle || creator.handle} (unverified)
              </p>
            ) : (
              <p className='text-xs text-muted-foreground'>Social handle not detected</p>
            )}
          </div>
          <div className='rounded-md bg-amber-500/10 px-2 py-0.5 text-xs font-bold tabular-nums text-amber-600'>
            {creator.score}
          </div>
        </div>

        <div className='mt-3 grid grid-cols-2 gap-2 rounded-lg border bg-muted/30 p-2'>
          <div className='text-center'>
            <p className='text-sm font-bold tabular-nums'>{creator.order_count}</p>
            <p className='text-[10px] text-muted-foreground'>Orders</p>
          </div>
          <div className='text-center'>
            <p className='text-sm font-bold tabular-nums'>{formatMoney(creator.total_spent)}</p>
            <p className='text-[10px] text-muted-foreground'>Spent</p>
          </div>
        </div>

        <div className='mt-3 flex gap-2'>
          <Button
            size='sm'
            variant='outline'
            className='min-h-11 flex-1 cursor-pointer text-xs'
            disabled={verifying}
            aria-label={`Verify Instagram profile for ${creatorHandle}`}
            onClick={handleVerify}
          >
            {verifying ? (
              <>
                <Icons.spinner className='mr-1 size-3 animate-spin' /> Verifying...
              </>
            ) : (
              <>
                <Icons.search className='mr-1 size-3' /> Verify IG Profile
              </>
            )}
          </Button>
        </div>
        <Badge
          variant='outline'
          className='mt-2 w-full justify-center text-[10px] border-amber-200 text-amber-600'
        >
          {hasShopifyHistory(creator)
            ? 'Shopify customer · Needs social verification'
            : 'Needs social verification'}
        </Badge>
      </CardContent>
    </Card>
  );
}

// ─── Email VIP Card ──────────────────────────────────────────────────────────

function EmailVIPCard({
  creator,
  approved,
  onApprove
}: {
  creator: Creator;
  approved: boolean;
  onApprove: (creator: Creator) => void;
}) {
  const creatorName = creator.display_name || creator.email || creator.handle;
  return (
    <Card className='transition-all duration-200 hover:shadow-md'>
      <CardContent className='p-4'>
        <div className='flex items-start gap-3'>
          <Avatar className='size-10 ring-2 ring-purple-500/20'>
            <AvatarImage
              src={creator.avatar_url}
              alt={creator.display_name || creator.email || creator.handle}
            />
            <AvatarFallback className='text-xs'>
              {initials(creator.display_name || creator.email || creator.handle)}
            </AvatarFallback>
          </Avatar>
          <div className='min-w-0 flex-1'>
            <p className='truncate text-sm font-semibold'>{creator.display_name}</p>
            <p className='truncate text-xs text-muted-foreground'>{creator.email}</p>
          </div>
          <div className='rounded-md bg-purple-500/10 px-2 py-0.5 text-xs font-bold tabular-nums text-purple-600'>
            {creator.score}
          </div>
        </div>

        <div className='mt-3 grid grid-cols-3 gap-2 rounded-lg border bg-muted/30 p-2'>
          <div className='text-center'>
            <p className='text-sm font-bold tabular-nums'>{creator.order_count}</p>
            <p className='text-[10px] text-muted-foreground'>Orders</p>
          </div>
          <div className='text-center'>
            <p className='text-sm font-bold tabular-nums'>{formatMoney(creator.total_spent)}</p>
            <p className='text-[10px] text-muted-foreground'>Spent</p>
          </div>
          <div className='text-center'>
            <p className='text-sm font-bold tabular-nums text-green-600'>VIP</p>
            <p className='text-[10px] text-muted-foreground'>Tier</p>
          </div>
        </div>

        <div className='mt-3 flex gap-2'>
          <Button
            size='sm'
            className={cn(
              'min-h-11 flex-1 cursor-pointer text-xs',
              approved
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-purple-600 text-white hover:bg-purple-700'
            )}
            disabled={approved}
            aria-label={approved ? `${creatorName} approved for Klaviyo` : `Approve Klaviyo email for ${creatorName}`}
            onClick={() => {
              onApprove(creator);
              toast.success(`Klaviyo email approved for ${creator.display_name}`);
            }}
          >
            {approved ? (
              <>
                <Icons.check className='mr-1 size-3' /> Approved for Klaviyo
              </>
            ) : (
              <>
                <Icons.send className='mr-1 size-3' /> Approve Klaviyo Email
              </>
            )}
          </Button>
        </div>
        <Badge
          variant='outline'
          className='mt-2 w-full justify-center text-[10px] border-purple-200 text-purple-600'
        >
          {hasShopifyHistory(creator)
            ? 'Shopify customer · Email outreach via Klaviyo'
            : 'Email outreach via Klaviyo · No social needed'}
        </Badge>
      </CardContent>
    </Card>
  );
}

// ─── Stats Bar ───────────────────────────────────────────────────────────────

function SegmentStats({ counts }: { counts: SegmentData['counts'] }) {
  const total = counts.ig_verified + counts.social_unverified + counts.email_only;
  return (
    <div className='grid grid-cols-2 gap-4 md:grid-cols-4'>
      <Card>
        <CardContent className='flex items-center gap-3 p-4'>
          <div className='flex size-9 shrink-0 items-center justify-center rounded-lg bg-green-500/10'>
            <Icons.badgeCheck className='size-5 text-green-600' />
          </div>
          <div>
            <p className='text-2xl font-bold tabular-nums'>{counts.ig_verified}</p>
            <p className='text-xs text-muted-foreground'>Whitelist Ready</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className='flex items-center gap-3 p-4'>
          <div className='flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10'>
            <Icons.search className='size-5 text-amber-600' />
          </div>
          <div>
            <p className='text-2xl font-bold tabular-nums'>{counts.social_unverified}</p>
            <p className='text-xs text-muted-foreground'>Social Detected</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className='flex items-center gap-3 p-4'>
          <div className='flex size-9 shrink-0 items-center justify-center rounded-lg bg-purple-500/10'>
            <Icons.send className='size-5 text-purple-600' />
          </div>
          <div>
            <p className='text-2xl font-bold tabular-nums'>{counts.email_only.toLocaleString()}</p>
            <p className='text-xs text-muted-foreground'>Email VIPs</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className='flex items-center gap-3 p-4'>
          <div className='flex size-9 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10'>
            <Icons.teams className='size-5 text-indigo-600' />
          </div>
          <div>
            <p className='text-2xl font-bold tabular-nums'>{total.toLocaleString()}</p>
            <p className='text-xs text-muted-foreground'>Total Addressable</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Filter Toolbar ─────────────────────────────────────────────────────────

type SortKey = 'score' | 'followers' | 'spent' | 'orders';
type TierFilter = 'all' | 'nano' | 'micro' | 'macro';
type SpendFilter = 'all' | 'high' | 'medium' | 'low';
type EngagementFilter = 'all' | 'high' | 'medium' | 'low';

function useCreatorFilters(creators: Creator[]) {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortKey>('score');
  const [tier, setTier] = useState<TierFilter>('all');
  const [spend, setSpend] = useState<SpendFilter>('all');
  const [engagement, setEngagement] = useState<EngagementFilter>('all');
  const [page, setPage] = useState(1);
  const perPage = 24;

  const filtered = useMemo(() => {
    let result = [...creators];

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.display_name?.toLowerCase().includes(q) ||
          c.handle?.toLowerCase().includes(q) ||
          c.ig_handle?.toLowerCase().includes(q) ||
          c.email?.toLowerCase().includes(q)
      );
    }

    // Tier
    if (tier !== 'all') {
      result = result.filter((c) => {
        const f = c.follower_count || 0;
        if (tier === 'nano') return f >= 1000 && f < 10000;
        if (tier === 'micro') return f >= 10000 && f < 100000;
        if (tier === 'macro') return f >= 100000;
        return true;
      });
    }

    // Spend
    if (spend !== 'all') {
      result = result.filter((c) => {
        if (spend === 'high') return c.total_spent >= 500;
        if (spend === 'medium') return c.total_spent >= 100 && c.total_spent < 500;
        if (spend === 'low') return c.total_spent < 100;
        return true;
      });
    }

    // Engagement
    if (engagement !== 'all') {
      result = result.filter((c) => {
        const er = c.engagement_rate || 0;
        if (engagement === 'high') return er >= 3;
        if (engagement === 'medium') return er >= 1 && er < 3;
        if (engagement === 'low') return er < 1;
        return true;
      });
    }

    // Sort
    result.sort((a, b) => {
      if (sort === 'score') return b.score - a.score;
      if (sort === 'followers') return (b.follower_count || 0) - (a.follower_count || 0);
      if (sort === 'spent') return b.total_spent - a.total_spent;
      if (sort === 'orders') return b.order_count - a.order_count;
      return 0;
    });

    return result;
  }, [creators, search, sort, tier, spend, engagement]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paged = filtered.slice((page - 1) * perPage, page * perPage);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [search, sort, tier, spend, engagement]);

  return {
    search,
    setSearch,
    sort,
    setSort,
    tier,
    setTier,
    spend,
    setSpend,
    engagement,
    setEngagement,
    page,
    setPage,
    filtered,
    paged,
    totalPages,
    perPage
  };
}

function FilterToolbar({
  search,
  setSearch,
  sort,
  setSort,
  tier,
  setTier,
  spend,
  setSpend,
  engagement,
  setEngagement,
  filteredCount,
  totalCount
}: {
  search: string;
  setSearch: (v: string) => void;
  sort: SortKey;
  setSort: (v: SortKey) => void;
  tier: TierFilter;
  setTier: (v: TierFilter) => void;
  spend: SpendFilter;
  setSpend: (v: SpendFilter) => void;
  engagement: EngagementFilter;
  setEngagement: (v: EngagementFilter) => void;
  filteredCount: number;
  totalCount: number;
}) {
  return (
    <div className='flex flex-col gap-3 rounded-lg border bg-muted/20 p-3'>
      <div className='flex flex-wrap items-center gap-3'>
        <Input
          aria-label='Search activation creators'
          placeholder='Search by name, handle, or email...'
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className='min-h-11 w-full sm:max-w-xs text-xs'
        />
        <Select value={sort} onValueChange={(v: SortKey) => setSort(v)}>
          <SelectTrigger
            className='min-h-11 w-full sm:w-[140px] text-xs'
            aria-label='Sort activation creators'
          >
            <SelectValue placeholder='Sort by' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='score'>Score (high)</SelectItem>
            <SelectItem value='followers'>Followers (high)</SelectItem>
            <SelectItem value='spent'>Spend (high)</SelectItem>
            <SelectItem value='orders'>Orders (high)</SelectItem>
          </SelectContent>
        </Select>
        <Select value={tier} onValueChange={(v: TierFilter) => setTier(v)}>
          <SelectTrigger
            className='min-h-11 w-[calc(50%-6px)] sm:w-[130px] text-xs'
            aria-label='Filter activation creators by follower tier'
          >
            <SelectValue placeholder='Tier' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>All Tiers</SelectItem>
            <SelectItem value='nano'>Nano (1K-10K)</SelectItem>
            <SelectItem value='micro'>Micro (10K-100K)</SelectItem>
            <SelectItem value='macro'>Macro (100K+)</SelectItem>
          </SelectContent>
        </Select>
        <Select value={spend} onValueChange={(v: SpendFilter) => setSpend(v)}>
          <SelectTrigger
            className='min-h-11 w-[calc(50%-6px)] sm:w-[140px] text-xs'
            aria-label='Filter activation creators by spend'
          >
            <SelectValue placeholder='Spend' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>All Spend</SelectItem>
            <SelectItem value='high'>$500+ (VIP)</SelectItem>
            <SelectItem value='medium'>$100-500</SelectItem>
            <SelectItem value='low'>Under $100</SelectItem>
          </SelectContent>
        </Select>
        <Select value={engagement} onValueChange={(v: EngagementFilter) => setEngagement(v)}>
          <SelectTrigger
            className='min-h-11 w-full sm:w-[140px] text-xs'
            aria-label='Filter activation creators by engagement'
          >
            <SelectValue placeholder='Engagement' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>All Engagement</SelectItem>
            <SelectItem value='high'>High (3%+)</SelectItem>
            <SelectItem value='medium'>Medium (1-3%)</SelectItem>
            <SelectItem value='low'>{'Low (<1%)'}</SelectItem>
          </SelectContent>
        </Select>
        <span className='ml-auto text-xs text-muted-foreground'>
          {filteredCount === totalCount
            ? `${totalCount} total`
            : `${filteredCount} of ${totalCount}`}
        </span>
      </div>
    </div>
  );
}

function PaginationBar({
  page,
  setPage,
  totalPages,
  perPage,
  totalItems
}: {
  page: number;
  setPage: (p: number) => void;
  totalPages: number;
  perPage: number;
  totalItems: number;
}) {
  if (totalPages <= 1) return null;
  const start = (page - 1) * perPage + 1;
  const end = Math.min(page * perPage, totalItems);
  return (
    <div className='flex items-center justify-between border-t pt-3'>
      <span className='text-xs text-muted-foreground'>
        {start}–{end} of {totalItems}
      </span>
      <div className='flex items-center gap-1'>
        <Button
          aria-label='Go to first activation page'
          variant='outline'
          size='icon'
          className='size-11'
          disabled={page <= 1}
          onClick={() => setPage(1)}
        >
          <Icons.chevronsLeft className='size-3.5' />
        </Button>
        <Button
          aria-label='Go to previous activation page'
          variant='outline'
          size='icon'
          className='size-11'
          disabled={page <= 1}
          onClick={() => setPage(page - 1)}
        >
          <Icons.chevronLeft className='size-3.5' />
        </Button>
        <span className='px-2 text-xs font-medium'>
          Page {page} of {totalPages}
        </span>
        <Button
          aria-label='Go to next activation page'
          variant='outline'
          size='icon'
          className='size-11'
          disabled={page >= totalPages}
          onClick={() => setPage(page + 1)}
        >
          <Icons.chevronRight className='size-3.5' />
        </Button>
        <Button
          aria-label='Go to last activation page'
          variant='outline'
          size='icon'
          className='size-11'
          disabled={page >= totalPages}
          onClick={() => setPage(totalPages)}
        >
          <Icons.chevronsRight className='size-3.5' />
        </Button>
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function ActivationPage() {
  const activeBrandId = useBrandStore((s) => s.activeBrand.id);
  const effectiveBrandId = activeBrandId || DEFAULT_BRAND_ID;
  const fetchBrands = useBrandStore((s) => s.fetchBrands);
  const [data, setData] = useState<SegmentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [sourceTab, setSourceTab] = useState<'all' | 'shopify' | 'discovered'>('all');
  const [approvedEmailIds, setApprovedEmailIds] = useState<Set<string>>(new Set());
  const [syncingKlaviyo, setSyncingKlaviyo] = useState(false);
  const [previewingKlaviyo, setPreviewingKlaviyo] = useState(false);
  const [pendingKlaviyoSync, setPendingKlaviyoSync] = useState(false);
  const [klaviyoConnected, setKlaviyoConnected] = useState<boolean | null>(null);

  const whitelistFilters = useCreatorFilters(data?.ig_verified || []);
  const socialFilters = useCreatorFilters(data?.social_unverified || []);
  const emailFilters = useCreatorFilters(data?.email_vips || []);

  useEffect(() => {
    void fetchBrands();
  }, [fetchBrands]);

  useEffect(() => {
    if (!effectiveBrandId) {
      setData(EMPTY_SEGMENT_DATA);
      setApprovedEmailIds(new Set());
      setKlaviyoConnected(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    const sourceParam =
      sourceTab === 'shopify'
        ? '&source=shopify_customer'
        : sourceTab === 'discovered'
          ? '&source=discovered'
          : '';
    fetch(
      withLocalQaMarker(
        `${API_BASE}/api/creators/segments?brand_id=${encodeURIComponent(effectiveBrandId)}&limit=500${sourceParam}`
      )
    )
      .then(async (r) => {
        if (!r.ok) {
          throw new Error(`${r.status}`);
        }
        return r.json();
      })
      .then((d) => {
        if (!cancelled) setData(normalizeSegmentData(d));
      })
      .catch(() => {
        if (!cancelled) setData(EMPTY_SEGMENT_DATA);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [effectiveBrandId, sourceTab]);

  useEffect(() => {
    if (!effectiveBrandId) {
      setKlaviyoConnected(null);
      return;
    }

    let cancelled = false;
    fetch(
      withLocalQaMarker(
        `${API_BASE}/api/brands/${encodeURIComponent(effectiveBrandId)}/integrations`
      )
    )
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));
        if (!response.ok)
          throw new Error(payload.detail || payload.error || 'Integrations unavailable');
        if (!cancelled) setKlaviyoConnected(isIntegrationConnected(payload.klaviyo));
      })
      .catch(() => {
        if (!cancelled) setKlaviyoConnected(null);
      });

    return () => {
      cancelled = true;
    };
  }, [effectiveBrandId]);

  function approveEmailVip(creator: Creator) {
    setApprovedEmailIds((current) => new Set([...current, creator.id]));
  }

  function approveAllEmailVips() {
    const ids = (data?.email_vips || []).map((creator) => creator.id);
    setApprovedEmailIds(new Set(ids));
    toast.success(`All ${ids.length.toLocaleString()} email VIPs approved for Klaviyo outreach.`);
  }

  function getApprovedEmailCreatorIds() {
    return [...approvedEmailIds];
  }

  async function previewKlaviyoSync() {
    if (!effectiveBrandId) {
      toast.error('Select a client brand before previewing Klaviyo sync.');
      return;
    }
    const creatorIds = getApprovedEmailCreatorIds();
    if (!creatorIds.length) {
      toast.error('Approve at least one email VIP before previewing Klaviyo sync.');
      return;
    }
    setPreviewingKlaviyo(true);
    try {
      const response = await fetch(withLocalQaMarker(`${API_BASE}/api/activation/klaviyo-sync`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand_id: effectiveBrandId,
          creator_ids: creatorIds,
          dry_run: true
        })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.detail || result.error || 'Klaviyo dry run failed');
      }
      const profileCount = Number(result.profile_count || 0).toLocaleString();
      const outreachCount = Number(result.would_create_outreach_rows || 0).toLocaleString();
      const connectionNote =
        result.klaviyo_connected === false ? ' Connect Klaviyo before live sync.' : '';
      toast.success(
        `Dry run ready: ${profileCount} profiles and ${outreachCount} outreach rows would be created.${connectionNote}`
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Klaviyo dry run failed');
    } finally {
      setPreviewingKlaviyo(false);
    }
  }

  async function syncApprovedToKlaviyo() {
    if (!effectiveBrandId) {
      toast.error('Select a client brand before syncing to Klaviyo.');
      return;
    }
    const creatorIds = getApprovedEmailCreatorIds();
    if (!creatorIds.length) {
      toast.error('Approve at least one email VIP before syncing to Klaviyo.');
      return;
    }
    if (klaviyoConnected === false) {
      toast.error('Connect Klaviyo before syncing approved VIPs.');
      return;
    }
    setSyncingKlaviyo(true);
    try {
      const response = await fetch(withLocalQaMarker(`${API_BASE}/api/activation/klaviyo-sync`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand_id: effectiveBrandId,
          creator_ids: creatorIds
        })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.detail || result.error || 'Klaviyo sync failed');
      }
      setApprovedEmailIds(new Set());
      toast.success(
        `Synced ${Number(result.synced || 0).toLocaleString()} approved VIPs to Klaviyo.`
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Klaviyo sync failed');
    } finally {
      setPendingKlaviyoSync(false);
      setSyncingKlaviyo(false);
    }
  }

  function requestKlaviyoSync() {
    if (!effectiveBrandId) {
      toast.error('Select a client brand before syncing to Klaviyo.');
      return;
    }
    const creatorIds = getApprovedEmailCreatorIds();
    if (!creatorIds.length) {
      toast.error('Approve at least one email VIP before syncing to Klaviyo.');
      return;
    }
    if (klaviyoConnected === false) {
      toast.error('Connect Klaviyo before syncing approved VIPs.');
      return;
    }
    setPendingKlaviyoSync(true);
  }

  if (loading) {
    return (
      <div className='flex flex-col gap-6'>
        <Alert>
          <Icons.spinner className='size-4 animate-spin' />
          <AlertTitle>Loading creator activation segments</AlertTitle>
          <AlertDescription>
            CreatorOS is grouping whitelisting-ready creators, social profiles, and email VIPs for
            the selected brand.
          </AlertDescription>
        </Alert>
        <div className='grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4'>
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className='animate-pulse'>
              <CardContent className='flex items-center gap-3 p-4'>
                <div className='bg-muted size-9 shrink-0 rounded-lg' />
                <div className='min-w-0 flex-1 space-y-2'>
                  <div className='bg-muted h-5 w-16 rounded' />
                  <div className='bg-muted h-3 w-full max-w-28 rounded' />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className='flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center'>
        <Icons.teams className='text-muted-foreground mx-auto mb-3 size-8' />
        <p className='text-muted-foreground text-sm'>Unable to load creator segments</p>
      </div>
    );
  }

  const counts = data.counts;
  const needsKlaviyoSetup = klaviyoConnected === false;

  return (
    <div className='flex flex-col gap-6'>
      {/* Source tabs */}
      <Tabs
        value={sourceTab}
        onValueChange={(v) => setSourceTab(v as 'all' | 'shopify' | 'discovered')}
      >
        <TabsList className='flex min-h-11 w-full max-w-full min-w-0 justify-start overflow-x-auto overflow-y-hidden'>
          <TabsTrigger value='all' className='min-h-11 shrink-0 cursor-pointer gap-1.5 text-xs'>
            <Icons.teams className='size-3.5' />
            All Creators
          </TabsTrigger>
          <TabsTrigger value='shopify' className='min-h-11 shrink-0 cursor-pointer gap-1.5 text-xs'>
            <Icons.product className='size-3.5 text-emerald-600' />
            Shopify Customers
          </TabsTrigger>
          <TabsTrigger value='discovered' className='min-h-11 shrink-0 cursor-pointer gap-1.5 text-xs'>
            <Icons.search className='size-3.5 text-indigo-600' />
            Discovered
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <SegmentStats counts={counts} />

      {/* Segment tabs */}
      <Tabs defaultValue='whitelist' className='w-full'>
        <TabsList className='grid min-h-11 w-full max-w-full min-w-0 grid-cols-3 overflow-hidden'>
          <TabsTrigger value='whitelist' className='min-h-11 min-w-0 cursor-pointer gap-1 px-1 text-xs sm:gap-2 sm:px-3 sm:text-sm'>
            <Icons.badgeCheck className='size-3.5 text-green-600' />
            <span className='hidden sm:inline'>Whitelist Ready</span>
            <span className='sm:hidden'>Ready</span>
            <span>({counts.ig_verified})</span>
          </TabsTrigger>
          <TabsTrigger value='social' className='min-h-11 min-w-0 cursor-pointer gap-1 px-1 text-xs sm:gap-2 sm:px-3 sm:text-sm'>
            <Icons.search className='size-3.5 text-amber-600' />
            <span className='hidden sm:inline'>Social Detected</span>
            <span className='sm:hidden'>Social</span>
            <span>({counts.social_unverified})</span>
          </TabsTrigger>
          <TabsTrigger value='email' className='min-h-11 min-w-0 cursor-pointer gap-1 px-1 text-xs sm:gap-2 sm:px-3 sm:text-sm'>
            <Icons.send className='size-3.5 text-purple-600' />
            <span className='hidden sm:inline'>Email VIPs</span>
            <span className='sm:hidden'>Email</span>
            <span>({counts.email_only.toLocaleString()})</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value='whitelist' className='mt-6 space-y-4'>
          <FilterToolbar
            search={whitelistFilters.search}
            setSearch={whitelistFilters.setSearch}
            sort={whitelistFilters.sort}
            setSort={whitelistFilters.setSort}
            tier={whitelistFilters.tier}
            setTier={whitelistFilters.setTier}
            spend={whitelistFilters.spend}
            setSpend={whitelistFilters.setSpend}
            engagement={whitelistFilters.engagement}
            setEngagement={whitelistFilters.setEngagement}
            filteredCount={whitelistFilters.filtered.length}
            totalCount={data?.ig_verified.length || 0}
          />
          {whitelistFilters.paged.length === 0 ? (
            <div className='flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center'>
              <Icons.badgeCheck className='text-muted-foreground mx-auto mb-3 size-8' />
              <p className='text-sm font-medium'>No creators match your filters</p>
              <p className='text-muted-foreground mt-1 text-xs'>
                Try adjusting your search or filter criteria.
              </p>
            </div>
          ) : (
            <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
              {whitelistFilters.paged.map((c) => (
                <WhitelistCard key={c.id} creator={c} />
              ))}
            </div>
          )}
          <PaginationBar
            page={whitelistFilters.page}
            setPage={whitelistFilters.setPage}
            totalPages={whitelistFilters.totalPages}
            perPage={whitelistFilters.perPage}
            totalItems={whitelistFilters.filtered.length}
          />
          <div className='rounded-lg border border-green-500/20 bg-green-500/5 p-4 text-center'>
            <p className='text-sm font-medium text-green-700 dark:text-green-300'>
              These creators have verified Instagram accounts and can run Meta Partnership Ads
              (whitelisted ads) through their profiles.
            </p>
          </div>
        </TabsContent>

        <TabsContent value='social' className='mt-6 space-y-4'>
          <FilterToolbar
            search={socialFilters.search}
            setSearch={socialFilters.setSearch}
            sort={socialFilters.sort}
            setSort={socialFilters.setSort}
            tier={socialFilters.tier}
            setTier={socialFilters.setTier}
            spend={socialFilters.spend}
            setSpend={socialFilters.setSpend}
            engagement={socialFilters.engagement}
            setEngagement={socialFilters.setEngagement}
            filteredCount={socialFilters.filtered.length}
            totalCount={data?.social_unverified.length || 0}
          />
          {socialFilters.paged.length === 0 ? (
            <div className='flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center'>
              <Icons.search className='text-muted-foreground mx-auto mb-3 size-8' />
              <p className='text-sm font-medium'>No creators match your filters</p>
            </div>
          ) : (
            <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
              {socialFilters.paged.map((c) => (
                <SocialDetectedCard key={c.id} creator={c} />
              ))}
            </div>
          )}
          <PaginationBar
            page={socialFilters.page}
            setPage={socialFilters.setPage}
            totalPages={socialFilters.totalPages}
            perPage={socialFilters.perPage}
            totalItems={socialFilters.filtered.length}
          />
          <div className='rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 text-center'>
            <p className='text-sm font-medium text-amber-700 dark:text-amber-300'>
              These customers have potential social handles detected from email or Shopify tags.
              Verify each to confirm the IG account exists and matches.
            </p>
          </div>
        </TabsContent>

        <TabsContent value='email' className='mt-6 space-y-4'>
          <Card>
            <CardHeader className='border-b pb-3'>
              <CardTitle className='flex items-center gap-2 text-base'>
                <Icons.send className='size-4 text-purple-600' />
                Klaviyo Email Activation
              </CardTitle>
            </CardHeader>
            <CardContent className='flex flex-wrap items-center gap-3 pt-4'>
              {needsKlaviyoSetup && (
                <Alert className='w-full'>
                  <Icons.info className='size-4' />
                  <AlertTitle>Connect Klaviyo to sync email VIPs</AlertTitle>
                  <AlertDescription>
                    This workspace needs a Klaviyo API key before CreatorOS can send approved
                    customer profiles into an activation list.
                  </AlertDescription>
                </Alert>
              )}
              <span className='text-sm text-muted-foreground'>
                {needsKlaviyoSetup
                  ? 'Approve VIP customers below, then connect Klaviyo before syncing them into email activation.'
                  : 'Approve VIP customers below to send partnership emails via Klaviyo.'}
              </span>
              <Button
                size='sm'
                className='min-h-11 cursor-pointer gap-2 bg-purple-600 text-white hover:bg-purple-700'
                onClick={approveAllEmailVips}
              >
                <Icons.checks className='size-3.5' />
                Approve All ({(data?.email_vips.length || counts.email_only).toLocaleString()})
              </Button>
              <Button
                size='sm'
                variant='outline'
                className='min-h-11 cursor-pointer gap-2'
                disabled={syncingKlaviyo || previewingKlaviyo || approvedEmailIds.size === 0}
                onClick={previewKlaviyoSync}
              >
                {previewingKlaviyo ? (
                  <Icons.spinner className='size-3.5 animate-spin' />
                ) : (
                  <Icons.checks className='size-3.5' />
                )}
                Dry Run
              </Button>
              <Button
                size='sm'
                variant='outline'
                className='min-h-11 cursor-pointer gap-2'
                disabled={
                  syncingKlaviyo ||
                  previewingKlaviyo ||
                  approvedEmailIds.size === 0 ||
                  needsKlaviyoSetup
                }
                onClick={requestKlaviyoSync}
              >
                {syncingKlaviyo ? (
                  <Icons.spinner className='size-3.5 animate-spin' />
                ) : (
                  <Icons.upload className='size-3.5' />
                )}
                Sync to Klaviyo ({approvedEmailIds.size.toLocaleString()})
              </Button>
              {needsKlaviyoSetup && (
                <Button asChild size='sm' variant='outline' className='min-h-11 cursor-pointer gap-2'>
                  <Link href='/dashboard/integrations'>
                    <Icons.settings className='size-3.5' />
                    Connect Klaviyo
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>

          <FilterToolbar
            search={emailFilters.search}
            setSearch={emailFilters.setSearch}
            sort={emailFilters.sort}
            setSort={emailFilters.setSort}
            tier={emailFilters.tier}
            setTier={emailFilters.setTier}
            spend={emailFilters.spend}
            setSpend={emailFilters.setSpend}
            engagement={emailFilters.engagement}
            setEngagement={emailFilters.setEngagement}
            filteredCount={emailFilters.filtered.length}
            totalCount={data?.email_vips.length || 0}
          />
          {emailFilters.paged.length === 0 ? (
            <div className='flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center'>
              <Icons.send className='text-muted-foreground mx-auto mb-3 size-8' />
              <p className='text-sm font-medium'>No VIPs match your filters</p>
            </div>
          ) : (
            <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
              {emailFilters.paged.map((c) => (
                <EmailVIPCard
                  key={c.id}
                  creator={c}
                  approved={approvedEmailIds.has(c.id)}
                  onApprove={approveEmailVip}
                />
              ))}
            </div>
          )}
          <PaginationBar
            page={emailFilters.page}
            setPage={emailFilters.setPage}
            totalPages={emailFilters.totalPages}
            perPage={emailFilters.perPage}
            totalItems={emailFilters.filtered.length}
          />
          <div className='rounded-lg border border-purple-500/20 bg-purple-500/5 p-4 text-center'>
            <p className='text-sm font-medium text-purple-700 dark:text-purple-300'>
              These high-value customers have no social profiles detected. Activate them as
              affiliates via Klaviyo email with unique discount codes — no whitelisting needed.
            </p>
          </div>
        </TabsContent>
      </Tabs>
      <AlertDialog open={pendingKlaviyoSync} onOpenChange={setPendingKlaviyoSync}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sync approved VIPs to Klaviyo?</AlertDialogTitle>
            <AlertDialogDescription>
              CreatorOS will sync {approvedEmailIds.size.toLocaleString()} approved VIP customer{approvedEmailIds.size === 1 ? '' : 's'} to Klaviyo and create outreach rows. Use Preview Sync first if you need a read-only check.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={syncingKlaviyo}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={syncingKlaviyo} onClick={() => void syncApprovedToKlaviyo()}>
              Sync to Klaviyo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
