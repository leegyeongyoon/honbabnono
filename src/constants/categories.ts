import type { IconName } from '../components/SimpleIcon';

// 카테고리 관련 상수 (혼밥하기 어려운 카테고리 중심)
export const FOOD_CATEGORIES: {
  id: string;
  name: string;
  icon: IconName;
  desc: string;
  color: string;
  bgColor: string;
}[] = [
  {
    id: 'bbq',
    name: '고기/구이',
    icon: 'flame',
    desc: '삼겹살/갈비/곱창',
    color: '#8B7355',
    bgColor: '#F5F5F5'
  },
  {
    id: 'hotpot',
    name: '전골/찌개',
    icon: 'soup',
    desc: '부대찌개/김치찌개',
    color: '#E8B84D',
    bgColor: '#F5F5F5'
  },
  {
    id: 'buffet',
    name: '뷔페/무한리필',
    icon: 'utensils',
    desc: '고기뷔페/샐러드바',
    color: '#5B9A6F',
    bgColor: '#E8F5E9'
  },
  {
    id: 'seafood',
    name: '해산물/회',
    icon: 'fish',
    desc: '회/조개구이/랍스터',
    color: '#6B8EAE',
    bgColor: '#E3F2FD'
  },
  {
    id: 'pizza',
    name: '피자/치킨',
    icon: 'pizza',
    desc: '피자/후라이드치킨',
    color: '#6B4F0E',
    bgColor: '#F5F5F5'
  },
  {
    id: 'bar',
    name: '주점/술집',
    icon: 'wine',
    desc: '호프집/이자카야',
    color: '#9B6B9E',
    bgColor: '#F3E5F5'
  },
  {
    id: 'course',
    name: '코스요리',
    icon: 'award',
    desc: '오마카세/프렌치',
    color: '#B8912E',
    bgColor: '#F5F5F5'
  },
  {
    id: 'party',
    name: '파티룸',
    icon: 'birthday-cake',
    desc: '생일파티/회식',
    color: '#8B7355',
    bgColor: '#FFF0F0'
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
