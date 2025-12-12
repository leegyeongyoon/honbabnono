// 카테고리별 기본 이미지 유틸리티

export const getDefaultImageByCategory = (category: string): string => {
  const defaultImages: { [key: string]: string } = {
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

export const processImageUrl = (image: string | null | undefined, category: string): string => {
  if (image) {
    return image;
  }
  return getDefaultImageByCategory(category);
};