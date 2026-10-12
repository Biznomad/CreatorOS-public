import PageContainer from '@/components/layout/page-container';
import MilestonesPage from '@/features/milestones/components/milestones-page';

export const metadata = { title: 'Dashboard: Milestones & Rewards' };

export default function Page() {
  return (
    <PageContainer
      scrollable
      pageTitle='Milestones & Rewards'
      pageDescription='Track creator achievements and manage reward fulfillment.'
    >
      <MilestonesPage />
    </PageContainer>
  );
}
