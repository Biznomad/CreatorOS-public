'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import PageContainer from '@/components/layout/page-container';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { Icons } from '@/components/icons';
import { toast } from 'sonner';
import { useEffectiveBrandId } from '@/hooks/use-effective-brand';
import { withLocalQaMarker } from '@/lib/whitelabel-api';

type BillingStatus = {
  ok?: boolean;
  connected?: boolean;
  store?: string;
  current_plan?: string | null;
  test_mode?: boolean;
  active_subscriptions?: Array<{
    id: string;
    name: string;
    status: string;
    test?: boolean;
    currentPeriodEnd?: string;
  }>;
};

const plans = [
  {
    key: 'growth',
    name: 'Growth',
    price: '$199',
    period: '/mo',
    badge: '',
    features: [
      'Up to 3 brands',
      'Unlimited creators',
      'AI discovery & scoring',
      'Smart outreach engine',
      'Kanban pipeline',
      'Basic analytics',
      'Email support'
    ],
    cta: 'Start Growth'
  },
  {
    key: 'scale',
    name: 'Scale',
    price: '$499',
    period: '/mo',
    badge: 'Most Popular',
    features: [
      'Up to 10 brands',
      'Unlimited creators',
      'Everything in Growth',
      'Whitelisted ad tracking & ROAS',
      'Shopify reactivation pipeline',
      'Product gifting automation',
      'Milestone rewards engine',
      'Priority Slack support'
    ],
    cta: 'Upgrade'
  },
  {
    key: 'agency',
    name: 'Agency',
    price: '$999',
    period: '/mo',
    badge: 'White-Label',
    features: [
      'Unlimited brands',
      'Unlimited creators',
      'Everything in Scale',
      'White-label dashboard',
      'Client self-serve portal',
      'Custom domain & branding',
      'Full REST API access',
      'Dedicated account manager'
    ],
    cta: 'Start Agency'
  }
];

function isShopifySetupError(message: string) {
  const normalized = message.toLowerCase();
  return (
    normalized.includes('shopify admin api access token required') ||
    normalized.includes('connect a shopify store') ||
    normalized.includes('shopify store does not match') ||
    normalized.includes('connected shopify credentials belong to a different store')
  );
}

