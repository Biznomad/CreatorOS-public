'use client';

import { useAuth } from '@clerk/nextjs';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  fetchUsableShopifySession,
  getSignInUrl,
  isLocalQaAuthEnabled,
  rememberLocalQaAuth
} from '@/lib/dashboard-auth';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();
  const [localQaAuthEnabled, setLocalQaAuthEnabled] = useState(false);
  const [shopifySessionChecked, setShopifySessionChecked] = useState(false);
  const [shopifySessionEnabled, setShopifySessionEnabled] = useState(false);

  useEffect(() => {
    const enabled = isLocalQaAuthEnabled();
    if (enabled) rememberLocalQaAuth();
    setLocalQaAuthEnabled(enabled);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function checkShopifySession() {
      if (isLocalQaAuthEnabled()) {
        if (!cancelled) {
          setShopifySessionEnabled(false);
          setShopifySessionChecked(true);
        }
        return;
      }

      try {
        const session = await fetchUsableShopifySession();
        if (!cancelled) setShopifySessionEnabled(Boolean(session));
      } catch {
        if (!cancelled) setShopifySessionEnabled(false);
      } finally {
        if (!cancelled) setShopifySessionChecked(true);
      }
    }

    void checkShopifySession();
    return () => {
      cancelled = true;
    };
  }, []);

  const hasDashboardAccess = Boolean(isSignedIn || localQaAuthEnabled || shopifySessionEnabled);
  const accessStateLoaded = localQaAuthEnabled || (isLoaded && shopifySessionChecked);

  useEffect(() => {
    if (accessStateLoaded && !hasDashboardAccess) {
      const signInUrl = getSignInUrl();
      router.replace(signInUrl);
      window.location.replace(signInUrl);
    }
  }, [accessStateLoaded, hasDashboardAccess, router]);

  if (!accessStateLoaded) {
    return (
      <div className='flex min-h-screen items-center justify-center'>
        <div className='size-8 animate-spin rounded-full border-4 border-muted border-t-primary' />
      </div>
    );
  }

  if (!hasDashboardAccess) {
    return (
      <div className='flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center'>
        <div className='size-8 animate-spin rounded-full border-4 border-muted border-t-primary' />
        <div>
          <p className='text-sm font-medium'>Redirecting to sign in</p>
          <Link
            className='text-muted-foreground text-xs underline underline-offset-4'
            href={getSignInUrl()}
          >
            Open sign in
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
