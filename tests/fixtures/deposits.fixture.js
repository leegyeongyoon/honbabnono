/**
 * Deposits & Points Fixtures
 * 테스트용 포인트/약속금 데이터 팩토리
 */

let depositCounter = 0;
let transactionCounter = 0;

/**
 * 포인트 잔액 데이터 생성
 * @param {string} userId - 사용자 ID
 * @param {Object} overrides - 덮어쓸 속성
 * @returns {Object} 포인트 잔액 데이터
 */
const createPointsBalanceFixture = (userId, overrides = {}) => {
  return {
    user_id: userId,
    balance: overrides.balance || 10000,
    total_earned: overrides.total_earned || 15000,
    total_spent: overrides.total_spent || 5000,
    updated_at: overrides.updated_at || new Date(),
    ...overrides,
  };
};

/**
 * 포인트 거래 내역 생성
 * @param {string} userId - 사용자 ID
 * @param {Object} overrides - 덮어쓸 속성
 * @returns {Object} 포인트 거래 내역
 */
const createPointTransactionFixture = (userId, overrides = {}) => {
  transactionCounter++;
  const timestamp = Date.now();
  return {
    id: overrides.id || `transaction-${timestamp}-${transactionCounter}`,
    user_id: userId,
    type: overrides.type || 'earn',
    amount: overrides.amount || 1000,
    balance_after: overrides.balance_after || 11000,
    description: overrides.description || '포인트 적립',
    reference_type: overrides.reference_type || null,
    reference_id: overrides.reference_id || null,
    created_at: overrides.created_at || new Date(),
    ...overrides,
  };
};

/**
 * 약속금 데이터 생성
 * @param {string} userId - 사용자 ID
 * @param {string} meetupId - 모임 ID
 * @param {Object} overrides - 덮어쓸 속성
 * @returns {Object} 약속금 데이터
 */
const createDepositFixture = (userId, meetupId, overrides = {}) => {
  depositCounter++;
  const timestamp = Date.now();
  return {
    id: overrides.id || `deposit-${timestamp}-${depositCounter}`,
    user_id: userId,
    meetup_id: meetupId,
    amount: overrides.amount || 5000,
    status: overrides.status || 'paid',
    paid_at: overrides.paid_at || new Date(),
    refunded_at: overrides.refunded_at || null,
    created_at: overrides.created_at || new Date(),
    updated_at: overrides.updated_at || new Date(),
    ...overrides,
  };
};

/**
 * 환불된 약속금 데이터 생성
 * @param {string} userId - 사용자 ID
 * @param {string} meetupId - 모임 ID
 * @param {Object} overrides - 덮어쓸 속성
 * @returns {Object} 환불된 약속금 데이터
 */
const createRefundedDepositFixture = (userId, meetupId, overrides = {}) => {
  return createDepositFixture(userId, meetupId, {
    status: 'refunded',
    refunded_at: new Date(),
    ...overrides,
  });
};

/**
 * 포인트 충전 내역 생성
 * @param {string} userId - 사용자 ID
 * @param {number} amount - 충전 금액
 * @param {Object} overrides - 덮어쓸 속성
 * @returns {Object} 충전 내역
 */
const createChargeTransactionFixture = (userId, amount = 10000, overrides = {}) => {
  return createPointTransactionFixture(userId, {
    type: 'charge',
    amount,
    description: '포인트 충전',
    ...overrides,
  });
};

/**
 * 포인트 사용 내역 생성
 * @param {string} userId - 사용자 ID
 * @param {number} amount - 사용 금액
 * @param {Object} overrides - 덮어쓸 속성
 * @returns {Object} 사용 내역
 */
const createSpendTransactionFixture = (userId, amount = 5000, overrides = {}) => {
  return createPointTransactionFixture(userId, {
    type: 'spend',
    amount: -amount,
    description: '포인트 사용',
    ...overrides,
  });
};

/**
 * 거래 내역 배열 생성
 * @param {string} userId - 사용자 ID
 * @param {number} count - 생성할 거래 수
 * @param {Object} overrides - 공통 덮어쓸 속성
 * @returns {Array} 거래 내역 배열
 */
const createTransactionsFixture = (userId, count, overrides = {}) => {
  return Array.from({ length: count }, (_, index) =>
    createPointTransactionFixture(userId, {
      ...overrides,
      description: `거래 ${index + 1}`,
    })
  );
};

/**
 * 테스트 카운터 초기화
 */
const resetDepositCounters = () => {
  depositCounter = 0;
  transactionCounter = 0;
};

module.exports = {
  createPointsBalanceFixture,
  createPointTransactionFixture,
  createDepositFixture,
  createRefundedDepositFixture,
  createChargeTransactionFixture,
  createSpendTransactionFixture,
  createTransactionsFixture,
  resetDepositCounters,
};
