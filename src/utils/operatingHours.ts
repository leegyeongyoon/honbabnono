// ============================================================
// 운영시간 표시 유틸 — 잇테이블 v2
//
// 백엔드 operating_hours JSONB 형태(시드 기준):
//   { open: "11:00", close: "22:00", breakStart: "15:00", breakEnd: "17:00", lastOrder: "21:00" }
// 문자열/누락 필드/알 수 없는 형태 모두 방어적으로 처리한다.
// 향후 per-day 스키마({ mon: {...}, ... }) 도입 시 이 유틸에 분기 추가.
// ============================================================

export interface OperatingHoursRow {
  label: string;
  value: string;
}

export const formatOperatingHours = (oh: any): OperatingHoursRow[] => {
  if (!oh) return [];

  // 문자열이면 그대로 표시
  if (typeof oh === 'string') {
    return oh.trim() ? [{ label: '영업시간', value: oh }] : [];
  }

  if (typeof oh !== 'object') return [];

  const rows: OperatingHoursRow[] = [];

  if (oh.open && oh.close) {
    rows.push({ label: '영업시간', value: `${oh.open} - ${oh.close}` });
  } else if (oh.open) {
    rows.push({ label: '영업 시작', value: oh.open });
  }

  if (oh.breakStart && oh.breakEnd) {
    rows.push({ label: '브레이크타임', value: `${oh.breakStart} - ${oh.breakEnd}` });
  }

  if (oh.lastOrder) {
    rows.push({ label: '라스트오더', value: oh.lastOrder });
  }

  // 알 수 없는 구조 — 키:값 그대로 나열 (JSON.stringify 원시 노출 방지)
  if (rows.length === 0) {
    for (const [key, value] of Object.entries(oh)) {
      if (typeof value === 'string') rows.push({ label: key, value });
    }
  }

  return rows;
};

/** 카카오맵 외부 링크 — 좌표 있으면 지도 핀, 없으면 주소 검색 */
export const buildKakaoMapUrl = (
  name: string,
  latitude?: number,
  longitude?: number,
  address?: string,
): string | null => {
  if (latitude != null && longitude != null) {
    return `https://map.kakao.com/link/map/${encodeURIComponent(name)},${latitude},${longitude}`;
  }
  if (address) {
    return `https://map.kakao.com/link/search/${encodeURIComponent(address)}`;
  }
  return null;
};
