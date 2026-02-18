// 12색 파스텔 팔레트 — 이름 기반 컬러 아바타 시스템
const AVATAR_COLORS = [
  '#FF6B6B', // 코랄 레드
  '#E8B84D', // 골든앰버
  '#F4A261', // 샌디 오렌지
  '#E9C46A', // 마리골드
  '#2A9D8F', // 틸 그린
  '#6BCB77', // 민트 그린
  '#4ECDC4', // 터콰이즈
  '#5B8DEF', // 코발트 블루
  '#6C63FF', // 인디고
  '#A06CD5', // 라벤더
  '#E56399', // 핑크
  '#FF8A5C', // 피치
] as const;

const hashName = (name: string): number => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash;
  }
  return Math.abs(hash);
};

export const getAvatarColor = (name: string): string => {
  if (!name) return AVATAR_COLORS[0];
  const index = hashName(name) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
};

export const getInitials = (name: string): string => {
  if (!name) return '?';
  const trimmed = name.trim();
  if (trimmed.length === 0) return '?';
  return trimmed.charAt(0).toUpperCase();
};
