/**
 * server/utils/helpers.js 단위 테스트
 * — 예약 일시 합산 / 환불 정책 매칭
 */

const { combineReservationDateTime, pickRefundRate } = require('../../../server/utils/helpers');

describe('combineReservationDateTime', () => {
  it('문자열 날짜 + HH:MM 시각을 로컬 타임스탬프로 합산한다', () => {
    const result = combineReservationDateTime('2026-06-10', '18:30');
    expect(result).toBeInstanceOf(Date);
    expect(result.getFullYear()).toBe(2026);
    expect(result.getMonth()).toBe(5);
    expect(result.getDate()).toBe(10);
    expect(result.getHours()).toBe(18);
    expect(result.getMinutes()).toBe(30);
  });

  it('HH:MM:SS 형식(pg TIME 컬럼)도 처리한다', () => {
    const result = combineReservationDateTime('2026-06-10', '09:05:00');
    expect(result.getHours()).toBe(9);
    expect(result.getMinutes()).toBe(5);
  });

  it('Date 객체(pg DATE 컬럼) 입력도 처리한다', () => {
    const result = combineReservationDateTime(new Date(2026, 5, 10), '12:00');
    expect(result.getDate()).toBe(10);
    expect(result.getHours()).toBe(12);
  });

  it('시각이 없으면 자정 기준으로 반환한다', () => {
    const result = combineReservationDateTime('2026-06-10', null);
    expect(result.getHours()).toBe(0);
  });

  it('날짜가 없거나 형식이 잘못되면 null을 반환한다', () => {
    expect(combineReservationDateTime(null, '18:00')).toBeNull();
    expect(combineReservationDateTime('잘못된날짜', '18:00')).toBeNull();
  });

  it('TIME 문자열만으로 new Date()를 만들던 기존 버그를 재현하지 않는다', () => {
    // 기존 코드: new Date('18:00:00') → Invalid Date
    expect(Number.isNaN(new Date('18:00:00').getTime())).toBe(true);
    // 수정 코드: 정상 합산
    const fixed = combineReservationDateTime('2026-06-10', '18:00:00');
    expect(Number.isNaN(fixed.getTime())).toBe(false);
  });
});

describe('pickRefundRate', () => {
  const policies = [
    { days_before: 0, refund_rate: 50 },
    { days_before: 1, refund_rate: 90 },
    { days_before: 3, refund_rate: 100 },
  ];

  it('충족하는 가장 큰 구간의 요율을 적용한다', () => {
    expect(pickRefundRate(policies, 7)).toBe(100); // 3일 이상 남음
    expect(pickRefundRate(policies, 3)).toBe(100);
    expect(pickRefundRate(policies, 2)).toBe(90);  // 1일 이상 3일 미만
    expect(pickRefundRate(policies, 1)).toBe(90);
    expect(pickRefundRate(policies, 0)).toBe(50);  // 당일
  });

  it('어느 구간도 충족하지 못하면 가장 임박한 구간의 요율을 적용한다', () => {
    const strictPolicies = [
      { days_before: 1, refund_rate: 90 },
      { days_before: 3, refund_rate: 100 },
    ];
    expect(pickRefundRate(strictPolicies, 0)).toBe(90); // 당일 — 최소 구간 요율
  });

  it('정렬되지 않은 입력도 처리한다', () => {
    const shuffled = [policies[2], policies[0], policies[1]];
    expect(pickRefundRate(shuffled, 2)).toBe(90);
  });

  it('정책이 없으면 null을 반환한다', () => {
    expect(pickRefundRate([], 5)).toBeNull();
    expect(pickRefundRate(null, 5)).toBeNull();
  });
});
