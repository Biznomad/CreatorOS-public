'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import { useEffectiveBrandId } from '@/hooks/use-effective-brand';
import { withLocalQaMarker } from '@/lib/whitelabel-api';

const API_BASE = '/api/proxy';

type ShipmentStage = 'ordered' | 'shipped' | 'delivered' | 'content_pending' | 'content_received';

interface Shipment {
  id: string;
  handle: string;
  display_name: string;
  avatar_url: string;
  products: string;
  discount_code: string;
  tracking_number?: string;
  carrier?: string;
  stage: ShipmentStage;
  created_at: string;
}

type ShipmentRow = Partial<Shipment> & {
  id?: string | number;
  status?: ShipmentStage;
};

type CreatorOption = {
  id: string;
  handle: string;
  display_name?: string;
  score?: number;
  status?: string;
};

type ProductVariantOption = {
  id: string;
  productTitle: string;
  title: string;
  price?: string;
  inventoryQuantity?: number;
  inventory_quantity?: number;
};

const PIPELINE_STAGES: { key: ShipmentStage; label: string; color: string; badgeClass: string }[] = [
  {
    key: 'ordered',
    label: 'Ordered',
    color: 'border-blue-200 dark:border-blue-800',
    badgeClass: 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300'
  },
  {
    key: 'shipped',
    label: 'Shipped',
    color: 'border-orange-200 dark:border-orange-800',
    badgeClass: 'bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300'
  },
  {
    key: 'delivered',
    label: 'Delivered',
    color: 'border-green-200 dark:border-green-800',
    badgeClass: 'bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-300'
  },
  {
    key: 'content_pending',
    label: 'Content Pending',
    color: 'border-yellow-200 dark:border-yellow-800',
    badgeClass: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/50 dark:text-yellow-300'
  },
  {
    key: 'content_received',
    label: 'Content Received',
    color: 'border-purple-200 dark:border-purple-800',
    badgeClass: 'bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300'
  }
];

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

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

function ShipmentCard({ shipment, onUpdate }: { shipment: Shipment; onUpdate: (shipment: Shipment) => void }) {
  return (
    <div className='flex flex-col gap-3 rounded-lg border bg-card p-3 text-sm shadow-sm'>
      <div className='flex items-center gap-2'>
        <Avatar className='size-7 shrink-0'>
          <AvatarImage src={shipment.avatar_url} alt={shipment.display_name} />
          <AvatarFallback className='text-[10px]'>{getInitials(shipment.display_name || shipment.handle)}</AvatarFallback>
        </Avatar>
        <div className='min-w-0 flex-1'>
          <p className='truncate text-xs font-semibold'>@{shipment.handle}</p>
          <p className='text-muted-foreground truncate text-[10px]'>{shipment.display_name}</p>
        </div>
      </div>
      {shipment.products && (
        <p className='text-muted-foreground line-clamp-2 text-xs'>{shipment.products}</p>
      )}
      <div className='space-y-1'>
        {shipment.discount_code && (
          <div className='flex items-center gap-1 text-[10px]'>
            <Icons.badgeCheck className='text-muted-foreground size-3 shrink-0' />
            <span className='text-muted-foreground'>Code:</span>
            <span className='font-mono font-medium'>{shipment.discount_code}</span>
          </div>
        )}
        {shipment.tracking_number && (
          <div className='flex items-center gap-1 text-[10px]'>
            <Icons.product className='text-muted-foreground size-3 shrink-0' />
            <span className='text-muted-foreground'>Tracking:</span>
            <span className='truncate font-mono font-medium'>{shipment.tracking_number}</span>
          </div>
        )}
        {shipment.carrier && (
          <div className='flex items-center gap-1 text-[10px]'>
            <Icons.send className='text-muted-foreground size-3 shrink-0' />
            <span className='text-muted-foreground'>Carrier:</span>
            <span className='truncate font-medium'>{shipment.carrier}</span>
          </div>
        )}
      </div>
      <Button
        aria-label={`Update shipment for @${shipment.handle}`}
        size='sm'
        variant='outline'
        className='min-h-11 gap-1.5 text-xs'
        onClick={() => onUpdate(shipment)}
      >
        <Icons.edit className='size-3' />
        Update
      </Button>
    </div>
  );
}

