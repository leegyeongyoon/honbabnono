import type { IconName } from '../components/SimpleIcon';
import { CATEGORY_COLORS } from '../styles/colors';

// 카테고리 타입 정의
export interface FoodCategory {
  id: string;
  name: string;
  icon: IconName;
  desc: string;
  color: string;
  bgColor: string;
  bgHover: string;
  image: string; // DALL-E generated icon path (web: /categories/ID.png)
}

// 카테고리 (8개 — Figma 완성본 기준, 4열 x 2행)
export const FOOD_CATEGORIES: FoodCategory[] = [
  {
    id: 'korean',
    name: '한식',
    icon: 'flame',
    desc: '김치찌개/비빔밥/한정식',
    color: CATEGORY_COLORS.korean.accent,
    bgColor: CATEGORY_COLORS.korean.bg,
    bgHover: CATEGORY_COLORS.korean.bgHover,
    image: '/categories/korean.png',
  },
  {
    id: 'western',
    name: '양식',
    icon: 'pizza',
    desc: '파스타/스테이크/피자',
    color: CATEGORY_COLORS.western.accent,
    bgColor: CATEGORY_COLORS.western.bg,
    bgHover: CATEGORY_COLORS.western.bgHover,
    image: '/categories/western.png',
  },
  {
    id: 'chinese',
    name: '중식',
    icon: 'soup',
    desc: '짜장면/마라탕/양꼬치',
    color: CATEGORY_COLORS.chinese.accent,
    bgColor: CATEGORY_COLORS.chinese.bg,
    bgHover: CATEGORY_COLORS.chinese.bgHover,
    image: '/categories/chinese.png',
  },
  {
    id: 'japanese',
    name: '일식',
    icon: 'fish',
    desc: '초밥/라멘/오마카세',
    color: CATEGORY_COLORS.japanese.accent,
    bgColor: CATEGORY_COLORS.japanese.bg,
    bgHover: CATEGORY_COLORS.japanese.bgHover,
    image: '/categories/japanese.png',
  },
  {
    id: 'bbq',
    name: '고기',
    icon: 'meat',
    desc: '삼겹살/갈비/곱창',
    color: CATEGORY_COLORS.bbq.accent,
    bgColor: CATEGORY_COLORS.bbq.bg,
    bgHover: CATEGORY_COLORS.bbq.bgHover,
    image: '/categories/bbq.png',
  },
  {
    id: 'bunsik',
    name: '분식',
    icon: 'compass',
    desc: '떡볶이/김밥/라면',
    color: CATEGORY_COLORS.etc.accent,
    bgColor: CATEGORY_COLORS.etc.bg,
    bgHover: CATEGORY_COLORS.etc.bgHover,
    image: '/categories/bunsik.png',
  },
  {
    id: 'seafood',
    name: '해산물',
    icon: 'fish',
    desc: '회/조개구이/랍스터',
    color: CATEGORY_COLORS.seafood.accent,
    bgColor: CATEGORY_COLORS.seafood.bg,
    bgHover: CATEGORY_COLORS.seafood.bgHover,
    image: '/categories/seafood.png',
  },
  {
    id: 'hotpot',
    name: '찌개',
    icon: 'pot',
    desc: '부대찌개/샤브샤브/전골',
    color: CATEGORY_COLORS.hotpot.accent,
    bgColor: CATEGORY_COLORS.hotpot.bg,
    bgHover: CATEGORY_COLORS.hotpot.bgHover,
    image: '/categories/hotpot.png',
  },
];

export const FOOD_CATEGORY_NAMES = FOOD_CATEGORIES.map(cat => cat.name);

// 검색용 카테고리 (전체 포함)
export const SEARCH_CATEGORIES = ['전체', ...FOOD_CATEGORY_NAMES];

// ID로 카테고리 조회 헬퍼
export const getCategoryById = (id: string): FoodCategory | undefined =>
  FOOD_CATEGORIES.find(cat => cat.id === id);

// 이름으로 카테고리 조회 헬퍼
export const getCategoryByName = (name: string): FoodCategory | undefined =>
  FOOD_CATEGORIES.find(cat => cat.name === name);

// 이전 카테고리명→새 카테고리 매핑 (하위 호환)
export const LEGACY_CATEGORY_MAP: Record<string, string> = {
  '고기/구이': 'bbq',
  '전골/찌개': 'hotpot',
  '뷔페/무한리필': 'buffet',
  '해산물/회': 'seafood',
  '피자/치킨': 'western',
  '주점/술집': 'bar',
  '코스요리': 'course',
  '파티룸': 'party',
};

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
