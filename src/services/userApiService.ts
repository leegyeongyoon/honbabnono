import apiClient from './apiClient';
import { localStorage } from '../utils/localStorageCompat';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  profileImage?: string;
  provider: string;
  providerId: string;
  isVerified: boolean;
  rating?: number;
  meetupsHosted?: number;
  createdAt: string;
  updatedAt: string;
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
  // 사용자 프로필 조회 (토큰 검증 API를 사용)
  getProfile: async (): Promise<UserProfile> => {
    try {
      // 저장된 토큰 가져오기
      const token = await localStorage.getItem('token');

      if (!token) {
        throw new Error('토큰이 없습니다');
      }

      const response = await apiClient.post('/auth/verify-token', { token });

      const userData = response.data.user;

      return userData;
    } catch (error) {
      throw error;
    }
  },

  // 활동 통계 조회
  getActivityStats: async (): Promise<ActivityStats> => {
    try {
      const response = await apiClient.get('/user/activity-stats');
      return response.data.data;
    } catch (error) {
      throw error;
    }
  },

  // 내가 호스팅한 모임 목록 조회
  getHostedMeetups: async (page: number = 1, limit: number = 10): Promise<{ data: HostedMeetup[], pagination: PaginationInfo }> => {
    try {
      const response = await apiClient.get('/user/hosted-meetups', {
        params: { page, limit }
      });

      // 실제 API 응답 구조: { meetups: [...], pagination: {...} } 또는 { success: true, data: [...], pagination: {...} }
      const data = Array.isArray(response.data.meetups) ? response.data.meetups :
                   Array.isArray(response.data.data) ? response.data.data : [];
      const pagination = response.data.pagination || { total: 0, page: 1, limit: 10, totalPages: 0 };

      return {
        data,
        pagination
      };
    } catch (error) {
      throw error;
    }
  },

  // 내가 참가한 모임 목록 조회
  getJoinedMeetups: async (page: number = 1, limit: number = 10): Promise<{ data: JoinedMeetup[], pagination: PaginationInfo }> => {
    try {
      const response = await apiClient.get('/user/joined-meetups', {
        params: { page, limit }
      });

      // 실제 API 응답 구조: { meetups: [...], pagination: {...} } 또는 { success: true, data: [...], pagination: {...} }
      const data = Array.isArray(response.data.meetups) ? response.data.meetups :
                   Array.isArray(response.data.data) ? response.data.data : [];
      const pagination = response.data.pagination || { total: 0, page: 1, limit: 10, totalPages: 0 };

      return {
        data,
        pagination
      };
    } catch (error) {
      throw error;
    }
  },

  // 프로필 이미지 업로드
  uploadProfileImage: async (file: File): Promise<{ success: boolean; imageUrl?: string }> => {
    try {
      const formData = new FormData();
      formData.append('profileImage', file);

      const response = await apiClient.post('/user/upload-profile-image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // 프로필 업데이트
  updateProfile: async (profileData: { name?: string; profileImage?: string }): Promise<any> => {
    try {
      const response = await apiClient.put('/users/profile', profileData);

      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // 사용자 통계 조회
  getUserStats: async (): Promise<any> => {
    try {
      const response = await apiClient.get('/user/stats');
      return response.data.stats;
    } catch (error) {
      throw error;
    }
  },

  // 사용자 뱃지 조회
  getUserBadges: async (): Promise<any> => {
    try {
      const response = await apiClient.get('/user/badges');
      return response.data.badges;
    } catch (error) {
      throw error;
    }
  },

  // 밥알지수 조회
  getRiceIndex: async (): Promise<any> => {
    try {
      const response = await apiClient.get('/user/rice-index');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // ==================== 찜 목록 관련 ====================

  // 찜 목록 조회
  getWishlist: async (page: number = 1, limit: number = 20): Promise<any> => {
    try {
      const response = await apiClient.get('/user/wishlists', { params: { page, limit } });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // 찜 추가
  addToWishlist: async (meetupId: string): Promise<any> => {
    try {
      const response = await apiClient.post(`/meetups/${meetupId}/wishlist`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // 찜 삭제
  removeFromWishlist: async (meetupId: string): Promise<any> => {
    try {
      const response = await apiClient.delete(`/meetups/${meetupId}/wishlist`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // ==================== 최근 본 글 관련 ====================

  // 최근 본 글 조회
  getRecentViews: async (page: number = 1, limit: number = 20): Promise<any> => {
    try {
      const response = await apiClient.get('/user/recent-views', { params: { page, limit } });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // 최근 본 글 기록 추가
  addRecentView: async (meetupId: string): Promise<any> => {
    try {
      const response = await apiClient.post(`/users/recent-views/${meetupId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // 최근 본 글 삭제
  removeRecentView: async (viewId: string): Promise<any> => {
    try {
      const response = await apiClient.delete(`/user/recent-views/${viewId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // 최근 본 글 전체 삭제
  clearRecentViews: async (): Promise<any> => {
    try {
      const response = await apiClient.delete('/user/recent-views');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // ==================== 차단 회원 관련 ====================

  // 차단 회원 목록 조회
  getBlockedUsers: async (): Promise<any> => {
    try {
      const response = await apiClient.get('/user/blocked-users');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // 회원 차단
  blockUser: async (userId: string, reason?: string): Promise<any> => {
    try {
      const response = await apiClient.post(`/users/${userId}/block`, { reason });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // 회원 차단 해제
  unblockUser: async (userId: string): Promise<any> => {
    try {
      const response = await apiClient.delete(`/users/${userId}/block`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // 차단 상태 확인
  getBlockedStatus: async (userId: string): Promise<any> => {
    try {
      const response = await apiClient.get(`/users/${userId}/blocked-status`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // ==================== 포인트 관련 ====================

  // 포인트 잔액 조회
  getPoints: async (): Promise<any> => {
    try {
      const response = await apiClient.get('/users/points');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // 포인트 내역 조회
  getPointHistory: async (page: number = 1, limit: number = 20): Promise<any> => {
    try {
      const response = await apiClient.get('/user/point-transactions', { params: { page, limit } });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // 포인트 충전
  chargePoints: async (amount: number, paymentMethod: string): Promise<any> => {
    try {
      const response = await apiClient.post('/user/charge-points', { amount, paymentMethod });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // 포인트 사용
  usePoints: async (amount: number, description: string): Promise<any> => {
    try {
      const response = await apiClient.post('/user/spend-points', { amount, description });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // ==================== 결제 내역 관련 ====================

  // 결제 내역 조회
  getPaymentHistory: async (page: number = 1, limit: number = 20): Promise<any> => {
    try {
      const response = await apiClient.get('/users/payment-history', { params: { page, limit } });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // 보증금 내역 조회
  getDeposits: async (): Promise<any> => {
    try {
      const response = await apiClient.get('/user/deposits');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // ==================== 리뷰 관련 ====================

  // 내 리뷰 목록 조회
  getMyReviews: async (page: number = 1, limit: number = 20): Promise<any> => {
    try {
      const response = await apiClient.get('/users/my-reviews', { params: { page, limit } });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // 리뷰 수정
  updateReview: async (reviewId: string, data: { rating?: number; content?: string }): Promise<any> => {
    try {
      const response = await apiClient.put(`/users/my-reviews/${reviewId}`, data);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // 리뷰 삭제
  deleteReview: async (reviewId: string): Promise<any> => {
    try {
      const response = await apiClient.delete(`/users/my-reviews/${reviewId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // 리뷰 작성 가능한 모임 조회
  getReviewableMeetups: async (): Promise<any> => {
    try {
      const response = await apiClient.get('/user/reviewable-meetups');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // ==================== 공지사항/FAQ 관련 ====================

  // 공지사항 목록 조회
  getNotices: async (page: number = 1, limit: number = 20): Promise<any> => {
    try {
      const response = await apiClient.get('/notices', { params: { page, limit } });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // 공지사항 상세 조회
  getNoticeDetail: async (noticeId: string): Promise<any> => {
    try {
      const response = await apiClient.get(`/notices/${noticeId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // FAQ 목록 조회
  getFAQ: async (): Promise<any> => {
    try {
      const response = await apiClient.get('/faq');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // ==================== 알림 설정 관련 ====================

  // 알림 설정 조회
  getNotificationSettings: async (): Promise<any> => {
    try {
      const response = await apiClient.get('/user/notification-settings');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // 알림 설정 업데이트
  updateNotificationSettings: async (settings: any): Promise<any> => {
    try {
      const response = await apiClient.put('/user/notification-settings', settings);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // ==================== 친구 초대 관련 ====================

  // 초대 코드 조회
  getInviteCode: async (): Promise<any> => {
    try {
      const response = await apiClient.get('/users/invite-code');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // 초대 코드 사용
  useInviteCode: async (code: string): Promise<any> => {
    try {
      const response = await apiClient.post('/users/use-invite-code', { code });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // ==================== 계정 관련 ====================

  // 비밀번호 변경
  changePassword: async (currentPassword: string, newPassword: string): Promise<any> => {
    try {
      const response = await apiClient.put('/user/password', { currentPassword, newPassword });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // 데이터 내보내기
  exportData: async (): Promise<any> => {
    try {
      const response = await apiClient.get('/user/data-export');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // 계정 삭제
  deleteAccount: async (): Promise<any> => {
    try {
      const response = await apiClient.delete('/user/account');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // ==================== 활동 내역 관련 ====================

  // 활동 내역 조회
  getActivities: async (page: number = 1, limit: number = 20): Promise<any> => {
    try {
      const response = await apiClient.get('/user/activities', { params: { page, limit } });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // ==================== 개인정보 설정 관련 ====================

  // 개인정보 설정 조회
  getPrivacySettings: async (): Promise<any> => {
    try {
      const response = await apiClient.get('/user/privacy-settings');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // 개인정보 설정 업데이트
  updatePrivacySettings: async (settings: any): Promise<any> => {
    try {
      const response = await apiClient.put('/user/privacy-settings', settings);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

};

export default userApiService;
