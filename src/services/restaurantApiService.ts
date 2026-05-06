import apiClient from './apiClient';

// ============================================================
// Restaurant API Service — 잇테이블 v2
// ============================================================

// ---------- Types ----------

export interface Restaurant {
  id: string;
  name: string;
  description?: string;
  category?: string;
  phone?: string;
  address: string;
  addressDetail?: string;
  latitude?: number;
  longitude?: number;
  imageUrl?: string;
  images?: string[];
  operatingHours?: any;
  seatCount?: number;
  isActive?: boolean;
  avgRating?: number;
  reviewCount?: number;
}

export interface MenuItem {
  id: string;
  restaurantId: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  category?: string;
  isAvailable?: boolean;
  options?: any[];
}

export interface TimeSlot {
  time: string;
  available: boolean;
  remainingSeats?: number;
}

export interface Reservation {
  id: string;
  restaurantId: string;
  restaurantName?: string;
  reservationDate: string;
  reservationTime: string;
  partySize: number;
  status: string;
  arrivalStatus?: string;
  qrCode?: string;
  checkedInAt?: string;
  specialRequest?: string;
  order?: any;
  payment?: any;
}

export interface Order {
  id: string;
  reservationId: string;
  items: any[];
  totalAmount: number;
  status: string;
  createdAt?: string;
}

export interface Payment {
  id: string;
  reservationId: string;
  orderId?: string;
  amount: number;
  paymentMethod?: string;
  status: string;
  merchantUid?: string;
  impUid?: string;
  refundAmount?: number;
  paidAt?: string;
}

// ---------- snake_case → camelCase 변환 ----------

const mapRestaurant = (r: any): Restaurant => ({
  id: r.id,
  name: r.name,
  description: r.description,
  category: r.category,
  phone: r.phone,
  address: r.address,
  addressDetail: r.address_detail ?? r.addressDetail,
  latitude: r.latitude ? Number(r.latitude) : undefined,
  longitude: r.longitude ? Number(r.longitude) : undefined,
  imageUrl: r.image_url ?? r.imageUrl,
  images: r.images,
  operatingHours: r.operating_hours ?? r.operatingHours,
  seatCount: r.seat_count ?? r.seatCount,
  isActive: r.is_active ?? r.isActive,
  avgRating: r.avg_rating != null ? Number(r.avg_rating) : r.avgRating,
  reviewCount: r.review_count != null ? Number(r.review_count) : r.reviewCount,
});

const mapMenuItem = (m: any): MenuItem => ({
  id: m.id,
  restaurantId: m.restaurant_id ?? m.restaurantId,
  name: m.name,
  description: m.description,
  price: m.price,
  imageUrl: m.image_url ?? m.imageUrl,
  category: m.category_name ?? m.category,
  isAvailable: m.is_active ?? m.isAvailable ?? true,
  options: m.options,
});

// ---------- Restaurants ----------

// 카테고리 ID → DB에 저장된 한글 이름으로 매핑
const CATEGORY_MAP: Record<string, string> = {
  shabu: '샤브샤브',
  meat: '고깃집',
  stew: '전골/찜',
  hotpot: '훠궈',
  course: '코스요리',
  korean: '한식',
  japanese: '일식',
  chinese: '중식',
  western: '양식',
  buffet: '뷔페',
};

const getRestaurants = async (params?: {
  category?: string;
  page?: number;
  limit?: number;
}): Promise<{ restaurants: Restaurant[]; pagination?: any }> => {
  const queryParams = params ? {
    ...params,
    category: params.category ? (CATEGORY_MAP[params.category] || params.category) : undefined,
  } : undefined;
  const response = await apiClient.get('/restaurants', { params: queryParams });
  const data = response.data.data ?? response.data;
  const restaurants = (data.restaurants || []).map(mapRestaurant);
  return { restaurants, pagination: data.pagination };
};

const getNearbyRestaurants = async (
  lat: number,
  lng: number,
  radius: number = 3000,
): Promise<Restaurant[]> => {
  const response = await apiClient.get('/restaurants/nearby', {
    params: { lat, lng, radius },
  });
  const data = response.data.data ?? response.data;
  const list = data.restaurants || data;
  return Array.isArray(list) ? list.map(mapRestaurant) : [];
};

