import PageContainer from '@/components/layout/page-container';
import DiscoverPage from '@/features/creators/components/discover-page';

export const metadata = { title: 'Dashboard: Discover Creators' };

export default function Page() {
  return (
    <PageContainer
      scrollable
      pageTitle='Discover Creators'
      pageDescription='Search Instagram and TikTok for creators in your niche. AI scores and imports them to your pipeline.'
    >
      <DiscoverPage />
    </PageContainer>
  );
}
