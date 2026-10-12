'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Icons } from '@/components/icons';
import { toast } from 'sonner';
import { useEffectiveBrandId } from '@/hooks/use-effective-brand';
import { withLocalQaMarker } from '@/lib/whitelabel-api';

type SmartQueueCreator = {
  id: string;
  handle: string;
  platform?: 'instagram' | 'tiktok';
  display_name?: string;
  avatar_url?: string;
  priority?: 'high' | 'medium' | 'low';
  discovered_via?: string;
  ai_action?: string;
  follower_count?: number;
  engagement_rate?: number;
  score?: number;
};

type SavedBrief = {
  id: string;
  title?: string;
  handle?: string;
  platform?: string;
  content_type?: string;
  created_at?: string;
  scripts?: Array<{ title?: string; content?: string }>;
  visual_notes?: string;
};

async function readApiErrorMessage(response: Response, fallback: string) {
  try {
    const payload = await response.json();
    const detail = payload?.detail || payload?.error;
    if (typeof detail === 'string' && detail.trim()) return detail;
  } catch {}
  return fallback;
}

async function readJsonResponse(response: Response) {
  return response.json().catch(() => ({}));
}

function cleanHandle(value: string) {
  return value.trim().replace(/^@+/, '');
}

function hasUsefulNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function formatFollowers(value?: number) {
  if (!hasUsefulNumber(value)) return 'Followers unavailable';
  return value >= 1000 ? `${(value / 1000).toFixed(1)}K` : String(value);
}

function formatEngagement(value?: number) {
  return hasUsefulNumber(value) ? `${value.toFixed(1)}%` : 'ER unavailable';
}

function formatScore(value?: number) {
  return hasUsefulNumber(value) ? String(value) : 'Score unavailable';
}

