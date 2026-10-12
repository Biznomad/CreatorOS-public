'use client';

import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Icons } from '@/components/icons';
import { useBrandStore } from '@/components/org-switcher';
import { getSignInUrl } from '@/lib/dashboard-auth';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type BrandCreateInput = {
  name: string;
  niche: string;
  shopify_store?: string;
  target_audience?: string;
  product_focus?: string;
};

const emptyForm: BrandCreateInput = {
  name: '',
  niche: '',
  target_audience: '',
  product_focus: ''
};

export function WorkspacesPage() {
  const { brands, activeBrand, loading, setActiveBrand, fetchBrands, createBrand } = useBrandStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formValues, setFormValues] = useState<BrandCreateInput>(emptyForm);

  const connectedStores = useMemo(() => brands.filter((brand) => brand.shopify_store).length, [brands]);
  const formValidationError = useMemo(
    () => formValues.name.trim() ? null : 'Add a brand name before creating the workspace.',
    [formValues.name]
  );

  useEffect(() => {
    void fetchBrands();
  }, [fetchBrands]);

  function updateFormValue(key: keyof BrandCreateInput, value: string) {
    setFormValues((previous) => ({ ...previous, [key]: value }));
  }

  async function handleCreateBrand(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (formValidationError) {
      toast.error(formValidationError);
      return;
    }
    setCreating(true);
    try {
      await createBrand(formValues);
      toast.success(`${formValues.name.trim()} is now the active workspace.`);
      setDialogOpen(false);
      setFormValues(emptyForm);
    } catch (error) {
      if (error instanceof Error && error.message === 'auth-required') {
        toast.error('Sign in to create and manage client workspaces.');
        if (typeof window !== 'undefined') window.location.assign(getSignInUrl());
      } else if (error instanceof Error && error.message === 'brand-exists') {
        toast.error('A brand with this name already exists.');
      } else {
        toast.error(error instanceof Error && error.message !== 'brand-create-failed'
          ? error.message
          : 'CreatorOS could not create this workspace.');
      }
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className='space-y-6'>
      <div className='grid gap-3 md:grid-cols-3'>
        <Card>
          <CardContent className='p-4'>
            <p className='text-xs font-medium text-muted-foreground'>Client workspaces</p>
            <p className='mt-2 text-2xl font-bold'>{brands.length.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className='p-4'>
            <p className='text-xs font-medium text-muted-foreground'>Shopify stores</p>
            <p className='mt-2 text-2xl font-bold'>{connectedStores.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className='p-4'>
            <p className='text-xs font-medium text-muted-foreground'>Active workspace</p>
            <p className='mt-2 truncate text-2xl font-bold'>{activeBrand.id ? activeBrand.name : 'None'}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className='gap-4 sm:flex-row sm:items-start sm:justify-between'>
          <div>
            <CardTitle>Client brand workspaces</CardTitle>
            <CardDescription>
              Select the brand context used by discovery, outreach, activation, billing, Shopify, and reporting.
            </CardDescription>
          </div>
          <div className='flex flex-wrap gap-2'>
            <Button variant='outline' className='min-h-11 gap-2' onClick={() => fetchBrands()} disabled={loading}>
              <Icons.refresh className={cn('size-4', loading && 'animate-spin')} />
              Refresh
            </Button>
            <Button className='min-h-11 gap-2' onClick={() => setDialogOpen(true)}>
              <Icons.add className='size-4' />
              New workspace
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className='flex items-center gap-2 rounded-lg border border-dashed p-6 text-sm text-muted-foreground'>
              <Icons.spinner className='size-4 animate-spin' />
              Loading workspaces...
            </div>
          ) : brands.length === 0 ? (
            <div className='rounded-lg border border-dashed p-8 text-center'>
              <Icons.workspace className='mx-auto mb-3 size-8 text-muted-foreground' />
              <h3 className='text-sm font-semibold'>No workspaces available</h3>
              <p className='mt-1 text-sm text-muted-foreground'>Create a client brand workspace to start connecting integrations.</p>
            </div>
          ) : (
            <div className='grid gap-3 lg:grid-cols-2'>
              {brands.map((brand) => {
                const isActive = brand.id === activeBrand.id;
                return (
                  <button
                    key={brand.id}
                    type='button'
                    aria-label={isActive ? `${brand.name} is the active workspace` : `Switch to ${brand.name} workspace`}
                    className={cn(
                      'min-h-11 rounded-lg border p-4 text-left transition-colors hover:bg-muted/50',
                      isActive && 'border-primary bg-primary/5'
                    )}
                    onClick={() => {
                      setActiveBrand(brand);
                      toast.success(`${brand.name} is now active.`);
                    }}
                  >
                    <div className='flex items-start justify-between gap-3'>
                      <div className='min-w-0'>
                        <div className='flex flex-wrap items-center gap-2'>
                          <h3 className='truncate text-base font-semibold'>{brand.name}</h3>
                          {isActive && <Badge>Active</Badge>}
                        </div>
                        <p className='mt-1 text-sm text-muted-foreground'>{brand.niche || 'General creator program'}</p>
                      </div>
                      <Icons.workspace className='size-5 shrink-0 text-muted-foreground' />
                    </div>
                    <div className='mt-4 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2'>
                      <div className='rounded-md border bg-background/70 p-2'>
                        <p className='font-medium text-foreground'>Workspace ID</p>
                        <p className='mt-1 break-all font-mono'>{brand.id}</p>
                      </div>
                      <div className='rounded-md border bg-background/70 p-2'>
                        <p className='font-medium text-foreground'>Shopify store</p>
                        <p className='mt-1 break-all font-mono'>{brand.shopify_store || 'Not connected'}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className='flex max-h-[calc(100dvh-2rem)] flex-col overflow-hidden sm:max-w-xl'>
          <form className='flex min-h-0 flex-col gap-5' onSubmit={handleCreateBrand}>
            <DialogHeader className='shrink-0'>
              <DialogTitle>Create client workspace</DialogTitle>
              <DialogDescription>
                This creates an isolated brand context for creators, campaigns, Shopify, billing, and integration credentials.
              </DialogDescription>
            </DialogHeader>
            <div className='grid min-h-0 gap-4 overflow-y-auto pr-1 sm:grid-cols-2'>
              <div className='space-y-2 sm:col-span-2'>
                <Label htmlFor='workspace-name'>Brand name</Label>
                <Input id='workspace-name' value={formValues.name} onChange={(event) => updateFormValue('name', event.target.value)} placeholder='Acme Wellness' />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='workspace-niche'>Niche</Label>
                <Input id='workspace-niche' value={formValues.niche} onChange={(event) => updateFormValue('niche', event.target.value)} placeholder='Skincare, wellness, fashion' />
              </div>
              <div className='space-y-2 sm:col-span-2'>
                <Label htmlFor='workspace-audience'>Target audience</Label>
                <Input id='workspace-audience' value={formValues.target_audience} onChange={(event) => updateFormValue('target_audience', event.target.value)} placeholder='Women 25-45, clean beauty buyers' />
              </div>
              <div className='space-y-2 sm:col-span-2'>
                <Label htmlFor='workspace-products'>Product focus</Label>
                <Input id='workspace-products' value={formValues.product_focus} onChange={(event) => updateFormValue('product_focus', event.target.value)} placeholder='Hero products, bundles, starter kits' />
              </div>
              {formValidationError && (
                <p className='break-words text-sm text-muted-foreground sm:col-span-2'>
                  {formValidationError}
                </p>
              )}
            </div>
            <DialogFooter className='shrink-0'>
              <Button type='button' variant='outline' className='min-h-11' onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type='submit' className='min-h-11 gap-2' disabled={creating || Boolean(formValidationError)}>
                {creating ? <Icons.spinner className='size-4 animate-spin' /> : <Icons.add className='size-4' />}
                {creating ? 'Creating...' : 'Create workspace'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
