'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Icons } from '@/components/icons';
import { useEffectiveBrand } from '@/hooks/use-effective-brand';
import { cn } from '@/lib/utils';
import { withLocalQaMarker } from '@/lib/whitelabel-api';

type ConnectionStage = 'connect' | 'verify' | 'preview' | 'activate';
type HealthState = 'pending' | 'ready' | 'warning';

type HealthCheck = {
  label: string;
  description: string;
  state: HealthState;
};
type PreviewSource = 'none' | 'backend' | 'fallback';
type PreviewMetric = {
  label: string;
  value: string;
  detail: string;
};
type PreviewCandidate = {
  email?: string;
  first_name?: string;
  last_name?: string;
  order_count?: number;
  total_spent?: number;
  score?: number;
  ig_handle?: string | null;
  tt_handle?: string | null;
};
type ShopifyImportJobStatus = {
  id?: string;
  status?: string;
  imported?: number;
  error?: string | null;
  created_at?: string;
  completed_at?: string;
  store?: string;
};
type BackendStatus = 'checking' | 'ready' | 'blocked' | 'offline';
type BackendReadiness = {
  status?: string;
  mode?: string;
  detail?: string;
  checks?: Record<string, { ok?: boolean; [key: string]: unknown }>;
};
type ApiErrorPayload = {
  detail?: unknown;
  error?: unknown;
};
type IntegrationRecord = {
  connected?: boolean;
  store?: string;
  last_error?: string | null;
};
type LaunchBlocker = {
  key: string;
  label: string;
  detail: string;
};

const ALLOW_GUARDED_SHOPIFY_PREVIEW = process.env.NEXT_PUBLIC_ALLOW_SHOPIFY_GUARDED_PREVIEW === 'true';
const SHOPIFY_OAUTH_CALLBACK_URL = 'https://example.com/api/proxy/api/shopify/oauth/callback';
const SHOPIFY_APP_HOME_URL = 'https://example.com/shopify/embedded';
const SHOPIFY_REQUIRED_SCOPES = 'read_customers,read_orders,read_products,write_draft_orders';

const SHOPIFY_STEPS: Array<{ key: ConnectionStage; label: string; description: string }> = [
  {
    key: 'connect',
    label: 'Connect',
    description: 'Install from Shopify Admin'
  },
  { key: 'verify', label: 'Verify', description: 'Check store access and required data' },
  { key: 'preview', label: 'Preview', description: 'Review import size and creator potential' },
  { key: 'activate', label: 'Activate', description: 'Start smart import and launch plan' }
];

const FALLBACK_PREVIEW_METRICS: PreviewMetric[] = [
  { label: 'Estimated customers', value: '8,420', detail: 'Customers with usable purchase history' },
  { label: 'Social match rate', value: '31%', detail: 'Likely profiles Atlas can enrich' },
  { label: 'Creator candidates', value: '1,284', detail: 'Nano, micro, and VIP buyer segments' },
  { label: 'VIP buyer LTV', value: '$42k', detail: 'High-value customer cohort to activate first' }
];

declare global {
  interface Window {
    shopify?: { idToken?: () => Promise<string> };
  }
}