export default function GiftingPage() {
  const activeBrandId = useEffectiveBrandId();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [creators, setCreators] = useState<CreatorOption[]>([]);
  const [creatorPickerMode, setCreatorPickerMode] = useState<'onboarded' | 'top_scored'>('onboarded');
  const [variants, setVariants] = useState<ProductVariantOption[]>([]);
  const [shipmentsError, setShipmentsError] = useState('');
  const [productsError, setProductsError] = useState('');
  const [productsLoading, setProductsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creatorId, setCreatorId] = useState('');
  const [selectedVariantId, setSelectedVariantId] = useState('');
  const [customVariantId, setCustomVariantId] = useState('');
  const [creating, setCreating] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const [nextStage, setNextStage] = useState<ShipmentStage>('ordered');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [carrier, setCarrier] = useState('');
  const [updating, setUpdating] = useState(false);
  const [pendingShipmentCreate, setPendingShipmentCreate] = useState(false);
  const [pendingShipmentUpdate, setPendingShipmentUpdate] = useState(false);
  const previewRequestInFlightRef = useRef(false);

  const fetchShipments = useCallback(async () => {
    if (!activeBrandId) {
      setShipments([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setShipmentsError('');
    try {
      const res = await fetch(withLocalQaMarker(`${API_BASE}/api/shipments?brand_id=${encodeURIComponent(activeBrandId)}`));
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || data.error || `Shipments unavailable (${res.status})`);
      const rows = (Array.isArray(data) ? data : (data.shipments || [])) as ShipmentRow[];
      setShipments(
        rows.map((r) => ({
          id: String(r.id),
          handle: r.handle || '',
          display_name: r.display_name || r.handle || '',
          avatar_url: r.avatar_url || '',
          products: typeof r.products === 'string' ? r.products : JSON.stringify(r.products || []),
          discount_code: r.discount_code || '',
          tracking_number: r.tracking_number || '',
          carrier: typeof r.carrier === 'string' ? r.carrier : '',
          stage: r.status || r.stage || 'ordered',
          created_at: r.created_at || ''
        }))
      );
    } catch (error) {
      setShipments([]);
      setShipmentsError(error instanceof Error ? error.message : 'Shipments unavailable');
    } finally {
      setLoading(false);
    }
  }, [activeBrandId]);

  useEffect(() => {
    fetchShipments();
  }, [fetchShipments]);

  async function fetchCreators() {
    if (!activeBrandId) {
      setCreators([]);
      setCreatorId('');
      setCreatorPickerMode('onboarded');
      return;
    }
    try {
      const res = await fetch(withLocalQaMarker(`${API_BASE}/api/creators?brand_id=${encodeURIComponent(activeBrandId)}&limit=100&status=onboarded`));
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json().catch(() => ({}));
      let rows = (Array.isArray(data) ? data : (data.creators || [])) as CreatorOption[];
      let pickerMode: 'onboarded' | 'top_scored' = 'onboarded';
      if (rows.length === 0) {
        const fallbackRes = await fetch(withLocalQaMarker(`${API_BASE}/api/creators?brand_id=${encodeURIComponent(activeBrandId)}&limit=100&min_score=50`));
        if (!fallbackRes.ok) throw new Error(`${fallbackRes.status}`);
        const fallbackData = await fallbackRes.json().catch(() => ({}));
        rows = (Array.isArray(fallbackData) ? fallbackData : (fallbackData.creators || [])) as CreatorOption[];
        pickerMode = 'top_scored';
      }
      setCreatorPickerMode(pickerMode);
      setCreators(rows);
      if (!rows.some((creator) => creator.id === creatorId)) {
        setCreatorId(rows[0]?.id || '');
      }
    } catch {
      setCreators([]);
      setCreatorId('');
      setCreatorPickerMode('onboarded');
    }
  }

  async function fetchProducts() {
    if (!activeBrandId) {
      setVariants([]);
      setSelectedVariantId('');
      setProductsError('');
      return;
    }
    setProductsLoading(true);
    setProductsError('');
    try {
      const res = await fetch(withLocalQaMarker(`${API_BASE}/api/brands/${encodeURIComponent(activeBrandId)}/shopify/products?limit=30`));
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || data.error || `Shopify products unavailable (${res.status})`);
      const products = Array.isArray(data.products) ? data.products : [];
      const nextVariants: ProductVariantOption[] = products.flatMap((product: { title?: string; variants?: ProductVariantOption[] }) =>
        (Array.isArray(product.variants) ? product.variants : []).map((variant) => ({
          id: variant.id,
          productTitle: product.title || 'Product',
          title: variant.title || 'Default',
          price: variant.price,
          inventoryQuantity: variant.inventoryQuantity ?? variant.inventory_quantity
        }))
      );
      setVariants(nextVariants);
      if (!nextVariants.some((variant) => variant.id === selectedVariantId)) {
        setSelectedVariantId(nextVariants[0]?.id || '');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Shopify products unavailable';
      setProductsError(message);
      if (!isShopifySetupError(message)) toast.error(message);
      setVariants([]);
      setSelectedVariantId('');
    } finally {
      setProductsLoading(false);
    }
  }

  function handleCreateShipment() {
    if (!activeBrandId) {
      toast.error('Select a client brand before creating shipments.');
      return;
    }
    setDialogOpen(true);
    fetchCreators();
    fetchProducts();
  }

  function getSelectedVariantIds() {
    const product_variant_ids = [
      selectedVariantId,
      ...customVariantId
        .split(/[,\n]/)
        .map((value) => value.trim())
    ]
      .map((value) => value.trim())
      .filter(Boolean);
    return Array.from(new Set(product_variant_ids));
  }

  function validateShipmentCreation() {
    if (!activeBrandId) {
      toast.error('Select a client brand before creating shipments.');
      return null;
    }
    const product_variant_ids = getSelectedVariantIds();
    if (!creatorId) {
      toast.error('Select a creator first.');
      return null;
    }
    if (productsError && isShopifySetupError(productsError)) {
      toast.error('Connect Shopify before creating gift shipments.');
      return null;
    }
    if (!product_variant_ids.length) {
      toast.error('Add at least one Shopify variant ID.');
      return null;
    }
    return product_variant_ids;
  }

  async function previewShipment() {
    if (previewRequestInFlightRef.current) return;
    const product_variant_ids = validateShipmentCreation();
    if (!activeBrandId || !product_variant_ids) return;

    previewRequestInFlightRef.current = true;
    setPreviewing(true);
    try {
      const response = await fetch(withLocalQaMarker(`${API_BASE}/api/shipments`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand_id: activeBrandId,
          creator_id: creatorId,
          product_variant_ids,
          dry_run: true
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.detail || data.error || 'Shipment preview failed');
      const itemCount = Array.isArray(data.line_items) ? data.line_items.length : product_variant_ids.length;
      toast.success(`Dry run ready: ${itemCount} item(s) would be gifted from ${data.store || 'Shopify'}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Shipment preview failed');
    } finally {
      previewRequestInFlightRef.current = false;
      setPreviewing(false);
    }
  }

  async function submitShipment() {
    const product_variant_ids = validateShipmentCreation();
    if (!activeBrandId || !product_variant_ids) return;

    setCreating(true);
    try {
      const response = await fetch(withLocalQaMarker(`${API_BASE}/api/shipments`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand_id: activeBrandId,
          creator_id: creatorId,
          product_variant_ids
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.detail || data.error || 'Shipment creation failed');
      toast.success('Shipment created and added to the gifting pipeline.');
      setDialogOpen(false);
      setCustomVariantId('');
      await fetchShipments();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Shipment creation failed');
    } finally {
      setPendingShipmentCreate(false);
      setCreating(false);
    }
  }

  function requestShipmentCreation() {
    const productVariantIds = validateShipmentCreation();
    if (!productVariantIds) return;
    setPendingShipmentCreate(true);
  }

  function openUpdateDialog(shipment: Shipment) {
    setSelectedShipment(shipment);
    setNextStage(shipment.stage);
    setTrackingNumber(shipment.tracking_number || '');
    setCarrier(shipment.carrier || '');
    setUpdateDialogOpen(true);
  }

  async function submitShipmentUpdate() {
    if (!activeBrandId) {
      toast.error('Select a client brand before updating shipments.');
      return;
    }
    if (!selectedShipment) return;
    setUpdating(true);
    try {
      const response = await fetch(withLocalQaMarker(`${API_BASE}/api/shipments/${selectedShipment.id}?brand_id=${encodeURIComponent(activeBrandId)}`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand_id: activeBrandId,
          status: nextStage,
          tracking_number: trackingNumber.trim() || undefined,
          carrier: carrier.trim() || undefined
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.detail || data.error || 'Shipment update failed');
      setUpdateDialogOpen(false);
      await fetchShipments();
      toast.success('Shipment updated.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Shipment update failed');
    } finally {
      setPendingShipmentUpdate(false);
      setUpdating(false);
    }
  }

  function requestShipmentUpdate() {
    if (!activeBrandId) {
      toast.error('Select a client brand before updating shipments.');
      return;
    }
    if (!selectedShipment) return;
    setPendingShipmentUpdate(true);
  }

  const needsShopifySetup = Boolean(activeBrandId && productsError && isShopifySetupError(productsError));
  const selectedCreator = creators.find((creator) => creator.id === creatorId);
  const selectedVariant = variants.find((variant) => variant.id === selectedVariantId);
  const selectedVariantCount = getSelectedVariantIds().length;

  const confirmationDialogs = (
    <>
      <AlertDialog open={pendingShipmentCreate} onOpenChange={setPendingShipmentCreate}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Create gift shipment?</AlertDialogTitle>
            <AlertDialogDescription>
              CreatorOS will create a Shopify draft order and add this gift to the shipment pipeline for @{selectedCreator?.handle || 'the selected creator'}.
              {selectedVariant ? ` Primary item: ${selectedVariant.productTitle} - ${selectedVariant.title}.` : ''}
              {selectedVariantCount > 1 ? ` ${selectedVariantCount} variants will be included.` : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className='min-h-11' disabled={creating}>Cancel</AlertDialogCancel>
            <AlertDialogAction className='min-h-11' onClick={() => void submitShipment()} disabled={creating}>
              Create shipment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={pendingShipmentUpdate} onOpenChange={setPendingShipmentUpdate}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Save shipment update?</AlertDialogTitle>
            <AlertDialogDescription>
              This will move @{selectedShipment?.handle || 'the selected creator'} to {PIPELINE_STAGES.find((stage) => stage.key === nextStage)?.label || nextStage}
              {trackingNumber.trim() ? ` with tracking number ${trackingNumber.trim()}` : ''}{carrier.trim() ? ` via ${carrier.trim()}` : ''}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className='min-h-11' disabled={updating}>Cancel</AlertDialogCancel>
            <AlertDialogAction className='min-h-11' onClick={() => void submitShipmentUpdate()} disabled={updating}>
              Save update
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );

  const createShipmentDialog = (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogContent className='flex max-h-[calc(100dvh-2rem)] max-w-[calc(100vw-2rem)] flex-col overflow-hidden sm:max-w-lg'>
        <DialogHeader className='shrink-0'>
          <DialogTitle>Create Shipment</DialogTitle>
          <DialogDescription>
            Create a Shopify draft order and creator discount code, then track the gift in this pipeline.
          </DialogDescription>
        </DialogHeader>
        <div className='grid min-h-0 min-w-0 gap-4 overflow-y-auto py-2 pr-1'>
          {needsShopifySetup && (
            <Alert>
              <Icons.info className='size-4' />
              <AlertTitle>Connect Shopify to create shipments</AlertTitle>
              <AlertDescription>
                Install or reconnect the Shopify app before CreatorOS can load product variants and create draft gift orders.
              </AlertDescription>
            </Alert>
          )}
          {!needsShopifySetup && creatorPickerMode === 'top_scored' && creators.length > 0 && (
            <Alert>
              <Icons.info className='size-4' />
              <AlertTitle>No onboarded creators yet</AlertTitle>
              <AlertDescription>
                Showing top scored creators so Shopify gift dry runs and draft orders can still be prepared for this workspace.
              </AlertDescription>
            </Alert>
          )}
          <div className='grid min-w-0 gap-2'>
            <Label htmlFor='shipment-creator'>Creator</Label>
            <Select value={creatorId} onValueChange={setCreatorId}>
              <SelectTrigger id='shipment-creator' aria-label='Select creator for gift shipment' className='min-h-11 w-full min-w-0 [&>span]:truncate'>
                <SelectValue placeholder={creators.length ? 'Select creator' : 'No onboarded creators'} />
              </SelectTrigger>
              <SelectContent>
                {creators.map((creator) => (
                  <SelectItem key={creator.id} value={creator.id}>
                    @{creator.handle} {creator.score ? `- ${creator.score}` : ''}{creator.status && creator.status !== 'onboarded' ? ` (${creator.status})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className='grid min-w-0 gap-2'>
            <Label htmlFor='shipment-variant'>Shopify product variant</Label>
            <Select value={selectedVariantId} onValueChange={setSelectedVariantId}>
              <SelectTrigger id='shipment-variant' aria-label='Select Shopify product variant for gift shipment' className='min-h-11 w-full min-w-0 [&>span]:truncate'>
                <SelectValue
                  placeholder={
                    productsLoading
                      ? 'Loading Shopify products'
                      : needsShopifySetup
                        ? 'Shopify connection required'
                        : variants.length
                          ? 'Select product variant'
                          : 'No Shopify products loaded'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {variants.map((variant) => (
                  <SelectItem key={variant.id} value={variant.id}>
                    {variant.productTitle} - {variant.title}
                    {typeof variant.inventoryQuantity === 'number' ? ` (${variant.inventoryQuantity} available)` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className='grid min-w-0 gap-2'>
            <Label htmlFor='shipment-custom-variants'>Additional variant IDs</Label>
            <Input
              id='shipment-custom-variants'
              className='min-h-11'
              value={customVariantId}
              onChange={(event) => setCustomVariantId(event.target.value)}
              placeholder='Optional: gid://shopify/ProductVariant/123'
            />
            <p className='text-muted-foreground text-xs'>Use only when a variant is not listed above. Separate multiples with commas or new lines.</p>
          </div>
        </div>
        <DialogFooter className='shrink-0'>
          <Button aria-label='Cancel shipment creation' variant='outline' className='min-h-11' onClick={() => setDialogOpen(false)} disabled={creating || previewing}>
            Cancel
          </Button>
          {needsShopifySetup ? (
            <Button asChild className='min-h-11'>
              <Link aria-label='Connect Shopify before creating gift shipments' href='/dashboard/integrations'>
                <Icons.settings className='mr-2 size-4' />
                Connect Shopify
              </Link>
            </Button>
          ) : (
            <>
              <button
                type='button'
                aria-label='Preview Shopify gift shipment dry run'
                data-testid='shipment-dry-run'
                className={cn(buttonVariants({ variant: 'outline' }), 'min-h-11')}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  void previewShipment();
                }}
                onPointerDown={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  void previewShipment();
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    event.stopPropagation();
                    void previewShipment();
                  }
                }}
                disabled={creating || previewing || productsLoading || !creatorId}
              >
                {previewing && <Icons.spinner className='mr-2 size-4 animate-spin' />}
                Dry Run
              </button>
              <Button
                aria-label='Create Shopify gift shipment'
                className='min-h-11'
                onClick={requestShipmentCreation}
                disabled={creating || previewing || productsLoading || !creatorId}
              >
                {creating && <Icons.spinner className='mr-2 size-4 animate-spin' />}
                Create Shipment
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  const updateShipmentDialog = (
    <Dialog open={updateDialogOpen} onOpenChange={setUpdateDialogOpen}>
      <DialogContent className='flex max-h-[calc(100dvh-2rem)] max-w-[calc(100vw-2rem)] flex-col overflow-hidden sm:max-w-lg'>
        <DialogHeader className='shrink-0'>
          <DialogTitle>Update Shipment</DialogTitle>
          <DialogDescription>
            Move @{selectedShipment?.handle || 'creator'} through the gifting pipeline and add tracking details.
          </DialogDescription>
        </DialogHeader>
        <div className='grid min-h-0 min-w-0 gap-4 overflow-y-auto py-2 pr-1'>
          <div className='grid min-w-0 gap-2'>
            <Label htmlFor='shipment-status'>Pipeline stage</Label>
            <Select value={nextStage} onValueChange={(value) => setNextStage(value as ShipmentStage)}>
              <SelectTrigger id='shipment-status' aria-label='Select shipment pipeline stage' className='min-h-11 w-full min-w-0 [&>span]:truncate'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PIPELINE_STAGES.map((stage) => (
                  <SelectItem key={stage.key} value={stage.key}>
                    {stage.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className='grid min-w-0 gap-2'>
            <Label htmlFor='shipment-tracking'>Tracking number</Label>
            <Input
              id='shipment-tracking'
              className='min-h-11'
              value={trackingNumber}
              onChange={(event) => setTrackingNumber(event.target.value)}
              placeholder='Tracking number'
            />
          </div>
          <div className='grid min-w-0 gap-2'>
            <Label htmlFor='shipment-carrier'>Carrier</Label>
            <Input
              id='shipment-carrier'
              className='min-h-11'
              value={carrier}
              onChange={(event) => setCarrier(event.target.value)}
              placeholder='UPS, USPS, FedEx'
            />
          </div>
        </div>
        <DialogFooter className='shrink-0'>
          <Button aria-label='Cancel shipment update' variant='outline' className='min-h-11' onClick={() => setUpdateDialogOpen(false)} disabled={updating}>
            Cancel
          </Button>
          <Button aria-label='Save shipment tracking update' className='min-h-11' onClick={requestShipmentUpdate} disabled={updating || !selectedShipment}>
            {updating && <Icons.spinner className='mr-2 size-4 animate-spin' />}
            Save Update
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  if (loading) {
    return (
      <>
        {confirmationDialogs}
        {createShipmentDialog}
        {updateShipmentDialog}
        <div className='grid grid-cols-2 gap-4 lg:grid-cols-4'>
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className='animate-pulse'>
              <CardContent className='p-4'>
                <div className='bg-muted h-8 w-16 rounded' />
                <div className='bg-muted mt-2 h-3 w-24 rounded' />
              </CardContent>
            </Card>
          ))}
        </div>
      </>
    );
  }

  if (shipments.length === 0) {
    return (
      <div className='flex flex-col gap-6'>
        {confirmationDialogs}
        {createShipmentDialog}
        {updateShipmentDialog}
        <div className='grid grid-cols-2 gap-4 lg:grid-cols-4'>
          {[
            { label: 'Total Gifts Sent', value: '0' },
            { label: 'Pending Content', value: '0' },
            { label: 'Active Discount Codes', value: '0' },
            { label: 'Gift Value This Month', value: '$0' }
          ].map((stat) => (
            <Card key={stat.label}>
              <CardContent className='flex items-center gap-3 p-4'>
                <div className='bg-primary/10 flex size-9 shrink-0 items-center justify-center rounded-lg'>
                  <Icons.product className='text-primary size-5' />
                </div>
                <div>
                  <p className='text-2xl font-bold tabular-nums'>{stat.value}</p>
                  <p className='text-muted-foreground text-xs'>{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        {shipmentsError && (
          <Alert variant='destructive'>
            <Icons.warning className='size-4' />
            <AlertTitle>Shipments unavailable</AlertTitle>
            <AlertDescription className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
              <span className='min-w-0 break-words'>{shipmentsError}</span>
              <Button
                type='button'
                variant='outline'
                size='sm'
                className='min-h-11 w-full shrink-0 sm:w-auto'
                aria-label='Retry gift shipments load'
                onClick={() => void fetchShipments()}
              >
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}
        <div className='flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center'>
          <Icons.product className='text-muted-foreground mx-auto mb-3 h-8 w-8' />
          <h3 className='text-base font-medium'>No shipments yet</h3>
          <p className='text-muted-foreground mt-1 text-sm'>
            Create gift orders for onboarded creators to start tracking shipments.
          </p>
          <div className='mt-4 flex flex-wrap justify-center gap-2'>
            <Button
              aria-label='Create first Shopify gift shipment'
              className='min-h-11 gap-1.5'
              size='sm'
              onClick={handleCreateShipment}
            >
              <Icons.add className='size-3.5' />
              Create Shipment
            </Button>
            <Button asChild variant='outline' size='sm' className='min-h-11 gap-1.5'>
              <Link aria-label='Open integrations to set up Shopify gifting' href='/dashboard/integrations'>
                <Icons.settings className='size-3.5' />
                Shopify setup
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='flex flex-col gap-6'>
      {confirmationDialogs}
      {createShipmentDialog}
      {updateShipmentDialog}
      <div className='grid grid-cols-2 gap-4 lg:grid-cols-4'>
        {[
          { label: 'Total Gifts Sent', value: String(shipments.length), icon: Icons.product },
          { label: 'Pending Content', value: String(shipments.filter((s) => s.stage === 'content_pending').length), icon: Icons.clock },
          { label: 'Delivered', value: String(shipments.filter((s) => s.stage === 'delivered').length), icon: Icons.badgeCheck },
          { label: 'Content Received', value: String(shipments.filter((s) => s.stage === 'content_received').length), icon: Icons.trendingUp }
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className='flex items-center gap-3 p-4'>
              <div className='bg-primary/10 flex size-9 shrink-0 items-center justify-center rounded-lg'>
                <stat.icon className='text-primary size-5' />
              </div>
              <div>
                <p className='text-2xl font-bold tabular-nums'>{stat.value}</p>
                <p className='text-muted-foreground text-xs'>{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className='flex flex-row items-center justify-between pb-4'>
          <CardTitle className='flex items-center gap-2 text-base'>
            <Icons.kanban className='text-primary size-4' />
            Shipments Pipeline
          </CardTitle>
          <Button
            aria-label='Create Shopify gift shipment from pipeline'
            size='sm'
            className='min-h-11 gap-1.5'
            onClick={handleCreateShipment}
          >
            <Icons.add className='size-3.5' />
            Create Shipment
          </Button>
        </CardHeader>
        <CardContent className='p-0 pb-4'>
          <div className='flex gap-0 overflow-x-auto px-4'>
            {PIPELINE_STAGES.map((stage, idx) => {
              const stageShipments = shipments.filter((s) => s.stage === stage.key);
              return (
                <div
                  key={stage.key}
                  className={cn(
                    'flex min-w-[200px] flex-1 flex-col gap-2',
                    idx < PIPELINE_STAGES.length - 1 && 'mr-3 border-r pr-3'
                  )}
                >
                  <div className='flex items-center justify-between pb-2'>
                    <span className='text-xs font-semibold uppercase tracking-wide'>
                      {stage.label}
                    </span>
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-xs font-bold tabular-nums',
                        stage.badgeClass
                      )}
                    >
                      {stageShipments.length}
                    </span>
                  </div>
                  <div className='flex flex-col gap-2'>
                    {stageShipments.length > 0 ? (
                      stageShipments.map((shipment) => (
                        <ShipmentCard key={shipment.id} shipment={shipment} onUpdate={openUpdateDialog} />
                      ))
                    ) : (
                      <div className='flex h-20 items-center justify-center rounded-lg border border-dashed'>
                        <span className='text-muted-foreground text-xs'>Empty</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
