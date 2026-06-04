/**
 * 로그인 시 저장된 merchantData(localStorage)에서 매장 ID를 추출한다.
 *
 * 주의: merchantData.id는 merchant(점주) PK이므로 절대 매장 ID 폴백으로 쓰지 말 것 —
 *       잘못된 매장에 메뉴/설정이 저장되는 버그의 원인이었다.
 */
export const getRestaurantId = (): string | null => {
  try {
    const data = JSON.parse(localStorage.getItem('merchantData') || '{}');
    return data.restaurant_id ?? data.restaurantId ?? null;
  } catch {
    return null;
  }
};

export default getRestaurantId;
