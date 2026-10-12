import PageContainer from '@/components/layout/page-container';
import ProposalsPage from '@/features/proposals/components/proposals-page';

export const metadata = { title: 'Dashboard: AI Proposals' };

export default function Page() {
  return (
    <PageContainer
      scrollable
      pageTitle='AI Proposals'
      pageDescription='AI-generated partnership proposals. Review and approve before sending.'
    >
      <ProposalsPage />
    </PageContainer>
  );
}
