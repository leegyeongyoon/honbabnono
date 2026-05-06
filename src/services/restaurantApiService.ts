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

const getRestaurants = async (params?: {
  category?: string;
  page?: number;
  limit?: number;
}): Promise<{ restaurants: Restaurant[]; pagination?: any }> => {
  const response = await apiClient.get('/restaurants', { params });
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
  return list.map((s: any) => ({
    time: s.slot_time ?? s.time,
    available: s.is_active !== false && (s.current_reservations ?? 0) < (s.max_reservations ?? 5),
    remainingSeats: (s.max_reservations ?? 5) - (s.current_reservations ?? 0),
  }));
};

const toggleFavorite = async (
  restaurantId: string,
): Promise<{ favorited: boolean }> => {
  const response = await apiClient.post(
    `/restaurants/${restaurantId}/favorite`,
  );
  return response.data.data ?? response.data;
};

const recordView = async (restaurantId: string): Promise<void> => {
  await apiClient.post(`/restaurants/${restaurantId}/view`);
};

const getFavorites = async (): Promise<Restaurant[]> => {
  const response = await apiClient.get('/restaurants/favorites');
  return response.data.data ?? response.data;
};

const getRecentViews = async (): Promise<Restaurant[]> => {
  const response = await apiClient.get('/restaurants/recent-views');
  return response.data.data ?? response.data;
};

// ---------- Menus ----------

const getMenusByRestaurant = async (
  restaurantId: string,
): Promise<MenuItem[]> => {
  const response = await apiClient.get(
    `/menus/restaurant/${restaurantId}`,
  );
  const data = response.data.data ?? response.data;
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
  return response.data.data ?? response.data;
};

const getReservationById = async (id: string): Promise<Reservation> => {
  const response = await apiClient.get(`/reservations/${id}`);
  return response.data.data ?? response.data;
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
  return response.data.data ?? response.data;
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
    reservationId,
    items,
  });
  return response.data.data ?? response.data;
};

const getOrderById = async (id: string): Promise<Order> => {
  const response = await apiClient.get(`/orders/${id}`);
  return response.data.data ?? response.data;
};

const getOrderByReservation = async (
  reservationId: string,
): Promise<Order> => {
  const response = await apiClient.get(
    `/orders/reservation/${reservationId}`,
  );
  return response.data.data ?? response.data;
};

// ---------- Payments ----------

const preparePayment = async (data: {
  reservationId: string;
  amount: number;
  paymentMethod?: string;
}): Promise<any> => {
  const response = await apiClient.post('/payments/prepare', data);
  return response.data.data ?? response.data;
};

const verifyPayment = async (data: {
  impUid: string;
  merchantUid: string;
}): Promise<any> => {
  const response = await apiClient.post('/payments/verify', data);
  return response.data.data ?? response.data;
};

const getPaymentByReservation = async (
  reservationId: string,
): Promise<Payment> => {
  const response = await apiClient.get(
    `/payments/reservation/${reservationId}`,
  );
  return response.data.data ?? response.data;
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
