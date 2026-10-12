'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Icons } from '@/components/icons';
import { useEffectiveBrand } from '@/hooks/use-effective-brand';
import { withLocalQaMarker } from '@/lib/whitelabel-api';
import { cn } from '@/lib/utils';

type IntegrationPriority = 'required' | 'recommended' | 'optional';
type IntegrationStatus = {
  connected: boolean;
  connected_at?: string;
  [key: string]: unknown;
};
type ApiConnectionStatus = 'checking' | 'online' | 'degraded' | 'offline';
type IntegrationLoadError = {
  label: string;
  detail: string;
} | null;
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
type LaunchBlocker = {
  key: string;
  label: string;
  detail: string;
};
type SaveIntegrationResult = {
  ok: boolean;
  message?: string;
};

type Integrations = Record<string, IntegrationStatus>;
type ServiceField = {
  key: string;
  label: string;
  placeholder: string;
  type: 'text' | 'password';
  required?: boolean;
};

type IntegrationService = {
  key: string;
  name: string;
  description: string;
  logo: {
    src: string;
    bgClassName: string;
    imageClassName?: string;
  };
  readinessRole: string;
  nextAction: string;
  priority: IntegrationPriority;
  fields: ServiceField[];
};

const SECRET_FIELDS = new Set(['access_token', 'api_key', 'secret_key', 'api_token']);

const SERVICES: IntegrationService[] = [
  {
    key: 'shopify',
    name: 'Shopify',
    description: 'Import customers, create draft orders for gifting, sync product data',
    logo: {
      src: '/assets/integrations/shopify.svg',
      bgClassName: 'border-[#95bf47]/30 bg-[#95bf47]/10'
    },
    readinessRole: 'Customer activation foundation',
    nextAction: 'Connect Shopify first so Atlas can preview customer and order history.',
    priority: 'required',
    fields: []
  },
  {
    key: 'meta',
    name: 'Meta / Instagram',
    description: 'Creator discovery, business discovery lookups, Partnership Ads, audience insights',
    logo: {
      src: '/assets/integrations/meta.svg',
      bgClassName: 'border-[#0866ff]/25 bg-[#0866ff]/10'
    },
    readinessRole: 'Whitelisted ads and creator permissions',
    nextAction: 'Connect Meta before launching Partnership Ads or whitelisted ad workflows.',
    priority: 'required',
    fields: [
      { key: 'access_token', label: 'System User Token', placeholder: 'EAASd87i9zTk...', type: 'password', required: true },
      { key: 'ig_user_id', label: 'IG Business Account ID', placeholder: '17841461289708645', type: 'text', required: true },
      { key: 'page_id', label: 'Facebook Page ID', placeholder: '116006088251305', type: 'text', required: true },
      { key: 'ad_account_id', label: 'Ad Account ID', placeholder: 'act_327886216331270', type: 'text', required: true }
    ]
  },
  {
    key: 'klaviyo',
    name: 'Klaviyo',
    description: 'Email outreach to VIP customers, segment sync, automated flows',
    logo: {
      src: '/assets/integrations/klaviyo.svg',
      bgClassName: 'border-zinc-900/10 bg-white dark:border-white/20',
      imageClassName: 'size-7'
    },
    readinessRole: 'Customer email activation',
    nextAction: 'Connect Klaviyo after Shopify to sync high-value customer segments.',
    priority: 'recommended',
    fields: [
      { key: 'api_key', label: 'Private API Key', placeholder: 'pk_xxxxx', type: 'password', required: true },
      { key: 'list_id', label: 'Default List ID (optional)', placeholder: 'AbCdEf', type: 'text' }
    ]
  },
  {
    key: 'resend',
    name: 'Resend',
    description: 'Send approved creator proposal and outreach emails from CreatorOS',
    logo: {
      src: '/assets/integrations/resend.svg',
      bgClassName: 'border-zinc-900/10 bg-white dark:border-white/20',
      imageClassName: 'size-7'
    },
    readinessRole: 'Outbound email delivery',
    nextAction: 'Connect Resend before Shopify submission so reviewed email/proposal outreach can be delivered.',
    priority: 'required',
    fields: [
      { key: 'api_key', label: 'API Key', placeholder: 're_xxxxx', type: 'password', required: true },
      { key: 'from_email', label: 'From Email', placeholder: 'CreatorOS <noreply@example.com>', type: 'text', required: true }
    ]
  },
  {
    key: 'mailgun',
    name: 'Mailgun',
    description: 'Fallback email delivery for creator proposal and outreach sends',
    logo: {
      src: '/assets/integrations/mailgun.svg',
      bgClassName: 'border-[#f06b66]/25 bg-[#f06b66]/10'
    },
    readinessRole: 'Fallback outbound email delivery',
    nextAction: 'Use Mailgun only as a fallback if Resend is unavailable for this brand.',
    priority: 'optional',
    fields: [
      { key: 'api_key', label: 'API Key', placeholder: 'key-xxxxx', type: 'password', required: true },
      { key: 'domain', label: 'Sending Domain', placeholder: 'mg.example.com', type: 'text', required: true },
      { key: 'from_email', label: 'From Email', placeholder: 'CreatorOS <noreply@mg.example.com>', type: 'text', required: true }
    ]
  },
  {
    key: 'tiktok',
    name: 'TikTok',
    description: 'TikTok creator discovery, Spark Ads management',
    logo: {
      src: '/assets/integrations/tiktok.svg',
      bgClassName: 'border-zinc-900/10 bg-white dark:border-white/20'
    },
    readinessRole: 'Spark Ads expansion',
    nextAction: 'Add TikTok when this brand is ready to expand creator ads beyond Meta.',
    priority: 'optional',
    fields: [
      { key: 'access_token', label: 'Access Token', placeholder: 'tt_xxxxx', type: 'password', required: true },
      { key: 'advertiser_id', label: 'Advertiser ID', placeholder: '12345678', type: 'text', required: true }
    ]
  },
  {
    key: 'apify',
    name: 'Apify',
    description: 'Bulk Instagram and TikTok scraping for discovery speed',
    logo: {
      src: '/assets/integrations/apify.svg',
      bgClassName: 'border-[#97c93d]/30 bg-[#97c93d]/10'
    },
    readinessRole: 'Profile photo enrichment',
    nextAction: 'Connect Apify, or connect Scrapling instead, before strict Shopify submission so customer rows can receive profile-photo enrichment at scale.',
    priority: 'required',
    fields: [{ key: 'api_token', label: 'API Token', placeholder: 'apify_api_xxxxx', type: 'password', required: true }]
  },
  {
    key: 'scrapling',
    name: 'Scrapling',
    description: 'Scrapling-compatible Instagram profile lookup service for real profile photos',
    logo: {
      src: '/assets/integrations/scrapling.png',
      bgClassName: 'border-[#0ea5a4]/25 bg-[#0ea5a4]/10'
    },
    readinessRole: 'Profile photo enrichment',
    nextAction: 'Connect Scrapling, or connect Apify instead, before strict Shopify submission so customer rows can receive profile-photo enrichment at scale.',
    priority: 'required',
    fields: [
      { key: 'api_key', label: 'API Key', placeholder: 'scrapling_xxxxx', type: 'password', required: true },
      { key: 'lookup_url', label: 'Profile Lookup URL', placeholder: 'https://example.com/profile-lookup', type: 'text', required: true }
    ]
  }
];

