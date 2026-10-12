import PageContainer from '@/components/layout/page-container';
import AgreementsPage from '@/features/agreements/components/agreements-page';

export const metadata = { title: 'Dashboard: Agreements' };

export default function Page() {
  return (
    <PageContainer
      scrollable
      pageTitle='Agreements'
      pageDescription='Review creator whitelisting terms, usage rights, compensation, and signature status.'
    >
      <AgreementsPage />
    </PageContainer>
  );
}
