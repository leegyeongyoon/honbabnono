import React, { useState, useEffect, useCallback } from 'react';
import { ActivityIndicator } from 'react-native';
import { useNavigate, useParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { COLORS, CSS_SHADOWS, CARD_STYLE } from '../styles/colors';
import { BORDER_RADIUS } from '../styles/spacing';
import restaurantApiService, { Restaurant, TimeSlot } from '../services/restaurantApiService';
import useCartStore from '../store/cartStore';
import useReservationStore from '../store/reservationStore';

// ============================================================
// ReservationFormScreen — 잇테이블 v2 예약 폼
// ============================================================

const ReservationFormScreen: React.FC = () => {
  const navigate = useNavigate();
  const { restaurantId } = useParams<{ restaurantId: string }>();
  const cartStore = useCartStore();
  const reservationStore = useReservationStore();

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // 폼 상태
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [partySize, setPartySize] = useState(2);
  const [specialRequest, setSpecialRequest] = useState('');
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // 오늘~30일 후 날짜 범위
  const today = new Date();
  const minDate = today.toISOString().split('T')[0];
  const maxDate = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  useEffect(() => {
    if (!restaurantId) return;
    restaurantApiService
      .getRestaurantById(restaurantId)
      .then(setRestaurant)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [restaurantId]);

  useEffect(() => {
    if (!restaurantId || !selectedDate) return;
    setLoadingSlots(true);
    setSelectedTime('');
    restaurantApiService
      .getTimeSlots(restaurantId, selectedDate)
      .then((slots) => setTimeSlots(Array.isArray(slots) ? slots : []))
      .catch(() => setTimeSlots([]))
      .finally(() => setLoadingSlots(false));
  }, [restaurantId, selectedDate]);

  const formatPrice = (n: number) => n.toLocaleString('ko-KR');
  // 현재 매장 장바구니만 사용
  const isCurrentCart = restaurantId && cartStore.restaurantId === restaurantId;
  const totalAmount = isCurrentCart ? cartStore.totalAmount : 0;

  const handleSubmit = useCallback(async () => {
    if (!restaurantId || !selectedDate || !selectedTime || submitting) return;
    setSubmitting(true);
    try {
      const reservationId = await reservationStore.createReservation({
        restaurantId,
        reservationDate: selectedDate,
        reservationTime: selectedTime,
        partySize,
        specialRequest: specialRequest.trim() || undefined,
      });
      navigate(`/payment/${reservationId}`);
    } catch (err: any) {
      alert(err.message || '예약 생성에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  }, [restaurantId, selectedDate, selectedTime, partySize, specialRequest, submitting, reservationStore, navigate]);

  const canSubmit = selectedDate && selectedTime && partySize > 0 && !submitting;

  if (loading) {
    return (
      <div style={s.wrapper}>
        <div style={s.container}>
          <div style={s.loadingWrap}>
            <ActivityIndicator size="large" color={COLORS.primary.main} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={s.wrapper}>
      <div style={s.container}>
        {/* 헤더 */}
        <div style={s.header}>
          <div style={s.backBtn} onClick={() => navigate(-1)}>
            <Icon name="arrow-left" size={20} color={COLORS.text.primary} />
          </div>
          <div style={s.headerTitle}>예약하기</div>
          <div style={{ width: 36 }} />
        </div>

        {/* 매장 요약 */}
        {restaurant && (
          <div style={s.restaurantSummary}>
            <div style={s.restaurantName}>{restaurant.name}</div>
            {restaurant.category && (
              <span style={s.categoryChip}>{restaurant.category}</span>
            )}
          </div>
        )}

        {/* 날짜 선택 */}
        <div style={s.section}>
          <div style={s.label}>날짜</div>
          <input
            type="date"
            value={selectedDate}
            min={minDate}
            max={maxDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={s.dateInput}
          />
        </div>

        {/* 시간 선택 */}
        <div style={s.section}>
          <div style={s.label}>시간</div>
          {!selectedDate ? (
            <div style={s.hintText}>날짜를 먼저 선택해주세요.</div>
          ) : loadingSlots ? (
            <ActivityIndicator size="small" color={COLORS.primary.main} />
          ) : timeSlots.length === 0 ? (
            <div style={s.hintText}>예약 가능한 시간이 없습니다.</div>
          ) : (
            <div style={s.slotGrid}>
              {timeSlots.map((slot) => (
                <div
                  key={slot.time}
                  onClick={() => slot.available && setSelectedTime(slot.time)}
                  style={{
                    ...s.slotButton,
                    backgroundColor:
                      selectedTime === slot.time
                        ? COLORS.primary.main
                        : slot.available
                        ? '#FFFFFF'
                        : COLORS.neutral.light,
                    color:
                      selectedTime === slot.time
                        ? '#FFFFFF'
                        : slot.available
                        ? COLORS.text.primary
                        : COLORS.text.tertiary,
                    cursor: slot.available ? 'pointer' : 'not-allowed',
                    borderColor:
                      selectedTime === slot.time
                        ? COLORS.primary.main
                        : 'rgba(17,17,17,0.1)',
                  }}
                >
                  {slot.time}
                  {slot.remainingSeats != null && (
                    <span style={{ fontSize: 10, display: 'block' }}>
                      {slot.remainingSeats}석
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 인원 선택 */}
        <div style={s.section}>
          <div style={s.label}>인원</div>
          <div style={s.partySizeRow}>
            <div
              style={{
                ...s.pmButton,
                opacity: partySize <= 1 ? 0.3 : 1,
                cursor: partySize <= 1 ? 'not-allowed' : 'pointer',
              }}
              onClick={() => partySize > 1 && setPartySize(partySize - 1)}
            >
              -
            </div>
            <span style={s.partySizeText}>{partySize}명</span>
            <div
              style={{
                ...s.pmButton,
                opacity: partySize >= 20 ? 0.3 : 1,
                cursor: partySize >= 20 ? 'not-allowed' : 'pointer',
              }}
              onClick={() => partySize < 20 && setPartySize(partySize + 1)}
            >
              +
            </div>
          </div>
        </div>

        {/* 장바구니 요약 */}
        {isCurrentCart && cartStore.items.length > 0 && (
          <div style={s.section}>
            <div style={s.label}>선택 메뉴</div>
            <div style={s.cartList}>
              {cartStore.items.map((item) => (
                <div key={item.menuId} style={s.cartItem}>
                  <span style={s.cartItemName}>
                    {item.menuName} x{item.quantity}
                  </span>
                  <span style={s.cartItemPrice}>
                    {formatPrice(item.subtotal)}원
                  </span>
                </div>
              ))}
              <div style={s.cartTotal}>
                <span>총액</span>
                <span style={s.cartTotalPrice}>
                  {formatPrice(totalAmount)}원
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 요청사항 */}
        <div style={s.section}>
          <div style={s.label}>요청사항 (선택)</div>
          <textarea
            placeholder="알레르기, 특별 요청 등을 적어주세요"
            value={specialRequest}
            onChange={(e) => setSpecialRequest(e.target.value)}
            style={s.textarea}
            rows={3}
          />
        </div>

        {/* 결제 버튼 */}
        <div style={s.submitSection}>
          <div
            onClick={canSubmit ? handleSubmit : undefined}
            style={{
              ...s.submitButton,
              opacity: canSubmit ? 1 : 0.5,
              cursor: canSubmit ? 'pointer' : 'not-allowed',
            }}
          >
            {submitting ? '처리 중...' : '결제하기'}
          </div>
        </div>

        <div style={{ height: 40 }} />
      </div>
    </div>
  );
};

// ── Styles ──

const FONT = '"Pretendard Variable", Pretendard, system-ui, -apple-system, sans-serif';

const s: Record<string, React.CSSProperties> = {
  wrapper: { minHeight: '100vh', backgroundColor: COLORS.neutral.background },
  container: { maxWidth: 480, margin: '0 auto' },
  loadingWrap: { display: 'flex', justifyContent: 'center', paddingTop: 120 },

  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '16px 20px 12px', backgroundColor: '#FFFFFF',
    borderBottom: '1px solid rgba(17,17,17,0.06)',
  },
  backBtn: { width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  headerTitle: { fontSize: 18, fontWeight: 600, color: COLORS.text.primary, fontFamily: FONT },

  restaurantSummary: {
    padding: '16px 20px', borderBottom: '1px solid rgba(17,17,17,0.06)',
    display: 'flex', alignItems: 'center', gap: 10,
  },
  restaurantName: { fontSize: 16, fontWeight: 700, color: COLORS.text.primary, fontFamily: FONT },
  categoryChip: {
    fontSize: 12, fontWeight: 600, padding: '2px 10px', borderRadius: BORDER_RADIUS.pill,
    backgroundColor: COLORS.secondary.light, color: COLORS.text.secondary, fontFamily: FONT,
  },

  section: { padding: '20px 20px 0' },
  label: { fontSize: 14, fontWeight: 600, color: COLORS.text.primary, fontFamily: FONT, marginBottom: 10 },
  hintText: { fontSize: 13, color: COLORS.text.tertiary, fontFamily: FONT },

  dateInput: {
    width: '100%', padding: '10px 14px', borderRadius: BORDER_RADIUS.md,
    border: '1px solid rgba(17,17,17,0.1)', fontSize: 14, fontFamily: FONT,
    color: COLORS.text.primary, backgroundColor: '#FFFFFF',
    boxSizing: 'border-box' as const,
  },

  slotGrid: { display: 'flex', flexWrap: 'wrap' as const, gap: 8 },
  slotButton: {
    padding: '8px 14px', borderRadius: BORDER_RADIUS.md,
    border: '1px solid rgba(17,17,17,0.1)', fontSize: 13, fontWeight: 500,
    textAlign: 'center' as const, fontFamily: FONT, transition: 'all 150ms',
    minWidth: 64,
  },

  partySizeRow: { display: 'flex', alignItems: 'center', gap: 20 },
  pmButton: {
    width: 36, height: 36, borderRadius: 18, display: 'flex',
    alignItems: 'center', justifyContent: 'center',
    border: `1px solid ${COLORS.neutral.grey200}`, backgroundColor: '#FFFFFF',
    fontSize: 18, fontWeight: 600, fontFamily: FONT, color: COLORS.text.primary,
  },
  partySizeText: { fontSize: 18, fontWeight: 700, color: COLORS.text.primary, fontFamily: FONT, minWidth: 48, textAlign: 'center' as const },

  cartList: {
    borderRadius: CARD_STYLE.borderRadius, border: `1px solid ${CARD_STYLE.borderColor}`,
    padding: 14, backgroundColor: '#FFFFFF',
  },
  cartItem: {
    display: 'flex', justifyContent: 'space-between', padding: '6px 0',
    fontSize: 13, fontFamily: FONT,
  },
  cartItemName: { color: COLORS.text.primary },
  cartItemPrice: { color: COLORS.text.secondary, fontWeight: 600 },
  cartTotal: {
    display: 'flex', justifyContent: 'space-between', padding: '10px 0 0',
    borderTop: '1px solid rgba(17,17,17,0.06)', marginTop: 8,
    fontSize: 15, fontWeight: 700, color: COLORS.text.primary, fontFamily: FONT,
  },
  cartTotalPrice: { color: COLORS.primary.main },

  textarea: {
    width: '100%', padding: '10px 14px', borderRadius: BORDER_RADIUS.md,
    border: '1px solid rgba(17,17,17,0.1)', fontSize: 14, fontFamily: FONT,
    color: COLORS.text.primary, resize: 'vertical' as const,
    boxSizing: 'border-box' as const,
  } as any,

  submitSection: { padding: '24px 20px 0' },
  submitButton: {
    width: '100%', padding: '14px 0', borderRadius: BORDER_RADIUS.md,
    background: `linear-gradient(135deg, ${COLORS.primary.main} 0%, ${COLORS.primary.gradient} 100%)`,
    color: '#FFFFFF', fontSize: 16, fontWeight: 700, textAlign: 'center' as const,
    fontFamily: FONT, boxShadow: CSS_SHADOWS.cta, transition: 'all 200ms',
    boxSizing: 'border-box' as const,
  },
};

export default ReservationFormScreen;
