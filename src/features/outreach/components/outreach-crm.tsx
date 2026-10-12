'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
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
import { Icons } from '@/components/icons';
import { toast } from 'sonner';
import { useEffectiveBrandId } from '@/hooks/use-effective-brand';
import { cn } from '@/lib/utils';
import { withLocalQaMarker } from '@/lib/whitelabel-api';
import Link from 'next/link';

type OutreachMessage = {
  id: string;
  handle: string;
  display_name: string;
  avatar_url: string;
  platform: string;
  channel: string;
  message: string;
  subject?: string;
  status: string;
  created_at: string;
  sent_at?: string;
  creator_id?: string;
  score?: number;
};

type OutreachRow = Partial<OutreachMessage> & {
  id?: string | number;
  creator_handle?: string;
};

type ConversationGroup = {
  handle: string;
  display_name: string;
  avatar_url: string;
  platform: string;
  channel: 'dm' | 'email';
  score: number;
  lastMessage: string;
  lastDate: string;
  status: string;
  messages: OutreachMessage[];
  unread: number;
};

const OUTREACH_STATUS_OPTIONS = [
  'pending',
  'approved',
  'rejected',
  'sent',
  'delivered',
  'replied',
  'declined',
  'failed'
] as const;

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 86400000)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (diff < 604800000)
    return d.toLocaleDateString([], { weekday: 'short' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'sent':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300';
    case 'delivered':
      return 'bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-300';
    case 'replied':
      return 'bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300';
    case 'pending':
      return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/50 dark:text-yellow-300';
    case 'approved':
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300';
    case 'rejected':
      return 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300';
    case 'declined':
      return 'bg-zinc-100 text-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-300';
    case 'failed':
      return 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

function normalizeComposeChannel(channel?: string, platform?: string): 'dm' | 'email' {
  return channel === 'email' || platform === 'email' || channel === 'proposal' ? 'email' : 'dm';
}

function normalizeScore(value: unknown) {
  const score = Number(value);
  return Number.isFinite(score) && score > 0 ? score : 0;
}

function formatScore(score: number) {
  return score > 0 ? `Score ${score}` : 'Unscored';
}

export default function OutreachCRM() {
  const activeBrandId = useEffectiveBrandId();
  const [messages, setMessages] = useState<OutreachMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedHandle, setSelectedHandle] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [composeChannel, setComposeChannel] = useState<'dm' | 'email'>('dm');
  const [sending, setSending] = useState(false);
  const [previewingSend, setPreviewingSend] = useState(false);
  const [generatingMessage, setGeneratingMessage] = useState(false);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
  const [pendingSendConfirmation, setPendingSendConfirmation] = useState(false);
  const [pendingStatusUpdate, setPendingStatusUpdate] = useState<{
    messageId: string;
    status: string;
    handle: string;
  } | null>(null);
  const [emailProviderReady, setEmailProviderReady] = useState<boolean | null>(null);
  const [emailProviderReason, setEmailProviderReason] = useState('');
  const threadPanelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!activeBrandId) {
      setMessages([]);
      setSelectedHandle(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    fetch(withLocalQaMarker(`/api/proxy/api/outreach?brand_id=${encodeURIComponent(activeBrandId)}&limit=200`))
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const rows = (Array.isArray(data)
          ? data
          : data.outreach || data.messages || []) as OutreachRow[];
        setMessages(
          rows.map((r) => ({
            id: String(r.id),
            handle: r.handle || r.creator_handle || '',
            display_name: r.display_name || r.handle || '',
            avatar_url: r.avatar_url || '',
            platform: r.platform || 'instagram',
            channel: normalizeComposeChannel(r.channel, r.platform),
            message: r.message || '',
            subject: r.subject,
            status: r.status || 'pending',
            created_at: r.created_at || '',
            sent_at: r.sent_at,
            creator_id: r.creator_id ? String(r.creator_id) : undefined,
            score: normalizeScore(r.score)
          }))
        );
      })
      .catch(() => {
        if (!cancelled) setMessages([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeBrandId]);

  useEffect(() => {
    if (!activeBrandId) {
      setEmailProviderReady(null);
      setEmailProviderReason('');
      return;
    }

    let cancelled = false;
    fetch(withLocalQaMarker(`/api/proxy/api/readiness?brand_id=${encodeURIComponent(activeBrandId)}`))
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const outreach = data?.checks?.outreach_providers;
        setEmailProviderReady(outreach?.ok === true);
        setEmailProviderReason(
          typeof outreach?.required_action === 'string'
            ? outreach.required_action
            : outreach?.missing_fields?.length
              ? `Email provider missing ${outreach.missing_fields.join(', ')}`
              : ''
        );
      })
      .catch(() => {
        if (cancelled) return;
        setEmailProviderReady(null);
        setEmailProviderReason('');
      });

    return () => {
      cancelled = true;
    };
  }, [activeBrandId]);

  // Group messages by creator handle
  const conversations: ConversationGroup[] = useMemo(() => {
    const map = new Map<string, ConversationGroup>();
    for (const msg of messages) {
      const key = msg.handle;
      if (!map.has(key)) {
        map.set(key, {
          handle: msg.handle,
          display_name: msg.display_name,
          avatar_url: msg.avatar_url,
          platform: msg.platform,
          channel: normalizeComposeChannel(msg.channel, msg.platform),
          score: normalizeScore(msg.score),
          lastMessage: msg.message,
          lastDate: msg.created_at,
          status: msg.status,
          messages: [],
          unread: 0
        });
      }
      const group = map.get(key)!;
      group.messages.push(msg);
      if (msg.created_at > group.lastDate) {
        group.lastMessage = msg.message;
        group.lastDate = msg.created_at;
        group.status = msg.status;
        group.channel = normalizeComposeChannel(msg.channel, msg.platform);
      }
      if (msg.status === 'replied') group.unread++;
    }
    return Array.from(map.values()).toSorted((a, b) =>
      b.lastDate.localeCompare(a.lastDate)
    );
  }, [messages]);

  // Filter conversations
  const filtered = conversations.filter((c) => {
    if (
      search &&
      !c.handle.toLowerCase().includes(search.toLowerCase()) &&
      !c.display_name.toLowerCase().includes(search.toLowerCase())
    )
      return false;
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    return true;
  });

  const selected = useMemo(
    () => conversations.find((c) => c.handle === selectedHandle),
    [conversations, selectedHandle]
  );
  const selectedCreatorId = selected?.messages.find((message) => message.creator_id)?.creator_id;
  const emailDeliveryBlocked = composeChannel === 'email' && emailProviderReady === false;
  const dmDeliveryNeedsRecipient = composeChannel === 'dm' && selected?.platform !== 'email';

  useEffect(() => {
    if (conversations.length === 0) {
      if (selectedHandle) setSelectedHandle(null);
      return;
    }

    if (!selectedHandle || !conversations.some((conversation) => conversation.handle === selectedHandle)) {
      setSelectedHandle(conversations[0].handle);
    }
  }, [conversations, selectedHandle]);

  useEffect(() => {
    if (!selected) return;
    setComposeChannel(selected.channel);
  }, [selected]);

  useEffect(() => {
    if (!selectedHandle || typeof window === 'undefined' || window.innerWidth >= 1024) {
      return;
    }
    window.requestAnimationFrame(() => {
      threadPanelRef.current?.scrollIntoView({ block: 'start' });
    });
  }, [selectedHandle]);

  async function updateMessageStatus(messageId: string, status: string) {
    if (!activeBrandId) {
      toast.error('Select a client brand before updating outreach.');
      return;
    }
    setUpdatingStatusId(messageId);
    try {
      const res = await fetch(withLocalQaMarker(`/api/proxy/api/outreach/${messageId}?brand_id=${encodeURIComponent(activeBrandId)}`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brand_id: activeBrandId, status })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.detail || data.error || 'Failed to update status');
      }

      setMessages((prev) =>
        prev.map((message) =>
          message.id === messageId
            ? {
                ...message,
                status: data.status || status,
                sent_at: data.sent_at || message.sent_at
              }
            : message
        )
      );
      toast.success(`Marked as ${data.status || status}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to update status'
      );
    } finally {
      setPendingStatusUpdate(null);
      setUpdatingStatusId(null);
    }
  }

  function requestMessageStatusUpdate(message: OutreachMessage, status: string) {
    if (message.status === status) return;
    if (!activeBrandId) {
      toast.error('Select a client brand before updating outreach.');
      return;
    }
    setPendingStatusUpdate({
      messageId: message.id,
      status,
      handle: message.handle
    });
  }

  async function handleSendMessage() {
    if (!newMessage.trim() || !selectedHandle) return;
    if (!activeBrandId) {
      toast.error('Select a client brand before sending outreach.');
      return;
    }
    setSending(true);
    try {
      const res = await fetch(withLocalQaMarker('/api/proxy/api/outreach/send'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand_id: activeBrandId,
          creator_id: selectedCreatorId,
          handle: selectedHandle,
          platform: selected?.platform || 'instagram',
          channel: composeChannel,
          message: newMessage.trim()
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || data.error || 'Failed');
      // Add to local state
      setMessages((prev) => [
        ...prev,
        {
          id: data.id || String(Date.now()),
          handle: selectedHandle,
          display_name: selected?.display_name || selectedHandle,
          avatar_url: selected?.avatar_url || '',
          platform: selected?.platform || 'instagram',
          channel: composeChannel,
          message: newMessage.trim(),
          status: data.status || (data.delivered ? 'sent' : 'pending'),
          created_at: new Date().toISOString(),
          sent_at: data.sent_at,
          creator_id: data.creator_id || selectedCreatorId,
          score: normalizeScore(selected?.score)
        }
      ]);
      setNewMessage('');
      if (data.delivered) {
        toast.success('Message sent');
      } else {
        toast.warning(data.delivery?.reason || 'Message saved for review');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to send message');
    } finally {
      setPendingSendConfirmation(false);
      setSending(false);
    }
  }

  function requestSendMessage() {
    if (!newMessage.trim() || !selectedHandle) return;
    if (!activeBrandId) {
      toast.error('Select a client brand before sending outreach.');
      return;
    }
    setPendingSendConfirmation(true);
  }

  async function handlePreviewSendMessage() {
    if (!newMessage.trim() || !selectedHandle) return;
    if (!activeBrandId) {
      toast.error('Select a client brand before previewing outreach.');
      return;
    }
    setPreviewingSend(true);
    try {
      const res = await fetch(withLocalQaMarker('/api/proxy/api/outreach/send'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand_id: activeBrandId,
          creator_id: selectedCreatorId,
          handle: selectedHandle,
          platform: selected?.platform || 'instagram',
          channel: composeChannel,
          message: newMessage.trim(),
          dry_run: true
        })
      });
      const data = await res.json();
      if (!res.ok) {
        const reason = data.delivery?.reason || data.detail || data.error || 'Outreach dry run failed';
        if (composeChannel === 'dm' && /recipient|instagram|meta/i.test(reason)) {
          toast.warning(`Dry run ready: ${reason}`);
          return;
        }
        throw new Error(reason);
      }
      if (data.delivery?.deliverable) {
        toast.success(`Dry run ready: ${composeChannel === 'email' ? 'email' : 'DM'} can be sent.`);
      } else {
        toast.warning(
          data.delivery?.reason
            ? `Dry run ready: ${data.delivery.reason}`
            : 'Dry run ready: message would be saved pending delivery.'
        );
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Outreach dry run failed');
    } finally {
      setPreviewingSend(false);
    }
  }

  async function handleAIGenerate() {
    if (!selectedHandle || !selected) return;
    if (!activeBrandId) {
      toast.error('Select a client brand before generating outreach.');
      return;
    }
    setGeneratingMessage(true);
    toast.info('AI previewing contextual message...');
    try {
      // Include conversation history for context
      const previousMessages = selected.messages
        .toSorted((a, b) => a.created_at.localeCompare(b.created_at))
        .map((m) => `[${m.status}] ${m.message.slice(0, 200)}`)
        .join('\n');

      const res = await fetch(withLocalQaMarker('/api/proxy/api/outreach'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand_id: activeBrandId,
          handle: selectedHandle,
          platform: selected.platform || 'instagram',
          channel: composeChannel,
          subject: previousMessages ? `follow-up context:\n${previousMessages}` : undefined,
          dry_run: true
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || data.error || 'Failed');
      if (data.message) {
        setNewMessage(data.message);
        toast.success('AI message preview ready — review and edit before sending');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'AI generation failed');
    } finally {
      setGeneratingMessage(false);
    }
  }

  if (loading) {
    return (
      <div className='flex min-h-[520px] flex-col overflow-hidden rounded-lg border lg:h-[calc(100dvh-11rem)] lg:flex-row'>
        <div className='h-80 shrink-0 space-y-3 overflow-hidden border-b p-4 lg:h-auto lg:w-80 lg:border-r lg:border-b-0'>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className='h-16 animate-pulse bg-muted rounded-lg' />
          ))}
        </div>
        <div className='h-[calc(100dvh-8rem)] min-h-[520px] flex-1 p-4 lg:h-auto'>
          <div className='h-full animate-pulse bg-muted rounded-lg' />
        </div>
      </div>
    );
  }

  return (
    <div className='flex min-h-[520px] flex-col overflow-hidden rounded-lg border bg-background lg:h-[calc(100dvh-11rem)] lg:flex-row'>
      {/* Left Panel — Conversation List */}
      <div className='flex h-80 min-h-0 min-w-0 w-full shrink-0 flex-col border-b bg-muted/20 lg:h-auto lg:w-80 lg:border-r lg:border-b-0'>
        <div className='shrink-0 p-3 space-y-2 border-b'>
          <Input
            aria-label='Search outreach conversations'
            placeholder='Search creators...'
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className='min-h-11 text-xs'
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className='min-h-11 text-xs' aria-label='Filter outreach conversations by status'>
              <SelectValue placeholder='All Status' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>All Status</SelectItem>
              {OUTREACH_STATUS_OPTIONS.map((status) => (
                <SelectItem key={status} value={status} className='capitalize'>
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <ScrollArea className='min-h-0 min-w-0 flex-1 [&_[data-slot=scroll-area-viewport]>div]:!block [&_[data-slot=scroll-area-viewport]>div]:w-full'>
          {filtered.length === 0 ? (
            <div className='p-4 text-center'>
              <Icons.send className='mx-auto mb-2 size-6 text-muted-foreground/40' />
              <p className='text-xs text-muted-foreground'>
                No conversations yet
              </p>
              <p className='text-[10px] text-muted-foreground mt-1'>
                Send proposals from the Activation page
              </p>
            </div>
          ) : (
            <div className='divide-y'>
              {filtered.map((conv) => (
                <button
                  key={conv.handle}
                  className={cn(
                    'flex w-full max-w-full items-start gap-3 overflow-hidden p-3 text-left transition-colors hover:bg-muted/50 cursor-pointer',
                    selectedHandle === conv.handle && 'bg-muted'
                  )}
                  onClick={() => {
                    setSelectedHandle(conv.handle);
                    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                      window.setTimeout(() => {
                        threadPanelRef.current?.scrollIntoView({ block: 'start' });
                      }, 50);
                    }
                  }}
                >
                  <Avatar className='size-9 shrink-0'>
                    <AvatarImage src={conv.avatar_url} alt={conv.display_name || conv.handle} />
                    <AvatarFallback className='text-[10px]'>
                      {(conv.display_name || conv.handle)
                        .slice(0, 2)
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className='min-w-0 flex-1 overflow-hidden'>
                    <div className='flex items-center justify-between'>
                      <p className='text-xs font-semibold truncate'>
                        @{conv.handle}
                      </p>
                      <span className='text-[10px] text-muted-foreground shrink-0'>
                        {formatDate(conv.lastDate)}
                      </span>
                    </div>
                    <p className='mt-0.5 line-clamp-2 min-w-0 overflow-hidden break-words text-[10px] leading-snug text-muted-foreground'>
                      {conv.lastMessage.slice(0, 60)}...
                    </p>
                    <div className='flex items-center gap-1.5 mt-1'>
                      <Badge
                        className={cn(
                          'text-[9px] px-1 py-0',
                          getStatusColor(conv.status)
                        )}
                      >
                        {conv.status}
                      </Badge>
                      {(() => {
                        const lastDate = new Date(conv.lastDate);
                        const daysSince = (Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24);
                        if (daysSince >= 3 && conv.status !== 'replied') {
                          return <Badge className='text-[9px] px-1 py-0 bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300'>Follow up</Badge>;
                        }
                        return null;
                      })()}
                      {conv.messages.length > 1 && (
                        <span className='text-[9px] text-muted-foreground'>
                          {conv.messages.length} msgs
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
        <div className='shrink-0 border-t p-2'>
          <p className='text-[10px] text-muted-foreground text-center'>
            {filtered.length} conversation{filtered.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Right Panel — Conversation Thread */}
      <div
        ref={threadPanelRef}
        className='flex h-[calc(100dvh-7rem)] min-h-[520px] min-w-0 scroll-mt-20 flex-col overflow-hidden lg:h-auto lg:min-h-0'
        style={{ maxHeight: 'calc(100dvh - 8rem)' }}
      >
        {!selected ? (
          <div className='min-h-0 flex-1 flex flex-col items-center justify-center text-center p-8'>
            <Icons.send className='size-12 text-muted-foreground/20 mb-4' />
            <h3 className='text-lg font-semibold'>Select a conversation</h3>
            <p className='text-sm text-muted-foreground mt-1'>
              Choose a creator from the left to view their outreach thread
            </p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className='flex shrink-0 flex-wrap items-center gap-3 border-b p-4'>
              <Avatar className='size-10'>
                <AvatarImage src={selected.avatar_url} alt={selected.display_name || selected.handle} />
                <AvatarFallback>
                  {(selected.display_name || selected.handle)
                    .slice(0, 2)
                    .toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className='min-w-0 flex-1'>
                <div className='flex flex-wrap items-center gap-2'>
                  <p className='min-w-0 truncate font-semibold'>@{selected.handle}</p>
                  <Badge variant='outline' className='text-[10px]'>
                    {selected.platform}
                  </Badge>
                  <Badge variant='secondary' className='text-[10px]'>
                    {formatScore(selected.score)}
                  </Badge>
                </div>
                <p className='text-xs text-muted-foreground'>
                  {selected.display_name}
                </p>
              </div>
              <Button asChild variant='outline' size='sm' className='min-h-11 gap-1.5 text-xs'>
                <Link
                  href={
                    selectedCreatorId
                      ? `/dashboard/creators?creator=${encodeURIComponent(selectedCreatorId)}`
                      : `/dashboard/creators?search=${encodeURIComponent(selected.handle)}`
                  }
                  aria-label={`View profile for ${selected.display_name || selected.handle}`}
                >
                  <Icons.externalLink className='size-3' />
                  View Profile
                </Link>
              </Button>
            </div>

            {/* Messages */}
            <ScrollArea className='min-h-0 min-w-0 flex-1 [&_[data-slot=scroll-area-viewport]>div]:!block [&_[data-slot=scroll-area-viewport]>div]:w-full'>
              <div className='space-y-4 p-4 pb-6'>
                {selected.messages
                  .toSorted((a, b) => a.created_at.localeCompare(b.created_at))
                  .map((msg) => (
                    <div key={msg.id} className='flex gap-3'>
                      <div className='flex size-7 shrink-0 items-center justify-center rounded-full bg-indigo-500/10'>
                        <Icons.send className='size-3 text-indigo-600' />
                      </div>
                      <div className='flex-1 min-w-0'>
                        <div className='flex items-center gap-2 mb-1'>
                          <span className='text-xs font-medium'>You</span>
                          <span className='text-[10px] text-muted-foreground'>
                            {formatDate(msg.created_at)}
                          </span>
                          <Badge
                            className={cn(
                              'text-[9px] px-1 py-0',
                              getStatusColor(msg.status)
                            )}
                          >
                            {msg.status}
                          </Badge>
                          <Badge
                            variant='outline'
                            className='text-[9px] px-1'
                          >
                            {msg.channel}
                          </Badge>
                          <Select
                            value={msg.status}
                            onValueChange={(status) =>
                              requestMessageStatusUpdate(msg, status)
                            }
                            disabled={updatingStatusId === msg.id || Boolean(pendingStatusUpdate)}
                          >
                            <SelectTrigger className='min-h-11 w-28 text-[10px] capitalize' aria-label={`Update outreach status for ${msg.handle}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {OUTREACH_STATUS_OPTIONS.map((status) => (
                                <SelectItem
                                  key={status}
                                  value={status}
                                  className='capitalize'
                                >
                                  {status}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className='min-w-0 rounded-lg bg-muted/50 p-3'>
                          <p className='min-w-0 break-words text-sm leading-relaxed whitespace-pre-line'>
                            {msg.message}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </ScrollArea>

            {/* Compose */}
            <div className='shrink-0 border-t bg-background p-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]'>
              <div className='mb-2 flex flex-wrap gap-2'>
                <Button
                  variant='outline'
                  size='sm'
                  className='min-h-11 gap-1.5 text-xs'
                  onClick={handleAIGenerate}
                  disabled={sending || previewingSend || generatingMessage}
                >
                  {generatingMessage ? <Icons.spinner className='size-3 animate-spin' /> : <Icons.sparkles className='size-3' />}
                  {generatingMessage ? 'Generating...' : 'AI Generate'}
                </Button>
                {newMessage && (
                  <Button
                    variant='ghost'
                    size='sm'
                    className='min-h-11 gap-1.5 text-xs'
                    onClick={handleAIGenerate}
                    disabled={sending || previewingSend || generatingMessage}
                  >
                    {generatingMessage ? <Icons.spinner className='size-3 animate-spin' /> : <Icons.sparkles className='size-3' />}
                    Try Another
                  </Button>
                )}
                <div
                  role='group'
                  aria-label='Outreach message channel'
                  className='inline-flex min-h-11 shrink-0 items-center rounded-md border bg-muted/30 p-1'
                >
                  {(['dm', 'email'] as const).map((channel) => (
                    <Button
                      key={channel}
                      type='button'
                      variant={composeChannel === channel ? 'default' : 'ghost'}
                      size='sm'
                      className='min-h-11 min-w-11 px-3 text-xs'
                      aria-pressed={composeChannel === channel}
                      aria-label={`Use ${channel === 'email' ? 'email' : 'DM'} outreach channel`}
                      onClick={() => setComposeChannel(channel)}
                      disabled={sending || previewingSend || generatingMessage}
                    >
                      {channel === 'email' ? 'Email' : 'DM'}
                    </Button>
                  ))}
                </div>
              </div>
              {emailDeliveryBlocked && (
                <div className='mb-2 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100'>
                  <Icons.warning className='mt-0.5 size-3.5 shrink-0' />
                  <span>
                    {emailProviderReason || 'Connect Resend or Mailgun before sending live outreach email.'}
                  </span>
                </div>
              )}
              {dmDeliveryNeedsRecipient && (
                <div className='mb-2 flex items-start gap-2 rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-900 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-100'>
                  <Icons.info className='mt-0.5 size-3.5 shrink-0' />
                  <span>
                    Instagram DMs need a Meta webhook-scoped recipient ID for live delivery. Preview will verify readiness; Send saves pending if Meta cannot deliver yet.
                  </span>
                </div>
              )}
              <div className='flex min-w-0 flex-col gap-2 sm:flex-row sm:items-end'>
                <Textarea
                  aria-label='Outreach message'
                  placeholder='Type a message or click AI Generate...'
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className='min-h-24 w-full min-w-0 max-h-40 resize-none text-sm'
                  rows={2}
                />
                <div className='grid shrink-0 grid-cols-2 gap-2 sm:flex sm:justify-end sm:self-end'>
                  <Button
                    variant='outline'
                    className='min-h-11 min-w-0 gap-2 px-3 sm:min-w-28'
                    aria-label='Preview outreach send'
                    title='Preview send'
                    onClick={handlePreviewSendMessage}
                    disabled={!newMessage.trim() || sending || previewingSend || generatingMessage}
                  >
                    {previewingSend ? <Icons.spinner className='size-4 animate-spin' /> : <Icons.checks className='size-4' />}
                    <span className='truncate'>Preview</span>
                  </Button>
                  <Button
                    className='min-h-11 min-w-0 gap-2 px-3 sm:min-w-28'
                    aria-label='Send outreach message'
                    title='Send message'
                    onClick={requestSendMessage}
                    disabled={!newMessage.trim() || sending || previewingSend || generatingMessage}
                  >
                    <Icons.send className='size-4' />
                    <span className='truncate'>Send</span>
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
      <AlertDialog open={pendingSendConfirmation} onOpenChange={setPendingSendConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send outreach message?</AlertDialogTitle>
            <AlertDialogDescription>
              CreatorOS will attempt delivery to @{selectedHandle} through {composeChannel === 'email' ? 'email' : 'DM'} and save the result to this outreach thread. Use Preview Send first if you need a read-only delivery check.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={sending}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={sending} onClick={() => void handleSendMessage()}>
              Send message
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={Boolean(pendingStatusUpdate)} onOpenChange={(open) => !open && setPendingStatusUpdate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Update outreach status?</AlertDialogTitle>
            <AlertDialogDescription>
              CreatorOS will mark @{pendingStatusUpdate?.handle || 'this creator'} as {pendingStatusUpdate?.status || 'updated'} for this message. This changes the outreach pipeline state.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={Boolean(updatingStatusId)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={Boolean(updatingStatusId)}
              onClick={() => {
                if (pendingStatusUpdate) {
                  void updateMessageStatus(pendingStatusUpdate.messageId, pendingStatusUpdate.status);
                }
              }}
            >
              Update status
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
