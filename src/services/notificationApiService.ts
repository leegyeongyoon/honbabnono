import { 
  Notification, 
  NotificationSettings, 
  NotificationListResponse, 
  NotificationUnreadCountResponse 
} from '../types/notification';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

class NotificationApiService {
  private async request(endpoint: string, options?: RequestInit) {
    const token = localStorage.getItem('token');
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options?.headers,
      },
      ...options,
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async getNotifications(page = 1, limit = 20, unreadOnly = false): Promise<NotificationListResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      unreadOnly: unreadOnly.toString()
    });
    
    return this.request(`/notifications?${params}`);
  }

  async getUnreadCount(): Promise<NotificationUnreadCountResponse> {
    return this.request('/notifications/unread-count');
  }

  async markAsRead(notificationId: number): Promise<{ message: string }> {
    return this.request(`/notifications/${notificationId}/read`, {
      method: 'PUT',
    });
  }

  async markAllAsRead(): Promise<{ message: string }> {
    return this.request('/notifications/mark-all-read', {
      method: 'PUT',
    });
  }

  async deleteNotification(notificationId: number): Promise<{ message: string }> {
    return this.request(`/notifications/${notificationId}`, {
      method: 'DELETE',
    });
  }

  async getNotificationSettings(): Promise<NotificationSettings> {
    return this.request('/notifications/settings');
  }

  async updateNotificationSettings(settings: Partial<NotificationSettings>): Promise<NotificationSettings> {
    return this.request('/notifications/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  }
}

export default new NotificationApiService();