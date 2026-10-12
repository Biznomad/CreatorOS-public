import PageContainer from '@/components/layout/page-container';
import { WorkspacesPage as WorkspacesManagementPage } from '@/features/workspaces/components/workspaces-page';

export const metadata = {
  title: 'Dashboard: Workspaces'
};

export default function WorkspacesPage() {
  return (
    <PageContainer
      pageTitle='Workspaces'
      pageDescription='Manage your workspaces and switch between them.'
    >
      <WorkspacesManagementPage />
    </PageContainer>
  );
}
