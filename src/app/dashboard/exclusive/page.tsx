import PageContainer from '@/components/layout/page-container';
import { ExclusivePage as ExclusiveFeaturePage } from '@/features/exclusive/components/exclusive-page';

export const metadata = {
  title: 'Dashboard: Exclusive Features'
};

export default function ExclusivePage() {
  return (
    <PageContainer
      pageTitle='Exclusive Features'
      pageDescription='Scale and Agency workflows for whitelisted ads, Shopify activation, gifting, rewards, and launch operations.'
    >
      <ExclusiveFeaturePage />
    </PageContainer>
  );
}
