import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import apiClient from '../services/apiClient';

export interface Participant {
  id: string;
  name: string;
  profileImage?: string;
  status: 'approved' | 'pending' | 'rejected';
  joinedAt: string;
  babAlScore?: number;
}

export interface Host {
  id: string;
  name: string;
  profileImage?: string;
  rating?: string;
  babAlScore: number;
}

export interface PreferenceFilters {
  eatingSpeed?: string | null;
  conversationDuringMeal?: string | null;
  talkativeness?: string | null;
  mealPurpose?: string | null;
  specificRestaurant?: string | null;
  interests?: string[];
}

export interface Meetup {
  id: string;
  title: string;
  description: string;
  category: string;
  location: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  date: string;
  time: string;
  maxParticipants: number;
  currentParticipants: number;
  priceRange?: string;
  ageRange?: string;
  genderPreference?: string;
  image?: string;
  status: 'recruiting' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  hostId: string;
  hostName: string;
  hostBabAlScore: number;
  host?: Host;
  requirements?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
  participants: Participant[];
  lastChatTime?: string;
  lastChatMessage?: string;
  distance?: number | null;
  diningPreferences?: Record<string, any>;
  preferenceFilters?: PreferenceFilters | null;
  promiseDepositAmount?: number;
  promiseDepositRequired?: boolean;
  viewCount?: number;
}

// 위치 기반 검색 파라미터
interface LocationParams {
  latitude?: number;
  longitude?: number;
  radius?: number; // 미터 단위
}

interface MeetupState {
  // State
  meetups: Meetup[];
  currentMeetup: Meetup | null;
  loading: boolean;
  error: string | null;

  // Actions
  setMeetups: (meetups: Meetup[]) => void;
  setCurrentMeetup: (meetup: Meetup | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // CRUD Actions
  fetchMeetups: () => Promise<void>;
  fetchHomeMeetups: (locationParams?: LocationParams) => Promise<void>;
  fetchActiveMeetups: () => Promise<void>;
  fetchCompletedMeetups: () => Promise<void>;
  fetchMeetupById: (id: string) => Promise<Meetup | null>;
  createMeetup: (meetupData: Partial<Meetup>) => Promise<Meetup | null>;
  updateMeetup: (id: string, updates: Partial<Meetup>) => Promise<void>;
  deleteMeetup: (id: string) => Promise<void>;
  
  // Participant Actions
  joinMeetup: (meetupId: string, userId: string) => Promise<void>;
  leaveMeetup: (meetupId: string, userId: string) => Promise<void>;
  approveParticipant: (meetupId: string, userId: string) => Promise<void>;
  rejectParticipant: (meetupId: string, userId: string) => Promise<void>;
  
  // Utility Actions
  getMeetupsByCategory: (category: string) => Meetup[];
  getMeetupsByHost: (hostId: string) => Meetup[];
  getParticipatedMeetups: (userId: string) => Meetup[];
  clearStore: () => void;
}

// API 호출 헬퍼 함수 (axios 직접 사용)
const apiCall = async (endpoint: string, options: any = {}) => {
  try {
    // axios 메서드별로 호출
    let response;
    const method = (options.method || 'GET').toUpperCase();
    const data = options.body ? (typeof options.body === 'string' ? JSON.parse(options.body) : options.body) : undefined;

    switch (method) {
      case 'GET':
        response = await apiClient.get(endpoint);
        break;
      case 'POST':
        response = await apiClient.post(endpoint, data);
        break;
      case 'PUT':
        response = await apiClient.put(endpoint, data);
        break;
      case 'DELETE':
        response = await apiClient.delete(endpoint);
        break;
      case 'PATCH':
        response = await apiClient.patch(endpoint, data);
        break;
      default:
        response = await apiClient.get(endpoint);
    }

    // 전체 응답 객체를 반환
    return response.data;
  } catch (error: any) {
    if (error.response) {
      throw new Error(`API Error: ${error.response.status} ${error.response.data?.message || error.message}`);
    } else if (error.request) {
      throw new Error(`Network Error: No response from server`);
    } else {
      throw new Error(`Error: ${error.message}`);
    }
  }
};

// 한국어 상태를 영문 상태로 매핑
const mapKoreanStatus = (status: string): Meetup['status'] => {
  const statusMap: Record<string, Meetup['status']> = {
    '모집중': 'recruiting',
    '모집완료': 'confirmed',
    '진행중': 'in_progress',
    '종료': 'completed',
    '취소': 'cancelled',
  };
  return statusMap[status] || status as Meetup['status'];
};

// 백엔드 데이터를 프론트엔드 형식으로 변환
const transformMeetupData = (meetupData: any): Meetup => {
  // 다양한 응답 구조 처리
  let actualData;
  if (meetupData.success && meetupData.meetup) {
    actualData = meetupData.meetup;
  } else if (meetupData.meetup) {
    actualData = meetupData.meetup;
  } else {
    actualData = meetupData;
  }
  
  return {
    id: actualData.id,
    title: actualData.title || '제목 없음',
    description: actualData.description || '',
    category: actualData.category || '기타',
    location: actualData.location || '위치 미정',
    address: actualData.address,
    latitude: actualData.latitude,
    longitude: actualData.longitude,
    date: actualData.date || '',
    time: actualData.time || '',
    maxParticipants: actualData.maxParticipants ?? actualData.max_participants ?? 4,
    currentParticipants: actualData.currentParticipants ?? actualData.current_participants ?? 0,
    priceRange: actualData.priceRange ?? actualData.price_range,
    ageRange: actualData.ageRange ?? actualData.age_range,
    genderPreference: actualData.genderPreference ?? actualData.gender_preference,
    image: actualData.image,
    status: mapKoreanStatus(actualData.status),
    hostId: actualData.hostId ?? actualData.host_id ?? actualData.host?.id ?? 'unknown',
    hostName: actualData.host?.name || actualData.hostName || actualData.host_name || '익명',
    hostBabAlScore: actualData.host?.babAlScore ?? actualData.hostBabAlScore ?? 36.5,
    host: actualData.host ? {
      id: actualData.host.id || actualData.hostId || actualData.host_id || 'unknown',
      name: actualData.host.name || '익명',
      profileImage: actualData.host.profileImage || actualData.host.profile_image,
      rating: actualData.host.rating,
      babAlScore: actualData.host.babAlScore ?? actualData.host.babal_score ?? 36.5,
    } : undefined,
    requirements: actualData.requirements,
    tags: actualData.tags || [],
    createdAt: actualData.createdAt ?? actualData.created_at,
    updatedAt: actualData.updatedAt ?? actualData.updated_at,
    participants: actualData.participants?.map((p: any) => ({
      id: p.id ?? p.user_id,
      name: p.name,
      profileImage: p.profileImage ?? p.profile_image,
      status: p.status === '참가승인' ? 'approved' : p.status === '참가신청' ? 'pending' : 'rejected',
      joinedAt: p.joinedAt ?? p.joined_at,
      babAlScore: p.babAlScore ?? p.babal_score ?? 36.5,
    })) || [],
    lastChatTime: actualData.lastChatTime,
    lastChatMessage: actualData.lastChatMessage,
    distance: actualData.distance ?? null,
    diningPreferences: actualData.diningPreferences ?? actualData.dining_preferences ?? {},
    preferenceFilters: actualData.preferenceFilters ?? null,
    promiseDepositAmount: actualData.promiseDepositAmount ?? actualData.promise_deposit_amount ?? 0,
    promiseDepositRequired: actualData.promiseDepositRequired ?? actualData.promise_deposit_required ?? false,
    viewCount: actualData.viewCount ?? actualData.view_count ?? 0,
  };
};

export const useMeetupStore = create<MeetupState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    meetups: [],
    currentMeetup: null,
    loading: false,
    error: null,
    
