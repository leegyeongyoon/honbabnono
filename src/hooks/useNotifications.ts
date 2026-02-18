import { useState, useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import notificationApiService from '../services/notificationApiService';

// Local type definition for compatibility
type Notification = {
  id: number;
  userId: string;
  type: string;
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
};

const useNotifications = (userId?: string) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!userId) {return;}

    // WebSocket 연결
    const newSocket = io('http://localhost:3001', {
      transports: ['websocket', 'polling'],
    });

    newSocket.on('connect', () => {
      setConnected(true);
      
      // 사용자 인증
      newSocket.emit('authenticate', userId);
    });

    newSocket.on('disconnect', () => {
      setConnected(false);
    });

    // 새 알림 수신
    newSocket.on('new_notification', (notification: Notification) => {
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);
      
      // 브라우저 알림 표시 (권한이 있는 경우)
      try {
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(notification.title, {
            body: notification.message,
            icon: '/favicon.ico'
          });
        }
      } catch (error) {
        // silently handle error
      }
    });

    newSocket.on('connect_error', (error) => {
      setConnected(false);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [userId]);

  // 읽지 않은 알림 개수 조회
  const fetchUnreadCount = useCallback(async () => {
    // 인증되지 않은 사용자는 알림 개수 조회하지 않음
    if (!userId) {
      setUnreadCount(0);
      return;
    }

    try {
      const response = await notificationApiService.getUnreadCount();
      setUnreadCount(response.unreadCount);
    } catch (error) {
      // 401 에러인 경우 로그를 출력하지 않음 (토큰이 없는 정상적인 상황)
      if (error && typeof error === 'object' && 'response' in error) {
        const err = error as any;
        if (err.response?.status === 401) {
          setUnreadCount(0);
          return;
        }
      }
      // silently handle error
    }
  }, [userId]);

  // 브라우저 알림 권한 요청
  const requestNotificationPermission = useCallback(async () => {
    try {
      if ('Notification' in window) {
        if (typeof Notification.requestPermission === 'function') {
          const permission = await Notification.requestPermission();
          return permission === 'granted';
        } else if (typeof Notification.permission === 'string') {
          // 이미 권한이 설정된 경우
          return Notification.permission === 'granted';
        }
      }
    } catch (error) {
      // silently handle error
    }
    return false;
  }, []);

  // 알림을 읽음으로 표시
  const markAsRead = async (notificationId: number) => {
    try {
      await notificationApiService.markAsRead(notificationId);
      setNotifications(prev =>
        prev.map(notification =>
          notification.id === notificationId
            ? { ...notification, isRead: true }
            : notification
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      // silently handle error
    }
  };

  // 모든 알림을 읽음으로 표시
  const markAllAsRead = async () => {
    try {
      await notificationApiService.markAllAsRead();
      setNotifications(prev =>
        prev.map(notification => ({ ...notification, isRead: true }))
      );
      setUnreadCount(0);
    } catch (error) {
      // silently handle error
    }
  };

  return {
    socket,
    notifications,
    unreadCount,
    connected,
    fetchUnreadCount,
    requestNotificationPermission,
    markAsRead,
    markAllAsRead,
  };
};

export default useNotifications;