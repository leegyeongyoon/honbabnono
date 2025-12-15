export type NotificationType = 
  | 'meetup_start'
  | 'meetup_reminder'
  | 'attendance_check'
  | 'chat_message'
  | 'review_request'
  | 'point_penalty'
  | 'point_refund'
  | 'meetup_join_request'
  | 'meetup_join_approved'
  | 'meetup_join_rejected'
  | 'meetup_cancelled'
  | 'meetup_updated'
  | 'new_chat_room'
  | 'direct_chat_request'
  | 'system_announcement'
  | 'app_update'
  | 'safety_check'
  | 'payment_success'
  | 'payment_failed'
  | 'weekly_summary';

export interface Notification {
  id: number;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  meetupId?: string;
  relatedUserId?: string;
  data?: any;
  isRead: boolean;
  isSent: boolean;
  scheduledAt?: string;
  sentAt?: string;
  createdAt: string;
  updatedAt: string;
  meetup?: {
    id: string;
    title: string;
    location: string;
  };
  relatedUser?: {
    id: string;
    name: string;
    profileImage?: string;
  };
}

export interface NotificationSettings {
  id?: number;
  userId: string;
  pushNotifications: boolean;
  emailNotifications: boolean;
  meetupReminders: boolean;
  chatNotifications: boolean;
  marketingNotifications: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface NotificationListResponse {
  notifications: Notification[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface NotificationUnreadCountResponse {
  unreadCount: number;
}

