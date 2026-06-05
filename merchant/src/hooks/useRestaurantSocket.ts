import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import getRestaurantId from '../utils/getRestaurantId';

// ── 수신 이벤트 페이로드 타입 ──────────────────────────────────
export interface NewReservationPayload {
  reservationId: string;
  customerName: string;
  reservationDate: string;
  reservationTime: string;
  partySize: number;
  amount?: number;
}

export interface CancelledPayload {
  reservationId: string;
}

export interface CheckinPayload {
  reservationId: string;
  userName: string;
  partySize: number;
}

export interface ArrivalPayload {
  reservationId: string;
  arrivalStatus: string;
}

export interface RestaurantSocketHandlers {
  onNewReservation?: (payload: NewReservationPayload) => void;
  onCancelled?: (payload: CancelledPayload) => void;
  onCheckin?: (payload: CheckinPayload) => void;
  onArrival?: (payload: ArrivalPayload) => void;
}

const getSocketUrl = (): string => {
  if (typeof window === 'undefined') return 'http://localhost:3001';
  return window.location.hostname === 'localhost'
    ? 'http://localhost:3001'
    : window.location.origin;
};

/**
 * 매장 실시간 소켓 연결 훅.
 *
 * - merchantToken으로 인증(io auth.token), getRestaurantId()로 룸 join
 * - 핸들러는 ref로 최신값 유지 → 핸들러가 매 렌더 바뀌어도 소켓 재연결하지 않음
 * - 언마운트 시 leave_restaurant + disconnect
 */
export function useRestaurantSocket(handlers: RestaurantSocketHandlers): void {
  const handlersRef = useRef<RestaurantSocketHandlers>(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    const token = localStorage.getItem('merchantToken');
    const restaurantId = getRestaurantId();
    if (!token || !restaurantId) return;

    const socket: Socket = io(getSocketUrl(), {
      auth: { token },
    });

    const handleConnect = () => {
      socket.emit('join_restaurant', restaurantId);
    };

    socket.on('connect', handleConnect);

    socket.on('reservation:new', (payload: NewReservationPayload) => {
      handlersRef.current.onNewReservation?.(payload);
    });
    socket.on('reservation:cancelled', (payload: CancelledPayload) => {
      handlersRef.current.onCancelled?.(payload);
    });
    socket.on('reservation:checkin', (payload: CheckinPayload) => {
      handlersRef.current.onCheckin?.(payload);
    });
    socket.on('reservation:arrivalUpdate', (payload: ArrivalPayload) => {
      handlersRef.current.onArrival?.(payload);
    });

    return () => {
      try {
        socket.emit('leave_restaurant', restaurantId);
      } catch {
        /* ignore */
      }
      socket.off('connect', handleConnect);
      socket.disconnect();
    };
    // 의존성 없음: 마운트 시 1회 연결, 언마운트 시 정리.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

export default useRestaurantSocket;
