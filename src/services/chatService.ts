import io, { Socket } from 'socket.io-client';

class ChatService {
  private socket: Socket | null = null;
  private isConnected = false;

  connect() {
    if (this.socket?.connected) {
      return this.socket;
    }

    // 프로덕션/개발 환경에 따른 Socket.IO URL을 런타임에 동적으로 설정
    const getSocketUrl = (): string => {
      if (process.env.REACT_APP_WS_URL) {
        return process.env.REACT_APP_WS_URL;
      }
      
      if (typeof window !== 'undefined') {
        return window.location.hostname === 'localhost' 
          ? 'http://localhost:3001' 
          : window.location.origin;
      }
      
      // SSR fallback
      return '';
    };
    
    this.socket = io(getSocketUrl(), {
      transports: ['websocket', 'polling'],
      timeout: 20000,
    });

    this.socket.on('connect', () => {
      console.log('✅ WebSocket 연결 성공:', this.socket?.id);
      this.isConnected = true;
    });

    this.socket.on('disconnect', () => {
      console.log('❌ WebSocket 연결 해제');
      this.isConnected = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ WebSocket 연결 오류:', error);
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
      console.log(`👥 채팅방 ${roomId} 입장`);
    }
  }

  leaveRoom(roomId: number) {
    if (this.socket?.connected) {
      this.socket.emit('leave_room', roomId);
      console.log(`👋 채팅방 ${roomId} 퇴장`);
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

  getConnectionStatus() {
    return this.isConnected;
  }
}

// 싱글톤 인스턴스
export const chatService = new ChatService();
export default chatService;