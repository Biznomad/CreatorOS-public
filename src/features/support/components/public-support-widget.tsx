'use client';

import { type FormEvent, useState } from 'react';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

type ChatItem = {
  role: 'user' | 'assistant';
  content: string;
};

const knownBrandNames: Record<string, string> = {
  'demo-brand': 'Demo Brand'
};

function brandNameFromId(brandId: string) {
  const normalized = brandId.trim().toLowerCase();
  if (knownBrandNames[normalized]) return knownBrandNames[normalized];
  return normalized
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function isValidOptionalEmail(value: string) {
  const trimmed = value.trim();
  return !trimmed || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

export default function PublicSupportWidget({ brandId }: { brandId: string }) {
  const brandName = brandNameFromId(brandId);
  const [ticketId, setTicketId] = useState('');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [items, setItems] = useState<ChatItem[]>([
    {
      role: 'assistant',
      content: `Hi, I’m ${brandName} Support. Ask me about your creator program, application, gifting, affiliate rewards, or support questions.`
    }
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const emailInvalid = !isValidOptionalEmail(email);
  const canSend = Boolean(message.trim()) && !emailInvalid;

  async function sendMessage(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (!isValidOptionalEmail(email)) {
      setError('Add a valid email address or leave email blank.');
      return;
    }
    if (!message.trim()) {
      setError('Add a support question before sending.');
      return;
    }
    const outbound = message.trim();
    setItems((current) => [...current, { role: 'user', content: outbound }]);
    setMessage('');
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/proxy/api/support/public/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand_id: brandId,
          ticket_id: ticketId || undefined,
          customer_email: email.trim(),
          customer_name: name.trim(),
          message: outbound,
          source: 'public-widget',
          page_url: typeof window !== 'undefined' ? window.location.href : ''
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || data.error || 'Support is unavailable right now');
      if (data.ticket?.id) setTicketId(data.ticket.id);
      setItems((current) => [...current, { role: 'assistant', content: data.response || 'I created a support ticket for this.' }]);
    } catch (err) {
      const detail = err instanceof Error ? err.message : 'Support is unavailable right now';
      setMessage(outbound);
      setError(detail);
      setItems((current) => [...current, { role: 'assistant', content: 'I could not reach the support desk just now. Please try again in a moment.' }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className='min-h-screen min-w-0 overflow-x-hidden bg-slate-50 p-4 text-slate-950'>
      <div className='mx-auto flex min-h-[calc(100vh-2rem)] min-w-0 max-w-2xl flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm'>
        <header className='border-b border-slate-200 px-5 py-4'>
          <div className='flex min-w-0 items-center gap-3'>
            <div className='flex size-10 items-center justify-center rounded-full bg-slate-950 text-white'>
              <Icons.help className='size-5' />
            </div>
            <div className='min-w-0'>
              <h1 className='break-words text-base font-semibold text-slate-950'>{brandName} Support</h1>
              <p className='break-words text-sm text-slate-600'>Creator program help desk</p>
            </div>
          </div>
        </header>

        <form className='contents' onSubmit={sendMessage} noValidate>
        <section className='grid min-w-0 gap-2 border-b border-slate-200 p-4 sm:grid-cols-2'>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className='min-h-11 min-w-0 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 placeholder:text-slate-500'
            placeholder='Name'
            aria-label='Name'
            autoComplete='name'
          />
          <input
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              if (error && isValidOptionalEmail(event.target.value)) setError('');
            }}
            className={cn(
              'min-h-11 min-w-0 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 placeholder:text-slate-500',
              error && !isValidOptionalEmail(email) ? 'border-red-300' : ''
            )}
            placeholder='Email'
            aria-label='Email'
            aria-invalid={emailInvalid}
            aria-describedby={error && emailInvalid ? 'support-widget-error' : undefined}
            type='email'
            autoComplete='email'
          />
        </section>

        <section className='min-w-0 flex-1 space-y-3 overflow-auto p-4'>
          {items.map((item, index) => (
            <div
              key={`${item.role}-${index}`}
              className={`max-w-[86%] min-w-0 overflow-hidden break-words rounded-lg border p-3 text-sm leading-6 ${
                item.role === 'user' ? 'ml-auto border-slate-950 bg-slate-950 text-white' : 'mr-auto border-slate-200 bg-slate-50 text-slate-800'
              }`}
            >
              {item.content}
            </div>
          ))}
          {error ? (
            <p id='support-widget-error' role='alert' aria-live='polite' className='break-words rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-700'>
              {error}
            </p>
          ) : null}
        </section>

        <footer className='min-w-0 border-t border-slate-200 p-4'>
          <Textarea
            value={message}
            onChange={(event) => {
              setMessage(event.target.value);
              if (error && event.target.value.trim() && !emailInvalid) setError('');
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                void sendMessage();
              }
            }}
            rows={3}
            placeholder='Ask a support question...'
            aria-label='Support question'
            className='min-h-24 w-full min-w-0 border-slate-300 bg-white text-slate-950 placeholder:text-slate-500 dark:bg-white dark:text-slate-950 dark:placeholder:text-slate-500'
          />
          <Button type='submit' aria-label='Send support question' className='mt-3 min-h-11 w-full min-w-0 gap-2' disabled={loading || !canSend}>
            {loading ? <Icons.spinner className='mr-2 size-4 animate-spin' /> : <Icons.send className='mr-2 size-4' />}
            Send
          </Button>
        </footer>
        </form>
      </div>
    </main>
  );
}