const searchRestaurants = async (keyword: string): Promise<Restaurant[]> => {
  const response = await apiClient.get('/restaurants/search', {
    params: { keyword },
  });
  const data = response.data.data ?? response.data;
  const list = data.restaurants || data;
  return Array.isArray(list) ? list.map(mapRestaurant) : [];
};

const getRestaurantById = async (id: string): Promise<Restaurant & { menus?: MenuItem[]; menusByCategory?: Record<string, MenuItem[]>; timeSlots?: any[] }> => {
  const response = await apiClient.get(`/restaurants/${id}`);
  const data = response.data.data ?? response.data;
  const restaurant = mapRestaurant(data);
  const menus = Array.isArray(data.menus) ? data.menus.map(mapMenuItem) : undefined;
  const menusByCategory = data.menusByCategory
    ? Object.fromEntries(
        Object.entries(data.menusByCategory).map(([cat, items]) => [
          cat,
          (items as any[]).map(mapMenuItem),
        ]),
      )
    : undefined;
  return { ...restaurant, menus, menusByCategory, timeSlots: data.timeSlots };
};

const getTimeSlots = async (
  restaurantId: string,
  date: string,
): Promise<TimeSlot[]> => {
  const response = await apiClient.get(
    `/restaurants/${restaurantId}/time-slots`,
    { params: { date } },
  );
  const data = response.data.data ?? response.data;
  const list = Array.isArray(data) ? data : [];
  return list.map((s: any) => {
    // slot_time은 "11:30:00" 형태 → "11:30"으로 변환
    const rawTime = s.slot_time ?? s.time ?? '';
    const time = rawTime.length > 5 ? rawTime.slice(0, 5) : rawTime;
    return {
      time,
      available: s.is_active !== false && (s.current_reservations ?? 0) < (s.max_reservations ?? 5),
      remainingSeats: (s.max_reservations ?? 5) - (s.current_reservations ?? 0),
    };
  });
};

const toggleFavorite = async (
  restaurantId: string,
): Promise<{ favorited: boolean }> => {
  const response = await apiClient.post(
    `/restaurants/${restaurantId}/favorite`,
  );
  const data = response.data.data ?? response.data;
  // 백엔드는 isFavorited, 프론트는 favorited 사용
  return { favorited: data.isFavorited ?? data.favorited ?? false };
};

const recordView = async (restaurantId: string): Promise<void> => {
  await apiClient.post(`/restaurants/${restaurantId}/view`);
};

const getFavorites = async (): Promise<Restaurant[]> => {
  const response = await apiClient.get('/restaurants/favorites');
  const data = response.data.data ?? response.data;
  const list = data.restaurants || data;
  return Array.isArray(list) ? list.map(mapRestaurant) : [];
};

const getRecentViews = async (): Promise<Restaurant[]> => {
  const response = await apiClient.get('/restaurants/recent-views');
  const data = response.data.data ?? response.data;
  const list = data.restaurants || data;
  return Array.isArray(list) ? list.map(mapRestaurant) : [];
};

// ---------- Menus ----------

const getMenusByRestaurant = async (
  restaurantId: string,
): Promise<MenuItem[]> => {
  const response = await apiClient.get(
    `/menus/restaurant/${restaurantId}`,
  );
  const data = response.data.data ?? response.data;

  // 응답이 {categories: [{category_name, menus: [...]}]} 형태인 경우
  if (data.categories && Array.isArray(data.categories)) {
    const allMenus: any[] = [];
    for (const cat of data.categories) {
      const catMenus = cat.menus || [];
      for (const m of catMenus) {
        allMenus.push({ ...m, category_name: m.category_name || cat.category_name });
      }
    }
    return allMenus.map(mapMenuItem);
  }

  const list = data.menus || data;
  return Array.isArray(list) ? list.map(mapMenuItem) : [];
};

const getMenuById = async (id: string): Promise<MenuItem> => {
  const response = await apiClient.get(`/menus/${id}`);
  const data = response.data.data ?? response.data;
  return mapMenuItem(data);
};

// ---------- Reservations ----------