export default function BillingPage() {
  const activeBrandId = useEffectiveBrandId();
  const [billingStatus, setBillingStatus] = useState<BillingStatus | null>(null);
  const [billingError, setBillingError] = useState('');
  const [loading, setLoading] = useState(true);
  const [upgradingPlan, setUpgradingPlan] = useState<string | null>(null);
  const [previewingPlan, setPreviewingPlan] = useState<string | null>(null);
  const [pendingPlanChange, setPendingPlanChange] = useState<string | null>(null);

  useEffect(() => {
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
        const data = await response.json();
        if (!response.ok) throw new Error(data.detail || data.error || 'Billing unavailable');
        setBillingStatus(data);
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : 'Billing unavailable';
        setBillingStatus(null);
        setBillingError(message);
        if (!isShopifySetupError(message)) toast.error(message);
      })
      .finally(() => setLoading(false));
  }, [activeBrandId]);

  async function handleUpgrade(planKey: string) {
    if (!activeBrandId) {
      toast.error('Select a client workspace before changing plans.');
      return;
    }
    setUpgradingPlan(planKey);
    try {
      const response = await fetch(withLocalQaMarker(`/api/proxy/api/brands/${encodeURIComponent(activeBrandId)}/billing/subscribe`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: planKey,
          return_url: `${window.location.origin}/dashboard/billing?billing=approved&plan=${planKey}`
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || data.error || 'Shopify billing failed');
      if (data.confirmation_url) {
        window.location.assign(data.confirmation_url);
        return;
      }
      toast.success('Shopify billing subscription created.');
      setBillingStatus((current) => ({ ...current, current_plan: planKey }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Shopify billing failed');
    } finally {
      setUpgradingPlan(null);
      setPendingPlanChange(null);
    }
  }

  function requestUpgrade(planKey: string) {
    if (!activeBrandId) {
      toast.error('Select a client workspace before changing plans.');
      return;
    }
    if (needsShopifySetup) {
      toast.error('Connect Shopify before approving or changing subscription plans.');
      return;
    }
    setPendingPlanChange(planKey);
  }

  async function handlePreviewUpgrade(planKey: string) {
    if (!activeBrandId) {
      toast.error('Select a client workspace before previewing billing.');
      return;
    }
    setPreviewingPlan(planKey);
    try {
      const response = await fetch(withLocalQaMarker(`/api/proxy/api/brands/${encodeURIComponent(activeBrandId)}/billing/subscribe`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: planKey,
          return_url: `${window.location.origin}/dashboard/billing?billing=approved&plan=${planKey}`,
          dry_run: true
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || data.error || 'Shopify billing dry run failed');
      const preview = data.subscription_preview || {};
      toast.success(`Dry run ready: ${preview.name || planKey} at $${Number(preview.amount || 0).toLocaleString()}/${preview.interval === 'EVERY_30_DAYS' ? 'mo' : 'period'} on ${data.store}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Shopify billing dry run failed');
    } finally {
      setPreviewingPlan(null);
    }
  }

  const currentPlan = billingStatus?.current_plan ?? null;
  const subscription = billingStatus?.active_subscriptions?.find((item) => item.status === 'ACTIVE');
  const needsShopifySetup = Boolean(activeBrandId && billingError && isShopifySetupError(billingError));
  const pendingPlan = plans.find((plan) => plan.key === pendingPlanChange);

  return (
    <PageContainer
      pageTitle='Billing & Plans'
      pageDescription='Manage your subscription and usage limits.'
    >
      <div className='space-y-6'>
        <AlertDialog open={Boolean(pendingPlanChange)} onOpenChange={(open) => !open && setPendingPlanChange(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Start Shopify billing approval?</AlertDialogTitle>
              <AlertDialogDescription>
                CreatorOS will open Shopify subscription approval for the {pendingPlan?.name || 'selected'} plan. Use Dry Run first if you need a read-only billing check.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={upgradingPlan !== null}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                aria-label={`Confirm Shopify billing approval for ${pendingPlan?.name || 'selected plan'}`}
                disabled={!pendingPlanChange || upgradingPlan !== null}
                onClick={() => {
                  if (pendingPlanChange) void handleUpgrade(pendingPlanChange);
                }}
              >
                {upgradingPlan ? 'Starting...' : 'Open Shopify approval'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Card>
          <CardContent className='flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between'>
            <div className='flex items-center gap-3'>
              <div className='flex size-10 shrink-0 items-center justify-center rounded-md bg-emerald-500/10'>
                {loading ? (
                  <Icons.spinner className='size-5 animate-spin text-emerald-600' />
                ) : !activeBrandId ? (
                  <Icons.workspace className='size-5 text-emerald-600' />
                ) : (
                  <Icons.check className='size-5 text-emerald-600' />
                )}
              </div>
              <div>
                <p className='text-sm font-semibold'>
                  {!activeBrandId
                    ? 'Select a workspace'
                    : needsShopifySetup
                      ? 'Shopify billing setup required'
                    : billingStatus?.store
                      ? `Shopify billing connected to ${billingStatus.store}`
                      : 'Shopify billing'}
                </p>
                <p className='text-xs text-muted-foreground'>
                  {!activeBrandId
                    ? 'Choose a client brand before starting or changing a subscription.'
                    : needsShopifySetup
                    ? 'Connect Shopify before approving or changing subscription plans.'
                    : subscription
                    ? `${subscription.name} is ${subscription.status.toLowerCase()}${subscription.currentPeriodEnd ? ` through ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}` : ''}.`
                    : 'Select a plan to start Shopify subscription approval.'}
                </p>
              </div>
            </div>
            <div className='flex flex-wrap gap-2'>
              {!activeBrandId && (
                <Button asChild variant='outline' className='min-h-11 gap-2'>
                  <Link href='/dashboard/workspaces'>
                    <Icons.workspace className='size-4' />
                    Open workspaces
                  </Link>
                </Button>
              )}
              {needsShopifySetup && (
                <Button asChild variant='outline' className='min-h-11 gap-2'>
                  <Link href='/dashboard/shopify'>
                    <Icons.settings className='size-4' />
                    Connect Shopify
                  </Link>
                </Button>
              )}
              {billingStatus?.test_mode && <Badge variant='outline'>Test mode</Badge>}
            </div>
          </CardContent>
        </Card>

        {needsShopifySetup && (
          <Alert>
            <Icons.info className='size-4' />
            <AlertTitle>Shopify is required for billing approvals</AlertTitle>
            <AlertDescription>
              CreatorOS creates subscription approvals through the active brand&apos;s Shopify admin. Connect the store in the Shopify command center, then return here to choose or change a plan.
            </AlertDescription>
          </Alert>
        )}

        <div className='grid gap-6 md:grid-cols-3'>
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={
                currentPlan === plan.key
                  ? 'border-indigo-500 ring-2 ring-indigo-500/20'
                  : ''
              }
            >
              <CardHeader className='space-y-2'>
                <div className='flex items-center justify-between'>
                  <CardTitle className='text-lg'>{plan.name}</CardTitle>
                  {plan.badge && (
                    <Badge variant='secondary'>{plan.badge}</Badge>
                  )}
                </div>
                <div className='flex items-baseline gap-1'>
                  <span className='text-3xl font-bold'>{plan.price}</span>
                  <span className='text-sm text-muted-foreground'>
                    {plan.period}
                  </span>
                </div>
              </CardHeader>
              <CardContent className='space-y-4'>
                <ul className='space-y-2.5'>
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className='flex items-start gap-2 text-sm'
                    >
                      <Icons.check className='mt-0.5 size-4 shrink-0 text-indigo-500' />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <div className='grid gap-2'>
                  {currentPlan !== plan.key && (
                    <Button
                      className='min-h-11 w-full'
                      variant='outline'
                      aria-label={`Preview Shopify billing approval for ${plan.name}`}
                      disabled={loading || !activeBrandId || needsShopifySetup || upgradingPlan !== null || previewingPlan !== null}
                      onClick={() => handlePreviewUpgrade(plan.key)}
                    >
                      {previewingPlan === plan.key ? (
                        <Icons.spinner className='mr-2 size-4 animate-spin' />
                      ) : (
                        <Icons.checks className='mr-2 size-4' />
                      )}
                      Dry Run
                    </Button>
                  )}
                  <Button
                    className='min-h-11 w-full'
                    variant={currentPlan === plan.key ? 'outline' : 'default'}
                    aria-label={currentPlan === plan.key ? `${plan.name} is the current billing plan` : `Start Shopify billing approval for ${plan.name}`}
                    disabled={loading || !activeBrandId || needsShopifySetup || currentPlan === plan.key || upgradingPlan !== null || previewingPlan !== null}
                    onClick={() => requestUpgrade(plan.key)}
                  >
                    {upgradingPlan === plan.key ? (
                      <Icons.spinner className='mr-2 size-4 animate-spin' />
                    ) : null}
                    {currentPlan === plan.key ? 'Current Plan' : plan.cta}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardContent className='flex items-center gap-3 py-4'>
            <Icons.info className='size-5 shrink-0 text-muted-foreground' />
            <p className='text-sm text-muted-foreground'>
              All billing is handled through Shopify. When you upgrade, a
              recurring charge will be added to your Shopify account. You can
              manage or cancel your subscription at any time from your Shopify
              admin.
            </p>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
