'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Icons } from '@/components/icons';
import { useEffectiveBrand } from '@/hooks/use-effective-brand';
import { toast } from 'sonner';
import { withLocalQaMarker } from '@/lib/whitelabel-api';

type ShopifyVariant = {
  id: string;
  title?: string;
  price?: string;
  inventoryQuantity?: number;
  inventory_quantity?: number;
};

type ShopifyProduct = {
  id: string;
  title: string;
  variants?: ShopifyVariant[];
};

type ShopifyProductsResponse = {
  ok?: boolean;
  store?: string;
  products?: ShopifyProduct[];
};

function isShopifySetupError(message: string) {
  const normalized = message.toLowerCase();
  return (
    (normalized.includes('shopify') && normalized.includes('connection required')) ||
    (normalized.includes('shopify') && normalized.includes('app connection')) ||
    normalized.includes('connect a shopify store') ||
    normalized.includes('shopify store does not match') ||
    normalized.includes('connected shopify credentials belong to a different store')
  );
}

function normalizeProducts(products: ShopifyProduct[]): ShopifyProduct[] {
  return products.map((product) => ({
    ...product,
    variants: (product.variants || []).map((variant) => ({
      ...variant,
      inventoryQuantity: variant.inventoryQuantity ?? variant.inventory_quantity ?? 0
    }))
  }));
}

