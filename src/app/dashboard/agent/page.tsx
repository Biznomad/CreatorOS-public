import PageContainer from '@/components/layout/page-container'
import AgentChat from '@/features/agent/components/agent-chat'

export const metadata = { title: 'Dashboard: Atlas AI' }

export default function Page() {
  return (
    <PageContainer
      pageTitle='Atlas'
      pageDescription='Your AI Head of Creator Partnerships — powered by CreatorOS intelligence.'
    >
      <AgentChat />
    </PageContainer>
  )
}
