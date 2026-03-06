import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import apiClient from '../services/apiClient';
import { Meetup } from './meetupStore';

interface SearchFilters {
  category: string | null;
  location: string | null;
  date: string | null;
  priceRange: string | null;
}

interface SearchState {
  // State
  query: string;
  filters: SearchFilters;
  results: Meetup[];
  loading: boolean;
  error: string | null;

  // Actions
  setQuery: (query: string) => void;
  setFilters: (filters: Partial<SearchFilters>) => void;
  clearFilters: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // API Actions
  search: () => Promise<void>;

  // Utility Actions
  clearResults: () => void;
  clearStore: () => void;
}

const initialFilters: SearchFilters = {
  category: null,
  location: null,
  date: null,
  priceRange: null,
};

export const useSearchStore = create<SearchState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    query: '',
    filters: { ...initialFilters },
    results: [],
    loading: false,
    error: null,

    // Basic setters
    setQuery: (query) => set({ query }),
    setFilters: (filters) => set((state) => ({
      filters: { ...state.filters, ...filters },
    })),
    clearFilters: () => set({ filters: { ...initialFilters } }),
    setLoading: (loading) => set({ loading }),
    setError: (error) => set({ error }),

    // API Actions
    search: async () => {
      const { query, filters } = get();

      set({ loading: true, error: null });
      try {
        const params = new URLSearchParams();

        if (query) {
          params.append('q', query);
        }
        if (filters.category) {
          params.append('category', filters.category);
        }
        if (filters.location) {
          params.append('location', filters.location);
        }
        if (filters.date) {
          params.append('date', filters.date);
        }
        if (filters.priceRange) {
          params.append('priceRange', filters.priceRange);
        }

        const response = await apiClient.get(`/meetups/search?${params}`);
        const data = response.data;

        const results: Meetup[] = data.meetups || [];
        set({ results, loading: false });
      } catch (error) {
        set({ error: (error as Error).message, loading: false });
      }
    },

    // Utility functions
    clearResults: () => set({ results: [] }),
    clearStore: () => set({
      query: '',
      filters: { ...initialFilters },
      results: [],
      loading: false,
      error: null,
    }),
  }))
);
