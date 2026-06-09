// 가짜문(Fake Door) 검증용 가상 매장 데이터.
// 선결제 문화가 이미 있는 업종(오마카세/한우 코스)으로 — "복잡한 메뉴" 리스크 우회.
// variant = 선결제 형태 A/B (full=전액, deposit=예약금, course=코스만 선주문)

export type PrepayVariant = 'full' | 'deposit' | 'course';

export interface FakeMenu {
  name: string;
  description: string;
  price: number;
  image?: string;
}

export interface FakeStore {
  ref: string; // slug — funnel_events.restaurant_ref
  name: string;
  category: string;
  area: string;
  rating: number;
  reviewCount: number;
  heroImage: string;
  tagline: string;
  menus: FakeMenu[];
  /** 이 매장에서 노출할 선결제 형태 */
  variant: PrepayVariant;
  /** deposit variant일 때 예약금 */
  depositAmount?: number;
}

export const FAKE_STORES: Record<string, FakeStore> = {
  'omakase-seocho': {
    ref: 'omakase-seocho',
    name: '스시 묘진',
    category: '오마카세',
    area: '서초',
    rating: 4.9,
    reviewCount: 312,
    heroImage: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=800&h=500&fit=crop',
    tagline: '예약 시간에 도착하면, 기다림 없이 바로 첫 점이 나옵니다',
    variant: 'deposit',
    depositAmount: 30000,
    menus: [
      { name: '런치 오마카세 (12피스)', description: '제철 생선 12종 + 미소시루 + 계란찜', price: 89000, image: 'https://images.unsplash.com/photo-1611143669185-af224c5e3252?w=400&h=300&fit=crop' },
      { name: '디너 오마카세 (18피스)', description: '셰프 셀렉션 18종 + 사이드 + 디저트', price: 159000, image: 'https://images.unsplash.com/photo-1564489563601-c53cfc451e93?w=400&h=300&fit=crop' },
      { name: '사케 페어링', description: '코스에 맞춘 사케 4잔', price: 49000, image: 'https://images.unsplash.com/photo-1627384113743-6bd5a479fffd?w=400&h=300&fit=crop' },
    ],
  },
  'hanwoo-gangnam': {
    ref: 'hanwoo-gangnam',
    name: '한우담 본점',
    category: '한우 코스',
    area: '강남',
    rating: 4.8,
    reviewCount: 528,
    heroImage: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&h=500&fit=crop',
    tagline: '미리 주문하고 도착하면, 자리에 앉자마자 첫 고기가 구워집니다',
    variant: 'course',
    menus: [
      { name: '1++ 등심 코스 (2인)', description: '1++ 등심 + 채끝 + 안심 + 식사 + 후식', price: 198000, image: 'https://images.unsplash.com/photo-1607116667981-ff148a14e975?w=400&h=300&fit=crop' },
      { name: '프리미엄 모둠 코스 (2인)', description: '특수부위 5종 + 육회 + 냉면', price: 268000, image: 'https://images.unsplash.com/photo-1588168333986-5078d3ae3976?w=400&h=300&fit=crop' },
      { name: '한우 육사시미', description: '당일 도축 한우 육회', price: 38000, image: 'https://images.unsplash.com/photo-1432139555190-58524dae6a55?w=400&h=300&fit=crop' },
    ],
  },
};

export const DEFAULT_STORE_REF = 'omakase-seocho';

export const variantLabel = (v: PrepayVariant, depositAmount?: number): string => {
  switch (v) {
    case 'full': return '전액 선결제';
    case 'deposit': return `예약금 ${(depositAmount ?? 30000).toLocaleString('ko-KR')}원 선결제`;
    case 'course': return '코스 메뉴 선주문·선결제';
    default: return '선결제';
  }
};
