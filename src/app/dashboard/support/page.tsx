import PageContainer from '@/components/layout/page-container';
import SupportDeskPage from '@/features/support/components/support-desk-page';

export const metadata = { title: 'Dashboard: Support Desk' };

export default function Page() {
  return (
    <PageContainer
      scrollable
      pageTitle='Support Desk'
      pageDescription='AI-assisted help desk tickets for your whitelabeled platform.'
    >
      <SupportDeskPage />
    </PageContainer>
  );
}
