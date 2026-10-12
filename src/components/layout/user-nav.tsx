'use client';

import { useEffect, useMemo, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';

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
  const isLocalHost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  if (!isLocalHost) return false;
  if (process.env.NEXT_PUBLIC_CREATOROS_QA_AUTH_BYPASS === 'true' || window.location.search.includes('qa=1')) return true;
  try {
    return window.localStorage.getItem('creatoros:qa-auth') === 'true';
  } catch {
    return false;
  }
}

export function UserNav() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [localQaAuthEnabled, setLocalQaAuthEnabled] = useState(false);
  const qaEmail = process.env.NEXT_PUBLIC_CREATOROS_QA_USER_EMAIL || 'qa@example.com';
  const displayName = useMemo(
    () => user?.fullName || user?.primaryEmailAddress?.emailAddress || (localQaAuthEnabled ? 'Local QA user' : 'CreatorOS user'),
    [localQaAuthEnabled, user]
  );
  const displayEmail = user?.primaryEmailAddress?.emailAddress || (localQaAuthEnabled ? qaEmail : 'Open profile to finish sign in');
  const fallback = initials(displayName);
  const accountLoaded = isLoaded || localQaAuthEnabled;

  useEffect(() => {
    setLocalQaAuthEnabled(isLocalQaAuthEnabled());
  }, []);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant='ghost' className='relative min-h-11 min-w-11 rounded-full' aria-label={`Open account menu for ${accountLoaded ? displayName : 'loading user'}`}>
          <Avatar className='h-8 w-8'>
            <AvatarImage src={user?.imageUrl} alt={displayName} />
            <AvatarFallback>{fallback}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className='max-w-[calc(100vw-1rem)] w-64' align='end' sideOffset={10} forceMount>
        <DropdownMenuLabel className='font-normal'>
          <div className='flex min-w-0 flex-col space-y-1'>
            <p className='truncate text-sm leading-none font-medium'>{accountLoaded ? displayName : 'Loading account...'}</p>
            <p className='text-muted-foreground truncate text-xs leading-none'>{accountLoaded ? displayEmail : 'Checking session'}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => router.push('/dashboard/profile')}>
            Profile
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push('/dashboard/billing')}>
            Billing
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push('/dashboard/settings/integrations')}>
            Settings
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
