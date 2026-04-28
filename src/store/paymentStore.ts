import { create } from 'zustand';
import apiClient from '../services/apiClient';
import restaurantApiService from '../services/restaurantApiService';

// ============================================================
// Payment Store — 잇테이블 v2
// ============================================================

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

interface PaymentState {
  // State
  currentPayment: Payment | null;
  loading: boolean;
  error: string | null;

  // Actions
  preparePayment: (
    reservationId: string,
    amount: number,
    paymentMethod?: string,
  ) => Promise<any>;
  verifyPayment: (impUid: string, merchantUid: string) => Promise<void>;
  fetchPaymentByReservation: (reservationId: string) => Promise<void>;
  requestRefund: (paymentId: string, reason?: string) => Promise<any>;
  clearPayment: () => void;
}

const usePaymentStore = create<PaymentState>((set, get) => ({
  // Initial State
  currentPayment: null,
  loading: false,
  error: null,

  // ---------- Actions ----------

  preparePayment: async (reservationId, amount, paymentMethod?) => {
    set({ loading: true, error: null });
    try {
      const paymentData = await restaurantApiService.preparePayment({
        reservationId,
        amount,
        paymentMethod,
      });
      set({ loading: false });
      return paymentData;
    } catch (err: any) {
      const message =
        err?.response?.data?.message ?? err?.message ?? '결제 준비에 실패했습니다.';
      set({ error: message, loading: false });
      throw new Error(message);
    }
  },

  verifyPayment: async (impUid, merchantUid) => {
    set({ loading: true, error: null });
    try {
      const result = await restaurantApiService.verifyPayment({
        impUid,
        merchantUid,
      });
      set({ currentPayment: result as Payment, loading: false });
    } catch (err: any) {
      const message =
        err?.response?.data?.message ?? err?.message ?? '결제 검증에 실패했습니다.';
      set({ error: message, loading: false });
      throw new Error(message);
    }
  },

  fetchPaymentByReservation: async (reservationId) => {
    set({ loading: true, error: null });
    try {
      const payment =
        await restaurantApiService.getPaymentByReservation(reservationId);
      set({ currentPayment: payment as Payment, loading: false });
    } catch (err: any) {
      const message =
        err?.response?.data?.message ?? err?.message ?? '결제 정보를 불러올 수 없습니다.';
      set({ error: message, loading: false });
    }
  },

  requestRefund: async (paymentId, reason?) => {
    set({ loading: true, error: null });
    try {
      const refundInfo = await restaurantApiService.refundPayment(
        paymentId,
        reason,
      );

      // 환불 후 현재 결제 상태 업데이트
      set((state) => ({
        currentPayment: state.currentPayment
          ? {
              ...state.currentPayment,
              status: 'refunded',
              refundAmount: refundInfo?.refundAmount ?? state.currentPayment.amount,
            }
          : null,
        loading: false,
      }));

      return refundInfo;
    } catch (err: any) {
      const message =
        err?.response?.data?.message ?? err?.message ?? '환불 요청에 실패했습니다.';
      set({ error: message, loading: false });
      throw new Error(message);
    }
  },

  clearPayment: () => {
    set({ currentPayment: null, error: null });
  },
}));

export default usePaymentStore;
