'use client';

import { useEffect } from 'react';
import { Icons } from '@/components/icons';
import PageContainer from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import { NotificationCard } from '@/components/ui/notification-card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useBrandStore } from '@/components/org-switcher';
import { useRouter } from 'next/navigation';
import { useNotificationStore } from '../utils/store';

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

export default function NotificationsPage() {
  const activeBrandId = useBrandStore((s) => s.activeBrand.id);
  const { notifications, loading, error, loadNotifications, markAsRead, markAllAsRead, removeNotification, unreadCount } = useNotificationStore();
  const router = useRouter();
  const count = unreadCount();

  useEffect(() => {
    void loadNotifications(activeBrandId);
  }, [activeBrandId, loadNotifications]);

  const unreadNotifications = notifications.filter((n) => n.status === 'unread');
  const readNotifications = notifications.filter((n) => n.status === 'read');

  const renderList = (items: typeof notifications) => {
    if (loading) {
      return (
        <div className='flex flex-col items-center justify-center py-16'>
          <Icons.spinner className='text-muted-foreground mb-3 h-8 w-8 animate-spin' />
          <p className='text-muted-foreground text-sm'>Loading notifications</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className='flex flex-col items-center justify-center gap-3 py-16 text-center'>
          <Icons.alertCircle className='text-muted-foreground/40 mb-3 h-10 w-10' />
          <p className='text-muted-foreground text-sm'>{error}</p>
          <Button
            aria-label='Retry notifications load'
            type='button'
            variant='outline'
            size='sm'
            className='min-h-11'
            onClick={() => void loadNotifications(activeBrandId)}
            disabled={loading || !activeBrandId}
          >
            Retry
          </Button>
        </div>
      );
    }

    if (items.length === 0) {
      return (
        <div className='flex flex-col items-center justify-center py-16'>
          <Icons.notification className='text-muted-foreground/40 mb-3 h-10 w-10' />
          <p className='text-muted-foreground text-sm'>No notifications</p>
        </div>
      );
    }

    return (
      <div className='flex flex-col gap-2'>
        {items.map((notification) => (
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
    );
  };

  return (
    <PageContainer
      scrollable
      pageTitle='Notifications'
      pageDescription='View and manage all your notifications.'
      pageHeaderAction={
        count > 0 ? (
          <Button aria-label='Mark all notifications as read' variant='outline' size='sm' className='min-h-11' onClick={markAllAsRead}>
            Mark all as read
          </Button>
        ) : undefined
      }
    >
      <Tabs defaultValue='all'>
        <TabsList className='h-auto w-full flex-wrap justify-start'>
          <TabsTrigger className='min-h-11 flex-1 sm:flex-none' value='all'>All ({notifications.length})</TabsTrigger>
          <TabsTrigger className='min-h-11 flex-1 sm:flex-none' value='unread'>Unread ({unreadNotifications.length})</TabsTrigger>
          <TabsTrigger className='min-h-11 flex-1 sm:flex-none' value='read'>Read ({readNotifications.length})</TabsTrigger>
        </TabsList>
        <TabsContent value='all' className='mt-4'>
          {renderList(notifications)}
        </TabsContent>
        <TabsContent value='unread' className='mt-4'>
          {renderList(unreadNotifications)}
        </TabsContent>
        <TabsContent value='read' className='mt-4'>
          {renderList(readNotifications)}
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}
