import { create } from 'zustand';

// ============================================================
// Cart Store — 잇테이블 v2 (로컬 전용, 서버 저장 없음)
// ============================================================

/** 주문 생성 시 서버로 보내는 옵션 페이로드 (서버가 가격 재조회 — 권위 계산) */
export interface CartItemOptionPayload {
  group_id: string;
  item_ids: string[];
}

export interface CartItem {
  menuId: string;
  menuName: string;
  unitPrice: number;
  quantity: number;
  /** 서버 전송용 옵션 선택 (menu_option_items id) */
  options?: CartItemOptionPayload[];
  /** 화면 표시용 옵션 라벨 (예: "매운맛, 곱빼기") */
  optionLabel?: string;
  /** 옵션 추가금 합계 (1개 기준) — 서버가 재계산하므로 표시용 */
  optionsPrice?: number;
  subtotal: number;
}

interface CartState {
  // State
  items: CartItem[];
  restaurantId: string | null;
  totalAmount: number;

  // Actions
  addItem: (item: Omit<CartItem, 'subtotal'>) => void;
  removeItem: (menuId: string) => void;
  updateQuantity: (menuId: string, quantity: number) => void;
  clearCart: () => void;
  setRestaurantId: (id: string) => void;
}

/** 단가(메뉴+옵션) 계산 헬퍼 */
const calcUnit = (item: Pick<CartItem, 'unitPrice' | 'optionsPrice'>): number =>
  item.unitPrice + (item.optionsPrice || 0);

/** 총액 재계산 헬퍼 */
const calcTotal = (items: CartItem[]): number =>
  items.reduce((sum, item) => sum + item.subtotal, 0);

const useCartStore = create<CartState>((set, get) => ({
  // Initial State
  items: [],
  restaurantId: null,
  totalAmount: 0,

  // ---------- Actions ----------

  addItem: (item) => {
    const { items } = get();

    const existing = items.find((i) => i.menuId === item.menuId);

    let nextItems: CartItem[];

    if (existing) {
      // 이미 담긴 메뉴 — 수량 증가 (옵션은 새 선택이 있으면 교체: 메뉴당 단일 옵션 세트 정책)
      nextItems = items.map((i) => {
        if (i.menuId !== item.menuId) return i;
        const merged = {
          ...i,
          quantity: i.quantity + item.quantity,
          options: item.options ?? i.options,
          optionLabel: item.options ? item.optionLabel : i.optionLabel,
          optionsPrice: item.options ? (item.optionsPrice || 0) : (i.optionsPrice || 0),
        };
        return { ...merged, subtotal: calcUnit(merged) * merged.quantity };
      });
    } else {
      const subtotal = calcUnit(item) * item.quantity;
      nextItems = [...items, { ...item, subtotal }];
    }

    set({ items: nextItems, totalAmount: calcTotal(nextItems) });
  },

  removeItem: (menuId) => {
    const nextItems = get().items.filter((i) => i.menuId !== menuId);
    set({
      items: nextItems,
      totalAmount: calcTotal(nextItems),
      // 장바구니가 비면 restaurantId 도 초기화
      ...(nextItems.length === 0 ? { restaurantId: null } : {}),
    });
  },

  updateQuantity: (menuId, quantity) => {
    if (quantity <= 0) {
      // 0 이하이면 삭제
      get().removeItem(menuId);
      return;
    }

    const nextItems = get().items.map((i) =>
      i.menuId === menuId
        ? { ...i, quantity, subtotal: calcUnit(i) * quantity }
        : i,
    );

    set({ items: nextItems, totalAmount: calcTotal(nextItems) });
  },

  clearCart: () => {
    set({ items: [], restaurantId: null, totalAmount: 0 });
  },

  setRestaurantId: (id) => {
    const { restaurantId } = get();

    // 다른 매장으로 변경 시 기존 장바구니 클리어 + restaurantId 동시 업데이트
    if (restaurantId && restaurantId !== id) {
      set({ items: [], totalAmount: 0, restaurantId: id });
    } else {
      set({ restaurantId: id });
    }
  },
}));

export default useCartStore;
