import React, { useState, useEffect, useCallback } from 'react';
import { ActivityIndicator } from 'react-native';
import { useNavigate, useParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { COLORS, CSS_SHADOWS, CARD_STYLE } from '../styles/colors';
import { BORDER_RADIUS } from '../styles/spacing';
import restaurantApiService from '../services/restaurantApiService';
import useCartStore from '../store/cartStore';
import useReservationStore from '../store/reservationStore';
import usePaymentStore from '../store/paymentStore';
import { useUserStore } from '../store/userStore';

// ============================================================
// PaymentScreen — 잇테이블 v2 선결제
// ============================================================

// PortOne (iamport) SDK
declare global {
  interface Window {
    IMP?: {
      init: (storeId: string) => void;
      request_pay: (params: any, callback: (response: any) => void) => void;
    };
  }
}

type PaymentMethod = 'card' | 'kakao' | 'points';

const IMP_STORE_ID = process.env.REACT_APP_IMP_STORE_ID || '';

const PaymentScreen: React.FC = () => {
  const navigate = useNavigate();
  const { reservationId } = useParams<{ reservationId: string }>();
  const cartStore = useCartStore();
  const reservationStore = useReservationStore();
  const paymentStore = usePaymentStore();
  const currentUser = useUserStore((state) => state.user);

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('card');
  const [impReady, setImpReady] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const reservation = reservationStore.currentReservation;

  // 장바구니가 현재 예약의 매장과 일치하는지 검증
  const isCartValid = reservation && cartStore.restaurantId === reservation.restaurantId;
  const totalAmount = isCartValid ? cartStore.totalAmount : 0;
  const items = isCartValid ? cartStore.items : [];

  // PortOne SDK 로드
  useEffect(() => {
    if (window.IMP) {
      window.IMP.init(IMP_STORE_ID);
      setImpReady(true);
      return;
    }
    const existing = document.querySelector('script[src="https://cdn.iamport.kr/v1/iamport.js"]');
    if (existing) {
      existing.addEventListener('load', () => {
        window.IMP?.init(IMP_STORE_ID);
        setImpReady(true);
      });
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdn.iamport.kr/v1/iamport.js';
    script.onload = () => {
      window.IMP?.init(IMP_STORE_ID);
      setImpReady(true);
    };
    document.body.appendChild(script);
  }, []);

  // 예약 정보 로드
  useEffect(() => {
    if (!reservationId) return;
    reservationStore
      .fetchReservationById(reservationId)
      .finally(() => setLoading(false));
  }, [reservationId]);

  const formatPrice = (n: number) => n.toLocaleString('ko-KR');

  const handlePayment = useCallback(async () => {
    if (!reservationId || processing) return;
    if (totalAmount <= 0 || items.length === 0) {
      setErrorMsg('주문할 메뉴가 없습니다. 매장에서 메뉴를 선택해주세요.');
      return;
    }
    setProcessing(true);
    setErrorMsg('');

    try {
      // 1. 주문 생성
      const orderItems = items.map((item) => ({
        menuId: item.menuId,
        quantity: item.quantity,
        options: item.options,
      }));
      const order = await restaurantApiService.createOrder(reservationId, orderItems);

      // 2. 결제 준비
      const paymentData = await paymentStore.preparePayment(
        reservationId,
        totalAmount,
        selectedMethod,
      );

      // 3. 포인트 결제는 서버에서 즉시 처리
      if (selectedMethod === 'points') {
        cartStore.clearCart();
        navigate(`/reservation-confirm/${reservationId}`);
        return;
      }

      // 4. PortOne 결제
      if (!window.IMP) {
        setErrorMsg('결제 모듈을 불러올 수 없습니다. 페이지를 새로고침해주세요.');
        setProcessing(false);
        return;
      }

      const merchantUid = paymentData.merchantUid ?? paymentData.merchant_uid ?? `order_${Date.now()}`;

      window.IMP.request_pay(
        {
          pg: selectedMethod === 'kakao' ? 'kakaopay' : 'html5_inicis',
          pay_method: selectedMethod === 'kakao' ? 'kakaopay' : 'card',
          merchant_uid: merchantUid,
          name: reservation?.restaurantName
            ? `${reservation.restaurantName} 예약 결제`
            : '잇테이블 예약 결제',
          amount: totalAmount,
          buyer_name: currentUser?.name || '잇테이블 사용자',
          buyer_email: currentUser?.email || '',
        },
        async (response: any) => {
          if (response.success) {
            try {
              // 5. 결제 검증
              await paymentStore.verifyPayment(response.imp_uid, merchantUid);
              cartStore.clearCart();
              navigate(`/reservation-confirm/${reservationId}`);
            } catch {
              setErrorMsg('결제 검증에 실패했습니다. 고객센터에 문의해주세요.');
            }
          } else {
            setErrorMsg(response.error_msg || '결제가 취소되었습니다.');
          }
          setProcessing(false);
        },
      );
    } catch (err: any) {
      setErrorMsg(err.message || '결제 처리 중 오류가 발생했습니다.');
      setProcessing(false);
    }
  }, [reservationId, processing, items, totalAmount, selectedMethod, reservation, paymentStore, cartStore, navigate]);

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
          <div style={s.headerTitle}>결제</div>
          <div style={{ width: 36 }} />
        </div>

        {/* 예약 정보 요약 */}
        <div style={s.section}>
          <div style={s.sectionTitle}>예약 정보</div>
          <div style={s.infoCard}>
            {reservation && (
              <>
                <div style={s.infoRow}>
                  <span style={s.infoLabel}>매장</span>
                  <span style={s.infoValue}>{reservation.restaurantName || '-'}</span>
                </div>
                <div style={s.infoRow}>
                  <span style={s.infoLabel}>날짜</span>
                  <span style={s.infoValue}>{reservation.reservationDate}</span>
                </div>
                <div style={s.infoRow}>
                  <span style={s.infoLabel}>시간</span>
                  <span style={s.infoValue}>{reservation.reservationTime}</span>
                </div>
                <div style={s.infoRow}>
                  <span style={s.infoLabel}>인원</span>
                  <span style={s.infoValue}>{reservation.partySize}명</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* 메뉴 목록 */}
        {items.length > 0 && (
          <div style={s.section}>
            <div style={s.sectionTitle}>주문 메뉴</div>
            <div style={s.infoCard}>
              {items.map((item) => (
                <div key={item.menuId} style={s.menuRow}>
                  <span>{item.menuName} x{item.quantity}</span>
                  <span style={s.menuPrice}>{formatPrice(item.subtotal)}원</span>
                </div>
              ))}
              <div style={s.totalRow}>
                <span>총 결제금액</span>
                <span style={s.totalPrice}>{formatPrice(totalAmount)}원</span>
              </div>
            </div>
          </div>
        )}

        {/* 결제 수단 */}
        <div style={s.section}>
          <div style={s.sectionTitle}>결제 수단</div>
          <div style={s.methodList}>
            {([
              { key: 'card' as const, label: '신용/체크카드', icon: '💳' },
              { key: 'kakao' as const, label: '카카오페이', icon: '💛' },
              { key: 'points' as const, label: '포인트 결제', icon: '🪙' },
            ]).map((method) => (
              <div
                key={method.key}
                onClick={() => setSelectedMethod(method.key)}
                style={{
                  ...s.methodItem,
                  borderColor:
                    selectedMethod === method.key
                      ? COLORS.primary.main
                      : 'rgba(17,17,17,0.1)',
                  backgroundColor:
                    selectedMethod === method.key
                      ? COLORS.primary.light
                      : '#FFFFFF',
                }}
              >
                <span style={{ fontSize: 20, marginRight: 10 }}>{method.icon}</span>
                <span style={s.methodLabel}>{method.label}</span>
                <div
                  style={{
                    ...s.radio,
                    borderColor:
                      selectedMethod === method.key
                        ? COLORS.primary.main
                        : COLORS.neutral.grey300,
                  }}
                >
                  {selectedMethod === method.key && <div style={s.radioInner} />}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 에러 메시지 */}
        {errorMsg && (
          <div style={s.errorBox}>
            <span style={s.errorText}>{errorMsg}</span>
          </div>
        )}

        {/* 결제 버튼 */}
        <div style={s.submitSection}>
          <div
            onClick={!processing ? handlePayment : undefined}
            style={{
              ...s.submitButton,
              opacity: processing ? 0.6 : 1,
              cursor: processing ? 'not-allowed' : 'pointer',
            }}
          >
            {processing ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              `${formatPrice(totalAmount)}원 결제하기`
            )}
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

  section: { padding: '20px 20px 0' },
  sectionTitle: { fontSize: 15, fontWeight: 700, color: COLORS.text.primary, fontFamily: FONT, marginBottom: 12 },

  infoCard: {
    borderRadius: CARD_STYLE.borderRadius, border: `1px solid ${CARD_STYLE.borderColor}`,
    padding: 16, backgroundColor: '#FFFFFF',
  },
  infoRow: {
    display: 'flex', justifyContent: 'space-between', padding: '6px 0',
    fontSize: 14, fontFamily: FONT,
  },
  infoLabel: { color: COLORS.text.tertiary },
  infoValue: { color: COLORS.text.primary, fontWeight: 500 },

  menuRow: {
    display: 'flex', justifyContent: 'space-between', padding: '6px 0',
    fontSize: 14, fontFamily: FONT, color: COLORS.text.primary,
  },
  menuPrice: { fontWeight: 600, color: COLORS.text.secondary },
  totalRow: {
    display: 'flex', justifyContent: 'space-between', padding: '12px 0 0',
    borderTop: '1px solid rgba(17,17,17,0.06)', marginTop: 8,
    fontSize: 16, fontWeight: 700, fontFamily: FONT, color: COLORS.text.primary,
  },
  totalPrice: { color: COLORS.primary.main },

  methodList: { display: 'flex', flexDirection: 'column' as const, gap: 10 },
  methodItem: {
    display: 'flex', alignItems: 'center', padding: '14px 16px',
    borderRadius: CARD_STYLE.borderRadius, border: '2px solid rgba(17,17,17,0.1)',
    cursor: 'pointer', transition: 'all 150ms',
  },
  methodLabel: { flex: 1, fontSize: 14, fontWeight: 500, color: COLORS.text.primary, fontFamily: FONT },
  radio: {
    width: 20, height: 20, borderRadius: 10, border: '2px solid',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.primary.main },

  errorBox: {
    margin: '16px 20px 0', padding: '12px 16px',
    backgroundColor: COLORS.functional.errorLight,
    borderRadius: BORDER_RADIUS.md,
  },
  errorText: { fontSize: 13, color: COLORS.functional.error, fontFamily: FONT },

  submitSection: { padding: '24px 20px 0' },
  submitButton: {
    width: '100%', padding: '14px 0', borderRadius: BORDER_RADIUS.md,
    background: `linear-gradient(135deg, ${COLORS.primary.main} 0%, ${COLORS.primary.gradient} 100%)`,
    color: '#FFFFFF', fontSize: 16, fontWeight: 700, textAlign: 'center' as const,
    fontFamily: FONT, boxShadow: CSS_SHADOWS.cta, transition: 'all 200ms',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxSizing: 'border-box' as const,
  },
};

export default PaymentScreen;
