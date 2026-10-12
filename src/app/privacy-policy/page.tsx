import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'CreatorOS privacy policy for Shopify merchants and creator partnership operations.',
  robots: {
    index: false
  }
};

export default function PrivacyPolicyPage() {
  return (
    <div className='min-h-screen px-4 py-12 sm:px-6 lg:px-8'>
      <div className='mx-auto max-w-3xl space-y-8'>
        <h1 className='text-foreground text-3xl font-bold'>Privacy Policy</h1>

        <section>
          <h2 className='text-foreground mb-3 text-xl font-semibold'>Overview</h2>
          <p className='text-muted-foreground text-base leading-relaxed'>
            CreatorOS processes account, brand, creator, campaign, and integration data needed to
            operate creator whitelisting and partnership workflows. We use this data to provide the
            dashboard, run onboarding checks, support AI-assisted recommendations, and help teams
            manage creator activation.
          </p>
        </section>

        <section>
          <h2 className='text-foreground mb-3 text-xl font-semibold'>Shopify Merchant Data</h2>
          <p className='text-muted-foreground text-base leading-relaxed'>
            When a Shopify merchant installs CreatorOS, we process only the Shopify data needed to
            run the whitelisting and affiliate workflow: store domain, products, orders, customer
            identifiers, customer contact details, order count, total spend, tags, and customer
            metadata used to identify creator or ambassador candidates. This protected customer
            data is used to preview imports, score activation opportunities, prepare reviewed
            outreach, support gifting through Shopify draft orders, and report creator-program
            performance for the merchant workspace that connected the store.
          </p>
        </section>

        <section>
          <h2 className='text-foreground mb-3 text-xl font-semibold'>Account Data</h2>
          <p className='text-muted-foreground text-base leading-relaxed'>
            Authentication is managed by{' '}
            <a
              href='https://clerk.com'
              target='_blank'
              rel='noopener noreferrer'
              className='inline-flex min-h-11 min-w-11 items-center justify-center align-middle text-primary font-medium hover:underline'
            >
              Clerk
            </a>
            . CreatorOS receives basic profile details such as name, email address, user ID, and
            workspace membership so the application can provide secure access to brand data.
          </p>
        </section>

        <section>
          <h2 className='text-foreground mb-3 text-xl font-semibold'>Integration Data</h2>
          <p className='text-muted-foreground text-base leading-relaxed'>
            When a brand connects providers such as Shopify, Meta, Klaviyo, TikTok, or enrichment
            services, CreatorOS may process store, campaign, audience, creator, order, product, and
            performance data made available by those providers. Secret credentials are handled by
            the backend and are not intentionally exposed in the dashboard UI.
          </p>
        </section>

        <section>
          <h2 className='text-foreground mb-3 text-xl font-semibold'>How Data Is Used</h2>
          <p className='text-muted-foreground text-base leading-relaxed'>
            Data is used to import creators, score opportunities, generate outreach and activation
            recommendations, track partnership status, verify launch readiness, and report on
            campaign or commerce outcomes. We do not sell customer data.
          </p>
        </section>

        <section>
          <h2 className='text-foreground mb-3 text-xl font-semibold'>Data Sharing</h2>
          <p className='text-muted-foreground text-base leading-relaxed'>
            CreatorOS does not sell merchant, customer, or creator data. We share data only with
            service providers needed to operate the product, such as hosting, authentication,
            email delivery, analytics, AI processing, and connected provider APIs selected by the
            merchant. Provider access is scoped to the active merchant or brand workspace.
          </p>
        </section>

        <section>
          <h2 className='text-foreground mb-3 text-xl font-semibold'>Retention and Deletion</h2>
          <p className='text-muted-foreground text-base leading-relaxed'>
            CreatorOS retains imported Shopify and creator data while the merchant workspace is
            active and the data is needed to provide the service. Shopify app uninstall,
            customers/data_request, customers/redact, and shop redact webhooks are implemented so
            merchant and customer deletion requests can remove or anonymize Shopify-derived
            records. Merchants may also request deletion, export, or correction by contacting
            privacy@creatoros.com or contact@biznomad.io.
          </p>
        </section>

        <section>
          <h2 className='text-foreground mb-3 text-xl font-semibold'>Security</h2>
          <p className='text-muted-foreground text-base leading-relaxed'>
            CreatorOS uses authenticated access, backend readiness checks, and encrypted provider
            secret storage when the production environment is configured with the required
            encryption key and database migrations. Customers should only enter live provider
            credentials in approved production or staging environments.
          </p>
        </section>

        <section>
          <h2 className='text-foreground mb-3 text-xl font-semibold'>Contact</h2>
          <p className='text-muted-foreground text-base leading-relaxed'>
            For privacy requests, access questions, deletion requests, or Shopify protected
            customer data inquiries, contact privacy@creatoros.com or contact@biznomad.io.
          </p>
        </section>

        <div className='border-border border-t pt-4'>
          <p className='text-muted-foreground text-sm'>Last updated: June 19, 2026</p>
        </div>
      </div>
    </div>
  );
}
