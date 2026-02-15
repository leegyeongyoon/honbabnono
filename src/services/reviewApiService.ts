import apiClient from './apiClient';

export interface Review {
  id: string;
  meetup_id: string;
  reviewer_id: string;
  reviewer_name: string;
  rating: number;
  comment: string;
  tags: string[];
  created_at: string;
  reviewer_profile_image?: string;
}

export interface UserReview {
  id: string;
  meetup_id: string;
  rating: number;
  comment: string;
  tags: string[];
  created_at: string;
  meetup_title: string;
  meetup_date: string;
  meetup_location: string;
  meetup_category: string;
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

const reviewApiService = {
  // 리뷰 작성
  createReview: async (meetupId: string, reviewData: CreateReviewRequest): Promise<Review> => {
    try {
      const response = await apiClient.post(`/meetups/${meetupId}/reviews`, reviewData);
      return response.data.data;
    } catch (error) {
      throw error;
    }
  },

  // 모임의 리뷰 목록 조회
  getMeetupReviews: async (meetupId: string, page: number = 1, limit: number = 10): Promise<ReviewListResponse> => {
    try {
      const response = await apiClient.get(`/meetups/${meetupId}/reviews`, {
        params: { page, limit }
      });
      return response.data.data;
    } catch (error) {
      throw error;
    }
  },

  // 사용자가 작성한 리뷰 목록 조회
  getUserReviews: async (page: number = 1, limit: number = 10): Promise<{ data: UserReview[], pagination: any }> => {
    try {
      const response = await apiClient.get('/user/reviews', {
        params: { page, limit }
      });
      return {
        data: response.data.data,
        pagination: response.data.pagination
      };
    } catch (error) {
      throw error;
    }
  },
};

export default reviewApiService;
