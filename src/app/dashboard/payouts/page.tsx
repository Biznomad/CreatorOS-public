import PageContainer from '@/components/layout/page-container';
import PayoutsPage from '@/features/payouts/components/payouts-page';

export const metadata = { title: 'Dashboard: View Payouts' };

export default function Page() {
  return (
    <PageContainer
      scrollable
      pageTitle='View Payouts'
      pageDescription='Manage affiliate view economics, accrue creator earnings, and review payout ledger rows.'
    >
      <PayoutsPage />
    </PageContainer>
  );
}
