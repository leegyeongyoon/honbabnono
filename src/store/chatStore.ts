import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import apiClient from '../services/apiClient';

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

interface ChatState {
  // State
  rooms: ChatRoom[];
  activeRoom: ChatRoom | null;
  unreadCount: number;
  loading: boolean;
  error: string | null;

  // Actions
  setRooms: (rooms: ChatRoom[]) => void;
  setActiveRoom: (room: ChatRoom | null) => void;
  updateUnreadCount: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // API Actions
  fetchRooms: (userId?: string) => Promise<void>;
  fetchMessages: (roomId: number, userId?: string) => Promise<ChatMessage[]>;
  sendMessage: (roomId: number, message: string, senderId: string, senderName: string) => Promise<ChatMessage | null>;
  markRoomAsRead: (roomId: number) => Promise<void>;
  clearStore: () => void;
}

export const useChatStore = create<ChatState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    rooms: [],
    activeRoom: null,
    unreadCount: 0,
    loading: false,
    error: null,

    // Basic setters
    setRooms: (rooms) => set({ rooms }),
    setActiveRoom: (room) => set({ activeRoom: room }),
    updateUnreadCount: () => {
      const { rooms } = get();
      const totalUnread = rooms.reduce((sum, room) => sum + room.unreadCount, 0);
      set({ unreadCount: totalUnread });
    },
    setLoading: (loading) => set({ loading }),
    setError: (error) => set({ error }),

    // API Actions
    fetchRooms: async (userId?: string) => {
      set({ loading: true, error: null });
      try {
        const params = userId ? `?userId=${userId}` : '';
        const response = await apiClient.get(`/chat/rooms${params}`);
        const data = response.data;

        if (data.success) {
          const rooms: ChatRoom[] = data.data || [];
          const totalUnread = rooms.reduce((sum, room) => sum + room.unreadCount, 0);
          set({ rooms, unreadCount: totalUnread, loading: false });
        } else {
          set({ error: data.message || '채팅방 목록 조회 실패', loading: false });
        }
      } catch (error) {
        set({ error: (error as Error).message, loading: false });
      }
    },

    fetchMessages: async (roomId: number, userId?: string) => {
      set({ loading: true, error: null });
      try {
        const params = userId ? `?userId=${userId}` : '';
        const response = await apiClient.get(`/chat/rooms/${roomId}/messages${params}`);
        const data = response.data;

        if (data.success) {
          const chatRoom = data.data?.chatRoom || data.chatRoom;
          const messages: ChatMessage[] = data.data?.messages || data.messages || [];

          if (chatRoom) {
            set({ activeRoom: chatRoom });
          }

          set({ loading: false });
          return messages;
        } else {
          set({ error: data.message || '메시지 조회 실패', loading: false });
          return [];
        }
      } catch (error) {
        set({ error: (error as Error).message, loading: false });
        return [];
      }
    },

    sendMessage: async (roomId: number, message: string, senderId: string, senderName: string) => {
      set({ error: null });
      try {
        const response = await apiClient.post(`/chat/rooms/${roomId}/messages`, {
          message,
          senderId,
          senderName,
        });
        const data = response.data;

        if (data.success) {
          const newMessage: ChatMessage = data.data || data.message;

          // 채팅방 목록에서 마지막 메시지 업데이트
          const { rooms } = get();
          const updatedRooms = rooms.map((room) =>
            room.id === roomId
              ? { ...room, lastMessage: message, lastTime: new Date().toISOString() }
              : room
          );
          set({ rooms: updatedRooms });

          return newMessage;
        } else {
          set({ error: data.message || '메시지 전송 실패' });
          return null;
        }
      } catch (error) {
        set({ error: (error as Error).message });
        return null;
      }
    },

    markRoomAsRead: async (roomId: number) => {
      try {
        await apiClient.post(`/chat/rooms/${roomId}/read`);

        // 로컬 상태 업데이트
        const { rooms } = get();
        const updatedRooms = rooms.map((room) =>
          room.id === roomId ? { ...room, unreadCount: 0 } : room
        );
        const totalUnread = updatedRooms.reduce((sum, room) => sum + room.unreadCount, 0);
        set({ rooms: updatedRooms, unreadCount: totalUnread });
      } catch (error) {
        // 읽음 처리 실패는 조용히 무시 (UX에 영향 없음)
      }
    },

    clearStore: () => set({
      rooms: [],
      activeRoom: null,
      unreadCount: 0,
      loading: false,
      error: null,
    }),
  }))
);
