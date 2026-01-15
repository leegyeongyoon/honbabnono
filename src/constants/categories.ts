// 카테고리 관련 상수 (혼밥하기 어려운 카테고리 중심)
export const FOOD_CATEGORIES = [
  { 
    id: 'bbq', 
    name: '고기/구이', 
    icon: 'fire', 
    desc: '삼겹살/갈비/곱창', 
    color: '#C9B59C', 
    bgColor: '#F9F8F6' 
  },
  { 
    id: 'hotpot', 
    name: '전골/찌개', 
    icon: 'utensils', 
    desc: '부대찌개/김치찌개', 
    color: '#C9B59C', 
    bgColor: '#F9F8F6' 
  },
  { 
    id: 'buffet', 
    name: '뷔페/무한리필', 
    icon: 'concierge-bell', 
    desc: '고기뷔페/샐러드바', 
    color: '#C9B59C', 
    bgColor: '#F9F8F6' 
  },
  { 
    id: 'seafood', 
    name: '해산물/회', 
    icon: 'fish', 
    desc: '회/조개구이/랍스터', 
    color: '#C9B59C', 
    bgColor: '#F9F8F6' 
  },
  { 
    id: 'pizza', 
    name: '피자/치킨', 
    icon: 'drumstick-bite', 
    desc: '피자/후라이드치킨', 
    color: '#C9B59C', 
    bgColor: '#F9F8F6' 
  },
  { 
    id: 'bar', 
    name: '주점/술집', 
    icon: 'wine-glass', 
    desc: '호프집/이자카야', 
    color: '#C9B59C', 
    bgColor: '#F9F8F6' 
  },
  { 
    id: 'course', 
    name: '코스요리', 
    icon: 'award', 
    desc: '오마카세/프렌치', 
    color: '#C9B59C', 
    bgColor: '#F9F8F6' 
  },
  { 
    id: 'party', 
    name: '파티룸', 
    icon: 'birthday-cake', 
    desc: '생일파티/회식', 
    color: '#C9B59C', 
    bgColor: '#F9F8F6' 
  },
];

export const FOOD_CATEGORY_NAMES = FOOD_CATEGORIES.map(cat => cat.name);

// 검색용 카테고리 (전체 포함)
export const SEARCH_CATEGORIES = ['전체', ...FOOD_CATEGORY_NAMES];

// 지역 관련 상수
export const LOCATIONS = [
  '강남구', '서초구', '송파구', '강동구',
  '마포구', '용산구', '성동구', '광진구',
  '종로구', '중구', '영등포구', '구로구',
  '관악구', '동작구', '서대문구', '은평구',
  '강북구', '성북구', '동대문구', '중랑구',
  '노원구', '도봉구', '강서구', '양천구', '금천구'
];

// 검색용 지역 (전체 포함)
export const SEARCH_LOCATIONS = ['전체', ...LOCATIONS];

// 정렬 옵션
export const SORT_OPTIONS = [
  { id: 'latest', name: '최신순' },
  { id: 'popular', name: '인기순' },
  { id: 'deadline', name: '마감임박순' },
  { id: 'price', name: '가격순' },
];

export const SORT_OPTION_NAMES = SORT_OPTIONS.map(opt => opt.name);

// 가격대 옵션
export const PRICE_RANGES = [
  { id: 'price1', label: '1만원대', min: 0, max: 19999 },
  { id: 'price2', label: '2만원대', min: 20000, max: 29999 },
  { id: 'price3', label: '3만원대', min: 30000, max: 39999 },
  { id: 'price4', label: '4만원대', min: 40000, max: 49999 },
  { id: 'price5', label: '5만원대+', min: 50000, max: null },
];