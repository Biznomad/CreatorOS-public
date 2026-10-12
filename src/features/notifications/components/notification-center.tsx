'use client';

import { useEffect } from 'react';
import { Icons } from '@/components/icons';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { NotificationCard } from '@/components/ui/notification-card';
import { useBrandStore } from '@/components/org-switcher';
import { useNotificationStore } from '../utils/store';
import { useRouter } from 'next/navigation';

const MAX_VISIBLE = 5;

const actionRoutes: Record<string, string> = {
  applications: '/dashboard/applications',
  billing: '/dashboard/billing',
  campaigns: '/dashboard/campaigns',
  creators: '/dashboard/creators',
  gifting: '/dashboard/shipments',
  integrations: '/dashboard/integrations',
  kanban: '/dashboard/kanban',
  product: '/dashboard/product',
  proposals: '/dashboard/briefs',
  shopify: '/dashboard/shopify',
  workspaces: '/dashboard/workspaces'
};

export function NotificationCenter() {
  const activeBrandId = useBrandStore((s) => s.activeBrand.id);
  const { notifications, loading, loadNotifications, markAsRead, markAllAsRead, removeNotification, unreadCount } = useNotificationStore();
  const router = useRouter();
  const count = unreadCount();
  const visibleNotifications = notifications.slice(0, MAX_VISIBLE);

  useEffect(() => {
    void loadNotifications(activeBrandId);
  }, [activeBrandId, loadNotifications]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant='ghost'
          size='icon'
          className='relative min-h-11 min-w-11'
          aria-label={count > 0 ? `Notifications, ${count} unread` : 'Notifications'}
        >
          <Icons.notification className='h-4 w-4' />
          {count > 0 && (
            <span aria-hidden='true' className='bg-destructive text-destructive-foreground pointer-events-none absolute top-0 right-0 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-medium'>
              {count > 9 ? '9+' : count}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align='end' className='w-[calc(100vw-2rem)] p-0 sm:w-[380px]' sideOffset={8}>
        <div className='flex items-center justify-between px-4 py-3'>
          <Link href='/dashboard/notifications' className='group flex min-h-11 items-center gap-1'>
            <h4 className='text-sm font-semibold group-hover:underline'>Notifications</h4>
            <Icons.chevronRight className='text-muted-foreground h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5' />
          </Link>
          <div className='flex items-center gap-2'>
            {count > 0 && (
              <span className='bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs'>
                {count} new
              </span>
            )}
            {count > 0 && (
              <Button
                variant='ghost'
                size='sm'
                className='text-muted-foreground min-h-11 px-2 py-1 text-xs'
                onClick={markAllAsRead}
              >
                Mark all as read
              </Button>
            )}
          </div>
        </div>
        <Separator />
        <ScrollArea className='h-[400px]'>
          {loading ? (
            <div className='flex flex-col items-center justify-center py-12'>
              <Icons.spinner className='text-muted-foreground mb-2 h-7 w-7 animate-spin' />
              <p className='text-muted-foreground text-sm'>Loading notifications</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className='flex flex-col items-center justify-center py-12'>
              <Icons.notification className='text-muted-foreground/40 mb-2 h-8 w-8' />
              <p className='text-muted-foreground text-sm'>No notifications yet</p>
            </div>
          ) : (
            <div className='flex flex-col gap-1 p-2'>
              {visibleNotifications.map((notification) => (
                <NotificationCard
                  key={notification.id}
                  id={notification.id}
                  title={notification.title}
                  body={notification.body}
                  status={notification.status}
                  createdAt={notification.createdAt}
                  actions={notification.actions}
                  onMarkAsRead={markAsRead}
                  onDismiss={removeNotification}
                  onAction={(notifId, actionId) => {
                    const route = actionRoutes[actionId];
                    if (route) {
                      markAsRead(notifId);
                      router.push(route);
                    }
                  }}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