    // Basic setters
    setMeetups: (meetups) => set({ meetups }),
    setCurrentMeetup: (meetup) => set({ currentMeetup: meetup }),
    setLoading: (loading) => set({ loading }),
    setError: (error) => set({ error }),
    
    // CRUD Actions
    fetchMeetups: async () => {
      set({ loading: true, error: null });
      try {
        const response = await apiCall('/meetups');

        const transformedMeetups = response.meetups?.map(transformMeetupData) || [];
        set({ meetups: transformedMeetups, loading: false });
      } catch (error) {
        set({ error: (error as Error).message, loading: false });
      }
    },

    fetchHomeMeetups: async (locationParams?: LocationParams) => {
      set({ loading: true, error: null });
      try {
        // 위치 파라미터가 있으면 쿼리스트링에 추가
        let endpoint = '/meetups/home';
        if (locationParams?.latitude && locationParams?.longitude) {
          const params = new URLSearchParams();
          params.append('latitude', locationParams.latitude.toString());
          params.append('longitude', locationParams.longitude.toString());
          if (locationParams.radius) {
            params.append('radius', locationParams.radius.toString());
          }
          endpoint = `/meetups/home?${params.toString()}`;
        }

        const response = await apiCall(endpoint);

        const transformedMeetups = response.meetups?.map(transformMeetupData) || [];
        set({ meetups: transformedMeetups, loading: false });
      } catch (error) {
        set({ error: (error as Error).message, loading: false });
      }
    },

    fetchActiveMeetups: async () => {
      set({ loading: true, error: null });
      try {
        const response = await apiCall('/meetups/active');
        
        const transformedMeetups = response.meetups?.map(transformMeetupData) || [];
        set({ meetups: transformedMeetups, loading: false });
      } catch (error) {
        set({ error: (error as Error).message, loading: false });
      }
    },

