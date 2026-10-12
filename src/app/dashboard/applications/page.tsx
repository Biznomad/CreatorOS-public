import PageContainer from '@/components/layout/page-container';
import { ApplicationsPage } from '@/features/applications/components/applications-page';

export const metadata = { title: 'Dashboard: Applications' };

export default function Page() {
  return (
    <PageContainer
      pageTitle='Applications'
      pageDescription='Review and manage influencer applications.'
    >
      <ApplicationsPage />
    </PageContainer>
  );
}
