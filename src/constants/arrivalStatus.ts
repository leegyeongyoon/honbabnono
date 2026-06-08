/**
 * 예약 도착 상태 — 서버 server/constants/arrivalStatus.js 와 동일 표준.
 * 고객이 설정 가능한 단계: 가는 중 → 근처 → 도착.
 */
export const ARRIVAL_STATUS = {
  NOT_STARTED: 'not_started',
  ON_THE_WAY: 'on_the_way',
  NEARBY: 'nearby',
  ARRIVED: 'arrived',
  NOSHOW: 'noshow',
} as const;

export type ArrivalStatus = (typeof ARRIVAL_STATUS)[keyof typeof ARRIVAL_STATUS];

export interface ArrivalStep {
  value: ArrivalStatus;
  label: string;
  emoji: string;
}

/** 고객이 순서대로 누르는 도착 단계 */
export const ARRIVAL_STEPS: ArrivalStep[] = [
  { value: ARRIVAL_STATUS.ON_THE_WAY, label: '가는 중', emoji: '🚗' },
  { value: ARRIVAL_STATUS.NEARBY, label: '근처 도착', emoji: '📍' },
  { value: ARRIVAL_STATUS.ARRIVED, label: '도착', emoji: '🏃' },
];

/** 라벨/이모지 조회 */
export const ARRIVAL_LABELS: Record<string, { label: string; emoji: string }> = {
  [ARRIVAL_STATUS.NOT_STARTED]: { label: '대기', emoji: '' },
  [ARRIVAL_STATUS.ON_THE_WAY]: { label: '가는 중', emoji: '🚗' },
  [ARRIVAL_STATUS.NEARBY]: { label: '근처 도착', emoji: '📍' },
  [ARRIVAL_STATUS.ARRIVED]: { label: '도착', emoji: '🏃' },
  [ARRIVAL_STATUS.NOSHOW]: { label: '노쇼', emoji: '⚠️' },
};

/** 현재 상태에서 다음으로 누를 수 있는 단계 (없으면 null = 더 진행 불가) */
export const nextArrivalStep = (current?: string): ArrivalStep | null => {
  const idx = ARRIVAL_STEPS.findIndex((s) => s.value === current);
  if (current === ARRIVAL_STATUS.ARRIVED) return null;
  return ARRIVAL_STEPS[idx + 1] ?? ARRIVAL_STEPS[0];
};
