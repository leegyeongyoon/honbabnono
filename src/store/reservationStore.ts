import { create } from 'zustand';
import apiClient from '../services/apiClient';
import restaurantApiService from '../services/restaurantApiService';

// ============================================================
// Reservation Store — 잇테이블 v2
// ============================================================

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

interface ReservationState {
  // State
  reservations: Reservation[];
  currentReservation: Reservation | null;
  loading: boolean;
  error: string | null;

  // Actions
  fetchMyReservations: (status?: string) => Promise<void>;
  fetchReservationById: (id: string) => Promise<void>;
  createReservation: (data: {
    restaurantId: string;
    reservationDate: string;
    reservationTime: string;
    partySize: number;
    specialRequest?: string;
  }) => Promise<string>;
  cancelReservation: (id: string, reason?: string) => Promise<void>;
  updateArrival: (id: string, status: string) => Promise<void>;
  checkin: (id: string) => Promise<void>;
  clearCurrent: () => void;
}

const useReservationStore = create<ReservationState>((set, get) => ({
  // Initial State
  reservations: [],
  currentReservation: null,
  loading: false,
  error: null,

  // ---------- Actions ----------

  fetchMyReservations: async (status?) => {
    set({ loading: true, error: null });
    try {
      const list = await restaurantApiService.getMyReservations(status);
      set({ reservations: Array.isArray(list) ? list : [], loading: false });
    } catch (err: any) {
      const message =
        err?.response?.data?.message ?? err?.message ?? '예약 목록을 불러올 수 없습니다.';
      set({ error: message, loading: false });
    }
  },

  fetchReservationById: async (id) => {
    set({ loading: true, error: null });
    try {
      const reservation = await restaurantApiService.getReservationById(id);
      set({ currentReservation: reservation as Reservation, loading: false });
    } catch (err: any) {
      const message =
        err?.response?.data?.message ?? err?.message ?? '예약 정보를 불러올 수 없습니다.';
      set({ error: message, loading: false });
    }
  },

  createReservation: async (data) => {
    set({ loading: true, error: null });
    try {
      const reservation = await restaurantApiService.createReservation(data);
      const created = reservation as Reservation;

      // 목록에 추가
      set((state) => ({
        reservations: [created, ...state.reservations],
        currentReservation: created,
        loading: false,
      }));

      return created.id;
    } catch (err: any) {
      const message =
        err?.response?.data?.message ?? err?.message ?? '예약 생성에 실패했습니다.';
      set({ error: message, loading: false });
      throw new Error(message);
    }
  },

  cancelReservation: async (id, reason?) => {
    set({ loading: true, error: null });
    try {
      await restaurantApiService.cancelReservation(id, reason);

      // 로컬 상태 업데이트
      set((state) => ({
        reservations: state.reservations.map((r) =>
          r.id === id ? { ...r, status: 'cancelled' } : r,
        ),
        currentReservation:
          state.currentReservation?.id === id
            ? { ...state.currentReservation, status: 'cancelled' }
            : state.currentReservation,
        loading: false,
      }));
    } catch (err: any) {
      const message =
        err?.response?.data?.message ?? err?.message ?? '예약 취소에 실패했습니다.';
      set({ error: message, loading: false });
      throw new Error(message);
    }
  },

  updateArrival: async (id, status) => {
    set({ loading: true, error: null });
    try {
      await restaurantApiService.updateArrival(id, status);

      set((state) => ({
        reservations: state.reservations.map((r) =>
          r.id === id ? { ...r, arrivalStatus: status } : r,
        ),
        currentReservation:
          state.currentReservation?.id === id
            ? { ...state.currentReservation, arrivalStatus: status }
            : state.currentReservation,
        loading: false,
      }));
    } catch (err: any) {
      const message =
        err?.response?.data?.message ?? err?.message ?? '도착 상태 변경에 실패했습니다.';
      set({ error: message, loading: false });
      throw new Error(message);
    }
  },

  checkin: async (id) => {
    set({ loading: true, error: null });
    try {
      await restaurantApiService.checkin(id);

      const now = new Date().toISOString();
      set((state) => ({
        reservations: state.reservations.map((r) =>
          r.id === id
            ? { ...r, arrivalStatus: 'checked_in', checkedInAt: now }
            : r,
        ),
        currentReservation:
          state.currentReservation?.id === id
            ? {
                ...state.currentReservation,
                arrivalStatus: 'checked_in',
                checkedInAt: now,
              }
            : state.currentReservation,
        loading: false,
      }));
    } catch (err: any) {
      const message =
        err?.response?.data?.message ?? err?.message ?? '체크인에 실패했습니다.';
      set({ error: message, loading: false });
      throw new Error(message);
    }
  },

  clearCurrent: () => {
    set({ currentReservation: null, error: null });
  },
}));

export default useReservationStore;
