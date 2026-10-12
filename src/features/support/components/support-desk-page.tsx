'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Icons } from '@/components/icons';
import { useEffectiveBrand } from '@/hooks/use-effective-brand';
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
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { withLocalQaMarker } from '@/lib/whitelabel-api';

type SupportTicket = {
  id: string;
  brand_id: string;
  customer_name?: string;
  customer_email?: string;
  status: string;
  priority: string;
  subject: string;
  summary?: string;
  escalated?: boolean;
  last_ai_confidence?: number;
  last_message_at?: string;
  updated_at?: string;
};

type SupportMessage = {
  id: string;
  ticket_id: string;
  role: 'user' | 'assistant' | 'staff' | 'system';
  content: string;
  confidence?: number;
  created_at: string;
};

function statusTone(status: string) {
  if (status === 'resolved' || status === 'closed') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (status === 'escalated') return 'border-amber-200 bg-amber-50 text-amber-700';
  return 'border-slate-200 bg-slate-50 text-slate-700';
}

function formatDate(value?: string) {
  if (!value) return 'No activity yet';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No activity yet';
  return date.toLocaleString();
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function shouldUseLocalQaSupportSamples() {
  if (typeof window === 'undefined') return false;
  const isLocalHost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  return isLocalHost && window.location.search.includes('qa=1');
}

function localQaSupportTickets(brandId: string): SupportTicket[] {
  const now = new Date().toISOString();
  return [
    {
      id: 'local-support-ticket-1',
      brand_id: brandId,
      customer_name: 'Nia Roots',
      customer_email: 'nia@example.com',
      status: 'open',
      priority: 'normal',
      subject: 'Application status and gifting timeline',
      summary: 'Creator asked when product gifting begins after approval.',
      escalated: false,
      last_ai_confidence: 0.86,
      last_message_at: now,
      updated_at: now
    },
    {
      id: 'local-support-ticket-2',
      brand_id: brandId,
      customer_name: 'Mara Glow',
      customer_email: 'mara@example.com',
      status: 'escalated',
      priority: 'high',
      subject: 'Affiliate link question',
      summary: 'Creator needs a human answer about affiliate tracking before posting.',
      escalated: true,
      last_ai_confidence: 0.58,
      last_message_at: now,
      updated_at: now
    }
  ];
}

function localQaSupportMessages(ticketId: string): SupportMessage[] {
  const now = new Date().toISOString();
  return [
    {
      id: `${ticketId}-message-1`,
      ticket_id: ticketId,
      role: 'user',
      content: 'Hi, I applied for the Demo Brand creator program. When would product gifting start if I am approved?',
      created_at: now
    },
    {
      id: `${ticketId}-message-2`,
      ticket_id: ticketId,
      role: 'assistant',
      content: 'Approved creators usually receive next steps for product gifting after the team reviews fit, shipping location, and content timing.',
      confidence: 0.86,
      created_at: now
    }
  ];
}

export default function SupportDeskPage() {
  const brandId = useEffectiveBrand().brandId;
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [threadLoading, setThreadLoading] = useState(false);
  const [ticketError, setTicketError] = useState('');
  const [threadError, setThreadError] = useState('');
  const [reply, setReply] = useState('');
  const [testMessage, setTestMessage] = useState('How do I fix a workflow that is not sending SMS?');
  const [testEmail, setTestEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [pendingSupportAction, setPendingSupportAction] = useState<'staff-reply' | 'test-message' | null>(null);
  const [shouldScrollToThread, setShouldScrollToThread] = useState(false);
  const threadPanelRef = useRef<HTMLDivElement | null>(null);

  const selectedTicket = useMemo(
    () => tickets.find((ticket) => ticket.id === selectedId),
    [tickets, selectedId]
  );

  const loadTickets = useCallback(async () => {
    if (!brandId) return;
    if (shouldUseLocalQaSupportSamples()) {
      const sampleTickets = localQaSupportTickets(brandId);
      setTickets((currentTickets) => currentTickets.length ? currentTickets : sampleTickets);
      setSelectedId((currentId) => currentId || sampleTickets[0]?.id || '');
    }
    setLoading(true);
    setTicketError('');
    try {
      const res = await fetch(withLocalQaMarker(`/api/proxy/api/support/tickets?brand_id=${encodeURIComponent(brandId)}&limit=100`));
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || data.error || 'Could not load support tickets');
      const nextTickets = Array.isArray(data.tickets) ? data.tickets : [];
      const visibleTickets = nextTickets.length || !shouldUseLocalQaSupportSamples()
        ? nextTickets
        : localQaSupportTickets(brandId);
      setTickets(visibleTickets);
      setSelectedId((currentId) => currentId || visibleTickets[0]?.id || '');
    } catch (err) {
      setTicketError(err instanceof Error ? err.message : 'Could not load support tickets');
    } finally {
      setLoading(false);
    }
  }, [brandId]);

  const loadThread = useCallback(async (ticketId: string) => {
    if (!brandId || !ticketId) return;
    const useLocalSamples = shouldUseLocalQaSupportSamples();
    if (useLocalSamples) {
      setMessages((currentMessages) => currentMessages.length ? currentMessages : localQaSupportMessages(ticketId));
    }
    setThreadLoading(!useLocalSamples);
    setThreadError('');
    try {
      const res = await fetch(withLocalQaMarker(`/api/proxy/api/support/tickets/${encodeURIComponent(ticketId)}?brand_id=${encodeURIComponent(brandId)}`));
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || data.error || 'Could not load support thread');
      const nextMessages = Array.isArray(data.messages) ? data.messages : [];
      setMessages(nextMessages.length || !shouldUseLocalQaSupportSamples() ? nextMessages : localQaSupportMessages(ticketId));
    } catch (err) {
      setThreadError(err instanceof Error ? err.message : 'Could not load support thread');
    } finally {
      if (!useLocalSamples) setThreadLoading(false);
    }
  }, [brandId]);

  async function sendStaffReply() {
    if (!brandId || !selectedId || !reply.trim()) return;
    setSending(true);
    try {
      const res = await fetch(withLocalQaMarker(`/api/proxy/api/support/tickets/${encodeURIComponent(selectedId)}/reply`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brand_id: brandId, message: reply.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || data.error || 'Could not send reply');
      setReply('');
      await Promise.all([loadTickets(), loadThread(selectedId)]);
    } catch (err) {
      setThreadError(err instanceof Error ? err.message : 'Could not send reply');
    } finally {
      setPendingSupportAction(null);
      setSending(false);
    }
  }

  async function sendTestMessage() {
    const normalizedTestEmail = testEmail.trim();
    if (!brandId || !testMessage.trim() || !isValidEmail(normalizedTestEmail)) return;
    setSending(true);
    setTicketError('');
    try {
      const res = await fetch(withLocalQaMarker('/api/proxy/api/support/public/message'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand_id: brandId,
          customer_email: normalizedTestEmail,
          customer_name: 'Dashboard Test Client',
          source: 'dashboard-test',
          message: testMessage.trim(),
          page_url: '/dashboard/support'
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || data.error || 'Could not test support AI');
      await loadTickets();
      setSelectedId(data.ticket?.id || selectedId);
      setShouldScrollToThread(true);
      if (data.ticket?.id) await loadThread(data.ticket.id);
    } catch (err) {
      setTicketError(err instanceof Error ? err.message : 'Could not test support AI');
    } finally {
      setPendingSupportAction(null);
      setSending(false);
    }
  }

  function requestStaffReply() {
    if (!brandId || !selectedId || !reply.trim()) return;
    setPendingSupportAction('staff-reply');
  }

  function requestTestMessage() {
    if (!brandId || !testMessage.trim() || !isValidEmail(testEmail)) return;
    setPendingSupportAction('test-message');
  }

  function selectTicket(ticketId: string) {
    setSelectedId(ticketId);
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setShouldScrollToThread(true);
    }
  }

  useEffect(() => {
    void loadTickets();
  }, [loadTickets]);

  useEffect(() => {
    if (selectedId) void loadThread(selectedId);
  }, [selectedId, loadThread]);

  useEffect(() => {
    if (!shouldScrollToThread || !selectedTicket) return;
    const frame = window.requestAnimationFrame(() => {
      threadPanelRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
      setShouldScrollToThread(false);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [selectedTicket, shouldScrollToThread]);

  if (!brandId) {
    return (
      <div className='rounded-lg border p-8 text-center'>
        <Icons.help className='mx-auto mb-3 size-9 text-muted-foreground' />
        <p className='text-sm text-muted-foreground'>Select a workspace before opening the support desk.</p>
      </div>
    );
  }

  return (
    <div className='grid min-w-0 max-w-full gap-4 overflow-hidden lg:grid-cols-[360px_minmax(0,1fr)]'>
      <div className='min-w-0 space-y-4'>
        <div className='min-w-0 rounded-lg border bg-background p-4'>
          <div className='mb-3 flex items-center justify-between'>
            <div>
              <h2 className='text-sm font-semibold'>Ticket Queue</h2>
              <p className='text-xs text-muted-foreground'>{tickets.length} ticket{tickets.length === 1 ? '' : 's'}</p>
            </div>
            <Button variant='outline' size='icon' className='min-h-11 min-w-11' onClick={loadTickets} disabled={loading} aria-label='Refresh tickets'>
              <Icons.refresh className={cn('size-4', loading && 'animate-spin')} />
            </Button>
          </div>
          {ticketError ? (
            <Alert variant='destructive' className='mb-3'>
              <Icons.warning className='size-4' />
              <AlertTitle>Support tickets unavailable</AlertTitle>
              <AlertDescription className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
                <span>{ticketError}</span>
                <Button
                  aria-label='Retry support tickets load'
                  type='button'
                  variant='outline'
                  size='sm'
                  className='min-h-11 w-full sm:w-auto'
                  onClick={loadTickets}
                  disabled={loading}
                >
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          ) : null}
          <div className='space-y-2 pr-1 lg:max-h-[520px] lg:overflow-auto'>
            {tickets.map((ticket) => {
              const ticketActionLabel = `${ticket.subject} from ${ticket.customer_email || ticket.customer_name || 'anonymous client'} ticket ${ticket.id.slice(0, 8)}`;
              return (
                <button
                  key={ticket.id}
                  aria-label={`Open support ticket ${ticketActionLabel}`}
                  onClick={() => selectTicket(ticket.id)}
                  className={cn(
                    'w-full max-w-full overflow-hidden rounded-lg border p-3 text-left transition hover:bg-muted/60',
                    selectedId === ticket.id && 'border-primary bg-muted'
                  )}
                >
                  <div className='mb-2 flex min-w-0 flex-wrap items-center gap-2'>
                    <Badge variant='outline' className={statusTone(ticket.status)}>{ticket.status}</Badge>
                    {ticket.escalated ? <Badge variant='outline' className='border-amber-200 bg-amber-50 text-amber-700'>escalated</Badge> : null}
                  </div>
                  <div className='line-clamp-2 min-w-0 break-words text-sm font-medium'>{ticket.subject}</div>
                  <div className='mt-1 min-w-0 break-all text-xs text-muted-foreground'>{ticket.customer_email || ticket.customer_name || 'Anonymous client'}</div>
                  <div className='mt-2 text-xs text-muted-foreground'>{formatDate(ticket.last_message_at || ticket.updated_at)}</div>
                </button>
              );
            })}
            {!loading && tickets.length === 0 ? (
              <div className='rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground'>No tickets yet.</div>
            ) : null}
          </div>
        </div>

        <div className='min-w-0 rounded-lg border bg-background p-4'>
          <h2 className='text-sm font-semibold'>Test The AI Desk</h2>
          <p className='mb-3 text-xs text-muted-foreground'>Creates a real support ticket for the selected workspace.</p>
          <input
            value={testEmail}
            onChange={(event) => setTestEmail(event.target.value)}
            className='mb-2 min-h-11 w-full rounded-md border bg-background px-3 py-2 text-sm'
            placeholder='client@brand.com'
            aria-label='Test client email'
            type='email'
          />
          <Textarea
            value={testMessage}
            onChange={(event) => setTestMessage(event.target.value)}
            rows={3}
            aria-label='Test support message'
          />
          <Button aria-label='Create test support ticket' className='mt-3 min-h-11 w-full' onClick={requestTestMessage} disabled={sending || !testMessage.trim() || !isValidEmail(testEmail)}>
            {sending ? <Icons.spinner className='mr-2 size-4 animate-spin' /> : <Icons.send className='mr-2 size-4' />}
            Send Test Message
          </Button>
        </div>
      </div>

      <div ref={threadPanelRef} className='min-w-0 max-w-full overflow-hidden rounded-lg border bg-background'>
        {selectedTicket ? (
          <>
            <div className='border-b p-4'>
              <div className='flex flex-wrap items-start justify-between gap-3'>
                <div className='min-w-0'>
                  <h2 className='break-words text-base font-semibold'>{selectedTicket.subject}</h2>
                  <p className='break-all text-sm text-muted-foreground'>{selectedTicket.customer_email || selectedTicket.customer_name || 'Anonymous client'}</p>
                </div>
                <div className='flex shrink-0 flex-wrap gap-2'>
                  <Badge variant='outline' className={statusTone(selectedTicket.status)}>{selectedTicket.status}</Badge>
                  <Badge variant='outline'>{selectedTicket.priority}</Badge>
                </div>
              </div>
            </div>
            {threadError ? (
              <Alert variant='destructive' className='m-4 mb-0'>
                <Icons.warning className='size-4' />
                <AlertTitle>Support thread unavailable</AlertTitle>
                <AlertDescription className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
                  <span>{threadError}</span>
                  <Button
                    aria-label='Retry selected support thread load'
                    type='button'
                    variant='outline'
                    size='sm'
                    className='min-h-11 w-full sm:w-auto'
                    onClick={() => void loadThread(selectedId)}
                    disabled={threadLoading}
                  >
                    Retry
                  </Button>
                </AlertDescription>
              </Alert>
            ) : null}
            <div className='min-w-0 space-y-3 p-4 lg:max-h-[560px] lg:overflow-auto'>
              {threadLoading ? (
                <div className='flex items-center justify-center py-12 text-sm text-muted-foreground'>
                  <Icons.spinner className='mr-2 size-4 animate-spin' />
                  Loading thread
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      'max-w-[85%] min-w-0 overflow-hidden break-words rounded-lg border p-3 text-sm',
                      message.role === 'user' && 'mr-auto bg-muted',
                      message.role === 'assistant' && 'ml-auto border-violet-200 bg-violet-50',
                      message.role === 'staff' && 'ml-auto border-emerald-200 bg-emerald-50'
                    )}
                  >
                    <div className='mb-1 flex min-w-0 flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground'>
                      <span className='font-medium capitalize'>{message.role}</span>
                      <span className='break-words'>{formatDate(message.created_at)}</span>
                    </div>
                    <p className='whitespace-pre-wrap break-words leading-6'>{message.content}</p>
                    {typeof message.confidence === 'number' ? (
                      <p className='mt-2 text-xs text-muted-foreground'>AI confidence: {Math.round(message.confidence * 100)}%</p>
                    ) : null}
                  </div>
                ))
              )}
            </div>
            <div className='border-t p-4'>
              <Textarea
                value={reply}
                onChange={(event) => setReply(event.target.value)}
                placeholder='Write a human support reply...'
                rows={3}
                aria-label='Staff support reply'
              />
              <div className='mt-3 flex justify-end'>
                <Button aria-label='Add staff reply to support ticket' className='min-h-11 w-full sm:w-auto' onClick={requestStaffReply} disabled={sending || !reply.trim()}>
                  {sending ? <Icons.spinner className='mr-2 size-4 animate-spin' /> : <Icons.send className='mr-2 size-4' />}
                  Add Reply
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className='flex min-h-[520px] flex-col items-center justify-center p-8 text-center text-muted-foreground'>
            <Icons.chat className='mb-3 size-10' />
            <p className='text-sm'>Select a ticket to inspect the thread.</p>
          </div>
        )}
      </div>
      <AlertDialog open={Boolean(pendingSupportAction)} onOpenChange={(open) => !open && setPendingSupportAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingSupportAction === 'staff-reply' ? 'Add staff reply?' : 'Create test support ticket?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingSupportAction === 'staff-reply'
                ? 'CreatorOS will append this human reply to the selected support ticket thread.'
                : 'CreatorOS will create a real support ticket for this workspace using the test message.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className='min-h-11' disabled={sending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              aria-label={pendingSupportAction === 'staff-reply' ? 'Confirm staff support reply' : 'Confirm test support ticket creation'}
              className='min-h-11'
              disabled={sending}
              onClick={() => {
                if (pendingSupportAction === 'staff-reply') {
                  void sendStaffReply();
                } else if (pendingSupportAction === 'test-message') {
                  void sendTestMessage();
                }
              }}
            >
              {pendingSupportAction === 'staff-reply' ? 'Add reply' : 'Create ticket'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
