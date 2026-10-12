import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'About CreatorOS'
};

export default function AboutPage() {
  return (
    <div className='min-h-screen px-4 py-12 sm:px-6 lg:px-8'>
      <div className='mx-auto max-w-3xl'>
        <div className='mb-12 text-center'>
          <h1 className='text-foreground text-3xl font-bold tracking-tight sm:text-4xl'>About CreatorOS</h1>
          <p className='text-muted-foreground mt-4 text-lg'>
            Creator whitelisting, gifting, and partnership activation for growth teams.
          </p>
          <div className='mt-6 flex flex-wrap items-center justify-center gap-3 text-sm font-medium'>
            <Link href='/' className='inline-flex min-h-11 items-center justify-center rounded-md border px-4 text-foreground hover:bg-muted'>
              Back to CreatorOS
            </Link>
            <Link href='/privacy-policy' className='inline-flex min-h-11 items-center justify-center rounded-md border px-4 text-foreground hover:bg-muted'>
              Privacy Policy
            </Link>
            <Link href='/terms-of-service' className='inline-flex min-h-11 items-center justify-center rounded-md border px-4 text-foreground hover:bg-muted'>
              Terms
            </Link>
          </div>
        </div>

        <div className='space-y-8'>
          <section className='bg-card rounded-2xl border p-8 shadow-sm'>
            <h2 className='text-foreground mb-4 text-xl font-semibold'>Built for Brand Onboarding</h2>
            <p className='text-muted-foreground text-lg leading-relaxed'>
              CreatorOS gives operators a single command center for bringing a new brand online:
              connect commerce and marketing integrations, import high-intent creators, score
              opportunities, and move creators from discovery to activation.
            </p>
          </section>

          <section className='bg-card rounded-2xl border p-8 shadow-sm'>
            <h2 className='text-foreground mb-4 text-xl font-semibold'>AI-Assisted Workflow</h2>
            <p className='text-muted-foreground text-lg leading-relaxed'>
              Atlas helps teams prioritize creators, draft outreach, prepare activation briefs, and
              surface launch blockers before they reach the client. Human review stays in the loop
              for approvals, messaging, and external sends.
            </p>
          </section>

          <section className='bg-card rounded-2xl border p-8 shadow-sm'>
            <h2 className='text-foreground mb-4 text-xl font-semibold'>Secure Integrations</h2>
            <p className='text-muted-foreground text-lg leading-relaxed'>
              Authentication is handled by Clerk, while provider credentials are routed through the
              CreatorOS backend for encrypted storage and readiness checks. Launch-critical
              integrations include Shopify, Meta, Klaviyo, TikTok, and enrichment providers.
            </p>
          </section>

          <section className='bg-card rounded-2xl border p-8 shadow-sm'>
            <h2 className='text-foreground mb-4 text-xl font-semibold'>Client-Ready Operations</h2>
            <p className='text-muted-foreground text-lg leading-relaxed'>
              The platform is designed to support repeatable onboarding for new brands, from
              capturing launch context to confirming integration health and tracking import jobs
              after a Shopify connection is activated.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
