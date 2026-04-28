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

// ---------- Restaurants ----------

const getRestaurants = async (params?: {
  category?: string;
  page?: number;
  limit?: number;
}): Promise<{ restaurants: Restaurant[]; pagination?: any }> => {
  const response = await apiClient.get('/api/restaurants', { params });
  return response.data.data ?? response.data;
};

const getNearbyRestaurants = async (
  lat: number,
  lng: number,
  radius: number = 3000,
): Promise<Restaurant[]> => {
  const response = await apiClient.get('/api/restaurants/nearby', {
    params: { lat, lng, radius },
  });
  return response.data.data ?? response.data;
};

const searchRestaurants = async (keyword: string): Promise<Restaurant[]> => {
  const response = await apiClient.get('/api/restaurants/search', {
    params: { keyword },
  });
  return response.data.data ?? response.data;
};

const getRestaurantById = async (id: string): Promise<Restaurant> => {
  const response = await apiClient.get(`/api/restaurants/${id}`);
  return response.data.data ?? response.data;
};

const getTimeSlots = async (
  restaurantId: string,
  date: string,
): Promise<TimeSlot[]> => {
  const response = await apiClient.get(
    `/api/restaurants/${restaurantId}/timeslots`,
    { params: { date } },
  );
  return response.data.data ?? response.data;
};

const toggleFavorite = async (
  restaurantId: string,
): Promise<{ favorited: boolean }> => {
  const response = await apiClient.post(
    `/api/restaurants/${restaurantId}/favorite`,
  );
  return response.data.data ?? response.data;
};

const recordView = async (restaurantId: string): Promise<void> => {
  await apiClient.post(`/api/restaurants/${restaurantId}/view`);
};

const getFavorites = async (): Promise<Restaurant[]> => {
  const response = await apiClient.get('/api/restaurants/favorites');
  return response.data.data ?? response.data;
};

const getRecentViews = async (): Promise<Restaurant[]> => {
  const response = await apiClient.get('/api/restaurants/recent-views');
  return response.data.data ?? response.data;
};

// ---------- Menus ----------

const getMenusByRestaurant = async (
  restaurantId: string,
): Promise<MenuItem[]> => {
  const response = await apiClient.get(
    `/api/menus/restaurant/${restaurantId}`,
  );
  return response.data.data ?? response.data;
};

const getMenuById = async (id: string): Promise<MenuItem> => {
  const response = await apiClient.get(`/api/menus/${id}`);
  return response.data.data ?? response.data;
};

// ---------- Reservations ----------

const getMyReservations = async (
  status?: string,
): Promise<Reservation[]> => {
  const response = await apiClient.get('/api/reservations/my', {
    params: status ? { status } : undefined,
  });
  return response.data.data ?? response.data;
};

const getReservationById = async (id: string): Promise<Reservation> => {
  const response = await apiClient.get(`/api/reservations/${id}`);
  return response.data.data ?? response.data;
};

const createReservation = async (data: {
  restaurantId: string;
  reservationDate: string;
  reservationTime: string;
  partySize: number;
  specialRequest?: string;
}): Promise<Reservation> => {
  const response = await apiClient.post('/api/reservations', data);
  return response.data.data ?? response.data;
};

const cancelReservation = async (
  id: string,
  reason?: string,
): Promise<void> => {
  await apiClient.put(`/api/reservations/${id}/cancel`, { reason });
};

const updateArrival = async (
  id: string,
  status: string,
): Promise<void> => {
  await apiClient.put(`/api/reservations/${id}/arrival`, { status });
};

const checkin = async (id: string): Promise<void> => {
  await apiClient.post(`/api/reservations/${id}/checkin`);
};

// ---------- Orders ----------

const createOrder = async (
  reservationId: string,
  items: { menuId: string; quantity: number; options?: any[] }[],
): Promise<Order> => {
  const response = await apiClient.post('/api/orders', {
    reservationId,
    items,
  });
  return response.data.data ?? response.data;
};

const getOrderById = async (id: string): Promise<Order> => {
  const response = await apiClient.get(`/api/orders/${id}`);
  return response.data.data ?? response.data;
};

const getOrderByReservation = async (
  reservationId: string,
): Promise<Order> => {
  const response = await apiClient.get(
    `/api/orders/reservation/${reservationId}`,
  );
  return response.data.data ?? response.data;
};

// ---------- Payments ----------

const preparePayment = async (data: {
  reservationId: string;
  amount: number;
  paymentMethod?: string;
}): Promise<any> => {
  const response = await apiClient.post('/api/payments/prepare', data);
  return response.data.data ?? response.data;
};

const verifyPayment = async (data: {
  impUid: string;
  merchantUid: string;
}): Promise<any> => {
  const response = await apiClient.post('/api/payments/verify', data);
  return response.data.data ?? response.data;
};

const getPaymentByReservation = async (
  reservationId: string,
): Promise<Payment> => {
  const response = await apiClient.get(
    `/api/payments/reservation/${reservationId}`,
  );
  return response.data.data ?? response.data;
};

const refundPayment = async (
  id: string,
  reason?: string,
): Promise<any> => {
  const response = await apiClient.post(`/api/payments/${id}/refund`, {
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
