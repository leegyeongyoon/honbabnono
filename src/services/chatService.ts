import io, { Socket } from 'socket.io-client';
import { API_HOSTS } from './apiClient';

class ChatService {
  private socket: Socket | null = null;
  private isConnected = false;
  private currentHostIndex = 0;

  connect() {
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

    this.socket = io(getSocketUrl(), {
      transports: ['websocket', 'polling'],
      timeout: 20000,
    });

    this.socket.on('connect', () => {
      this.isConnected = true;

      // 자동 인증
      const token = localStorage.getItem('token');
      if (token) {
        this.socket?.emit('authenticate', token);
      }
    });

    this.socket.on('disconnect', () => {
      this.isConnected = false;
    });

    this.socket.on('connect_error', (error) => {
      this.isConnected = false;
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
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

  onUserTyping(callback: (data: {
    userId: string;
    userName: string;
    isTyping: boolean;
  }) => void) {
    if (this.socket) {
      this.socket.on('user_typing', callback);
    }
  }

  offUserTyping() {
    if (this.socket) {
      this.socket.off('user_typing');
    }
  }

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
}

// 싱글톤 인스턴스
export const chatService = new ChatService();
export default chatService;