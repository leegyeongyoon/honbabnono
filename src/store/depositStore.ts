import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import apiClient from '../services/apiClient';
import { UserDeposit, DepositStatus } from '../types/deposit';

interface DepositState {
  // State
  deposits: UserDeposit[];
  loading: boolean;
  error: string | null;

  // Actions
  setDeposits: (deposits: UserDeposit[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // API Actions
  fetchDeposits: () => Promise<void>;
  fetchDepositByMeetup: (meetupId: string) => Promise<UserDeposit | null>;

  // Utility Actions
  getDepositStatus: (meetupId: string) => DepositStatus | null;
  getDepositsByStatus: (status: DepositStatus) => UserDeposit[];
  clearStore: () => void;
}

export const useDepositStore = create<DepositState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    deposits: [],
    loading: false,
    error: null,

    // Basic setters
    setDeposits: (deposits) => set({ deposits }),
    setLoading: (loading) => set({ loading }),
    setError: (error) => set({ error }),

    // API Actions
    fetchDeposits: async () => {
      set({ loading: true, error: null });
      try {
        const response = await apiClient.get('/deposits');
        const data = response.data;

        const deposits: UserDeposit[] = data.deposits || [];
        set({ deposits, loading: false });
      } catch (error) {
        set({ error: (error as Error).message, loading: false });
      }
    },

    fetchDepositByMeetup: async (meetupId: string) => {
      set({ loading: true, error: null });
      try {
        const response = await apiClient.get(`/deposits/meetup/${meetupId}`);
        const data = response.data;

        const deposit: UserDeposit | null = data.deposit || null;

        if (deposit) {
          // 로컬 목록에 업데이트 또는 추가
          const { deposits } = get();
          const exists = deposits.some((d) => d.id === deposit.id);
          const updatedDeposits = exists
            ? deposits.map((d) => (d.id === deposit.id ? deposit : d))
            : [...deposits, deposit];
          set({ deposits: updatedDeposits, loading: false });
        } else {
          set({ loading: false });
        }

        return deposit;
      } catch (error) {
        set({ error: (error as Error).message, loading: false });
        return null;
      }
    },

    // Utility functions
    getDepositStatus: (meetupId: string) => {
      const { deposits } = get();
      const deposit = deposits.find((d) => d.meetupId === meetupId);
      return deposit ? deposit.status : null;
    },

    getDepositsByStatus: (status: DepositStatus) => {
      const { deposits } = get();
      return deposits.filter((d) => d.status === status);
    },

    clearStore: () => set({
      deposits: [],
      loading: false,
      error: null,
    }),
  }))
);
