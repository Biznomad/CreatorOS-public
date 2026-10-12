'use client';

import { type FormEvent, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar
} from '@/components/ui/sidebar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getSignInUrl, isLocalQaAuthEnabled, withLocalQaMarker } from '@/lib/dashboard-auth';
import { create } from 'zustand';

const API_BASE = '/api/proxy';
const ACTIVE_BRAND_ID_KEY = 'creatoros-active-brand-id';
const DEFAULT_BRAND_ID = process.env.NEXT_PUBLIC_CREATOROS_DEFAULT_BRAND_ID || 'demo-brand';

type Brand = {
  id: string;
  name: string;
  niche: string;
  shopify_store?: string;
};

type BrandRow = Partial<Brand> & {
  brand_id?: string;
};

type BrandCreateInput = {
  name: string;
  niche: string;
  shopify_store?: string;
  target_audience?: string;
  product_focus?: string;
};

type BrandStore = {
  brands: Brand[];
  activeBrand: Brand;
  loading: boolean;
  setActiveBrand: (brand: Brand) => void;
  fetchBrands: () => Promise<void>;
  createBrand: (input: BrandCreateInput) => Promise<Brand>;
};

const emptyBrand: Brand = { id: '', name: 'Create brand', niche: 'No client workspace selected' };
const defaultBrand: Brand = { id: '', name: 'Loading...', niche: '' };

function normalizeShopifyStore(value: string) {
  return value
    .trim()
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '')
    .toLowerCase();
}

function normalizeBrand(row: BrandRow): Brand {
  const shopifyStore =
    typeof row.shopify_store === 'string' ? normalizeShopifyStore(row.shopify_store) : '';
  return {
    id: row.id || row.brand_id || '',
    name: row.name || '',
    niche: row.niche || '',
    ...(shopifyStore ? { shopify_store: shopifyStore } : {})
  };
}

function readActiveBrandId() {
  if (typeof window === 'undefined') return null;
  let storedBrandId: string | null = null;
  try {
    storedBrandId = window.localStorage.getItem(ACTIVE_BRAND_ID_KEY);
  } catch {
    storedBrandId = null;
  }
  if (isLocalQaAuthEnabled() && storedBrandId?.startsWith('creatoros-launch-qa-')) {
    return DEFAULT_BRAND_ID;
  }
  return storedBrandId;
}

function rememberActiveBrand(brandId: string) {
  if (typeof window === 'undefined') return;
  try {
    if (brandId) {
      window.localStorage.setItem(ACTIVE_BRAND_ID_KEY, brandId);
    } else {
      window.localStorage.removeItem(ACTIVE_BRAND_ID_KEY);
    }
  } catch {
    // Local storage can be unavailable in embedded/privacy-restricted browser contexts.
  }
}

function selectDefaultBrand(
  brands: Brand[],
  preferredBrandId: string | null,
  currentBrandId?: string
) {
  return (
    brands.find((brand) => brand.id === preferredBrandId) ||
    brands.find((brand) => brand.id === DEFAULT_BRAND_ID) ||
    brands.find((brand) => brand.id === currentBrandId) ||
    brands[0] ||
    emptyBrand
  );
}

