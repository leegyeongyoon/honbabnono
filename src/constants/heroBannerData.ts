// 홈 히어로 배너 카드 데이터
// 향후 OpenAI API로 동적 텍스트 생성 시 이 구조를 그대로 사용

export interface HeroBannerItem {
  id: string;
  title: string;
  subtitle: string;
  illustration: 'bowl' | 'people' | 'map' | 'rice-score';
  gradientStart: string;
  gradientEnd: string;
}

export const HERO_BANNERS: HeroBannerItem[] = [
  {
    id: 'banner-1',
    title: '오늘 점심 뭐 먹지?',
    subtitle: '메뉴 고민, 여기서 해결',
    illustration: 'bowl',
    gradientStart: '#8B5216',
    gradientEnd: '#D4882C',
  },
  {
    id: 'banner-2',
    title: '따뜻한 국물이 땡기는 날',
    subtitle: '찌개, 국밥, 라멘 뭐든지',
    illustration: 'people',
    gradientStart: '#A86A20',
    gradientEnd: '#E9A84A',
  },
  {
    id: 'banner-3',
    title: '동네 숨은 맛집 어디?',
    subtitle: '걸어서 5분, 오늘의 한끼',
    illustration: 'map',
    gradientStart: '#704412',
    gradientEnd: '#A86A20',
  },
  {
    id: 'banner-4',
    title: '한 끼도 소중하니까',
    subtitle: '매일 다른 메뉴, 매일 새로운 맛',
    illustration: 'rice-score',
    gradientStart: '#8B5216',
    gradientEnd: '#E9A84A',
  },
];
