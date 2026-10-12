import PageContainer from '@/components/layout/page-container';
import ActivationPage from '@/features/activation/components/activation-page';

export const metadata = { title: 'Dashboard: Creator Activation' };

export default function Page() {
  return (
    <PageContainer
      pageTitle='Creator Activation'
      pageDescription='Segment customers by whitelisting readiness. IG verified creators can run Partnership Ads. Email-only VIPs get Klaviyo outreach.'
    >
      <ActivationPage />
    </PageContainer>
  );
}