export const useBrandStore = create<BrandStore>()((set, get) => ({
  brands: [],
  activeBrand: defaultBrand,
  loading: false,

  setActiveBrand: (brand) => {
    rememberActiveBrand(brand.id);
    set({ activeBrand: brand });
  },

  fetchBrands: async () => {
    const preferredBrandId = readActiveBrandId();
    set({ loading: true });
    try {
      const res = await fetch(`${API_BASE}${withLocalQaMarker('/api/brands')}`, {
        credentials: 'include'
      });
      if (res.status === 401) throw new Error('auth-required');
      if (!res.ok) throw new Error(`${res.status}`);
      const data = (await res.json()) as BrandRow[];
      const brands = (data || []).map(normalizeBrand).filter((brand) => brand.id && brand.name);
      const activeBrand = selectDefaultBrand(brands, preferredBrandId, get().activeBrand.id);
      rememberActiveBrand(activeBrand.id);
      set({
        brands,
        activeBrand
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'auth-required') {
        rememberActiveBrand('');
        set({
          brands: [],
          activeBrand: emptyBrand
        });
        return;
      }
      const existingBrands = get().brands.filter((brand) => brand.id && brand.name);
      const currentBrand = get().activeBrand;
      const activeBrand = selectDefaultBrand(existingBrands, preferredBrandId, currentBrand.id);
      rememberActiveBrand(activeBrand.id);
      set({
        brands: existingBrands,
        activeBrand
      });
    } finally {
      set({ loading: false });
    }
  },

  createBrand: async (input) => {
    const res = await fetch(`${API_BASE}${withLocalQaMarker('/api/brands')}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(input)
    });
    const payload = (await res.json().catch(() => ({}))) as BrandRow & {
      detail?: string;
      error?: string;
    };
    if (res.status === 409) throw new Error('brand-exists');
    if (res.status === 401) throw new Error('auth-required');
    if (!res.ok) throw new Error(payload.detail || payload.error || 'brand-create-failed');
    const brand = normalizeBrand(payload);
    if (!brand.id || !brand.name) throw new Error('brand-create-failed');
    rememberActiveBrand(brand.id);
    set((state) => ({
      brands: [brand, ...state.brands.filter((existing) => existing.id !== brand.id)],
      activeBrand: brand
    }));
    return brand;
  }
}));

export function OrgSwitcher() {
  const { isMobile, state } = useSidebar();
  const { brands, activeBrand, setActiveBrand, fetchBrands, createBrand } = useBrandStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formValues, setFormValues] = useState<BrandCreateInput>({
    name: '',
    niche: '',
    target_audience: '',
    product_focus: ''
  });

  useEffect(() => {
    fetchBrands();
  }, [fetchBrands]);

  function updateFormValue(key: keyof BrandCreateInput, value: string) {
    setFormValues((previous) => ({ ...previous, [key]: value }));
  }

  async function handleCreateBrand(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!formValues.name.trim()) {
      toast.error('Add the brand name before creating the workspace.');
      return;
    }
    setCreating(true);
    try {
      await createBrand(formValues);
      toast.success(`${formValues.name.trim()} is now selected.`);
      setDialogOpen(false);
      setFormValues({ name: '', niche: '', target_audience: '', product_focus: '' });
    } catch (error) {
      if (error instanceof Error && error.message === 'auth-required') {
        toast.error('Sign in to create and manage client workspaces.');
        if (typeof window !== 'undefined') window.location.assign(getSignInUrl());
        return;
      }
      if (error instanceof Error && error.message === 'brand-exists') {
        toast.error(
          'A brand with this name already exists. Pick it from the brand menu or use a different name.'
        );
        return;
      }
      toast.error(
        error instanceof Error && error.message !== 'brand-create-failed'
          ? error.message
          : 'CreatorOS could not create this client workspace. Check the backend connection and try again.'
      );
    } finally {
      setCreating(false);
    }
  }

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size='lg'
                aria-label={`Switch workspace. Current workspace: ${activeBrand.name}`}
                className='data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground'
              >
                <div className='bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg'>
                  <Icons.sparkles className='size-4' />
                </div>
                <div
                  className={`grid flex-1 text-left text-sm leading-tight transition-all duration-200 ease-in-out ${
                    state === 'collapsed'
                      ? 'invisible max-w-0 overflow-hidden opacity-0'
                      : 'visible max-w-full opacity-100'
                  }`}
                >
                  <span className='truncate font-medium'>{activeBrand.name}</span>
                  <span className='text-muted-foreground truncate text-xs'>
                    {activeBrand.niche}
                  </span>
                </div>
                <Icons.chevronsUpDown
                  className={`ml-auto transition-all duration-200 ease-in-out ${
                    state === 'collapsed'
                      ? 'invisible max-w-0 opacity-0'
                      : 'visible max-w-full opacity-100'
                  }`}
                />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className='w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg'
              align='start'
              side={isMobile ? 'bottom' : 'right'}
              sideOffset={4}
            >
              <DropdownMenuLabel className='text-muted-foreground text-xs'>
                Brands
              </DropdownMenuLabel>
              {brands.map((brand) => {
                const isActive = brand.id === activeBrand.id;
                return (
                  <DropdownMenuItem
                    key={brand.id}
                    onClick={() => setActiveBrand(brand)}
                    className='min-h-11 gap-2 p-2'
                  >
                    <div className='flex size-6 items-center justify-center overflow-hidden rounded-md border'>
                      <Icons.sparkles className='size-3.5 shrink-0' />
                    </div>
                    <div className='flex flex-col'>
                      <span>{brand.name}</span>
                      <span className='text-muted-foreground text-xs'>{brand.niche}</span>
                    </div>
                    {isActive && <Icons.check className='ml-auto size-4' />}
                  </DropdownMenuItem>
                );
              })}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className='min-h-11 gap-2 p-2'
                onSelect={(event) => {
                  event.preventDefault();
                  setDialogOpen(true);
                }}
              >
                <div className='flex size-6 items-center justify-center rounded-md border bg-transparent'>
                  <Icons.add className='size-4' />
                </div>
                <div className='font-medium'>Add brand</div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className='flex max-h-[calc(100dvh-2rem)] flex-col overflow-hidden sm:max-w-xl'>
          <form className='flex min-h-0 flex-col gap-5' onSubmit={handleCreateBrand}>
            <DialogHeader className='shrink-0'>
              <DialogTitle>Create client brand</DialogTitle>
              <DialogDescription>
                Set up a brand workspace, then connect Shopify and launch integrations for that
                client.
              </DialogDescription>
            </DialogHeader>

            <div className='grid min-h-0 gap-4 overflow-y-auto pr-1 sm:grid-cols-2'>
              <div className='space-y-2 sm:col-span-2'>
                <Label htmlFor='brand-name'>Brand name</Label>
                <Input
                  id='brand-name'
                  placeholder='Acme Wellness'
                  value={formValues.name}
                  onChange={(event) => updateFormValue('name', event.target.value)}
                  autoComplete='organization'
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='brand-niche'>Niche</Label>
                <Input
                  id='brand-niche'
                  placeholder='Skincare, wellness, fashion'
                  value={formValues.niche}
                  onChange={(event) => updateFormValue('niche', event.target.value)}
                />
              </div>
              <div className='space-y-2 sm:col-span-2'>
                <Label htmlFor='brand-audience'>Target audience</Label>
                <Input
                  id='brand-audience'
                  placeholder='Women 25-45 in the US, clean beauty buyers'
                  value={formValues.target_audience}
                  onChange={(event) => updateFormValue('target_audience', event.target.value)}
                />
              </div>
              <div className='space-y-2 sm:col-span-2'>
                <Label htmlFor='brand-products'>Product focus</Label>
                <Input
                  id='brand-products'
                  placeholder='Hero products, bundles, starter kits'
                  value={formValues.product_focus}
                  onChange={(event) => updateFormValue('product_focus', event.target.value)}
                />
              </div>
            </div>

            <DialogFooter className='shrink-0'>
              <Button
                type='button'
                variant='outline'
                className='min-h-11 cursor-pointer'
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type='submit' className='min-h-11 cursor-pointer gap-2' disabled={creating}>
                {creating ? (
                  <Icons.spinner className='size-4 animate-spin' />
                ) : (
                  <Icons.add className='size-4' />
                )}
                {creating ? 'Creating...' : 'Create brand'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
