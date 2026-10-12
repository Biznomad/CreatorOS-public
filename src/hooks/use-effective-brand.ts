'use client';

import { useEffect, useMemo } from 'react';
import { useBrandStore } from '@/components/org-switcher';

const DEFAULT_BRAND_ID = process.env.NEXT_PUBLIC_CREATOROS_DEFAULT_BRAND_ID || 'demo-brand';
const DEFAULT_BRAND_NAME = process.env.NEXT_PUBLIC_CREATOROS_DEFAULT_BRAND_NAME || 'Demo Brand';

function isLocalQaRoute() {
  if (typeof window === 'undefined') return false;
  const isLocalHost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  return isLocalHost && window.location.search.includes('qa=1');
}

export function useEffectiveBrand() {
  const activeBrand = useBrandStore((s) => s.activeBrand);
  const fetchBrands = useBrandStore((s) => s.fetchBrands);

  useEffect(() => {
    if (activeBrand.id) return;
    void fetchBrands().catch(() => undefined);
  }, [activeBrand.id, fetchBrands]);

  return useMemo(() => {
    if (activeBrand.id) {
      return {
        brand: activeBrand,
        brandId: activeBrand.id,
        hasSelectedBrand: true,
        isLocalQaFallback: false
      };
    }

    if (isLocalQaRoute()) {
      return {
        brand: {
          id: DEFAULT_BRAND_ID,
          name: DEFAULT_BRAND_NAME,
          niche: 'Health Supplements',
          shopify_store: 'brand.myshopify.com'
        },
        brandId: DEFAULT_BRAND_ID,
        hasSelectedBrand: false,
        isLocalQaFallback: true
      };
    }

    return {
      brand: activeBrand,
      brandId: '',
      hasSelectedBrand: false,
      isLocalQaFallback: false
    };
  }, [activeBrand]);
}

export function useEffectiveBrandId() {
  return useEffectiveBrand().brandId;
}
