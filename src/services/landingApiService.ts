import apiClient from './apiClient';

// 가짜문(Fake Door) 검증 — 퍼널 이벤트 추적 + 베타 신청 (공개 API, 인증 없음)

const SESSION_KEY = 'fakedoor_session_id';

/** 브라우저별 세션 ID (localStorage, 퍼널 추적용) */
export const getSessionId = (): string => {
  try {
    let id = localStorage.getItem(SESSION_KEY);
    if (!id) {
      id = `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return `s_${Date.now().toString(36)}`;
  }
};

export type FunnelStep =
  | 'landing_view' | 'menu_view' | 'add_to_cart'
  | 'reservation_intent' | 'payment_click' | 'lead_submit';

/** 퍼널 이벤트 전송 — 실패해도 무해(fire-and-forget) */
export const track = (
  step: FunnelStep,
  opts?: { restaurantRef?: string; variant?: string; metadata?: Record<string, any> },
): void => {
  apiClient
    .post('/api/landing/event', {
      session_id: getSessionId(),
      step,
      restaurant_ref: opts?.restaurantRef,
      variant: opts?.variant,
      metadata: opts?.metadata,
    })
    .catch(() => {});
};

export interface LeadPayload {
  contact: string;
  contactType?: 'email' | 'phone' | 'kakao';
  restaurantRef?: string;
  variant?: string;
  note?: string;
}

/** 베타 신청(연락처) 제출 */
export const submitLead = async (payload: LeadPayload): Promise<string> => {
  const res = await apiClient.post('/api/landing/lead', {
    session_id: getSessionId(),
    contact: payload.contact,
    contact_type: payload.contactType || 'email',
    restaurant_ref: payload.restaurantRef,
    variant: payload.variant,
    note: payload.note,
  });
  return res.data?.message || '신청이 완료되었습니다.';
};

export default { getSessionId, track, submitLead };
