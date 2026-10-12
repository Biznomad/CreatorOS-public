import { Metadata } from 'next';
import Link from 'next/link';
import { Icons } from '@/components/icons';

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false
  }
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className='relative flex min-h-screen overflow-hidden bg-background'>
      <div
        className='pointer-events-none absolute inset-0 opacity-35'
        style={{
          backgroundImage:
            'linear-gradient(to right, var(--border) 1px, transparent 1px), linear-gradient(to bottom, var(--border) 1px, transparent 1px)',
          backgroundSize: '44px 44px',
          maskImage: 'linear-gradient(to bottom, black 0%, black 55%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 55%, transparent 100%)'
        }}
        aria-hidden='true'
      />
      <div className='pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 via-emerald-400 to-purple-600' aria-hidden='true' />

      <div className='relative z-10 mx-auto grid min-h-screen w-full max-w-6xl grid-cols-1 items-center gap-10 px-6 py-10 lg:grid-cols-[1fr_430px] lg:px-10'>
        <section className='hidden max-w-xl lg:block'>
          <Link href='/' className='mb-10 inline-flex min-h-11 items-center gap-2'>
            <span className='flex size-10 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600'>
              <Icons.sparkles className='size-5 text-white' />
            </span>
            <span className='text-xl font-bold tracking-tight'>CreatorOS</span>
          </Link>
          <h1 className='text-balance text-4xl font-bold tracking-tight text-foreground'>
            Run creator whitelisting from one clean command center.
          </h1>
          <p className='mt-4 max-w-lg text-lg text-muted-foreground'>
            Sign in to manage discovery, outreach, activation, gifting, and whitelisted ad workflows.
          </p>
          <div className='mt-8 grid max-w-md grid-cols-2 gap-3 text-sm'>
            <div className='rounded-lg border bg-card/80 p-3 shadow-sm backdrop-blur'>
              <div className='mb-2 flex size-8 items-center justify-center rounded-md bg-indigo-500/10 text-indigo-500'>
                <Icons.teams className='size-4' />
              </div>
              Creator pipeline
            </div>
            <div className='rounded-lg border bg-card/80 p-3 shadow-sm backdrop-blur'>
              <div className='mb-2 flex size-8 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-600'>
                <Icons.trendingUp className='size-4' />
              </div>
              ROAS reporting
            </div>
          </div>
        </section>

        <section className='mx-auto flex w-full max-w-[430px] flex-col items-center'>
          <Link href='/' className='mb-8 inline-flex min-h-11 items-center gap-2 lg:hidden'>
            <span className='flex size-9 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600'>
              <Icons.sparkles className='size-4 text-white' />
            </span>
            <span className='text-lg font-bold tracking-tight'>CreatorOS</span>
          </Link>
          {children}
        </section>
      </div>
    </main>
  );
}
