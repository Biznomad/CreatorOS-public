import PageContainer from '@/components/layout/page-container';
import ContentBriefsPage from '@/features/content-briefs/components/content-briefs-page';

export const metadata = { title: 'Dashboard: Content Briefs' };

export default function Page() {
  return (
    <PageContainer
      scrollable
      pageTitle='Content Briefs'
      pageDescription='Saved creator briefs with scripts, visual notes, guidelines, and review-ready details.'
    >
      <ContentBriefsPage />
    </PageContainer>
  );
}
