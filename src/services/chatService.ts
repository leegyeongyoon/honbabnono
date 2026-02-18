import io, { Socket } from 'socket.io-client';
import { API_HOSTS } from './apiClient';
import { localStorage } from '../utils/localStorageCompat';

// 타이핑 인디케이터 데이터 타입
export interface TypingData {
  userId: string;
  userName: string;
  roomId: number;
  isTyping: boolean;
  timestamp?: string;
}

// 온라인/오프라인 상태 데이터 타입
export interface UserStatusData {
  userId: string;
  timestamp: string;
}

// 읽음 상태 데이터 타입
export interface ReadReceiptData {
  userId: string;
  roomId: number | string;
  readAt: string;
}

// 채팅방 업데이트 데이터 타입
export interface ChatRoomUpdatedData {
  roomId: number | string;
  lastMessage: string;
  lastMessageTime: string;
}

// 참가자 퇴장 데이터 타입
export interface ParticipantLeftData {
  userId: string;
  roomId: number | string;
  timestamp: string;
}

// 온라인 사용자 조회 응답 타입
export interface OnlineUsersResponse {
  users: Array<{ userId: string; isOnline: boolean }>;
}

class ChatService {
  private socket: Socket | null = null;
  private isConnected = false;
  private isAuthenticated = false;
  private currentHostIndex = 0;
  private typingTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();