function normalizeStoreUrl(value: string) {
  return value.trim().replace(/^https?:\/\//, '').replace(/\/$/, '').toLowerCase();
}

function getStageIndex(stage: ConnectionStage) {
  return SHOPIFY_STEPS.findIndex((step) => step.key === stage);
}

function getStatusLabel(stage: ConnectionStage) {
  if (stage === 'activate') return 'Ready to activate';
  if (stage === 'preview') return 'Preview ready';
  if (stage === 'verify') return 'Verifying';
  return 'Setup needed';
}

function getStatusClass(stage: ConnectionStage) {
  if (stage === 'activate') return 'border-green-200 bg-green-100 text-green-700 dark:border-green-900/60 dark:bg-green-950/50 dark:text-green-300';
  if (stage === 'preview') return 'border-indigo-200 bg-indigo-100 text-indigo-700 dark:border-indigo-900/60 dark:bg-indigo-950/50 dark:text-indigo-300';
  if (stage === 'verify') return 'border-amber-200 bg-amber-100 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/50 dark:text-amber-300';
  return 'border-muted-foreground/20 text-muted-foreground';
}

function formatCurrency(value?: number) {
  return `$${Number(value || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

function getCandidateName(candidate: PreviewCandidate) {
  const name = [candidate.first_name, candidate.last_name].filter(Boolean).join(' ').trim();
  return name || candidate.email || 'Shopify customer';
}

function HealthIcon({ state }: { state: HealthState }) {
  if (state === 'ready') return <Icons.circleCheck className='size-4 text-green-600' />;
  if (state === 'warning') return <Icons.warning className='size-4 text-amber-600' />;
  return <Icons.clock className='size-4 text-muted-foreground' />;
}

function getLaunchBlockers(readiness: BackendReadiness | null): LaunchBlocker[] {
  const checks = readiness?.checks;
  if (!checks) return [];

  const blockers: LaunchBlocker[] = [];
  if (checks.database?.ok === false) {
    blockers.push({
      key: 'database',
      label: 'Database connection',
      detail: 'Set PostgreSQL credentials and confirm the API can connect.'
    });
  }
  if (checks.brand_integrations_migration?.ok === false) {
    blockers.push({
      key: 'brand_integrations_migration',
      label: 'Integration migration',
      detail: 'Run the brand integrations migration before storing Shopify status.'
    });
  }
  if (checks.integration_secret_storage?.ok === false) {
    blockers.push({
      key: 'integration_secret_storage',
      label: 'Encrypted token storage',
      detail: 'Configure INTEGRATION_SECRET_KEY before saving provider tokens.'
    });
  }
  if (checks.shopify_import_jobs?.ok === false) {
    blockers.push({
      key: 'shopify_import_jobs',
      label: 'Shopify import job records',
      detail: 'Run the Shopify import jobs migration so sync status survives API restarts.'
    });
  }
  if (checks.shopify_oauth?.ok === false) {
    blockers.push({
      key: 'shopify_oauth',
      label: 'Shopify OAuth',
      detail: 'Configure Shopify client secret, app URL, dashboard URL, and required scopes.'
    });
  }
  return blockers;
}

function getBackendStatusCopy(status: BackendStatus, readiness: BackendReadiness | null) {
  if (readiness?.mode === 'local_launch_store') {
    return {
      title: 'Local Shopify connection service active',
      description: 'CreatorOS is using a local QA service because the configured API does not expose the newest Shopify onboarding endpoints.',
      className: 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/20 dark:text-emerald-100'
    };
  }
  if (status === 'checking') {
    return {
      title: 'Checking Shopify connection service',
      description: 'CreatorOS is checking OAuth, storage, and import readiness.',
      className: 'border-indigo-200 bg-indigo-50 text-indigo-900 dark:bg-indigo-950/20 dark:text-indigo-100'
    };
  }
  if (status === 'ready') {
    return {
      title: 'Shopify connection service ready',
      description: 'OAuth, encrypted storage, and import readiness checks are available.',
      className: 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/20 dark:text-emerald-100'
    };
  }
  if (status === 'blocked') {
    return {
      title: 'Shopify connection service needs attention',
      description: 'CreatorOS can respond, but production Shopify onboarding has unresolved blockers.',
      className: 'border-amber-200 bg-amber-50 text-amber-900 dark:bg-amber-950/20 dark:text-amber-100'
    };
  }
  return {
    title: 'Shopify connection service offline',
    description: ALLOW_GUARDED_SHOPIFY_PREVIEW
      ? 'Reconnect after service credentials are fixed. Local readiness estimates are limited to local QA.'
      : 'Reconnect after service credentials are fixed. Live Shopify previews stay disabled until the connection service is ready.',
    className: 'border-red-200 bg-red-50 text-red-900 dark:bg-red-950/20 dark:text-red-100'
  };
}

function getImportStatusCopy(status?: string) {
  if (status === 'completed') {
    return {
      title: 'Import completed',
      description: 'Shopify customers are synced and ready for creator scoring.',
      className: 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/20 dark:text-emerald-100'
    };
  }
  if (status === 'failed') {
    return {
      title: 'Import needs attention',
      description: 'The Shopify import job stopped before completion.',
      className: 'border-red-200 bg-red-50 text-red-900 dark:bg-red-950/20 dark:text-red-100'
    };
  }
  if (status === 'running') {
    return {
      title: 'Import running',
      description: 'CreatorOS is syncing Shopify customers and scoring creator potential.',
      className: 'border-indigo-200 bg-indigo-50 text-indigo-900 dark:bg-indigo-950/20 dark:text-indigo-100'
    };
  }
  return {
    title: 'Import queued',
    description: 'CreatorOS queued the Shopify import job and is waiting for the worker.',
    className: 'border-amber-200 bg-amber-50 text-amber-900 dark:bg-amber-950/20 dark:text-amber-100'
  };
}

async function readJsonResponse<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

async function readApiErrorMessage(response: Response, fallback: string) {
  const payload = await readJsonResponse<ApiErrorPayload>(response);
  const detail = payload?.detail || payload?.error;
  if (typeof detail === 'string' && detail.trim()) return detail;
  return fallback;
}

async function loadShopifyAppBridgeIdToken() {
  if (typeof window === 'undefined') return null;
  if (!window.shopify?.idToken) return null;
  return window.shopify.idToken();
}

export default function ShopifyImportPage() {
  const searchParams = useSearchParams();
  const { brand: activeBrand } = useEffectiveBrand();
  const [stage, setStage] = useState<ConnectionStage>('connect');
  const [storeUrl, setStoreUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [installingOAuth, setInstallingOAuth] = useState(false);
  const [previewReady, setPreviewReady] = useState(false);
  const [previewConfirmed, setPreviewConfirmed] = useState(false);
  const [previewSource, setPreviewSource] = useState<PreviewSource>('none');
  const [previewMetrics, setPreviewMetrics] = useState<PreviewMetric[]>(FALLBACK_PREVIEW_METRICS);
  const [previewCandidates, setPreviewCandidates] = useState<PreviewCandidate[]>([]);
  const [jobId, setJobId] = useState<string | null>(null);
  const [importJob, setImportJob] = useState<ShopifyImportJobStatus | null>(null);
  const [importJobError, setImportJobError] = useState<string | null>(null);
  const [backendStatus, setBackendStatus] = useState<BackendStatus>('checking');
  const [backendReadiness, setBackendReadiness] = useState<BackendReadiness | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [checkingBackend, setCheckingBackend] = useState(false);
  const [finalizingManagedInstall, setFinalizingManagedInstall] = useState(false);
  const [finalizedInstallKey, setFinalizedInstallKey] = useState<string | null>(null);

  const normalizedStore = normalizeStoreUrl(storeUrl);
  const hasActiveBrand = Boolean(activeBrand.id);
  const encodedBrandId = encodeURIComponent(activeBrand.id);
  const displayBrandName = hasActiveBrand ? activeBrand.name : 'a client brand';
  const activeStepIndex = getStageIndex(stage);
  const progressValue = ((activeStepIndex + 1) / SHOPIFY_STEPS.length) * 100;
  const backendCopy = getBackendStatusCopy(backendStatus, backendReadiness);
  const importCopy = getImportStatusCopy(importJob?.status);
  const launchBlockers = getLaunchBlockers(backendReadiness);
  const shopifyAdminShop = normalizeStoreUrl(searchParams.get('shop') || '');

  const shopifyFetch = useCallback(async (input: string, init: RequestInit = {}) => {
    const url = new URL(input, window.location.origin);
    const headers = new Headers(init.headers);
    if (url.pathname.startsWith('/api/proxy/')) {
      if (shopifyAdminShop && !url.searchParams.get('shop')) {
        url.searchParams.set('shop', shopifyAdminShop);
      }
      const shopifyIdToken = await loadShopifyAppBridgeIdToken().catch(() => null);
      if (shopifyIdToken && !headers.has('Authorization')) {
        headers.set('Authorization', `Bearer ${shopifyIdToken}`);
      }
    }
    const requestUrl = url.pathname.startsWith('/api/proxy/')
      ? withLocalQaMarker(url.toString())
      : url.toString();
    return fetch(requestUrl, { ...init, headers });
  }, [shopifyAdminShop]);

  const loadBackendReadiness = useCallback(async ({ showToast = false }: { showToast?: boolean } = {}) => {
    setCheckingBackend(true);
    try {
      const response = await shopifyFetch('/api/proxy/api/readiness');
      if (!response.ok) {
        const message = await readApiErrorMessage(response, 'CreatorOS could not reconnect to the Shopify connection service.');
        if (showToast) toast.error(message);
        setBackendReadiness(null);
        setBackendStatus(response.status >= 500 ? 'offline' : 'blocked');
        return;
      }
      const readiness = await readJsonResponse<BackendReadiness>(response);
      setBackendReadiness(readiness);
      const nextStatus: BackendStatus = readiness?.status === 'ready' ? 'ready' : 'blocked';
      setBackendStatus(nextStatus);
      if (showToast) {
        if (nextStatus === 'ready') {
          toast.success('Shopify connection service is ready.');
        } else {
          toast.warning('Shopify connection service reconnected, but setup blockers remain.');
        }
      }
    } catch {
      setBackendReadiness(null);
      setBackendStatus('offline');
      if (showToast) toast.error('CreatorOS could not reconnect to the Shopify connection service.');
    } finally {
      setLastChecked(new Date());
      setCheckingBackend(false);
    }
  }, [shopifyFetch]);

  function resetShopifyProgress(nextStage: ConnectionStage = 'connect') {
    setError(null);
    setStage(nextStage);
    setPreviewReady(false);
    setPreviewConfirmed(false);
    setPreviewSource('none');
    setPreviewMetrics(FALLBACK_PREVIEW_METRICS);
    setPreviewCandidates([]);
    setJobId(null);
    setImportJob(null);
    setImportJobError(null);
  }

  const loadShopifyPreviewForStore = useCallback(async (store: string) => {
    const previewResponse = await shopifyFetch(`/api/proxy/api/brands/${encodedBrandId}/shopify/preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ store })
    });
    if (!previewResponse.ok) {
      const message = await readApiErrorMessage(previewResponse, 'CreatorOS could not generate a Shopify preview for this store.');
      throw new Error(message);
    }

    const preview = await readJsonResponse<{ metrics?: Record<string, number>; top_candidates?: PreviewCandidate[] }>(previewResponse);
    const metrics = preview?.metrics || {};
    setPreviewMetrics([
      {
        label: 'Estimated customers',
        value: Number(metrics.estimated_customers || 0).toLocaleString(),
        detail: 'Customers returned by the Shopify preview endpoint'
      },
      {
        label: 'Social match rate',
        value: `${Number(metrics.social_match_rate || 0)}%`,
        detail: 'Likely profiles Atlas can enrich'
      },
      {
        label: 'Creator candidates',
        value: Number(metrics.creator_candidates || 0).toLocaleString(),
        detail: 'Customers scoring high enough for activation'
      },
      {
        label: 'VIP buyer LTV',
        value: `$${Number(metrics.vip_buyer_ltv || 0).toLocaleString()}`,
        detail: 'Top preview cohort purchase value'
      }
    ]);
    setPreviewCandidates(preview?.top_candidates || []);
    setPreviewSource('backend');
    setPreviewReady(true);
    setPreviewConfirmed(false);
    setStage('preview');
  }, [encodedBrandId, shopifyFetch]);

  useEffect(() => {
    void loadBackendReadiness();
  }, [loadBackendReadiness]);

  useEffect(() => {
    setStoreUrl(activeBrand.shopify_store || '');
    resetShopifyProgress();
  }, [activeBrand.id, activeBrand.shopify_store]);

  useEffect(() => {
    if (!activeBrand.id) return;
    let cancelled = false;

    async function loadSavedShopifyIntegration() {
      try {
        const response = await shopifyFetch(`/api/proxy/api/brands/${encodedBrandId}/integrations`);
        if (!response.ok) return;
        const integrations = await readJsonResponse<Record<string, IntegrationRecord>>(response);
        const savedStore = integrations?.shopify?.store;
        if (!cancelled && savedStore && !searchParams.get('shop')) {
          const normalizedSavedStore = normalizeStoreUrl(savedStore);
          setStoreUrl(normalizedSavedStore);
          if (integrations?.shopify?.connected) {
            setError(null);
            setStage('verify');
            try {
              await loadShopifyPreviewForStore(normalizedSavedStore);
            } catch (caughtError) {
              if (!cancelled) {
                const message = caughtError instanceof Error && caughtError.message
                  ? caughtError.message
                  : 'CreatorOS could not generate a Shopify preview from the saved connection.';
                setError(message);
                setPreviewReady(false);
                setPreviewConfirmed(false);
                setPreviewSource('none');
                setStage('verify');
              }
            }
          }
        }
      } catch {
        // A missing integration record should not block OAuth setup.
      }
    }

    void loadSavedShopifyIntegration();
    return () => {
      cancelled = true;
    };
  }, [activeBrand.id, encodedBrandId, loadShopifyPreviewForStore, searchParams, shopifyFetch]);

  useEffect(() => {
    const shopifyStatus = searchParams.get('shopify');
    const shop = searchParams.get('shop');
    const hmac = searchParams.get('hmac');
    const timestamp = searchParams.get('timestamp');
    if (shop) setStoreUrl(normalizeStoreUrl(shop));
    if (shopifyStatus === 'manual_setup') {
      setStage('connect');
      setError('Shopify could not complete the secure install. Open CreatorOS from Shopify Admin and restart the OAuth install.');
    }
    if (!activeBrand.id || !shop || !hmac || !timestamp || shopifyStatus) return;

    const installKey = `${activeBrand.id}:${shop}:${timestamp}:${hmac}`;
    if (finalizedInstallKey === installKey) return;

    const params = Object.fromEntries(searchParams.entries());
    const normalizedShop = normalizeStoreUrl(shop);
    setFinalizedInstallKey(installKey);
    setStoreUrl(normalizedShop);
    setError(null);
    setStage('verify');
    setFinalizingManagedInstall(true);

    async function finalizeManagedInstall() {
      try {
        const response = await shopifyFetch(`/api/proxy/api/brands/${encodedBrandId}/shopify/managed-install/finalize`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ shop: normalizedShop, params })
        });
        if (!response.ok) {
          const message = await readApiErrorMessage(response, 'CreatorOS could not finish the Shopify app install.');
          throw new Error(message);
        }
        await loadShopifyPreviewForStore(normalizedShop);
        toast.success('Shopify app connected. Live customer preview is ready.');
      } catch (caughtError) {
        const message = caughtError instanceof Error && caughtError.message
          ? caughtError.message
          : 'CreatorOS could not finish the Shopify app install.';
        setError(message);
        setPreviewReady(false);
        setPreviewConfirmed(false);
        setPreviewSource('none');
        setStage('verify');
        toast.error(message);
      } finally {
        setFinalizingManagedInstall(false);
      }
    }

    void finalizeManagedInstall();
  }, [activeBrand.id, encodedBrandId, finalizedInstallKey, loadShopifyPreviewForStore, searchParams, shopifyFetch]);

  useEffect(() => {
    if (!jobId || previewSource !== 'backend') return;
    if (importJob?.status === 'completed' || importJob?.status === 'failed') return;

    let cancelled = false;
    async function loadImportJobStatus() {
      try {
        const response = await shopifyFetch(`/api/proxy/api/brands/${encodedBrandId}/shopify/import/${jobId}`);
        if (!response.ok) {
          const message = await readApiErrorMessage(response, 'CreatorOS could not load the Shopify import job status.');
          if (!cancelled) setImportJobError(message);
          return;
        }
        const status = await readJsonResponse<ShopifyImportJobStatus>(response);
        if (!cancelled) {
          setImportJob(status);
          setImportJobError(null);
        }
      } catch {
        if (!cancelled) setImportJobError('CreatorOS could not load the Shopify import job status.');
      }
    }

    void loadImportJobStatus();
    const interval = window.setInterval(() => void loadImportJobStatus(), 4000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [activeBrand.id, encodedBrandId, importJob?.status, jobId, previewSource, shopifyFetch]);

  const healthChecks = useMemo<HealthCheck[]>(
    () => [
      {
        label: 'Store access',
        description: previewReady ? `${normalizedStore} responded to the setup check.` : 'Waiting for Shopify app install.',
        state: previewReady ? 'ready' : 'pending'
      },
      {
        label: 'Customer data',
        description: previewReady ? 'Customers and email fields are available for activation.' : 'Atlas will verify customer read access.',
        state: previewReady ? 'ready' : 'pending'
      },
      {
        label: 'Products and orders',
        description: previewReady ? 'Product and order history can power LTV and VIP segments.' : 'Order and product access will be checked before import.',
        state: previewReady ? 'ready' : 'pending'
      },
      {
        label: 'Production import job',
        description: previewSource === 'backend'
          ? 'Backend import job endpoint is available for this store.'
          : previewReady
            ? 'Preview is ready. A live Shopify import job will be available after the connection service confirms import readiness.'
            : 'Smart import will stay locked until preview is reviewed.',
        state: previewSource === 'backend' ? 'ready' : previewReady ? 'warning' : 'pending'
      }
    ],
    [normalizedStore, previewReady, previewSource]
  );

  async function handleOAuthInstall() {
    setError(null);
    if (!hasActiveBrand) {
      setError('Create or select a client brand before connecting Shopify.');
      return;
    }
    if (!normalizedStore) {
      setError('Open CreatorOS from Shopify Admin so Shopify can provide the store context for OAuth.');
      setStage('connect');
      return;
    }

    setInstallingOAuth(true);
    try {
      const response = await shopifyFetch(`/api/proxy/api/brands/${encodedBrandId}/shopify/oauth/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ store: normalizedStore })
      });
      if (!response.ok) {
        const message = await readApiErrorMessage(
          response,
          'CreatorOS could not start the Shopify app install. Check Shopify OAuth environment settings.'
        );
        setStage('connect');
        setError(message);
        toast.error(message);
        return;
      }
      const data = await response.json();
      if (!data.authorize_url) throw new Error('oauth-url-missing');
      toast.success('Redirecting to Shopify for secure app install.');
      window.location.assign(data.authorize_url);
    } catch {
      const message = 'CreatorOS could not start the Shopify app install. Open CreatorOS from Shopify Admin and try again.';
      setStage('connect');
      setError(message);
      toast.error(message);
    } finally {
      setInstallingOAuth(false);
    }
  }

  async function handleGeneratePlan() {
    if (!hasActiveBrand) {
      toast.error('Create or select a client brand before generating an activation plan.');
      return;
    }
    if (!previewReady || !previewConfirmed) {
      toast.error('Review and confirm the import preview before starting activation.');
      return;
    }
    if (previewSource === 'backend') {
      try {
        const response = await shopifyFetch(`/api/proxy/api/brands/${encodedBrandId}/shopify/import`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ store: normalizedStore })
        });
        if (!response.ok) {
          const message = await readApiErrorMessage(response, 'CreatorOS could not start the Shopify import job. No external import ran.');
          toast.error(message);
          return;
        }
        const data = await readJsonResponse<{ job_id?: string }>(response);
        setJobId(data?.job_id || null);
        setImportJob({
          id: data?.job_id,
          status: 'queued',
          imported: 0,
          store: normalizedStore
        });
        setImportJobError(null);
        setStage('activate');
        toast.success('Shopify import job queued. Atlas is preparing the activation plan.');
        return;
      } catch {
        toast.error('CreatorOS could not start the Shopify import job. No external import ran.');
        return;
      }
    }
    setStage('activate');
    toast.success('Activation plan generated from the local readiness estimate. No external import ran.');
  }

  async function handleCopyLaunchBlockers() {
    if (!launchBlockers.length) {
      toast.success('No Shopify launch blockers are visible right now.');
      return;
    }

    const lines = [
      `${activeBrand.name || 'Brand'} Shopify launch blockers`,
      `Backend status: ${backendStatus}`,
      normalizedStore ? `Store: ${normalizedStore}` : null,
      lastChecked ? `Last checked: ${lastChecked.toLocaleString()}` : null,
      '',
      ...launchBlockers.map((blocker) => `- ${blocker.label}: ${blocker.detail}`)
    ].filter(Boolean);

    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      toast.success('Shopify launch blockers copied.');
    } catch {
      toast.error('Could not copy blockers from this browser.');
    }
  }

  async function handleCopyShopifyAppConfig() {
    const lines = [
      'CreatorOS Shopify app configuration',
      `App URL: ${SHOPIFY_APP_HOME_URL}`,
      `Redirect URL: ${SHOPIFY_OAUTH_CALLBACK_URL}`,
      `Required scopes: ${SHOPIFY_REQUIRED_SCOPES}`,
    ];

    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      toast.success('Shopify app config copied.');
    } catch {
      toast.error('Could not copy Shopify app config from this browser.');
    }
  }

  return (
    <div className='flex flex-col gap-6'>
      <Card className='overflow-hidden border-indigo-500/20 bg-gradient-to-br from-background via-background to-indigo-500/5'>
        <CardContent className='p-0'>
          <div className='grid gap-0 xl:grid-cols-[1.45fr_0.55fr]'>
            <div className='p-5 sm:p-6 lg:p-7'>
              <div className='mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
                <div>
                  <div className='mb-2 flex flex-wrap items-center gap-2'>
                    <Badge variant='outline' className='border-indigo-500/20 bg-indigo-500/5 text-indigo-600'>
                      Client onboarding
                    </Badge>
                    <Badge className={cn('border', getStatusClass(stage))}>{getStatusLabel(stage)}</Badge>
                  </div>
                  <h2 className='text-2xl font-bold tracking-tight'>Shopify AI Command Center</h2>
                  <p className='mt-2 max-w-2xl text-sm text-muted-foreground'>
                    Connect {displayBrandName} to Shopify, let Atlas verify the setup, preview the import, then generate the first activation plan.
                  </p>
                </div>
                <div className='flex flex-col gap-2 sm:flex-row sm:shrink-0'>
                  <Button
                    aria-label='Install Shopify app for this workspace'
                    className='min-h-11 cursor-pointer gap-2'
                    onClick={handleOAuthInstall}
                    disabled={installingOAuth || finalizingManagedInstall || !hasActiveBrand}
                  >
                    {installingOAuth || finalizingManagedInstall ? <Icons.spinner className='size-4 animate-spin' /> : <Icons.externalLink className='size-4' />}
                    {finalizingManagedInstall ? 'Finishing install...' : installingOAuth ? 'Starting install...' : 'Install Shopify App'}
                  </Button>
                </div>
              </div>
              {!hasActiveBrand && (
                <Alert className='mt-5 border-amber-200 bg-amber-50 text-amber-900 dark:bg-amber-950/20 dark:text-amber-100'>
                  <Icons.warning className='size-4' />
                  <AlertTitle>Select a client brand</AlertTitle>
                  <AlertDescription>
                    Create or select a workspace before installing Shopify or running a customer import.
                  </AlertDescription>
                </Alert>
              )}

              <div className='space-y-3'>
                <Progress value={progressValue} className='h-2' />
                <div className='grid gap-2 md:grid-cols-4'>
                  {SHOPIFY_STEPS.map((step, index) => {
                    const isActive = index === activeStepIndex;
                    const isComplete = index < activeStepIndex;
                    return (
                      <div
                        key={step.key}
                        className={cn(
                          'rounded-lg border bg-card/70 p-3 text-sm transition-colors',
                          isActive && 'border-indigo-500/40 bg-indigo-500/5',
                          isComplete && 'border-green-500/30 bg-green-500/5'
                        )}
                      >
                        <div className='flex items-center gap-2 font-medium'>
                          {isComplete ? (
                            <Icons.circleCheck className='size-4 text-green-600' />
                          ) : (
                            <span className='flex size-5 items-center justify-center rounded-full bg-muted text-[11px]'>{index + 1}</span>
                          )}
                          {step.label}
                        </div>
                        <p className='mt-1 text-xs text-muted-foreground'>{step.description}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className='border-t bg-slate-950 p-5 text-white xl:border-l xl:border-t-0 xl:p-6'>
              <div className='mb-3 flex items-center gap-2 text-sm font-medium text-indigo-200'>
                <Icons.sparkles className='size-4' />
                Atlas setup assistant
              </div>
              <p className='text-sm leading-6 text-slate-200'>
                {stage === 'activate'
                  ? 'This brand is ready for the first Shopify activation plan. Next, connect Meta for whitelisted ads and Klaviyo for customer email flows.'
                  : previewReady
                    ? previewSource === 'backend'
                      ? 'The live store preview is ready. Review the import estimate, confirm it, and I will queue the Shopify import job.'
                      : 'The local readiness estimate is ready. Review it, confirm it, and I will prepare the activation plan without running a live sync.'
                    : ALLOW_GUARDED_SHOPIFY_PREVIEW
                      ? 'Start with secure app install from Shopify Admin. CreatorOS validates store access and import readiness before any activation plan is queued.'
                      : 'Start with secure app install from Shopify Admin. The connection service must verify access before any preview is shown.'}
              </p>
              <div className='mt-4 rounded-lg border border-white/10 bg-white/5 p-3 text-xs text-slate-300'>
                Next best integration: <span className='font-semibold text-emerald-300'>Klaviyo for customer activation</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Alert className={cn('items-center gap-y-3', backendCopy.className)}>
        {backendStatus === 'ready' ? <Icons.circleCheck className='size-4' /> : <Icons.warning className='size-4' />}
        <AlertTitle>{backendCopy.title}</AlertTitle>
        <AlertDescription>
          <div className='flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
            <div className='space-y-3'>
              <span>
                {backendCopy.description}
                {lastChecked && ` Last checked ${lastChecked.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}.`}
              </span>
              {launchBlockers.length > 0 && (
                <div className='grid gap-2 sm:grid-cols-2'>
                  {launchBlockers.map((blocker) => (
                    <div key={blocker.key} className='rounded-md border border-current/10 bg-background/60 p-2'>
                      <p className='text-xs font-medium'>{blocker.label}</p>
                      <p className='mt-1 text-xs opacity-80'>{blocker.detail}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className='flex shrink-0 flex-wrap gap-2'>
              {launchBlockers.length > 0 && (
                <Button
                  size='sm'
                  variant='outline'
                  className='min-h-11 w-fit cursor-pointer gap-2 bg-background/80'
                  onClick={handleCopyLaunchBlockers}
                >
                  <Icons.forms className='size-3.5' />
                  Copy blockers
                </Button>
              )}
              <Button
                size='sm'
                variant='outline'
                className='min-h-11 w-fit cursor-pointer gap-2 bg-background/80'
                onClick={() => loadBackendReadiness({ showToast: true })}
                disabled={checkingBackend}
              >
                {checkingBackend ? <Icons.spinner className='size-3.5 animate-spin' /> : <Icons.refresh className='size-3.5' />}
                Recheck
              </Button>
            </div>
          </div>
        </AlertDescription>
      </Alert>

      <div className='grid gap-6 xl:grid-cols-[1fr_0.9fr]'>
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <Icons.product className='size-5 text-emerald-600' />
              Shopify app install
            </CardTitle>
            <CardDescription>
              CreatorOS uses Shopify OAuth and a signed install session for official app installs. The store context is supplied by Shopify Admin.
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            {error && (
              <Alert variant='destructive'>
                <Icons.warning className='size-4' />
                <AlertTitle>Connection check needs attention</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className='space-y-4'>
              <Alert>
                <Icons.info className='size-4' />
                <AlertTitle>Production install path</AlertTitle>
                <AlertDescription>
                  <div className='space-y-3'>
                    <p>
                      CreatorOS uses Shopify&apos;s secure app install flow to identify the store and request the required permissions.
                      Existing saved credentials stay active unless Shopify returns a verified replacement token.
                    </p>
                    <div className='grid gap-2 rounded-md border bg-background/70 p-3 text-xs sm:grid-cols-2'>
                      <div>
                        <p className='font-medium'>Allowed redirect URL</p>
                        <p className='mt-1 break-all font-mono opacity-80'>{SHOPIFY_OAUTH_CALLBACK_URL}</p>
                      </div>
                      <div>
                        <p className='font-medium'>Required scopes</p>
                        <p className='mt-1 break-all font-mono opacity-80'>{SHOPIFY_REQUIRED_SCOPES}</p>
                      </div>
                    </div>
                    <div className='flex flex-wrap items-center gap-2'>
                      <Button
                        type='button'
                        size='sm'
                        variant='outline'
                        className='min-h-11 w-fit cursor-pointer gap-2 bg-background/80'
                        onClick={handleCopyShopifyAppConfig}
                      >
                        <Icons.forms className='size-3.5' />
                        Copy app config
                      </Button>
                      <span className='text-xs opacity-80'>
                        If Shopify reports that the redirect URI is not whitelisted, release a Shopify app version with this callback URL.
                      </span>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
              <div className='grid gap-4 md:grid-cols-[1fr_auto] md:items-end'>
                <div className='rounded-md border bg-muted/40 p-3 text-sm'>
                  <p className='font-medium'>Shopify install context</p>
                  <p className='mt-1 text-muted-foreground'>
                    The store is supplied by Shopify during installation. If this page was opened outside Shopify Admin, return to the app listing or Shopify Admin install link.
                  </p>
                </div>
                <Button
                  aria-label='Start secure Shopify app install'
                  className='min-h-11 w-fit cursor-pointer gap-2'
                  onClick={handleOAuthInstall}
                  disabled={installingOAuth || finalizingManagedInstall || !hasActiveBrand}
                >
                  {installingOAuth || finalizingManagedInstall ? <Icons.spinner className='size-4 animate-spin' /> : <Icons.externalLink className='size-4' />}
                  {finalizingManagedInstall ? 'Finishing install...' : installingOAuth ? 'Starting install...' : 'Start secure install'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Connection health</CardTitle>
            <CardDescription>Atlas checks the essentials before any customer import can run.</CardDescription>
          </CardHeader>
          <CardContent className='space-y-3'>
            {healthChecks.map((check) => (
              <div key={check.label} className='flex gap-3 rounded-lg border p-3'>
                <HealthIcon state={check.state} />
                <div>
                  <p className='text-sm font-medium'>{check.label}</p>
                  <p className='text-xs text-muted-foreground'>{check.description}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
            <div>
              <CardTitle>Smart import preview</CardTitle>
              <CardDescription>Review what CreatorOS will use before generating an activation plan.</CardDescription>
            </div>
            <Badge variant={previewReady ? 'default' : 'outline'}>{previewReady ? 'Preview ready' : 'Waiting for connection'}</Badge>
          </div>
        </CardHeader>
        <CardContent className='space-y-5'>
          <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-4'>
            {previewMetrics.map((metric) => (
              <div key={metric.label} className={cn('rounded-lg border p-4', !previewReady && 'opacity-50')}>
                <p className='text-xs font-medium text-muted-foreground'>{metric.label}</p>
                <p className='mt-2 text-2xl font-bold tracking-tight'>{previewReady ? metric.value : '--'}</p>
                <p className='mt-1 text-xs text-muted-foreground'>{metric.detail}</p>
              </div>
            ))}
          </div>

          <div className={cn('rounded-lg border p-4', !previewReady && 'opacity-50')}>
            <div className='flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between'>
              <div>
                <p className='text-sm font-semibold'>Top customer candidates</p>
                <p className='mt-1 text-xs text-muted-foreground'>
                  Live Shopify matches with purchase history and detected social handles.
                </p>
              </div>
              <Badge variant='outline'>
                {previewSource === 'backend' ? `${previewCandidates.length} matched` : 'Awaiting live preview'}
              </Badge>
            </div>

            {previewSource === 'backend' && previewCandidates.length > 0 ? (
              <div className='mt-4 grid gap-2 lg:grid-cols-2'>
                {previewCandidates.slice(0, 6).map((candidate, index) => {
                  const handles = [candidate.ig_handle, candidate.tt_handle].filter(Boolean);
                  return (
                    <div key={`${candidate.email || 'candidate'}-${index}`} className='min-w-0 rounded-md border bg-background/70 p-3'>
                      <div className='flex items-start justify-between gap-3'>
                        <div className='min-w-0 flex-1'>
                          <p className='truncate text-sm font-medium'>{getCandidateName(candidate)}</p>
                          {candidate.email && <p className='truncate text-xs text-muted-foreground'>{candidate.email}</p>}
                        </div>
                        <Badge className='shrink-0 border-emerald-200 bg-emerald-50 text-emerald-700' variant='outline'>
                          Customer
                        </Badge>
                      </div>
                      <div className='mt-3 grid min-w-0 grid-cols-3 gap-2 text-xs'>
                        <div className='min-w-0'>
                          <p className='text-muted-foreground'>Orders</p>
                          <p className='font-semibold'>{Number(candidate.order_count || 0).toLocaleString()}</p>
                        </div>
                        <div className='min-w-0'>
                          <p className='text-muted-foreground'>Spent</p>
                          <p className='truncate font-semibold'>{formatCurrency(candidate.total_spent)}</p>
                        </div>
                        <div className='min-w-0'>
                          <p className='text-muted-foreground'>Score</p>
                          <p className='font-semibold'>{Number(candidate.score || 0).toFixed(0)}</p>
                        </div>
                      </div>
                      <div className='mt-3 flex flex-wrap gap-1.5'>
                        {handles.length > 0 ? (
                          handles.map((handle) => (
                            <Badge key={handle} variant='secondary' className='font-mono text-[11px]'>
                              @{String(handle).replace(/^@/, '')}
                            </Badge>
                          ))
                        ) : (
                          <span className='text-xs text-muted-foreground'>Social profile pending enrichment</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className='mt-4 rounded-md border border-dashed bg-muted/30 p-3 text-xs text-muted-foreground'>
                Run a live Shopify connection preview to see customer-level matches before import.
              </div>
            )}
          </div>

          <div className='rounded-lg border bg-muted/30 p-4'>
            <div className='flex items-start gap-3'>
              <Checkbox
                id='confirm-shopify-preview'
                aria-label='Confirm Shopify import preview reviewed'
                className='min-h-11 min-w-11'
                checked={previewConfirmed}
                disabled={!previewReady}
                onCheckedChange={(checked) => setPreviewConfirmed(checked === true)}
              />
              <div className='space-y-1'>
                <Label htmlFor='confirm-shopify-preview'>I reviewed the import preview</Label>
                <p className='text-xs text-muted-foreground'>
                  {previewSource === 'backend'
                    ? 'CreatorOS will queue the Shopify import job only after this preview is confirmed.'
                    : previewSource === 'fallback'
                      ? 'CreatorOS will not run a live import until a Shopify-backed preview is available.'
                      : 'CreatorOS will unlock import confirmation after a live Shopify preview is ready.'}
                </p>
              </div>
            </div>
          </div>

          <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
            <p className='text-sm text-muted-foreground'>
              {stage === 'activate'
                ? jobId
                  ? `Activation plan is ready. Shopify import job ${jobId.slice(0, 8)} is queued.`
                  : 'Activation plan is ready. Connect Meta and Klaviyo next for launch execution.'
                : 'Confirm the preview to generate the first Shopify customer activation plan.'}
            </p>
            <Button
              aria-label='Generate Shopify customer activation plan'
              className='min-h-11 w-fit cursor-pointer gap-2'
              onClick={handleGeneratePlan}
              disabled={!previewReady || !previewConfirmed}
            >
              <Icons.sparkles className='size-4' />
              Generate activation plan
            </Button>
          </div>
        </CardContent>
      </Card>

      {stage === 'activate' && (
        <Card>
          <CardHeader>
            <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
              <div>
                <CardTitle>Import job status</CardTitle>
                <CardDescription>
                  Track the Shopify sync after activation so the next onboarding step is visible.
                </CardDescription>
              </div>
              <Badge variant={importJob?.status === 'completed' ? 'default' : 'outline'}>
                {importJob?.status || (previewSource === 'backend' ? 'queued' : 'local estimate')}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {previewSource === 'backend' ? (
              <Alert className={cn('items-center gap-y-3', importCopy.className)}>
                {importJob?.status === 'completed' ? (
                  <Icons.circleCheck className='size-4' />
                ) : importJob?.status === 'failed' || importJobError ? (
                  <Icons.warning className='size-4' />
                ) : (
                  <Icons.spinner className='size-4 animate-spin' />
                )}
                <AlertTitle>{importJobError ? 'Import status unavailable' : importCopy.title}</AlertTitle>
                <AlertDescription>
                  <div className='space-y-3'>
                    <p>{importJobError || importCopy.description}</p>
                    <div className='grid gap-2 sm:grid-cols-3'>
                      <div className='rounded-md border border-current/10 bg-background/60 p-2'>
                        <p className='text-xs font-medium'>Job ID</p>
                        <p className='mt-1 font-mono text-xs opacity-80'>{jobId ? jobId.slice(0, 8) : 'Pending'}</p>
                      </div>
                      <div className='rounded-md border border-current/10 bg-background/60 p-2'>
                        <p className='text-xs font-medium'>Customers imported</p>
                        <p className='mt-1 text-xs opacity-80'>{Number(importJob?.imported || 0).toLocaleString()}</p>
                      </div>
                      <div className='rounded-md border border-current/10 bg-background/60 p-2'>
                        <p className='text-xs font-medium'>Store</p>
                        <p className='mt-1 font-mono text-xs opacity-80'>{importJob?.store || normalizedStore || 'Pending'}</p>
                      </div>
                    </div>
                    {importJob?.error && (
                      <p className='rounded-md border border-current/10 bg-background/60 p-2 text-xs opacity-90'>{importJob.error}</p>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            ) : (
              <Alert>
                <Icons.info className='size-4' />
                <AlertTitle>No live import ran</AlertTitle>
                <AlertDescription>
                  This activation plan came from a local readiness estimate, so there is no Shopify import job to track.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
