/**
 * Fixtures Index
 * 모든 테스트 데이터 팩토리 통합 export
 */

const users = require('./users.fixture');
const meetups = require('./meetups.fixture');
const deposits = require('./deposits.fixture');

module.exports = {
  // Users
  ...users,

  // Meetups
  ...meetups,

  // Deposits & Points
  ...deposits,

  /**
   * 모든 카운터 초기화
   */
  resetAllCounters: () => {
    users.resetUserCounter();
    meetups.resetMeetupCounter();
    deposits.resetDepositCounters();
  },
};
