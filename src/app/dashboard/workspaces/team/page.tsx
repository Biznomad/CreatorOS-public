import PageContainer from '@/components/layout/page-container';
import { TeamManagementPage } from '@/features/workspaces/components/team-management-page';

export const metadata = {
  title: 'Dashboard: Team Management'
};

export default function TeamPage() {
  return (
    <PageContainer
      pageTitle='Team Management'
      pageDescription='Manage your workspace team, members, roles, security and more.'
      scrollable
    >
      <TeamManagementPage />
    </PageContainer>
  );
}
