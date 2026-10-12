import PageContainer from '@/components/layout/page-container';
import OutreachCRM from '@/features/outreach/components/outreach-crm';

export const metadata = { title: 'Dashboard: Messages' };

export default function Page() {
  return (
    <PageContainer
      scrollable={false}
      pageTitle='Outreach CRM'
      pageDescription='Manage all creator conversations. AI-generate messages, track delivery status, and organize your outreach pipeline.'
    >
      <OutreachCRM />
    </PageContainer>
  );
}
