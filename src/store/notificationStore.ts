import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import apiClient from '../services/apiClient';
import { Notification, NotificationType } from '../types/notification';

interface NotificationPagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface NotificationState {
  // State
  notifications: Notification[];
  unreadCount: number;
  pagination: NotificationPagination | null;
  loading: boolean;
  error: string | null;

  // Actions
  setNotifications: (notifications: Notification[]) => void;
  setUnreadCount: (count: number) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // API Actions
  fetchNotifications: (page?: number, limit?: number, unreadOnly?: boolean) => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  markAsRead: (notificationId: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: number) => Promise<void>;

  // Utility Actions
  getNotificationsByType: (type: NotificationType) => Notification[];
  clearStore: () => void;
}

export const useNotificationStore = create<NotificationState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    notifications: [],
    unreadCount: 0,
    pagination: null,
    loading: false,
    error: null,

    // Basic setters
    setNotifications: (notifications) => set({ notifications }),
    setUnreadCount: (count) => set({ unreadCount: count }),
    setLoading: (loading) => set({ loading }),
    setError: (error) => set({ error }),

    // API Actions
    fetchNotifications: async (page = 1, limit = 20, unreadOnly = false) => {
      set({ loading: true, error: null });
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: limit.toString(),
          unreadOnly: unreadOnly.toString(),
        });

        const response = await apiClient.get(`/notifications?${params}`);
        const data = response.data;

        const notifications: Notification[] = data.notifications || [];
        const pagination: NotificationPagination = data.pagination || null;

        set({ notifications, pagination, loading: false });
      } catch (error) {
        set({ error: (error as Error).message, loading: false });
      }
    },

    fetchUnreadCount: async () => {
      try {
        const response = await apiClient.get('/notifications/unread-count');
        const data = response.data;
        set({ unreadCount: data.unreadCount || 0 });
      } catch (error) {
        set({ error: (error as Error).message });
      }
    },

    markAsRead: async (notificationId: number) => {
      try {
        await apiClient.put(`/notifications/${notificationId}/read`);

        // 로컬 상태 업데이트
        const { notifications, unreadCount } = get();
        const updatedNotifications = notifications.map((n) =>
          n.id === notificationId ? { ...n, isRead: true } : n
        );
        const wasUnread = notifications.find((n) => n.id === notificationId && !n.isRead);

        set({
          notifications: updatedNotifications,
          unreadCount: wasUnread ? Math.max(0, unreadCount - 1) : unreadCount,
        });
      } catch (error) {
        set({ error: (error as Error).message });
      }
    },

    markAllAsRead: async () => {
      try {
        await apiClient.put('/notifications/mark-all-read');

        // 로컬 상태 업데이트
        const { notifications } = get();
        const updatedNotifications = notifications.map((n) => ({ ...n, isRead: true }));

        set({ notifications: updatedNotifications, unreadCount: 0 });
      } catch (error) {
        set({ error: (error as Error).message });
      }
    },

    deleteNotification: async (notificationId: number) => {
      try {
        await apiClient.delete(`/notifications/${notificationId}`);

        // 로컬 상태에서 제거
        const { notifications, unreadCount } = get();
        const target = notifications.find((n) => n.id === notificationId);
        const filteredNotifications = notifications.filter((n) => n.id !== notificationId);

        set({
          notifications: filteredNotifications,
          unreadCount: target && !target.isRead ? Math.max(0, unreadCount - 1) : unreadCount,
        });
      } catch (error) {
        set({ error: (error as Error).message });
      }
    },

    // Utility functions
    getNotificationsByType: (type: NotificationType) => {
      const { notifications } = get();
      return notifications.filter((n) => n.type === type);
    },

    clearStore: () => set({
      notifications: [],
      unreadCount: 0,
      pagination: null,
      loading: false,
      error: null,
    }),
  }))
);
