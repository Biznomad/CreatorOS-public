'use client';

import { useEffect, useState } from 'react';
import { CreateOrganization, OrganizationProfile, OrganizationSwitcher, useAuth, useOrganization, useUser } from '@clerk/nextjs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Icons } from '@/components/icons';
import { useBrandStore } from '@/components/org-switcher';
import Link from 'next/link';

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

export function TeamManagementPage() {
  const activeBrand = useBrandStore((s) => s.activeBrand);
  const brands = useBrandStore((s) => s.brands);
  const loadingBrands = useBrandStore((s) => s.loading);
  const fetchBrands = useBrandStore((s) => s.fetchBrands);
  const { isLoaded: authLoaded, isSignedIn } = useAuth();
  const { user, isLoaded: userLoaded } = useUser();
  const [localQaAuthEnabled, setLocalQaAuthEnabled] = useState(false);
  const qaEmail = process.env.NEXT_PUBLIC_CREATOROS_QA_USER_EMAIL || 'qa@example.com';

  const hasBrandWorkspace = Boolean(activeBrand.id);
  const canManageClerkTeam = Boolean(authLoaded && isSignedIn);
  const signedInUserLabel =
    user?.primaryEmailAddress?.emailAddress ||
    user?.fullName ||
    (localQaAuthEnabled ? `Local QA user (${qaEmail})` : userLoaded ? 'QA / Shopify session' : 'Loading...');

  useEffect(() => {
    void fetchBrands();
  }, [fetchBrands]);

  useEffect(() => {
    setLocalQaAuthEnabled(isLocalQaAuthEnabled());
  }, []);

  return (
    <div className='min-w-0 space-y-6 overflow-hidden'>
      <div className='grid min-w-0 gap-3 lg:grid-cols-3'>
        <Card className='min-w-0 overflow-hidden'>
          <CardContent className='p-4'>
            <p className='text-xs font-medium text-muted-foreground'>Signed-in user</p>
            <p className='mt-2 truncate text-lg font-semibold'>
              {signedInUserLabel}
            </p>
          </CardContent>
        </Card>
        <Card className='min-w-0 overflow-hidden'>
          <CardContent className='p-4'>
            <p className='text-xs font-medium text-muted-foreground'>Clerk organization</p>
            <p className='mt-2 truncate text-lg font-semibold'>{canManageClerkTeam ? 'Ready to manage' : 'Sign-in required'}</p>
          </CardContent>
        </Card>
        <Card className='min-w-0 overflow-hidden'>
          <CardContent className='p-4'>
            <p className='text-xs font-medium text-muted-foreground'>Brand workspaces</p>
            <p className='mt-2 text-lg font-semibold'>{loadingBrands ? 'Loading...' : brands.length.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      <Alert>
        <Icons.info className='size-4' />
        <AlertTitle>Access model</AlertTitle>
        <AlertDescription>
          Clerk manages user identity and team membership. CreatorOS brand workspaces isolate client data, integrations, billing, and activation workflows by active brand.
        </AlertDescription>
      </Alert>

      {canManageClerkTeam ? (
        <SignedInTeamControls activeBrand={activeBrand} hasBrandWorkspace={hasBrandWorkspace} loadingBrands={loadingBrands} />
      ) : (
        <UnsignedTeamState activeBrand={activeBrand} hasBrandWorkspace={hasBrandWorkspace} loadingBrands={loadingBrands} />
      )}
    </div>
  );
}

type TeamControlProps = {
  activeBrand: {
    id: string;
    name: string;
  };
  hasBrandWorkspace: boolean;
  loadingBrands: boolean;
};

function SignedInTeamControls({ activeBrand, hasBrandWorkspace, loadingBrands }: TeamControlProps) {
  const { organization, isLoaded: organizationLoaded } = useOrganization();
  const hasOrganization = organizationLoaded && Boolean(organization);

  return (
    <div className='grid min-w-0 gap-6 overflow-hidden xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]'>
      <Card className='min-w-0 overflow-hidden'>
        <CardHeader>
          <CardTitle>Workspace context</CardTitle>
          <CardDescription>Select a Clerk organization and confirm the active client brand before inviting teammates.</CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <WorkspaceSummary activeBrand={activeBrand} hasBrandWorkspace={hasBrandWorkspace} loadingBrands={loadingBrands} />

          <div className='min-w-0 overflow-hidden rounded-lg border p-4'>
            <div className='mb-3 flex items-start justify-between gap-3'>
              <div>
                <p className='text-sm font-medium'>Clerk organization</p>
                <p className='mt-1 text-sm text-muted-foreground'>{hasOrganization ? organization?.name : 'Choose or create an organization'}</p>
              </div>
              <Badge variant={hasOrganization ? 'default' : 'secondary'}>{hasOrganization ? 'Selected' : 'Needed'}</Badge>
            </div>
            <div className='min-w-0 max-w-full overflow-x-auto pb-1'>
              <OrganizationSwitcher
                hidePersonal
                afterCreateOrganizationUrl='/dashboard/workspaces/team'
                afterSelectOrganizationUrl='/dashboard/workspaces/team'
                afterLeaveOrganizationUrl='/dashboard/workspaces/team'
              />
            </div>
          </div>

          {!hasOrganization && (
            <div className='min-w-0 overflow-hidden rounded-lg border'>
              <CreateOrganization
                routing='hash'
                afterCreateOrganizationUrl='/dashboard/workspaces/team'
                appearance={{ elements: { rootBox: 'w-full', cardBox: 'shadow-none border-0 w-full' } }}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card className='min-w-0 overflow-hidden'>
        <CardHeader>
          <CardTitle>Members, roles, and security</CardTitle>
          <CardDescription>Invite teammates, review members, and manage organization settings from Clerk.</CardDescription>
        </CardHeader>
        <CardContent>
          {hasOrganization ? (
            <div className='min-w-0 overflow-hidden rounded-lg border'>
              <OrganizationProfile
                routing='path'
                path='/dashboard/workspaces/team'
                appearance={{ elements: { rootBox: 'w-full', cardBox: 'shadow-none border-0 w-full' } }}
              />
            </div>
          ) : (
            <SelectOrganizationState />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function UnsignedTeamState({ activeBrand, hasBrandWorkspace, loadingBrands }: TeamControlProps) {
  return (
    <div className='grid min-w-0 gap-6 overflow-hidden xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]'>
      <Card className='min-w-0 overflow-hidden'>
        <CardHeader>
          <CardTitle>Workspace context</CardTitle>
          <CardDescription>Confirm the active client brand before managing team access.</CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <WorkspaceSummary activeBrand={activeBrand} hasBrandWorkspace={hasBrandWorkspace} loadingBrands={loadingBrands} />
          <div className='min-w-0 rounded-lg border border-dashed p-6'>
            <div className='flex items-start gap-3'>
              <Icons.lock className='mt-0.5 size-5 text-muted-foreground' />
              <div className='min-w-0'>
                <h3 className='text-sm font-semibold'>Clerk sign-in required</h3>
                <p className='mt-1 text-sm text-muted-foreground'>
                  Team invitations, roles, and organization security settings are available after signing in with a Clerk dashboard account.
                </p>
                <Button asChild variant='outline' className='mt-4 min-h-11 w-full gap-2 sm:w-auto'>
                  <Link href='/auth/sign-in'>
                    <Icons.login className='size-4' />
                    Open sign in
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className='min-w-0 overflow-hidden'>
        <CardHeader>
          <CardTitle>Members, roles, and security</CardTitle>
          <CardDescription>Signed-in workspace admins can invite teammates and manage organization settings.</CardDescription>
        </CardHeader>
        <CardContent>
          <SelectOrganizationState />
        </CardContent>
      </Card>
    </div>
  );
}

function WorkspaceSummary({ activeBrand, hasBrandWorkspace, loadingBrands }: TeamControlProps) {
  return (
    <div className='min-w-0 rounded-lg border p-4'>
      <div className='flex items-start justify-between gap-3'>
        <div className='min-w-0'>
          <p className='text-sm font-medium'>Active brand</p>
          <p className='mt-1 text-sm text-muted-foreground'>{hasBrandWorkspace ? activeBrand.name : 'No client brand selected'}</p>
        </div>
        <Badge variant={hasBrandWorkspace ? 'default' : 'secondary'}>{loadingBrands ? 'Loading' : hasBrandWorkspace ? 'Ready' : 'Required'}</Badge>
      </div>
      {activeBrand.id && <p className='mt-3 break-all font-mono text-xs text-muted-foreground'>{activeBrand.id}</p>}
    </div>
  );
}

function SelectOrganizationState() {
  return (
    <div className='min-w-0 rounded-lg border border-dashed p-8 text-center'>
      <Icons.teams className='mx-auto mb-3 size-8 text-muted-foreground' />
      <h3 className='text-sm font-semibold'>Select an organization to manage members</h3>
      <p className='mx-auto mt-1 max-w-md text-sm text-muted-foreground'>
        Once a Clerk organization is active, this page shows the member, invitation, role, and security controls for that team.
      </p>
    </div>
  );
}
