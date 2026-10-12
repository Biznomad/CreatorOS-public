import PageContainer from '@/components/layout/page-container';
import CampaignListingPage from '@/features/campaigns/components/campaign-listing';
import { searchParamsCache } from '@/lib/searchparams';
import type { SearchParams } from 'nuqs/server';

export const metadata = {
  title: 'Dashboard: Campaigns'
};

type PageProps = {
  searchParams: Promise<SearchParams>;
};

export default async function CampaignsPage(props: PageProps) {
  const searchParams = await props.searchParams;
  searchParamsCache.parse(searchParams);

  return (
    <PageContainer
      scrollable={false}
      pageTitle='Campaigns'
      pageDescription='Track whitelisted and brand ad performance across Meta and TikTok.'
    >
      <CampaignListingPage />
    </PageContainer>
  );
}