    fetchCompletedMeetups: async () => {
      set({ loading: true, error: null });
      try {
        const response = await apiCall('/meetups/completed');
        
        const transformedMeetups = response.meetups?.map(transformMeetupData) || [];
        set({ meetups: transformedMeetups, loading: false });
      } catch (error) {
        set({ error: (error as Error).message, loading: false });
      }
    },

    fetchMeetupById: async (id: string) => {
      set({ loading: true, error: null });
      try {
        const response = await apiCall(`/meetups/${id}`);

        const meetup = transformMeetupData(response);
        set({ currentMeetup: meetup, loading: false });
        return meetup;
      } catch (error) {
        set({ error: (error as Error).message, loading: false });
        return null;
      }
    },
    
    createMeetup: async (meetupData) => {
      set({ loading: true, error: null });
      try {
        const response = await apiCall('/meetups', {
          method: 'POST',
          body: JSON.stringify(meetupData),
        });
        
        const newMeetup = transformMeetupData(response);
        
        // 기존 목록에 새 모임 추가
        const { meetups } = get();
        set({ 
          meetups: [newMeetup, ...meetups],
          loading: false 
        });
        
        return newMeetup;
      } catch (error) {
        set({ error: (error as Error).message, loading: false });
        return null;
      }
    },
    
    updateMeetup: async (id: string, updates: Partial<Meetup>) => {
      set({ loading: true, error: null });
      try {
        const response = await apiCall(`/meetups/${id}`, {
          method: 'PUT',
          body: JSON.stringify(updates),
        });
        
        const updatedMeetup = transformMeetupData(response);
        
        // 목록에서 업데이트
        const { meetups, currentMeetup } = get();
        const updatedMeetups = meetups.map(m => m.id === id ? updatedMeetup : m);
        
        set({ 
          meetups: updatedMeetups,
          currentMeetup: currentMeetup?.id === id ? updatedMeetup : currentMeetup,
          loading: false 
        });
      } catch (error) {
        set({ error: (error as Error).message, loading: false });
      }
    },
    
    deleteMeetup: async (id: string) => {
      set({ loading: true, error: null });
      try {
        await apiCall(`/meetups/${id}`, { method: 'DELETE' });
        
        // 목록에서 제거
        const { meetups, currentMeetup } = get();
        const filteredMeetups = meetups.filter(m => m.id !== id);
        
        set({ 
          meetups: filteredMeetups,
          currentMeetup: currentMeetup?.id === id ? null : currentMeetup,
          loading: false 
        });
      } catch (error) {
        set({ error: (error as Error).message, loading: false });
      }
    },
    
    // Participant Actions
    joinMeetup: async (meetupId: string, userId: string) => {
      try {
        const result = await apiCall(`/meetups/${meetupId}/join`, {
          method: 'POST',
          body: JSON.stringify({ userId }),
        });

        // 모임 데이터 새로고침
        await get().fetchMeetupById(meetupId);
        return result;
      } catch (error) {
        set({ error: (error as Error).message });
        throw error;
      }
    },
    
    leaveMeetup: async (meetupId: string, userId: string) => {
      try {
        const response = await apiCall(`/meetups/${meetupId}/leave`, {
          method: 'POST',
          body: JSON.stringify({ userId }),
        });
        
        // 호스트 취소가 아닌 경우에만 데이터 새로고침
        if (!response.isHostCancellation) {
          await get().fetchMeetupById(meetupId);
        }
        
        return response;
      } catch (error) {
        set({ error: (error as Error).message });
        throw error;
      }
    },
    
    approveParticipant: async (meetupId: string, userId: string) => {
      try {
        await apiCall(`/meetups/${meetupId}/participants/${userId}/approve`, {
          method: 'POST',
        });
        
        // 모임 데이터 새로고침
        await get().fetchMeetupById(meetupId);
      } catch (error) {
        set({ error: (error as Error).message });
      }
    },
    
    rejectParticipant: async (meetupId: string, userId: string) => {
      try {
        await apiCall(`/meetups/${meetupId}/participants/${userId}/reject`, {
          method: 'POST',
        });
        
        // 모임 데이터 새로고침
        await get().fetchMeetupById(meetupId);
      } catch (error) {
        set({ error: (error as Error).message });
      }
    },
    
    // Utility functions
    getMeetupsByCategory: (category: string) => {
      const { meetups } = get();
      return meetups.filter(meetup => meetup.category === category);
    },
    
    getMeetupsByHost: (hostId: string) => {
      const { meetups } = get();
      return meetups.filter(meetup => meetup.hostId === hostId);
    },
    
    getParticipatedMeetups: (userId: string) => {
      const { meetups } = get();
      return meetups.filter(meetup => 
        meetup.participants.some(p => p.id === userId)
      );
    },
    
    clearStore: () => set({
      meetups: [],
      currentMeetup: null,
      loading: false,
      error: null,
    }),
  }))
);