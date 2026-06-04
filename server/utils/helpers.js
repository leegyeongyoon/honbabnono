// 카테고리별 기본 이미지 함수 (프론트엔드 imageUtils.ts와 동기화)
const getDefaultImageByCategory = (category) => {
  const defaultImages = {
    '한식': 'https://images.unsplash.com/photo-1498654896293-37aacf113fd9?w=400&h=300&fit=crop&crop=center',
    '중식': 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&h=300&fit=crop&crop=center',
    '일식': 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=400&h=300&fit=crop&crop=center',
    '양식': 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400&h=300&fit=crop&crop=center',
    '고기/구이': 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&h=300&fit=crop&crop=center',
    '해산물/회': 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=400&h=300&fit=crop&crop=center',
    '전골/찌개': 'https://images.unsplash.com/photo-1498654896293-37aacf113fd9?w=400&h=300&fit=crop&crop=center',
    '뷔페/무한리필': 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400&h=300&fit=crop&crop=center',
    '카페/디저트': 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400&h=300&fit=crop&crop=center',
    '주점/술집': 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=400&h=300&fit=crop&crop=center',
    '술집': 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=400&h=300&fit=crop&crop=center',
    '코스요리': 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=300&fit=crop&crop=center',
    '파티/회식': 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=400&h=300&fit=crop&crop=center',
    '동남아': 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=400&h=300&fit=crop&crop=center',
    '피자/치킨': 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&h=300&fit=crop&crop=center',
    '파티룸': 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=400&h=300&fit=crop&crop=center',
    '기타': 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&h=300&fit=crop&crop=center',
  };
  return defaultImages[category] || defaultImages['기타'];
};

// 모임 이미지 처리 함수
const processImageUrl = (image, category) => {
  if (image) {
    return image;
  }
  return getDefaultImageByCategory(category);
};

// 거리 계산 함수 (Haversine formula)
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371000; // 지구 반지름 (미터)
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c); // 미터 단위로 반환
};

// 예약일(DATE)과 예약시각(TIME)을 합쳐 로컬 타임스탬프 Date 객체로 변환
// - date: 'YYYY-MM-DD' 문자열 또는 Date 객체 (pg DATE 컬럼은 Date 객체로 반환됨)
// - time: 'HH:MM' 또는 'HH:MM:SS' 문자열 (pg TIME 컬럼은 문자열로 반환됨)
// 주의: new Date('18:00:00')은 Invalid Date — 반드시 이 헬퍼로 합산할 것
const combineReservationDateTime = (date, time) => {
  if (!date) return null;

  let base;
  if (date instanceof Date) {
    base = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  } else if (typeof date === 'string') {
    const m = date.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return null;
    base = new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10));
  } else {
    return null;
  }
  if (Number.isNaN(base.getTime())) return null;

  if (typeof time === 'string') {
    const t = time.match(/^(\d{1,2}):(\d{2})/);
    if (t) {
      base.setHours(parseInt(t[1], 10), parseInt(t[2], 10), 0, 0);
    }
  }
  return base;
};

// 매장 환불 정책에서 적용 요율 선택 (예약/결제 환불 공통)
// - policies: [{ days_before, refund_rate }]
// - daysUntil: 예약까지 남은 일수
// 의미: days_before일 이상 남았으면 해당 요율 적용 (충족하는 가장 큰 구간 선택).
//       어느 구간도 충족 못 하면(매우 임박) 가장 임박한 구간의 요율 적용.
const pickRefundRate = (policies, daysUntil) => {
  if (!policies || policies.length === 0) return null;
  const sorted = [...policies].sort((a, b) => a.days_before - b.days_before);
  const matched = sorted.filter((p) => daysUntil >= p.days_before);
  if (matched.length > 0) {
    return matched[matched.length - 1].refund_rate;
  }
  return sorted[0].refund_rate;
};

module.exports = {
  getDefaultImageByCategory,
  processImageUrl,
  calculateDistance,
  combineReservationDateTime,
  pickRefundRate
};
