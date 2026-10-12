'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Icons } from '@/components/icons';
import { toast } from 'sonner';
import { useBrandStore } from '@/components/org-switcher';
import { withLocalQaMarker } from '@/lib/whitelabel-api';
import type { CreatorCard } from '../utils/store';

interface CreatorDetailDialogProps {
  creator: CreatorCard | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type CreatorDetail = CreatorCard & {
  bio?: string;
  location?: string;
  email?: string;
  niche?: string;
  status?: string;
};

function formatFollowers(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return String(count);
}

function hasUsefulNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function formatOptionalFollowers(count?: number): string {
  return hasUsefulNumber(count) ? formatFollowers(count) : 'Unavailable';
}

function formatOptionalPercent(value?: number): string {
  return hasUsefulNumber(value) ? `${value.toFixed(1)}%` : 'Unavailable';
}

function formatOptionalScore(value?: number): string {
  return hasUsefulNumber(value) ? String(value) : 'Unavailable';
}

function formatMoney(value?: number): string {
  return `$${Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(value?: string | null): string {
  if (!value) return 'Pending';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Pending';
  return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

function isGeneratedAvatar(url?: string) {
  return !url || url.includes('dicebear.com') || url.includes('ui-avatars.com');
}

function getPhotoStatus(data: CreatorDetail, photoLoadFailed: boolean) {
  if (photoLoadFailed) return 'Profile photo unavailable';
  if (!isGeneratedAvatar(data.avatar_url)) return 'Profile photo live';
  const source = typeof data.meta?.profile_photo_source === 'string' ? data.meta.profile_photo_source : '';
  if (source === 'meta_business_discovery_unavailable') return 'Fallback avatar';
  return 'Profile photo queued';
}

function getPlatformLabel(platform: CreatorCard['platform']) {
  if (platform === 'tiktok') return 'TikTok';
  if (platform === 'email') return 'Email';
  return 'Instagram';
}

async function readApiErrorMessage(response: Response, fallback: string) {
  try {
    const payload = await response.json();
    const detail = payload?.detail || payload?.error;
    if (typeof detail === 'string' && detail.trim()) return detail;
  } catch {}
  return fallback;
}

export function CreatorDetailDialog({ creator, open, onOpenChange }: CreatorDetailDialogProps) {
  const activeBrandId = useBrandStore((s) => s.activeBrand.id);
  const [detail, setDetail] = useState<CreatorDetail | null>(null);
  const [photoLoadFailed, setPhotoLoadFailed] = useState(false);
  const [proposalState, setProposalState] = useState<'idle' | 'previewing' | 'previewed' | 'saving' | 'saved' | 'error'>('idle');
  const [proposalError, setProposalError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !creator) return;
    const brandId = activeBrandId;
    setDetail(null);
    setPhotoLoadFailed(false);
    setProposalState('idle');
    setProposalError(null);
    if (!brandId) return;
    fetch(withLocalQaMarker(`/api/proxy/api/creators/${creator.id}?brand_id=${encodeURIComponent(brandId)}`))
      .then((r) => r.ok ? r.json() : null)
      .then((data: CreatorDetail | null) => setDetail(data))
      .catch(() => setDetail(null));
  }, [activeBrandId, open, creator]);

  if (!creator) return null;

  const data: CreatorDetail = detail || { ...creator, status: 'discovered' };
  const orderCount = Number(data.order_count || data.shopify?.order_count || 0);
  const totalSpent = Number(data.total_spent || data.shopify?.total_spent || 0);
  const isShopifyCustomer = Boolean(data.is_shopify_customer || orderCount || totalSpent);
  const customerId = data.shopify_customer_id || data.shopify?.customer_id || '';
  const shopifyStore = data.shopify_store || data.shopify?.store || '';
  const customerSince = data.customer_since || data.shopify?.customer_since;
  const lastOrderAt = data.last_order_at || data.shopify?.last_order_at;
  const photoStatus = getPhotoStatus(data, photoLoadFailed);

  async function handleProposal(dryRun: boolean) {
    if (!creator) return;
    if (!activeBrandId) {
      toast.error('Select a client brand before generating a proposal.');
      return;
    }
    setProposalState(dryRun ? 'previewing' : 'saving');
    setProposalError(null);
    toast.info(dryRun ? 'Previewing proposal...' : 'Creating proposal draft...');
    try {
      const res = await fetch(withLocalQaMarker('/api/proxy/api/outreach'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand_id: activeBrandId,
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
      setProposalState(dryRun ? 'previewed' : 'saved');
      toast.success(dryRun ? 'Proposal preview ready.' : 'Proposal draft saved.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Proposal generation failed';
      setProposalState('error');
      setProposalError(message);
      toast.error(message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-md'>
        <DialogHeader>
          <DialogTitle>Creator Profile</DialogTitle>
        </DialogHeader>
        <div className='space-y-4'>
          <div className='flex items-start gap-3'>
            <Avatar className='size-12 ring-2 ring-border'>
              <AvatarImage
                src={data.avatar_url}
                alt={data.display_name}
                onLoadingStatusChange={(status) => setPhotoLoadFailed(status === 'error')}
              />
              <AvatarFallback>
                {(data.display_name || '').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className='font-semibold'>{data.display_name}</p>
              <p className='text-muted-foreground text-sm'>@{data.handle}</p>
              <div className='mt-1 flex gap-1.5'>
                <Badge variant='secondary' className='text-xs'>
                  {getPlatformLabel(data.platform)}
                </Badge>
                <Badge
                  variant='outline'
                  className={isShopifyCustomer ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'text-muted-foreground'}
                >
                  {isShopifyCustomer ? 'Shopify customer' : 'Prospect'}
                </Badge>
                <Badge variant='outline' className='text-xs capitalize'>
                  {data.status}
                </Badge>
                <Badge variant='outline' className='text-xs'>
                  {photoStatus}
                </Badge>
              </div>
            </div>
          </div>

          <Separator />
          <div className='rounded-lg border bg-muted/30 p-3'>
            <div className='mb-2 flex items-center gap-2 text-sm font-medium'>
              <Icons.product className='size-4 text-emerald-600' />
              Shopify customer data
            </div>
            {isShopifyCustomer ? (
              <div className='space-y-3 text-sm'>
                <div className='grid grid-cols-3 gap-3'>
                  <div>
                    <p className='font-bold tabular-nums'>{orderCount}</p>
                    <p className='text-xs text-muted-foreground'>Orders</p>
                  </div>
                  <div>
                    <p className='font-bold tabular-nums'>{formatMoney(totalSpent)}</p>
                    <p className='text-xs text-muted-foreground'>Lifetime spend</p>
                  </div>
                  <div>
                    <p className='truncate font-mono text-xs font-semibold'>{shopifyStore || 'Shopify'}</p>
                    <p className='text-xs text-muted-foreground'>Store</p>
                  </div>
                </div>
                <div className='grid gap-2 rounded-md border bg-background/70 p-2 text-xs sm:grid-cols-2'>
                  <div>
                    <p className='text-muted-foreground'>Customer ID</p>
                    <p className='truncate font-mono font-semibold'>{customerId || 'Pending'}</p>
                  </div>
                  <div>
                    <p className='text-muted-foreground'>Profile photo</p>
                    <p className='font-semibold'>{photoStatus}</p>
                  </div>
                  <div>
                    <p className='text-muted-foreground'>Customer since</p>
                    <p className='font-semibold'>{formatDate(customerSince)}</p>
                  </div>
                  <div>
                    <p className='text-muted-foreground'>Last order</p>
                    <p className='font-semibold'>{formatDate(lastOrderAt)}</p>
                  </div>
                </div>
              </div>
            ) : (
              <p className='text-xs leading-5 text-muted-foreground'>
                No Shopify customer match is attached to this creator yet.
              </p>
            )}
          </div>

          {data.bio && (
            <>
              <Separator />
              <p className='text-sm text-muted-foreground'>{data.bio}</p>
            </>
          )}

          <Separator />
          <div className='grid grid-cols-3 gap-3 text-center'>
            <div>
              <p className='text-sm font-bold tabular-nums'>{formatOptionalFollowers(data.follower_count)}</p>
              <p className='text-xs text-muted-foreground'>Followers</p>
            </div>
            <div>
              <p className='text-sm font-bold tabular-nums'>{formatOptionalPercent(data.engagement_rate)}</p>
              <p className='text-xs text-muted-foreground'>Engagement</p>
            </div>
            <div>
              <p className='text-sm font-bold tabular-nums'>{formatOptionalScore(data.score)}</p>
              <p className='text-xs text-muted-foreground'>Score</p>
            </div>
          </div>

          {(data.location || data.email || data.niche) && (
            <>
              <Separator />
              <div className='space-y-2 text-sm'>
                {data.location && (
                  <div className='flex justify-between'>
                    <span className='text-muted-foreground'>Location</span>
                    <span>{data.location}</span>
                  </div>
                )}
                {data.niche && (
                  <div className='flex justify-between'>
                    <span className='text-muted-foreground'>Niche</span>
                    <span className='capitalize'>{(data.niche || '').replace(/_/g, ' ')}</span>
                  </div>
                )}
                {data.email && (
                  <div className='flex justify-between'>
                    <span className='text-muted-foreground'>Email</span>
                    <span className='truncate ml-4'>{data.email}</span>
                  </div>
                )}
              </div>
            </>
          )}

          <Separator />
          {proposalState !== 'idle' && (
            <div
              aria-live='polite'
              className={`rounded-lg border p-3 text-xs ${
                proposalState === 'error'
                  ? 'border-red-200 bg-red-50 text-red-700 dark:bg-red-950/20'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20'
              }`}
            >
              {proposalState === 'saved' ? (
                <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
                  <span className='font-medium'>Proposal draft saved</span>
                  <Button asChild size='sm' variant='outline' className='min-h-11 w-fit gap-1 bg-background/80 text-xs'>
                    <Link href='/dashboard/outreach'>
                      <Icons.send className='size-3' />
                      View in Messages
                    </Link>
                  </Button>
                </div>
              ) : proposalState === 'previewed' ? (
                <span className='font-medium'>Proposal preview ready. Save a draft when you are ready.</span>
              ) : proposalState === 'previewing' || proposalState === 'saving' ? (
                <span>{proposalState === 'previewing' ? 'Previewing proposal...' : 'Saving proposal draft...'}</span>
              ) : (
                <span>{proposalError || 'Proposal generation failed'}</span>
              )}
            </div>
          )}
          <div className='grid grid-cols-3 gap-2 pt-2'>
            <Button size='sm' variant='outline' className='min-h-11 flex-1 gap-1 text-xs'
              onClick={async () => {
                if (!creator) return;
                if (!activeBrandId) {
                  toast.error('Select a client brand before analyzing a creator.');
                  return;
                }
                toast.info('Analyzing...');
                try {
                  const res = await fetch(withLocalQaMarker('/api/proxy/api/ai/analyze-creator'), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ brand_id: activeBrandId, handle: creator.handle })
                  });
                  if (!res.ok) throw new Error(await readApiErrorMessage(res, 'CreatorOS could not analyze this creator.'));
                  const payload = await res.json().catch(() => null) as { creator?: CreatorDetail } | null;
                  if (payload?.creator) {
                    setDetail(payload.creator);
                  }
                  toast.success('Analysis complete');
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : 'Analysis failed');
                }
              }}
            >
              <Icons.sparkles className='size-3' /> Analyze
            </Button>
            <Button size='sm' variant='outline' className='min-h-11 flex-1 gap-1 text-xs'
              disabled={proposalState === 'previewing' || proposalState === 'saving' || proposalState === 'saved'}
              onClick={() => handleProposal(true)}
            >
              {proposalState === 'previewing' ? (
                <Icons.spinner className='size-3 animate-spin' />
              ) : (
                <Icons.sparkles className='size-3' />
              )}
              {proposalState === 'previewing' ? 'Previewing' : proposalState === 'previewed' ? 'Previewed' : 'Preview'}
            </Button>
            <Button size='sm' className='min-h-11 flex-1 gap-1 text-xs'
              disabled={proposalState === 'previewing' || proposalState === 'saving' || proposalState === 'saved'}
              onClick={() => handleProposal(false)}
            >
              {proposalState === 'saving' ? (
                <Icons.spinner className='size-3 animate-spin' />
              ) : proposalState === 'saved' ? (
                <Icons.check className='size-3' />
              ) : (
                <Icons.send className='size-3' />
              )}
              {proposalState === 'saving' ? 'Saving' : proposalState === 'saved' ? 'Draft ready' : 'Draft'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
