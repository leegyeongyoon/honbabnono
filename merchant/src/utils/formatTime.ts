/**
 * 예약 시간 문자열을 "HH:mm" 형식으로 안전하게 포맷팅
 *
 * 받을 수 있는 입력:
 *   - "19:00:00" (PostgreSQL TIME 컬럼) → "19:00"
 *   - "19:00"                          → "19:00"
 *   - "2026-05-13T19:00:00.000Z" (ISO) → "19:00"
 *   - null/undefined/잘못된 값         → "-"
 */
export function formatReservationTime(value: string | null | undefined): string {
  if (!value) return '-';

  // HH:mm 또는 HH:mm:ss 형태면 그대로 슬라이스
  if (typeof value === 'string' && /^\d{2}:\d{2}(:\d{2})?$/.test(value)) {
    return value.slice(0, 5);
  }

  // ISO 등 datetime 형태는 Date로 파싱
  const d = new Date(value);
  if (isNaN(d.getTime())) return '-';

  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}
