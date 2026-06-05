import apiClient from './apiClient';

// ============================================================
// Reservation Chat API Service — 잇테이블 v2 매장 문의 (1:1)
// ============================================================

export interface ChatRoom {
  id: string;
  reservationId: string;
  restaurantId: string;
  restaurantName?: string;
  restaurantImage?: string;
  reservationDate?: string;
  reservationTime?: string;
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount?: number;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  senderRole: 'customer' | 'merchant';
  senderName?: string;
  message: string;
  createdAt: string;
}

const mapRoom = (r: any): ChatRoom => ({
  id: r.id,
  reservationId: r.reservation_id ?? r.reservationId,
  restaurantId: r.restaurant_id ?? r.restaurantId,
  restaurantName: r.restaurant_name ?? r.restaurantName,
  restaurantImage: r.restaurant_image ?? r.restaurantImage,
  reservationDate: r.reservation_date ?? r.reservationDate,
  reservationTime: r.reservation_time ?? r.reservationTime,
  lastMessage: r.last_message ?? r.lastMessage,
  lastMessageAt: r.last_message_at ?? r.lastMessageAt,
  unreadCount: r.unread_count ?? r.unreadCount ?? 0,
});

const mapMessage = (m: any): ChatMessage => ({
  id: m.id,
  roomId: m.room_id ?? m.roomId,
  senderId: m.sender_id ?? m.senderId,
  senderRole: m.sender_role ?? m.senderRole,
  senderName: m.sender_name ?? m.senderName,
  message: m.message,
  createdAt: m.created_at ?? m.createdAt,
});

/** 예약 기반 채팅방 생성/조회 (get-or-create) */
const createOrGetRoom = async (reservationId: string): Promise<ChatRoom> => {
  const response = await apiClient.post('/reservation-chat/rooms', {
    reservation_id: reservationId,
  });
  const data = response.data.data ?? response.data;
  return mapRoom(data.room ?? data);
};

const getMyRooms = async (): Promise<ChatRoom[]> => {
  const response = await apiClient.get('/reservation-chat/rooms/my');
  const data = response.data.data ?? response.data;
  return (data.rooms ?? []).map(mapRoom);
};

const getMessages = async (roomId: string): Promise<ChatMessage[]> => {
  const response = await apiClient.get(`/reservation-chat/rooms/${roomId}/messages`);
  const data = response.data.data ?? response.data;
  return (data.messages ?? []).map(mapMessage);
};

const sendMessage = async (roomId: string, message: string): Promise<ChatMessage> => {
  const response = await apiClient.post(`/reservation-chat/rooms/${roomId}/messages`, { message });
  const data = response.data.data ?? response.data;
  return mapMessage(data.message ?? data);
};

const markRead = async (roomId: string): Promise<void> => {
  await apiClient.post(`/reservation-chat/rooms/${roomId}/read`);
};

const getUnreadCount = async (): Promise<number> => {
  const response = await apiClient.get('/reservation-chat/unread-count');
  const data = response.data.data ?? response.data;
  return data.unread ?? 0;
};

const reservationChatApiService = {
  createOrGetRoom,
  getMyRooms,
  getMessages,
  sendMessage,
  markRead,
  getUnreadCount,
};

export default reservationChatApiService;
