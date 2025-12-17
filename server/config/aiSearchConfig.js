/**
 * AI 검색 시스템 설정
 * 모임 추천 엔진을 위한 프롬프트와 카테고리 분류 체계
 */

// 시스템 프롬프트 v11 - 추천 이유 포함
const SYSTEM_PROMPT = `
스마트 모임 추천 엔진: 사용자 검색어와 모임 리스트를 매칭하여 최적 추천

카테고리:
한식(김치찌개,갈비), 중식(짜장면,마라탕), 일식(라멘,초밥), 양식(파스타,피자), 카페(커피), 술집(맥주)

기분매칭:
우울→카페/조용한분위기, 스트레스→술집/활기찬곳, 외로움→사교모임

반드시 다음 JSON 형식으로 응답:
{
  "isSearchable": true,
  "hasMatch": true/false,
  "모임": [
    {
      "id": "모임ID",
      "title": "모임제목", 
      "category": "카테고리",
      "location": "위치",
      "date": "날짜",
      "time": "시간",
      "why": ["추천이유1", "추천이유2"],
      "score": 0.9
    }
  ]
}

추천이유 예시:
- "우울한 기분에 카페의 따뜻한 분위기가 도움될 거예요"
- "혼자 와도 부담없는 선택적 소통 가능"
- "달콤한 디저트로 기분전환 효과"
`;

// 검색 사전 (최소화)
const TAXONOMY = {
  "axes": {
    "cuisine": [
      { "name": "한식", "syn": ["한식", "김치찌개", "갈비"] },
      { "name": "중식", "syn": ["중식", "짜장면", "마라탕"] },
      { "name": "일식", "syn": ["일식", "라멘", "초밥"] },
      { "name": "양식", "syn": ["양식", "파스타", "피자"] },
      { "name": "카페", "syn": ["카페", "커피"] },
      { "name": "술집", "syn": ["술집", "맥주"] }
    ],
    "mood": [
      { "syn": ["우울", "조용"] },
      { "syn": ["스트레스", "활기"] },
      { "syn": ["외로움", "사교"] }
    ]
  }
};

// 매칭 키워드
const SMART_MATCHING_POLICY = {
  "patterns": {
    "immediate": ["지금", "당장", "바로"],
    "budget": ["저렴", "싸게", "가성비"],
    "location": ["근처", "가까운", "주변"],
    "social": ["친해지고", "새로운사람", "친목"],
    "quiet": ["조용히", "차분하게", "혼자"],
    "lively": ["시끌벅적", "재밌게", "활발하게"]
  }
};

// 모듈 내보내기
module.exports = {
  SYSTEM_PROMPT,
  TAXONOMY,
  SMART_MATCHING_POLICY,

  // 유틸리티 함수들
  /**
   * meetup 데이터를 AI 입력 형식으로 변환
   */
  formatMeetupForAI(meetup) {
    // 최소 정보만 전송
    const description = meetup.description || '';
    const shortDesc = description.length > 30 ? description.substring(0, 30) + '...' : description;
    
    return {
      id: meetup.id,
      title: meetup.title,
      desc: shortDesc,
      category: meetup.category,
      location: meetup.location,
      date: meetup.date,
      time: meetup.time
    };
  },

  /**
   * 제목과 설명에서 다차원 키워드 추출
   */
  extractMenuKeywords(meetup) {
    const text = `${meetup.title} ${meetup.description || ''}`.toLowerCase();
    const extractedKeywords = {
      intent: [],
      timeframe: [],
      cuisine: [],
      venue: [],
      dish: [],
      dietary: [],
      mood: []
    };

    // 키워드 추출 (간소화)
    for (const [intentType, keywords] of Object.entries(SMART_MATCHING_POLICY.patterns)) {
      for (const keyword of keywords) {
        if (text.includes(keyword.toLowerCase())) {
          extractedKeywords.intent.push(keyword);
        }
      }
    }

    // taxonomy 축별로 동의어 체크
    for (const [axisName, categories] of Object.entries(TAXONOMY.axes)) {
      for (const category of categories) {
        for (const synonym of category.syn) {
          if (text.includes(synonym.toLowerCase())) {
            extractedKeywords[axisName].push(synonym);
          }
        }
      }
    }

    // 중복 제거
    for (const key in extractedKeywords) {
      extractedKeywords[key] = [...new Set(extractedKeywords[key])];
    }

    return extractedKeywords;
  },

  /**
   * 사용자 프롬프트 생성 (최소 토큰 버전)
   */
  createUserPrompt(query, meetups) {
    // 모임을 더 간결하게 포맷
    const simpleFormat = meetups.map(m => ({
      id: m.id,
      title: m.title,
      category: m.category,
      location: m.location,
      date: m.date,
      time: m.time
    }));

    return `검색: "${query}"
모임: ${JSON.stringify(simpleFormat)}`;
  },

  /**
   * AI 응답 파싱 및 검증
   */
  parseAIResponse(response) {
    try {
      // JSON 코드블록 제거
      let cleanJson = response.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      cleanJson = cleanJson.replace(/^\s*```[\s\S]*?```\s*$/g, '');
      cleanJson = cleanJson.trim();

      const parsed = JSON.parse(cleanJson);

      // 유연한 필드 매핑 - AI가 다른 형식으로 응답해도 처리
      let normalizedResponse = {
        isSearchable: true, // 기본값
        hasMatch: true,     // 기본값
        recommendedMeetups: []
      };

      // 다양한 필드명 처리
      if (parsed.모임) {
        normalizedResponse.recommendedMeetups = parsed.모임;
      } else if (parsed.추천모임) {
        normalizedResponse.recommendedMeetups = parsed.추천모임;
      } else if (parsed.meetups) {
        normalizedResponse.recommendedMeetups = parsed.meetups;
      } else if (parsed.recommendedMeetups) {
        normalizedResponse.recommendedMeetups = parsed.recommendedMeetups;
      }

      // 기존 필드들이 있으면 사용
      if (typeof parsed.isSearchable === 'boolean') {
        normalizedResponse.isSearchable = parsed.isSearchable;
      }
      if (typeof parsed.hasMatch === 'boolean') {
        normalizedResponse.hasMatch = parsed.hasMatch;
      }

      // 매칭된 모임이 없으면 hasMatch를 false로 설정
      if (!normalizedResponse.recommendedMeetups || normalizedResponse.recommendedMeetups.length === 0) {
        normalizedResponse.hasMatch = false;
      }

      return normalizedResponse;
    } catch (error) {
      console.error('AI 응답 파싱 오류:', error);
      throw error;
    }
  }
};