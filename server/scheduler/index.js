/**
 * 혼밥시러 스케줄러 시스템
 *
 * node-cron을 사용한 백그라운드 작업 스케줄러.
 * 서버 시작 시 자동으로 등록되며, 테스트 모드에서는 비활성화됩니다.
 *
 * 등록된 작업:
 * 1. 모임 리마인더 (매 1분)    - 30분 내 시작 모임 알림
 * 2. 상태 자동 전환 (매 5분)   - 모집중 -> 진행중 -> 완료
 * 3. 리뷰 요청 (매 10분)       - 종료 2시간 후 리뷰 요청 알림
 * 4. 노쇼 자동 처리 (매 1시간) - 미출석자 노쇼 처리 및 점수 차감
 */

const cron = require('node-cron');

const meetupReminder = require('./jobs/meetupReminder');
const reviewRequest = require('./jobs/reviewRequest');
const statusTransition = require('./jobs/statusTransition');
const noShowProcessing = require('./jobs/noShowProcessing');

const scheduledJobs = [];

function startScheduler() {
  console.log('');
  console.log('📅 ═══════════════════════════════════════════════');
  console.log('📅  스케줄러 시스템 시작');
  console.log('📅 ═══════════════════════════════════════════════');

  // 1. 모임 리마인더 - 매 1분마다
  const reminderJob = cron.schedule('* * * * *', async () => {
    try {
      await meetupReminder.run();
    } catch (error) {
      console.error('⏰ [모임 리마인더] 실행 실패:', error);
    }
  });
  scheduledJobs.push(reminderJob);
  console.log('📅  ├─ ⏰ 모임 리마인더: 매 1분');

  // 2. 모임 상태 자동 전환 - 매 5분마다
  const statusJob = cron.schedule('*/5 * * * *', async () => {
    try {
      await statusTransition.run();
    } catch (error) {
      console.error('🔄 [상태 전환] 실행 실패:', error);
    }
  });
  scheduledJobs.push(statusJob);
  console.log('📅  ├─ 🔄 상태 자동 전환: 매 5분');

  // 3. 리뷰 요청 - 매 10분마다
  const reviewJob = cron.schedule('*/10 * * * *', async () => {
    try {
      await reviewRequest.run();
    } catch (error) {
      console.error('📝 [리뷰 요청] 실행 실패:', error);
    }
  });
  scheduledJobs.push(reviewJob);
  console.log('📅  ├─ 📝 리뷰 요청: 매 10분');

  // 4. 노쇼 자동 처리 - 매 1시간마다 (매시 0분)
  const noShowJob = cron.schedule('0 * * * *', async () => {
    try {
      await noShowProcessing.run();
    } catch (error) {
      console.error('🚫 [노쇼 처리] 실행 실패:', error);
    }
  });
  scheduledJobs.push(noShowJob);
  console.log('📅  └─ 🚫 노쇼 자동 처리: 매 1시간');

  console.log('📅 ═══════════════════════════════════════════════');
  console.log('');
}

function stopScheduler() {
  console.log('📅 스케줄러 시스템 종료 중...');
  for (const job of scheduledJobs) {
    job.stop();
  }
  scheduledJobs.length = 0;
  console.log('📅 스케줄러 시스템 종료 완료');
}

module.exports = { startScheduler, stopScheduler };
