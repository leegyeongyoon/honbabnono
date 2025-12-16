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
    // OpenAI API 키가 설정되어 있을 때만 초기화
    try {
      // React 환경변수에서 API 키 읽기
      const apiKey = process.env.REACT_APP_OPENAI_API_KEY;
      console.log('🔍 OpenAI API 키 확인:', !!apiKey, apiKey ? `${apiKey.substring(0, 10)}...` : 'none');
      
      if (apiKey) {
        this.openai = new OpenAI({
          apiKey: apiKey,
          dangerouslyAllowBrowser: true, // 클라이언트 사이드에서 사용
        });
        this.isInitialized = true;
        console.log('✅ OpenAI AI 검색 서비스 활성화됨');
      } else {
        console.log('❌ OpenAI API 키가 설정되지 않음, AI 검색 비활성화');
        this.isInitialized = false;
      }
    } catch (error) {
      console.error('❌ OpenAI 초기화 오류:', error);
      this.isInitialized = false;
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
   * 스마트 필터 추출 - 더 많은 패턴 인식
   */
  private extractSmartFilters(query: string) {
    const filters: any = {
      categories: [],
      locations: [],
      priceRanges: [],
      times: [],
      genderPreferences: [],
      ageRanges: [],
      keywords: [],
      sentiments: [],
      groupSizes: []
    };

    // 카테고리 매핑 (더 많은 변형 포함)
    const categoryMappings: { [key: string]: string[] } = {
      '한식': ['한식', '김치', '된장', '불고기', '갈비', '삼겹살', '고기', '구이', '찌개', '전골', '탕', '국밥'],
      '중식': ['중식', '중국', '짜장', '짬뽕', '탕수육', '마라', '훠궈', '딤섬'],
      '일식': ['일식', '일본', '스시', '초밥', '라멘', '돈카츠', '우동', '소바', '회', '사시미'],
      '양식': ['양식', '파스타', '피자', '스테이크', '햄버거', '샐러드', '브런치', '이탈리안', '프렌치'],
      '카페': ['카페', '커피', '디저트', '케이크', '빵', '베이커리', '브런치', '티'],
      '술집': ['술', '술집', '호프', '이자카야', '포차', '바', '막걸리', '소주', '맥주', '와인', '위스키'],
      '기타': ['뷔페', '분식', '패스트푸드', '길거리', '푸드트럭', '야시장', '특별한']
    };

    // 카테고리 검색
    for (const [dbCategory, keywords] of Object.entries(categoryMappings)) {
      if (keywords.some(keyword => query.includes(keyword))) {
        filters.categories.push(dbCategory);
      }
    }

    // 지역 검색 (더 자세한 지역)
    const locationKeywords = [
      '강남', '서초', '송파', '강동', '마포', '용산', '성동', '광진',
      '종로', '중구', '영등포', '구로', '관악', '동작', '서대문', '은평',
      '홍대', '신촌', '이태원', '성수', '건대', '왕십리', '을지로', '명동',
      '강북', '노원', '도봉', '중랑', '성북', '동대문', '서울', '경기'
    ];
    
    locationKeywords.forEach(loc => {
      if (query.includes(loc)) {
        filters.locations.push(loc);
      }
    });

    // 가격대 검색
    const pricePatterns = [
      { pattern: ['무료', '공짜', '0원'], range: '무료' },
      { pattern: ['저렴', '싸', '1만원 이하', '만원 이하'], range: '1만원 이하' },
      { pattern: ['1-2만원', '1만원대', '15000', '2만원 이하'], range: '1-2만원' },
      { pattern: ['2-3만원', '2만원대', '25000'], range: '2-3만원' },
      { pattern: ['고급', '비싸', '3만원 이상', '프리미엄'], range: '3만원 이상' }
    ];

    pricePatterns.forEach(({ pattern, range }) => {
      if (pattern.some(p => query.includes(p))) {
        filters.priceRanges.push(range);
      }
    });

    // 시간 관련
    const timeKeywords = {
      '오늘': new Date(),
      '내일': new Date(Date.now() + 86400000),
      '주말': 'weekend',
      '평일': 'weekday',
      '점심': 'lunch',
      '저녁': 'dinner',
      '브런치': 'brunch',
      '아침': 'morning',
      '오후': 'afternoon',
      '밤': 'night'
    };

    Object.entries(timeKeywords).forEach(([keyword, value]) => {
      if (query.includes(keyword)) {
        filters.times.push({ keyword, value });
      }
    });

    // 성별 선호도
    if (query.includes('여자') || query.includes('여성')) {
      filters.genderPreferences.push('여성만');
    }
    if (query.includes('남자') || query.includes('남성')) {
      filters.genderPreferences.push('남성만');
    }
    if (query.includes('혼성') || query.includes('누구나')) {
      filters.genderPreferences.push('상관없음');
    }

    // 연령대
    const agePatterns = [
      { pattern: ['20대', '이십대', '20살'], range: '20대' },
      { pattern: ['30대', '삼십대', '30살'], range: '30대' },
      { pattern: ['40대', '사십대', '40살'], range: '40대' },
      { pattern: ['50대', '오십대', '50살'], range: '50대' },
      { pattern: ['청년', '젊은'], range: '20-30대' },
      { pattern: ['중년'], range: '40-50대' }
    ];

    agePatterns.forEach(({ pattern, range }) => {
      if (pattern.some(p => query.includes(p))) {
        filters.ageRanges.push(range);
      }
    });

    // 감정/분위기
    const sentiments = {
      'positive': ['즐거운', '신나는', '재밌는', '활발한', '파티', '왁자지껄'],
      'calm': ['조용한', '차분한', '편안한', '힐링', '여유로운'],
      'serious': ['진지한', '공부', '스터디', '토론', '세미나'],
      'casual': ['캐주얼', '편한', '자유로운', '부담없는']
    };

    Object.entries(sentiments).forEach(([mood, keywords]) => {
      if (keywords.some(k => query.includes(k))) {
        filters.sentiments.push(mood);
      }
    });

    // 그룹 규모
    if (query.includes('소규모') || query.includes('소수') || query.includes('2-3명')) {
      filters.groupSizes.push('small');
    }
    if (query.includes('대규모') || query.includes('많은') || query.includes('단체')) {
      filters.groupSizes.push('large');
    }

    // 핵심 키워드 추출
    const stopWords = ['모임', '찾기', '검색', '추천', '에서', '으로', '와', '과', '를', '을', '이', '가'];
    filters.keywords = query.split(' ')
      .filter(word => word.length > 1 && !stopWords.includes(word))
      .slice(0, 5);

    return filters;
  }

  /**
   * AI API 사용 불가능할 때 사용하는 폴백 분석
   */
  private fallbackAnalysis(query: string) {
    const filters = this.extractSmartFilters(query);
    
    // 주요 의도 파악
    const intent: any = { 
      type: 'search',
      filters: filters
    };

    // 가장 가능성 높은 카테고리 선택
    if (filters.categories.length > 0) {
      intent.category = filters.categories[0];
    }

    // 가장 가능성 높은 지역 선택
    if (filters.locations.length > 0) {
      intent.location = filters.locations[0];
    }

    // 가격대
    if (filters.priceRanges.length > 0) {
      intent.priceRange = filters.priceRanges[0];
    }

    // 추천 검색어 생성
    const suggestions: string[] = [];
    
    if (filters.categories.length > 0) {
      suggestions.push(`${filters.categories[0]} 맛집 모임`);
    }
    if (filters.locations.length > 0) {
      suggestions.push(`${filters.locations[0]} 모임`);
    }
    if (filters.sentiments.length > 0) {
      suggestions.push(`${filters.sentiments[0] === 'positive' ? '즐거운' : '조용한'} 모임`);
    }
    
    // 기본 추천
    suggestions.push('인기 모임', '새로운 모임', '오늘의 추천');

    return {
      intent,
      keywords: filters.keywords,
      suggestions: suggestions.slice(0, 3),
      confidence: this.calculateConfidence(filters)
    };
  }

  /**
   * 검색 신뢰도 계산
   */
  private calculateConfidence(filters: any): number {
    let confidence = 0;
    
    if (filters.categories.length > 0) confidence += 30;
    if (filters.locations.length > 0) confidence += 20;
    if (filters.priceRanges.length > 0) confidence += 10;
    if (filters.times.length > 0) confidence += 10;
    if (filters.keywords.length > 2) confidence += 20;
    if (filters.sentiments.length > 0) confidence += 10;
    
    return Math.min(confidence, 100);
  }

  /**
   * 검색어를 기반으로 모임 추천을 생성합니다
   */
  async generateRecommendations(query: string, meetups: any[]): Promise<string[]> {
    if (!this.isInitialized) {
      return this.fallbackRecommendations(query, meetups);
    }

    try {
      const hasResults = meetups.length > 0;
      const meetupTitles = meetups.slice(0, 10).map(m => m.title).join('\n- ');
      
      const prompt = hasResults 
        ? `
사용자 검색어: "${query}"
현재 모집중인 모임들:
- ${meetupTitles}

위 정보를 바탕으로 사용자에게 도움이 될 3개의 구체적인 검색 제안을 만들어주세요.
각 제안은 실제 검색 가능한 형태로 만들어주세요.

예시 형식:
- "강남 고기집 모임"
- "이번 주말 파티룸"  
- "2만원대 이탈리안"
`
        : `
사용자가 "${query}"를 검색했지만 결과가 없습니다.

이 검색어와 관련된 3개의 대안 검색어를 제안해주세요.
사용자의 검색 의도를 파악해서 비슷하거나 관련된 검색어를 만들어주세요.

예시 형식:
- "강남 모임"
- "여성 친화적 모임"  
- "소규모 모임"
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
   * 검색어를 확장하여 동의어도 포함
   */
  expandSearchQuery(query: string): string {
    let expandedQuery = query;
    
    // 동의어 매핑 - 더 유연한 패턴 사용
    const synonyms: { [key: string]: string[] } = {
      '여자': ['여자', '여성'],
      '남자': ['남자', '남성'],
      '고기': ['고기', '구이', '바베큐', 'BBQ'],
      '술': ['술', '알코올', '맥주', '소주'],
      '친구': ['친구', '동료', '지인']
    };
    
    // 검색어에 동의어 추가 - 단어별로 처리
    for (const [word, alternatives] of Object.entries(synonyms)) {
      if (query.includes(word)) {
        // 단어 단위로 매칭하되, 더 유연하게
        const orConditions = alternatives.join('|');
        expandedQuery = expandedQuery.replace(word, `(${orConditions})`);
      }
    }
    
    // 특별한 경우: "여자만 모임" 같은 특정 구문 처리
    if (query.includes('여자만') || query.includes('여성만')) {
      // "여자만" 또는 "여성만" 뿐만 아니라 "여자", "여성" 포함 모든 것 검색
      expandedQuery = '(여자|여성)';
    } else if (query.includes('남자만') || query.includes('남성만')) {
      expandedQuery = '(남자|남성)';
    }
    
    return expandedQuery;
  }

  /**
   * AI 검색 통합 함수 - 분석과 검색을 함께 수행
   */
  async searchWithAI(query: string, searchFunction: (params: any) => Promise<void>): Promise<SearchResult> {
    try {
      console.log('🤖 AI 통합 검색 시작:', query);
      
      // AI 의도 분석
      const analysis = await this.analyzeSearchIntent(query);
      console.log('🤖 AI 분석 결과:', analysis);
      
      // 검색어 확장 (동의어 포함)
      const expandedQuery = this.expandSearchQuery(query);
      console.log('🤖 확장된 검색어:', expandedQuery);
      
      // 검색 파라미터 구성 (AI 분석 결과 적용)
      const searchParams: any = { search: expandedQuery };
      
      // AI가 추출한 카테고리 적용 (데이터베이스 enum으로 매핑)
      if (analysis?.intent?.category) {
        const dbCategory = this.mapCategoryToDbEnum(analysis.intent.category);
        if (dbCategory) {
          searchParams.category = dbCategory;
          console.log('🤖 AI 카테고리 필터 적용:', analysis.intent.category, '→', dbCategory);
        } else {
          console.log('🤖 AI 카테고리 매핑 실패:', analysis.intent.category);
        }
      }
      
      // AI가 추출한 지역 적용
      if (analysis?.intent?.location) {
        searchParams.location = analysis.intent.location;
        console.log('🤖 AI 지역 필터 적용:', analysis.intent.location);
      }
      
      // AI가 추출한 가격대 적용
      if (analysis?.intent?.priceRange) {
        searchParams.priceRange = analysis.intent.priceRange;
        console.log('🤖 AI 가격대 필터 적용:', analysis.intent.priceRange);
      }
      
      console.log('🤖 최종 검색 파라미터:', searchParams);
      
      // 실제 검색 수행 (AI 필터링 적용된 파라미터로)
      await searchFunction(searchParams);
      
      // 추천 키워드 생성 (검색 완료 후)
      const suggestions = await this.generateRecommendations(query, []);
      
      return {
        meetups: [], // 실제 검색 결과는 searchFunction에서 처리
        suggestions: suggestions,
        intent: {
          type: 'search',
          category: analysis?.intent?.category,
          location: analysis?.intent?.location,
          priceRange: analysis?.intent?.priceRange
        }
      };
      
    } catch (error) {
      console.error('🤖 AI 검색 오류:', error);
      
      // AI 실패 시 일반 검색으로 폴백
      await searchFunction({ search: query });
      
      return {
        meetups: [],
        suggestions: this.fallbackRecommendations(query, []),
        intent: {
          type: 'search'
        }
      };
    }
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