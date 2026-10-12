import PageContainer from '@/components/layout/page-container';
import IntegrationsPage from '@/features/integrations/components/integrations-page';

export const metadata = { title: 'Dashboard: Integrations' };

export default function Page() {
  return (
    <PageContainer
      scrollable
      pageTitle='Brand Integrations'
      pageDescription='Connect your accounts to unlock automation. Each brand can have its own Shopify, Meta, Klaviyo, and TikTok connections.'
    >
      <IntegrationsPage />
    </PageContainer>
  );
}