function normalizeIntegrations(value: unknown): Integrations {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Integrations;
}

function getPriorityClass(priority: IntegrationPriority) {
  if (priority === 'required') return 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/20 dark:text-red-200';
  if (priority === 'recommended') return 'border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900/60 dark:bg-indigo-950/20 dark:text-indigo-200';
  return 'border-muted-foreground/20 text-muted-foreground';
}

function getPriorityLabel(priority: IntegrationPriority) {
  if (priority === 'required') return 'Required';
  if (priority === 'recommended') return 'Recommended';
  return 'Optional';
}

function IntegrationLogo({ service }: { service: IntegrationService }) {
  const label = `${service.name} logo`;
  return (
    <div
      className={cn(
        'flex size-14 shrink-0 items-center justify-center rounded-lg border bg-background shadow-sm',
        service.logo.bgClassName
      )}
    >
      <Image
        src={service.logo.src}
        alt={label}
        width={40}
        height={36}
        unoptimized
        loading='eager'
        priority
        className={cn('max-h-9 max-w-10 object-contain', service.logo.imageClassName)}
      />
    </div>
  );
}

function getServiceNextAction(service: IntegrationService, status: IntegrationStatus | undefined) {
  if (!status?.connected) return service.nextAction;

  if (service.key === 'shopify') {
    return 'Preview customers in the Shopify command center, then review matched buyers in Pipeline.';
  }
  if (service.key === 'meta') {
    return 'Use Meta for eligible business profile lookups and Partnership Ads setup; add Apify for broader personal-profile enrichment.';
  }
  if (service.key === 'klaviyo') {
    return 'Sync VIP customer segments and build the first activation follow-up flow.';
  }
  if (service.key === 'mailgun') {
    return 'Send a dry-run proposal from Outreach, then use approved emails for creator activation.';
  }
  if (service.key === 'resend') {
    return 'Send a dry-run proposal from Outreach, then use approved emails for creator activation.';
  }
  if (service.key === 'tiktok') {
    return 'Use TikTok when this brand is ready to expand creator ads beyond Meta.';
  }
  if (service.key === 'apify') {
    return 'Run enrichment when this brand needs broader profile photos and prospect discovery.';
  }
  if (service.key === 'scrapling') {
    return 'Run profile-photo enrichment from Creators or the Shopify customer photo coverage panel.';
  }
  return 'Review this connection and continue the launch checklist.';
}

function getDisplayValue(value: unknown) {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return null;
}

function getConnectedDate(status: IntegrationStatus) {
  if (!status.connected_at) return null;
  const date = new Date(status.connected_at);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString();
}

