import PageContainer from '@/components/layout/page-container';
import { ShopifyProductCatalogPage } from '@/features/products/components/shopify-product-catalog-page';

export const metadata = {
  title: 'Dashboard: Products'
};

export default function Page() {
  return (
    <PageContainer
      scrollable
      pageTitle='Products'
      pageDescription='View Shopify products and variants available for creator gifting.'
    >
      <ShopifyProductCatalogPage />
    </PageContainer>
  );
}
