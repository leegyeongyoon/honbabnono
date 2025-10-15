export interface MealPreference {
  id: string;
  name: string;
  emoji: string;
  description: string;
  category: 'dietary' | 'style' | 'restriction' | 'atmosphere';
}

export interface MealPreferences {
  dietary: string[];      // 식이 제한 (채식, 비건, 할랄 등)
  style: string[];        // 식사 스타일 (가정식, 고급, 캐주얼 등)
  restriction: string[];  // 알레르기/금기 사항
  atmosphere: string[];   // 분위기 선호도
}

export const MEAL_PREFERENCES: MealPreference[] = [
  // 식이 제한
  { id: 'vegetarian', name: '채식주의', emoji: '🥗', description: '고기를 먹지 않는 식단', category: 'dietary' },
  { id: 'vegan', name: '비건', emoji: '🌱', description: '동물성 식품을 먹지 않는 식단', category: 'dietary' },
  { id: 'halal', name: '할랄', emoji: '☪️', description: '이슬람 종교에 따른 식단', category: 'dietary' },
  { id: 'kosher', name: '코셔', emoji: '✡️', description: '유대교 종교에 따른 식단', category: 'dietary' },
  { id: 'pescatarian', name: '페스코', emoji: '🐟', description: '생선은 섭취하는 채식주의', category: 'dietary' },
  
  // 식사 스타일
  { id: 'fine_dining', name: '고급 레스토랑', emoji: '🍾', description: '품격있는 식사 경험', category: 'style' },
  { id: 'casual', name: '캐주얼', emoji: '🍕', description: '편안하고 자유로운 분위기', category: 'style' },
  { id: 'home_style', name: '가정식', emoji: '🏠', description: '집밥같은 따뜻한 음식', category: 'style' },
  { id: 'street_food', name: '길거리음식', emoji: '🌮', description: '간편하고 맛있는 스트리트푸드', category: 'style' },
  { id: 'buffet', name: '뷔페', emoji: '🍽️', description: '다양한 음식을 자유롭게', category: 'style' },
  { id: 'course_meal', name: '코스요리', emoji: '🥘', description: '순서대로 나오는 정식 코스', category: 'style' },
  
  // 알레르기/금기사항
  { id: 'no_nuts', name: '견과류 제외', emoji: '🚫🥜', description: '견과류 알레르기', category: 'restriction' },
  { id: 'no_seafood', name: '해산물 제외', emoji: '🚫🦐', description: '해산물 알레르기', category: 'restriction' },
  { id: 'no_dairy', name: '유제품 제외', emoji: '🚫🥛', description: '유당불내증 또는 유제품 알레르기', category: 'restriction' },
  { id: 'no_gluten', name: '글루텐프리', emoji: '🚫🌾', description: '글루텐 불내증', category: 'restriction' },
  { id: 'no_spicy', name: '맵지 않게', emoji: '🚫🌶️', description: '매운 음식을 피함', category: 'restriction' },
  { id: 'no_alcohol', name: '무알코올', emoji: '🚫🍺', description: '술을 마시지 않음', category: 'restriction' },
  
  // 분위기 선호도
  { id: 'quiet', name: '조용한 곳', emoji: '🤫', description: '대화하기 좋은 조용한 분위기', category: 'atmosphere' },
  { id: 'lively', name: '활기찬 곳', emoji: '🎉', description: '북적이고 에너지 넘치는 분위기', category: 'atmosphere' },
  { id: 'romantic', name: '로맨틱', emoji: '💕', description: '분위기 있는 낭만적인 곳', category: 'atmosphere' },
  { id: 'family_friendly', name: '가족친화적', emoji: '👨‍👩‍👧‍👦', description: '아이들과 함께 가기 좋은 곳', category: 'atmosphere' },
  { id: 'trendy', name: '트렌디', emoji: '✨', description: '최신 트렌드를 반영한 핫플레이스', category: 'atmosphere' },
  { id: 'traditional', name: '전통적', emoji: '🏮', description: '전통적이고 정통적인 분위기', category: 'atmosphere' },
  { id: 'outdoor', name: '야외/테라스', emoji: '🌳', description: '야외나 테라스에서 식사', category: 'atmosphere' },
];

export const getMealPreferencesByCategory = (category: string): MealPreference[] => {
  return MEAL_PREFERENCES.filter(pref => pref.category === category);
};

export const getMealPreferenceById = (id: string): MealPreference | undefined => {
  return MEAL_PREFERENCES.find(pref => pref.id === id);
};

export const getMealPreferencesByIds = (ids: string[]): MealPreference[] => {
  return ids.map(id => getMealPreferenceById(id)).filter(Boolean) as MealPreference[];
};