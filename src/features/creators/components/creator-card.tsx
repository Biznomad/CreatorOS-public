'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
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
import { Icons } from '@/components/icons';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useBrandStore } from '@/components/org-switcher';
import { withLocalQaMarker } from '@/lib/whitelabel-api';
import type { Creator } from '../api/types';
import { CreatorDetailDrawer } from './creator-detail-drawer';

const MAX_MILESTONES = 5;

function formatFollowers(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return String(count);
}

function getScoreColor(score: number): string {
  if (score >= 70) return 'text-green-600 dark:text-green-400';
  if (score >= 40) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-500 dark:text-red-400';
}

function getScoreBg(score: number): string {
  if (score >= 70) return 'bg-green-50 dark:bg-green-950/40';
  if (score >= 40) return 'bg-yellow-50 dark:bg-yellow-950/40';
  return 'bg-red-50 dark:bg-red-950/40';
}

function hasMeasuredValue(value: number) {
  return Number.isFinite(value) && value > 0;
}

function getStatusStyle(status: Creator['status']): string {
  switch (status) {
    case 'active':
      return 'bg-green-100 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-400 dark:border-green-800';
    case 'onboarded':
      return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800';
    case 'negotiating':
      return 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-800';
    case 'replied':
      return 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-800';
    case 'contacted':
      return 'bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-400 dark:border-cyan-800';
    case 'discovered':
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
}

function getPlatformStyle(platform: Creator['platform']): string {
  if (platform === 'instagram') {
    return 'bg-pink-100 text-pink-700 border-pink-200 dark:bg-pink-950/40 dark:text-pink-400 dark:border-pink-800';
  }
  return 'bg-zinc-900 text-zinc-100 border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-600';
}

function formatSource(via: Creator['discovered_via']): string {
  switch (via) {
    case 'shopify_customer':
      return 'Shopify Customer';
    case 'apify':
      return 'Apify Scraper';
    case 'manual':
      return 'Manual';
    case 'application':
      return 'Application';
    default:
      return via;
  }
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

interface CreatorCardProps {
  creator: Creator;
}

export function CreatorCard({ creator }: CreatorCardProps) {
  const {
    handle,
    display_name,
    avatar_url,
    platform,
    location,
    follower_count,
    engagement_rate,
    score,
    status,
    discovered_via,
    milestones_achieved,
    total_earned
  } = creator;

  const activeBrandId = useBrandStore((s) => s.activeBrand.id);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [analyzed, setAnalyzed] = useState(false);
  const [aiRecommendation, setAiRecommendation] = useState<string | null>(null);
  const [pendingCardAction, setPendingCardAction] = useState<'dm' | 'analysis' | null>(null);
  const [busy, setBusy] = useState(false);
  const creatorActionLabel = `@${handle} creator ${creator.id.slice(0, 8)}`;
  const hasEngagement = hasMeasuredValue(engagement_rate);
  const hasScore = hasMeasuredValue(score);

  async function handleGenerateDM(dryRun = false) {
    const brandId = creator.brand_id || activeBrandId;
    if (!brandId) {
      toast.error(`Select a client brand before ${dryRun ? 'previewing' : 'generating'} a DM.`);
      return;
    }

    if (!dryRun) setBusy(true);
    toast.info(`${dryRun ? 'Previewing' : 'Generating'} DM for @${handle}...`);
    try {
      const res = await fetch(withLocalQaMarker('/api/proxy/api/outreach'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand_id: brandId,
          creator_id: creator.id,
          handle: creator.handle,
          platform: creator.platform,
          channel: 'dm',
          dry_run: dryRun
        })
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(result.detail || result.error || `${res.status}`);
      if (dryRun) {
        toast.success(result.message ? `Dry run ready: ${result.message}` : `Dry run ready: would create a DM draft for @${handle}.`);
      } else {
        toast.success(result.existing ? `Existing DM draft found for @${handle}.` : `DM generated for @${handle}! Check AI Proposals to review.`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Failed to ${dryRun ? 'preview' : 'generate'} DM for @${handle}.`);
    } finally {
      if (!dryRun) {
        setPendingCardAction(null);
        setBusy(false);
      }
    }
  }

  async function handleAnalyzeCreator() {
    const brandId = creator.brand_id || activeBrandId;
    if (!brandId) {
      toast.error('Select a client brand before analyzing a creator.');
      return;
    }
    setBusy(true);
    toast.info(`Analyzing @${handle}...`);
    try {
      const res = await fetch(withLocalQaMarker('/api/proxy/api/ai/analyze-creator'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand_id: brandId,
          handle: creator.handle
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || data.error || 'CreatorOS could not analyze this creator.');
      setAnalyzed(true);
      const text = data.analysis || '';
      const match = text.match(/PARTNERSHIP RECOMMENDATION[:\s]*(.+?)(?:\n|$)/i)
        || text.match(/(strong fit|moderate fit|weak fit|excellent|good match|poor match)/i);
      if (match) setAiRecommendation(match[1].trim().slice(0, 40));
      toast.success('Analysis cached — open profile to view');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Analysis failed');
    } finally {
      setPendingCardAction(null);
      setBusy(false);
    }
  }

  function requestGenerateDM() {
    const brandId = creator.brand_id || activeBrandId;
    if (!brandId) {
      toast.error('Select a client brand before generating a DM.');
      return;
    }
    setPendingCardAction('dm');
  }

  function requestAnalyzeCreator() {
    const brandId = creator.brand_id || activeBrandId;
    if (!brandId) {
      toast.error('Select a client brand before analyzing a creator.');
      return;
    }
    setPendingCardAction('analysis');
  }

  function handleViewProfile() {
    setDrawerOpen(true);
  }

  return (
    <Card className='group gap-0 py-0 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5'>
      {/* Header */}
      <CardHeader className='grid-cols-1 gap-0 border-b p-4 pb-3'>
        <div className='flex items-start gap-3'>
          <Avatar className='size-14 shrink-0 ring-2 ring-border'>
            <AvatarImage src={avatar_url} alt={display_name} />
            <AvatarFallback className='text-sm font-semibold'>
              {getInitials(display_name)}
            </AvatarFallback>
          </Avatar>
          <div className='min-w-0 flex-1'>
            <p className='truncate text-sm font-semibold'>@{handle}</p>
            <p className='text-muted-foreground truncate text-xs'>{display_name}</p>
            {location && (
              <p className='text-muted-foreground mt-0.5 flex items-center gap-1 truncate text-xs'>
                <Icons.mapPin className='size-3 shrink-0' />
                {location}
              </p>
            )}
            <div className='mt-1.5 flex flex-wrap gap-1'>
              <span
                className={cn(
                  'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium',
                  getPlatformStyle(platform)
                )}
              >
                {platform === 'instagram' ? 'Instagram' : 'TikTok'}
              </span>
              <span
                className={cn(
                  'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium',
                  discovered_via === 'shopify_customer'
                    ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800'
                    : 'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-800'
                )}
              >
                {discovered_via === 'shopify_customer' ? 'Customer' : 'Discovered'}
              </span>
              {aiRecommendation && (
                <span className={cn(
                  'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium',
                  aiRecommendation.toLowerCase().includes('strong') || aiRecommendation.toLowerCase().includes('excellent')
                    ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-400 dark:border-green-800'
                    : aiRecommendation.toLowerCase().includes('weak') || aiRecommendation.toLowerCase().includes('poor')
                      ? 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800'
                      : 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800'
                )}>
                  <Icons.sparkles className='size-3 mr-1' />
                  {aiRecommendation}
                </span>
              )}
            </div>
          </div>
        </div>
      </CardHeader>

      {/* Stats row */}
      <CardContent className='grid grid-cols-3 divide-x px-0 py-0'>
        <div className='flex flex-col items-center gap-0.5 px-3 py-3'>
          <span className='text-sm font-semibold tabular-nums'>
            {formatFollowers(follower_count)}
          </span>
          <span className='text-muted-foreground text-[10px] uppercase tracking-wide'>
            Followers
          </span>
        </div>
        <div className='flex flex-col items-center gap-0.5 px-3 py-3'>
          <span className={cn('text-sm font-semibold tabular-nums', !hasEngagement && 'text-muted-foreground')}>
            {hasEngagement ? `${engagement_rate.toFixed(1)}%` : 'Pending'}
          </span>
          <span className='text-muted-foreground text-[10px] uppercase tracking-wide'>
            Engagement
          </span>
        </div>
        <div className='flex flex-col items-center gap-0.5 px-3 py-3'>
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                className={cn(
                  'cursor-help rounded-md px-1.5 py-0.5 text-sm font-bold tabular-nums',
                  hasScore ? getScoreBg(score) : 'bg-muted',
                  hasScore ? getScoreColor(score) : 'text-muted-foreground'
                )}
              >
                {hasScore ? score : 'Unscored'}
              </span>
            </TooltipTrigger>
            <TooltipContent side='top' className='max-w-xs'>
              <div className='space-y-1 text-xs'>
                <p className='font-semibold'>{hasScore ? `AI Score: ${score}/100` : 'AI Score pending'}</p>
                <p>
                  {hasScore
                    ? score >= 80 ? 'Excellent match — high priority for outreach' :
                      score >= 60 ? 'Good match — worth considering for partnership' :
                      score >= 40 ? 'Moderate match — review before outreach' :
                      'Low match — may not align with brand criteria'
                    : 'Analyze or enrich this creator before comparing fit.'}
                </p>
              </div>
            </TooltipContent>
          </Tooltip>
          <span className='text-muted-foreground text-[10px] uppercase tracking-wide'>Score</span>
        </div>
      </CardContent>

      {/* Details */}
      <CardContent className='space-y-1.5 border-t px-4 py-3'>
        <div className='flex items-center justify-between text-xs'>
          <span className='text-muted-foreground'>Status</span>
          <span
            className={cn(
              'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium capitalize',
              getStatusStyle(status)
            )}
          >
            {status}
          </span>
        </div>
        <div className='flex items-center justify-between text-xs'>
          <span className='text-muted-foreground'>Source</span>
          <span className='font-medium'>{formatSource(discovered_via)}</span>
        </div>
        {milestones_achieved > 0 && (
          <div className='flex items-center justify-between text-xs'>
            <span className='text-muted-foreground'>Milestones</span>
            <div className='flex gap-0.5'>
              {Array.from({ length: MAX_MILESTONES }).map((_, i) => (
                <span key={i}>
                  {i < milestones_achieved ? (
                    <Icons.starFilled className='size-3 text-yellow-500' />
                  ) : (
                    <Icons.exclusive className='text-muted-foreground/30 size-3' />
                  )}
                </span>
              ))}
            </div>
          </div>
        )}
        <div className='flex items-center justify-between text-xs'>
          <span className='text-muted-foreground'>Earned</span>
          <span className='font-medium tabular-nums'>
            ${total_earned.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </CardContent>

      {/* Actions */}
      <CardFooter className='grid grid-cols-2 gap-2 border-t px-4 py-3'>
        <Button
          variant='outline'
          size='sm'
          className='min-h-11 w-full text-xs'
          aria-label={`Preview DM for ${creatorActionLabel}`}
          onClick={() => void handleGenerateDM(true)}
          disabled={busy}
        >
          <Icons.search className='size-3' />
          Preview DM
        </Button>
        <Button
          variant='outline'
          size='sm'
          className='min-h-11 w-full text-xs'
          aria-label={`Generate DM for ${creatorActionLabel}`}
          onClick={requestGenerateDM}
          disabled={busy}
        >
          <Icons.send className='size-3' />
          Generate DM
        </Button>
        <Button
          variant='outline'
          size='sm'
          className='min-h-11 w-full text-xs'
          aria-label={`${analyzed ? 'View AI analysis for' : 'AI analyze'} ${creatorActionLabel}`}
          onClick={requestAnalyzeCreator}
          disabled={busy}
        >
          {busy && pendingCardAction === 'analysis' ? (
            <><Icons.spinner className='size-3 animate-spin' /> Analyzing...</>
          ) : analyzed ? (
            <><Icons.check className='size-3' /> Analyzed</>
          ) : (
            <><Icons.sparkles className='size-3' /> AI Analyze</>
          )}
        </Button>
        <Button
          variant='default'
          size='sm'
          className='min-h-11 w-full text-xs'
          aria-label={`View profile for ${creatorActionLabel}`}
          onClick={handleViewProfile}
          disabled={busy}
        >
          View Profile
          <Icons.arrowRight className='size-3' />
        </Button>
      </CardFooter>
      <AlertDialog open={Boolean(pendingCardAction)} onOpenChange={(open) => !open && setPendingCardAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingCardAction === 'analysis' ? 'Analyze creator?' : 'Generate DM draft?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingCardAction === 'analysis'
                ? `CreatorOS will run AI analysis for @${handle} and cache the result on this creator profile.`
                : `CreatorOS will create or reuse an outreach DM draft for @${handle}. Use Preview DM first if you need a read-only check.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              aria-label={pendingCardAction === 'analysis' ? `Analyze ${creatorActionLabel}` : `Generate DM for ${creatorActionLabel}`}
              disabled={busy}
              onClick={() => {
                if (pendingCardAction === 'analysis') {
                  void handleAnalyzeCreator();
                } else if (pendingCardAction === 'dm') {
                  void handleGenerateDM();
                }
              }}
            >
              {pendingCardAction === 'analysis' ? 'Analyze creator' : 'Generate DM'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <CreatorDetailDrawer
        creator={creator}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
    </Card>
  );
}
