'use client';

import Link from 'next/link';
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { InteractiveGridPattern } from '@/features/auth/components/interactive-grid';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Icons } from '@/components/icons';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ─── Creator Preview Card ────────────────────────────────────────────────────

function CreatorPreviewCard() {
  const scores = [
    { label: 'Engagement', value: 8.7, max: 10, color: 'bg-indigo-500' },
    { label: 'Niche Fit', value: 9.2, max: 10, color: 'bg-purple-500' },
    { label: 'Audience Quality', value: 7.8, max: 10, color: 'bg-blue-500' },
    { label: 'Content Quality', value: 8.4, max: 10, color: 'bg-emerald-500' },
    { label: 'Brand Affinity', value: 9.5, max: 10, color: 'bg-amber-500' }
  ];
  const overall = Math.round(scores.reduce((a, s) => a + s.value, 0) / scores.length * 10);

  return (
    <div className='w-full max-w-[calc(100vw-3rem)] rounded-2xl border bg-card p-5 shadow-xl shadow-indigo-500/5 sm:max-w-sm'>
      {/* Header */}
      <div className='flex items-start gap-3'>
        <Avatar className='size-12 ring-2 ring-indigo-500/20'>
          <AvatarImage src='https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=face' alt='Kaia Monroe profile photo' />
          <AvatarFallback>KM</AvatarFallback>
        </Avatar>
        <div className='flex-1'>
          <div className='flex items-center gap-2'>
            <span className='font-semibold'>Kaia Monroe</span>
            <Icons.badgeCheck className='size-4 text-indigo-500' />
          </div>
          <p className='text-xs text-muted-foreground'>@wellnesswithkaia · Instagram</p>
          <div className='mt-1 flex gap-2'>
            <Badge variant='secondary' className='text-[10px] px-1.5 py-0'>84.2K followers</Badge>
            <Badge variant='secondary' className='text-[10px] px-1.5 py-0'>4.2% ER</Badge>
          </div>
        </div>
        <div className='flex flex-col items-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 px-3 py-1.5 text-white'>
          <span className='text-lg font-bold leading-none'>{overall}</span>
          <span className='text-[9px] font-medium opacity-80'>SCORE</span>
        </div>
      </div>

      {/* Bio */}
      <p className='mt-3 text-xs text-muted-foreground leading-relaxed'>
        Wellness advocate. Adaptogens, gut health, and morning rituals. Partnered with 12 brands. Based in Austin, TX.
      </p>

      {/* Scoring Matrix */}
      <div className='mt-4 space-y-2.5'>
        {scores.map((s) => (
          <div key={s.label} className='flex items-center gap-3'>
            <span className='w-28 text-[11px] font-medium text-muted-foreground'>{s.label}</span>
            <div className='relative h-2 flex-1 overflow-hidden rounded-full bg-muted'>
              <div
                className={cn('absolute inset-y-0 left-0 rounded-full transition-all', s.color)}
                style={{ width: `${(s.value / s.max) * 100}%` }}
              />
            </div>
            <span className='w-7 text-right text-[11px] font-bold tabular-nums'>{s.value}</span>
          </div>
        ))}
      </div>

      {/* Tags */}
      <div className='mt-4 flex flex-wrap gap-1.5'>
        {['wellness', 'adaptogens', 'gut health', 'matcha'].map((t) => (
          <span key={t} className='rounded-full border px-2 py-0.5 text-[10px] text-muted-foreground'>{t}</span>
        ))}
      </div>

      {/* Shopify data */}
      <div className='mt-4 grid grid-cols-3 gap-2 rounded-lg border bg-muted/30 p-2.5'>
        <div className='text-center'>
          <p className='text-sm font-bold'>$1,840</p>
          <p className='text-[10px] text-muted-foreground'>Lifetime Spend</p>
        </div>
        <div className='text-center'>
          <p className='text-sm font-bold'>12</p>
          <p className='text-[10px] text-muted-foreground'>Orders</p>
        </div>
        <div className='text-center'>
          <p className='text-sm font-bold text-green-600'>VIP</p>
          <p className='text-[10px] text-muted-foreground'>Customer Tier</p>
        </div>
      </div>

      {/* Actions */}
      <div className='mt-4 flex flex-col gap-2 sm:flex-row'>
        <Button
          type='button'
          size='sm'
          onClick={() => toast.info('Sign in to send creator proposals.')}
          className='w-full cursor-pointer bg-gradient-to-r from-indigo-500 to-purple-600 text-xs text-white sm:flex-1'
        >
          <Icons.send className='mr-1 size-3' /> Send Proposal
        </Button>
        <Button
          type='button'
          size='sm'
          variant='outline'
          onClick={() => toast.info('Sign in to create product gifts.')}
          className='w-full cursor-pointer text-xs sm:w-auto'
        >
          <Icons.product className='mr-1 size-3' /> Gift
        </Button>
      </div>
    </div>
  );
}

// ─── Dashboard Preview — Pipeline ────────────────────────────────────────────

