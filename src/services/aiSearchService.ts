import OpenAI from 'openai';
import { FOOD_CATEGORIES } from '../constants/categories';

interface SearchResult {
  meetups: any[];
  suggestions: string[];
  intent: {
    type: 'search' | 'filter' | 'recommendation';
    category?: string;
    location?: string;
    priceRange?: string;
    time?: string;
  };
}

class AISearchService {
  private openai: OpenAI | null = null;
  private isInitialized = false;

  constructor() {
    // OpenAI API 키가 설정되어 있을 때만 초기화
    const apiKey = process.env.REACT_APP_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
    if (apiKey) {
      this.openai = new OpenAI({
        apiKey: apiKey,
        dangerouslyAllowBrowser: true, // 클라이언트 사이드에서 사용
      });
      this.isInitialized = true;
    }
  }

  /**
   * 사용자 검색어를 분석하여 의도와 필터를 추출합니다
   */
  async analyzeSearchIntent(query: string): Promise<any> {
    if (!this.isInitialized) {
      return this.fallbackAnalysis(query);
    }

    try {
      const prompt = `
다음은 한국의 모임 검색 쿼리입니다. 사용자의 의도를 분석하여 JSON 형식으로 응답해주세요.

사용 가능한 카테고리: ${FOOD_CATEGORIES.map(cat => cat.name).join(', ')}
사용 가능한 지역: 강남구, 서초구, 송파구, 강동구, 마포구, 용산구, 성동구, 광진구, 종로구, 중구, 영등포구, 구로구 등
가격대: 1만원 이하, 1-2만원, 2-3만원, 3만원 이상

검색 쿼리: "${query}"

다음 형식으로 응답해주세요:
{
  "intent": {
    "type": "search|filter|recommendation",
    "category": "카테고리 이름 (해당되는 경우)",
    "location": "지역 이름 (해당되는 경우)", 
    "priceRange": "가격대 (해당되는 경우)",
    "time": "시간 관련 키워드 (해당되는 경우)"
  },
  "keywords": ["추출된", "키워드", "목록"],
  "suggestions": ["추천 검색어 1", "추천 검색어 2", "추천 검색어 3"]
}
`;

      const response = await this.openai!.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "당신은 한국의 모임 검색 전문 AI입니다. 사용자의 검색 의도를 정확히 파악하여 구조화된 데이터로 변환합니다."
          },
          {
            role: "user", 
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 500
      });

      const result = response.choices[0]?.message?.content;
      if (result) {
        return JSON.parse(result);
      }
    } catch (error) {
      console.error('OpenAI API 오류:', error);
      return this.fallbackAnalysis(query);
    }

    return this.fallbackAnalysis(query);
  }

  /**
   * AI API 사용 불가능할 때 사용하는 폴백 분석
   */
  private fallbackAnalysis(query: string) {
    const intent: any = { type: 'search' };
    const keywords = query.split(' ').filter(word => word.length > 1);
    const suggestions: string[] = [];

    // 카테고리 감지
    const category = FOOD_CATEGORIES.find(cat => 
      query.includes(cat.name) || query.includes(cat.desc)
    );
    if (category) {
      intent.category = category.name;
    }

    // 지역 감지
    const locations = ['강남', '서초', '송파', '마포', '용산', '종로', '중구'];
    const location = locations.find(loc => query.includes(loc));
    if (location) {
      intent.location = location;
    }

    // 가격 감지
    if (query.includes('저렴') || query.includes('싸') || query.includes('1만원')) {
      intent.priceRange = '1만원 이하';
    } else if (query.includes('고급') || query.includes('비싸') || query.includes('3만원')) {
      intent.priceRange = '3만원 이상';
    }

    // 시간 감지
    if (query.includes('오늘') || query.includes('지금') || query.includes('당장')) {
      intent.time = '오늘';
    } else if (query.includes('내일')) {
      intent.time = '내일';
    } else if (query.includes('주말')) {
      intent.time = '주말';
    }

    // 추천 검색어 생성
    if (category) {
      suggestions.push(`${category.name} 모임`);
      suggestions.push(`${category.name} 맛집`);
    }
    if (location) {
      suggestions.push(`${location} 모임`);
    }
    suggestions.push('혼밥 모임', '새로운 사람들과', '맛집 탐방');

    return {
      intent,
      keywords,
      suggestions: suggestions.slice(0, 3)
    };
  }

  /**
   * 검색어를 기반으로 모임 추천을 생성합니다
   */
  async generateRecommendations(query: string, meetups: any[]): Promise<string[]> {
    if (!this.isInitialized) {
      return this.fallbackRecommendations(query, meetups);
    }

    try {
      const meetupTitles = meetups.slice(0, 10).map(m => m.title).join('\n- ');
      
      const prompt = `
사용자 검색어: "${query}"
현재 모집중인 모임들:
- ${meetupTitles}

위 정보를 바탕으로 사용자에게 도움이 될 3개의 구체적인 검색 제안을 만들어주세요.
각 제안은 실제 검색 가능한 형태로 만들어주세요.

예시 형식:
- "강남 고기집 모임"
- "이번 주말 파티룸"  
- "2만원대 이탈리안"
`;

      const response = await this.openai!.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "당신은 모임 검색 추천 전문가입니다. 사용자의 검색 의도와 현재 모집중인 모임을 바탕으로 유용한 검색 제안을 만듭니다."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 300
      });

      const result = response.choices[0]?.message?.content;
      if (result) {
        // "- " 형태로 시작하는 라인들을 추출
        const recommendations = result
          .split('\n')
          .filter(line => line.trim().startsWith('- '))
          .map(line => line.replace(/^- /, '').trim())
          .slice(0, 3);
        
        return recommendations.length > 0 ? recommendations : this.fallbackRecommendations(query, meetups);
      }
    } catch (error) {
      console.error('추천 생성 오류:', error);
    }

    return this.fallbackRecommendations(query, meetups);
  }

  /**
   * AI 추천이 불가능할 때 사용하는 폴백 추천
   */
  private fallbackRecommendations(query: string, meetups: any[]): string[] {
    const recommendations = [];
    
    // 인기 카테고리 기반 추천
    const popularCategories = ['고기/구이', '전골/찌개', '피자/치킨'];
    recommendations.push(`${popularCategories[Math.floor(Math.random() * popularCategories.length)]} 모임`);
    
    // 지역 기반 추천
    const popularAreas = ['강남', '홍대', '신촌'];
    recommendations.push(`${popularAreas[Math.floor(Math.random() * popularAreas.length)]} 맛집 탐방`);
    
    // 시간 기반 추천
    const now = new Date();
    const isWeekend = now.getDay() === 0 || now.getDay() === 6;
    recommendations.push(isWeekend ? '주말 브런치 모임' : '퇴근 후 술모임');
    
    return recommendations;
  }

  /**
   * AI 서비스 사용 가능 여부 확인
   */
  isAIEnabled(): boolean {
    return this.isInitialized;
  }
}

export const aiSearchService = new AISearchService();
export default aiSearchService;