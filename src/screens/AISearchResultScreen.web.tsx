import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { COLORS } from '../styles/colors';
import MeetupCard from '../components/MeetupCard';
import { useMeetupStore } from '../store/meetupStore';
import { Icon } from '../components/Icon';
import aiSearchService from '../services/aiSearchService';

const AISearchResultScreen: React.FC<{ user: any; navigation: any }> = ({ user, navigation }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const initialQuery = queryParams.get('q') || '';
  
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [aiResponse, setAiResponse] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [displayedResponse, setDisplayedResponse] = useState('');
  
  const { fetchMeetups, meetups } = useMeetupStore();

  useEffect(() => {
    // 초기 쿼리가 있어도 자동 검색하지 않음
    // 사용자가 검색 버튼을 눌러야만 검색 실행
    if (initialQuery) {
      setSearchQuery(initialQuery);
    }
  }, [initialQuery]);

  // 타이핑 효과
  useEffect(() => {
    if (aiResponse && !isAnalyzing) {
      setIsTyping(true);
      setDisplayedResponse('');
      let index = 0;
      const interval = setInterval(() => {
        if (index < aiResponse.length) {
          setDisplayedResponse(aiResponse.substring(0, index + 1));
          index++;
        } else {
          setIsTyping(false);
          clearInterval(interval);
        }
      }, 15); // 타이핑 속도
      return () => clearInterval(interval);
    }
  }, [aiResponse, isAnalyzing]);

  // 스마트 필터링 함수 - 정확한 매칭만 허용
  const smartFilterMeetups = (meetups: any[], query: string, analysis: any) => {
    const queryLower = query.toLowerCase();
    
    // 가격 관련 검색 특별 처리
    const pricePatterns = {
      '무료': { min: 0, max: 0 },
      '1만원이하': { min: 0, max: 10000 },
      '1만원미만': { min: 0, max: 9999 },
      '1만원이상': { min: 10000, max: 999999 },
      '2만원이하': { min: 0, max: 20000 },
      '2만원이상': { min: 20000, max: 999999 },
      '3만원이하': { min: 0, max: 30000 },
      '3만원이상': { min: 30000, max: 999999 },
      '5만원이하': { min: 0, max: 50000 },
      '5만원이상': { min: 50000, max: 999999 },
    };
    
    // 가격 필터 확인
    let priceFilter = null;
    for (const [pattern, range] of Object.entries(pricePatterns)) {
      if (queryLower.replace(/\s+/g, '').includes(pattern)) {
        priceFilter = range;
        console.log('💰 가격 필터 감지:', pattern, range);
        break;
      }
    }
    
    // 키워드 추출 (가격 관련 단어 제외)
    const excludeWords = ['모임', '찾기', '검색', '이상', '이하', '미만', '만원', '원'];
    let queryWords = queryLower.split(' ').filter(w => {
      if (w.length <= 1) return false;
      if (excludeWords.some(ex => w.includes(ex))) return false;
      return true;
    });
    
    // 가격 검색인 경우 키워드 요구사항 완화
    if (priceFilter && queryWords.length === 0) {
      queryWords = []; // 가격만으로 검색 허용
    }
    
    console.log('🔍 필터링 시작:', {
      query: queryLower,
      keywords: queryWords,
      totalMeetups: meetups.length
    });

    // 각 모임에 대해 관련성 점수 계산
    const scoredMeetups = meetups.map(meetup => {
      let score = 0;
      let matchReasons: string[] = [];
      let debugInfo: any = {
        title: meetup.title,
        category: meetup.category
      };
      
      // 모든 텍스트 필드 결합
      const title = (meetup.title || '').toLowerCase();
      const description = (meetup.description || '').toLowerCase();
      const requirements = (meetup.requirements || '').toLowerCase();
      const category = (meetup.category || '').toLowerCase();
      const location = (meetup.location || '').toLowerCase();
      
      // 핵심 키워드가 하나도 매칭되지 않으면 즉시 0점 처리
      let hasKeywordMatch = false;
      
      // 음식 관련 검색 처리 - 축약어와 유사어 추가
      const foodSearchMap: {[key: string]: string[]} = {
        '라멘': ['라멘', '라면', '일본', '일식', 'ramen', '돈코츠', '미소', '쇼유'],
        '고기': ['고기', '삼겹살', '갈비', '스테이크', 'BBQ', '바베큐', '구이', '육류', '소고기', '돼지고기', '양고기', '곱창', '막창', '대창', '한우', '육회'],
        '피자': ['피자', 'pizza', '이탈리안', '양식', '도우'],
        '치킨': ['치킨', '닭', '프라이드', '양념', '후라이드', 'chicken', '초치', '초치모임', '치맥'],
        '회': ['회', '초밥', '스시', '사시미', '참치', '연어', '광어', '일식', '오마카세', 'sushi'],
        '파스타': ['파스타', '스파게티', '이탈리안', '양식', 'pasta'],
        '햄버거': ['햄버거', '버거', '수제버거', 'burger', '패티'],
        '중식': ['중식', '중국', '짜장', '짬뽕', '탕수육', '마라', '양꼬치'],
        '한식': ['한식', '김치', '찌개', '국밥', '비빔밥', '불고기', '된장', '전골'],
        '술': ['술', '주점', '호프', '이자카야', '포차', '막걸리', '소주', '맥주', '와인', '칵테일', '바'],
        '카페': ['카페', '커피', '디저트', '브런치', '베이커리', '케이크', 'cafe', 'coffee'],
        '뷔페': ['뷔페', '부페', '무한리필', '샐러드바', '올유캔잇', '꽁꽁할때', '갈만한'],
        '저녁': ['저녁', '디너', '저녁모임', '저녁식사', '퇴근후', '야식'],
        '점심': ['점심', '런치', '점심모임', '점심식사', '점심시간'],
        '브런치': ['브런치', '아침', '아점', '브런치모임']
      };
      
      // 음식 검색어 확인
      let foodCategory = '';
      let foodKeywords: string[] = [];
      
      for (const [food, keywords] of Object.entries(foodSearchMap)) {
        if (queryWords.some(word => keywords.some(k => k.includes(word) || word.includes(k)))) {
          foodCategory = food;
          foodKeywords = keywords;
          break;
        }
      }
      
      // 음식 관련 검색인 경우
      if (foodCategory) {
        debugInfo.foodCategory = foodCategory;
        debugInfo.foodKeywords = foodKeywords;
        
        // 제목, 설명, 카테고리 중 하나라도 키워드 포함하면 점수 부여
        for (const keyword of foodKeywords) {
          if (title.includes(keyword)) {
            score += 100;
            hasKeywordMatch = true;
            matchReasons.push(`title_${keyword}`);
            break;
          }
          if (description.includes(keyword)) {
            score += 50;
            hasKeywordMatch = true;
            matchReasons.push(`desc_${keyword}`);
            break;
          }
          if (category.includes(keyword)) {
            score += 30;
            hasKeywordMatch = true;
            matchReasons.push(`cat_${keyword}`);
            break;
          }
        }
        
        // 음식 검색인데 키워드가 하나도 없으면 제외
        if (!hasKeywordMatch) {
          score = -1000;
          debugInfo.excluded = true;
        }
      } else {
        // 일반 키워드 검색
        for (const word of queryWords) {
          if (title.includes(word)) {
            score += 100;
            hasKeywordMatch = true;
            matchReasons.push(`title_${word}`);
          }
          if (description.includes(word)) {
            score += 30;
            hasKeywordMatch = true;
            matchReasons.push(`desc_${word}`);
          }
          if (requirements.includes(word)) {
            score += 20;
            hasKeywordMatch = true;
            matchReasons.push(`req_${word}`);
          }
          if (location.includes(word)) {
            score += 40;
            hasKeywordMatch = true;
            matchReasons.push(`loc_${word}`);
          }
        }
        
        // 키워드가 하나도 매칭되지 않으면 제외 (가격 필터가 없는 경우에만)
        if (!hasKeywordMatch && queryWords.length > 0 && !priceFilter) {
          score = -1000;
          debugInfo.excluded = true;
        }
      }
      
      // 성별 필터링
      if (query.includes('여자') || query.includes('여성')) {
        if (meetup.gender_preference === '여성만' || title.includes('여자') || title.includes('여성')) {
          score += 50;
          matchReasons.push('gender_female');
        } else if (meetup.gender_preference === '남성만') {
          score = -1000; // 완전 제외
          debugInfo.excluded = true;
        }
      }
      
      if (query.includes('남자') || query.includes('남성')) {
        if (meetup.gender_preference === '남성만' || title.includes('남자') || title.includes('남성')) {
          score += 50;
          matchReasons.push('gender_male');
        } else if (meetup.gender_preference === '여성만') {
          score = -1000; // 완전 제외
          debugInfo.excluded = true;
        }
      }
      
      // 시간 필터링
      if (query.includes('오늘')) {
        const today = new Date().toDateString();
        const meetupDate = new Date(meetup.date).toDateString();
        if (today === meetupDate) {
          score += 50;
          matchReasons.push('date_today');
        } else {
          score -= 200; // 오늘이 아니면 감점
        }
      }
      
      if (query.includes('내일')) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const meetupDate = new Date(meetup.date).toDateString();
        if (tomorrow.toDateString() === meetupDate) {
          score += 50;
          matchReasons.push('date_tomorrow');
        } else {
          score -= 200; // 내일이 아니면 감점
        }
      }
      
      // 가격 필터링 - priceFilter 우선 적용
      if (priceFilter) {
        const price = meetup.price_per_person || 0;
        if (price >= priceFilter.min && price <= priceFilter.max) {
          score += 100;  // 가격 조건 만족하면 높은 점수
          hasKeywordMatch = true; // 가격 필터만으로도 매칭 인정
          matchReasons.push(`price_${priceFilter.min}_${priceFilter.max}`);
          debugInfo.priceMatch = true;
        } else {
          score = -1000; // 가격 조건 불만족시 제외
          debugInfo.excluded = true;
          debugInfo.priceExcluded = true;
        }
      } else if (query.includes('저렴') || query.includes('싸')) {
        if (meetup.price_per_person && meetup.price_per_person <= 20000) {
          score += 30;
          matchReasons.push('price_cheap');
        } else if (meetup.price_per_person > 30000) {
          score -= 50; // 비싸면 감점
        }
      } else if (query.includes('비싸') || query.includes('고급')) {
        if (meetup.price_per_person && meetup.price_per_person >= 30000) {
          score += 30;
          matchReasons.push('price_expensive');
        } else if (meetup.price_per_person < 20000) {
          score -= 50; // 저렴하면 감점
        }
      }
      
      debugInfo.score = score;
      debugInfo.matchReasons = matchReasons;
      debugInfo.hasKeywordMatch = hasKeywordMatch;
      
      return {
        ...meetup,
        relevanceScore: score,
        matchReasons,
        debugInfo
      };
    });
    
    // 점수가 0보다 큰 모임만 필터링하고 정렬
    const filtered = scoredMeetups
      .filter(m => m.relevanceScore > 0)
      .sort((a, b) => b.relevanceScore - a.relevanceScore);
    
    console.log('🎯 필터링 결과:', {
      total: meetups.length,
      filtered: filtered.length,
      excluded: scoredMeetups.filter(m => m.relevanceScore <= 0).length,
      topResults: filtered.slice(0, 3).map(m => ({
        title: m.title,
        score: m.relevanceScore,
        reasons: m.matchReasons,
        debug: m.debugInfo
      }))
    });
    
    return filtered;
  };

  // AI 답변 생성 - 더 자연스럽고 개인화된 응답
  const generateNaturalResponse = (query: string, filteredResults: any[], priceFilter: any) => {
    const topMeetups = filteredResults.slice(0, 5);
    let response = '';
    
    // 사용자 의도 파악 - 더 정교한 분석
    const userIntent = {
      wantsFood: false,
      wantsPrice: false,
      wantsGender: false,
      wantsDate: false,
      wantsLocation: false,
      wantsActivity: false,
      wantsMood: false,
      foodType: '',
      priceRange: '',
      gender: '',
      date: '',
      location: '',
      activity: '',
      mood: '',
      userPersonality: '',
      searchContext: ''
    };
    
    // 음식 카테고리 정교화
    const foodCategories = {
      '라멘': ['라멘', '라면'],
      '고기': ['고기', '삼겹살', '갈비', '스테이크', '바베큐', 'BBQ', '육류'],
      '피자': ['피자'],
      '치킨': ['치킨', '닭'],
      '회': ['회', '초밥', '스시', '사시미'],
      '파스타': ['파스타', '스파게티'],
      '햄버거': ['햄버거', '버거'],
      '중식': ['중식', '중국', '짜장', '짬뽕', '탕수육', '마라'],
      '한식': ['한식', '김치찌개', '된장찌개', '국밥', '비빔밥'],
      '술': ['술', '주점', '호프', '이자카야', '포차', '맥주', '소주', '와인'],
      '카페': ['카페', '커피', '디저트', '브런치'],
      '뷔페': ['뷔페', '부페', '무한리필']
    };
    
    // 활동 카테고리
    const activityCategories = {
      '운동': ['운동', '헬스', '요가', '필라테스', '러닝', '축구', '농구', '배드민턴'],
      '문화': ['영화', '전시회', '공연', '뮤지컬', '연극', '미술관', '박물관'],
      '여행': ['여행', '나들이', '드라이브', '캠핑', '등산', '트레킹'],
      '공부': ['공부', '스터디', '독서', '토론', '강의', '세미나'],
      '게임': ['게임', '보드게임', '방탈출', 'PC방', '오락실'],
      '취미': ['취미', '사진', '그림', '음악', '악기', '노래', '댄스']
    };
    
    // 분위기/무드 카테고리
    const moodCategories = {
      '편한': ['편한', '편하게', '부담없이', '가볍게', '캐주얼'],
      '진지한': ['진지한', '진지하게', '심도있는', '깊은'],
      '재미있는': ['재미있는', '즐거운', '신나는', '흥미로운'],
      '조용한': ['조용한', '조용히', '차분한', '고요한'],
      '활발한': ['활발한', '활발하게', '에너지넘치는', '다이나믹']
    };
    
    // 음식 의도 분석
    for (const [category, keywords] of Object.entries(foodCategories)) {
      if (keywords.some(keyword => query.includes(keyword))) {
        userIntent.wantsFood = true;
        userIntent.foodType = category;
        break;
      }
    }
    
    // 활동 의도 분석
    for (const [category, keywords] of Object.entries(activityCategories)) {
      if (keywords.some(keyword => query.includes(keyword))) {
        userIntent.wantsActivity = true;
        userIntent.activity = category;
        break;
      }
    }
    
    // 분위기 의도 분석
    for (const [mood, keywords] of Object.entries(moodCategories)) {
      if (keywords.some(keyword => query.includes(keyword))) {
        userIntent.wantsMood = true;
        userIntent.mood = mood;
        break;
      }
    }
    
    // 사용자 성향 분석
    if (query.includes('혼자') || query.includes('혼밥')) {
      userIntent.userPersonality = 'solo';
    } else if (query.includes('같이') || query.includes('함께')) {
      userIntent.userPersonality = 'social';
    } else if (query.includes('처음') || query.includes('초보')) {
      userIntent.userPersonality = 'beginner';
    } else if (query.includes('자주') || query.includes('매일')) {
      userIntent.userPersonality = 'regular';
    }
    
    // 검색 맥락 파악
    const timeOfDay = new Date().getHours();
    if (timeOfDay >= 11 && timeOfDay < 14) {
      userIntent.searchContext = 'lunch';
    } else if (timeOfDay >= 17 && timeOfDay < 21) {
      userIntent.searchContext = 'dinner';
    } else if (timeOfDay >= 21) {
      userIntent.searchContext = 'late-night';
    }
    
    if (priceFilter) {
      userIntent.wantsPrice = true;
      userIntent.priceRange = priceFilter.min === 0 && priceFilter.max === 0 ? '무료' :
                             priceFilter.min > 0 ? `${(priceFilter.min/10000).toFixed(0)}만원 이상` :
                             `${(priceFilter.max/10000).toFixed(0)}만원 이하`;
    }
    
    if (query.includes('여자') || query.includes('여성')) {
      userIntent.wantsGender = true;
      userIntent.gender = '여성';
    } else if (query.includes('남자') || query.includes('남성')) {
      userIntent.wantsGender = true;
      userIntent.gender = '남성';
    }
    
    if (query.includes('오늘')) {
      userIntent.wantsDate = true;
      userIntent.date = '오늘';
    } else if (query.includes('내일')) {
      userIntent.wantsDate = true;
      userIntent.date = '내일';
    } else if (query.includes('주말')) {
      userIntent.wantsDate = true;
      userIntent.date = '주말';
    }
    
    // 자연스러운 응답 생성
    if (filteredResults.length > 0) {
      // 시간대에 따른 개인화된 인사말
      let greeting = '';
      if (userIntent.searchContext === 'lunch') {
        greeting = `🍽️ 점심시간이네요! "${query}" 검색 결과를 분석했어요.`;
      } else if (userIntent.searchContext === 'dinner') {
        greeting = `🌆 저녁 모임을 찾고 계신가요? "${query}" 검색 결과입니다.`;
      } else if (userIntent.searchContext === 'late-night') {
        greeting = `🌙 늦은 시간이지만 "${query}" 모임을 찾아봤어요.`;
      } else {
        greeting = `🔍 "${query}" 검색을 AI가 분석했어요!`;
      }
      response = greeting + '\n\n';
      
      // 사용자 프로필 분석
      response += `👤 사용자님 분석:\n`;
      
      const profileAnalysis = [];
      
      // 성향 기반 분석
      if (userIntent.userPersonality === 'solo') {
        profileAnalysis.push(`• 혼자서도 편하게 즐기실 수 있는 분이시네요`);
      } else if (userIntent.userPersonality === 'social') {
        profileAnalysis.push(`• 사람들과 함께 시간을 보내는 것을 좋아하시는군요`);
      } else if (userIntent.userPersonality === 'beginner') {
        profileAnalysis.push(`• 새로운 시도를 하시는 용기있는 분이시네요`);
      } else if (userIntent.userPersonality === 'regular') {
        profileAnalysis.push(`• 꾸준한 모임 활동을 원하시는군요`);
      }
      
      // 상세 의도 분석
      if (userIntent.wantsFood) {
        profileAnalysis.push(`• ${userIntent.foodType}을(를) 좋아하는 미식가`);
        if (userIntent.searchContext === 'dinner') {
          profileAnalysis.push(`• 저녁에 맛있는 ${userIntent.foodType} 한 끼를 원하시는 분`);
        }
      }
      
      if (userIntent.wantsActivity) {
        profileAnalysis.push(`• ${userIntent.activity} 활동을 즐기시는 활동적인 분`);
      }
      
      if (userIntent.wantsMood) {
        profileAnalysis.push(`• ${userIntent.mood} 분위기를 선호하시는 분`);
      }
      
      if (userIntent.wantsPrice) {
        if (priceFilter && priceFilter.min === 0 && priceFilter.max === 0) {
          profileAnalysis.push(`• 경제적인 무료 모임을 선호하시는 실속파`);
        } else if (priceFilter && priceFilter.min >= 30000) {
          profileAnalysis.push(`• 퀄리티 있는 프리미엄 모임을 원하시는 분`);
        } else {
          profileAnalysis.push(`• 예산 ${userIntent.priceRange}을 고려하시는 계획적인 분`);
        }
      }
      
      if (userIntent.wantsGender) {
        profileAnalysis.push(`• ${userIntent.gender} 모임에서 편안함을 느끼시는 분`);
      }
      
      if (userIntent.wantsDate) {
        if (userIntent.date === '오늘') {
          profileAnalysis.push(`• 즉흥적이고 활발한 성격의 소유자`);
        } else if (userIntent.date === '내일') {
          profileAnalysis.push(`• 가까운 미래를 계획하는 준비된 분`);
        } else if (userIntent.date === '주말') {
          profileAnalysis.push(`• 주말을 알차게 보내고 싶으신 분`);
        }
      }
      
      if (profileAnalysis.length > 0) {
        response += profileAnalysis.join('\n') + '\n\n';
      } else {
        response += `• 다양한 모임에 관심이 있으신 열린 마음의 소유자\n\n`;
      }
      
      // 검색 결과 요약
      response += `✨ 총 ${filteredResults.length}개의 완벽한 매칭을 찾았어요!\n\n`;
      response += `📌 특별히 추천드리는 TOP ${Math.min(5, topMeetups.length)} 모임:\n\n`;
      
      // 각 모임 상세 설명
      topMeetups.forEach((meetup, index) => {
        response += `${index + 1}. ${meetup.title}\n`;
        response += `━━━━━━━━━━━━━━━━━━━━\n`;
        
        // 위치와 카테고리
        response += `📍 ${meetup.location} | ${meetup.category}\n`;
        
        // 가격과 참가 현황
        const priceText = meetup.price_per_person === 0 ? '무료' : 
                         meetup.price_per_person ? `${(meetup.price_per_person/10000).toFixed(1)}만원` : '가격 미정';
        const participantText = meetup.max_participants ? 
                               `${meetup.current_participants || 0}/${meetup.max_participants}명` : '인원 미정';
        response += `💰 ${priceText} | 👥 ${participantText}\n`;
        
        // AI의 추천 이유 - 더 지능적이고 개인화된 분석
        response += `\n🤖 AI 분석:\n`;
        
        const reasons = [];
        const insights = [];
        
        // 키워드 매칭 이유를 더 자연스럽게
        if (meetup.matchReasons) {
          meetup.matchReasons.forEach((reason: string) => {
            if (reason.includes('title_')) {
              const keyword = reason.replace('title_', '');
              if (userIntent.wantsFood && keyword === userIntent.foodType) {
                insights.push(`정확히 원하시던 ${keyword} 모임이에요!`);
              } else {
                insights.push(`"${keyword}" 키워드가 제목에 있어 관련성이 높아요`);
              }
            } else if (reason.includes('desc_')) {
              const keyword = reason.replace('desc_', '');
              insights.push(`모임 소개에서 "${keyword}"를 언급하고 있어요`);
            } else if (reason.includes('price_')) {
              if (priceFilter && priceFilter.min === 0 && priceFilter.max === 0) {
                insights.push(`무료 모임을 원하셨는데 딱 맞네요!`);
              } else if (priceFilter && priceFilter.min >= 10000) {
                insights.push(`${userIntent.priceRange} 예산 조건과 정확히 일치해요`);
              } else {
                insights.push(`가격대가 예산 범위 내에 있어요`);
              }
            } else if (reason === 'gender_female') {
              insights.push(`여성분들만의 편안한 모임이에요`);
            } else if (reason === 'gender_male') {
              insights.push(`남성분들만의 편안한 모임이에요`);
            } else if (reason === 'date_today') {
              insights.push(`오늘 당장 만날 수 있는 즉석 모임!`);
            } else if (reason === 'date_tomorrow') {
              insights.push(`내일 예정된 모임이라 준비할 시간이 있어요`);
            }
          });
        }
        
        // 사용자 성향과 연결된 추천 이유
        if (userIntent.userPersonality === 'solo' && meetup.max_participants <= 4) {
          reasons.push(`소규모 모임이라 부담없이 참여하실 수 있어요`);
        } else if (userIntent.userPersonality === 'social' && meetup.max_participants >= 6) {
          reasons.push(`많은 사람들과 교류할 수 있는 활발한 모임이에요`);
        }
        
        if (userIntent.userPersonality === 'beginner' && meetup.description && 
            (meetup.description.includes('처음') || meetup.description.includes('초보'))) {
          reasons.push(`초보자도 환영하는 모임이라 부담없어요`);
        }
        
        // 시간대 맥락 추천
        if (userIntent.searchContext === 'lunch' && meetup.time && 
            meetup.time.includes('12') || meetup.time.includes('13')) {
          reasons.push(`점심시간에 딱 맞는 시간대예요`);
        } else if (userIntent.searchContext === 'dinner' && meetup.time && 
                  (meetup.time.includes('18') || meetup.time.includes('19'))) {
          reasons.push(`저녁 시간대에 진행되는 모임이에요`);
        }
        
        // 인기도 분석
        if (meetup.current_participants > 0) {
          const fillRate = (meetup.current_participants / meetup.max_participants) * 100;
          if (fillRate >= 70) {
            reasons.push(`🔥 인기 모임! 벌써 ${Math.round(fillRate)}% 마감되었어요`);
          } else if (fillRate >= 50) {
            reasons.push(`참가자가 절반 이상 모였어요 (${meetup.current_participants}명)`);
          } else {
            reasons.push(`${meetup.current_participants}명이 먼저 신청했어요`);
          }
        }
        
        // 특별 포인트
        if (meetup.price_per_person === 0) {
          reasons.push(`💝 완전 무료! 부담없이 참여하세요`);
        }
        
        if (meetup.host && meetup.host.babAlScore >= 90) {
          reasons.push(`⭐ 신뢰도 높은 호스트 (밥알 점수 ${meetup.host.babAlScore}점)`);
        }
        
        // 모든 인사이트와 이유 출력
        const allReasons = [...insights, ...reasons];
        if (allReasons.length > 0) {
          allReasons.forEach(reason => {
            response += `   • ${reason}\n`;
          });
        } else {
          response += `   • 검색어와 관련성이 높은 모임이에요\n`;
        }
        
        // 참가 권유 메시지
        if (index === 0) {
          response += `\n   🎯 AI 추천: 가장 적합한 모임이에요! 놓치지 마세요.\n`;
        }
        
        response += '\n';
      });
      
      // 마무리 멘트
      response += `💬 관심 있는 모임을 클릭해서 자세히 알아보세요!\n`;
      response += `원하시는 모임이 없다면 직접 만들어보는 것도 좋은 방법이에요 😊`;
      
    } else {
      // 결과가 없을 때 더 도움이 되는 응답
      response = `🤔 "${query}" 검색 결과가 없네요...\n\n`;
      
      response += `📊 AI 분석 결과:\n`;
      
      // 검색 의도 분석
      if (userIntent.wantsFood) {
        response += `• ${userIntent.foodType} 관련 모임을 찾으셨군요\n`;
        response += `• 현재 활성화된 ${userIntent.foodType} 모임이 없어요\n\n`;
        
        response += `🎯 AI 제안:\n`;
        response += `1. 직접 "${userIntent.foodType} 맛집 탐방" 모임을 만들어보세요!\n`;
        response += `2. 비슷한 음식 카테고리로 검색해보세요:\n`;
        
        // 유사 음식 추천
        if (userIntent.foodType === '라멘') {
          response += `   • "일식 모임", "우동", "돈카츠"\n`;
        } else if (userIntent.foodType === '고기') {
          response += `   • "삼겹살", "BBQ", "스테이크"\n`;
        } else if (userIntent.foodType === '피자') {
          response += `   • "양식", "파스타", "이탈리안"\n`;
        }
        
      } else if (userIntent.wantsActivity) {
        response += `• ${userIntent.activity} 활동 모임을 찾으셨군요\n`;
        response += `• 아쉽게도 현재 매칭되는 모임이 없어요\n\n`;
        
        response += `🎯 AI 제안:\n`;
        response += `1. "${userIntent.activity}" 정기 모임을 직접 만들어보세요!\n`;
        response += `2. 관련 활동을 검색해보세요:\n`;
        
        // 유사 활동 추천
        if (userIntent.activity === '운동') {
          response += `   • "헬스", "러닝", "요가"\n`;
        } else if (userIntent.activity === '문화') {
          response += `   • "영화", "전시회", "공연"\n`;
        }
        
      } else if (userIntent.wantsPrice) {
        response += `• ${userIntent.priceRange} 예산 조건으로 검색하셨네요\n`;
        response += `• 해당 가격대의 모임이 현재 없어요\n\n`;
        
        response += `🎯 AI 제안:\n`;
        response += `1. 예산 범위를 조금 넓혀서 다시 검색해보세요\n`;
        response += `2. 원하는 가격대의 모임을 직접 만들어보세요\n`;
        
      } else {
        response += `• 특정 조건의 모임을 찾고 계신 것 같아요\n`;
        response += `• 아직 매칭되는 모임이 없네요\n\n`;
        
        response += `🎯 AI 제안:\n`;
        response += `1. 검색어를 조금 더 일반적으로 바꿔보세요\n`;
        response += `2. 원하는 모임을 직접 만들어 호스트가 되어보세요\n`;
      }
      
      // 시간대별 추천
      if (userIntent.searchContext === 'lunch') {
        response += `\n⏰ 점심시간 추천:\n`;
        response += `• "점심 같이", "런치 모임", "간단한 식사"\n`;
      } else if (userIntent.searchContext === 'dinner') {
        response += `\n⏰ 저녁시간 추천:\n`;
        response += `• "저녁 모임", "퇴근 후", "회식"\n`;
      } else if (userIntent.searchContext === 'late-night') {
        response += `\n⏰ 늦은 시간 추천:\n`;
        response += `• "야식", "심야 모임", "24시"\n`;
      }
      
      response += `\n💡 Tip: 혼밥시러는 사용자가 만드는 모임 플랫폼이에요.\n`;
      response += `원하는 모임이 없다면 직접 만들어서 호스트가 되어보세요! 🚀`;
    }
    
    return response;
  };

  // AI 통합 검색 - 진짜 AI 사용
  const handleAISearch = async (query: string) => {
    if (!query.trim()) return;

    setIsAnalyzing(true);
    setAiResponse('');
    setDisplayedResponse('');
    setAiAnalysis(null);
    setSearchResults([]);
    
    try {
      console.log('🤖 AI 검색 시작:', query);
      
      // 1. 먼저 모든 모임 데이터 가져오기
      const apiUrl = `${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/meetups`;
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      const allMeetups = data.meetups || [];
      console.log('📋 전체 모임 수:', allMeetups.length);
      
      // 2. AI에게 사용자 검색 의도 분석 요청
      const aiAnalysis = await aiSearchService.analyzeSearchIntent(query);
      console.log('🧠 AI 분석 결과:', aiAnalysis);
      setAiAnalysis(aiAnalysis);
      
      // 3. AI가 직접 모임을 분석하고 추천
      const aiRecommendations = await analyzeWithRealAI(query, allMeetups, aiAnalysis);
      console.log('🎯 AI 추천 결과:', aiRecommendations.length, '개');
      
      // isNoMatch 체크 - 결과가 없으면 빈 배열로 설정
      if (aiRecommendations.length > 0 && aiRecommendations[0].isNoMatch) {
        console.log('❌ 조건에 맞는 모임 없음 - 빈 결과 설정');
        setSearchResults([]);
        const noMatchResponse = generateAIResponse(query, aiRecommendations, aiAnalysis);
        setAiResponse(noMatchResponse);
      } else {
        // 정상적인 추천이 있을 때만 결과 설정
        setSearchResults(aiRecommendations);
        const naturalResponse = generateAIResponse(query, aiRecommendations, aiAnalysis);
        setAiResponse(naturalResponse);
      }
      
      // 추천 검색어 설정
      if (aiAnalysis?.suggestions) {
        setSuggestions(aiAnalysis.suggestions);
      }
      
    } catch (error) {
      console.error('AI 검색 오류:', error);
      // 폴백: 기존 키워드 기반 검색
      await fallbackSearch(query);
    } finally {
      setIsAnalyzing(false);
    }
  };
  
  // 진짜 AI가 모임을 분석하고 추천
  const analyzeWithRealAI = async (query: string, meetups: any[], aiAnalysis: any) => {
    try {
      // 음식 카테고리 매핑 테이블 - 더 엄격하고 상세한 분류
      const foodCategoryMap: {[key: string]: { keywords: string[], exclude: string[] }} = {
        '중식': { 
          keywords: ['짜장면', '짬뽕', '탕수육', '마라탕', '마라샹궈', '양꼬치', '훠궈', '중국', '중식', '사천', '북경', '마파두부', '깐풍기', '팔보채'],
          exclude: ['라멘', '우동', '소바', '초밥', '돈카츠', '타코', '피자', '파스타', '햄버거']
        },
        '한식': { 
          keywords: ['김치찌개', '된장찌개', '불고기', '삼겹살', '갈비', '비빔밥', '국밥', '전골', '한식', '한정식', '백반', '제육볶음', '김치', '한우'],
          exclude: ['중식', '일식', '양식', '멕시칸', '라멘', '타코', '피자', '파스타']
        },
        '일식': { 
          keywords: ['초밥', '스시', '라멘', '우동', '소바', '돈카츠', '가라아게', '일식', '일본', '사시미', '오마카세', '라면', '일본식'],
          exclude: ['중식', '한식', '양식', '멕시칸', '짜장면', '짬뽕', '타코', '피자']
        },
        '양식': { 
          keywords: ['파스타', '피자', '스테이크', '햄버거', '리조또', '샐러드', '양식', '이탈리안', '프렌치', '브런치', '와인'],
          exclude: ['중식', '한식', '일식', '멕시칸', '짜장면', '라멘', '타코']
        },
        '멕시칸': { 
          keywords: ['타코', '부리또', '나초', '퀘사디아', '멕시칸', '멕시코', '살사', '토르티야'],
          exclude: ['중식', '한식', '일식', '양식', '짜장면', '라멘', '피자', '파스타']
        },
      };

      // AI가 자유롭게 분석하도록 - 카테고리 하드코딩 제거
      const prompt = `
당신은 사용자의 검색 의도를 정확히 파악하고 가장 적합한 모임을 추천하는 AI입니다.

사용자 검색어: "${query}"

🔴 절대 규칙 (반드시 지켜야 함):
1. 음식 카테고리를 절대 혼동하지 마세요:
   - 중국/중식 → 짜장면, 짬뽕, 탕수육, 마라탕 등 (라멘❌, 초밥❌)
   - 일본/일식 → 라멘, 초밥, 우동 등 (짜장면❌, 파스타❌)
   - 한식 → 김치찌개, 불고기, 삼겹살 등
   
2. 사용자가 특정 음식을 원하면 그 음식만 추천:
   - "중국음식" 검색 → 중식 모임만 (라멘 절대 안됨!)
   - "일본음식" 검색 → 일식 모임만
   - "한식" 검색 → 한식 모임만

3. 감성/상황 검색일 때만 다양하게:
   - "비오는날" → 전, 국물요리, 막걸리 등 다양하게 OK
   - "스트레스" → 매운 음식, 술, 디저트 등 다양하게 OK

4. 일치하는 모임이 없으면:
   - hasMatch: false로 응답
   - 억지로 다른 카테고리 추천하지 말것!

모임 목록:
${meetups.slice(0, 30).map((m, i) => `
${i+1}. "${m.title}"
- 설명: ${m.description || '없음'}
- 카테고리: ${m.category}
- 위치: ${m.location}
- 가격: ${m.price_per_person || 0}원
- 날짜: ${m.date}
- 시간: ${m.time}
- 현재 참가자: ${m.current_participants || 0}/${m.max_participants || '?'}명
`).join('\n')}

위 모임들을 분석해주세요.
사용자가 원하는 조건에 맞는 모임이 있다면 추천하고, 없다면 정직하게 없다고 답하세요.

응답 형식:
{
  "userContext": "사용자의 검색 의도 분석",
  "hasMatch": true/false (맞는 모임이 있는지 여부),
  "noMatchReason": "맞는 모임이 없는 이유 (hasMatch가 false일 때만)",
  "recommendations": [
    {
      "index": 모임번호,
      "score": 관련성점수(0-100),
      "reasons": ["추천 이유1", "이유2"],
      "emotionalBenefit": "이 모임의 장점"
    }
  ]
}
`;

      // AI 서비스에 직접 요청
      const aiService = aiSearchService as any;
      if (aiService.openai) {
        const response = await aiService.openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content: `당신은 사용자가 원하는 음식 카테고리를 정확히 구분하는 모임 추천 AI입니다.

🔴 절대 규칙 (하나라도 위반하면 실패):

1. 음식 카테고리 구분:
   - 중국/중식: 짜장면, 짬뽕, 탕수육, 마라탕, 마라샹궈, 양꼬치, 훠궈
   - 일본/일식: 라멘, 우동, 소바, 초밥, 돈카츠, 가라아게
   - 한식: 김치찌개, 된장찌개, 불고기, 삼겹살, 갈비, 비빔밥
   
2. 카테고리 엄격 분리:
   - 중국음식 원함 → 라멘(일식) 추천 = ❌ 완전히 잘못됨!
   - 일본음식 원함 → 짜장면(중식) 추천 = ❌ 완전히 잘못됨!
   - 라멘은 절대로 중식이 아닙니다!

3. 검색어 분석:
   - "중국음식", "중식" → 중식 모임만
   - "일본음식", "일식" → 일식 모임만
   - "비오는날" 같은 상황 → 다양하게 OK

4. 없으면 없다고:
   - 중식 모임이 없으면 hasMatch: false
   - 절대 다른 카테고리로 대체하지 말것

반드시 JSON 형식으로 응답하세요.`
            },
            {
              role: "user",
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 1500
        });

        const result = response.choices[0]?.message?.content;
        if (result) {
          try {
            // JSON 코드 블록 제거 (```json ... ``` 형태 제거)
            let cleanJson = result;
            if (result.includes('```json')) {
              cleanJson = result.replace(/```json\n?/g, '').replace(/```\n?/g, '');
            } else if (result.includes('```')) {
              cleanJson = result.replace(/```\n?/g, '');
            }
            
            // JSON 파싱
            const parsed = JSON.parse(cleanJson.trim());
            
            console.log('🎯 AI 응답:', {
              hasMatch: parsed.hasMatch,
              recommendationsCount: parsed.recommendations?.length || 0,
              noMatchReason: parsed.noMatchReason
            });
            
            // hasMatch가 false면 추천을 무시하고 바로 "없음" 처리
            if (parsed.hasMatch === false) {
              console.log('❌ AI가 매칭 실패 응답 - 모든 추천 무시');
              return [{
                isNoMatch: true,
                userContext: parsed.userContext,
                noMatchReason: parsed.noMatchReason || '현재 조건에 맞는 모임이 없습니다',
                wantedCategory: wantedCategory
              }];
            }
            
            // AI 응답에서 추천 가져오기
            const recommendations = parsed.recommendations || [];
            console.log('🎯 AI 추천 결과:', {
              hasMatch: parsed.hasMatch,
              recommendationsCount: recommendations.length,
              noMatchReason: parsed.noMatchReason
            });
            
            // 추천이 없으면 바로 "없음" 처리
            if (recommendations.length === 0) {
              console.log('❌ 추천 결과가 비어있음');
              return [{
                isNoMatch: true,
                userContext: parsed.userContext,
                noMatchReason: '조건에 맞는 모임이 없습니다',
                wantedCategory: wantedCategory
              }];
            }
            
            // 추천된 모임들을 실제 데이터와 매핑
            let mappedRecommendations = recommendations
              .filter((rec: any) => rec.index > 0 && rec.index <= meetups.length)
              .map((rec: any) => {
                const meetup = meetups[rec.index - 1];
                if (!meetup) {
                  console.warn(`⚠️ 모임 인덱스 ${rec.index} 찾을 수 없음`);
                  return null;
                }
                return {
                  ...meetup,
                  relevanceScore: rec.score,
                  aiReasons: rec.reasons || [],
                  emotionalBenefit: rec.emotionalBenefit,
                  userContext: parsed.userContext
                };
              })
              .filter(Boolean) // null 제거
              .sort((a: any, b: any) => b.relevanceScore - a.relevanceScore);
            
            // 카테고리 검증 제거 - AI가 알아서 판단하도록
            console.log('🤖 AI의 자유로운 추천 허용');
            
            // AI가 추천한 개수대로 반환 (3-5개)
            const finalRecommendations = mappedRecommendations.slice(0, Math.min(5, mappedRecommendations.length));
            console.log('✅ 최종 추천 모임:', finalRecommendations.length, '개');
            return finalRecommendations;
          } catch (parseError) {
            console.error('AI 응답 파싱 오류:', parseError);
            console.error('원본 응답:', result);
            // 파싱 실패 시 기본 로직으로 폴백
          }
        }
      }
    } catch (error) {
      console.error('AI 분석 오류:', error);
    }
    
    // 폴백: 기존 필터링 로직 사용
    console.log('⚠️ AI 분석 실패, 폴백 로직 사용');
    const filtered = smartFilterMeetups(meetups, query, aiAnalysis);
    
    // 폴백에서도 카테고리 검증 적용
    if (wantedCategory && foodCategoryMap[wantedCategory]) {
      const categoryInfo = foodCategoryMap[wantedCategory];
      const validFiltered = filtered.filter((meetup: any) => {
        const title = (meetup.title || '').toLowerCase();
        const description = (meetup.description || '').toLowerCase();
        
        // 제외 키워드 체크
        const hasExcluded = categoryInfo.exclude.some(k => title.includes(k) || description.includes(k));
        if (hasExcluded) return false;
        
        // 포함 키워드 체크
        const hasIncluded = categoryInfo.keywords.some(k => title.includes(k) || description.includes(k));
        return hasIncluded;
      });
      
      if (validFiltered.length === 0) {
        return [{
          isNoMatch: true,
          noMatchReason: `현재 ${wantedCategory} 모임이 없습니다.`,
          wantedCategory: wantedCategory
        }];
      }
      
      return validFiltered.slice(0, 5);
    }
    
    return filtered.slice(0, 5);
  };
  
  // AI가 생성하는 자연스러운 응답
  const generateAIResponse = (query: string, recommendations: any[], aiAnalysis: any) => {
    let response = '';
    const queryLower = query.toLowerCase();
    
    // 사용자 감정/상황에 따른 맞춤 인사
    if (queryLower.includes('기분') && (queryLower.includes('안좋') || queryLower.includes('우울'))) {
      response = `😔 기분이 안 좋으시군요. AI가 기분 전환에 도움될 모임을 찾아봤어요.\n\n`;
    } else if (queryLower.includes('배고') || queryLower.includes('허기')) {
      response = `🍽️ 배가 고프시네요! 맛있는 음식 모임을 바로 추천해드릴게요.\n\n`;
    } else if (queryLower.includes('한식') || queryLower.includes('김치') || queryLower.includes('된장')) {
      response = `🍚 한식이 땡기시는군요! 구수한 한국 음식 모임을 찾아봤어요.\n\n`;
    } else if (queryLower.includes('중식') || queryLower.includes('짜장') || queryLower.includes('짬뽕')) {
      response = `🥟 중식이 드시고 싶으시군요! 중국 음식 모임을 추천해드릴게요.\n\n`;
    } else if (queryLower.includes('일식') || queryLower.includes('초밥') || queryLower.includes('라멘')) {
      response = `🍱 일식이 땡기시네요! 일본 음식 모임을 찾아봤어요.\n\n`;
    } else if (queryLower.includes('양식') || queryLower.includes('파스타') || queryLower.includes('피자')) {
      response = `🍝 양식이 드시고 싶으시군요! 서양 음식 모임을 추천해드릴게요.\n\n`;
    } else if (queryLower.includes('무한리필') || queryLower.includes('양 많')) {
      response = `🍖 푸짐하게 드시고 싶으시군요! 무한리필이나 양 많은 모임을 찾아봤어요.\n\n`;
    } else if (queryLower.includes('심심') || queryLower.includes('지루')) {
      response = `😊 심심하신가요? 재미있는 활동이 있는 모임을 찾아봤어요!\n\n`;
    } else if (queryLower.includes('스트레스')) {
      response = `😰 스트레스 받으셨군요. 힐링할 수 있는 모임을 추천해드릴게요.\n\n`;
    } else if (queryLower.includes('외로') || queryLower.includes('혼자')) {
      response = `🤗 혼자 계신가요? 따뜻한 사람들과 만날 수 있는 모임이 있어요.\n\n`;
    } else {
      response = `🤖 AI가 "${query}" 검색을 분석했습니다!\n\n`;
    }
    
    // 사용자 상태 분석 표시
    if (recommendations.length > 0 && recommendations[0].userContext) {
      response += `💭 AI 분석: ${recommendations[0].userContext}\n\n`;
    }
    
    // 조건에 맞는 모임이 없는 경우 처리
    if (recommendations.length > 0 && recommendations[0].isNoMatch) {
      response += `😅 아쉽게도 현재 조건에 맞는 모임이 없어요.\n\n`;
      
      if (recommendations[0].noMatchReason) {
        response += `📊 이유: ${recommendations[0].noMatchReason}\n\n`;
      }
      
      // 검색어에 따른 맞춤 제안
      const categoryName = recommendations[0].wantedCategory || '';
      if (categoryName === '중식' || queryLower.includes('중식') || queryLower.includes('중국')) {
        response += `💡 중식 모임이 없네요! 제안드려요:\n`;
        response += `• 직접 "중식 맛집 탐방" 모임을 만들어보세요!\n`;
        response += `• 짜장면, 짬뽕, 마라탕을 좋아하는 사람들이 모일 거예요\n`;
        response += `• 혹은 "맛집 모임"으로 더 넓게 검색해보세요`;
      } else if (categoryName === '한식' || queryLower.includes('한식')) {
        response += `💡 제안:\n`;
        response += `• 직접 "한식 모임"을 만들어보세요!\n`;
        response += `• 김치찌개, 된장찌개 등을 좋아하는 분들이 모일 거예요.\n`;
      } else {
        response += `💡 제안:\n`;
        response += `• 직접 원하는 모임을 만들어보세요!\n`;
        response += `• 다른 검색어를 시도해보세요.\n`;
        response += `• 조건을 조금 넓혀서 검색해보세요.`;
      }
      
      return response;
    }
    
    if (recommendations.length > 0 && !recommendations[0].isNoMatch) {
      response += `✨ 현재 상황에 딱 맞는 ${recommendations.length}개 모임을 추천해요:\n\n`;
      
      recommendations.forEach((meetup, index) => {
        const emoji = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'][index] || '▪️';
        response += `${emoji} ${meetup.title}\n`;
        response += `━━━━━━━━━━━━━━━━━━━━\n`;
        
        // 기본 정보
        response += `📍 ${meetup.location} | ${meetup.category}\n`;
        const priceText = meetup.price_per_person === 0 ? '무료' : 
                         meetup.price_per_person ? `${(meetup.price_per_person/10000).toFixed(1)}만원` : '가격 미정';
        response += `💰 ${priceText} | 👥 ${meetup.current_participants || 0}/${meetup.max_participants || '?'}명\n`;
        
        // 날짜와 시간
        if (meetup.date && meetup.time) {
          const date = new Date(meetup.date);
          const dateStr = `${date.getMonth()+1}/${date.getDate()}`;
          response += `📅 ${dateStr} ${meetup.time}\n`;
        }
        
        // 감정적 효과 (있다면)
        if (meetup.emotionalBenefit) {
          response += `\n💚 이 모임의 효과:\n`;
          response += `   ${meetup.emotionalBenefit}\n`;
        }
        
        // AI 추천 이유
        if (meetup.aiReasons && meetup.aiReasons.length > 0) {
          response += `\n🤖 추천 이유:\n`;
          meetup.aiReasons.forEach((reason: string) => {
            response += `   • ${reason}\n`;
          });
        }
        
        // 관련성 점수
        if (meetup.relevanceScore) {
          const stars = '⭐'.repeat(Math.min(5, Math.round(meetup.relevanceScore / 20)));
          response += `\n매칭도: ${stars} (${meetup.relevanceScore}%)\n`;
        }
        
        response += '\n';
      });
      
      // 상황별 마무리 멘트
      if (queryLower.includes('기분') && queryLower.includes('안좋')) {
        response += `💬 이런 모임들이 기분 전환에 도움이 될 거예요. 힘내세요! 💪`;
      } else if (queryLower.includes('배고')) {
        response += `🍴 빨리 맛있는 걸 먹으러 가세요! 배고플 때는 뭐든 맛있어요 😋`;
      } else if (queryLower.includes('심심')) {
        response += `🎉 재미있는 시간 보내세요! 새로운 경험이 기다리고 있어요.`;
      } else if (queryLower.includes('스트레스')) {
        response += `🌈 스트레스 날려버리고 힐링하세요! 잠시 쉬어가는 것도 중요해요.`;
      } else if (queryLower.includes('외로')) {
        response += `👥 좋은 사람들과 즐거운 시간 보내세요! 혼자가 아니에요.`;
      } else {
        response += `💡 관심 있는 모임을 클릭해서 자세히 알아보세요!`;
      }
    } else {
      // 결과가 없을 때
      response += `😅 "${query}"에 딱 맞는 모임을 찾지 못했어요.\n\n`;
      
      if (queryLower.includes('기분') && queryLower.includes('안좋')) {
        response += `💡 제안:\n`;
        response += `• "맛집 모임"이나 "운동 모임"을 검색해보세요\n`;
        response += `• 직접 "기분전환 모임"을 만들어보는 것도 좋아요\n`;
        response += `• 가까운 카페나 공원 산책도 도움이 될 거예요`;
      } else if (queryLower.includes('배고')) {
        response += `💡 제안:\n`;
        response += `• "오늘 저녁 모임"을 검색해보세요\n`;
        response += `• "고기 모임"이나 "뷔페 모임"도 찾아보세요\n`;
        response += `• 급하시면 근처 맛집을 바로 가는 것도 좋아요`;
      } else {
        response += `💡 다른 검색어를 시도해보세요:\n`;
        response += `• 구체적인 음식 종류 (예: "피자", "치킨")\n`;
        response += `• 활동 종류 (예: "운동", "영화")\n`;
        response += `• 지역명을 포함해서 검색해보세요`;
      }
    }
    
    return response;
  };
  
  // 폴백: OpenAI API가 없을 때 기존 로직 사용
  const fallbackSearch = async (query: string) => {
    const queryLower = query.toLowerCase();
    
    // 가격 필터 체크
    const pricePatterns = {
      '무료': { min: 0, max: 0 },
      '1만원이하': { min: 0, max: 10000 },
      '1만원미만': { min: 0, max: 9999 },
      '1만원이상': { min: 10000, max: 999999 },
      '2만원이하': { min: 0, max: 20000 },
      '2만원이상': { min: 20000, max: 999999 },
      '3만원이하': { min: 0, max: 30000 },
      '3만원이상': { min: 30000, max: 999999 },
      '5만원이하': { min: 0, max: 50000 },
      '5만원이상': { min: 50000, max: 999999 },
    };
    
    let priceFilter = null;
    for (const [pattern, range] of Object.entries(pricePatterns)) {
      if (queryLower.replace(/\s+/g, '').includes(pattern)) {
        priceFilter = range;
        break;
      }
    }

    try {
      // 모든 모임 가져오기
      const apiUrl = `${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/meetups`;
      const response = await fetch(apiUrl);
      const data = await response.json();
      const allMeetups = data.meetups || [];
      
      // 기존 필터링 로직 사용
      const filtered = smartFilterMeetups(allMeetups, query, { keywords: [query] });
      const naturalResponse = generateNaturalResponse(query, filtered, priceFilter);
      
      setAiResponse(naturalResponse);
      setSearchResults(filtered);
    } catch (error) {
      console.error('폴백 검색 오류:', error);
      setAiResponse('검색 중 오류가 발생했습니다.');
    }
    
    setIsAnalyzing(false);
  };

  // 추천 검색어 생성
  const generateSuggestions = (query: string, analysis: any): string[] => {
    const suggestions = [];
    
    if (query.includes('라멘') || query.includes('라면')) {
      suggestions.push('일식 모임', '돈코츠 라멘', '일본 음식 탐방');
    } else if (query.includes('고기')) {
      suggestions.push('삼겹살 모임', '갈비 모임', 'BBQ 파티');
    } else if (query.includes('피자')) {
      suggestions.push('피자 파티', '이탈리안 모임', '양식 맛집');
    } else if (query.includes('치킨')) {
      suggestions.push('치맥 모임', '프라이드 치킨', '양념치킨 파티');
    }
    
    if (query.includes('여자') || query.includes('여성')) {
      suggestions.push('여성 전용 카페', '여자들끼리 맛집', '여성 와인 모임');
    }
    
    if (analysis?.intent?.location) {
      suggestions.push(`${analysis.intent.location} 맛집`, `${analysis.intent.location} 술집`);
    }
    
    // 기본 추천
    if (suggestions.length === 0) {
      suggestions.push('오늘 저녁 모임', '주말 브런치', '강남 맛집 탐방');
    }
    
    return suggestions.slice(0, 5);
  };

  const handleNewSearch = () => {
    if (searchQuery.trim()) {
      navigate(`/ai-search?q=${encodeURIComponent(searchQuery)}`);
      handleAISearch(searchQuery);
    }
  };

  const handleKeyPress = (e: any) => {
    if (e.key === 'Enter') {
      handleNewSearch();
    }
  };

  return (
    <div style={{
      flex: 1,
      backgroundColor: '#f7f8fa',
      minHeight: '100vh'
    }}>
      {/* 상단 헤더 - 더 미니멀하게 */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        padding: '16px 20px',
        paddingTop: '52px',
        backgroundColor: COLORS.neutral.white,
        borderBottom: '1px solid #e5e5ea',
        gap: '12px'
      }}>
        <button 
          onClick={() => navigate('/home')}
          style={{
            padding: '8px',
            border: 'none',
            background: 'none',
            cursor: 'pointer'
          }}
        >
          <Icon name="arrow-left" size={20} color={COLORS.text.primary} />
        </button>
        
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          backgroundColor: '#f7f8fa',
          borderRadius: '24px',
          padding: '12px 16px',
          gap: '10px',
          boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.05)'
        }}>
          <Icon name="search" size={16} color={COLORS.text.secondary} />
          <input 
            style={{
              flex: 1,
              fontSize: '15px',
              border: 'none',
              background: 'transparent',
              color: COLORS.text.primary,
              outline: 'none'
            }}
            placeholder="무엇을 찾고 계신가요?"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={handleKeyPress}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{
                padding: '4px',
                border: 'none',
                background: 'none',
                cursor: 'pointer'
              }}
            >
              <Icon name="x" size={14} color={COLORS.text.secondary} />
            </button>
          )}
        </div>
        
        <button 
          onClick={handleNewSearch}
          style={{
            backgroundColor: COLORS.primary.main,
            padding: '10px 20px',
            borderRadius: '20px',
            border: 'none',
            color: COLORS.neutral.white,
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(201, 181, 156, 0.3)'
          }}
        >
          검색
        </button>
      </div>

      <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
        {/* AI 분석 중 표시 - 더 세련되게 */}
        {isAnalyzing && (
          <div style={{
            backgroundColor: COLORS.neutral.white,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '20px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              backgroundColor: COLORS.primary.light,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              animation: 'pulse 1.5s ease-in-out infinite'
            }}>
              <span style={{ fontSize: '20px' }}>🤖</span>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>
                AI가 분석 중입니다...
              </div>
              <div style={{ fontSize: '14px', color: COLORS.text.secondary }}>
                최적의 모임을 찾고 있어요
              </div>
            </div>
          </div>
        )}

        {/* AI 응답 - ChatGPT 스타일 */}
        {(displayedResponse || isTyping) && !isAnalyzing && (
          <div style={{
            backgroundColor: COLORS.neutral.white,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '20px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
          }}>
            <div style={{ display: 'flex', gap: '16px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                backgroundColor: COLORS.primary.light,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <span style={{ fontSize: '20px' }}>🤖</span>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ 
                  fontSize: '14px',
                  lineHeight: '1.6',
                  color: COLORS.text.primary,
                  whiteSpace: 'pre-line'
                }}>
                  {displayedResponse}
                  {isTyping && (
                    <span style={{
                      display: 'inline-block',
                      width: '8px',
                      height: '16px',
                      backgroundColor: COLORS.primary.main,
                      marginLeft: '2px',
                      animation: 'blink 1s infinite'
                    }} />
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 추천 검색어 - 더 인터랙티브하게 */}
        {suggestions.length > 0 && !isAnalyzing && (
          <div style={{ marginBottom: '20px' }}>
            <p style={{ fontSize: '13px', color: COLORS.text.secondary, marginBottom: '12px', fontWeight: '500' }}>
              이런 검색어는 어떠세요?
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setSearchQuery(suggestion);
                    handleAISearch(suggestion);
                  }}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '20px',
                    border: '1px solid #e5e5ea',
                    backgroundColor: COLORS.neutral.white,
                    color: COLORS.text.primary,
                    fontSize: '14px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    ':hover': {
                      backgroundColor: COLORS.primary.light,
                      borderColor: COLORS.primary.main
                    }
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = COLORS.primary.light;
                    e.currentTarget.style.borderColor = COLORS.primary.main;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = COLORS.neutral.white;
                    e.currentTarget.style.borderColor = '#e5e5ea';
                  }}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 검색 결과 */}
        {searchResults.length > 0 && (
          <div>
            <h3 style={{ 
              fontSize: '18px', 
              fontWeight: '600', 
              marginBottom: '16px',
              color: COLORS.text.primary
            }}>
              모임 목록 ({searchResults.length}개)
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {searchResults.map((meetup) => (
                <div 
                  key={meetup.id}
                  onClick={() => navigate(`/meetup/${meetup.id}`)}
                  style={{ 
                    cursor: 'pointer',
                    transition: 'transform 0.2s',
                    ':hover': {
                      transform: 'translateY(-2px)'
                    }
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <MeetupCard meetup={meetup} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 결과 없음 - 더 친근하게 */}
        {!isAnalyzing && searchResults.length === 0 && aiResponse && !displayedResponse.includes('검색을 분석해봤어요') && (
          <div style={{
            textAlign: 'center',
            marginTop: '60px',
            padding: '40px'
          }}>
            <div style={{
              width: '80px',
              height: '80px',
              backgroundColor: '#f0f0f5',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px'
            }}>
              <Icon name="search" size={40} color={COLORS.neutral.grey400} />
            </div>
            <p style={{ 
              fontSize: '18px',
              fontWeight: '600',
              color: COLORS.text.primary,
              marginBottom: '8px'
            }}>
              앗, 조건에 맞는 모임이 없어요
            </p>
            <p style={{ 
              fontSize: '14px',
              color: COLORS.text.secondary,
              marginBottom: '24px'
            }}>
              다른 검색어를 시도하거나 직접 모임을 만들어보세요!
            </p>
            <button
              onClick={() => navigate('/create-meetup')}
              style={{
                padding: '12px 32px',
                backgroundColor: COLORS.primary.main,
                color: COLORS.neutral.white,
                border: 'none',
                borderRadius: '24px',
                fontSize: '15px',
                fontWeight: '600',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(201, 181, 156, 0.3)'
              }}
            >
              새 모임 만들기
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.6; }
          100% { opacity: 1; }
        }
        
        @keyframes blink {
          0% { opacity: 1; }
          50% { opacity: 0; }
          100% { opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default AISearchResultScreen;