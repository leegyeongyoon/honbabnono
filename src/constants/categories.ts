// 카테고리 관련 상수
export const FOOD_CATEGORIES = [
  { id: 'korean', name: '한식', emoji: '🍚', desc: '김치찌개/불고기' },
  { id: 'chinese', name: '중식', emoji: '🥟', desc: '짜장면/탕수육' },
  { id: 'japanese', name: '일식', emoji: '🍣', desc: '초밥/라멘' },
  { id: 'western', name: '양식', emoji: '🍝', desc: '파스타/스테이크' },
  { id: 'cafe', name: '카페', emoji: '☕', desc: '디저트/음료' },
  { id: 'bar', name: '술집', emoji: '🍻', desc: '맥주/안주' },
  { id: 'fastfood', name: '패스트푸드', emoji: '🍔', desc: '햄버거/치킨' },
  { id: 'dessert', name: '디저트', emoji: '🍰', desc: '케이크/아이스크림' },
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