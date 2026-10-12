'use client';

import { useState } from 'react';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

type SubmissionState = 'idle' | 'submitting' | 'success' | 'error';

const followerRanges = [
  { label: '1K - 5K', value: '1000' },
  { label: '5K - 10K', value: '5000' },
  { label: '10K - 25K', value: '10000' },
  { label: '25K - 50K', value: '25000' },
  { label: '50K - 100K', value: '50000' },
  { label: '100K+', value: '100000' }
];

const niches = [
  'Fitness & Health',
  'Skincare & Beauty',
  'Wellness & Lifestyle',
  'Nutrition & Supplements',
  'Motherhood & Family',
  'Fashion',
  'Food & Recipes',
  'Other'
];

const knownBrandNames: Record<string, string> = {
  'demo-brand': 'Demo Brand'
};

function cleanHandle(value: string) {
  return value.trim().replace(/^@+/, '');
}

function brandNameFromId(brandId: string) {
  const normalized = brandId.trim().toLowerCase();
  if (knownBrandNames[normalized]) return knownBrandNames[normalized];
  return normalized
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidHttpUrl(value: string) {
  if (!value) return true;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function validateApplicationForm(payload: {
  name: string;
  email: string;
  instagram_handle?: string;
  tiktok_handle?: string;
  follower_count: number;
  niche: string;
  content_examples: string[];
}) {
  if (!payload.name) return 'Add your full name.';
  if (payload.name.length > 120) return 'Use 120 characters or fewer for your name.';
  if (!payload.email || !isValidEmail(payload.email)) return 'Add a valid email address.';
  if (payload.email.length > 254) return 'Use 254 characters or fewer for your email address.';
  if ((payload.instagram_handle || '').length > 50 || (payload.tiktok_handle || '').length > 50) return 'Use 50 characters or fewer for social handles.';
  if (!payload.instagram_handle && !payload.tiktok_handle) return 'Add at least one Instagram or TikTok handle.';
  if (!Number.isFinite(payload.follower_count) || payload.follower_count < 1000) return 'Select your follower count range.';
  if (!payload.niche) return 'Select your content niche.';
  if (payload.content_examples.some((example) => example.length > 500)) return 'Use 500 characters or fewer for content links.';
  if (payload.content_examples.some((example) => !isValidHttpUrl(example))) return 'Use a valid http or https content link.';
  return null;
}

export function PublicApplicationPage({ brandId }: { brandId: string }) {
  const [submissionState, setSubmissionState] = useState<SubmissionState>('idle');
  const [message, setMessage] = useState('');
  const [followerCount, setFollowerCount] = useState('');
  const [niche, setNiche] = useState('');
  const brandName = brandNameFromId(brandId);

  async function submitApplication(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const instagramHandle = cleanHandle(String(formData.get('instagram_handle') || ''));
    const tiktokHandle = cleanHandle(String(formData.get('tiktok_handle') || ''));
    const contentExample = String(formData.get('content_example') || '').trim();

    const payload = {
      brand_id: brandId,
      name: String(formData.get('name') || '').trim(),
      email: String(formData.get('email') || '').trim(),
      instagram_handle: instagramHandle || undefined,
      tiktok_handle: tiktokHandle || undefined,
      follower_count: Number.parseInt(followerCount, 10),
      niche,
      location: String(formData.get('location') || '').trim(),
      content_examples: contentExample ? [contentExample] : [],
      why_interested: String(formData.get('why_interested') || '').trim()
    };
    const validationError = validateApplicationForm(payload);
    if (validationError) {
      setSubmissionState('error');
      setMessage(validationError);
      return;
    }

    setSubmissionState('submitting');
    setMessage('');

    try {
      const response = await fetch('/api/proxy/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.detail || data.error || 'Application could not be submitted.');
      }
      setSubmissionState('success');
      setMessage("Application submitted. We'll review it and follow up soon.");
      form.reset();
      setFollowerCount('');
      setNiche('');
    } catch (error) {
      setSubmissionState('error');
      setMessage(error instanceof Error ? error.message : 'Application could not be submitted.');
    }
  }

  return (
    <main className='min-h-screen min-w-0 overflow-x-hidden bg-background text-foreground'>
      <section className='border-b bg-muted/30'>
        <div className='mx-auto grid max-w-6xl min-w-0 gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-center lg:py-16'>
          <div className='min-w-0 space-y-5'>
            <div className='inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-sm text-muted-foreground'>
              <Icons.sparkles className='size-4 text-primary' />
              <span className='min-w-0 break-words'>{brandName} creator partnership application</span>
            </div>
            <div className='space-y-3'>
              <h1 className='max-w-3xl break-words text-4xl font-semibold tracking-normal sm:text-5xl'>Create content, get rewarded, and grow with {brandName}.</h1>
              <p className='max-w-2xl text-base leading-7 text-muted-foreground'>
                Apply for product gifting, affiliate rewards, whitelisted ads, and paid creator opportunities.
              </p>
            </div>
            <div className='grid max-w-2xl gap-3 sm:grid-cols-3'>
              {['Free products', 'Affiliate payouts', 'Paid amplification'].map((item) => (
                <div key={item} className='min-w-0 rounded-lg border bg-background p-3 text-sm font-medium'>
                  {item}
                </div>
              ))}
            </div>
          </div>

          <Card className='min-w-0 overflow-hidden rounded-lg'>
            <CardHeader>
              <CardTitle className='break-words'>Apply to Join {brandName}</CardTitle>
            </CardHeader>
            <CardContent>
              <form className='min-w-0 space-y-4' onSubmit={submitApplication}>
                <div className='grid gap-2'>
                  <Label htmlFor='name'>Full name</Label>
                  <Input id='name' name='name' aria-label='Full name' required autoComplete='name' maxLength={120} />
                </div>
                <div className='grid gap-2'>
                  <Label htmlFor='email'>Email</Label>
                  <Input id='email' name='email' type='email' aria-label='Email' required autoComplete='email' maxLength={254} />
                </div>
                <div className='grid gap-3 sm:grid-cols-2'>
                  <div className='grid gap-2'>
                    <Label htmlFor='instagram_handle'>Instagram</Label>
                    <Input id='instagram_handle' name='instagram_handle' aria-label='Instagram handle' placeholder='@handle' maxLength={50} />
                  </div>
                  <div className='grid gap-2'>
                    <Label htmlFor='tiktok_handle'>TikTok</Label>
                    <Input id='tiktok_handle' name='tiktok_handle' aria-label='TikTok handle' placeholder='@handle' maxLength={50} />
                  </div>
                </div>
                <div className='grid gap-3 sm:grid-cols-2'>
                  <div className='grid gap-2'>
                    <Label id='follower-count-label' htmlFor='follower-count-trigger'>Follower count</Label>
                    <Select name='follower_count' value={followerCount} onValueChange={setFollowerCount} required>
                      <SelectTrigger id='follower-count-trigger' className='min-h-11 w-full min-w-0 [&>span]:truncate' aria-label='Follower count' aria-labelledby='follower-count-label'>
                        <SelectValue placeholder='Select range' />
                      </SelectTrigger>
                      <SelectContent>
                        {followerRanges.map((range) => (
                          <SelectItem key={range.value} value={range.value}>{range.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className='grid gap-2'>
                    <Label id='content-niche-label' htmlFor='content-niche-trigger'>Content niche</Label>
                    <Select name='niche' value={niche} onValueChange={setNiche} required>
                      <SelectTrigger id='content-niche-trigger' className='min-h-11 w-full min-w-0 [&>span]:truncate' aria-label='Content niche' aria-labelledby='content-niche-label'>
                        <SelectValue placeholder='Select niche' />
                      </SelectTrigger>
                      <SelectContent>
                        {niches.map((item) => (
                          <SelectItem key={item} value={item}>{item}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className='grid gap-2'>
                  <Label htmlFor='location'>Location</Label>
                  <Input id='location' name='location' aria-label='Location' placeholder='City, state' maxLength={120} />
                </div>
                <div className='grid gap-2'>
                  <Label htmlFor='content_example'>Best content link</Label>
                  <Input id='content_example' name='content_example' type='url' aria-label='Best content link' placeholder='https://...' maxLength={500} />
                </div>
                <div className='grid gap-2'>
                  <Label htmlFor='why_interested'>Why are you interested?</Label>
                  <Textarea id='why_interested' name='why_interested' aria-label='Why are you interested?' rows={4} maxLength={1000} />
                </div>
                {message && (
                  <p role={submissionState === 'error' ? 'alert' : 'status'} aria-live='polite' className={cn('break-words rounded-lg border px-3 py-2 text-sm', submissionState === 'success' ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950/40 dark:text-green-300' : 'border-destructive/30 bg-destructive/10 text-destructive')}>
                    {message}
                  </p>
                )}
                <Button aria-label='Submit creator application' className='min-h-11 w-full min-w-0 gap-2' type='submit' disabled={submissionState === 'submitting'}>
                  {submissionState === 'submitting' && <Icons.spinner className='size-4 animate-spin' />}
                  {submissionState === 'submitting' ? 'Submitting' : 'Submit Application'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}
