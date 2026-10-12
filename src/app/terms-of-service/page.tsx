import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'CreatorOS terms for Shopify merchant and creator partnership workflows.',
  robots: {
    index: false
  }
};

export default function TermsOfServicePage() {
  return (
    <div className='min-h-screen px-4 py-12 sm:px-6 lg:px-8'>
      <div className='mx-auto max-w-3xl space-y-8'>
        <div className='text-center'>
          <h1 className='text-foreground text-3xl font-bold'>Terms of Service</h1>
          <p className='text-muted-foreground mt-2 text-sm'>Last updated: June 19, 2026</p>
          <div className='mt-6 flex flex-wrap items-center justify-center gap-3 text-sm font-medium'>
            <Link href='/' className='inline-flex min-h-11 items-center justify-center rounded-md border px-4 text-foreground hover:bg-muted'>
              Back to CreatorOS
            </Link>
            <Link href='/privacy-policy' className='inline-flex min-h-11 items-center justify-center rounded-md border px-4 text-foreground hover:bg-muted'>
              Privacy Policy
            </Link>
            <Link href='/about' className='inline-flex min-h-11 items-center justify-center rounded-md border px-4 text-foreground hover:bg-muted'>
              About
            </Link>
          </div>
        </div>

        <section>
          <h2 className='text-foreground mb-3 text-xl font-semibold'>Use of CreatorOS</h2>
          <p className='text-muted-foreground text-base leading-relaxed'>
            CreatorOS is a creator whitelisting and partnership operations platform for authorized
            users and approved brand workspaces. By using the platform, you agree to use it only for
            legitimate brand, creator, campaign, commerce, and reporting workflows.
          </p>
        </section>

        <section>
          <h2 className='text-foreground mb-3 text-xl font-semibold'>Customer Responsibilities</h2>
          <p className='text-muted-foreground text-base leading-relaxed'>
            Customers are responsible for ensuring they have the right to connect provider
            accounts, import customer or creator data, contact creators, run ads, issue gifts, and
            use generated outreach or briefs. Users should review AI-assisted recommendations before
            acting on them externally.
          </p>
        </section>

        <section>
          <h2 className='text-foreground mb-3 text-xl font-semibold'>Shopify Usage</h2>
          <p className='text-muted-foreground text-base leading-relaxed'>
            CreatorOS uses Shopify APIs, Shopify OAuth, Shopify compliance webhooks, and Shopify Billing API
            flows for merchant installation, protected customer data handling, and app
            subscriptions. CreatorOS does not replace Shopify checkout, process buyer payments
            outside Shopify, alter shipping rates, or process refunds outside the original Shopify
            payment flow.
          </p>
        </section>

        <section>
          <h2 className='text-foreground mb-3 text-xl font-semibold'>Provider Integrations</h2>
          <p className='text-muted-foreground text-base leading-relaxed'>
            Shopify, Meta, Klaviyo, TikTok, and other integrations remain governed by their own
            platform terms. CreatorOS readiness checks help identify missing configuration, but the
            customer controls which provider accounts are connected and what actions are approved.
          </p>
        </section>

        <section>
          <h2 className='text-foreground mb-3 text-xl font-semibold'>Creator Outreach and Ads</h2>
          <p className='text-muted-foreground text-base leading-relaxed'>
            CreatorOS helps teams draft and manage creator outreach, affiliate operations,
            whitelisting, Partnership Ads, gifting, and content terms. Users are responsible for
            obtaining any required creator consent, platform permissions, and advertising approvals
            before sending messages, launching ads, using creator content, or issuing rewards.
          </p>
        </section>

        <section>
          <h2 className='text-foreground mb-3 text-xl font-semibold'>Data and Credentials</h2>
          <p className='text-muted-foreground text-base leading-relaxed'>
            Users should only enter live provider credentials in approved production or staging
            environments. CreatorOS is designed to route secret credentials through the backend for
            encrypted storage once the required environment key and database migrations are in
            place.
          </p>
        </section>

        <section>
          <h2 className='text-foreground mb-3 text-xl font-semibold'>Availability</h2>
          <p className='text-muted-foreground text-base leading-relaxed'>
            We work to keep CreatorOS reliable and secure, but some workflows depend on third-party
            APIs, customer credentials, provider permissions, and database availability. Launch
            readiness should be verified in the target environment before onboarding a live brand.
          </p>
        </section>

        <section>
          <h2 className='text-foreground mb-3 text-xl font-semibold'>Changes to These Terms</h2>
          <p className='text-muted-foreground text-base leading-relaxed'>
            These terms may be updated as the platform evolves. Continued use of CreatorOS after
            updated terms are posted means you accept the revised terms.
          </p>
        </section>

        <section className='border-border border-t pt-4'>
          <p className='text-muted-foreground text-center text-sm'>
            Questions about these terms should be directed to contact@biznomad.io.
          </p>
        </section>
      </div>
    </div>
  );
}
