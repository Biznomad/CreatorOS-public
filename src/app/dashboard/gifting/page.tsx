import PageContainer from '@/components/layout/page-container';
import GiftingPage from '@/features/gifting/components/gifting-page';

export const metadata = { title: 'Dashboard: Product Gifting' };

export default function Page() {
  return (
    <PageContainer
      pageTitle='Product Gifting'
      pageDescription='Send products to creators and track fulfillment through content delivery.'
    >
      <GiftingPage />
    </PageContainer>
  );
}
