'use client';

import { useEffect, useState } from 'react';
import { UserProfile, useUser } from '@clerk/nextjs';
import PageContainer from '@/components/layout/page-container';
import { Icons } from '@/components/icons';
import { useBrandStore } from '@/components/org-switcher';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

function initials(value?: string | null) {
  return (
    (value || 'User')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || 'U'
  );
}

function isLocalQaAuthEnabled() {
  if (typeof window === 'undefined') return false;
  const isLocalHost =
    window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  if (!isLocalHost) return false;
  if (
    process.env.NEXT_PUBLIC_CREATOROS_QA_AUTH_BYPASS === 'true' ||
    window.location.search.includes('qa=1')
  ) {
    return true;
  }
  try {
    return window.localStorage.getItem('creatoros:qa-auth') === 'true';
  } catch {
    return false;
  }
}

export default function ProfileViewPage() {
  const { user, isLoaded } = useUser();
  const [localQaAuthEnabled, setLocalQaAuthEnabled] = useState(false);
  const activeBrand = useBrandStore((s) => s.activeBrand);
  const brands = useBrandStore((s) => s.brands);
  const loadingBrands = useBrandStore((s) => s.loading);
  const fetchBrands = useBrandStore((s) => s.fetchBrands);
  const qaEmail = process.env.NEXT_PUBLIC_CREATOROS_QA_USER_EMAIL || 'qa@example.com';
  const displayName =
    user?.fullName ||
    user?.primaryEmailAddress?.emailAddress ||
    (localQaAuthEnabled ? 'Local QA user' : 'Signed-in user');
  const email =
    user?.primaryEmailAddress?.emailAddress || (localQaAuthEnabled ? qaEmail : 'No primary email');
  const accountLoaded = isLoaded || localQaAuthEnabled;
  const hasBrand = Boolean(activeBrand.id);
  const canShowClerkProfile = Boolean(user);

  useEffect(() => {
    void fetchBrands();
  }, [fetchBrands]);

  useEffect(() => {
    setLocalQaAuthEnabled(isLocalQaAuthEnabled());
  }, []);

  return (
    <PageContainer
      pageTitle='Profile'
      pageDescription='Manage account security, identity, and workspace context.'
      scrollable
    >
      <div className='grid min-w-0 gap-6 overflow-hidden xl:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)]'>
        <div className='min-w-0 space-y-4'>
          <Card className='min-w-0 overflow-hidden'>
            <CardHeader>
              <CardTitle>Account</CardTitle>
              <CardDescription>Your sign-in identity for CreatorOS.</CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='flex min-w-0 items-center gap-3'>
                <Avatar className='h-12 w-12'>
                  <AvatarImage src={user?.imageUrl} alt={displayName} />
                  <AvatarFallback>{initials(displayName)}</AvatarFallback>
                </Avatar>
                <div className='min-w-0 flex-1'>
                  <p className='truncate font-semibold'>
                    {accountLoaded ? displayName : 'Loading account...'}
                  </p>
                  <p className='truncate text-sm text-muted-foreground'>
                    {accountLoaded ? email : 'Checking Clerk session'}
                  </p>
                </div>
              </div>
              <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-1'>
                <div className='min-w-0 rounded-lg border p-3'>
                  <div className='flex items-center justify-between gap-2'>
                    <p className='min-w-0 break-words text-sm font-medium'>Email verification</p>
                    <Badge
                      variant={
                        user?.primaryEmailAddress?.verification?.status === 'verified' ||
                        localQaAuthEnabled
                          ? 'default'
                          : 'secondary'
                      }
                    >
                      {user?.primaryEmailAddress?.verification?.status === 'verified' ||
                      localQaAuthEnabled
                        ? 'Verified'
                        : 'Needs review'}
                    </Badge>
                  </div>
                  <p className='mt-1 text-xs text-muted-foreground'>
                    {localQaAuthEnabled && !user
                      ? 'Local QA identity for dashboard testing.'
                      : 'Managed through Clerk account settings.'}
                  </p>
                </div>
                <div className='min-w-0 rounded-lg border p-3'>
                  <div className='flex items-center justify-between gap-2'>
                    <p className='min-w-0 break-words text-sm font-medium'>Client workspace</p>
                    <Badge variant={hasBrand ? 'default' : 'secondary'}>
                      {loadingBrands ? 'Loading' : hasBrand ? 'Selected' : 'Required'}
                    </Badge>
                  </div>
                  <p className='mt-1 truncate text-xs text-muted-foreground'>
                    {loadingBrands
                      ? 'Loading workspace context...'
                      : hasBrand
                        ? activeBrand.name
                        : 'Choose a brand workspace before launch work.'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className='min-w-0 overflow-hidden'>
            <CardHeader>
              <CardTitle>Workspace access</CardTitle>
              <CardDescription>Current app context for whitelisting operations.</CardDescription>
            </CardHeader>
            <CardContent className='space-y-3'>
              <div className='min-w-0 rounded-lg border p-3'>
                <p className='text-xs font-medium text-muted-foreground'>Active brand</p>
                <p className='mt-1 truncate text-sm font-semibold'>
                  {loadingBrands ? 'Loading...' : hasBrand ? activeBrand.name : 'No brand selected'}
                </p>
                {activeBrand.id && (
                  <p className='mt-1 break-all font-mono text-[11px] text-muted-foreground'>
                    {activeBrand.id}
                  </p>
                )}
              </div>
              <div className='min-w-0 rounded-lg border p-3'>
                <p className='text-xs font-medium text-muted-foreground'>Shopify store</p>
                <p className='mt-1 truncate text-sm font-semibold'>
                  {activeBrand.shopify_store || 'Not connected'}
                </p>
              </div>
              <div className='min-w-0 rounded-lg border p-3'>
                <p className='text-xs font-medium text-muted-foreground'>Brand workspaces</p>
                <p className='mt-1 text-sm font-semibold'>
                  {loadingBrands ? 'Loading...' : brands.length.toLocaleString()}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className='min-w-0 overflow-hidden'>
          <CardHeader>
            <div className='flex min-w-0 items-center gap-2'>
              <Icons.user className='size-4 text-muted-foreground' />
              <CardTitle className='break-words'>Security and profile settings</CardTitle>
            </div>
            <CardDescription>
              Update name, email addresses, authentication factors, and connected account details.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {canShowClerkProfile ? (
              <div className='min-w-0 overflow-hidden rounded-lg border'>
                <UserProfile
                  routing='path'
                  path='/dashboard/profile'
                  appearance={{
                    elements: { rootBox: 'w-full', cardBox: 'shadow-none border-0 w-full' }
                  }}
                />
              </div>
            ) : (
              <div className='min-w-0 rounded-lg border p-6'>
                <div className='flex min-w-0 items-start gap-3'>
                  <div className='bg-primary/10 text-primary flex size-10 items-center justify-center rounded-full'>
                    <Icons.user className='size-5' />
                  </div>
                  <div className='min-w-0 space-y-1'>
                    <p className='font-medium'>Local QA session</p>
                    <p className='text-sm text-muted-foreground'>
                      Clerk profile settings require a real signed-in Clerk session. The local QA
                      bypass is active only on localhost so the dashboard can be tested end to end
                      against the CreatorOS backend.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