  async connect() {
    if (this.socket?.connected) {
      return this.socket;
    }

    // 프로덕션/개발 환경에 따른 Socket.IO URL을 런타임에 동적으로 설정
    const getSocketUrl = (): string => {
      if (process.env.REACT_APP_WS_URL) {
        return process.env.REACT_APP_WS_URL;
      }

      // Web 환경 체크
      if (typeof window !== 'undefined' && window.location && window.location.hostname) {
        return window.location.hostname === 'localhost'
          ? 'http://localhost:3001'
          : window.location.origin;
      }

      // React Native/SSR fallback - API_HOSTS의 첫 번째 호스트 사용
      return `http://${API_HOSTS[this.currentHostIndex]}:3001`;
    };

    // JWT 토큰을 handshake auth에 포함하여 연결 시 인증
    const token = await localStorage.getItem('token');

    this.socket = io(getSocketUrl(), {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      auth: token ? { token } : undefined,
    });

    this.socket.on('connect', () => {
      this.isConnected = true;
    });

    this.socket.on('authenticated', () => {
      this.isAuthenticated = true;
    });

    this.socket.on('auth_error', (_data: { message: string }) => {
      this.isAuthenticated = false;
    });

    this.socket.on('disconnect', () => {
      this.isConnected = false;
      this.isAuthenticated = false;
    });

    this.socket.on('connect_error', () => {
      this.isConnected = false;
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.isAuthenticated = false;
    }
    // 타이핑 타이머 정리
    this.typingTimers.forEach(timer => clearTimeout(timer));
    this.typingTimers.clear();
  }

  joinRoom(roomId: number) {
    if (this.socket?.connected) {
      this.socket.emit('join_room', roomId);
    }
  }

  leaveRoom(roomId: number) {
    if (this.socket?.connected) {
      this.socket.emit('leave_room', roomId);
    }
  }

  sendMessage(data: {
    roomId: number;
    message: string;
    senderId: string;
    senderName: string;
  }) {
    if (this.socket?.connected) {
      this.socket.emit('send_message', data);
    }
  }

  onNewMessage(callback: (message: any) => void) {
    if (this.socket) {
      this.socket.on('new_message', callback);
    }
  }

  offNewMessage() {
    if (this.socket) {
      this.socket.off('new_message');
    }
  }

  // --- 타이핑 인디케이터 ---

  /** 타이핑 시작 이벤트 전송 */
  sendTypingStart(roomId: number) {
    if (this.socket?.connected) {
      this.socket.emit('typing_start', { roomId });
    }
  }

  /** 타이핑 중지 이벤트 전송 */
  sendTypingStop(roomId: number) {
    if (this.socket?.connected) {
      this.socket.emit('typing_stop', { roomId });
    }
  }

  /**
   * 자동 타이핑 인디케이터 관리 (디바운스)
   * 입력할 때마다 호출하면, 자동으로 start/stop 이벤트를 관리
   */
  handleTyping(roomId: number) {
    const timerKey = `typing_${roomId}`;

    // 이전 타이머가 없으면 typing_start 전송
    if (!this.typingTimers.has(timerKey)) {
      this.sendTypingStart(roomId);
    } else {
      clearTimeout(this.typingTimers.get(timerKey)!);
    }

    // 2초 동안 추가 입력이 없으면 typing_stop 전송
    const timer = setTimeout(() => {
      this.sendTypingStop(roomId);
      this.typingTimers.delete(timerKey);
    }, 2000);

    this.typingTimers.set(timerKey, timer);
  }

  /** 레거시 sendTyping 메서드 (하위 호환성) */
  sendTyping(data: {
    roomId: number;
    userId: string;
    userName: string;
    isTyping: boolean;
  }) {
    if (this.socket?.connected) {
      this.socket.emit('typing', data);
    }
  }

  /** 타이핑 상태 변경 수신 */
  onUserTyping(callback: (data: TypingData) => void) {
    if (this.socket) {
      this.socket.on('user_typing', callback);
    }
  }

  offUserTyping() {
    if (this.socket) {
      this.socket.off('user_typing');
    }
  }

  // --- 온라인/오프라인 상태 ---

  /** 사용자 온라인 이벤트 수신 */
  onUserOnline(callback: (data: UserStatusData) => void) {
    if (this.socket) {
      this.socket.on('user_online', callback);
    }
  }

  offUserOnline() {
    if (this.socket) {
      this.socket.off('user_online');
    }
  }

  /** 사용자 오프라인 이벤트 수신 */
  onUserOffline(callback: (data: UserStatusData) => void) {
    if (this.socket) {
      this.socket.on('user_offline', callback);
    }
  }

  offUserOffline() {
    if (this.socket) {
      this.socket.off('user_offline');
    }
  }

  /** 특정 사용자들의 온라인 상태 조회 */
  getOnlineUsers(userIds?: string[]): void {
    if (this.socket?.connected) {
      this.socket.emit('get_online_users', { userIds });
    }
  }

  /** 온라인 사용자 목록 응답 수신 */
  onOnlineUsers(callback: (data: OnlineUsersResponse) => void) {
    if (this.socket) {
      this.socket.on('online_users', callback);
    }
  }

  offOnlineUsers() {
    if (this.socket) {
      this.socket.off('online_users');
    }
  }

  // --- 읽음 상태 실시간 동기화 ---

  /** 읽음 상태를 실시간 알림 (소켓 경유) */
  sendMarkRead(roomId: number) {
    if (this.socket?.connected) {
      this.socket.emit('mark_read', { roomId });
    }
  }

  /** 다른 사용자의 읽음 상태 수신 */
  onMessagesRead(callback: (data: ReadReceiptData) => void) {
    if (this.socket) {
      this.socket.on('messages_read', callback);
    }
  }

  offMessagesRead() {
    if (this.socket) {
      this.socket.off('messages_read');
    }
  }

  // --- 채팅방 업데이트 이벤트 ---

  /** 채팅방 업데이트 수신 (새 메시지로 인한 lastMessage 변경 등) */
  onChatRoomUpdated(callback: (data: ChatRoomUpdatedData) => void) {
    if (this.socket) {
      this.socket.on('chat_room_updated', callback);
    }
  }

  offChatRoomUpdated() {
    if (this.socket) {
      this.socket.off('chat_room_updated');
    }
  }

  /** 참가자 퇴장 이벤트 수신 */
  onParticipantLeft(callback: (data: ParticipantLeftData) => void) {
    if (this.socket) {
      this.socket.on('participant_left', callback);
    }
  }

  offParticipantLeft() {
    if (this.socket) {
      this.socket.off('participant_left');
    }
  }

  // --- 레거시 이벤트 (하위 호환성) ---

  // 읽지 않은 채팅 수 업데이트 이벤트 리스닝
  onUnreadCountUpdated(callback: (data: { unreadCount: number }) => void) {
    if (this.socket) {
      this.socket.on('unread-count-updated', callback);
    }
  }

  offUnreadCountUpdated(callback?: (data: { unreadCount: number }) => void) {
    if (this.socket) {
      if (callback) {
        this.socket.off('unread-count-updated', callback);
      } else {
        this.socket.off('unread-count-updated');
      }
    }
  }

  getConnectionStatus() {
    return this.isConnected;
  }

  getAuthenticationStatus() {
    return this.isAuthenticated;
  }

  /** 소켓 인스턴스 직접 접근 (고급 사용) */
  getSocket(): Socket | null {
    return this.socket;
  }
}

// 싱글톤 인스턴스
export const chatService = new ChatService();
export default chatService;