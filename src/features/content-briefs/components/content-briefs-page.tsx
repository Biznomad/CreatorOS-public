'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
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
import { withLocalQaMarker } from '@/lib/whitelabel-api';

type ScriptBlock = {
  title?: string;
  content?: string;
};

type DosDonts = {
  dos?: string[];
  donts?: string[];
};

type SavedBrief = {
  id: string;
  title?: string;
  handle?: string;
  platform?: string;
  content_type?: string;
  status?: string;
  created_at?: string;
  scripts?: ScriptBlock[] | string;
  visual_notes?: string;
  dos_donts?: DosDonts | string;
  hashtags?: string[] | string;
  posting_guidelines?: string;
  reference_urls?: string[] | string;
};

const API_BASE = '/api/proxy';

function parseJsonValue<T>(value: T | string | undefined, fallback: T): T {
  if (typeof value !== 'string') return value ?? fallback;
  if (!value.trim()) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function getScripts(brief: SavedBrief): ScriptBlock[] {
  return parseJsonValue<ScriptBlock[]>(brief.scripts, []);
}

function getDosDonts(brief: SavedBrief): DosDonts {
  return parseJsonValue<DosDonts>(brief.dos_donts, {});
}

function getList(value: string[] | string | undefined): string[] {
  const parsed = parseJsonValue<string[] | string>(value, []);
  if (Array.isArray(parsed)) return parsed.filter((item) => String(item).trim()).map((item) => String(item).trim());
  if (typeof parsed === 'string') {
    return parsed
      .split(/[\n,]+/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function formatContentType(contentType?: string) {
  return (contentType || 'brief').replace(/_/g, ' ');
}

function formatDate(value?: string) {
  if (!value) return 'Not dated';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not dated';
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}

function briefActionLabel(brief: SavedBrief) {
  return brief.title || (brief.handle ? `brief for @${brief.handle}` : `brief ${brief.id.slice(0, 8)}`);
}

function safeReferenceUrls(urls: string[]) {
  return urls.filter((url) => {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  });
}

export default function ContentBriefsPage() {
  const activeBrandId = useEffectiveBrandId();
  const [briefs, setBriefs] = useState<SavedBrief[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBrief, setSelectedBrief] = useState<SavedBrief | null>(null);

  const loadBriefs = useCallback(() => {
    if (!activeBrandId) {
      setBriefs([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    fetch(withLocalQaMarker(`${API_BASE}/api/briefs?brand_id=${encodeURIComponent(activeBrandId)}&limit=100`))
      .then(async (res) => {
        if (!res.ok) throw new Error('Content briefs could not be loaded.');
        return res.json();
      })
      .then((data) => {
        setBriefs(Array.isArray(data) ? data : []);
      })
      .catch((loadError) => {
        setBriefs([]);
        setError(loadError instanceof Error ? loadError.message : 'Content briefs could not be loaded.');
      })
      .finally(() => setLoading(false));
  }, [activeBrandId]);

  useEffect(() => {
    loadBriefs();
  }, [loadBriefs]);

  const selectedDetails = useMemo(() => {
    if (!selectedBrief) return null;
    return {
      scripts: getScripts(selectedBrief),
      dosDonts: getDosDonts(selectedBrief),
      hashtags: getList(selectedBrief.hashtags),
      references: safeReferenceUrls(getList(selectedBrief.reference_urls))
    };
  }, [selectedBrief]);

  if (loading) {
    return (
      <div className='flex flex-col gap-3'>
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className='animate-pulse'>
            <CardContent className='p-4'>
              <div className='h-4 w-48 rounded bg-muted' />
              <div className='mt-3 h-3 w-full rounded bg-muted' />
              <div className='mt-2 h-3 w-2/3 rounded bg-muted' />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!activeBrandId) {
    return (
      <Card>
        <CardContent className='flex min-h-48 flex-col items-center justify-center gap-3 text-center'>
          <Icons.forms className='size-10 text-muted-foreground/40' />
          <p className='text-sm text-muted-foreground'>Choose a client workspace before reviewing content briefs.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className='flex min-w-0 flex-col gap-4 overflow-hidden'>
      <div className='flex min-w-0 flex-wrap items-center justify-between gap-3'>
        <div className='text-sm text-muted-foreground'>
          {briefs.length} saved brief{briefs.length === 1 ? '' : 's'}
        </div>
        <div className='flex flex-wrap items-center gap-2'>
          <Button aria-label='Refresh content briefs' variant='outline' size='sm' className='min-h-11 gap-2' onClick={loadBriefs} disabled={loading}>
            <Icons.refresh className='size-4' />
            Refresh
          </Button>
          <Button asChild variant='outline' size='sm' className='min-h-11 gap-2'>
            <Link aria-label='Generate content brief in AI Tools' href='/dashboard/ai-tools'>
              <Icons.sparkles className='size-4' />
              Generate Brief
            </Link>
          </Button>
        </div>
      </div>

      {error ? (
        <Alert variant='destructive'>
          <Icons.warning className='size-4' />
          <AlertTitle>Content briefs unavailable</AlertTitle>
          <AlertDescription className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
            <span>{error}</span>
            <Button
              aria-label='Retry content briefs load'
              type='button'
              variant='outline'
              size='sm'
              className='min-h-11 w-full sm:w-auto'
              onClick={loadBriefs}
              disabled={loading}
            >
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      ) : briefs.length === 0 ? (
        <Card>
          <CardContent className='flex min-h-56 flex-col items-center justify-center gap-3 text-center'>
            <Icons.forms className='size-10 text-muted-foreground/40' />
            <div>
              <p className='font-medium'>No saved content briefs yet.</p>
              <p className='text-sm text-muted-foreground'>Generate one from AI Tools after adding creators to this workspace.</p>
            </div>
            <Button asChild size='sm' className='min-h-11 gap-2'>
              <Link aria-label='Open AI Tools to generate a content brief' href='/dashboard/ai-tools'>
                <Icons.sparkles className='size-4' />
                Open AI Tools
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className='min-w-0 overflow-hidden'>
          <CardContent className='p-0'>
            <div className='grid gap-3 p-3 md:hidden'>
              {briefs.map((brief) => {
                const scripts = getScripts(brief);
                const preview = scripts[0]?.content || brief.visual_notes || brief.posting_guidelines || '';
                const actionLabel = briefActionLabel(brief);
                return (
                  <article key={brief.id} className='min-w-0 overflow-hidden rounded-lg border p-3'>
                    <div className='flex min-w-0 items-start justify-between gap-3'>
                      <div className='min-w-0'>
                        <h3 className='break-words text-sm font-semibold'>{brief.title || 'Creator brief'}</h3>
                        <p className='mt-1 break-words text-xs text-muted-foreground'>
                          {brief.handle ? `@${brief.handle}` : 'Unassigned'} · {formatContentType(brief.content_type)}
                        </p>
                      </div>
                      <Badge variant='outline' className='shrink-0 capitalize'>{brief.status || 'draft'}</Badge>
                    </div>
                    {preview && <p className='mt-3 line-clamp-3 break-words text-xs leading-5 text-muted-foreground'>{preview}</p>}
                    <div className='mt-3 flex min-w-0 items-center justify-between gap-3'>
                      <span className='min-w-0 break-words text-xs text-muted-foreground'>{formatDate(brief.created_at)}</span>
                      <Button
                        variant='outline'
                        size='sm'
                        aria-label={`View content brief: ${actionLabel}`}
                        onClick={() => setSelectedBrief(brief)}
                        className='min-h-11 shrink-0'
                      >
                        View
                      </Button>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className='hidden max-w-full overflow-x-auto md:block'>
              <Table className='min-w-[44rem]'>
                <TableHeader>
                  <TableRow>
                    <TableHead>Brief</TableHead>
                    <TableHead>Creator</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className='w-24 text-right'>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {briefs.map((brief) => {
                    const scripts = getScripts(brief);
                    const preview = scripts[0]?.content || brief.visual_notes || brief.posting_guidelines || '';
                    const actionLabel = briefActionLabel(brief);
                    return (
                      <TableRow key={brief.id}>
                        <TableCell className='max-w-[320px] whitespace-normal'>
                          <div className='break-words font-medium'>{brief.title || 'Creator brief'}</div>
                          {preview && <div className='mt-1 line-clamp-2 break-words text-xs text-muted-foreground'>{preview}</div>}
                        </TableCell>
                        <TableCell className='break-words'>{brief.handle ? `@${brief.handle}` : 'Unassigned'}</TableCell>
                        <TableCell className='capitalize'>{formatContentType(brief.content_type)}</TableCell>
                        <TableCell>
                          <Badge variant='outline' className='capitalize'>{brief.status || 'draft'}</Badge>
                        </TableCell>
                        <TableCell>{formatDate(brief.created_at)}</TableCell>
                        <TableCell className='text-right'>
                          <Button
                            variant='ghost'
                            size='sm'
                            aria-label={`View content brief: ${actionLabel}`}
                            onClick={() => setSelectedBrief(brief)}
                            className='min-h-11'
                          >
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!selectedBrief} onOpenChange={(open) => !open && setSelectedBrief(null)}>
        <DialogContent className='max-w-[calc(100vw-2rem)] overflow-hidden sm:max-w-3xl'>
          <DialogHeader className='min-w-0'>
            <DialogTitle className='break-words'>{selectedBrief?.title || 'Creator brief'}</DialogTitle>
            <DialogDescription className='break-words'>
              {selectedBrief?.handle ? `@${selectedBrief.handle}` : 'Creator'} · {formatContentType(selectedBrief?.content_type)}
            </DialogDescription>
          </DialogHeader>
          {selectedBrief && selectedDetails && (
            <ScrollArea className='max-h-[68vh] min-w-0 pr-4'>
              <div className='min-w-0 space-y-5'>
                {selectedDetails.scripts.length === 0
                  && !selectedBrief.visual_notes
                  && !selectedBrief.posting_guidelines
                  && !selectedDetails.dosDonts.dos?.length
                  && !selectedDetails.dosDonts.donts?.length
                  && selectedDetails.hashtags.length === 0
                  && selectedDetails.references.length === 0 && (
                    <p className='whitespace-pre-wrap break-words rounded-md border bg-muted/30 p-3 text-sm leading-6'>
                      No script, guidelines, hashtags, or references were saved for this brief yet.
                    </p>
                  )}
                {selectedDetails.scripts.map((script, index) => (
                  <section key={`${script.title || 'script'}-${index}`} className='min-w-0 space-y-2'>
                    <h3 className='break-words text-sm font-semibold'>{script.title || `Script ${index + 1}`}</h3>
                    <p className='whitespace-pre-wrap break-words rounded-md border bg-muted/30 p-3 text-sm leading-6'>
                      {script.content || 'No script content saved.'}
                    </p>
                  </section>
                ))}

                {selectedBrief.visual_notes && (
                  <section className='min-w-0 space-y-2'>
                    <h3 className='text-sm font-semibold'>Visual Notes</h3>
                    <p className='whitespace-pre-wrap break-words rounded-md border bg-muted/30 p-3 text-sm leading-6'>{selectedBrief.visual_notes}</p>
                  </section>
                )}

                {selectedBrief.posting_guidelines && (
                  <section className='min-w-0 space-y-2'>
                    <h3 className='text-sm font-semibold'>Posting Guidelines</h3>
                    <p className='whitespace-pre-wrap break-words rounded-md border bg-muted/30 p-3 text-sm leading-6'>{selectedBrief.posting_guidelines}</p>
                  </section>
                )}

                {(selectedDetails.dosDonts.dos?.length || selectedDetails.dosDonts.donts?.length) && (
                  <section className='grid min-w-0 gap-3 md:grid-cols-2'>
                    <div className='min-w-0 rounded-md border p-3'>
                      <h3 className='text-sm font-semibold'>Dos</h3>
                      <ul className='mt-2 list-disc space-y-1 break-words pl-4 text-sm text-muted-foreground'>
                        {(selectedDetails.dosDonts.dos || []).map((item) => <li key={item}>{item}</li>)}
                      </ul>
                    </div>
                    <div className='min-w-0 rounded-md border p-3'>
                      <h3 className='text-sm font-semibold'>Don'ts</h3>
                      <ul className='mt-2 list-disc space-y-1 break-words pl-4 text-sm text-muted-foreground'>
                        {(selectedDetails.dosDonts.donts || []).map((item) => <li key={item}>{item}</li>)}
                      </ul>
                    </div>
                  </section>
                )}

                {selectedDetails.hashtags.length > 0 && (
                  <section className='min-w-0 space-y-2'>
                    <h3 className='text-sm font-semibold'>Hashtags</h3>
                    <div className='flex min-w-0 flex-wrap gap-2'>
                      {selectedDetails.hashtags.map((tag) => <Badge key={tag} variant='secondary' className='max-w-full break-words'>{tag}</Badge>)}
                    </div>
                  </section>
                )}

                {selectedDetails.references.length > 0 && (
                  <section className='min-w-0 space-y-2'>
                    <h3 className='text-sm font-semibold'>References</h3>
                    <div className='flex min-w-0 flex-col gap-2 text-sm'>
                      {selectedDetails.references.map((url) => (
                        <a key={url} href={url} target='_blank' rel='noreferrer' className='break-all text-primary underline-offset-4 hover:underline'>
                          {url}
                        </a>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
