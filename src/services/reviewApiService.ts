import apiClient from './apiClient';

export interface Review {
  id: string;
  meetup_id: string;
  reviewer_id: string;
  reviewer_name: string;
  rating: number;
  comment: string;
  content: string;
  tags: string[];
  created_at: string;
  updated_at?: string;
  reviewer_profile_image?: string;
  meetup_title?: string;
  meetup_date?: string;
  meetup_location?: string;
  host_name?: string;
  is_anonymous?: boolean;
  reply?: string;
  reply_at?: string;
  can_reply?: boolean;
}

export interface UserReview {
  id: string;
  meetup_id: string;
  rating: number;
  comment: string;
  content: string;
  tags: string[];
  created_at: string;
  updated_at?: string;
  meetup_title: string;
  meetup_date: string;
  meetup_location: string;
  meetup_category: string;
  host_name?: string;
}

export interface ReceivedReview {
  id: string;
  meetup_id: string;
  meetup_title: string;
  reviewer_name: string;
  rating: number;
  comment: string;
  tags: string[];
  created_at: string;
  can_reply: boolean;
  reply?: string;
  reply_at?: string;
  is_anonymous?: boolean;
}

export interface ReviewStats {
  averageRating: number;
  totalReviews: number;
}

export interface ReviewListResponse {
  reviews: Review[];
  stats: ReviewStats;
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface CreateReviewRequest {
  rating: number;
  comment?: string;
  tags?: string[];
}

export interface UpdateReviewRequest {
  rating?: number;
  content?: string;
}

const reviewApiService = {
  // 리뷰 작성
  createReview: async (meetupId: string, reviewData: CreateReviewRequest): Promise<Review> => {
    const response = await apiClient.post(`/meetups/${meetupId}/reviews`, reviewData);
    return response.data.data;
  },

  // 모임의 리뷰 목록 조회
  getMeetupReviews: async (meetupId: string, page: number = 1, limit: number = 10): Promise<ReviewListResponse> => {
    const response = await apiClient.get(`/meetups/${meetupId}/reviews`, {
      params: { page, limit },
    });
    return response.data.data;
  },

  // 사용자가 작성한 리뷰 목록 조회
  getWrittenReviews: async (page: number = 1, limit: number = 20): Promise<{ reviews: UserReview[]; pagination: any }> => {
    const response = await apiClient.get('/user/reviews/manage', {
      params: { page, limit },
    });
    return {
      reviews: response.data.reviews || [],
      pagination: response.data.pagination,
    };
  },

  // 받은 리뷰 목록 조회
  getReceivedReviews: async (): Promise<{ reviews: ReceivedReview[] }> => {
    const response = await apiClient.get('/user/reviews/received');
    return {
      reviews: response.data.reviews || [],
    };
  },

  // 리뷰 수정
  updateReview: async (reviewId: string, data: UpdateReviewRequest): Promise<any> => {
    const response = await apiClient.put(`/reviews/${reviewId}`, data);
    return response.data;
  },

  // 리뷰 삭제
  deleteReview: async (reviewId: string): Promise<any> => {
    const response = await apiClient.delete(`/reviews/${reviewId}`);
    return response.data;
  },

  // 리뷰 답변 (받은 리뷰에 대한 답변)
  replyToReview: async (reviewId: string, reply: string): Promise<any> => {
    const response = await apiClient.post(`/reviews/${reviewId}/reply`, { reply });
    return response.data;
  },

  // 사용자 리뷰 통계 조회
  getUserReviewStats: async (userId: string): Promise<ReviewStats> => {
    const response = await apiClient.get(`/reviews/stats/${userId}`);
    return response.data;
  },
};

export default reviewApiService;
