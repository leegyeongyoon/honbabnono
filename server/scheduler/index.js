/**
 * 혼밥시러 스케줄러 시스템
 *
 * node-cron을 사용한 백그라운드 작업 스케줄러.
 * 서버 시작 시 자동으로 등록되며, 테스트 모드에서는 비활성화됩니다.
 *
 * 등록된 작업:
 * 1. 모임 리마인더 (매 1분)    - 30분 내 시작 모임 알림
 * 2. 상태 자동 전환 (매 5분)   - 모집중 -> 진행중 -> 완료 + 호스트 리워드
 * 3. 리뷰 요청 (매 10분)       - 종료 2시간 후 리뷰 요청 알림
 * 4. 노쇼 자동 처리 (매 1시간) - 미출석자 노쇼 처리 및 점수 차감
 * 5. 최소인원 미달 자동취소 (매 5분) - 시작 2시간 전 최소인원 미달 모임 자동 취소
 * 6. 월간 우수 호스트 (매월 1일) - 전월 우수 호스트 선정 및 보상
 */

const cron = require('node-cron');
const logger = require('../config/logger');

const meetupReminder = require('./jobs/meetupReminder');
const reviewRequest = require('./jobs/reviewRequest');
const statusTransition = require('./jobs/statusTransition');
const noShowProcessing = require('./jobs/noShowProcessing');
const autoCancelMinParticipants = require('./jobs/autoCancelMinParticipants');
const monthlyBestHost = require('./jobs/monthlyBestHost');
const arrivalReminder = require('./jobs/arrivalReminder');

const scheduledJobs = [];

function startScheduler() {
  logger.system('===============================================');
  logger.system('  스케줄러 시스템 시작');
  logger.system('===============================================');

  // 1. 모임 리마인더 - 매 1분마다
  const reminderJob = cron.schedule('* * * * *', async () => {
    try {
      await meetupReminder.run();
    } catch (error) {
      logger.error('[모임 리마인더] 실행 실패:', error);
    }
  });
  scheduledJobs.push(reminderJob);
  logger.info('  [모임 리마인더]: 매 1분');

  // 2. 모임 상태 자동 전환 - 매 5분마다
  const statusJob = cron.schedule('*/5 * * * *', async () => {
    try {
      await statusTransition.run();
    } catch (error) {
      logger.error('[상태 전환] 실행 실패:', error);
    }
  });
  scheduledJobs.push(statusJob);
  logger.info('  [상태 자동 전환]: 매 5분');

  // 3. 리뷰 요청 - 매 10분마다
  const reviewJob = cron.schedule('*/10 * * * *', async () => {
    try {
      await reviewRequest.run();
    } catch (error) {
      logger.error('[리뷰 요청] 실행 실패:', error);
    }
  });
  scheduledJobs.push(reviewJob);
  logger.info('  [리뷰 요청]: 매 10분');

  // 4. 노쇼 자동 처리 - 매 1시간마다 (매시 0분)
  const noShowJob = cron.schedule('0 * * * *', async () => {
    try {
      await noShowProcessing.run();
    } catch (error) {
      logger.error('[노쇼 처리] 실행 실패:', error);
    }
  });
  scheduledJobs.push(noShowJob);
  logger.info('  [노쇼 자동 처리]: 매 1시간');

  // 5. 최소인원 미달 자동취소 - 매 5분마다
  const autoCancelJob = cron.schedule('*/5 * * * *', async () => {
    try {
      await autoCancelMinParticipants.run();
    } catch (error) {
      logger.error('[최소인원 자동취소] 실행 실패:', error);
    }
  });
  scheduledJobs.push(autoCancelJob);
  logger.info('  [최소인원 자동취소]: 매 5분');

  // 6. 월간 우수 호스트 선정 - 매월 1일 00:00
  const bestHostJob = cron.schedule('0 0 1 * *', async () => {
    try {
      await monthlyBestHost.run();
    } catch (error) {
      logger.error('[월간 우수 호스트] 실행 실패:', error);
    }
  });
  scheduledJobs.push(bestHostJob);
  logger.info('  [월간 우수 호스트]: 매월 1일');

  // 7. 예약 도착 리마인더 - 매 1분마다
  const arrivalReminderJob = cron.schedule('* * * * *', async () => {
    try {
      await arrivalReminder.run();
    } catch (error) {
      logger.error('[예약 도착 리마인더] 실행 실패:', error);
    }
  });
  scheduledJobs.push(arrivalReminderJob);
  logger.info('  [예약 도착 리마인더]: 매 1분');

  logger.system('===============================================');
}

function stopScheduler() {
  logger.info('스케줄러 시스템 종료 중...');
  for (const job of scheduledJobs) {
    job.stop();
  }
  scheduledJobs.length = 0;
  logger.info('스케줄러 시스템 종료 완료');
}

module.exports = { startScheduler, stopScheduler };
