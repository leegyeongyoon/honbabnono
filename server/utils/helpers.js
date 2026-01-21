// 카테고리별 기본 이미지 함수
const getDefaultImageByCategory = (category) => {
  const defaultImages = {
    '한식': 'https://images.unsplash.com/photo-1498654896293-37aacf113fd9?w=400&h=300&fit=crop&crop=center',
    '중식': 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&h=300&fit=crop&crop=center',
    '일식': 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=400&h=300&fit=crop&crop=center',
    '양식': 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400&h=300&fit=crop&crop=center',
    '동남아': 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=400&h=300&fit=crop&crop=center',
    '카페/디저트': 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400&h=300&fit=crop&crop=center',
    '술집': 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=400&h=300&fit=crop&crop=center',
    '기타': 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&h=300&fit=crop&crop=center'
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
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return Math.round(R * c); // 미터 단위로 반환
};

module.exports = {
  getDefaultImageByCategory,
  processImageUrl,
  calculateDistance
};
