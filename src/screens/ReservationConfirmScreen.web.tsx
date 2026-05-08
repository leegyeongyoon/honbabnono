import React, { useEffect, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { useNavigate, useParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { COLORS, CSS_SHADOWS, CARD_STYLE } from '../styles/colors';
import { BORDER_RADIUS } from '../styles/spacing';
import useReservationStore from '../store/reservationStore';
import { QRCodeSVG } from 'qrcode.react';

// ============================================================
// ReservationConfirmScreen — 잇테이블 v2 예약 확정
// ============================================================

const ReservationConfirmScreen: React.FC = () => {
  const navigate = useNavigate();
  const { reservationId } = useParams<{ reservationId: string }>();
  const reservationStore = useReservationStore();
  const [loading, setLoading] = useState(true);

  const reservation = reservationStore.currentReservation;

  useEffect(() => {
    if (!reservationId) return;
    reservationStore
      .fetchReservationById(reservationId)
      .finally(() => setLoading(false));
  }, [reservationId]);

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
        {/* 성공 아이콘 */}
        <div style={s.successSection}>
          <div style={s.checkCircle}>
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
              <circle cx="20" cy="20" r="20" fill={COLORS.functional.success} />
              <path
                d="M12 20L18 26L28 14"
                stroke="#FFFFFF"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div style={s.successTitle}>예약이 확정되었습니다!</div>
          <div style={s.successSubtitle}>
            매장에서 맛있는 식사를 즐겨보세요.
          </div>
        </div>

        {/* 예약 정보 카드 */}
        {reservation && (
          <div style={s.infoCard}>
            <div style={s.cardTitle}>예약 정보</div>

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

            {/* QR 코드 영역 */}
            {reservation.qrCode && (
              <div style={s.qrSection}>
                <div style={s.qrLabel}>체크인 QR 코드</div>
                <div style={s.qrBox}>
                  <QRCodeSVG
                    value={reservation.qrCode}
                    size={160}
                    level="M"
                    bgColor="#FFFFFF"
                    fgColor="#121212"
                  />
                  <div style={s.qrHint}>
                    매장 도착 시 이 코드를 보여주세요.
                  </div>
                </div>
              </div>
            )}

            {/* 주문 메뉴 */}
            {reservation.order?.items && reservation.order.items.length > 0 && (
              <div style={s.menuSection}>
                <div style={s.menuSectionTitle}>주문 메뉴</div>
                {reservation.order.items.map((item: any, idx: number) => (
                  <div key={idx} style={s.menuRow}>
                    <span>{item.menu_name || item.menuName || item.name} x{item.quantity}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 안내 */}
        <div style={s.noticeBox}>
          <div style={s.noticeIcon}>
            <Icon name="bell" size={16} color={COLORS.primary.main} />
          </div>
          <div style={s.noticeText}>
            예약 시간 30분 전에 도착 알림을 보내드립니다.
          </div>
        </div>

        {/* 버튼 */}
        <div style={s.buttonGroup}>
          <div
            style={s.primaryButton}
            onClick={() => navigate('/my-reservations')}
          >
            예약 내역 보기
          </div>
          <div
            style={s.secondaryButton}
            onClick={() => navigate('/')}
          >
            홈으로
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
  container: { maxWidth: 480, margin: '0 auto', padding: '0 20px' },
  loadingWrap: { display: 'flex', justifyContent: 'center', paddingTop: 120 },

  // 성공 영역
  successSection: {
    display: 'flex', flexDirection: 'column' as const,
    alignItems: 'center', paddingTop: 60, paddingBottom: 32,
  },
  checkCircle: { marginBottom: 20 },
  successTitle: {
    fontSize: 22, fontWeight: 700, color: COLORS.text.primary,
    fontFamily: FONT, marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 14, color: COLORS.text.tertiary, fontFamily: FONT,
  },

  // 정보 카드
  infoCard: {
    borderRadius: CARD_STYLE.borderRadius, border: `1px solid ${CARD_STYLE.borderColor}`,
    padding: 20, backgroundColor: '#FFFFFF', boxShadow: CSS_SHADOWS.card,
  },
  cardTitle: {
    fontSize: 15, fontWeight: 700, color: COLORS.text.primary,
    fontFamily: FONT, marginBottom: 14,
    paddingBottom: 10, borderBottom: '1px solid rgba(17,17,17,0.06)',
  },
  infoRow: {
    display: 'flex', justifyContent: 'space-between', padding: '7px 0',
    fontSize: 14, fontFamily: FONT,
  },
  infoLabel: { color: COLORS.text.tertiary },
  infoValue: { color: COLORS.text.primary, fontWeight: 500 },

  // QR
  qrSection: {
    marginTop: 16, paddingTop: 16,
    borderTop: '1px solid rgba(17,17,17,0.06)',
  },
  qrLabel: {
    fontSize: 13, fontWeight: 600, color: COLORS.text.secondary,
    fontFamily: FONT, marginBottom: 10,
  },
  qrBox: {
    padding: 24, borderRadius: BORDER_RADIUS.md,
    backgroundColor: '#FFFFFF', textAlign: 'center' as const,
    display: 'flex', flexDirection: 'column' as const,
    alignItems: 'center', gap: 12,
    border: '1px solid rgba(17,17,17,0.08)',
  },
  qrHint: { fontSize: 12, color: COLORS.text.tertiary, fontFamily: FONT },

  // 메뉴
  menuSection: { marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(17,17,17,0.06)' },
  menuSectionTitle: { fontSize: 13, fontWeight: 600, color: COLORS.text.secondary, fontFamily: FONT, marginBottom: 8 },
  menuRow: { fontSize: 14, color: COLORS.text.primary, fontFamily: FONT, padding: '4px 0' },

  // 안내
  noticeBox: {
    display: 'flex', alignItems: 'center', gap: 10,
    marginTop: 16, padding: '12px 16px',
    backgroundColor: COLORS.primary.light,
    borderRadius: BORDER_RADIUS.md,
  },
  noticeIcon: { flexShrink: 0 },
  noticeText: { fontSize: 13, color: COLORS.text.secondary, fontFamily: FONT, lineHeight: '1.4' },

  // 버튼
  buttonGroup: {
    display: 'flex', flexDirection: 'column' as const, gap: 10,
    marginTop: 24,
  },
  primaryButton: {
    width: '100%', padding: '14px 0', borderRadius: BORDER_RADIUS.md,
    background: `linear-gradient(135deg, ${COLORS.primary.main} 0%, ${COLORS.primary.gradient} 100%)`,
    color: '#FFFFFF', fontSize: 15, fontWeight: 700, textAlign: 'center' as const,
    fontFamily: FONT, cursor: 'pointer', boxShadow: CSS_SHADOWS.cta,
    boxSizing: 'border-box' as const,
  },
  secondaryButton: {
    width: '100%', padding: '14px 0', borderRadius: BORDER_RADIUS.md,
    backgroundColor: '#FFFFFF', border: `1px solid ${COLORS.neutral.grey200}`,
    color: COLORS.text.secondary, fontSize: 15, fontWeight: 600,
    textAlign: 'center' as const, fontFamily: FONT, cursor: 'pointer',
    boxSizing: 'border-box' as const,
  },
};

export default ReservationConfirmScreen;