function getStatusDate(value: unknown) {
  if (typeof value !== 'string') return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function getReadinessAction(check: { ok?: boolean; [key: string]: unknown } | undefined, fallback: string) {
  return typeof check?.required_action === 'string' && check.required_action.trim()
    ? check.required_action
    : fallback;
}

function getStringList(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : [];
}

function getReadinessDetail(check: { ok?: boolean; [key: string]: unknown } | undefined, fallback: string) {
  const parts = [getReadinessAction(check, fallback)];
  const missingFields = getStringList(check?.missing_fields);
  const scraplingMissingFields = getStringList(check?.scrapling_missing_fields);
  const missingProvider = typeof check?.missing_provider === 'string' ? check.missing_provider.trim() : '';

  if (missingFields.length) parts.push(`Missing fields: ${missingFields.join(', ')}.`);
  if (scraplingMissingFields.length) parts.push(`Scrapling missing: ${scraplingMissingFields.join(', ')}.`);
  if (missingProvider) parts.push(`Missing provider: ${missingProvider}.`);

  return parts.join(' ');
}

function getEditableDefaults(service: IntegrationService, status: IntegrationStatus) {
  return service.fields.reduce<Record<string, string>>((defaults, field) => {
    if (SECRET_FIELDS.has(field.key)) return defaults;
    const value = getDisplayValue(status[field.key]);
    if (value) defaults[field.key] = value;
    return defaults;
  }, {});
}

function getMissingRequiredFields(service: IntegrationService, values: Record<string, string>, status: IntegrationStatus) {
  return service.fields.filter((field) => {
    if (!field.required) return false;
    if (values[field.key]?.trim()) return false;
    if (status.connected === true && SECRET_FIELDS.has(field.key)) return false;
    if (status.connected === true && getDisplayValue(status[field.key])) return false;
    return true;
  });
}

function getFieldAutoComplete(field: ServiceField) {
  if (SECRET_FIELDS.has(field.key)) return 'new-password';
  if (field.key.includes('email')) return 'email';
  if (field.key.includes('url')) return 'url';
  return 'off';
}

function getFieldInputMode(field: ServiceField): 'email' | 'url' | 'numeric' | undefined {
  if (field.key.includes('email')) return 'email';
  if (field.key.includes('url')) return 'url';
  if (field.key.endsWith('_id')) return 'numeric';
  return undefined;
}

function getApiConnectionCopy(status: ApiConnectionStatus, readiness: BackendReadiness | null) {
  if (readiness?.mode === 'local_launch_store') {
    return {
      title: 'Local integration service active',
      description: 'CreatorOS is using a local QA service because the configured API does not expose the newest onboarding endpoints.',
      className: 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/20 dark:text-emerald-100'
    };
  }
  if (status === 'checking') {
    return {
      title: 'Checking integration service',
      description: 'CreatorOS is reconnecting to the brand integration service.',
      className: 'border-indigo-200 bg-indigo-50 text-indigo-900 dark:bg-indigo-950/20 dark:text-indigo-100'
    };
  }
  if (status === 'online') {
    return {
      title: 'Integration service connected',
      description: 'Provider credentials and readiness checks are reachable for this brand.',
      className: 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/20 dark:text-emerald-100'
    };
  }
  if (status === 'degraded') {
    return {
      title: 'Integration service needs attention',
      description: 'CreatorOS can respond, but at least one readiness check is blocking a clean launch.',
      className: 'border-amber-200 bg-amber-50 text-amber-900 dark:bg-amber-950/20 dark:text-amber-100'
    };
  }
  return {
    title: 'Integration service offline',
    description: 'Reconnect after database credentials, migrations, and required integration secrets are configured.',
    className: 'border-red-200 bg-red-50 text-red-900 dark:bg-red-950/20 dark:text-red-100'
  };
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
      detail: 'Run the brand integrations migration so provider status can be stored.'
    });
  }
  if (checks.integration_secret_storage?.ok === false) {
    blockers.push({
      key: 'integration_secret_storage',
      label: 'Encrypted secret storage',
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
  if (checks.outreach_providers?.ok === false) {
    blockers.push({
      key: 'outreach_providers',
      label: 'Email delivery provider',
      detail: getReadinessDetail(
        checks.outreach_providers,
        'Connect Resend for this brand, or configure RESEND_API_KEY, so approved email/proposal outreach can be delivered from CreatorOS. Mailgun remains supported as a fallback.'
      )
    });
  }
  if (checks.profile_photo_providers?.ok === false) {
    blockers.push({
      key: 'profile_photo_providers',
      label: 'Profile-photo enrichment provider',
      detail: getReadinessDetail(
        checks.profile_photo_providers,
        'Connect Apify for this brand, configure APIFY_API_TOKEN, or connect Scrapling with both SCRAPLING_API_KEY and SCRAPLING_PROFILE_LOOKUP_URL for large-scale Shopify customer Instagram/Facebook photo enrichment.'
      )
    });
  }
  return blockers;
}

function getIntegrationLoadBlocker(error: IntegrationLoadError): LaunchBlocker | null {
  if (!error) return null;
  return {
    key: 'brand_integration_records',
    label: error.label,
    detail: error.detail
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

function IntegrationCard({
  service,
  status,
  onSave,
  onDisconnect,
  editing,
  onEditingChange,
  disabled = false,
  disconnecting = false
}: {
  service: IntegrationService;
  status: IntegrationStatus;
  onSave: (data: Record<string, string>) => Promise<SaveIntegrationResult>;
  onDisconnect: () => Promise<void>;
  editing: boolean;
  onEditingChange: (editing: boolean) => void;
  disabled?: boolean;
  disconnecting?: boolean;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const connectedDate = getConnectedDate(status);
  const isConnected = status.connected === true;
  const isShopify = service.key === 'shopify';
  const isEditing = editing && !isShopify;
  const store = getDisplayValue(status.store);
  const lastTested = getStatusDate(status.last_tested_at);
  const lastSynced = getStatusDate(status.last_sync_at);
  const lastError = typeof status.last_error === 'string' && status.last_error.trim()
    ? status.last_error.trim()
    : null;

  async function handleSave() {
    setSaveError(null);
    const missingRequired = getMissingRequiredFields(service, values, status);
    if (missingRequired.length > 0) {
      const message = `Add ${missingRequired.map((field) => field.label).join(', ')} before saving.`;
      setSaveError(message);
      toast.error(message);
      return;
    }
    setSaving(true);
    try {
      const result = await onSave(values);
      if (!result.ok) {
        setSaveError(result.message || `CreatorOS could not save ${service.name}. Check credentials and try again.`);
        return;
      }
      onEditingChange(false);
      setValues({});
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card id={`integration-card-${service.key}`} className='scroll-mt-24 transition-all duration-200 hover:shadow-md'>
      <CardHeader className='space-y-3'>
        <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
          <div className='flex gap-3'>
            <IntegrationLogo service={service} />
            <div className='min-w-0'>
              <CardTitle className='text-base'>{service.name}</CardTitle>
              <p className='mt-1 text-xs text-muted-foreground'>{service.readinessRole}</p>
            </div>
          </div>
          <div className='flex flex-wrap gap-2'>
            <Badge variant='outline' className={getPriorityClass(service.priority)}>
              {getPriorityLabel(service.priority)}
            </Badge>
            <Badge className={isConnected ? 'border-green-200 bg-green-100 text-green-700 dark:border-green-900/60 dark:bg-green-950/50 dark:text-green-300' : ''} variant={isConnected ? 'outline' : 'secondary'}>
              {isConnected ? 'Connected' : lastError ? 'Action needed' : 'Missing'}
            </Badge>
          </div>
        </div>
        <CardDescription>{service.description}</CardDescription>
      </CardHeader>
      <CardContent className='space-y-4'>
        {lastError && (
          <Alert variant='destructive'>
            <Icons.warning className='size-4' />
            <AlertTitle>{service.name} needs attention</AlertTitle>
            <AlertDescription>{lastError}</AlertDescription>
          </Alert>
        )}

        <div className='rounded-lg border bg-muted/30 p-3 text-sm'>
          <div className='mb-1 flex items-center gap-2 font-medium'>
            <Icons.sparkles className='size-4 text-indigo-500' />
            Next best action
          </div>
          <p className='text-xs leading-5 text-muted-foreground'>{getServiceNextAction(service, status)}</p>
        </div>

        {isShopify && (
          <div className='rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3'>
            <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
              <div>
                <div className='flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300'>
                  <Icons.product className='size-4' />
                  Shopify customer activation
                </div>
                <p className='mt-1 text-xs leading-5 text-muted-foreground'>
                  {isConnected
                    ? 'Shopify is connected through the approved app install flow. Use the command center to preview customers, then review matched buyers in Pipeline.'
                    : 'Install CreatorOS from Shopify Admin before onboarding a new brand so customer history, LTV, and social matches flow into Pipeline.'}
                </p>
              </div>
              <Badge variant='outline' className={isConnected ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : ''}>
                {isConnected ? 'Customer sync ready' : 'Setup required'}
              </Badge>
            </div>
            <div className='mt-3 grid gap-2 text-xs sm:grid-cols-3'>
              <div className='rounded-md border bg-background/70 p-2'>
                <p className='text-muted-foreground'>Store</p>
                <p className='truncate font-mono font-semibold'>{store || 'Not connected'}</p>
              </div>
              <div className='rounded-md border bg-background/70 p-2'>
                <p className='text-muted-foreground'>Last checked</p>
                <p className='font-semibold'>{lastTested || 'Pending'}</p>
              </div>
              <div className='rounded-md border bg-background/70 p-2'>
                <p className='text-muted-foreground'>Last import</p>
                <p className='font-semibold'>{lastSynced || 'Pending'}</p>
              </div>
            </div>
          </div>
        )}

        {isConnected && !isEditing && (
          <div className='space-y-3'>
            {connectedDate && <p className='text-xs text-muted-foreground'>Connected {connectedDate}</p>}
            {Object.entries(status).map(([key, value]) => {
              if (key === 'connected' || key === 'connected_at' || key === 'last_tested_at' || key === 'last_sync_at' || SECRET_FIELDS.has(key)) return null;
              const displayValue = getDisplayValue(value);
              if (!displayValue) return null;
              return (
                <div key={key} className='flex min-w-0 items-center justify-between gap-4 text-sm'>
                  <span className='text-muted-foreground capitalize'>{key.replace(/_/g, ' ')}</span>
                  <span className='min-w-0 truncate font-mono text-xs'>{displayValue}</span>
                </div>
              );
            })}
          </div>
        )}

        {isEditing && (
          <div className='space-y-3 rounded-lg border p-3'>
            {isConnected && (
              <p className='text-xs leading-5 text-muted-foreground'>
                Reconnect replaces the saved credentials. Secret fields stay blank for security.
              </p>
            )}
            {service.fields.map((field) => {
              const fieldId = `${service.key}-${field.key}`;
              return (
                <div key={field.key} className='space-y-1.5'>
                  <Label htmlFor={fieldId}>
                    {field.label}
                    {field.required && <span className='ml-1 text-red-500'>*</span>}
                  </Label>
                  <Input
                    id={fieldId}
                    type={field.type}
                    placeholder={field.placeholder}
                    value={values[field.key] || ''}
                    onChange={(event) => setValues((previous) => ({ ...previous, [field.key]: event.target.value }))}
                    autoComplete={getFieldAutoComplete(field)}
                    inputMode={getFieldInputMode(field)}
                    required={field.required}
                    aria-required={field.required || undefined}
                    className='font-mono text-sm'
                  />
                </div>
              );
            })}
          </div>
        )}

        <div className='flex flex-col gap-2 sm:flex-row sm:flex-wrap'>
          {!isEditing ? (
            <>
              {service.key === 'shopify' && (
                <Button asChild size='sm' className='min-h-11 w-full cursor-pointer gap-2 sm:w-auto'>
                  <Link href='/dashboard/shopify'>
                    <Icons.sparkles className='size-3.5' />
                    Command center
                  </Link>
                </Button>
              )}
              {service.key === 'shopify' && isConnected && (
                <Button asChild size='sm' variant='outline' className='min-h-11 w-full cursor-pointer gap-2 sm:w-auto'>
                  <Link href='/dashboard/kanban'>
                    <Icons.teams className='size-3.5' />
                    Review Pipeline
                  </Link>
                </Button>
              )}
              {service.key === 'shopify' ? (
                <Button id='connect-shopify' asChild size='sm' variant='outline' className='min-h-11 w-full cursor-pointer gap-2 sm:w-auto' aria-disabled={disabled}>
                  <Link href='/dashboard/shopify' aria-label={isConnected ? 'Reconnect Shopify in command center' : 'Set up Shopify in command center'}>
                    <Icons.externalLink className='size-3.5' />
                    {isConnected ? 'Reconnect in command center' : 'Set up in command center'}
                  </Link>
                </Button>
              ) : (
                <Button
                  id={`connect-${service.key}`}
                  size='sm'
                  variant={isConnected ? 'outline' : 'default'}
                  className='min-h-11 w-full cursor-pointer gap-2 sm:w-auto'
                  aria-label={isConnected ? `Reconnect ${service.name}` : `Connect ${service.name}`}
                  disabled={disabled}
                  onClick={() => {
                    setValues(getEditableDefaults(service, status));
                    setSaveError(null);
                    onEditingChange(true);
                  }}
                >
                  <Icons.edit className='size-3.5' />
                  {isConnected ? 'Reconnect' : 'Connect'}
                </Button>
              )}
            </>
          ) : (
            <>
              <Button type='button' size='sm' className='min-h-11 w-full cursor-pointer gap-2 sm:w-auto' onClick={handleSave} disabled={saving || disabled}>
                {saving ? <Icons.spinner className='size-3.5 animate-spin' /> : <Icons.check className='size-3.5' />}
                {saving ? 'Saving...' : isConnected ? 'Update' : 'Save connection'}
              </Button>
              {saveError && (
                <Alert variant='destructive' className='basis-full'>
                  <Icons.warning className='size-4' />
                  <AlertTitle>Connection was not saved</AlertTitle>
                  <AlertDescription>{saveError}</AlertDescription>
                </Alert>
              )}
              <Button
                type='button'
                size='sm'
                variant='outline'
                className='min-h-11 w-full cursor-pointer sm:w-auto'
                onClick={() => {
                  onEditingChange(false);
                  setSaveError(null);
                  setValues({});
                }}
              >
                Cancel
              </Button>
            </>
          )}
          {isConnected && !isEditing && (
            <Button
              type='button'
              size='sm'
              variant='outline'
              className='min-h-11 w-full cursor-pointer gap-2 text-red-600 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/30 sm:w-auto'
              aria-label={`Disconnect ${service.name}`}
              onClick={onDisconnect}
              disabled={disabled || disconnecting}
            >
              {disconnecting ? <Icons.spinner className='size-3.5 animate-spin' /> : <Icons.close className='size-3.5' />}
              {disconnecting ? 'Disconnecting...' : 'Disconnect'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function IntegrationsPage() {
  const { brand: activeBrand } = useEffectiveBrand();
  const hasActiveBrand = Boolean(activeBrand.id);
  const encodedBrandId = encodeURIComponent(activeBrand.id);
  const displayBrandName = hasActiveBrand ? activeBrand.name : 'Client brand';
  const [integrations, setIntegrations] = useState<Integrations>({});
  const [loading, setLoading] = useState(true);
  const [apiStatus, setApiStatus] = useState<ApiConnectionStatus>('checking');
  const [backendReadiness, setBackendReadiness] = useState<BackendReadiness | null>(null);
  const [integrationLoadError, setIntegrationLoadError] = useState<IntegrationLoadError>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [editingService, setEditingService] = useState<string | null>(null);
  const [pendingDisconnectService, setPendingDisconnectService] = useState<string | null>(null);
  const [disconnectAcknowledged, setDisconnectAcknowledged] = useState(false);
  const [disconnectingService, setDisconnectingService] = useState<string | null>(null);

  const loadIntegrations = useCallback(
    async ({ keepContent = false, showToast = false }: { keepContent?: boolean; showToast?: boolean } = {}) => {
      if (!activeBrand.id) {
        setIntegrations({});
        setBackendReadiness(null);
        setIntegrationLoadError(null);
        setApiStatus('online');
        setLastChecked(new Date());
        setRetrying(false);
        setLoading(false);
        return;
      }
      if (keepContent) {
        setRetrying(true);
      } else {
        setLoading(true);
      }

      const [readinessResult, integrationsResult] = await Promise.allSettled([
        fetch(withLocalQaMarker(`/api/proxy/api/readiness?brand_id=${encodedBrandId}`)),
        fetch(withLocalQaMarker(`/api/proxy/api/brands/${encodedBrandId}/integrations`))
      ]);

      let nextApiStatus: ApiConnectionStatus = 'online';
      let nextReadiness: BackendReadiness | null = null;
      let nextIntegrationLoadError: IntegrationLoadError = null;

      if (readinessResult.status === 'fulfilled' && readinessResult.value.ok) {
        nextReadiness = await readJsonResponse<BackendReadiness>(readinessResult.value);
        nextApiStatus = nextReadiness?.status === 'ready' ? 'online' : 'degraded';
      } else {
        nextApiStatus = 'offline';
      }

      if (integrationsResult.status === 'fulfilled' && integrationsResult.value.ok) {
        const data = await readJsonResponse<unknown>(integrationsResult.value);
        if (data === null) {
          if (!keepContent) setIntegrations({});
          nextIntegrationLoadError = {
            label: 'Brand integration records',
            detail: 'The integrations endpoint responded without readable provider data. Recheck the backend response shape.'
          };
          if (nextApiStatus === 'online') nextApiStatus = 'degraded';
        } else {
          setIntegrations(normalizeIntegrations(data));
        }
      } else {
        if (!keepContent) setIntegrations({});
        nextIntegrationLoadError = {
          label: 'Brand integration records',
          detail: 'Confirm this brand exists in the backend and the integrations endpoint can read saved providers.'
        };
        if (nextApiStatus === 'online') nextApiStatus = 'degraded';
      }

      setBackendReadiness(nextReadiness);
      setIntegrationLoadError(nextIntegrationLoadError);
      setApiStatus(nextApiStatus);
      setLastChecked(new Date());
      setRetrying(false);
      setLoading(false);

      if (showToast) {
        if (nextApiStatus === 'offline') {
          toast.error('CreatorOS could not reconnect to the integration service yet.');
        } else if (nextApiStatus === 'degraded') {
          toast.warning('CreatorOS reconnected, but launch readiness is still blocked.');
        } else {
          toast.success('CreatorOS reconnected to the integration service.');
        }
      }
    },
    [activeBrand.id, encodedBrandId]
  );

  useEffect(() => {
    void loadIntegrations();
  }, [loadIntegrations]);

  const readiness = useMemo(() => {
    const outreachReady =
      backendReadiness?.checks?.outreach_providers?.ok === true ||
      integrations.resend?.connected === true ||
      integrations.mailgun?.connected === true;
    const outreachPrimary = SERVICES.find((service) => service.key === 'resend');
    const profilePhotoReady =
      backendReadiness?.checks?.profile_photo_providers?.ok === true ||
      integrations.apify?.connected === true ||
      integrations.scrapling?.connected === true;
    const profilePhotoOptions = SERVICES.filter((service) => service.key === 'apify' || service.key === 'scrapling');
    const profilePhotoPrimary = profilePhotoOptions[0];
    const individuallyScoredServices = SERVICES.filter(
      (service) =>
        service.priority !== 'optional' &&
        service.key !== 'apify' &&
        service.key !== 'scrapling' &&
        service.key !== 'resend' &&
        service.key !== 'mailgun'
    );
    const scoredCount = individuallyScoredServices.length + 2;
    const connectedCount =
      individuallyScoredServices.filter((service) => integrations[service.key]?.connected === true).length +
      (outreachReady ? 1 : 0) +
      (profilePhotoReady ? 1 : 0);
    const requiredMissing = [
      ...SERVICES.filter(
        (service) =>
          service.priority === 'required' &&
          service.key !== 'apify' &&
          service.key !== 'scrapling' &&
          service.key !== 'resend' &&
          service.key !== 'mailgun' &&
          integrations[service.key]?.connected !== true
      ),
      ...(!outreachReady && outreachPrimary ? [outreachPrimary] : []),
      ...(!profilePhotoReady && profilePhotoPrimary ? [profilePhotoPrimary] : [])
    ];
    const recommendedMissing = SERVICES.filter((service) => service.priority === 'recommended' && integrations[service.key]?.connected !== true);
    const nextTarget = requiredMissing[0] || recommendedMissing[0] || SERVICES.find((service) => service.priority === 'optional' && integrations[service.key]?.connected !== true) || null;

    return {
      percent: Math.round((connectedCount / scoredCount) * 100),
      connectedCount,
      scoredCount,
      nextTarget,
      requiredMissing,
      recommendedMissing
    };
  }, [backendReadiness, integrations]);

  function handleContinueSetup() {
    if (!hasActiveBrand) {
      toast.error('Create or select a client brand before connecting integrations.');
      return;
    }
    if (!readiness.nextTarget) {
      toast.success('This brand has the core launch integrations connected.');
      return;
    }
    if (readiness.nextTarget.key === 'shopify') {
      window.location.assign('/dashboard/shopify');
      return;
    }
    setEditingService(readiness.nextTarget.key);
    const card = document.getElementById(`integration-card-${readiness.nextTarget.key}`);
    card?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    window.setTimeout(() => document.getElementById(`connect-${readiness.nextTarget?.key}`)?.focus(), 250);
  }

  async function handleSave(service: string, data: Record<string, string>): Promise<SaveIntegrationResult> {
    if (!hasActiveBrand) {
      const message = 'Create or select a client brand before saving integrations.';
      toast.error(message);
      return { ok: false, message };
    }
    const fallback = `CreatorOS could not save ${service}. Check credentials and try again.`;
    try {
      const response = await fetch(withLocalQaMarker(`/api/proxy/api/brands/${encodedBrandId}/integrations/${encodeURIComponent(service)}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        const message = await readApiErrorMessage(response, fallback);
        if (response.status >= 500) setApiStatus('offline');
        setLastChecked(new Date());
        toast.error(message);
        return { ok: false, message };
      }
      toast.success(`${service} connection saved`);
      await loadIntegrations({ keepContent: true });
      return { ok: true };
    } catch {
      setApiStatus('offline');
      setLastChecked(new Date());
      toast.error(fallback);
      return { ok: false, message: fallback };
    }
  }

  async function handleDisconnect(service: string) {
    if (!hasActiveBrand) {
      toast.error('Create or select a client brand before changing integrations.');
      return;
    }
    setDisconnectAcknowledged(false);
    setPendingDisconnectService(service);
  }

  async function confirmDisconnect() {
    if (!pendingDisconnectService || !disconnectAcknowledged) return;
    const service = pendingDisconnectService;
    const serviceName = SERVICES.find((item) => item.key === service)?.name || service;
    const fallback = `CreatorOS could not disconnect ${service}.`;
    setDisconnectingService(service);
    try {
      const response = await fetch(withLocalQaMarker(`/api/proxy/api/brands/${encodedBrandId}/integrations/${encodeURIComponent(service)}`), {
        method: 'DELETE'
      });
      if (!response.ok) {
        const message = await readApiErrorMessage(response, fallback);
        if (response.status >= 500) setApiStatus('offline');
        setLastChecked(new Date());
        toast.error(message);
        return;
      }
      toast.success(`${serviceName} disconnected`);
      setIntegrations((previous) => ({ ...previous, [service]: { connected: false } }));
      setEditingService(null);
      setDisconnectAcknowledged(false);
      setPendingDisconnectService(null);
    } catch {
      setApiStatus('offline');
      setLastChecked(new Date());
      toast.error(fallback);
    } finally {
      setDisconnectingService(null);
    }
  }

  if (loading) {
    return (
      <div className='space-y-4'>
        <Skeleton className='h-44 rounded-xl' />
        <div className='grid gap-4 md:grid-cols-2'>
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className='h-56 rounded-xl' />
          ))}
        </div>
      </div>
    );
  }

  const apiCopy = getApiConnectionCopy(apiStatus, backendReadiness);
  const launchBlockers = [
    ...getLaunchBlockers(backendReadiness),
    getIntegrationLoadBlocker(integrationLoadError)
  ].filter(Boolean) as LaunchBlocker[];
  const pendingDisconnectName = pendingDisconnectService
    ? SERVICES.find((item) => item.key === pendingDisconnectService)?.name || pendingDisconnectService
    : null;

  async function handleCopyLaunchBlockers() {
    if (!launchBlockers.length) {
      toast.success('No backend launch blockers are visible right now.');
      return;
    }

    const lines = [
      `${displayBrandName} launch blockers`,
      `Backend status: ${apiStatus}`,
      lastChecked ? `Last checked: ${lastChecked.toLocaleString()}` : null,
      '',
      ...launchBlockers.map((blocker) => `- ${blocker.label}: ${blocker.detail}`),
      '',
      'Provider env checklist for strict Shopify submission:',
      'RESEND_API_KEY=',
      "RESEND_FROM='CreatorOS <noreply@example.com>'",
      'MAILGUN_API_KEY=',
      'MAILGUN_DOMAIN=mg.example.com',
      "MAILGUN_FROM='CreatorOS <noreply@mg.example.com>'",
      'APIFY_API_TOKEN=',
      'SCRAPLING_API_KEY=',
      'SCRAPLING_PROFILE_LOOKUP_URL=',
      '',
      'After configuring providers, rerun:',
      'CREATOROS_PARTNER_DASHBOARD_CONFIGURED=true CREATOROS_PROTECTED_CUSTOMER_DATA_APPROVED=true npm run verify:shopify:strict'
    ].filter(Boolean);

    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      toast.success('Launch blockers copied.');
    } catch {
      toast.error('Could not copy blockers from this browser.');
    }
  }

  return (
    <div className='space-y-6'>
      <AlertDialog
        open={Boolean(pendingDisconnectService)}
        onOpenChange={(open) => {
          if (!open) {
            setDisconnectAcknowledged(false);
            setPendingDisconnectService(null);
          }
        }}
      >
        <AlertDialogContent className='max-h-[90dvh] overflow-y-auto sm:max-w-md'>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect {pendingDisconnectName}?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the saved connection for {displayBrandName}. Workflows that rely on this provider will pause until it is reconnected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <label className='flex min-w-0 cursor-pointer items-start gap-3 rounded-md border p-3 text-sm leading-5'>
            <input
              type='checkbox'
              className='mt-1 size-4 shrink-0'
              checked={disconnectAcknowledged}
              onChange={(event) => setDisconnectAcknowledged(event.target.checked)}
              aria-label={`Acknowledge disconnect ${pendingDisconnectName || 'integration'} impact`}
            />
            <span className='min-w-0 break-words'>
              I understand this will pause workflows that depend on {pendingDisconnectName || 'this integration'} until it is reconnected.
            </span>
          </label>
          <AlertDialogFooter className='gap-2 sm:gap-0'>
            <AlertDialogCancel className='min-h-11'>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className='min-h-11 bg-destructive text-destructive-foreground hover:bg-destructive/90'
              aria-label={`Confirm disconnect ${pendingDisconnectName || 'integration'}`}
              disabled={!disconnectAcknowledged || Boolean(disconnectingService)}
              onClick={() => void confirmDisconnect()}
            >
              {disconnectingService ? 'Disconnecting...' : 'Disconnect'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card className='overflow-hidden border-indigo-500/20'>
        <CardContent className='grid gap-0 p-0 lg:grid-cols-[1fr_0.75fr]'>
          <div className='p-6'>
            <div className='mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
              <div>
                <Badge variant='outline' className='mb-2 border-indigo-500/20 bg-indigo-500/5 text-indigo-600'>
                  Brand readiness
                </Badge>
                <h2 className='text-2xl font-bold tracking-tight'>{displayBrandName} launch setup</h2>
                <p className='mt-2 max-w-2xl text-sm text-muted-foreground'>
                  {hasActiveBrand
                    ? 'Connect the systems this brand needs for Shopify customer activation, whitelisted ads, and follow-up flows.'
                    : 'Create or select a workspace before saving provider credentials for a launch.'}
                </p>
              </div>
              <Button type='button' className='min-h-11 w-full cursor-pointer gap-2 sm:w-auto' onClick={handleContinueSetup} disabled={!hasActiveBrand}>
                <Icons.arrowRight className='size-4' />
                Continue Setup
              </Button>
            </div>

            <div className='space-y-3'>
              <div className='flex items-end justify-between gap-4'>
                <div>
                  <p className='text-3xl font-bold tracking-tight'>{readiness.percent}%</p>
                  <p className='text-xs text-muted-foreground'>
                    {readiness.connectedCount} of {readiness.scoredCount} launch-critical integrations connected
                  </p>
                </div>
                {readiness.nextTarget && (
                  <Badge variant='outline' className={getPriorityClass(readiness.nextTarget.priority)}>
                    Next: {readiness.nextTarget.name}
                  </Badge>
                )}
              </div>
              <Progress value={readiness.percent} />
            </div>

            {!hasActiveBrand && (
              <Alert className='mt-5 border-amber-200 bg-amber-50 text-amber-900 dark:bg-amber-950/20 dark:text-amber-100'>
                <Icons.warning className='size-4' />
                <AlertTitle>Select a client brand</AlertTitle>
                <AlertDescription>
                  Integration credentials are isolated per workspace. Select or create the client brand before connecting Shopify, Meta, Klaviyo, or discovery providers.
                </AlertDescription>
              </Alert>
            )}
          </div>

          <div className='border-t bg-slate-950 p-6 text-white lg:border-l lg:border-t-0'>
            <div className='mb-3 flex items-center gap-2 text-sm font-medium text-indigo-200'>
              <Icons.sparkles className='size-4' />
              Atlas readiness brief
            </div>
            <p className='text-sm leading-6 text-slate-200'>
              {readiness.nextTarget
                ? `${readiness.nextTarget.name} is the next setup step. ${readiness.nextTarget.nextAction}`
                : 'The core launch integrations are connected. Review optional channels when the brand is ready to expand.'}
            </p>
            <div className='mt-4 grid gap-2 text-xs text-slate-300'>
              <div className='rounded-lg border border-white/10 bg-white/5 p-2'>
                Required missing: {readiness.requiredMissing.length || 'none'}
              </div>
              <div className='rounded-lg border border-white/10 bg-white/5 p-2'>
                Profile photos: {backendReadiness?.checks?.profile_photo_providers?.ok === true || integrations.apify?.connected === true || integrations.scrapling?.connected === true ? 'ready' : 'Apify or Scrapling required'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Alert className={cn('items-center gap-y-3', apiCopy.className)}>
        {apiStatus === 'offline' ? <Icons.warning className='size-4' /> : <Icons.circleCheck className='size-4' />}
        <AlertTitle>{apiCopy.title}</AlertTitle>
        <AlertDescription>
          <div className='flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
            <div className='space-y-3'>
              <span>
                {apiCopy.description}
                {lastChecked && ` Last checked ${lastChecked.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}.`}
                {retrying && ' Reconnecting now...'}
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
            <div className='flex shrink-0 flex-col gap-2 sm:flex-row sm:flex-wrap'>
              {launchBlockers.length > 0 && (
                <Button
                  type='button'
                  size='sm'
                  variant='outline'
                  className='min-h-11 w-full cursor-pointer gap-2 bg-background/80 sm:w-auto'
                  onClick={handleCopyLaunchBlockers}
                >
                  <Icons.forms className='size-3.5' />
                  Copy blockers
                </Button>
              )}
              <Button
                type='button'
                size='sm'
                variant='outline'
                className='min-h-11 w-full cursor-pointer gap-2 bg-background/80 sm:w-auto'
                aria-label='Reconnect brand integration service'
                onClick={() => loadIntegrations({ keepContent: true, showToast: true })}
                disabled={retrying}
              >
                {retrying ? <Icons.spinner className='size-3.5 animate-spin' /> : <Icons.refresh className='size-3.5' />}
                {retrying ? 'Reconnecting...' : 'Reconnect'}
              </Button>
            </div>
          </div>
        </AlertDescription>
      </Alert>

      <div className='grid gap-4 md:grid-cols-2'>
        {SERVICES.map((service) => (
          <IntegrationCard
            key={service.key}
            service={service}
            status={integrations[service.key] || { connected: false }}
            onSave={(data) => handleSave(service.key, data)}
            onDisconnect={() => handleDisconnect(service.key)}
            editing={editingService === service.key}
            onEditingChange={(editing) => setEditingService(editing ? service.key : null)}
            disabled={!hasActiveBrand}
            disconnecting={disconnectingService === service.key}
          />
        ))}
      </div>
    </div>
  );
}
