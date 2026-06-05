// ============================================================
// 관리자 패널 공통 포맷 유틸 (통화/날짜/사업자번호)
// ============================================================

/** 원화 — ₩ + 천단위 콤마 */
export const won = (n?: number | null): string =>
  `₩${Number(n ?? 0).toLocaleString('ko-KR')}`;

/** 숫자 천단위 콤마 (단위 없음) */
export const num = (n?: number | null): string =>
  Number(n ?? 0).toLocaleString('ko-KR');

/** 날짜 — YYYY.MM.DD */
export const formatDate = (s?: string | null): string => {
  if (!s) return '-';
  try {
    return new Date(s).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
  } catch {
    return String(s);
  }
};

/** 날짜+시각 — YYYY.MM.DD HH:mm */
export const formatDateTime = (s?: string | null): string => {
  if (!s) return '-';
  try {
    return new Date(s).toLocaleString('ko-KR', {
      year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return String(s);
  }
};

/** 사업자등록번호 — 000-00-00000 */
export const formatBizNumber = (n?: string): string => {
  if (!n) return '-';
  const d = String(n).replace(/\D/g, '');
  if (d.length !== 10) return n;
  return `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}`;
};
