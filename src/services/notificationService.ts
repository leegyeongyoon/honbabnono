// 브라우저 알림 서비스

export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: any;
  actions?: NotificationAction[];
}

class NotificationService {
  private permission: NotificationPermission = 'default';
  private isSupported: boolean = false;

  constructor() {
    this.isSupported = 'Notification' in window;
    if (this.isSupported) {
      this.permission = Notification.permission;
    }
  }

  /**
   * 알림 권한 요청
   */
  async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported) {
      console.warn('이 브라우저는 알림을 지원하지 않습니다.');
      return 'denied';
    }

    if (this.permission === 'default') {
      try {
        this.permission = await Notification.requestPermission();
      } catch (error) {
        console.error('알림 권한 요청 실패:', error);
        this.permission = 'denied';
      }
    }

    return this.permission;
  }

  /**
   * 알림 표시
   */
  async showNotification(payload: NotificationPayload): Promise<Notification | null> {
    if (!this.isSupported) {
      console.warn('이 브라우저는 알림을 지원하지 않습니다.');
      return null;
    }

    if (this.permission !== 'granted') {
      console.warn('알림 권한이 없습니다.');
      return null;
    }

    try {
      const notification = new Notification(payload.title, {
        body: payload.body,
        icon: payload.icon || '/favicon.ico',
        badge: payload.badge,
        tag: payload.tag,
        data: payload.data,
        requireInteraction: true, // 사용자 상호작용 필요
        silent: false,
      });

      // 알림 클릭 이벤트
      notification.onclick = (event) => {
        event.preventDefault();
        window.focus();
        
        // 모임 상세 페이지로 이동
        if (payload.data?.meetupId) {
          window.location.href = `/meetup/${payload.data.meetupId}`;
        }
        
        notification.close();
      };

      // 자동 닫기 (10초 후)
      setTimeout(() => {
        notification.close();
      }, 10000);

      return notification;
    } catch (error) {
      console.error('알림 표시 실패:', error);
      return null;
    }
  }

  /**
   * 모임 시작 30분 전 알림
   */
  async showMeetupReminderNotification(meetup: {
    id: string;
    title: string;
    location: string;
    time: string;
  }): Promise<Notification | null> {
    return this.showNotification({
      title: '🍚 혼밥노노 모임 알림',
      body: `"${meetup.title}" 모임이 30분 후에 시작됩니다!\n📍 ${meetup.location}`,
      icon: '/favicon.ico',
      tag: `meetup-reminder-${meetup.id}`,
      data: {
        type: 'meetup-reminder',
        meetupId: meetup.id,
      },
    });
  }

  /**
   * 모임 시작 알림
   */
  async showMeetupStartNotification(meetup: {
    id: string;
    title: string;
    location: string;
  }): Promise<Notification | null> {
    return this.showNotification({
      title: '🎉 모임이 시작되었습니다!',
      body: `"${meetup.title}" 모임이 지금 시작됩니다!\n📍 ${meetup.location}에서 확인해보세요.`,
      icon: '/favicon.ico',
      tag: `meetup-start-${meetup.id}`,
      data: {
        type: 'meetup-start',
        meetupId: meetup.id,
      },
    });
  }

  /**
   * 새 메시지 알림
   */
  async showNewMessageNotification(message: {
    senderName: string;
    content: string;
    meetupTitle: string;
    meetupId: string;
  }): Promise<Notification | null> {
    return this.showNotification({
      title: `💬 ${message.meetupTitle}`,
      body: `${message.senderName}: ${message.content}`,
      icon: '/favicon.ico',
      tag: `new-message-${message.meetupId}`,
      data: {
        type: 'new-message',
        meetupId: message.meetupId,
      },
    });
  }

  /**
   * 모임 참가 승인 알림
   */
  async showJoinApprovedNotification(meetup: {
    id: string;
    title: string;
    date: string;
    time: string;
  }): Promise<Notification | null> {
    return this.showNotification({
      title: '✅ 모임 참가가 승인되었습니다!',
      body: `"${meetup.title}" 모임에 참가하실 수 있습니다.\n📅 ${meetup.date} ${meetup.time}`,
      icon: '/favicon.ico',
      tag: `join-approved-${meetup.id}`,
      data: {
        type: 'join-approved',
        meetupId: meetup.id,
      },
    });
  }

  /**
   * 권한 상태 확인
   */
  getPermission(): NotificationPermission {
    return this.permission;
  }

  /**
   * 브라우저 지원 여부 확인
   */
  isNotificationSupported(): boolean {
    return this.isSupported;
  }

  /**
   * 모든 알림 닫기
   */
  closeAllNotifications(): void {
    // 태그별로 알림 닫기는 브라우저 API 제한으로 개별 참조가 필요
    console.log('알림 닫기 요청됨');
  }

  /**
   * 특정 태그의 알림 닫기
   */
  closeNotificationByTag(tag: string): void {
    // 개별 Notification 객체 참조가 필요한 작업
    console.log(`태그 ${tag}의 알림 닫기 요청됨`);
  }
}

// 싱글톤 인스턴스
export const notificationService = new NotificationService();

// 초기화 시 권한 요청 (선택사항)
export const initializeNotifications = async (): Promise<boolean> => {
  try {
    const permission = await notificationService.requestPermission();
    console.log('알림 권한:', permission);
    return permission === 'granted';
  } catch (error) {
    console.error('알림 초기화 실패:', error);
    return false;
  }
};

export default notificationService;