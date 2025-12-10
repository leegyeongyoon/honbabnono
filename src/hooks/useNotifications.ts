import { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { Notification } from '../types/notification';
import notificationApiService from '../services/notificationApiService';

const useNotifications = (userId?: string) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!userId) return;

    // WebSocket 연결
    const newSocket = io('http://localhost:3001', {
      transports: ['websocket', 'polling'],
    });

    newSocket.on('connect', () => {
      console.log('WebSocket 연결됨');
      setConnected(true);
      
      // 사용자 인증
      newSocket.emit('authenticate', userId);
    });

    newSocket.on('disconnect', () => {
      console.log('WebSocket 연결 해제됨');
      setConnected(false);
    });

    // 새 알림 수신
    newSocket.on('new_notification', (notification: Notification) => {
      console.log('새 알림 수신:', notification);
      
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
        console.warn('브라우저 알림 표시 실패:', error);
      }
    });

    newSocket.on('connect_error', (error) => {
      console.error('WebSocket 연결 오류:', error);
      setConnected(false);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [userId]);

  // 읽지 않은 알림 개수 조회
  const fetchUnreadCount = async () => {
    try {
      const response = await notificationApiService.getUnreadCount();
      setUnreadCount(response.unreadCount);
    } catch (error) {
      console.error('읽지 않은 알림 개수 조회 실패:', error);
    }
  };

  // 브라우저 알림 권한 요청
  const requestNotificationPermission = async () => {
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
      console.warn('브라우저 알림 권한 요청 실패:', error);
    }
    return false;
  };

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
      console.error('알림 읽음 처리 실패:', error);
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
      console.error('모든 알림 읽음 처리 실패:', error);
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