import PageContainer from '@/components/layout/page-container';
import CreatorListingPage from '@/features/creators/components/creator-listing';
import { searchParamsCache } from '@/lib/searchparams';
import type { SearchParams } from 'nuqs/server';

export const metadata = {
  title: 'Dashboard: Creators'
};

type PageProps = {
  searchParams: Promise<SearchParams>;
};

export default async function CreatorsPage(props: PageProps) {
  const searchParams = await props.searchParams;
  searchParamsCache.parse(searchParams);

  const rawView = searchParams['view'];
  const view = rawView === 'table' ? 'table' : 'grid';

  return (
    <PageContainer
      scrollable={false}
      pageTitle='Creators'
      pageDescription='Discover, manage, and activate health & wellness micro-influencers. Toggle between card and table views.'
    >
      <CreatorListingPage view={view} />
    </PageContainer>
  );
}
