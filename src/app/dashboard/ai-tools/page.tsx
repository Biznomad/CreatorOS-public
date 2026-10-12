import PageContainer from '@/components/layout/page-container';
import AIToolsPage from '@/features/ai-tools/components/ai-tools-page';

export const metadata = { title: 'Dashboard: AI Tools' };

export default function Page() {
  return (
    <PageContainer
      scrollable
      pageTitle='AI Tools'
      pageDescription='AI-powered automation for outreach, content briefs, and creator analysis.'
    >
      <AIToolsPage />
    </PageContainer>
  );
}
