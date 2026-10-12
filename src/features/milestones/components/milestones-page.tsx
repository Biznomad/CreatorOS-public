'use client';

import { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { useEffectiveBrandId } from '@/hooks/use-effective-brand';
import { withLocalQaMarker } from '@/lib/whitelabel-api';
import { toast } from 'sonner';

const API_BASE = '/api/proxy';

interface MilestoneDefinition {
  id: number;
  title: string;
  threshold: string;
  reward: string;
  icon: string;
}

interface LeaderboardCreator {
  id: string;
  handle: string;
  display_name: string;
  avatar_url: string;
  platform: string;
  score: number;
  milestones_achieved: number;
  total_earned: number;
  pending_rewards: string;
}

function creatorRewardLabel(creator: LeaderboardCreator) {
  return creator.handle ? `@${creator.handle}` : creator.display_name || `creator ${creator.id.slice(0, 8)}`;
}

function pendingRewardText(creator: LeaderboardCreator | null) {
  const reward = creator?.pending_rewards?.trim() || '';
  return reward && reward.toLowerCase() !== 'none' ? reward : null;
}

export default function MilestonesPage() {
  const activeBrandId = useEffectiveBrandId();
  const [milestones, setMilestones] = useState<MilestoneDefinition[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardCreator[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [fulfillingId, setFulfillingId] = useState<string | null>(null);
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const [pendingRewardFulfillment, setPendingRewardFulfillment] = useState<LeaderboardCreator | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);

  useEffect(() => {
    if (!activeBrandId) {
      setMilestones([]);
      setLeaderboard([]);
      setLoadError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchData() {
      setLoading(true);
      setLoadError(null);
      try {
        const [msRes, lbRes] = await Promise.all([
          fetch(withLocalQaMarker(`${API_BASE}/api/milestones?brand_id=${encodeURIComponent(activeBrandId)}`)),
          fetch(withLocalQaMarker(`${API_BASE}/api/milestones/leaderboard?brand_id=${encodeURIComponent(activeBrandId)}&limit=10`))
        ]);

        const milestonePayload = await msRes.json().catch(() => []);
        const leaderboardPayload = await lbRes.json().catch(() => []);
        if (!msRes.ok) {
          throw new Error(milestonePayload.detail || milestonePayload.error || 'Milestones unavailable');
        }
        if (!lbRes.ok) {
          throw new Error(leaderboardPayload.detail || leaderboardPayload.error || 'Leaderboard unavailable');
        }
        if (cancelled) return;
        setMilestones(Array.isArray(milestonePayload) ? milestonePayload : []);
        setLeaderboard(Array.isArray(leaderboardPayload) ? leaderboardPayload : []);
      } catch (error) {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : 'Milestones unavailable';
        setMilestones([]);
        setLeaderboard([]);
        setLoadError(message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void fetchData();

    return () => {
      cancelled = true;
    };
  }, [activeBrandId, refreshNonce]);

  async function previewRewardFulfillment(creator: LeaderboardCreator) {
    if (!activeBrandId) {
      toast.error('Select a client brand before previewing rewards.');
      return;
    }
    const pendingReward = pendingRewardText(creator);
    if (!pendingReward) return;
    setPreviewingId(creator.id);
    try {
      const res = await fetch(withLocalQaMarker(`${API_BASE}/api/milestones/creators/${encodeURIComponent(creator.id)}/reward?brand_id=${encodeURIComponent(activeBrandId)}`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand_id: activeBrandId,
          reward: pendingReward,
          dry_run: true
        })
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.detail || payload.error || 'Reward preview failed');
      toast.success(`Dry run ready: would fulfill ${payload.would_fulfill_reward || pendingReward} for ${creatorRewardLabel(creator)}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Reward preview failed');
    } finally {
      setPreviewingId(null);
    }
  }

  async function fulfillReward(creator: LeaderboardCreator) {
    if (!activeBrandId) {
      toast.error('Select a client brand before fulfilling rewards.');
      return;
    }
    const pendingReward = pendingRewardText(creator);
    if (!pendingReward) return;
    setFulfillingId(creator.id);
    try {
      const res = await fetch(withLocalQaMarker(`${API_BASE}/api/milestones/creators/${encodeURIComponent(creator.id)}/reward?brand_id=${encodeURIComponent(activeBrandId)}`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brand_id: activeBrandId, reward: pendingReward })
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.detail || payload.error || 'Reward fulfillment failed');
      const leaderboardRes = await fetch(withLocalQaMarker(`${API_BASE}/api/milestones/leaderboard?brand_id=${encodeURIComponent(activeBrandId)}&limit=10`));
      const leaderboardPayload = await leaderboardRes.json().catch(() => []);
      if (leaderboardRes.ok && Array.isArray(leaderboardPayload)) {
        setLeaderboard(leaderboardPayload);
      } else {
        setLeaderboard((rows) => rows.map((row) => row.id === creator.id ? { ...row, pending_rewards: 'None' } : row));
      }
      toast.success(`Reward fulfilled for ${creatorRewardLabel(creator)}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Reward fulfillment failed');
    } finally {
      setPendingRewardFulfillment(null);
      setFulfillingId(null);
    }
  }

  function requestRewardFulfillment(creator: LeaderboardCreator) {
    if (!activeBrandId) {
      toast.error('Select a client brand before fulfilling rewards.');
      return;
    }
    if (!pendingRewardText(creator)) return;
    setPendingRewardFulfillment(creator);
  }

  const pendingRewardCopy = pendingRewardText(pendingRewardFulfillment);

  if (loading) {
    return (
      <div className='flex flex-col gap-8'>
        <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className='animate-pulse'>
              <CardHeader className='pb-2'>
                <div className='bg-muted h-10 w-10 rounded-lg' />
              </CardHeader>
              <CardContent>
                <div className='bg-muted h-4 w-24 rounded' />
                <div className='bg-muted mt-2 h-3 w-32 rounded' />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className='flex flex-col gap-8'>
      <AlertDialog open={Boolean(pendingRewardFulfillment)} onOpenChange={(open) => !open && setPendingRewardFulfillment(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Fulfill creator reward?</AlertDialogTitle>
            <AlertDialogDescription>
              CreatorOS will mark {pendingRewardCopy || 'this reward'} fulfilled for {pendingRewardFulfillment ? creatorRewardLabel(pendingRewardFulfillment) : 'the selected creator'} and clear it from pending rewards.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className='min-h-11' disabled={Boolean(fulfillingId)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className='min-h-11'
              aria-label={`Confirm reward fulfillment for ${pendingRewardFulfillment ? creatorRewardLabel(pendingRewardFulfillment) : 'selected creator'}`}
              disabled={Boolean(fulfillingId)}
              onClick={() => {
                if (pendingRewardFulfillment) void fulfillReward(pendingRewardFulfillment);
              }}
            >
              Fulfill reward
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {!activeBrandId && (
        <div className='flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center'>
          <p className='text-muted-foreground text-sm'>Select a workspace to load milestones</p>
        </div>
      )}

      {loadError && (
        <div className='flex flex-col gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive sm:flex-row sm:items-center sm:justify-between'>
          <span className='min-w-0 break-words'>{loadError}</span>
          <Button
            type='button'
            variant='outline'
            size='sm'
            className='min-h-11 w-full shrink-0 sm:w-auto'
            aria-label='Retry milestones and rewards load'
            onClick={() => setRefreshNonce((value) => value + 1)}
          >
            Retry
          </Button>
        </div>
      )}

      {/* Milestone definitions grid */}
      {activeBrandId && (
      <div>
        <h2 className='mb-4 text-lg font-semibold'>Milestone Definitions</h2>
        {milestones.length === 0 ? (
          <div className='flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center'>
            <p className='text-muted-foreground text-sm'>No milestones defined yet</p>
            <p className='text-muted-foreground mt-1 text-xs'>Configure milestones in the API.</p>
          </div>
        ) : (
          <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
            {milestones.map((m) => {
              const iconName = (m.icon || 'sparkles') as keyof typeof Icons;
              const Icon = Icons[iconName] || Icons.sparkles;
              return (
                <Card key={m.id}>
                  <CardHeader className='flex flex-row items-center gap-3 space-y-0 pb-2'>
                    <div className='bg-primary/10 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg'>
                      <Icon className='text-primary h-5 w-5' />
                    </div>
                    <CardTitle className='text-base'>{m.title}</CardTitle>
                  </CardHeader>
                  <CardContent className='flex flex-col gap-2'>
                    <p className='text-muted-foreground text-sm'>{m.threshold}</p>
                    <div className='flex items-center gap-2'>
                      <Icons.exclusive className='h-3.5 w-3.5 text-yellow-500' />
                      <span className='text-sm font-medium'>{m.reward}</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
      )}

      {/* Creator leaderboard */}
      {activeBrandId && (
      <div>
        <h2 className='mb-4 text-lg font-semibold'>Creator Leaderboard</h2>
        {leaderboard.length === 0 ? (
          <div className='flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center'>
            <p className='text-muted-foreground text-sm'>No creators on the leaderboard yet</p>
            <p className='text-muted-foreground mt-1 text-xs'>Onboard creators to see rankings.</p>
          </div>
        ) : (
          <>
          <div className='grid gap-3 md:hidden'>
            {leaderboard.map((creator, idx) => {
              const rank = idx + 1;
              const initials = (creator.display_name || creator.handle).slice(0, 2).toUpperCase();
              const rewardLabel = creatorRewardLabel(creator);
              const pendingReward = pendingRewardText(creator);
              return (
                <div
                  key={creator.id}
                  className={`min-w-0 rounded-lg border p-3 ${idx === 0 ? 'bg-yellow-50/50 dark:bg-yellow-900/10' : ''}`}
                >
                  <div className='flex min-w-0 items-start justify-between gap-3'>
                    <div className='flex min-w-0 items-center gap-3'>
                      <Avatar className='h-10 w-10 shrink-0'>
                        <AvatarImage src={creator.avatar_url} alt={creator.display_name || creator.handle} />
                        <AvatarFallback className='text-xs'>{initials}</AvatarFallback>
                      </Avatar>
                      <div className='min-w-0'>
                        <p className='truncate text-sm font-semibold'>@{creator.handle}</p>
                        <div className='mt-1 flex flex-wrap gap-1.5'>
                          <Badge variant='secondary' className='text-xs'>
                            {creator.platform === 'tiktok' ? 'TikTok' : 'Instagram'}
                          </Badge>
                          <Badge variant='outline' className='text-xs'>
                            Score {creator.score}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className='flex shrink-0 items-center gap-1 text-sm font-bold'>
                      {rank === 1 && <Icons.pro className='h-4 w-4 text-yellow-500' />}
                      #{rank}
                    </div>
                  </div>
                  <dl className='mt-3 grid gap-2 text-sm'>
                    <div className='min-w-0'>
                      <dt className='text-xs font-medium uppercase text-muted-foreground'>Pending rewards</dt>
                      <dd>
                        {!pendingReward ? (
                          <span className='text-muted-foreground'>None pending</span>
                        ) : (
                          <Badge variant='outline' className='max-w-full whitespace-normal text-xs'>
                            {pendingReward}
                          </Badge>
                        )}
                      </dd>
                    </div>
                    <div className='flex items-center justify-between gap-3'>
                      <dt className='text-xs font-medium uppercase text-muted-foreground'>Total earned</dt>
                      <dd className='font-semibold text-green-600 dark:text-green-400'>
                        ${Number(creator.total_earned || 0).toLocaleString()}
                      </dd>
                    </div>
                  </dl>
                  <div className='mt-3'>
                    {!pendingReward ? (
                      <span className='text-muted-foreground text-xs'>Fulfillment complete</span>
                    ) : (
                      <div className='grid grid-cols-2 gap-2'>
                        <Button
                          size='sm'
                          variant='outline'
                          className='min-h-11 min-w-0 gap-1.5 text-xs'
                          aria-label={`Preview reward fulfillment for ${rewardLabel}`}
                          disabled={previewingId === creator.id || fulfillingId === creator.id}
                          onClick={() => void previewRewardFulfillment(creator)}
                        >
                          {previewingId === creator.id ? (
                            <Icons.spinner className='size-3 animate-spin' />
                          ) : (
                            <Icons.checks className='size-3' />
                          )}
                          Dry Run
                        </Button>
                        <Button
                          size='sm'
                          variant='outline'
                          className='min-h-11 min-w-0 gap-1.5 text-xs'
                          aria-label={`Fulfill reward for ${rewardLabel}`}
                          disabled={fulfillingId === creator.id || previewingId === creator.id}
                          onClick={() => requestRewardFulfillment(creator)}
                        >
                          {fulfillingId === creator.id ? (
                            <Icons.spinner className='size-3 animate-spin' />
                          ) : (
                            <Icons.check className='size-3' />
                          )}
                          Fulfill
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <Card className='hidden md:block'>
            <CardContent className='p-0'>
              <div className='overflow-x-auto'>
                <table className='w-full text-sm'>
                  <thead>
                    <tr className='border-b'>
                      <th className='text-muted-foreground px-4 py-3 text-left font-medium'>Rank</th>
                      <th className='text-muted-foreground px-4 py-3 text-left font-medium'>Creator</th>
                      <th className='text-muted-foreground px-4 py-3 text-left font-medium'>Score</th>
                      <th className='text-muted-foreground px-4 py-3 text-left font-medium'>Pending Rewards</th>
                      <th className='text-muted-foreground px-4 py-3 text-left font-medium'>Fulfillment</th>
                      <th className='text-muted-foreground px-4 py-3 text-right font-medium'>Total Earned</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map((creator, idx) => {
                      const rank = idx + 1;
                      const initials = (creator.display_name || creator.handle).slice(0, 2).toUpperCase();
                      const rewardLabel = creatorRewardLabel(creator);
                      const pendingReward = pendingRewardText(creator);
                      return (
                        <tr
                          key={creator.id}
                          className={`border-b last:border-0 ${idx === 0 ? 'bg-yellow-50/50 dark:bg-yellow-900/10' : ''}`}
                        >
                          <td className='px-4 py-3'>
                            <div className='flex items-center gap-1'>
                              {rank === 1 && (
                                <Icons.pro className='h-4 w-4 text-yellow-500' />
                              )}
                              <span className={rank <= 3 ? 'font-bold' : 'text-muted-foreground'}>
                                #{rank}
                              </span>
                            </div>
                          </td>
                          <td className='px-4 py-3'>
                            <div className='flex items-center gap-3'>
                              <Avatar className='h-8 w-8'>
                                <AvatarImage src={creator.avatar_url} alt={creator.display_name || creator.handle} />
                                <AvatarFallback className='text-xs'>{initials}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className='font-medium'>@{creator.handle}</p>
                                <Badge variant='secondary' className='mt-0.5 text-xs'>
                                  {creator.platform === 'tiktok' ? 'TikTok' : 'Instagram'}
                                </Badge>
                              </div>
                            </div>
                          </td>
                          <td className='px-4 py-3'>
                            <span className='font-medium'>{creator.score}</span>
                          </td>
                          <td className='px-4 py-3'>
                            {!pendingReward ? (
                              <span className='text-muted-foreground text-xs'>None pending</span>
                            ) : (
                              <Badge variant='outline' className='max-w-64 whitespace-normal text-xs'>
                                {pendingReward}
                              </Badge>
                            )}
                          </td>
                          <td className='px-4 py-3'>
                            {!pendingReward ? (
                              <span className='text-muted-foreground text-xs'>Complete</span>
                            ) : (
                              <div className='flex flex-wrap gap-2'>
                                <Button
                                  size='sm'
                                  variant='outline'
                                  className='min-h-11 gap-1.5 text-xs'
                                  aria-label={`Preview reward fulfillment for ${rewardLabel}`}
                                  disabled={previewingId === creator.id || fulfillingId === creator.id}
                                  onClick={() => void previewRewardFulfillment(creator)}
                                >
                                  {previewingId === creator.id ? (
                                    <Icons.spinner className='size-3 animate-spin' />
                                  ) : (
                                    <Icons.checks className='size-3' />
                                  )}
                                  Dry Run
                                </Button>
                                <Button
                                  size='sm'
                                  variant='outline'
                                  className='min-h-11 gap-1.5 text-xs'
                                  aria-label={`Fulfill reward for ${rewardLabel}`}
                                  disabled={fulfillingId === creator.id || previewingId === creator.id}
                                  onClick={() => requestRewardFulfillment(creator)}
                                >
                                  {fulfillingId === creator.id ? (
                                    <Icons.spinner className='size-3 animate-spin' />
                                  ) : (
                                    <Icons.check className='size-3' />
                                  )}
                                  Fulfill
                                </Button>
                              </div>
                            )}
                          </td>
                          <td className='px-4 py-3 text-right'>
                            <span className='font-semibold text-green-600 dark:text-green-400'>
                              ${Number(creator.total_earned || 0).toLocaleString()}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
          </>
        )}
      </div>
      )}
    </div>
  );
}
