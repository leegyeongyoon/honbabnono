import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { getApiBaseUrl } from '../services/apiClient';

// ============================================================
// useReservationSocket — 예약/주문 실시간 상태 구독 (잇테이블 v2)
//
// 서버 io.use가 handshake.auth.token JWT를 검증하므로 반드시 토큰을 전달해야 한다
// (useNotifications의 익명 연결 패턴을 복사하면 인증 거부됨).
// join_reservation 룸에 참가해 reservation:statusUpdate / order:cookingUpdate 수신.
// ============================================================

interface Handlers {
  onStatusUpdate?: (data: { reservationId: string; status: string; previousStatus?: string }) => void;
  onCookingUpdate?: (data: { reservationId: string; orderId: string; cookingStatus: string }) => void;
}

/** API base URL(…/api)에서 소켓 호스트 추출 */
const getSocketUrl = (): string => getApiBaseUrl().replace(/\/api\/?$/, '');

const useReservationSocket = (
  reservationIds: string[] | string | null | undefined,
  handlers: Handlers,
) => {
  // 핸들러는 ref로 — 재연결 없이 최신 콜백 사용
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  const ids = Array.isArray(reservationIds)
    ? reservationIds
    : reservationIds ? [reservationIds] : [];
  const idsKey = ids.join(',');

  useEffect(() => {
    if (ids.length === 0) return;

    let socket: Socket | null = null;
    let cancelled = false;

    (async () => {
      // 토큰 취득 (web: localStorage)
      let token: string | null = null;
      try {
        token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
      } catch {
        token = null;
      }
      if (!token || cancelled) return;

      socket = io(getSocketUrl(), {
        transports: ['websocket', 'polling'],
        auth: { token },
      });

      socket.on('connect', () => {
        ids.forEach((id) => socket?.emit('join_reservation', id));
      });

      socket.on('reservation:statusUpdate', (data: any) => {
        handlersRef.current.onStatusUpdate?.(data);
      });

      socket.on('order:cookingUpdate', (data: any) => {
        handlersRef.current.onCookingUpdate?.(data);
      });
    })();

    return () => {
      cancelled = true;
      if (socket) {
        ids.forEach((id) => socket?.emit('leave_reservation', id));
        socket.disconnect();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey]);
};

export default useReservationSocket;
