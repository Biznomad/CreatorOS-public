'use client';
import { useAuth, UserButton, useUser } from '@clerk/nextjs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail
} from '@/components/ui/sidebar';
import { navGroups } from '@/config/nav-config';
import { useMediaQuery } from '@/hooks/use-media-query';
import {
  fetchUsableShopifySession,
  isLocalQaAuthEnabled,
  type ShopifyDashboardSession
} from '@/lib/dashboard-auth';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import * as React from 'react';
import { Icons } from '../icons';
import { OrgSwitcher } from '../org-switcher';

export default function AppSidebar() {
  const pathname = usePathname();
  const { isOpen } = useMediaQuery();
  const { isSignedIn } = useAuth();
  const { user, isLoaded: userLoaded } = useUser();
  const [localQaAuthEnabled, setLocalQaAuthEnabled] = React.useState(false);
  const [shopifySession, setShopifySession] = React.useState<ShopifyDashboardSession | null>(null);
  const qaEmail = process.env.NEXT_PUBLIC_CREATOROS_QA_USER_EMAIL || 'qa@example.com';
  const shopifySessionEnabled = Boolean(shopifySession);
  const accountName =
    user?.fullName ||
    user?.primaryEmailAddress?.emailAddress ||
    (shopifySessionEnabled ? shopifySession?.owner_email || 'Shopify install session' : localQaAuthEnabled ? 'Local QA user' : 'CreatorOS');
  const accountDetail =
    user?.primaryEmailAddress?.emailAddress ||
    (shopifySessionEnabled ? shopifySession?.shop || 'Embedded app session' : localQaAuthEnabled ? qaEmail : 'Sign in required');
  const accountLoaded = userLoaded || localQaAuthEnabled || shopifySessionEnabled;

  React.useEffect(() => {
    // Side effects based on sidebar state changes
  }, [isOpen]);

  React.useEffect(() => {
    setLocalQaAuthEnabled(isLocalQaAuthEnabled());
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    async function checkShopifySession() {
      if (isLocalQaAuthEnabled()) {
        if (!cancelled) setShopifySession(null);
        return;
      }

      try {
        const session = await fetchUsableShopifySession();
        if (!cancelled) setShopifySession(session);
      } catch {
        if (!cancelled) setShopifySession(null);
      }
    }
    void checkShopifySession();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Sidebar collapsible='icon'>
      <SidebarHeader className='group-data-[collapsible=icon]:pt-4'>
        <OrgSwitcher />
      </SidebarHeader>
      <SidebarContent className='overflow-x-hidden'>
        {navGroups.map((group) => (
          <SidebarGroup key={group.label || 'ungrouped'} className='py-0'>
            {group.label && <SidebarGroupLabel>{group.label}</SidebarGroupLabel>}
            <SidebarMenu>
              {group.items.map((item) => {
                const Icon = item.icon ? Icons[item.icon] : Icons.logo;
                return item?.items && item?.items?.length > 0 ? (
                  <Collapsible
                    key={item.title}
                    asChild
                    defaultOpen={item.isActive}
                    className='group/collapsible'
                  >
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton tooltip={item.title} isActive={pathname === item.url}>
                          {item.icon && <Icon />}
                          <span>{item.title}</span>
                          <Icons.chevronRight className='ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90' />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {item.items?.map((subItem) => (
                            <SidebarMenuSubItem key={subItem.title}>
                              <SidebarMenuSubButton asChild isActive={pathname === subItem.url}>
                                <Link href={subItem.url}>
                                  <span>{subItem.title}</span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                ) : (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      tooltip={item.title}
                      isActive={pathname === item.url}
                    >
                      <Link href={item.url}>
                        <Icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            {isSignedIn ? (
              <SidebarMenuButton size='lg' className='cursor-default hover:bg-transparent' aria-label={`Signed in as ${accountLoaded ? accountName : 'loading user'}`}>
                <UserButton
                  appearance={{
                    elements: {
                      avatarBox: 'size-8'
                    }
                  }}
                />
                <div className='grid min-w-0 flex-1 text-left text-sm leading-tight'>
                  <span className='truncate font-medium'>{accountLoaded ? accountName : 'Loading account...'}</span>
                  <span className='text-muted-foreground truncate text-xs'>{accountDetail}</span>
                </div>
              </SidebarMenuButton>
            ) : (
              <SidebarMenuButton size='lg' asChild tooltip={accountName}>
                <Link href={localQaAuthEnabled || shopifySessionEnabled ? '/dashboard/profile' : '/auth/sign-in'} aria-label={`Open account profile for ${accountName}`}>
                  <div className='bg-primary text-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold'>
                    {shopifySessionEnabled ? 'OS' : localQaAuthEnabled ? 'QA' : 'IN'}
                  </div>
                  <div className='grid min-w-0 flex-1 text-left text-sm leading-tight'>
                    <span className='truncate font-medium'>{accountName}</span>
                    <span className='text-muted-foreground truncate text-xs'>{accountDetail}</span>
                  </div>
                </Link>
              </SidebarMenuButton>
            )}
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
