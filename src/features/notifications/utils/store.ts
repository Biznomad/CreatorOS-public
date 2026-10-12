import { create } from 'zustand';
import type { NotificationStatus, NotificationAction } from '@/components/ui/notification-card';
import { useBrandStore } from '@/components/org-switcher';
import { withLocalQaMarker } from '@/lib/whitelabel-api';

const API_BASE = '/api/proxy';

export type Notification = {
  id: string;
  title: string;
  body: string;
  status: NotificationStatus;
  createdAt: string;
  actions?: NotificationAction[];
};

type NotificationState = {
  notifications: Notification[];
  loading: boolean;
  error: string | null;
  loadNotifications: (brandId: string) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  removeNotification: (id: string) => Promise<void>;
  addNotification: (notification: Omit<Notification, 'status'>) => void;
  unreadCount: () => number;
};

async function requireOk(response: Response, fallback: string) {
  if (response.ok) return;
  const data = await response.json().catch(() => ({})) as { detail?: string; error?: string };
  throw new Error(data.detail || data.error || fallback);
}

export const useNotificationStore = create<NotificationState>()(
  (set, get) => ({
    notifications: [],
    loading: false,
    error: null,

    loadNotifications: async (brandId) => {
      if (!brandId) {
        set({ notifications: [], loading: false, error: null });
        return;
      }

      set({ loading: true, error: null });
      try {
        const res = await fetch(withLocalQaMarker(`${API_BASE}/api/notifications?brand_id=${encodeURIComponent(brandId)}`));
        if (!res.ok) throw new Error(`${res.status}`);
        const data = (await res.json()) as Notification[];
        const previousStatuses = new Map(get().notifications.map((notification) => [notification.id, notification.status]));
        const notifications = (Array.isArray(data) ? data : [])
          .filter((notification) => notification.id)
          .map((notification) => ({
            ...notification,
            status: notification.status || previousStatuses.get(notification.id) || ('unread' as NotificationStatus)
          }));
        set({ notifications, loading: false, error: null });
      } catch {
        set({
          notifications: [],
          loading: false,
          error: 'Unable to load notifications'
        });
      }
    },

    markAsRead: async (id) => {
      const previous = get().notifications;
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === id ? { ...n, status: 'read' as const } : n
        )
      }));
      const brandId = useBrandStore.getState().activeBrand.id;
      if (!brandId) return;
      try {
        const response = await fetch(withLocalQaMarker(`${API_BASE}/api/notifications/${encodeURIComponent(id)}`), {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ brand_id: brandId, status: 'read' })
        });
        await requireOk(response, 'Could not mark notification as read');
      } catch (error) {
        set({
          notifications: previous,
          error: error instanceof Error ? error.message : 'Could not mark notification as read'
        });
      }
    },

    markAllAsRead: async () => {
      const previous = get().notifications;
      const notificationIds = get().notifications
        .filter((notification) => notification.status === 'unread')
        .map((notification) => notification.id);
      set((state) => ({
        notifications: state.notifications.map((n) => ({
          ...n,
          status: 'read' as const
        }))
      }));
      const brandId = useBrandStore.getState().activeBrand.id;
      if (!brandId || notificationIds.length === 0) return;
      try {
        const response = await fetch(withLocalQaMarker(`${API_BASE}/api/notifications/read`), {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ brand_id: brandId, notification_ids: notificationIds, status: 'read' })
        });
        await requireOk(response, 'Could not mark notifications as read');
      } catch (error) {
        set({
          notifications: previous,
          error: error instanceof Error ? error.message : 'Could not mark notifications as read'
        });
      }
    },

    removeNotification: async (id) => {
      const previous = get().notifications;
      const brandId = useBrandStore.getState().activeBrand.id;
      set((state) => ({
        notifications: state.notifications.filter((n) => n.id !== id)
      }));
      if (!brandId) return;
      try {
        const response = await fetch(withLocalQaMarker(`${API_BASE}/api/notifications/${encodeURIComponent(id)}`), {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ brand_id: brandId, dismissed: true })
        });
        await requireOk(response, 'Could not dismiss notification');
      } catch (error) {
        set({
          notifications: previous,
          error: error instanceof Error ? error.message : 'Could not dismiss notification'
        });
      }
    },

    addNotification: (notification) =>
      set((state) => ({
        notifications: [{ ...notification, status: 'unread' as const }, ...state.notifications]
      })),

    unreadCount: () => get().notifications.filter((n) => n.status === 'unread').length
  })
);
