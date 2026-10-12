'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Icons } from '@/components/icons';
import { useEffectiveBrand } from '@/hooks/use-effective-brand';
import { withLocalQaMarker } from '@/lib/whitelabel-api';
import { toast } from 'sonner';

type BillingStatus = {
  current_plan?: string | null;
  active_subscriptions?: Array<{ id: string; name: string; status: string }>;
  test_mode?: boolean;
  store?: string;
};

const planRank: Record<string, number> = {
  growth: 1,
  scale: 2,
  agency: 3
};

const exclusiveFeatures = [
  {
    title: 'Whitelisted ad command center',
    description: 'Import Meta ad performance, sync ROAS, and pause or activate creator ads from the campaigns table.',
    href: '/dashboard/campaigns',
    icon: 'trendingUp',
    minimumPlan: 'scale'
  },
  {
    title: 'Shopify customer activation',
    description: 'Preview customer matches, confirm import readiness, and generate a customer-to-creator activation plan.',
    href: '/dashboard/shopify',
    icon: 'product',
    minimumPlan: 'scale'
  },
  {
    title: 'Product gifting automation',
    description: 'Create Shopify draft-order gifts, track shipment stage, and prep creators for content deadlines.',
    href: '/dashboard/shipments',
    icon: 'product',
    minimumPlan: 'scale'
  },
  {
    title: 'Milestone rewards engine',
    description: 'Track creator milestones, rewards, payout readiness, and leaderboard momentum.',
    href: '/dashboard/milestones',
    icon: 'exclusive',
    minimumPlan: 'scale'
  },
  {
    title: 'White-label client operations',
    description: 'Manage isolated brand workspaces, team membership, credentials, and client launch readiness.',
    href: '/dashboard/workspaces',
    icon: 'workspace',
    minimumPlan: 'agency'
  },
  {
    title: 'Atlas launch copilot',
    description: 'Ask Atlas for launch blockers, integration actions, discovery suggestions, and next-best creator moves.',
    href: '/dashboard/agent',
    icon: 'agent',
    minimumPlan: 'agency'
  }
] as const;

function hasAccess(currentPlan: string, requiredPlan: string) {
  return (planRank[currentPlan] || 1) >= (planRank[requiredPlan] || 1);
}

function planLabel(plan: string) {
  return plan.charAt(0).toUpperCase() + plan.slice(1);
}

function isShopifySetupError(message: string) {
  const normalized = message.toLowerCase();
  return (
    normalized.includes('shopify admin api access token required') ||
    normalized.includes('connect a shopify store') ||
    normalized.includes('shopify store does not match') ||
    normalized.includes('connected shopify credentials belong to a different store')
  );
}

