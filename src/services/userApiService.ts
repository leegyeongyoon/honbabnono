import apiClient from './apiClient';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  profile_image?: string;
  provider: string;
  provider_id: string;
  is_verified: boolean;
  rating?: number;
  meetups_hosted?: number;
  created_at: string;
  updated_at: string;
}

export interface ActivityStats {
  hostedMeetups: number;
  joinedMeetups: number;
  completedMeetups: number;
  upcomingMeetups: number;
}

export interface HostedMeetup {
  id: string;
  title: string;
  description?: string;
  location: string;
  date: string;
  time: string;
  maxParticipants: number;
  currentParticipants: number;
  category: string;
  status: string;
  createdAt: string;
}

export interface JoinedMeetup {
  id: string;
  title: string;
  description?: string;
  location: string;
  date: string;
  time: string;
  maxParticipants: number;
  currentParticipants: number;
  category: string;
  status: string;
  createdAt: string;
  participationStatus: string;
  joinedAt: string;
  hostName: string;
}

export interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const userApiService = {
  // 사용자 프로필 조회
  getProfile: async (): Promise<UserProfile> => {
    try {
      console.log('👤 사용자 프로필 조회 요청');
      const response = await apiClient.get('/user/profile');
      console.log('✅ 사용자 프로필 조회 성공');
      return response.data.user;
    } catch (error) {
      console.error('❌ 사용자 프로필 조회 실패:', error);
      throw error;
    }
  },

  // 활동 통계 조회
  getActivityStats: async (): Promise<ActivityStats> => {
    try {
      console.log('📊 활동 통계 조회 요청');
      const response = await apiClient.get('/user/activity-stats');
      console.log('✅ 활동 통계 조회 성공:', response.data.data);
      return response.data.data;
    } catch (error) {
      console.error('❌ 활동 통계 조회 실패:', error);
      throw error;
    }
  },

  // 내가 호스팅한 모임 목록 조회
  getHostedMeetups: async (page: number = 1, limit: number = 10): Promise<{ data: HostedMeetup[], pagination: PaginationInfo }> => {
    try {
      console.log('🏠 호스팅 모임 조회 요청:', { page, limit });
      const response = await apiClient.get('/user/hosted-meetups', {
        params: { page, limit }
      });
      console.log('✅ 호스팅 모임 조회 성공:', response.data.data.length, '개');
      return {
        data: response.data.data,
        pagination: response.data.pagination
      };
    } catch (error) {
      console.error('❌ 호스팅 모임 조회 실패:', error);
      throw error;
    }
  },

  // 내가 참가한 모임 목록 조회
  getJoinedMeetups: async (page: number = 1, limit: number = 10): Promise<{ data: JoinedMeetup[], pagination: PaginationInfo }> => {
    try {
      console.log('👥 참가 모임 조회 요청:', { page, limit });
      const response = await apiClient.get('/user/joined-meetups', {
        params: { page, limit }
      });
      console.log('✅ 참가 모임 조회 성공:', response.data.data.length, '개');
      return {
        data: response.data.data,
        pagination: response.data.pagination
      };
    } catch (error) {
      console.error('❌ 참가 모임 조회 실패:', error);
      throw error;
    }
  },
};

export default userApiService;