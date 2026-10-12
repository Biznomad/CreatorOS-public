import PageContainer from '@/components/layout/page-container';
import { TeamManagementPage } from '@/features/workspaces/components/team-management-page';

export const metadata = {
  title: 'Dashboard: Users'
};

export default function UsersPage() {
  return (
    <PageContainer
      scrollable
      pageTitle='Users & Team'
      pageDescription='Manage organization members, roles, and active client workspace access.'
    >
      <TeamManagementPage />
    </PageContainer>
  );
}