export function ExclusivePage() {
  const { brand: activeBrand, brandId: activeBrandId } = useEffectiveBrand();
  const activeBrandName = activeBrand.name;
  const [billingStatus, setBillingStatus] = useState<BillingStatus | null>(null);
  const [billingError, setBillingError] = useState('');
  const [loading, setLoading] = useState(true);

  const loadBillingStatus = useCallback(() => {
    if (!activeBrandId) {
      setBillingStatus(null);
      setBillingError('');
      setLoading(false);
      return;
    }
    setLoading(true);
    setBillingError('');
    fetch(withLocalQaMarker(`/api/proxy/api/brands/${encodeURIComponent(activeBrandId)}/billing/status`))
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.detail || payload.error || 'Billing status unavailable');
        setBillingStatus(payload);
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : 'Billing status unavailable';
        setBillingStatus(null);
        setBillingError(message);
        if (!isShopifySetupError(message)) toast.error(message);
      })
      .finally(() => setLoading(false));
  }, [activeBrandId]);

  useEffect(() => {
    loadBillingStatus();
  }, [loadBillingStatus]);

  const currentPlan = activeBrandId ? billingStatus?.current_plan || 'growth' : 'growth';
  const needsShopifySetup = Boolean(activeBrandId && billingError && isShopifySetupError(billingError));
  const unlockedCount = useMemo(
    () => activeBrandId && !needsShopifySetup ? exclusiveFeatures.filter((feature) => hasAccess(currentPlan, feature.minimumPlan)).length : 0,
    [activeBrandId, currentPlan, needsShopifySetup]
  );

  return (
    <div className='min-w-0 space-y-6 overflow-hidden'>
      <Card className='min-w-0 overflow-hidden'>
        <CardContent className='flex min-w-0 flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between'>
          <div className='flex min-w-0 items-start gap-3'>
            <div className='flex size-10 shrink-0 items-center justify-center rounded-md bg-indigo-500/10'>
              {loading ? <Icons.spinner className='size-5 animate-spin text-indigo-600' /> : <Icons.badgeCheck className='size-5 text-indigo-600' />}
            </div>
            <div className='min-w-0'>
              <p className='break-words text-sm font-semibold'>{activeBrandId ? `${activeBrandName} exclusive features` : 'Select a workspace'}</p>
              <p className='mt-1 break-words text-sm text-muted-foreground'>
                {needsShopifySetup
                  ? 'Connect Shopify before CreatorOS can verify plan access.'
                  : `Current plan: ${planLabel(currentPlan)}. ${unlockedCount} of ${exclusiveFeatures.length} advanced features are available.`}
              </p>
            </div>
          </div>
          <div className='flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap'>
            {billingStatus?.test_mode && <Badge variant='outline'>Billing test mode</Badge>}
            <Badge variant={needsShopifySetup || currentPlan === 'growth' ? 'secondary' : 'default'}>
              {needsShopifySetup ? 'Setup required' : planLabel(currentPlan)}
            </Badge>
            <Button asChild variant={currentPlan === 'growth' ? 'default' : 'outline'} className='min-h-11 min-w-0 gap-2'>
              <Link href={activeBrandId ? needsShopifySetup ? '/dashboard/integrations' : '/dashboard/billing' : '/dashboard/workspaces'}>
                {activeBrandId ? needsShopifySetup ? <Icons.settings className='size-4' /> : <Icons.creditCard className='size-4' /> : <Icons.workspace className='size-4' />}
                <span className='truncate'>{activeBrandId ? needsShopifySetup ? 'Connect Shopify' : 'Manage plan' : 'Open workspaces'}</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {needsShopifySetup && (
        <Alert>
          <Icons.info className='size-4' />
          <AlertTitle>Connect Shopify to verify plan access</AlertTitle>
          <AlertDescription className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
            <span>Exclusive workflows depend on the active brand&apos;s Shopify connection for billing, activation, gifting, and rewards. Add the Shopify Admin API token in integrations, then return here.</span>
            <Button
              aria-label='Retry exclusive feature access check'
              type='button'
              variant='outline'
              size='sm'
              className='min-h-11 w-full sm:w-auto'
              onClick={loadBillingStatus}
              disabled={loading}
            >
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {billingError && !needsShopifySetup && (
        <Alert variant='destructive'>
          <Icons.warning className='size-4' />
          <AlertTitle>Exclusive feature access unavailable</AlertTitle>
          <AlertDescription className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
            <span>{billingError}</span>
            <Button
              aria-label='Retry exclusive feature access check'
              type='button'
              variant='outline'
              size='sm'
              className='min-h-11 w-full sm:w-auto'
              onClick={loadBillingStatus}
              disabled={loading}
            >
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {!needsShopifySetup && currentPlan === 'growth' && (
        <Alert>
          <Icons.info className='size-4' />
          <AlertTitle>Scale unlocks paid activation workflows</AlertTitle>
          <AlertDescription>
            Upgrade to Scale for whitelisted ad reporting, Shopify activation, gifting automation, and milestone rewards. Agency adds white-label workspace operations and Atlas launch command.
          </AlertDescription>
        </Alert>
      )}

      <div className='grid gap-4 lg:grid-cols-2'>
        {exclusiveFeatures.map((feature) => {
          const accessible = Boolean(activeBrandId) && !needsShopifySetup && hasAccess(currentPlan, feature.minimumPlan);
          const Icon = Icons[feature.icon];
          return (
            <Card key={feature.title} className={accessible ? 'min-w-0 overflow-hidden' : 'min-w-0 overflow-hidden opacity-80'}>
              <CardHeader>
                <div className='flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
                  <div className='flex min-w-0 items-start gap-3'>
                    <div className='flex size-9 shrink-0 items-center justify-center rounded-md bg-muted'>
                      <Icon className='size-4 text-muted-foreground' />
                    </div>
                    <div className='min-w-0'>
                      <CardTitle className='break-words text-base'>{feature.title}</CardTitle>
                      <CardDescription className='mt-1 break-words'>{feature.description}</CardDescription>
                    </div>
                  </div>
                  <Badge variant={accessible ? 'default' : 'secondary'} className='w-fit shrink-0'>{accessible ? 'Unlocked' : `${planLabel(feature.minimumPlan)}+`}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <Button asChild variant={accessible ? 'default' : 'outline'} className='min-h-11 w-full min-w-0 gap-2 sm:w-auto'>
                  <Link href={accessible ? feature.href : activeBrandId ? needsShopifySetup ? '/dashboard/integrations' : '/dashboard/billing' : '/dashboard/workspaces'}>
                    {accessible ? <Icons.arrowRight className='size-4 shrink-0' /> : <Icons.lock className='size-4 shrink-0' />}
                    <span className='truncate'>{accessible ? 'Open feature' : activeBrandId ? needsShopifySetup ? 'Connect Shopify' : 'Upgrade to unlock' : 'Select workspace'}</span>
                  </Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
