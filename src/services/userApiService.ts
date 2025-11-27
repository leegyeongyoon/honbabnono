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
  address?: string;
  date: string;
  time: string;
  maxParticipants: number;
  currentParticipants: number;
  category: string;
  priceRange?: string;
  ageRange?: string;
  genderPreference?: string;
  status: string;
  image?: string;
  createdAt: string;
  created_at?: string;
}

export interface JoinedMeetup {
  id: string;
  title: string;
  description?: string;
  location: string;
  address?: string;
  date: string;
  time: string;
  maxParticipants: number;
  currentParticipants: number;
  category: string;
  priceRange?: string;
  ageRange?: string;
  genderPreference?: string;
  status: string;
  image?: string;
  createdAt: string;
  created_at?: string;
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
      console.log('✅ 사용자 프로필 조회 성공', response.data);
      return response.data.user; // .user 다시 추가
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
      console.log('🏠 [API] 호스팅 모임 조회 요청 시작:', { page, limit });
      console.log('🏠 [API] API 호출: /user/hosted-meetups');
      
      const response = await apiClient.get('/user/hosted-meetups', {
        params: { page, limit }
      });
      
      console.log('🏠 [API] 응답 받음:', response.data);
      
      // 실제 API 응답 구조: { meetups: [...], pagination: {...} } 또는 { success: true, data: [...], pagination: {...} }
      const data = Array.isArray(response.data.meetups) ? response.data.meetups : 
                   Array.isArray(response.data.data) ? response.data.data : [];
      const pagination = response.data.pagination || { total: 0, page: 1, limit: 10, totalPages: 0 };
      
      console.log('✅ [API] 호스팅 모임 조회 성공:', data.length, '개');
      console.log('📊 [API] 데이터 샘플:', data.slice(0, 2));
      
      return {
        data,
        pagination
      };
    } catch (error) {
      console.error('❌ [API] 호스팅 모임 조회 실패:', error);
      throw error;
    }
  },

  // 내가 참가한 모임 목록 조회
  getJoinedMeetups: async (page: number = 1, limit: number = 10): Promise<{ data: JoinedMeetup[], pagination: PaginationInfo }> => {
    try {
      console.log('👥 [API] 참가 모임 조회 요청 시작:', { page, limit });
      console.log('👥 [API] API 호출: /user/joined-meetups');
      
      const response = await apiClient.get('/user/joined-meetups', {
        params: { page, limit }
      });
      
      console.log('👥 [API] 응답 받음:', response.data);
      
      // 실제 API 응답 구조: { meetups: [...], pagination: {...} } 또는 { success: true, data: [...], pagination: {...} }
      const data = Array.isArray(response.data.meetups) ? response.data.meetups : 
                   Array.isArray(response.data.data) ? response.data.data : [];
      const pagination = response.data.pagination || { total: 0, page: 1, limit: 10, totalPages: 0 };
      
      console.log('✅ [API] 참가 모임 조회 성공:', data.length, '개');
      console.log('📊 [API] 데이터 샘플:', data.slice(0, 2));
      
      return {
        data,
        pagination
      };
    } catch (error) {
      console.error('❌ [API] 참가 모임 조회 실패:', error);
      throw error;
    }
  },

  // 프로필 이미지 업로드
  uploadProfileImage: async (file: File): Promise<{ success: boolean; imageUrl?: string }> => {
    try {
      console.log('📷 프로필 이미지 업로드 요청', { 
        fileName: file.name, 
        fileSize: file.size, 
        fileType: file.type 
      });

      const formData = new FormData();
      formData.append('profileImage', file);

      const response = await apiClient.post('/user/upload-profile-image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      console.log('✅ 프로필 이미지 업로드 성공');
      return response.data;
    } catch (error) {
      console.error('❌ 프로필 이미지 업로드 실패:', error);
      throw error;
    }
  },

  // 프로필 업데이트
  updateProfile: async (profileData: { name?: string; profileImage?: string }): Promise<any> => {
    try {
      console.log('🔄 프로필 업데이트 요청', profileData);

      const response = await apiClient.put('/user/profile', profileData);

      console.log('✅ 프로필 업데이트 성공');
      return response.data;
    } catch (error) {
      console.error('❌ 프로필 업데이트 실패:', error);
      throw error;
    }
  },

  // 사용자 통계 조회
  getUserStats: async (): Promise<any> => {
    try {
      console.log('📈 사용자 통계 조회 요청');
      const response = await apiClient.get('/user/stats');
      console.log('✅ 사용자 통계 조회 성공');
      return response.data.stats;
    } catch (error) {
      console.error('❌ 사용자 통계 조회 실패:', error);
      throw error;
    }
  },

  // 사용자 뱃지 조회
  getUserBadges: async (): Promise<any> => {
    try {
      console.log('🏆 사용자 뱃지 조회 요청');
      const response = await apiClient.get('/user/badges');
      console.log('✅ 사용자 뱃지 조회 성공');
      return response.data.badges;
    } catch (error) {
      console.error('❌ 사용자 뱃지 조회 실패:', error);
      throw error;
    }
  },

};

export default userApiService;