export function ShopifyProductCatalogPage() {
  const { brand: activeBrand, brandId: activeBrandId } = useEffectiveBrand();
  const activeBrandName = activeBrand.name;
  const [data, setData] = useState<ShopifyProductsResponse | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const loadProducts = useCallback(async () => {
    if (!activeBrandId) {
      setLoading(false);
      setData(null);
      setError('');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await fetch(withLocalQaMarker(`/api/proxy/api/brands/${encodeURIComponent(activeBrandId)}/shopify/products?limit=50`));
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.detail || payload.error || 'Shopify products unavailable');
      }
      setData({
        ...payload,
        products: normalizeProducts(Array.isArray(payload.products) ? payload.products : [])
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Shopify products unavailable';
      setData(null);
      setError(message);
      if (!isShopifySetupError(message)) toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [activeBrandId]);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  const products = useMemo(() => data?.products || [], [data?.products]);
  const variantCount = useMemo(
    () => products.reduce((total, product) => total + (product.variants?.length || 0), 0),
    [products]
  );
  const inStockVariants = useMemo(
    () => products.flatMap((product) => product.variants || []).filter((variant) => Number(variant.inventoryQuantity ?? 0) > 0).length,
    [products]
  );
  const needsShopifySetup = Boolean(activeBrandId && error && isShopifySetupError(error));
  const hasCatalogError = Boolean(activeBrandId && error && !needsShopifySetup);

  return (
    <div className='min-w-0 space-y-6 overflow-hidden'>
      <div className='grid min-w-0 gap-3 md:grid-cols-3'>
        <Card className='min-w-0 overflow-hidden'>
          <CardContent className='p-4'>
            <p className='text-xs font-medium text-muted-foreground'>Products</p>
            <p className='mt-2 text-2xl font-bold'>{products.length.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className='min-w-0 overflow-hidden'>
          <CardContent className='p-4'>
            <p className='text-xs font-medium text-muted-foreground'>Variants</p>
            <p className='mt-2 text-2xl font-bold'>{variantCount.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className='min-w-0 overflow-hidden'>
          <CardContent className='p-4'>
            <p className='text-xs font-medium text-muted-foreground'>In-stock variants</p>
            <p className='mt-2 text-2xl font-bold'>{inStockVariants.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      <Alert>
        {hasCatalogError ? <Icons.warning className='size-4' /> : <Icons.info className='size-4' />}
        <AlertTitle>
          {hasCatalogError
            ? 'Shopify products unavailable'
            : needsShopifySetup
              ? 'Connect Shopify to load products'
              : 'Shopify-backed catalog'}
        </AlertTitle>
        <AlertDescription>
          {hasCatalogError
            ? error
            : needsShopifySetup
              ? 'Install or reconnect the Shopify app before CreatorOS can read products for gifting and activation.'
              : data?.store
                ? `Live products are loaded from ${data.store} and ready for creator gifting fulfillment.`
                : "Products come from the active brand's Shopify connection and are used by gifting fulfillment."}
        </AlertDescription>
      </Alert>

      <Card className='min-w-0 overflow-hidden'>
        <CardHeader className='min-w-0 gap-4 sm:flex-row sm:items-start sm:justify-between'>
          <div className='min-w-0'>
            <CardTitle className='break-words'>{activeBrandId ? `${activeBrandName} product catalog` : 'Select a workspace'}</CardTitle>
            <CardDescription className='break-words'>{data?.store ? `Store: ${data.store}` : 'Live Shopify products and variants for creator gifting.'}</CardDescription>
          </div>
          <div className='flex min-w-0 flex-wrap gap-2'>
            <Button
              aria-label='Refresh Shopify product catalog'
              variant='outline'
              className='min-h-11 gap-2'
              onClick={loadProducts}
              disabled={loading || !activeBrandId}
            >
              <Icons.refresh className={loading ? 'size-4 animate-spin' : 'size-4'} />
              Refresh
            </Button>
            <Button asChild className='min-h-11 gap-2'>
              <Link
                aria-label={needsShopifySetup ? 'Connect Shopify in integrations' : 'Send creator gifts from product catalog'}
                href={needsShopifySetup ? '/dashboard/integrations' : '/dashboard/shipments'}
              >
                {needsShopifySetup ? <Icons.settings className='size-4' /> : <Icons.product className='size-4' />}
                {needsShopifySetup ? 'Connect Shopify' : 'Send gifts'}
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className='min-w-0'>
          {loading ? (
            <div className='flex items-center gap-2 rounded-lg border border-dashed p-6 text-sm text-muted-foreground'>
              <Icons.spinner className='size-4 animate-spin' />
              Loading Shopify products...
            </div>
          ) : !activeBrandId ? (
            <div className='rounded-lg border border-dashed p-8 text-center'>
              <Icons.workspace className='mx-auto mb-3 size-8 text-muted-foreground' />
              <h3 className='text-sm font-semibold'>Select a workspace</h3>
              <p className='mt-1 text-sm text-muted-foreground'>Choose a client brand before loading Shopify products.</p>
              <Button asChild variant='outline' className='mt-4 min-h-11 gap-2'>
                <Link aria-label='Open workspaces to select a brand for product catalog' href='/dashboard/workspaces'>
                  <Icons.workspace className='size-4' />
                  Open workspaces
                </Link>
              </Button>
            </div>
          ) : hasCatalogError ? (
            <div className='rounded-lg border border-dashed p-8 text-center'>
              <Icons.warning className='mx-auto mb-3 size-8 text-destructive' />
              <h3 className='text-sm font-semibold'>Product catalog unavailable</h3>
              <p className='mt-1 text-sm text-muted-foreground'>{error}</p>
              <Button variant='outline' className='mt-4 min-h-11 gap-2' onClick={loadProducts}>
                <Icons.refresh className='size-4' />
                Retry catalog load
              </Button>
            </div>
          ) : products.length === 0 ? (
            <div className='rounded-lg border border-dashed p-8 text-center'>
              {needsShopifySetup ? (
                <Icons.settings className='mx-auto mb-3 size-8 text-muted-foreground' />
              ) : (
                <Icons.product className='mx-auto mb-3 size-8 text-muted-foreground' />
              )}
              <h3 className='text-sm font-semibold'>
                {needsShopifySetup ? 'Shopify connection required' : 'No Shopify products loaded'}
              </h3>
              <p className='mt-1 text-sm text-muted-foreground'>
                {needsShopifySetup ? 'Install or reconnect the Shopify app for this workspace, then refresh the catalog.' : 'Connect Shopify in integrations, then refresh this catalog.'}
              </p>
              <Button asChild variant='outline' className='mt-4 min-h-11 gap-2'>
                <Link aria-label='Open integrations to connect Shopify for product catalog' href='/dashboard/integrations'>
                  <Icons.settings className='size-4' />
                  Open integrations
                </Link>
              </Button>
            </div>
          ) : (
            <div className='grid min-w-0 gap-3 lg:grid-cols-2'>
              {products.map((product) => (
                <div key={product.id} className='min-w-0 overflow-hidden rounded-lg border p-4'>
                  <div className='flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
                    <div className='min-w-0'>
                      <h3 className='min-w-0 break-words text-base font-semibold'>{product.title}</h3>
                      <p className='mt-1 break-all font-mono text-xs text-muted-foreground'>{product.id}</p>
                    </div>
                    <Badge variant='outline' className='w-fit shrink-0'>{(product.variants?.length || 0).toLocaleString()} variants</Badge>
                  </div>
                  <div className='mt-4 min-w-0 space-y-2'>
                    {(product.variants || []).map((variant) => (
                      <div key={variant.id} className='flex min-w-0 flex-col gap-2 rounded-md border bg-muted/30 p-2 text-sm sm:flex-row sm:items-center sm:justify-between'>
                        <div className='min-w-0'>
                          <p className='break-words font-medium'>{variant.title || 'Default'}</p>
                          <p className='break-all font-mono text-xs text-muted-foreground'>{variant.id}</p>
                        </div>
                        <div className='flex min-w-0 flex-wrap items-center gap-2'>
                          {variant.price && <Badge variant='secondary' className='shrink-0'>${variant.price}</Badge>}
                          <Badge variant={Number(variant.inventoryQuantity ?? 0) > 0 ? 'default' : 'outline'} className='max-w-full whitespace-normal text-left'>
                            {Number(variant.inventoryQuantity ?? 0).toLocaleString()} in stock
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
