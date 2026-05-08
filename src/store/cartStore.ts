import { create } from 'zustand';

// ============================================================
// Cart Store — 잇테이블 v2 (로컬 전용, 서버 저장 없음)
// ============================================================

export interface CartItem {
  menuId: string;
  menuName: string;
  unitPrice: number;
  quantity: number;
  options?: any[];
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
    const { items, restaurantId } = get();

    const existing = items.find((i) => i.menuId === item.menuId);

    let nextItems: CartItem[];

    if (existing) {
      // 이미 담긴 메뉴 — 수량 증가
      nextItems = items.map((i) =>
        i.menuId === item.menuId
          ? {
              ...i,
              quantity: i.quantity + item.quantity,
              options: item.options ?? i.options,
              subtotal: i.unitPrice * (i.quantity + item.quantity),
            }
          : i,
      );
    } else {
      const subtotal = item.unitPrice * item.quantity;
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
        ? { ...i, quantity, subtotal: i.unitPrice * quantity }
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
