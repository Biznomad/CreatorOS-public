import PageContainer from '@/components/layout/page-container';
import ShopifyImportPage from '@/features/shopify-import/components/shopify-import-page';

export const metadata = { title: 'Dashboard: Shopify Import' };

export default function Page() {
  return (
    <PageContainer
      pageTitle='Shopify Import'
      pageDescription='Import existing customers and activate them as brand creators.'
    >
      <ShopifyImportPage />
    </PageContainer>
  );
}