const getMyReservations = async (
  status?: string,
): Promise<Reservation[]> => {
  const response = await apiClient.get('/reservations/my', {
    params: status ? { status } : undefined,
  });
  const data = response.data.data ?? response.data;
  // 백엔드는 {reservations: [...]} 형태로 반환
  const list = data.reservations || data;
  return Array.isArray(list) ? list.map((r: any) => ({
    id: r.id,
    restaurantId: r.restaurant_id ?? r.restaurantId,
    restaurantName: r.restaurant_name ?? r.restaurantName,
    reservationDate: r.reservation_date ?? r.reservationDate,
    reservationTime: r.reservation_time ?? r.reservationTime,
    partySize: r.party_size ?? r.partySize,
    status: r.status,
    arrivalStatus: r.arrival_status ?? r.arrivalStatus,
    qrCode: r.qr_code ?? r.qrCode,
    checkedInAt: r.checked_in_at ?? r.checkedInAt,
    specialRequest: r.special_request ?? r.specialRequest,
    order: r.order,
    payment: r.payment,
  })) : [];
};

const getReservationById = async (id: string): Promise<Reservation> => {
  const response = await apiClient.get(`/reservations/${id}`);
  const data = response.data.data ?? response.data;
  // 백엔드는 {reservation, order} 형태로 반환
  const r = data.reservation || data;
  return {
    id: r.id,
    restaurantId: r.restaurant_id ?? r.restaurantId,
    restaurantName: r.restaurant_name ?? r.restaurantName,
    reservationDate: r.reservation_date ?? r.reservationDate,
    reservationTime: r.reservation_time ?? r.reservationTime,
    partySize: r.party_size ?? r.partySize,
    status: r.status,
    arrivalStatus: r.arrival_status ?? r.arrivalStatus,
    qrCode: r.qr_code ?? r.qrCode,
    checkedInAt: r.checked_in_at ?? r.checkedInAt,
    specialRequest: r.special_request ?? r.specialRequest,
    order: data.order ?? r.order,
    payment: r.payment,
  };
};

const createReservation = async (data: {
  restaurantId: string;
  reservationDate: string;
  reservationTime: string;
  partySize: number;
  specialRequest?: string;
}): Promise<Reservation> => {
  const response = await apiClient.post('/reservations', {
    restaurant_id: data.restaurantId,
    reservation_date: data.reservationDate,
    reservation_time: data.reservationTime,
    party_size: data.partySize,
    special_request: data.specialRequest,
  });
  const resData = response.data.data ?? response.data;
  // 백엔드는 {reservation: {...}} 형태로 반환
  const r = resData.reservation || resData;
  return {
    id: r.id,
    restaurantId: r.restaurant_id ?? r.restaurantId,
    restaurantName: r.restaurant_name ?? r.restaurantName,
    reservationDate: r.reservation_date ?? r.reservationDate,
    reservationTime: r.reservation_time ?? r.reservationTime,
    partySize: r.party_size ?? r.partySize,
    status: r.status,
    arrivalStatus: r.arrival_status ?? r.arrivalStatus,
    qrCode: r.qr_code ?? r.qrCode,
    checkedInAt: r.checked_in_at ?? r.checkedInAt,
    specialRequest: r.special_request ?? r.specialRequest,
  };
};

const cancelReservation = async (
  id: string,
  reason?: string,
): Promise<void> => {
  await apiClient.put(`/reservations/${id}/cancel`, { cancel_reason: reason });
};

const updateArrival = async (
  id: string,
  status: string,
): Promise<void> => {
  await apiClient.put(`/reservations/${id}/arrival`, { arrival_status: status });
};

const checkin = async (id: string): Promise<void> => {
  await apiClient.post(`/reservations/${id}/checkin`);
};

// ---------- Orders ----------

const createOrder = async (
  reservationId: string,
  items: { menuId: string; quantity: number; options?: any[] }[],
): Promise<Order> => {
  const response = await apiClient.post('/orders', {
    reservation_id: reservationId,
    items: items.map(item => ({
      menu_id: item.menuId,
      quantity: item.quantity,
      options: item.options,
    })),
  });
  const data = response.data.data ?? response.data;
  const order = data.order || data;
  return {
    id: order.id,
    reservationId: order.reservation_id ?? order.reservationId,
    items: order.items || [],
    totalAmount: order.total_amount ?? order.totalAmount,
    status: order.cooking_status ?? order.status,
    createdAt: order.created_at ?? order.createdAt,
  };
};

