import { COLORS } from '../../styles/colors';

// ─── Meetup 데이터 인터페이스 ────────────────────────────────
export interface Meetup {
  id: string;
  title: string;
  description?: string;
  category: string;
  location: string;
  address?: string;
  date: string;
  time: string;
  maxParticipants: number;
  currentParticipants: number;
  priceRange?: string;
  ageRange?: string;
  genderPreference?: string;
  image?: string;
  status?: MeetupStatus;
  createdAt?: string;
  created_at?: string;
  distance?: number | null;
  hostName?: string;
  hostImage?: string;
  hostRating?: number;
  promiseDepositAmount?: number;
  participants?: Array<{ name: string; profileImage?: string }>;
}

export type MeetupStatus =
  | 'recruiting'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

// ─── 상태 설정 ─────────────────────────────────────────────
export interface StatusConfig {
  label: string;
  bg: string;
  pulse: boolean;
}

export const STATUS_CONFIG: Record<MeetupStatus, StatusConfig> = {
  recruiting: { label: '모집중', bg: COLORS.functional.success, pulse: true },
  confirmed: { label: '모집완료', bg: COLORS.neutral.grey500, pulse: false },
  in_progress: { label: '진행중', bg: COLORS.primary.main, pulse: false },
  completed: { label: '완료', bg: COLORS.neutral.grey400, pulse: false },
  cancelled: { label: '취소됨', bg: COLORS.functional.error, pulse: false },
} as const;

// ─── 긴급 정보 ─────────────────────────────────────────────
export interface UrgencyInfo {
  label: string;
  color: string;
}

export const getUrgencyInfo = (
  date: string,
  _time: string,
  currentP: number,
  maxP: number,
): UrgencyInfo | null => {
  const now = new Date();
  const meetupDate = new Date(date);
  const diffHours = (meetupDate.getTime() - now.getTime()) / (1000 * 60 * 60);
  const spotsLeft = maxP - currentP;

  if (spotsLeft === 1) return { label: '1자리 남음', color: COLORS.special.hot };
  if (diffHours > 0 && diffHours < 3) return { label: '곧 마감', color: COLORS.special.hot };
  if (diffHours > 0 && diffHours < 12) return { label: '오늘 마감', color: COLORS.functional.warning };
  return null;
};

// ─── 거리 포맷 ─────────────────────────────────────────────
export const formatDistance = (distanceInMeters: number | null | undefined): string | null => {
  if (distanceInMeters === null || distanceInMeters === undefined) {
    return null;
  }
  if (distanceInMeters < 1000) {
    return `${Math.round(distanceInMeters)}m`;
  }
  return `${(distanceInMeters / 1000).toFixed(1)}km`;
};

// ─── 공통 Props ────────────────────────────────────────────
export interface MeetupCardBaseProps {
  meetup: Meetup;
  onPress: (meetup: Meetup) => void;
}

// ─── Tag 크기 ──────────────────────────────────────────────
export type TagSize = 'sm' | 'md';

// ─── Participant variant ───────────────────────────────────
export type ParticipantVariant = 'bar' | 'text' | 'avatars';