function DashboardPipelinePreview() {
  const columns = [
    { name: 'Discovered', count: 52, color: 'border-t-blue-500', creators: [
      { name: 'Ari Solano', handle: '@adaptogen.ari.demo', score: 92, img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&crop=face' },
      { name: 'Priya Thakur', handle: '@rootsandremedies.demo', score: 83, img: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop&crop=face' },
      { name: 'Jordan Hess', handle: '@functionalfuel.demo', score: 90, img: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&h=80&fit=crop&crop=face' }
    ]},
    { name: 'Contacted', count: 18, color: 'border-t-amber-500', creators: [
      { name: 'Claire Voss', handle: '@chlorophyll.claire.demo', score: 85, img: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&fit=crop&crop=face' },
      { name: 'Sage Delacroix', handle: '@mushroomwitch.demo', score: 94, img: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=80&h=80&fit=crop&crop=face' }
    ]},
    { name: 'Onboarded', count: 8, color: 'border-t-green-500', creators: [
      { name: 'Steven Mwangi', handle: '@spirulina.steve.demo', score: 95, img: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=80&h=80&fit=crop&crop=face' }
    ]},
    { name: 'Active', count: 4, color: 'border-t-purple-500', creators: [
      { name: 'Nia Harrington', handle: '@guttok.official.demo', score: 97, img: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=80&h=80&fit=crop&crop=face' }
    ]}
  ];

  return (
    <div className='rounded-xl border bg-card shadow-xl shadow-indigo-500/5 overflow-hidden'>
      {/* Title bar */}
      <div className='flex items-center justify-between border-b bg-muted/30 px-4 py-2.5'>
        <div className='flex items-center gap-2'>
          <Icons.kanban className='size-4 text-indigo-500' />
          <span className='text-sm font-semibold'>Creator Pipeline</span>
        </div>
        <div className='flex gap-1.5'>
          <div className='size-2.5 rounded-full bg-red-400' />
          <div className='size-2.5 rounded-full bg-amber-400' />
          <div className='size-2.5 rounded-full bg-green-400' />
        </div>
      </div>
      {/* Columns */}
      <div className='flex gap-0 overflow-hidden p-3'>
        {columns.map((col, i) => (
          <div key={col.name} className={cn('flex min-w-0 flex-1 flex-col gap-2', i < columns.length - 1 && 'mr-2 border-r pr-2')}>
            <div className={cn('rounded-lg border-t-2 bg-muted/30 px-2 py-1.5', col.color)}>
              <div className='flex items-center justify-between'>
                <span className='text-[10px] font-semibold uppercase tracking-wide'>{col.name}</span>
                <span className='rounded-full bg-background px-1.5 py-0.5 text-[10px] font-bold tabular-nums'>{col.count}</span>
              </div>
            </div>
            {col.creators.map((c) => (
              <div key={c.handle} className='rounded-lg border bg-background p-2 shadow-sm'>
                <div className='flex items-center gap-1.5'>
                  <Avatar className='size-6'>
                    <AvatarImage src={c.img} alt={c.name} />
                    <AvatarFallback className='text-[9px]'>{c.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className='min-w-0 flex-1'>
                    <p className='truncate text-[10px] font-semibold'>{c.name}</p>
                    <p className='truncate text-[9px] text-muted-foreground'>{c.handle}</p>
                  </div>
                  <span className='rounded bg-indigo-500/10 px-1 py-0.5 text-[9px] font-bold text-indigo-600'>{c.score}</span>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Dashboard Preview — Analytics ───────────────────────────────────────────

function DashboardAnalyticsPreview() {
  const stats = [
    { label: 'Total Creators', value: '52', change: '+12 this month', up: true },
    { label: 'Active Campaigns', value: '0', change: 'Ready to launch', up: true },
    { label: 'Blended ROAS', value: '—', change: 'Awaiting data', up: true },
    { label: 'Pipeline Value', value: '$0', change: 'No spend yet', up: true }
  ];

  const barData = [
    { label: 'Oct', wl: 65, brand: 35 },
    { label: 'Nov', wl: 72, brand: 38 },
    { label: 'Dec', wl: 58, brand: 32 },
    { label: 'Jan', wl: 80, brand: 42 },
    { label: 'Feb', wl: 88, brand: 44 },
    { label: 'Mar', wl: 95, brand: 46 }
  ];

  return (
    <div className='rounded-xl border bg-card shadow-xl shadow-indigo-500/5 overflow-hidden'>
      {/* Title bar */}
      <div className='flex items-center justify-between border-b bg-muted/30 px-4 py-2.5'>
        <div className='flex items-center gap-2'>
          <Icons.dashboard className='size-4 text-indigo-500' />
          <span className='text-sm font-semibold'>CreatorOS Overview</span>
        </div>
        <div className='flex gap-1.5'>
          <div className='size-2.5 rounded-full bg-red-400' />
          <div className='size-2.5 rounded-full bg-amber-400' />
          <div className='size-2.5 rounded-full bg-green-400' />
        </div>
      </div>
      {/* Stats row */}
      <div className='grid grid-cols-4 gap-0 border-b'>
        {stats.map((s, i) => (
          <div key={s.label} className={cn('p-3', i < stats.length - 1 && 'border-r')}>
            <p className='text-[10px] text-muted-foreground'>{s.label}</p>
            <p className='text-lg font-bold tabular-nums'>{s.value}</p>
            <p className='text-[9px] text-muted-foreground'>{s.change}</p>
          </div>
        ))}
      </div>
      {/* Bar chart preview */}
      <div className='p-4'>
        <p className='mb-3 text-xs font-semibold'>Creator ads vs brand ads — comparison preview</p>
        <div className='flex items-end gap-2'>
          {barData.map((d) => (
            <div key={d.label} className='flex flex-1 flex-col items-center gap-1'>
              <div className='flex w-full gap-0.5'>
                <div className='flex-1 rounded-t bg-indigo-500' style={{ height: `${d.wl}px` }} />
                <div className='flex-1 rounded-t bg-purple-300' style={{ height: `${d.brand}px` }} />
              </div>
              <span className='text-[9px] text-muted-foreground'>{d.label}</span>
            </div>
          ))}
        </div>
        <div className='mt-2 flex items-center gap-4 text-[10px] text-muted-foreground'>
          <span className='flex items-center gap-1'><span className='inline-block size-2 rounded bg-indigo-500' /> Creator ads</span>
          <span className='flex items-center gap-1'><span className='inline-block size-2 rounded bg-purple-300' /> Brand</span>
        </div>
      </div>
    </div>
  );
}

// ─── Data ────────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: 'teams' as const,
    title: 'AI Creator Discovery',
    description: 'Review Instagram and TikTok creator candidates through connected enrichment providers. Score profiles by engagement, niche fit, and audience overlap.',
    badge: 'AI-Powered'
  },
  {
    icon: 'send' as const,
    title: 'Smart Outreach Engine',
    description: 'Draft personalized DMs and emails for merchant review. Manage follow-up queues, response tracking, and pipeline movement from one place.',
    badge: 'Automated'
  },
  {
    icon: 'kanban' as const,
    title: 'Visual Pipeline',
    description: 'Drag-and-drop Kanban board tracks creators from discovery to active whitelisting. Real-time status across your entire creator roster.',
    badge: 'Real-time'
  },
  {
    icon: 'sparkles' as const,
    title: 'Whitelisted Ad Management',
    description: 'Organize Meta Partnership Ads and TikTok Spark Ads work tied to creator accounts. Track campaign performance when connected ad data is available.',
    badge: 'Core'
  },
  {
    icon: 'product' as const,
    title: 'Product Gifting Automation',
    description: 'Prepare Shopify draft orders for merchant review, route product gifting, and track shipment status. Monitor content delivery deadlines per creator.',
    badge: 'Shopify'
  },
  {
    icon: 'trendingUp' as const,
    title: 'Performance Analytics',
    description: 'Creator leaderboards, milestone-based rewards, campaign comparisons, and pipeline growth charts from connected workspace data.',
    badge: 'Live Data'
  }
];

const PIPELINE_STEPS = [
  { step: '01', title: 'Connect Shopify', description: 'Link your store. We import all customers with purchase history, order frequency, and LTV.', icon: 'product' as const },
  { step: '02', title: 'AI Scoring', description: 'CreatorOS matches customers with social profiles where provider data is available and surfaces score factors for merchant review.', icon: 'sparkles' as const },
  { step: '03', title: 'Reviewed Outreach', description: 'Draft personalized proposals for high-score customers, then approve each message before sending.', icon: 'send' as const },
  { step: '04', title: 'Onboard & Gift', description: 'Approved creators can move into Shopify draft orders, discount-code workflows, and product bundles with merchant review.', icon: 'product' as const },
  { step: '05', title: 'Whitelist & Measure', description: 'Organize whitelisted ad workflows, review campaign records, and compare performance from one dashboard.', icon: 'trendingUp' as const }
];

const CAPABILITY_MATRIX = [
  { feature: 'Shopify customer import', included: true, workflow: 'OAuth install, import preview, customer segmentation' },
  { feature: 'Creator discovery and scoring', included: true, workflow: 'Profile lookup, score review, manual approval queue' },
  { feature: 'Outreach CRM', included: true, workflow: 'Draft generation, reviewed sending, reply tracking' },
  { feature: 'Product gifting', included: true, workflow: 'Shopify draft orders, product selection, fulfillment notes' },
  { feature: 'Whitelisted ad tracking', included: true, workflow: 'Campaign records, creator attribution, performance review' },
  { feature: 'Agency workspace controls', included: true, workflow: 'Multi-brand navigation, roles, client-ready reporting' }
];

const AGENCY_FEATURES = [
  { title: 'Creator Roster Management', description: 'Manage approved and discovered creators across client brands with shared pipeline workflows.', icon: 'teams' as const },
  { title: 'Multi-Brand Dashboard', description: 'Switch between client brand workspaces while keeping each workspace scoped to its own data.', icon: 'dashboard' as const },
  { title: 'Agency Workspace Controls', description: 'Use agency-oriented navigation, team access, and brand settings from the same dashboard.', icon: 'post' as const },
  { title: 'Integration Center', description: 'Connect Shopify, Resend or Mailgun, Meta, Apify, Scrapling, and Klaviyo providers when each credential set is ready.', icon: 'code' as const },
  { title: 'Client Review Workflows', description: 'Review creator performance, proposals, applications, gifts, and shipments inside brand-scoped dashboards.', icon: 'externalLink' as const },
  { title: 'Implementation Support', description: 'Use guided setup, readiness checks, and support contact paths during onboarding.', icon: 'chat' as const }
];

// ─── Page ────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);
  const [waitlistCount, setWaitlistCount] = useState<number | null>(null);
  const [mobileNav, setMobileNav] = useState(false);

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.replace('/dashboard/overview');
    }
  }, [isLoaded, isSignedIn, router]);

  useEffect(() => {
    fetch('/api/proxy/api/waitlist/count')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (typeof data?.count === 'number') setWaitlistCount(data.count);
      })
      .catch(() => undefined);
  }, []);

  async function handleWaitlist(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setJoining(true);

    try {
      const res = await fetch('/api/proxy/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), source: 'landing', plan_interest: 'growth' })
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.message || data.error || 'Waitlist signup failed');
      }

      setJoined(true);
      if (typeof data.position === 'number') {
        setWaitlistCount(data.position);
      } else {
        setWaitlistCount((count) => (count ?? 0) + (res.status === 201 ? 1 : 0));
      }
      toast.success(data.message || 'You\'re on the list!');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Something went wrong. Try again.');
    } finally {
      setJoining(false);
    }
  }

  function WaitlistForm({ className }: { className?: string }) {
    if (joined) {
      return (
        <div className={cn('rounded-xl border border-green-500/20 bg-green-500/5 p-4 text-center', className)}>
          <Icons.circleCheck className='mx-auto size-8 text-green-500' />
          <p className='mt-2 text-sm font-semibold'>You&apos;re on the list!</p>
        </div>
      );
    }
    return (
      <form onSubmit={handleWaitlist} className={cn('flex flex-col gap-3 sm:flex-row', className)}>
        <Input
          type='email'
          aria-label='Waitlist email'
          placeholder='you@agency.com'
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className='flex-1'
          disabled={joining}
        />
        <Button
          type='submit'
          disabled={joining}
          className='cursor-pointer gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700'
        >
          {joining ? <Icons.spinner className='size-4 animate-spin' /> : <Icons.arrowRight className='size-4' />}
          {joining ? 'Joining...' : 'Join Waitlist'}
        </Button>
      </form>
    );
  }

  return (
    <div className='relative min-h-screen overflow-hidden'>
      <div className='pointer-events-none absolute inset-0 opacity-20'>
        <InteractiveGridPattern width={50} height={50} squares={[40, 30]} />
      </div>

      {/* ─── Header ─────────────────────────────────────────────────── */}
      <header className='sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md'>
        <div className='mx-auto flex max-w-7xl items-center justify-between px-6 py-3'>
          <div className='flex items-center gap-2'>
            <div className='flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600'>
              <Icons.sparkles className='size-4 text-white' />
            </div>
            <span className='text-lg font-bold tracking-tight'>CreatorOS</span>
          </div>
          <nav className='hidden items-center gap-6 text-sm lg:flex'>
            <a href='#product' className='text-muted-foreground transition-colors hover:text-foreground cursor-pointer'>Product</a>
            <a href='#activation' className='text-muted-foreground transition-colors hover:text-foreground cursor-pointer'>Activation</a>
            <a href='#pipeline' className='text-muted-foreground transition-colors hover:text-foreground cursor-pointer'>Pipeline</a>
            <a href='#compare' className='text-muted-foreground transition-colors hover:text-foreground cursor-pointer'>Compare</a>
            <a href='#pricing' className='text-muted-foreground transition-colors hover:text-foreground cursor-pointer'>Pricing</a>
          </nav>
          <div className='flex items-center gap-3'>
            <Button variant='ghost' size='sm' asChild className='hidden cursor-pointer sm:inline-flex'>
              <Link href='/auth/sign-in'>Sign in</Link>
            </Button>
            <Button size='sm' asChild className='hidden cursor-pointer bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700 sm:inline-flex'>
              <a href='#waitlist'>Join Waitlist</a>
            </Button>
            {/* Mobile menu */}
            <button
              type='button'
              aria-label={mobileNav ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={mobileNav}
              className='inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border cursor-pointer lg:hidden'
              onClick={() => setMobileNav(!mobileNav)}
            >
              {mobileNav ? <Icons.close className='size-4' /> : <Icons.list className='size-4' />}
            </button>
          </div>
        </div>
        {/* Mobile dropdown */}
        {mobileNav && (
          <div className='border-t bg-background px-6 py-4 lg:hidden'>
            <nav className='flex flex-col gap-3 text-sm'>
              {[
                { href: '#product', label: 'Product' },
                { href: '#activation', label: 'Activation' },
                { href: '#pipeline', label: 'Pipeline' },
                { href: '#compare', label: 'Compare' },
                { href: '#pricing', label: 'Pricing' }
              ].map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className='text-muted-foreground transition-colors hover:text-foreground cursor-pointer py-1'
                  onClick={() => setMobileNav(false)}
                >
                  {link.label}
                </a>
              ))}
              <div className='flex gap-3 pt-2 border-t mt-1'>
                <Button variant='outline' size='sm' asChild className='flex-1 cursor-pointer'>
                  <Link href='/auth/sign-in'>Sign in</Link>
                </Button>
                <Button size='sm' asChild className='flex-1 cursor-pointer bg-gradient-to-r from-indigo-500 to-purple-600 text-white'>
                  <a href='#waitlist' onClick={() => setMobileNav(false)}>Join Waitlist</a>
                </Button>
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* ─── Hero ───────────────────────────────────────────────────── */}
      <section className='relative z-10 mx-auto max-w-4xl px-6 pt-20 pb-16 text-center md:pt-28 md:pb-20'>
        <div className='mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/5 px-4 py-1.5 text-sm'>
          <span className='relative flex size-2'>
            <span className='absolute inline-flex size-full animate-ping rounded-full bg-indigo-400 opacity-75' />
            <span className='relative inline-flex size-2 rounded-full bg-indigo-500' />
          </span>
          <span className='text-muted-foreground'>Private beta{waitlistCount !== null ? <> — <span className='font-medium text-indigo-500'>{waitlistCount} on the waitlist</span></> : null}</span>
        </div>

        <h1 className='text-4xl font-bold tracking-tight md:text-6xl lg:text-7xl'>
          Discover. Activate.{' '}
          <span className='bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent'>
            Whitelist.
          </span>
        </h1>

        <p className='text-muted-foreground mx-auto mt-6 max-w-2xl text-lg md:text-xl'>
          A platform for managing the creator lifecycle — from discovery and scoring
          to reviewed outreach, product gifting, and whitelisted ad management. Starting at <span className='font-semibold text-foreground'>$199/mo</span>. Built for agencies that scale.
        </p>

        {/* Measurement callout */}
        <div className='mx-auto mt-8 flex max-w-lg items-center justify-center gap-3 rounded-full border border-green-500/20 bg-green-500/5 px-5 py-2'>
          <Icons.trendingUp className='size-4 text-green-600 shrink-0' />
          <span className='text-sm'><span className='font-bold text-green-600'>Measure ROAS</span> <span className='text-muted-foreground'>from Shopify-customer creator activations and whitelisted ads</span></span>
        </div>

        <div className='mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row'>
          <Button size='lg' className='gap-2 px-8 cursor-pointer bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700' asChild>
            <a href='#waitlist'>
              <Icons.arrowRight className='size-4' />
              Request Early Access
            </a>
          </Button>
          <Button size='lg' variant='outline' className='gap-2 px-8 cursor-pointer' asChild>
            <Link href='/auth/sign-in'>
              Beta Login
            </Link>
          </Button>
        </div>

        <div className='mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs text-muted-foreground'>
          <span className='flex items-center gap-1.5'><Icons.lock className='size-3.5 text-indigo-500' /> HTTPS and signed Shopify OAuth</span>
          <span className='flex items-center gap-1.5'><Icons.check className='size-3.5 text-green-500' /> Brand-scoped creator workspaces</span>
          <span className='flex items-center gap-1.5'><Icons.check className='size-3.5 text-green-500' /> Agency workspace controls</span>
        </div>
      </section>

      {/* ─── Social Proof — Logo Bar ────────────────────────────────── */}
      <section className='relative z-10 border-y bg-muted/30'>
        <div className='mx-auto max-w-5xl px-6 py-8'>
          <p className='mb-5 text-center text-xs font-semibold uppercase tracking-widest text-muted-foreground'>Built for agencies and DTC brands</p>
          <div className='flex flex-wrap items-center justify-center gap-x-10 gap-y-4'>
            {['Health & Supplements', 'Beauty & Skincare', 'Fitness & Wellness', 'Food & Beverage', 'Fashion & Lifestyle', 'Home & Living'].map((niche) => (
              <div key={niche} className='flex items-center gap-1.5'>
                <div className='flex size-6 items-center justify-center rounded bg-muted'>
                  <Icons.sparkles className='size-3 text-muted-foreground' />
                </div>
                <span className='text-sm font-medium text-muted-foreground'>{niche}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Product Walkthrough ─────────────────────────────────────── */}
      <section className='relative z-10 mx-auto max-w-4xl px-6 py-16'>
        <div className='text-center'>
          <Badge variant='outline' className='mb-4 border-indigo-500/20 bg-indigo-500/5 text-indigo-500'>Live Dashboard</Badge>
          <h2 className='text-2xl font-bold tracking-tight md:text-3xl'>See CreatorOS in action</h2>
          <p className='text-muted-foreground mt-2 text-sm'>Review the Shopify import, creator pipeline, outreach, gifting, and campaign workflow in the live dashboard.</p>
        </div>
        <div className='mt-8 overflow-hidden rounded-2xl border bg-card shadow-xl shadow-indigo-500/5'>
          <div className='flex items-center gap-1.5 border-b bg-muted/40 px-4 py-2'>
            <div className='size-2.5 rounded-full bg-red-400' />
            <div className='size-2.5 rounded-full bg-amber-400' />
            <div className='size-2.5 rounded-full bg-green-400' />
            <span className='ml-2 text-[10px] text-muted-foreground'>CreatorOS — Live Dashboard</span>
          </div>
          <div className='relative flex aspect-video items-center justify-center bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950'>
            {/* Launch walkthrough media slot. */}
            <div className='absolute inset-0 opacity-10'>
              <InteractiveGridPattern width={30} height={30} squares={[30, 20]} />
            </div>
            <div className='relative flex flex-col items-center gap-4'>
              <button
                type='button'
                aria-label='Open live CreatorOS dashboard'
                onClick={() => router.push('/dashboard/overview')}
                className='group flex size-20 cursor-pointer items-center justify-center rounded-full bg-white/10 backdrop-blur-sm transition-all hover:bg-white/20 hover:scale-105'
              >
                <div className='ml-1 size-0 border-y-[14px] border-l-[22px] border-y-transparent border-l-white transition-transform group-hover:scale-110' />
              </button>
              <p className='text-sm font-medium text-white/70'>Open the live dashboard</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Product Preview — Creator Card + Dashboard ─────────────── */}
      <section id='product' className='relative z-10 mx-auto max-w-7xl px-6 pb-24 scroll-mt-20'>
        <div className='mb-12 text-center'>
          <Badge variant='outline' className='mb-4 border-indigo-500/20 bg-indigo-500/5 text-indigo-500'>See the Product</Badge>
          <h2 className='text-3xl font-bold tracking-tight md:text-4xl'>Infrastructure built for scale</h2>
          <p className='text-muted-foreground mx-auto mt-3 max-w-2xl'>Real dashboards, scoring, and automation built around the live CreatorOS workflow.</p>
        </div>

        <div className='grid min-w-0 items-start gap-8 lg:grid-cols-[340px_1fr]'>
          {/* Creator Card */}
          <div className='flex min-w-0 flex-col gap-4'>
            <p className='text-xs font-semibold uppercase tracking-widest text-indigo-500'>5-Factor AI Scoring</p>
            <CreatorPreviewCard />
            <p className='text-xs text-muted-foreground leading-relaxed'>
              Every creator gets a composite score based on engagement rate, niche relevance, audience quality, content caliber, and brand affinity. Shopify purchase data enriches the profile when available.
            </p>
          </div>

          {/* Dashboard Previews */}
          <div className='flex flex-col gap-6'>
            <div>
              <p className='mb-3 text-xs font-semibold uppercase tracking-widest text-indigo-500'>Pipeline Management</p>
              <DashboardPipelinePreview />
            </div>
            <div>
              <p className='mb-3 text-xs font-semibold uppercase tracking-widest text-indigo-500'>Analytics Dashboard</p>
              <DashboardAnalyticsPreview />
            </div>
          </div>
        </div>
      </section>

      {/* ─── Features Grid ──────────────────────────────────────────── */}
      <section id='features' className='relative z-10 border-y bg-muted/30 scroll-mt-20'>
        <div className='mx-auto max-w-6xl px-6 py-24'>
          <div className='mb-12 text-center'>
            <Badge variant='outline' className='mb-4 border-indigo-500/20 bg-indigo-500/5 text-indigo-500'>Platform</Badge>
            <h2 className='text-3xl font-bold tracking-tight md:text-4xl'>Six modules. One dashboard. Zero spreadsheets.</h2>
          </div>
          <div className='grid gap-6 md:grid-cols-2 lg:grid-cols-3'>
            {FEATURES.map((feature) => {
              const Icon = Icons[feature.icon];
              return (
                <div key={feature.title} className='group cursor-pointer rounded-xl border bg-card/80 p-6 backdrop-blur-sm transition-all duration-200 hover:border-indigo-500/30 hover:shadow-lg hover:shadow-indigo-500/5'>
                  <div className='mb-4 flex items-center justify-between'>
                    <div className='flex size-10 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500/10 to-purple-500/10'>
                      <Icon className='size-5 text-indigo-500' />
                    </div>
                    <Badge variant='secondary' className='text-[10px]'>{feature.badge}</Badge>
                  </div>
                  <h3 className='mb-2 font-semibold'>{feature.title}</h3>
                  <p className='text-muted-foreground text-sm leading-relaxed'>{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── Shopify Customer Database Activation ──────────────────── */}
      <section id='activation' className='relative z-10 scroll-mt-20'>
        <div className='mx-auto max-w-7xl px-6 py-24'>
          <div className='mb-16 text-center'>
            <Badge variant='outline' className='mb-4 border-emerald-500/20 bg-emerald-500/5 text-emerald-600'>Customer Activation</Badge>
            <h2 className='text-3xl font-bold tracking-tight md:text-4xl'>
              Your customers are already your best creators
            </h2>
            <p className='text-muted-foreground mx-auto mt-3 max-w-2xl'>
              Your Shopify database can include repeat buyers who already know your products.
              CreatorOS reviews customer records, matches available social profiles, tags potential <span className='font-semibold text-amber-600'>Nano</span> or <span className='font-semibold text-purple-600'>Micro</span> creators, and moves approved candidates into activation workflows.
            </p>
          </div>

          {/* Before / After Visual */}
          <div className='grid items-stretch gap-8 lg:grid-cols-[1fr_auto_1fr]'>
            {/* BEFORE: Raw Shopify data */}
            <div className='rounded-2xl border bg-card shadow-lg overflow-hidden'>
              <div className='flex items-center justify-between border-b bg-muted/40 px-4 py-2.5'>
                <div className='flex items-center gap-2'>
                  <Icons.product className='size-4 text-muted-foreground' />
                  <span className='text-xs font-semibold text-muted-foreground'>Shopify Customers</span>
                </div>
                <Badge variant='secondary' className='text-[10px]'>Shopify import</Badge>
              </div>
              <div className='divide-y'>
                {[
                  { name: 'Avery Stone', email: 'avery@example.com', orders: 14, spent: '$2,180', social: null },
                  { name: 'Riley Brooks', email: 'riley@example.com', orders: 9, spent: '$1,340', social: '@coach.riley.demo' },
                  { name: 'Casey Lane', email: 'casey@example.com', orders: 11, spent: '$1,670', social: '@casey.eats.clean.demo' },
                  { name: 'Morgan Hale', email: 'morgan@example.com', orders: 7, spent: '$890', social: '@greenlife.morgan.demo' },
                  { name: 'Quinn Ellis', email: 'quinn@example.com', orders: 3, spent: '$215', social: null },
                  { name: 'Taylor Reed', email: 'taylor@example.com', orders: 16, spent: '$2,460', social: '@taylor.wellness.demo' },
                  { name: 'Jamie Fox', email: 'jamie@example.com', orders: 8, spent: '$980', social: '@jamiefox.health.demo' },
                  { name: 'Drew Parker', email: 'drew@example.com', orders: 4, spent: '$380', social: null }
                ].map((c, i) => (
                  <div key={i} className='flex items-center gap-3 px-4 py-2'>
                    <div className='flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground'>
                      {c.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div className='min-w-0 flex-1'>
                      <p className='truncate text-xs font-medium'>{c.name}</p>
                      <p className='truncate text-[10px] text-muted-foreground'>{c.email}</p>
                    </div>
                    <div className='hidden text-right sm:block'>
                      <p className='text-xs font-semibold tabular-nums'>{c.spent}</p>
                      <p className='text-[10px] text-muted-foreground'>{c.orders} orders</p>
                    </div>
                    <div className='w-20 text-right'>
                      {c.social ? (
                        <span className='text-[10px] font-medium text-muted-foreground'>{c.social}</span>
                      ) : (
                        <span className='text-[10px] text-muted-foreground/40'>—</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className='border-t bg-muted/20 px-4 py-2 text-center text-[10px] text-muted-foreground'>
                Raw data — no scoring, no tier tags, no activation
              </div>
            </div>

            {/* Arrow */}
            <div className='flex items-center justify-center'>
              <div className='flex flex-col items-center gap-3'>
                <div className='flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/25'>
                  <Icons.sparkles className='size-7 text-white' />
                </div>
                <div className='text-center'>
                  <p className='text-[10px] font-bold uppercase tracking-widest text-indigo-500'>CreatorOS Review</p>
                  <p className='mt-0.5 text-[9px] text-muted-foreground'>Tag + score</p>
                </div>
                <Icons.arrowRight className='hidden size-5 text-indigo-500 lg:block' />
                <Icons.chevronsDown className='block size-5 text-indigo-500 lg:hidden' />
              </div>
            </div>

            {/* AFTER: Scored, tagged & activated creators */}
            <div className='rounded-2xl border border-indigo-500/20 bg-card shadow-lg shadow-indigo-500/5 overflow-hidden'>
              <div className='flex items-center justify-between border-b bg-indigo-500/5 px-4 py-2.5'>
                <div className='flex items-center gap-2'>
                  <Icons.teams className='size-4 text-indigo-500' />
                  <span className='text-xs font-semibold text-indigo-600'>Tagged Creators</span>
                </div>
                <Badge className='bg-green-500/10 text-green-600 border-green-200 text-[10px]'>Matched profiles</Badge>
              </div>
              <div className='divide-y'>
                {[
                  { name: 'Casey Lane', handle: '@casey.eats.clean.demo', followers: '15.4K', score: 91, tier: 'Micro' as const, img: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=80&h=80&fit=crop&crop=face', tag: 'matched', status: 'Ready' },
                  { name: 'Riley Brooks', handle: '@coach.riley.demo', followers: '67.3K', score: 88, tier: 'Micro' as const, img: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=80&h=80&fit=crop&crop=face', tag: 'matched', roas: '—' },
                  { name: 'Taylor Reed', handle: '@taylor.wellness.demo', followers: '8.1K', score: 82, tier: 'Nano' as const, img: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=80&h=80&fit=crop&crop=face', tag: 'matched', status: 'Draft' },
                  { name: 'Morgan Hale', handle: '@greenlife.morgan.demo', followers: '48.2K', score: 85, tier: 'Micro' as const, img: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop&crop=face', tag: 'matched', roas: '—' },
                  { name: 'Avery Stone', handle: '@avery_wellness.demo', followers: '22.1K', score: 79, tier: 'Micro' as const, img: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&fit=crop&crop=face', tag: 'matched', roas: '—' },
                  { name: 'Kaia Monroe', handle: '@wellnesswithkaia.demo', followers: '84.2K', score: 87, tier: 'Micro' as const, img: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&h=80&fit=crop&crop=face', tag: 'matched', status: 'Ready' },
                  { name: 'Jamie Fox', handle: '@jamiefox.health.demo', followers: '3.2K', score: 74, tier: 'Nano' as const, img: 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=80&h=80&fit=crop&crop=face', tag: 'matched', roas: '—' },
                  { name: 'Quinn Ellis', handle: '@quinn_fitness.demo', followers: '1.8K', score: 62, tier: 'Nano' as const, img: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&h=80&fit=crop&crop=face', tag: 'matched', roas: '—' }
                ].map((c, i) => (
                  <div key={i} className='flex items-center gap-2 px-4 py-2'>
                    <Avatar className='size-7 ring-1 ring-indigo-500/20'>
                      <AvatarImage src={c.img} alt={c.name} />
                      <AvatarFallback className='text-[9px]'>{c.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className='min-w-0 flex-1'>
                      <div className='flex items-center gap-1'>
                        <p className='truncate text-xs font-semibold'>{c.name}</p>
                        <Icons.badgeCheck className='size-3 shrink-0 text-indigo-500' />
                      </div>
                      <div className='flex items-center gap-1'>
                        <span className='text-[10px] text-indigo-500 font-medium'>{c.handle}</span>
                        <span className='text-[10px] text-muted-foreground'>· {c.followers}</span>
                      </div>
                    </div>
                    <Badge variant='secondary' className={cn(
                      'text-[9px] px-1.5 py-0 shrink-0',
                      c.tier === 'Nano' ? 'bg-amber-500/10 text-amber-600 border-amber-200' : 'bg-purple-500/10 text-purple-600 border-purple-200'
                    )}>
                      {c.tier}
                    </Badge>
                    <div className='rounded-md bg-indigo-500/10 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-indigo-600 shrink-0'>{c.score}</div>
                    <div className='hidden w-14 shrink-0 text-right sm:block'>
                      {'status' in c ? (
                        <span className='text-[10px] font-bold text-green-600'>{c.status}</span>
                      ) : (
                        <Icons.arrowRight className='ml-auto size-3 text-muted-foreground/40' />
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className='border-t bg-indigo-500/5 px-4 py-2 text-center text-[10px] font-medium text-indigo-600'>
                Tagged Nano/Micro · Scored · Proposals queued
              </div>
            </div>
          </div>

          {/* Stats callouts */}
          <div className='mt-12 grid grid-cols-2 gap-4 md:grid-cols-5'>
            {[
              { value: 'Import', label: 'Customers', sub: 'Shopify source data' },
              { value: 'Match', label: 'Social Profiles', sub: 'Instagram and TikTok handles' },
              { value: 'Tag', label: 'Nano Creators', sub: '1K–10K followers' },
              { value: 'Score', label: 'Micro Creators', sub: '10K–100K followers' },
              { value: 'Track', label: 'Results', sub: 'From approved campaigns' }
            ].map((s) => (
              <div key={s.label} className='rounded-xl border bg-card p-4 text-center'>
                <p className='text-2xl font-bold bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent'>{s.value}</p>
                <p className='mt-1 text-xs font-semibold'>{s.label}</p>
                <p className='text-[10px] text-muted-foreground'>{s.sub}</p>
              </div>
            ))}
          </div>

          {/* Matching explainer */}
          <div className='mt-12 rounded-xl border border-indigo-500/10 bg-gradient-to-r from-indigo-500/5 via-transparent to-purple-500/5 p-6'>
            <div className='flex items-start gap-4'>
              <div className='flex size-10 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10'>
                <Icons.sparkles className='size-5 text-indigo-500' />
              </div>
              <div>
                <h3 className='font-semibold'>How Matching Works</h3>
                <p className='text-muted-foreground mt-1 text-sm leading-relaxed'>
                  CreatorOS imports Shopify customer records and matches email, name, and available social fields against creator profiles through connected enrichment providers.
                  Every matched profile is tagged for review:
                </p>
                <div className='mt-3 flex flex-wrap gap-3'>
                  <div className='flex items-center gap-2 rounded-lg border bg-card px-3 py-2'>
                    <Badge className='bg-amber-500/10 text-amber-600 border-amber-200 text-[10px]'>Nano</Badge>
                    <span className='text-xs'>1K–10K followers · Community-led · Lightweight activation</span>
                  </div>
                  <div className='flex items-center gap-2 rounded-lg border bg-card px-3 py-2'>
                    <Badge className='bg-purple-500/10 text-purple-600 border-purple-200 text-[10px]'>Micro</Badge>
                    <span className='text-xs'>10K–100K followers · Niche context · Campaign review</span>
                  </div>
                  <div className='flex items-center gap-2 rounded-lg border bg-card px-3 py-2'>
                    <Badge className='bg-blue-500/10 text-blue-600 border-blue-200 text-[10px]'>Macro</Badge>
                    <span className='text-xs'>100K+ followers · Broad reach · Brand awareness review</span>
                  </div>
                  <div className='flex items-center gap-2 rounded-lg border bg-card px-3 py-2'>
                    <Badge variant='outline' className='text-[10px]'>No Match</Badge>
                    <span className='text-xs'>No social found · Still a VIP customer · Gifting candidate</span>
                  </div>
                </div>
                <p className='text-muted-foreground mt-3 text-sm'>
                  Each tagged creator gets a 5-factor score. High scorers can be queued for personalized outreach drafts that stay reviewable before sending.
                </p>
              </div>
            </div>
          </div>

          {/* Why nano/micro */}
          <div className='mt-12 grid gap-6 md:grid-cols-3'>
            <div className='rounded-xl border bg-card p-5'>
              <div className='flex items-center gap-3 mb-3'>
                <div className='flex size-9 items-center justify-center rounded-lg bg-amber-500/10'>
                  <Icons.teams className='size-4 text-amber-600' />
                </div>
                <div>
                  <p className='text-sm font-semibold'>Nano Creators</p>
                  <p className='text-[10px] text-muted-foreground'>1K–10K followers</p>
                </div>
              </div>
              <p className='text-xs text-muted-foreground leading-relaxed'>
                Repeat buyers with small but loyal followings can be reviewed as creator candidates because they already have purchase history with the brand.
                CreatorOS keeps customer context and approval status visible before outreach or gifting begins.
              </p>
            </div>
            <div className='rounded-xl border bg-card p-5'>
              <div className='flex items-center gap-3 mb-3'>
                <div className='flex size-9 items-center justify-center rounded-lg bg-purple-500/10'>
                  <Icons.trendingUp className='size-4 text-purple-600' />
                </div>
                <div>
                  <p className='text-sm font-semibold'>Micro Creators</p>
                  <p className='text-[10px] text-muted-foreground'>10K–100K followers</p>
                </div>
              </div>
              <p className='text-xs text-muted-foreground leading-relaxed'>
                Customers who have grown audiences in your exact niche. Their content converts because
                <span className='font-semibold text-foreground'> they have been buying and using your products for months</span>.
                CreatorOS keeps their performance tied to campaign and Shopify data so you can compare outcomes inside one workflow.
              </p>
            </div>
            <div className='rounded-xl border bg-card p-5'>
              <div className='flex items-center gap-3 mb-3'>
                <div className='flex size-9 items-center justify-center rounded-lg bg-green-500/10'>
                  <Icons.sparkles className='size-4 text-green-600' />
                </div>
                <div>
                  <p className='text-sm font-semibold'>Why It Works</p>
                  <p className='text-[10px] text-muted-foreground'>Authenticity at scale</p>
                </div>
              </div>
              <p className='text-xs text-muted-foreground leading-relaxed'>
                Customer creators start from a known relationship with the brand. CreatorOS keeps
                <span className='font-semibold text-foreground'> purchase context, outreach status, and content approvals</span>
                visible before you launch ads or rewards.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Shopify Reactivation Pipeline ──────────────────────────── */}
      <section id='pipeline' className='relative z-10 scroll-mt-20'>
        <div className='mx-auto max-w-6xl px-6 py-24'>
          <div className='mb-16 text-center'>
            <Badge variant='outline' className='mb-4 border-purple-500/20 bg-purple-500/5 text-purple-500'>Creator Pipeline</Badge>
            <h2 className='text-3xl font-bold tracking-tight md:text-4xl'>
              Shopify Customer → Creator Pipeline
            </h2>
            <p className='text-muted-foreground mx-auto mt-3 max-w-2xl'>
              Find customer creator candidates in your Shopify list, score them, and move them through reviewed activation workflows.
            </p>
          </div>
          <div className='relative'>
            <div className='absolute top-12 left-8 hidden h-[calc(100%-3rem)] w-px bg-gradient-to-b from-indigo-500 via-purple-500 to-indigo-500/20 lg:block' />
            <div className='flex flex-col gap-6'>
              {PIPELINE_STEPS.map((step, i) => {
                const Icon = Icons[step.icon];
                return (
                  <div key={step.step} className='group flex items-start gap-6'>
                    <div className='relative z-10 hidden shrink-0 lg:block'>
                      <div className='flex size-16 items-center justify-center rounded-2xl border bg-card shadow-sm transition-all duration-200 group-hover:border-indigo-500/40 group-hover:shadow-lg group-hover:shadow-indigo-500/10'>
                        <Icon className='size-6 text-indigo-500' />
                      </div>
                    </div>
                    <div className='flex-1 cursor-pointer rounded-xl border bg-card p-6 transition-all duration-200 hover:border-indigo-500/30 hover:shadow-lg hover:shadow-indigo-500/5'>
                      <div className='flex items-center gap-3'>
                        <span className='text-xs font-bold tracking-widest text-indigo-500'>STEP {step.step}</span>
                        {i === PIPELINE_STEPS.length - 1 && <Badge className='bg-green-500/10 text-green-600 border-green-200 text-[10px]'>Revenue</Badge>}
                      </div>
                      <h3 className='mt-2 text-lg font-semibold'>{step.title}</h3>
                      <p className='text-muted-foreground mt-1 text-sm leading-relaxed'>{step.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className='mt-12 rounded-xl border border-indigo-500/20 bg-gradient-to-r from-indigo-500/5 to-purple-500/5 p-6 text-center'>
            <p className='text-lg font-semibold'>Track Shopify-customer creator performance from import to campaign reporting</p>
            <p className='text-muted-foreground mt-1 text-sm'>CreatorOS ties customer context, outreach, gifting, content, and campaign measurement into one reviewable workflow.</p>
          </div>

          {/* Mid-page CTA */}
          <div className='mt-12 rounded-2xl border bg-card p-8 text-center shadow-lg'>
            <h3 className='text-xl font-bold'>Ready to activate your customer database?</h3>
            <p className='text-muted-foreground mt-2 text-sm'>Join the waitlist and be first to connect your Shopify store.</p>
            <WaitlistForm className='mx-auto mt-6 max-w-md' />
          </div>
        </div>
      </section>

      {/* ─── Capability Matrix ──────────────────────────────────────── */}
      <section id='compare' className='relative z-10 border-y bg-muted/30 scroll-mt-20'>
        <div className='mx-auto max-w-6xl px-6 py-24'>
          <div className='mb-12 text-center'>
            <Badge variant='outline' className='mb-4 border-green-500/20 bg-green-500/5 text-green-600'>Operating System</Badge>
            <h2 className='text-3xl font-bold tracking-tight md:text-4xl'>One reviewable workflow from import to activation</h2>
            <p className='text-muted-foreground mx-auto mt-3 max-w-2xl'>
              CreatorOS keeps each merchant action visible: import Shopify customers, review creator candidates, approve outreach, and track activation work from the same dashboard.
            </p>
          </div>
          <div className='overflow-x-auto rounded-xl border'>
            <table className='w-full text-sm'>
              <thead>
                <tr className='border-b bg-muted/50'>
                  <th className='px-4 py-3 text-left font-medium'>Workflow</th>
                  <th className='border-x border-indigo-500/20 bg-indigo-500/5 px-4 py-3 text-center font-bold'>
                    <span className='bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent'>CreatorOS</span>
                  </th>
                  <th className='px-4 py-3 text-left font-medium text-muted-foreground'>Included operation</th>
                </tr>
              </thead>
              <tbody>
                {CAPABILITY_MATRIX.map((item) => (
                  <tr key={item.feature} className='border-b last:border-0'>
                    <td className='px-4 py-3 font-medium'>{item.feature}</td>
                    <td className='border-x border-indigo-500/20 bg-indigo-500/5 px-4 py-3 text-center'>
                      {item.included ? (
                        <Icons.circleCheck className='mx-auto size-5 text-green-500' />
                      ) : (
                        <Icons.close className='mx-auto size-5 text-muted-foreground/30' />
                      )}
                    </td>
                    <td className='px-4 py-3 text-muted-foreground'>{item.workflow}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ─── Agency & Whitelabel ────────────────────────────────────── */}
      <section id='agency' className='relative z-10 scroll-mt-20'>
        <div className='mx-auto max-w-6xl px-6 py-24'>
          <div className='mb-12 text-center'>
            <Badge variant='outline' className='mb-4 border-indigo-500/20 bg-indigo-500/5 text-indigo-500'>For Agencies</Badge>
            <h2 className='text-3xl font-bold tracking-tight md:text-4xl'>
              Your clients. Your workflows. One workspace system.
            </h2>
            <p className='text-muted-foreground mx-auto mt-3 max-w-2xl'>
              Run CreatorOS across client brands with brand-scoped workspaces, shared creator workflows, and agency-oriented review controls.
            </p>
          </div>
          <div className='grid gap-6 md:grid-cols-2 lg:grid-cols-3'>
            {AGENCY_FEATURES.map((feature) => {
              const Icon = Icons[feature.icon];
              return (
                <Card key={feature.title} className='cursor-pointer transition-all duration-200 hover:border-indigo-500/30 hover:shadow-lg hover:shadow-indigo-500/5'>
                  <CardContent className='flex items-start gap-4 p-6'>
                    <div className='flex size-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500/10 to-purple-500/10'>
                      <Icon className='size-5 text-indigo-500' />
                    </div>
                    <div>
                      <h3 className='font-semibold'>{feature.title}</h3>
                      <p className='text-muted-foreground mt-1 text-sm leading-relaxed'>{feature.description}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── Workflows ─────────────────────────────────────────────── */}
      <section className='relative z-10 scroll-mt-20'>
        <div className='mx-auto max-w-6xl px-6 py-24'>
          <div className='mb-12 text-center'>
            <Badge variant='outline' className='mb-4 border-indigo-500/20 bg-indigo-500/5 text-indigo-500'>Core Workflows</Badge>
            <h2 className='text-3xl font-bold tracking-tight md:text-4xl'>What teams can run in CreatorOS</h2>
          </div>
          <div className='grid gap-6 md:grid-cols-3'>
            {[
              {
                title: 'Shopify customer activation',
                description: 'Import Shopify customers, preserve order history context, identify social handles, and route qualified buyers into a creator pipeline.',
                metric: 'Import → score → activate'
              },
              {
                title: 'Agency workspace operations',
                description: 'Separate brand workspaces, team access, provider credentials, proposals, and reporting so each client stays isolated.',
                metric: 'Multi-brand control'
              },
              {
                title: 'Whitelisted campaign tracking',
                description: 'Track creator approvals, gifting, milestones, and whitelisted ad results without mixing merchant billing and creator payouts.',
                metric: 'Reviewable launch flow'
              }
            ].map((t) => (
              <Card key={t.title} className='flex flex-col justify-between'>
                <CardContent className='flex flex-col gap-4 p-6'>
                  <div className='flex size-10 items-center justify-center rounded-lg bg-indigo-500/10'>
                    <Icons.sparkles className='size-5 text-indigo-500' />
                  </div>
                  <div>
                    <h3 className='text-base font-semibold'>{t.title}</h3>
                    <p className='mt-2 text-sm leading-relaxed text-muted-foreground'>{t.description}</p>
                  </div>
                  <div className='mt-auto flex items-center justify-between border-t pt-4'>
                    <Badge className='bg-green-500/10 text-green-600 border-green-200 text-[10px] shrink-0'>{t.metric}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Pricing ────────────────────────────────────────────────── */}
      <section id='pricing' className='relative z-10 border-y bg-muted/30 scroll-mt-20'>
        <div className='mx-auto max-w-5xl px-6 py-24'>
          <div className='mb-12 text-center'>
            <Badge variant='outline' className='mb-4'>Pricing</Badge>
            <h2 className='text-3xl font-bold tracking-tight md:text-4xl'>Premium infrastructure, transparent pricing</h2>
            <p className='text-muted-foreground mx-auto mt-3 max-w-xl'>Plan options are presented in-app through Shopify Billing approval before a merchant is charged.</p>
          </div>
          <div className='grid gap-6 md:grid-cols-3'>
            {/* Growth */}
            <Card className='relative transition-all duration-200 hover:shadow-lg'>
              <CardContent className='flex flex-col p-6'>
                <h3 className='text-lg font-semibold'>Growth</h3>
                <p className='text-muted-foreground mt-1 text-sm'>For brands scaling their creator program</p>
                <div className='mt-4'>
                  <span className='text-4xl font-bold'>$199</span>
                  <span className='text-muted-foreground text-sm'>/mo</span>
                </div>
                <ul className='mt-6 flex flex-col gap-2.5 text-sm'>
                  {['Up to 3 brands', 'Creator roster management', 'Creator discovery & 5-factor scoring', 'Smart outreach engine', 'Kanban pipeline', 'Basic analytics', 'Support contact path'].map((f) => (
                    <li key={f} className='flex items-center gap-2'>
                      <Icons.check className='size-4 shrink-0 text-green-500' />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Button variant='outline' className='mt-8 w-full cursor-pointer' asChild>
                  <a href='#waitlist'>Join Waitlist</a>
                </Button>
              </CardContent>
            </Card>

            {/* Scale */}
            <Card className='relative border-indigo-500/40 shadow-xl shadow-indigo-500/10 transition-all duration-200 hover:shadow-2xl hover:shadow-indigo-500/15'>
              <div className='absolute -top-3 left-1/2 -translate-x-1/2'>
                <Badge className='bg-gradient-to-r from-indigo-500 to-purple-600 text-white'>Most Popular</Badge>
              </div>
              <CardContent className='flex flex-col p-6'>
                <h3 className='text-lg font-semibold'>Scale</h3>
                <p className='text-muted-foreground mt-1 text-sm'>For agencies managing multiple brands</p>
                <div className='mt-4'>
                  <span className='text-4xl font-bold'>$499</span>
                  <span className='text-muted-foreground text-sm'>/mo</span>
                </div>
                <ul className='mt-6 flex flex-col gap-2.5 text-sm'>
                  {['Up to 10 brands', 'Creator roster management', 'Everything in Growth', 'Whitelisted ad and campaign result tracking', 'Shopify reactivation pipeline', 'Product gifting workflows', 'Milestone rewards engine', 'Priority setup support'].map((f) => (
                    <li key={f} className='flex items-center gap-2'>
                      <Icons.check className='size-4 shrink-0 text-green-500' />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Button className='mt-8 w-full cursor-pointer bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700' asChild>
                  <a href='#waitlist'>Request Scale Access</a>
                </Button>
              </CardContent>
            </Card>

            {/* Agency */}
            <Card className='relative transition-all duration-200 hover:shadow-lg'>
              <div className='absolute -top-3 left-1/2 -translate-x-1/2'>
                <Badge variant='outline' className='border-amber-500/30 bg-amber-500/5 text-amber-600'>Agency</Badge>
              </div>
              <CardContent className='flex flex-col p-6'>
                <h3 className='text-lg font-semibold'>Agency</h3>
                <p className='text-muted-foreground mt-1 text-sm'>For agency workspace operations.</p>
                <div className='mt-4'>
                  <span className='text-4xl font-bold'>$999</span>
                  <span className='text-muted-foreground text-sm'>/mo</span>
                </div>
                <ul className='mt-6 flex flex-col gap-2.5 text-sm'>
                  {['Multi-brand workspaces', 'Creator roster management', 'Everything in Scale', 'Agency dashboard controls', 'Client review workflows', 'Brand settings', 'Integration center', 'Implementation support'].map((f) => (
                    <li key={f} className='flex items-center gap-2'>
                      <Icons.check className='size-4 shrink-0 text-green-500' />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Button variant='outline' className='mt-8 w-full cursor-pointer' asChild>
                  <a href='#waitlist'>Request Access</a>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* ─── Waitlist CTA ───────────────────────────────────────────── */}
      <section id='waitlist' className='relative z-10 scroll-mt-20'>
        <div className='mx-auto max-w-2xl px-6 py-24 text-center'>
          <div className='mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/5 px-4 py-1.5 text-sm'>
            <span className='relative flex size-2'>
              <span className='absolute inline-flex size-full animate-ping rounded-full bg-green-400 opacity-75' />
              <span className='relative inline-flex size-2 rounded-full bg-green-500' />
            </span>
            {waitlistCount !== null ? (
              <span className='font-medium text-green-600'>{waitlistCount} people on the waitlist</span>
            ) : null}
          </div>

          <h2 className='text-3xl font-bold tracking-tight md:text-4xl'>
            Get early access to{' '}
            <span className='bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent'>CreatorOS</span>
          </h2>
          <p className='text-muted-foreground mx-auto mt-3 max-w-md text-lg'>
            We&apos;re onboarding agencies in batches. Join the waitlist and we&apos;ll email you when your workspace is ready.
          </p>

          <WaitlistForm className='mx-auto mt-8 max-w-md' />

          <p className='text-muted-foreground mt-4 text-xs'>No spam. No credit card. We&apos;ll only email you when your spot opens.</p>
        </div>
      </section>

      {/* ─── Footer ─────────────────────────────────────────────────── */}
      <footer className='relative z-10 border-t'>
        <div className='mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row'>
          <div className='flex items-center gap-2'>
            <div className='flex size-6 items-center justify-center rounded-md bg-gradient-to-br from-indigo-500 to-purple-600'>
              <Icons.sparkles className='size-3 text-white' />
            </div>
            <span className='text-sm font-semibold'>CreatorOS</span>
          </div>
          <p className='text-muted-foreground text-sm'>
            Built by{' '}
            <a href='https://biznomad.io' className='font-medium text-foreground hover:underline cursor-pointer' target='_blank' rel='noopener'>
              Biznomad
            </a>
          </p>
          <div className='flex gap-4 text-sm text-muted-foreground'>
            <Link href='/privacy-policy' className='hover:text-foreground transition-colors cursor-pointer'>Privacy</Link>
            <Link href='/terms-of-service' className='hover:text-foreground transition-colors cursor-pointer'>Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
