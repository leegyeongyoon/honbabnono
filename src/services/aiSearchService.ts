import { getApiBaseUrl } from './apiClient';

interface SearchResult {
  isNoMatch?: boolean;
  userContext?: string;
  noMatchReason?: string;
  wantedCategory?: string;
  recommendedMeetups?: any[];
}

class AISearchService {
  private getApiUrl(): string {
    return getApiBaseUrl();
  }

  // 프론트엔드 카테고리를 데이터베이스 enum 값으로 매핑
  mapCategoryToDbEnum(category: string): string | null {
    const categoryMapping: { [key: string]: string } = {
      '고기/구이': '한식',
      '전골/찌개': '한식',
      '뷔페/무한리필': '기타',
      '해산물/회': '일식',
      '피자/치킨': '양식',
      '주점/술집': '술집',
      '코스요리': '양식',
      '파티룸': '기타',
      '한식': '한식',
      '중식': '중식',
      '일식': '일식',
      '양식': '양식',
      '카페': '카페',
      '술집': '술집',
      '기타': '기타'
    };
    
    return categoryMapping[category] || null;
  }

  constructor() {
    console.log('✅ AI 검색 서비스 초기화됨 (백엔드 API 사용)');
  }

  /**
   * AI 검색 수행 (백엔드 API 호출)
   */
  async searchWithAI(query: string): Promise<SearchResult[]> {
    try {
      const apiUrl = this.getApiUrl();
      console.log('🤖 백엔드 AI 검색 요청:', query, 'API URL:', apiUrl);

      const response = await fetch(`${apiUrl}/search/ai`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        console.log('✅ 백엔드 AI 검색 성공:', data.results);
        return data.results;
      } else {
        throw new Error(data.error || 'AI 검색 실패');
      }

    } catch (error) {
      console.error('🤖 백엔드 AI 검색 오류:', error);
      // 폴백: 검색 실패 시 빈 결과 반환
      return [{
        isNoMatch: true,
        userContext: query,
        noMatchReason: '검색 중 오류가 발생했습니다',
        wantedCategory: ''
      }];
    }
  }

  /**
   * AI 검색 (search 메서드 별칭)
   */
  async search(query: string): Promise<SearchResult[]> {
    return this.searchWithAI(query);
  }

  /**
   * AI 서비스 사용 가능 여부 확인
   */
  isAIEnabled(): boolean {
    return true; // 백엔드 API 사용으로 항상 가능
  }
}

export const aiSearchService = new AISearchService();
export default aiSearchService;