/**
 * 주문 옵션 스냅샷을 사람이 읽기 쉬운 라벨로 변환한다.
 *
 * 기대 입력: [{ name, additional_price }] 형태의 배열
 *   → "매운맛 +500원, 곱빼기 +1,000원" 처럼 반환
 *   → additional_price가 0/없으면 가격 부분 생략 ("매운맛")
 * 그 외(null / 레거시 객체 / 문자열 등)는 빈 문자열 반환 (방어적).
 */
export function formatOptionsLabel(options: any): string {
  try {
    if (!options || !Array.isArray(options)) return '';
    const parts: string[] = [];
    for (const opt of options) {
      if (!opt || typeof opt !== 'object') continue;
      const name = opt.name;
      if (!name || typeof name !== 'string') continue;
      const price = Number(opt.additional_price);
      if (price && !Number.isNaN(price)) {
        const sign = price > 0 ? '+' : '';
        parts.push(`${name} ${sign}${price.toLocaleString('ko-KR')}원`);
      } else {
        parts.push(name);
      }
    }
    return parts.join(', ');
  } catch {
    return '';
  }
}

export default formatOptionsLabel;
