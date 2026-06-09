const { z } = require('zod');

// 퍼널 단계 — 측정 설계와 일치
const FUNNEL_STEPS = [
  'landing_view',
  'menu_view',
  'add_to_cart',
  'reservation_intent',
  'payment_click',
  'lead_submit',
];

const trackEventSchema = z.object({
  session_id: z.string().min(8).max(64),
  step: z.enum(FUNNEL_STEPS),
  restaurant_ref: z.string().max(40).optional(),
  variant: z.string().max(40).optional(),
  metadata: z.record(z.any()).optional(),
});

const submitLeadSchema = z.object({
  session_id: z.string().min(8).max(64).optional(),
  contact: z.string().min(3, '연락처를 입력해주세요.').max(255),
  contact_type: z.enum(['email', 'phone', 'kakao']).optional(),
  restaurant_ref: z.string().max(40).optional(),
  variant: z.string().max(40).optional(),
  note: z.string().max(500).optional(),
});

module.exports = { trackEventSchema, submitLeadSchema, FUNNEL_STEPS };
