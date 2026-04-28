import { create } from 'zustand';
import apiClient from '../services/apiClient';
import restaurantApiService from '../services/restaurantApiService';

// ============================================================
// Restaurant Store — 잇테이블 v2
// ============================================================

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

interface RestaurantState {
  // State
  restaurants: Restaurant[];
  currentRestaurant: Restaurant | null;
  favorites: Restaurant[];
  recentViews: Restaurant[];
  loading: boolean;
  error: string | null;

  // Actions
  fetchRestaurants: (params?: {
    category?: string;
    page?: number;
    limit?: number;
  }) => Promise<void>;
  fetchNearby: (lat: number, lng: number, radius?: number) => Promise<void>;
  searchRestaurants: (keyword: string) => Promise<void>;
  fetchRestaurantById: (id: string) => Promise<void>;
  fetchFavorites: () => Promise<void>;
  fetchRecentViews: () => Promise<void>;
  toggleFavorite: (restaurantId: string) => Promise<void>;
  recordView: (restaurantId: string) => Promise<void>;
  clearCurrent: () => void;
}

const useRestaurantStore = create<RestaurantState>((set, get) => ({
  // Initial State
  restaurants: [],
  currentRestaurant: null,
  favorites: [],
  recentViews: [],
  loading: false,
  error: null,

  // ---------- Actions ----------

  fetchRestaurants: async (params) => {
    set({ loading: true, error: null });
    try {
      const result = await restaurantApiService.getRestaurants(params);
      const list = Array.isArray(result) ? result : result.restaurants ?? [];
      set({ restaurants: list, loading: false });
    } catch (err: any) {
      const message =
        err?.response?.data?.message ?? err?.message ?? '매장 목록을 불러올 수 없습니다.';
      set({ error: message, loading: false });
    }
  },

  fetchNearby: async (lat, lng, radius = 3000) => {
    set({ loading: true, error: null });
    try {
      const list = await restaurantApiService.getNearbyRestaurants(lat, lng, radius);
      set({ restaurants: Array.isArray(list) ? list : [], loading: false });
    } catch (err: any) {
      const message =
        err?.response?.data?.message ?? err?.message ?? '주변 매장을 불러올 수 없습니다.';
      set({ error: message, loading: false });
    }
  },

  searchRestaurants: async (keyword) => {
    set({ loading: true, error: null });
    try {
      const list = await restaurantApiService.searchRestaurants(keyword);
      set({ restaurants: Array.isArray(list) ? list : [], loading: false });
    } catch (err: any) {
      const message =
        err?.response?.data?.message ?? err?.message ?? '검색에 실패했습니다.';
      set({ error: message, loading: false });
    }
  },

  fetchRestaurantById: async (id) => {
    set({ loading: true, error: null });
    try {
      const restaurant = await restaurantApiService.getRestaurantById(id);
      set({ currentRestaurant: restaurant as Restaurant, loading: false });
    } catch (err: any) {
      const message =
        err?.response?.data?.message ?? err?.message ?? '매장 정보를 불러올 수 없습니다.';
      set({ error: message, loading: false });
    }
  },

  fetchFavorites: async () => {
    set({ loading: true, error: null });
    try {
      const list = await restaurantApiService.getFavorites();
      set({ favorites: Array.isArray(list) ? list : [], loading: false });
    } catch (err: any) {
      const message =
        err?.response?.data?.message ?? err?.message ?? '즐겨찾기를 불러올 수 없습니다.';
      set({ error: message, loading: false });
    }
  },

  fetchRecentViews: async () => {
    try {
      const list = await restaurantApiService.getRecentViews();
      set({ recentViews: Array.isArray(list) ? list : [] });
    } catch {
      // 최근 본 매장은 실패해도 무시
    }
  },

  toggleFavorite: async (restaurantId) => {
    try {
      const result = await restaurantApiService.toggleFavorite(restaurantId);
      const { favorites } = get();

      if (result.favorited) {
        // 즐겨찾기에 추가된 경우 — currentRestaurant 가 해당 매장이면 목록에 추가
        const { currentRestaurant } = get();
        if (currentRestaurant && currentRestaurant.id === restaurantId) {
          set({ favorites: [currentRestaurant, ...favorites] });
        }
      } else {
        // 즐겨찾기 해제
        set({ favorites: favorites.filter((r) => r.id !== restaurantId) });
      }
    } catch (err: any) {
      const message =
        err?.response?.data?.message ?? err?.message ?? '즐겨찾기 변경에 실패했습니다.';
      set({ error: message });
    }
  },

  recordView: async (restaurantId) => {
    try {
      await restaurantApiService.recordView(restaurantId);
    } catch {
      // 조회 기록은 실패해도 무시
    }
  },

  clearCurrent: () => {
    set({ currentRestaurant: null, error: null });
  },
}));

export default useRestaurantStore;
