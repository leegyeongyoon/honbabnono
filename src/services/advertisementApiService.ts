import { localStorage } from '../utils/localStorageCompat';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

export interface Advertisement {
  id: number;
  title: string;
  description?: string;
  imageUrl: string;
  linkUrl?: string;
  useDetailPage?: boolean;
  detailContent?: string;
  businessName?: string;
  contactInfo?: string;
  position: 'home_banner' | 'sidebar' | 'bottom';
  priority: number;
  createdAt: string;
}

class AdvertisementApiService {
  /**
   * 활성 광고 목록 조회 (공개 API)
   */
  async getActiveAdvertisements(position: string = 'home_banner'): Promise<Advertisement[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/advertisements/active?position=${position}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.success ? data.data : [];
    } catch (error) {
      // silently handle error
      return [];
    }
  }

  /**
   * 광고 클릭 기록
   */
  async recordClick(advertisementId: number): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/advertisements/${advertisementId}/click`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.success;
    } catch (error) {
      // silently handle error
      return false;
    }
  }

  /**
   * 광고 디테일 페이지 조회 (공개 API)
   */
  async getAdvertisementDetail(advertisementId: number): Promise<Advertisement | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/advertisements/detail/${advertisementId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.success ? data.data : null;
    } catch (error) {
      // silently handle error
      return null;
    }
  }

  /**
   * 관리자 - 모든 광고 목록 조회
   */
  async getAllAdvertisements(
    page: number = 1, 
    limit: number = 20, 
    filters?: { position?: string; isActive?: boolean }
  ): Promise<{ advertisements: Advertisement[]; pagination: any }> {
    try {
      const token = await localStorage.getItem('token');
      if (!token) {
        throw new Error('인증 토큰이 없습니다.');
      }

      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(filters?.position && { position: filters.position }),
        ...(filters?.isActive !== undefined && { isActive: filters.isActive.toString() })
      });

      const response = await fetch(`${API_BASE_URL}/advertisements?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        advertisements: data.data || [],
        pagination: data.pagination || {}
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * 관리자 - 광고 생성
   */
  async createAdvertisement(formData: FormData): Promise<Advertisement> {
    try {
      const token = await localStorage.getItem('token');
      if (!token) {
        throw new Error('인증 토큰이 없습니다.');
      }

      const response = await fetch(`${API_BASE_URL}/advertisements`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '광고 생성에 실패했습니다.');
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * 관리자 - 광고 수정
   */
  async updateAdvertisement(id: number, formData: FormData): Promise<Advertisement> {
    try {
      const token = await localStorage.getItem('token');
      if (!token) {
        throw new Error('인증 토큰이 없습니다.');
      }

      const response = await fetch(`${API_BASE_URL}/advertisements/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '광고 수정에 실패했습니다.');
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * 관리자 - 광고 삭제
   */
  async deleteAdvertisement(id: number): Promise<boolean> {
    try {
      const token = await localStorage.getItem('token');
      if (!token) {
        throw new Error('인증 토큰이 없습니다.');
      }

      const response = await fetch(`${API_BASE_URL}/advertisements/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '광고 삭제에 실패했습니다.');
      }

      return true;
    } catch (error) {
      throw error;
    }
  }

  /**
   * 관리자 - 광고 활성/비활성 토글
   */
  async toggleAdvertisement(id: number): Promise<{ isActive: boolean }> {
    try {
      const token = await localStorage.getItem('token');
      if (!token) {
        throw new Error('인증 토큰이 없습니다.');
      }

      const response = await fetch(`${API_BASE_URL}/advertisements/${id}/toggle`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '광고 상태 변경에 실패했습니다.');
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      throw error;
    }
  }
}

export default new AdvertisementApiService();