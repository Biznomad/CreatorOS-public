import AppSidebar from '@/components/layout/app-sidebar';
import Header from '@/components/layout/header';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { AuthGuard } from '@/components/auth-guard';
import { OnboardingModal } from '@/features/onboarding/components/onboarding-modal';
import AgentFloatingButton from '@/features/agent/components/agent-floating-button';
import type { Metadata } from 'next';
import { cookies } from 'next/headers';

export const metadata: Metadata = {
  title: {
    default: 'Dashboard',
    template: '%s | CreatorOS'
  },
  description: 'CreatorOS — Influencer whitelisting and creator management dashboard',
  robots: {
    index: false,
    follow: false
  }
};

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get('sidebar_state')?.value === 'true';
  return (
    <AuthGuard>
      <SidebarProvider defaultOpen={defaultOpen}>
        <AppSidebar />
        <SidebarInset>
          <Header />
          <OnboardingModal />
          {children}
          <AgentFloatingButton />
        </SidebarInset>
      </SidebarProvider>
    </AuthGuard>
  );
}