function SmartQueue() {
  const activeBrandId = useEffectiveBrandId();
  const [queue, setQueue] = useState<SmartQueueCreator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [proposalAction, setProposalAction] = useState<string | null>(null);
  const [pendingDraftCreator, setPendingDraftCreator] = useState<SmartQueueCreator | null>(null);

  useEffect(() => {
    if (!activeBrandId) {
      setQueue([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    fetch(withLocalQaMarker(`/api/proxy/api/ai/smart-queue?brand_id=${encodeURIComponent(activeBrandId)}&limit=10`))
      .then(async (response) => {
        if (!response.ok) throw new Error(await readApiErrorMessage(response, 'Smart queue could not be loaded.'));
        return response.json();
      })
      .then((data) => setQueue(Array.isArray(data.queue) ? data.queue : []))
      .catch((loadError) => {
        setQueue([]);
        setError(loadError instanceof Error ? loadError.message : 'Smart queue could not be loaded.');
      })
      .finally(() => setLoading(false));
  }, [activeBrandId]);

  async function handleProposal(creator: SmartQueueCreator, dryRun: boolean) {
    if (!activeBrandId) {
      toast.error('Select a client brand before generating proposals.');
      return;
    }
    const actionKey = `${creator.id}:${dryRun ? 'preview' : 'draft'}`;
    setProposalAction(actionKey);
    toast.info(`${dryRun ? 'Previewing' : 'Creating'} proposal for @${creator.handle}...`);
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
      toast.success(dryRun
        ? `Dry run ready for @${creator.handle}.`
        : `Proposal draft created for @${creator.handle}.`
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'CreatorOS could not generate this proposal.');
    } finally {
      if (!dryRun) setPendingDraftCreator(null);
      setProposalAction((current) => (current === actionKey ? null : current));
    }
  }

  function requestProposalDraft(creator: SmartQueueCreator) {
    if (!activeBrandId) {
      toast.error('Select a client brand before generating proposals.');
      return;
    }
    setPendingDraftCreator(creator);
  }

  if (loading) {
    return (
      <Card className='md:col-span-2'>
        <CardContent className='p-6'>
          <div className='animate-pulse space-y-3'>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className='h-16 bg-muted rounded-lg' />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className='md:col-span-2'>
      <AlertDialog open={Boolean(pendingDraftCreator)} onOpenChange={(open) => !open && setPendingDraftCreator(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Create proposal draft?</AlertDialogTitle>
            <AlertDialogDescription>
              CreatorOS will create or reuse a proposal draft for @{pendingDraftCreator?.handle || 'this creator'} in the Outreach CRM. Use Preview first if you want a read-only check.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={proposalAction !== null}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              aria-label={`Confirm proposal draft for @${pendingDraftCreator?.handle || 'selected creator'}`}
              disabled={proposalAction !== null}
              onClick={() => {
                if (pendingDraftCreator) void handleProposal(pendingDraftCreator, false);
              }}
            >
              Create draft
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <CardHeader>
        <CardTitle className='flex items-center gap-2'>
          <Icons.trendingUp className='size-5 text-green-600' />
          AI Smart Queue
          <Badge variant='secondary' className='ml-auto text-xs'>{queue.length} creators</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className='text-sm text-muted-foreground mb-4'>
          AI-prioritized outreach list. Creators ranked by score, engagement, and customer status. Click to take action.
        </p>
        {error ? (
          <Alert variant='destructive'>
            <Icons.warning className='size-4' />
            <AlertTitle>Smart queue unavailable</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : queue.length === 0 ? (
          <div className='text-center py-8'>
            <Icons.sparkles className='mx-auto mb-2 size-8 text-muted-foreground/40' />
            <p className='text-sm text-muted-foreground'>
              {activeBrandId ? 'No creators in queue. Run discovery first.' : 'Select a workspace to load the smart queue.'}
            </p>
          </div>
        ) : (
          <div className='space-y-2'>
            {queue.map((creator, i) => {
              const priorityColor = creator.priority === 'high'
                ? 'border-l-green-500 bg-green-500/5'
                : creator.priority === 'medium'
                  ? 'border-l-amber-500 bg-amber-500/5'
                  : 'border-l-zinc-300';
              return (
                <div
                  key={creator.id}
                  className={`flex min-w-0 flex-col gap-3 rounded-lg border border-l-4 p-3 transition-colors hover:bg-muted/50 sm:flex-row sm:items-center ${priorityColor}`}
                >
                  <div className='flex min-w-0 items-start gap-3 sm:flex-1 sm:items-center'>
                    <span className='w-5 shrink-0 text-xs font-bold text-muted-foreground'>{i + 1}</span>
                    <Avatar className='size-8 shrink-0 bg-muted'>
                      <AvatarImage src={creator.avatar_url} alt={creator.display_name || creator.handle || 'Creator'} />
                      <AvatarFallback className='text-[10px] font-bold'>
                        {(creator.display_name || creator.handle || '').slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className='min-w-0 flex-1'>
                      <div className='flex min-w-0 flex-wrap items-center gap-2'>
                        <p className='min-w-0 truncate text-sm font-semibold'>@{creator.handle}</p>
                        <Badge
                          variant={creator.priority === 'high' ? 'default' : 'outline'}
                          className={`px-1.5 text-[10px] ${creator.priority === 'high' ? 'bg-green-600' : ''}`}
                        >
                          {creator.priority}
                        </Badge>
                        {creator.discovered_via === 'shopify_customer' && (
                          <Badge variant='secondary' className='px-1.5 text-[10px]'>Customer</Badge>
                        )}
                      </div>
                      <p className='truncate text-[11px] text-muted-foreground'>{creator.ai_action}</p>
                    </div>
                  </div>
                  <div className='grid grid-cols-3 gap-2 text-xs text-muted-foreground sm:flex sm:shrink-0 sm:items-center sm:gap-3'>
                    <span className='tabular-nums'>{formatFollowers(creator.follower_count)}</span>
                    <span className='tabular-nums'>{formatEngagement(creator.engagement_rate)}</span>
                    <span className='font-bold text-foreground tabular-nums'>{formatScore(creator.score)}</span>
                  </div>
                  <div className='grid grid-cols-2 gap-1.5 sm:flex sm:shrink-0 sm:items-center'>
                    <Button
                      aria-label={`Preview proposal draft for @${creator.handle}`}
                      size='sm'
                      variant='outline'
                      className='min-h-11 text-xs'
                      disabled={!activeBrandId || proposalAction !== null}
                      onClick={() => void handleProposal(creator, true)}
                    >
                      {proposalAction === `${creator.id}:preview` ? (
                        <Icons.spinner className='mr-1 size-3 animate-spin' />
                      ) : (
                        <Icons.search className='mr-1 size-3' />
                      )}
                      Preview
                    </Button>
                    <Button
                      aria-label={`Create proposal draft for @${creator.handle}`}
                      size='sm'
                      variant='outline'
                      className='min-h-11 text-xs'
                      disabled={!activeBrandId || proposalAction !== null}
                      onClick={() => requestProposalDraft(creator)}
                    >
                      {proposalAction === `${creator.id}:draft` ? (
                        <Icons.spinner className='mr-1 size-3 animate-spin' />
                      ) : (
                        <Icons.send className='mr-1 size-3' />
                      )}
                      Draft
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SavedBriefsPanel({ refreshToken }: { refreshToken: number }) {
  const activeBrandId = useEffectiveBrandId();
  const [briefs, setBriefs] = useState<SavedBrief[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!activeBrandId) {
      setBriefs([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    fetch(withLocalQaMarker(`/api/proxy/api/briefs?brand_id=${encodeURIComponent(activeBrandId)}&limit=5`))
      .then(async (response) => {
        if (!response.ok) throw new Error(await readApiErrorMessage(response, 'Saved content briefs could not be loaded.'));
        return response.json();
      })
      .then((data) => setBriefs(Array.isArray(data) ? data : []))
      .catch((loadError) => {
        setBriefs([]);
        setError(loadError instanceof Error ? loadError.message : 'Saved content briefs could not be loaded.');
      })
      .finally(() => setLoading(false));
  }, [activeBrandId, refreshToken]);

  return (
    <Card className='md:col-span-2'>
      <CardHeader>
        <CardTitle className='flex items-center gap-2'>
          <Icons.forms className='size-5 text-blue-600' />
          Saved Content Briefs
          <Badge variant='secondary' className='ml-auto text-xs'>{briefs.length}</Badge>
        </CardTitle>
        {briefs.length > 0 && (
          <Button asChild variant='link' size='sm' className='min-h-11 justify-start p-0 text-xs'>
            <Link aria-label='View all saved content briefs' href='/dashboard/content-briefs'>View all briefs &rarr;</Link>
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className='space-y-2'>
            {Array.from({ length: 2 }).map((_, index) => (
              <div key={index} className='h-14 animate-pulse rounded-lg bg-muted' />
            ))}
          </div>
        ) : error ? (
          <Alert variant='destructive'>
            <Icons.warning className='size-4' />
            <AlertTitle>Saved briefs unavailable</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : briefs.length === 0 ? (
          <div className='rounded-lg border border-dashed p-6 text-center'>
            <Icons.forms className='mx-auto mb-2 size-7 text-muted-foreground/40' />
            <p className='text-sm text-muted-foreground'>No saved briefs yet. Create one from the creators table or generator below.</p>
          </div>
        ) : (
          <div className='space-y-2'>
            {briefs.map((brief) => {
              const preview = brief.scripts?.[0]?.content || brief.visual_notes || '';
              return (
                <div key={brief.id} className='rounded-lg border bg-card p-3'>
                  <div className='flex flex-wrap items-center gap-2'>
                    <p className='font-medium'>{brief.title || 'Creator brief'}</p>
                    {brief.content_type && <Badge variant='outline' className='text-[10px]'>{brief.content_type}</Badge>}
                    {brief.handle && <span className='text-xs text-muted-foreground'>@{brief.handle}</span>}
                  </div>
                  {preview && <p className='mt-1 line-clamp-2 text-xs text-muted-foreground'>{preview}</p>}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function AIToolsPage() {
  const activeBrandId = useEffectiveBrandId();
  const [pendingLiveAction, setPendingLiveAction] = useState<'batch-proposals' | 'content-brief' | 'creator-analysis' | null>(null);

  // Batch Proposals
  const [proposalLimit, setProposalLimit] = useState('10');
  const [proposing, setProposing] = useState(false);
  const [previewingProposals, setPreviewingProposals] = useState(false);
  const [proposalResult, setProposalResult] = useState<string | null>(null);

  // Content Brief
  const [briefHandle, setBriefHandle] = useState('');
  const [briefType, setBriefType] = useState('review');
  const [generatingBrief, setGeneratingBrief] = useState(false);
  const [previewingBrief, setPreviewingBrief] = useState(false);
  const [briefResult, setBriefResult] = useState<string | null>(null);
  const [briefRefreshToken, setBriefRefreshToken] = useState(0);

  // Creator Analysis
  const [analysisHandle, setAnalysisHandle] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [previewingAnalysis, setPreviewingAnalysis] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);

  async function handleBatchProposals(dryRun = false) {
    if (!activeBrandId) {
      toast.error('Select a client brand before generating proposals.');
      return;
    }
    if (dryRun) {
      setPreviewingProposals(true);
    } else {
      setProposing(true);
    }
    setProposalResult(null);
    toast.info(dryRun ? 'Previewing AI proposals...' : 'Generating AI proposals...');
    try {
      const res = await fetch(withLocalQaMarker('/api/proxy/api/ai/batch-proposals'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brand_id: activeBrandId, limit: Number(proposalLimit), dry_run: dryRun })
      });
      const data = await readJsonResponse(res);
      if (!res.ok) throw new Error(data.detail || data.error || 'Failed to generate proposals');
      setProposalResult(data.message || (dryRun ? `Would generate ${data.count} proposals` : `Generated ${data.count} proposals`));
      toast.success(data.message || (dryRun ? 'Proposal dry run ready!' : 'Proposals generated!'));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to generate proposals';
      toast.error(message);
    } finally {
      if (!dryRun) setPendingLiveAction(null);
      if (dryRun) {
        setPreviewingProposals(false);
      } else {
        setProposing(false);
      }
    }
  }

  async function handleGenerateBrief(dryRun = false) {
    if (!activeBrandId) {
      toast.error('Select a client brand before generating a brief.');
      return;
    }
    const handle = cleanHandle(briefHandle);
    if (!handle) {
      toast.error('Enter a creator handle');
      return;
    }
    if (dryRun) {
      setPreviewingBrief(true);
    } else {
      setGeneratingBrief(true);
    }
    setBriefResult(null);
    toast.info(`${dryRun ? 'Previewing' : 'Generating'} ${briefType} brief for @${handle}...`);
    try {
      const res = await fetch(withLocalQaMarker('/api/proxy/api/ai/content-brief'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand_id: activeBrandId,
          handle,
          content_type: briefType,
          dry_run: dryRun
        })
      });
      const data = await readJsonResponse(res);
      if (!res.ok) throw new Error(data.detail || data.error || 'Failed to generate brief');
      setBriefResult(data.brief || data.message || 'Brief generated');
      if (!dryRun) setBriefRefreshToken((value) => value + 1);
      toast.success(dryRun ? 'Content brief dry run ready!' : data.saved_brief ? 'Content brief generated and saved!' : 'Content brief generated!');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to generate brief';
      toast.error(message);
    } finally {
      if (!dryRun) setPendingLiveAction(null);
      if (dryRun) {
        setPreviewingBrief(false);
      } else {
        setGeneratingBrief(false);
      }
    }
  }

  async function handleAnalyze(dryRun = false) {
    if (!activeBrandId) {
      toast.error('Select a client brand before analyzing a creator.');
      return;
    }
    const handle = cleanHandle(analysisHandle);
    if (!handle) {
      toast.error('Enter a creator handle');
      return;
    }
    if (dryRun) {
      setPreviewingAnalysis(true);
    } else {
      setAnalyzing(true);
    }
    setAnalysisResult(null);
    toast.info(`${dryRun ? 'Previewing analysis for' : 'Analyzing'} @${handle}...`);
    try {
      const res = await fetch(withLocalQaMarker('/api/proxy/api/ai/analyze-creator'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand_id: activeBrandId,
          handle,
          dry_run: dryRun
        })
      });
      const data = await readJsonResponse(res);
      if (!res.ok) throw new Error(data.detail || data.error || 'Analysis failed');
      setAnalysisResult(data.analysis || data.message || 'Analysis complete');
      toast.success(dryRun ? 'Creator analysis dry run ready!' : 'Creator analysis complete!');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Analysis failed';
      toast.error(message);
    } finally {
      if (!dryRun) setPendingLiveAction(null);
      if (dryRun) {
        setPreviewingAnalysis(false);
      } else {
        setAnalyzing(false);
      }
    }
  }

  function requestBatchProposals() {
    if (!activeBrandId) {
      toast.error('Select a client brand before generating proposals.');
      return;
    }
    setPendingLiveAction('batch-proposals');
  }

  function requestGenerateBrief() {
    if (!activeBrandId) {
      toast.error('Select a client brand before generating a brief.');
      return;
    }
    if (!cleanHandle(briefHandle)) {
      toast.error('Enter a creator handle');
      return;
    }
    setPendingLiveAction('content-brief');
  }

  function requestAnalyzeCreator() {
    if (!activeBrandId) {
      toast.error('Select a client brand before analyzing a creator.');
      return;
    }
    if (!cleanHandle(analysisHandle)) {
      toast.error('Enter a creator handle');
      return;
    }
    setPendingLiveAction('creator-analysis');
  }

  return (
    <div className='flex flex-col gap-6'>
      <AlertDialog open={Boolean(pendingLiveAction)} onOpenChange={(open) => !open && setPendingLiveAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingLiveAction === 'batch-proposals'
                ? 'Generate AI proposals?'
                : pendingLiveAction === 'content-brief'
                  ? 'Generate content brief?'
                  : 'Analyze creator?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingLiveAction === 'batch-proposals'
                ? `CreatorOS will create proposal drafts for up to ${proposalLimit} high-scoring creators in this workspace. Use Dry Run first if you need a read-only preview.`
                : pendingLiveAction === 'content-brief'
                  ? `CreatorOS will generate and save a ${briefType} content brief for @${cleanHandle(briefHandle) || 'the selected creator'}.`
                  : `CreatorOS will run live creator analysis for @${cleanHandle(analysisHandle) || 'the selected creator'} and update available creator intelligence.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={proposing || generatingBrief || analyzing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              aria-label={
                pendingLiveAction === 'batch-proposals'
                  ? 'Confirm AI proposal generation'
                  : pendingLiveAction === 'content-brief'
                    ? `Confirm content brief generation for @${cleanHandle(briefHandle) || 'selected creator'}`
                    : `Confirm creator analysis for @${cleanHandle(analysisHandle) || 'selected creator'}`
              }
              disabled={proposing || generatingBrief || analyzing}
              onClick={() => {
                if (pendingLiveAction === 'batch-proposals') {
                  void handleBatchProposals();
                } else if (pendingLiveAction === 'content-brief') {
                  void handleGenerateBrief();
                } else if (pendingLiveAction === 'creator-analysis') {
                  void handleAnalyze();
                }
              }}
            >
              {pendingLiveAction === 'batch-proposals'
                ? 'Generate proposals'
                : pendingLiveAction === 'content-brief'
                  ? 'Generate brief'
                  : 'Analyze creator'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <SmartQueue />
      <SavedBriefsPanel refreshToken={briefRefreshToken} />
      <div className='grid gap-6 md:grid-cols-2'>
      {/* Batch Proposals */}
      <Card className='md:col-span-2'>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Icons.sparkles className='size-5 text-indigo-600' />
            AI Batch Proposal Generator
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className='text-sm text-muted-foreground mb-4'>
            Automatically generate personalized outreach DMs for your highest-scoring
            whitelist-ready creators. Each proposal is customized based on the
            creator&apos;s bio, niche, follower count, and your brand profile.
          </p>
          <div className='flex flex-wrap items-end gap-3'>
            <div>
              <label htmlFor='proposal-limit' className='text-xs font-medium mb-1 block'>How many</label>
              <Select value={proposalLimit} onValueChange={setProposalLimit}>
                <SelectTrigger id='proposal-limit' aria-label='Batch proposal limit' className='min-h-11 w-24 text-xs'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='10'>10</SelectItem>
                  <SelectItem value='25'>25</SelectItem>
                  <SelectItem value='50'>50</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              aria-label='Preview batch proposal generation dry run'
              variant='outline'
              onClick={() => void handleBatchProposals(true)}
              disabled={proposing || previewingProposals || !activeBrandId}
              className='min-h-11 gap-2'
            >
              {previewingProposals ? (
                <>
                  <Icons.spinner className='size-4 animate-spin' /> Previewing...
                </>
              ) : (
                <>
                  <Icons.checks className='size-4' /> Dry Run
                </>
              )}
            </Button>
            <Button aria-label='Generate batch proposal drafts' onClick={requestBatchProposals} disabled={proposing || previewingProposals || !activeBrandId} className='min-h-11 gap-2'>
              {proposing ? (
                <>
                  <Icons.spinner className='size-4 animate-spin' /> Generating...
                </>
              ) : (
                <>
                  <Icons.sparkles className='size-4' /> Generate Proposals
                </>
              )}
            </Button>
          </div>
          {proposalResult && (
            <div className='mt-4 rounded-lg border border-green-500/20 bg-green-500/5 p-3'>
              <p className='text-sm font-medium text-green-700 dark:text-green-300'>{proposalResult}</p>
              <Button
                variant='link'
                size='sm'
                className='mt-1 min-h-11 px-0 text-green-600 dark:text-green-300'
                asChild
              >
                <Link aria-label='View generated proposals in AI Proposals' href='/dashboard/briefs'>View in AI Proposals &rarr;</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Content Brief */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Icons.edit className='size-5 text-purple-600' />
            Content Brief Generator
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className='text-sm text-muted-foreground mb-4'>
            Generate a detailed content brief for a specific creator — including
            talking points, deliverables, timeline, and brand guidelines.
          </p>
          <div className='space-y-3'>
            <div>
              <label htmlFor='brief-handle' className='text-xs font-medium mb-1 block'>Creator Handle</label>
              <Input
                id='brief-handle'
                aria-label='Creator handle for content brief'
                placeholder='@wellnesswithkaia.demo'
                value={briefHandle}
                onChange={(e) => setBriefHandle(e.target.value)}
                className='min-h-11 text-sm'
              />
            </div>
            <div>
              <label htmlFor='brief-type' className='text-xs font-medium mb-1 block'>Content Type</label>
              <Select value={briefType} onValueChange={setBriefType}>
                <SelectTrigger id='brief-type' aria-label='Content brief type' className='min-h-11 text-xs'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='review'>Product Review</SelectItem>
                  <SelectItem value='tutorial'>Tutorial / How-To</SelectItem>
                  <SelectItem value='unboxing'>Unboxing</SelectItem>
                  <SelectItem value='story'>Instagram Story</SelectItem>
                  <SelectItem value='reel'>Instagram Reel</SelectItem>
                  <SelectItem value='tiktok'>TikTok Video</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className='grid gap-2 sm:grid-cols-2'>
            <Button
              aria-label='Preview content brief dry run'
              variant='outline'
              onClick={() => void handleGenerateBrief(true)}
              disabled={generatingBrief || previewingBrief || !activeBrandId}
              className='min-h-11 w-full gap-2'
            >
              {previewingBrief ? (
                <>
                  <Icons.spinner className='size-4 animate-spin' /> Previewing...
                </>
              ) : (
                <>
                  <Icons.checks className='size-4' /> Dry Run
                </>
              )}
            </Button>
            <Button
              aria-label='Generate and save content brief'
              onClick={requestGenerateBrief}
              disabled={generatingBrief || previewingBrief || !activeBrandId}
              className='min-h-11 w-full gap-2'
            >
              {generatingBrief ? (
                <>
                  <Icons.spinner className='size-4 animate-spin' /> Generating...
                </>
              ) : (
                <>
                  <Icons.edit className='size-4' /> Generate Brief
                </>
              )}
            </Button>
            </div>
          </div>
          {briefResult && (
            <div aria-live='polite' className='mt-4 max-h-64 overflow-y-auto rounded-lg border bg-muted/30 p-3'>
              <pre className='whitespace-pre-wrap text-xs leading-relaxed'>
                {briefResult}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Creator Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Icons.search className='size-5 text-amber-600' />
            AI Creator Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className='text-sm text-muted-foreground mb-4'>
            Get an AI-powered analysis of any creator — niche fit assessment,
            audience quality, content evaluation, and partnership recommendation.
          </p>
          <div className='space-y-3'>
            <div>
              <label htmlFor='analysis-handle' className='text-xs font-medium mb-1 block'>Creator Handle</label>
              <Input
                id='analysis-handle'
                aria-label='Creator handle for analysis'
                placeholder='@wellnesswithkaia.demo'
                value={analysisHandle}
                onChange={(e) => setAnalysisHandle(e.target.value)}
                className='min-h-11 text-sm'
              />
            </div>
            <div className='grid gap-2 sm:grid-cols-2'>
            <Button
              aria-label='Preview creator analysis dry run'
              variant='outline'
              onClick={() => void handleAnalyze(true)}
              disabled={analyzing || previewingAnalysis || !activeBrandId}
              className='min-h-11 w-full gap-2'
            >
              {previewingAnalysis ? (
                <>
                  <Icons.spinner className='size-4 animate-spin' /> Previewing...
                </>
              ) : (
                <>
                  <Icons.checks className='size-4' /> Dry Run
                </>
              )}
            </Button>
            <Button aria-label='Run live creator analysis' onClick={requestAnalyzeCreator} disabled={analyzing || previewingAnalysis || !activeBrandId} className='min-h-11 w-full gap-2'>
              {analyzing ? (
                <>
                  <Icons.spinner className='size-4 animate-spin' /> Analyzing...
                </>
              ) : (
                <>
                  <Icons.search className='size-4' /> Analyze Creator
                </>
              )}
            </Button>
            </div>
          </div>
          {analysisResult && (
            <div aria-live='polite' className='mt-4 max-h-64 overflow-y-auto rounded-lg border bg-muted/30 p-3'>
              <pre className='whitespace-pre-wrap text-xs leading-relaxed'>
                {analysisResult}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