const getOrderById = async (id: string): Promise<Order> => {
  const response = await apiClient.get(`/orders/${id}`);
  const data = response.data.data ?? response.data;
  const order = data.order || data;
  return {
    id: order.id,
    reservationId: order.reservation_id ?? order.reservationId,
    items: order.items || [],
    totalAmount: order.total_amount ?? order.totalAmount,
    status: order.cooking_status ?? order.status,
    createdAt: order.created_at ?? order.createdAt,
  };
};

const getOrderByReservation = async (
  reservationId: string,
): Promise<Order> => {
  const response = await apiClient.get(
    `/orders/reservation/${reservationId}`,
  );
  const data = response.data.data ?? response.data;
  const order = data.order || data;
  if (!order || !order.id) return order;
  return {
    id: order.id,
    reservationId: order.reservation_id ?? order.reservationId,
    items: order.items || [],
    totalAmount: order.total_amount ?? order.totalAmount,
    status: order.cooking_status ?? order.status,
    createdAt: order.created_at ?? order.createdAt,
  };
};

// ---------- Payments ----------

const preparePayment = async (data: {
  reservationId: string;
  amount: number;
  paymentMethod?: string;
}): Promise<any> => {
  const response = await apiClient.post('/payments/prepare', {
    reservation_id: data.reservationId,
    amount: data.amount,
    payment_method: data.paymentMethod,
  });
  const resData = response.data.data ?? response.data;
  const pd = resData.paymentData || resData;
  return {
    paymentId: pd.paymentId ?? pd.payment_id,
    merchantUid: pd.merchantUid ?? pd.merchant_uid,
    amount: pd.amount,
    storeId: pd.storeId ?? pd.store_id,
    name: pd.name,
    buyerName: pd.buyerName ?? pd.buyer_name,
    buyerEmail: pd.buyerEmail ?? pd.buyer_email,
  };
};

const verifyPayment = async (data: {
  impUid: string;
  merchantUid: string;
}): Promise<any> => {
  const response = await apiClient.post('/payments/verify', {
    imp_uid: data.impUid,
    merchant_uid: data.merchantUid,
  });
  return response.data.data ?? response.data;
};

const getPaymentByReservation = async (
  reservationId: string,
): Promise<Payment> => {
  const response = await apiClient.get(
    `/payments/reservation/${reservationId}`,
  );
  const data = response.data.data ?? response.data;
  const p = data.payment || data;
  if (!p || !p.id) return p;
  return {
    id: p.id,
    reservationId: p.reservation_id ?? p.reservationId,
    orderId: p.order_id ?? p.orderId,
    amount: p.amount,
    paymentMethod: p.payment_method ?? p.paymentMethod,
    status: p.status,
    merchantUid: p.merchant_uid ?? p.merchantUid,
    impUid: p.imp_uid ?? p.impUid,
    refundAmount: p.refund_amount ?? p.refundAmount,
    paidAt: p.paid_at ?? p.paidAt,
  };
};

const refundPayment = async (
  id: string,
  reason?: string,
): Promise<any> => {
  const response = await apiClient.post(`/payments/${id}/refund`, {
    reason,
  });
  return response.data.data ?? response.data;
};

// ---------- Export ----------

const restaurantApiService = {
  // restaurants
  getRestaurants,
  getNearbyRestaurants,
  searchRestaurants,
  getRestaurantById,
  getTimeSlots,
  toggleFavorite,
  recordView,
  getFavorites,
  getRecentViews,
  // menus
  getMenusByRestaurant,
  getMenuById,
  // reservations
  getMyReservations,
  getReservationById,
  createReservation,
  cancelReservation,
  updateArrival,
  checkin,
  // orders
  createOrder,
  getOrderById,
  getOrderByReservation,
  // payments
  preparePayment,
  verifyPayment,
  getPaymentByReservation,
  refundPayment,
};

export default restaurantApiService;
