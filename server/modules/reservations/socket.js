/**
 * 예약 관련 Socket.IO 이벤트 핸들러
 *
 * 룸 구조:
 * - reservation:{reservationId} — 개별 예약 룸 (고객이 예약 상세 페이지 진입 시 join)
 * - restaurant:{restaurantId}   — 식당 룸 (점주가 예약 보드 진입 시 join)
 *
 * 이벤트:
 * - reservation:statusUpdate   — 예약 상태 변경 시 고객에게 알림
 * - reservation:arrivalUpdate  — 도착 상태 변경 시 점주에게 알림
 * - order:cookingUpdate        — 조리 상태 변경 시 고객에게 알림
 * - reservation:checkin        — 체크인 시 점주에게 알림
 */

const logger = require('../../config/logger');

const LOG_PREFIX = '🔌 [예약 소켓]';

/**
 * Socket.IO 예약 이벤트 설정
 * @param {import('socket.io').Server} io - Socket.IO 서버 인스턴스
 */
function setupReservationSocket(io) {
  // 네임스페이스 없이 기본 연결에 이벤트 추가
  io.on('connection', (socket) => {
    const user = socket.user;
    if (!user) return; // 인증되지 않은 소켓은 무시

    // ─── 예약 룸 Join/Leave ───
    socket.on('join_reservation', (reservationId) => {
      const room = `reservation:${reservationId}`;
      socket.join(room);
      logger.debug(`${LOG_PREFIX} 예약 룸 참가`, {
        reservationId,
        userId: user.userId,
        socketId: socket.id,
      });
    });

    socket.on('leave_reservation', (reservationId) => {
      const room = `reservation:${reservationId}`;
      socket.leave(room);
      logger.debug(`${LOG_PREFIX} 예약 룸 퇴장`, {
        reservationId,
        userId: user.userId,
      });
    });

    // ─── 식당 룸 Join/Leave (점주용) ───
    socket.on('join_restaurant', (restaurantId) => {
      const room = `restaurant:${restaurantId}`;
      socket.join(room);
      logger.debug(`${LOG_PREFIX} 식당 룸 참가`, {
        restaurantId,
        userId: user.userId,
        socketId: socket.id,
      });
    });

    socket.on('leave_restaurant', (restaurantId) => {
      const room = `restaurant:${restaurantId}`;
      socket.leave(room);
      logger.debug(`${LOG_PREFIX} 식당 룸 퇴장`, {
        restaurantId,
        userId: user.userId,
      });
    });
  });

  logger.info(`${LOG_PREFIX} 예약 소켓 이벤트 등록 완료`);
}

// ─── 서버 → 클라이언트 이벤트 emit 헬퍼 함수들 ───
// controller에서 호출하여 실시간 알림 전송

/**
 * 예약 상태 변경 알림 (점주 → 고객)
 * 고객이 예약 상세 페이지에 있으면 실시간 반영
 */
function emitStatusUpdate(io, reservationId, data) {
  io.to(`reservation:${reservationId}`).emit('reservation:statusUpdate', {
    reservationId,
    status: data.status,
    previousStatus: data.previousStatus,
    updatedAt: new Date().toISOString(),
    ...data,
  });
  logger.debug(`${LOG_PREFIX} 상태 변경 이벤트 전송`, { reservationId, status: data.status });
}

/**
 * 도착 상태 변경 알림 (고객 → 점주)
 * 점주가 예약 보드를 보고 있으면 실시간 반영
 */
function emitArrivalUpdate(io, restaurantId, data) {
  io.to(`restaurant:${restaurantId}`).emit('reservation:arrivalUpdate', {
    reservationId: data.reservationId,
    arrivalStatus: data.arrivalStatus,
    userId: data.userId,
    userName: data.userName,
    updatedAt: new Date().toISOString(),
    ...data,
  });
  logger.debug(`${LOG_PREFIX} 도착 상태 이벤트 전송`, {
    restaurantId,
    reservationId: data.reservationId,
    arrivalStatus: data.arrivalStatus,
  });
}

/**
 * 조리 상태 변경 알림 (점주 → 고객)
 * 고객이 주문 상태를 실시간으로 확인 가능
 */
function emitCookingUpdate(io, reservationId, data) {
  io.to(`reservation:${reservationId}`).emit('order:cookingUpdate', {
    reservationId,
    orderId: data.orderId,
    cookingStatus: data.cookingStatus,
    updatedAt: new Date().toISOString(),
    ...data,
  });
  logger.debug(`${LOG_PREFIX} 조리 상태 이벤트 전송`, {
    reservationId,
    orderId: data.orderId,
    cookingStatus: data.cookingStatus,
  });
}

/**
 * 체크인 알림 (고객 → 점주)
 * 고객이 QR/예약번호로 체크인하면 점주에게 실시간 알림
 */
function emitCheckin(io, restaurantId, data) {
  io.to(`restaurant:${restaurantId}`).emit('reservation:checkin', {
    reservationId: data.reservationId,
    userId: data.userId,
    userName: data.userName,
    partySize: data.partySize,
    checkedInAt: new Date().toISOString(),
    ...data,
  });
  logger.debug(`${LOG_PREFIX} 체크인 이벤트 전송`, {
    restaurantId,
    reservationId: data.reservationId,
  });
}

module.exports = {
  setupReservationSocket,
  emitStatusUpdate,
  emitArrivalUpdate,
  emitCookingUpdate,
  emitCheckin,
};
