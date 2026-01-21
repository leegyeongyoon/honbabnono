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
  status: 'recruiting' | 'confirmed' | 'completed' | 'cancelled';
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
  distance?: number | null; // 사용자 위치로부터의 거리 (미터)
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
    console.log('🚀 API Call:', endpoint, options);
    
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
    
    // 상세한 응답 로그
    console.log('📦 Full axios response:', {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      data: response.data,
      dataType: typeof response.data,
      isDataEmpty: Object.keys(response.data || {}).length === 0
    });
    
    // 전체 응답 객체를 반환
    return response.data;
  } catch (error: any) {
    console.error('💥 API Call Error:', error);
    if (error.response) {
      console.error('💥 Error response:', error.response.data);
      throw new Error(`API Error: ${error.response.status} ${error.response.data?.message || error.message}`);
    } else if (error.request) {
      console.error('💥 Error request:', error.request);
      throw new Error(`Network Error: No response from server`);
    } else {
      console.error('💥 Error message:', error.message);
      throw new Error(`Error: ${error.message}`);
    }
  }
};

// 백엔드 데이터를 프론트엔드 형식으로 변환
const transformMeetupData = (meetupData: any): Meetup => {
  console.log('🔄 Transform meetup data:', meetupData);
  
  // 다양한 응답 구조 처리
  let actualData;
  if (meetupData.success && meetupData.meetup) {
    actualData = meetupData.meetup;
  } else if (meetupData.meetup) {
    actualData = meetupData.meetup;
  } else {
    actualData = meetupData;
  }
  
  console.log('📝 Actual data:', actualData);
  
  return {
    id: actualData.id,
    title: actualData.title,
    description: actualData.description || '',
    category: actualData.category,
    location: actualData.location,
    address: actualData.address,
    latitude: actualData.latitude,
    longitude: actualData.longitude,
    date: actualData.date,
    time: actualData.time,
    maxParticipants: actualData.maxParticipants,
    currentParticipants: actualData.currentParticipants,
    priceRange: actualData.priceRange,
    ageRange: actualData.ageRange,
    genderPreference: actualData.genderPreference,
    image: actualData.image,
    status: actualData.status === '모집중' ? 'recruiting' : actualData.status,
    hostId: actualData.hostId || actualData.host?.id || 'unknown',
    hostName: actualData.host?.name || actualData.hostName || '익명',
    hostBabAlScore: actualData.host?.babAlScore || actualData.hostBabAlScore || 98,
    host: actualData.host ? {
      id: actualData.host.id || actualData.hostId || 'unknown',
      name: actualData.host.name || '익명',
      profileImage: actualData.host.profileImage,
      rating: actualData.host.rating,
      babAlScore: actualData.host.babAlScore || 98,
    } : undefined,
    requirements: actualData.requirements,
    tags: actualData.tags || [],
    createdAt: actualData.createdAt,
    updatedAt: actualData.updatedAt,
    participants: actualData.participants?.map((p: any) => ({
      id: p.id,
      name: p.name,
      profileImage: p.profileImage,
      status: p.status === '참가승인' ? 'approved' : p.status === '참가신청' ? 'pending' : 'rejected',
      joinedAt: p.joinedAt,
      babAlScore: p.babAlScore || 50,
    })) || [],
    lastChatTime: actualData.lastChatTime,
    lastChatMessage: actualData.lastChatMessage,
    distance: actualData.distance ?? null, // 거리 정보 (미터)
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
        console.log('📋 Fetching meetups list');
        const response = await apiCall('/meetups');
        
        console.log('🎯 Response received in fetchMeetups:', {
          response,
          responseType: typeof response,
          responseKeys: Object.keys(response || {}),
          meetupsArray: response?.meetups,
          meetupsLength: response?.meetups?.length,
          stringified: JSON.stringify(response)
        });
        
        const transformedMeetups = response.meetups?.map(transformMeetupData) || [];
        set({ meetups: transformedMeetups, loading: false });
      } catch (error) {
        console.error('모임 목록 조회 실패:', error);
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
        console.error('홈 모임 목록 조회 실패:', error);
        set({ error: (error as Error).message, loading: false });
      }
    },

    fetchActiveMeetups: async () => {
      set({ loading: true, error: null });
      try {
        console.log('⚡ Fetching active meetups list');
        const response = await apiCall('/meetups/active');
        
        const transformedMeetups = response.meetups?.map(transformMeetupData) || [];
        set({ meetups: transformedMeetups, loading: false });
      } catch (error) {
        console.error('활성 모임 목록 조회 실패:', error);
        set({ error: (error as Error).message, loading: false });
      }
    },

    fetchCompletedMeetups: async () => {
      set({ loading: true, error: null });
      try {
        console.log('✅ Fetching completed meetups list');
        const response = await apiCall('/meetups/completed');
        
        const transformedMeetups = response.meetups?.map(transformMeetupData) || [];
        set({ meetups: transformedMeetups, loading: false });
      } catch (error) {
        console.error('완료된 모임 목록 조회 실패:', error);
        set({ error: (error as Error).message, loading: false });
      }
    },
    
    fetchMeetupById: async (id: string) => {
      set({ loading: true, error: null });
      try {
        console.log('📋 Fetching meetup by ID:', id);
        const response = await apiCall(`/meetups/${id}`);
        
        console.log('🎯 Response received in fetchMeetupById:', {
          response,
          responseType: typeof response,
          responseKeys: Object.keys(response || {}),
          hasData: !!response,
          stringified: JSON.stringify(response)
        });
        
        const meetup = transformMeetupData(response);
        set({ currentMeetup: meetup, loading: false });
        return meetup;
      } catch (error) {
        console.error('모임 상세 조회 실패:', error);
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
        console.error('모임 생성 실패:', error);
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
        console.error('모임 수정 실패:', error);
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
        console.error('모임 삭제 실패:', error);
        set({ error: (error as Error).message, loading: false });
      }
    },
    
    // Participant Actions
    joinMeetup: async (meetupId: string, userId: string) => {
      try {
        await apiCall(`/meetups/${meetupId}/join`, {
          method: 'POST',
          body: JSON.stringify({ userId }),
        });
        
        // 모임 데이터 새로고침
        await get().fetchMeetupById(meetupId);
      } catch (error) {
        console.error('모임 참가 실패:', error);
        set({ error: (error as Error).message });
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
        console.error('모임 탈퇴 실패:', error);
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
        console.error('참가자 승인 실패:', error);
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
        console.error('참가자 거절 실패:', error);
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