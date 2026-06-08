/**
 * 예약 도착 상태(arrival_status) 단일 상수 — 서버/고객앱/점주앱 공유 표준.
 *
 * 과거 값이 4곳에서 제각각이었다(on_time/delayed vs on_the_way vs checked_in ...).
 * 고객이 'on_the_way'를 보내는데 zod enum에 없어 도착 알림이 silent 400으로 깨져 있었음.
 * 아래 값으로 통일한다.
 */
const ARRIVAL_STATUS = {
  NOT_STARTED: 'not_started', // 아직 출발 전 (기본/null과 동치)
  ON_THE_WAY: 'on_the_way',   // 가는 중 (고객 설정)
  NEARBY: 'nearby',           // 근처 도착 (고객 설정)
  ARRIVED: 'arrived',         // 도착 (고객 설정 / 체크인 시 시스템 설정)
  NOSHOW: 'noshow',           // 노쇼 (시스템 설정)
};

// 고객이 PUT /reservations/:id/arrival 로 설정할 수 있는 값
const CUSTOMER_SETTABLE = [
  ARRIVAL_STATUS.ON_THE_WAY,
  ARRIVAL_STATUS.NEARBY,
  ARRIVAL_STATUS.ARRIVED,
];

module.exports = { ARRIVAL_STATUS, CUSTOMER_SETTABLE };
