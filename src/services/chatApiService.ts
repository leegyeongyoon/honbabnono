import { localStorage } from '../utils/localStorageCompat';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

export interface ChatRoom {
  id: number;
  type: 'meetup' | 'direct';
  meetupId?: number;
  title: string;
  participants: string[];
  lastMessage: string;
  lastTime: string;
  unreadCount: number;
  isActive?: boolean;
  isOnline?: boolean;
}

export interface ChatMessage {
  id: number;
  chatRoomId: number;
  senderId: string;
  senderName: string;
  message: string;
  timestamp: string;
  isMe: boolean;
  isRead: boolean;
  profileImage?: string;
  riceIndex?: number;
}

export interface SendMessageRequest {
  message: string;
  senderId: string;
  senderName: string;
}

export interface CreateChatRoomRequest {
  meetupId?: number;
  title: string;
  userId: string;
  participantId?: string;
  participantName?: string;
  userName?: string;
}

class ChatApiService {
  public baseURL = API_BASE_URL + '/chat';

  // 채팅방 목록 조회
  async getChatRooms(userId: string = 'user1'): Promise<ChatRoom[]> {
    try {
      const token = await localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/chat/rooms?userId=${userId}`, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
        },
      });
      const data = await response.json();
      
      if (data.success) {
        return data.data;
      } else {
        throw new Error(data.message || '채팅방 목록 조회 실패');
      }
    } catch (error) {
      throw error;
    }
  }

  // 특정 채팅방의 메시지 조회
  async getChatMessages(roomId: number, userId: string = 'user1'): Promise<{
    chatRoom: ChatRoom;
    messages: ChatMessage[];
  }> {
    try {
      const token = await localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/chat/rooms/${roomId}/messages?userId=${userId}`, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
        },
      });
      const data = await response.json();

      if (data.success) {
        // 서버가 { success, chatRoom, messages } 형태로 반환
        return {
          chatRoom: data.data?.chatRoom || data.chatRoom,
          messages: data.data?.messages || data.messages || [],
        };
      } else {
        throw new Error(data.message || '메시지 조회 실패');
      }
    } catch (error) {
      throw error;
    }
  }

  // 메시지 전송
  async sendMessage(roomId: number, messageData: SendMessageRequest, userId: string = 'user1'): Promise<ChatMessage> {
    try {
      const token = await localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/chat/rooms/${roomId}/messages?userId=${userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify(messageData),
      });

      const data = await response.json();

      if (data.success) {
        // 서버가 { success, message: {...} } 형태로 반환
        return data.data || data.message;
      } else {
        throw new Error(data.message || '메시지 전송 실패');
      }
    } catch (error) {
      throw error;
    }
  }

  // 모임 채팅방 생성
  async createMeetupChatRoom(roomData: CreateChatRoomRequest): Promise<ChatRoom> {
    try {
      const token = await localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/chat/rooms/meetup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify(roomData),
      });
      
      const data = await response.json();
      
      if (data.success) {
        return data.data;
      } else {
        throw new Error(data.message || '채팅방 생성 실패');
      }
    } catch (error) {
      throw error;
    }
  }

  // 1:1 채팅방 생성
  async createDirectChatRoom(roomData: CreateChatRoomRequest): Promise<ChatRoom> {
    try {
      const token = await localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/chat/rooms/direct`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify(roomData),
      });
      
      const data = await response.json();
      
      if (data.success) {
        return data.data;
      } else {
        throw new Error(data.message || '채팅방 생성 실패');
      }
    } catch (error) {
      throw error;
    }
  }

  // 모임 채팅방에 사용자 추가
  async addUserToMeetupChatRoom(meetupId: number, userId: string): Promise<ChatRoom> {
    try {
      const token = await localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/chat/rooms/meetup/${meetupId}/add-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({ userId }),
      });

      const data = await response.json();

      if (data.success) {
        return data.data;
      } else {
        throw new Error(data.message || '사용자 추가 실패');
      }
    } catch (error) {
      throw error;
    }
  }

  // 채팅방 읽음 처리
  async markAsRead(roomId: number): Promise<void> {
    try {
      const token = await localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/chat/rooms/${roomId}/read`, {
        method: 'POST',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
        },
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || '읽음 처리 실패');
      }
    } catch (error) {
      // 읽음 처리 실패는 조용히 무시 (UX에 영향 없음)
    }
  }
}

// 싱글톤 인스턴스
export const chatApiService = new ChatApiService();
export default chatApiService;