// 카테고리 관련 상수 (혼밥하기 어려운 카테고리 중심)
export const FOOD_CATEGORIES = [
  { 
    id: 'bbq', 
    name: '고기/구이', 
    icon: '/icons/bbq.svg', 
    desc: '삼겹살/갈비/곱창', 
    color: '#FF6B35', 
    bgColor: '#FFF4F0' 
  },
  { 
    id: 'hotpot', 
    name: '전골/찌개', 
    icon: '/icons/hotpot.svg', 
    desc: '부대찌개/김치찌개', 
    color: '#E74C3C', 
    bgColor: '#FDF2F2' 
  },
  { 
    id: 'buffet', 
    name: '뷔페/무한리필', 
    icon: '/icons/buffet.svg', 
    desc: '고기뷔페/샐러드바', 
    color: '#F39C12', 
    bgColor: '#FEF9E7' 
  },
  { 
    id: 'seafood', 
    name: '해산물/회', 
    icon: '/icons/seafood.svg', 
    desc: '회/조개구이/랍스터', 
    color: '#3498DB', 
    bgColor: '#EBF5FB' 
  },
  { 
    id: 'pizza', 
    name: '피자/치킨', 
    icon: '/icons/pizza.svg', 
    desc: '피자/후라이드치킨', 
    color: '#E67E22', 
    bgColor: '#FDF5E6' 
  },
  { 
    id: 'bar', 
    name: '주점/술집', 
    icon: '/icons/bar.svg', 
    desc: '호프집/이자카야', 
    color: '#9B59B6', 
    bgColor: '#F4ECF7' 
  },
  { 
    id: 'course', 
    name: '코스요리', 
    icon: '/icons/course.svg', 
    desc: '오마카세/프렌치', 
    color: '#2ECC71', 
    bgColor: '#E8F8F5' 
  },
  { 
    id: 'party', 
    name: '파티룸', 
    icon: '/icons/party.svg', 
    desc: '생일파티/회식', 
    color: '#E91E63', 
    bgColor: '#FCE4EC' 
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
  '1만원 이하',
  '1-2만원',
  '2-3만원', 
  '3-4만원',
  '4-5만원',
  '5만원 이상'
];