import React, { useState, useEffect, useCallback } from 'react';
import { ActivityIndicator } from 'react-native';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { COLORS, CSS_SHADOWS, CARD_STYLE, TRANSITIONS } from '../styles/colors';
import { SPACING, BORDER_RADIUS, HEADER_STYLE } from '../styles/spacing';
import useReservationStore, { Reservation } from '../store/reservationStore';

// ============================================================
// MyReservationsScreen — 잇테이블 v2 내 예약 목록
// ============================================================

type TabKey = 'active' | 'completed' | 'cancelled';

const ACTIVE_STATUSES = ['pending_payment', 'confirmed', 'preparing', 'ready', 'seated'];
const COMPLETED_STATUSES = ['completed'];
const CANCELLED_STATUSES = ['cancelled'];

const STATUS_LABELS: Record<string, { text: string; color: string; bg: string }> = {
  pending_payment: { text: '결제 대기', color: COLORS.functional.warning, bg: COLORS.functional.warningLight },
  confirmed: { text: '예약 확정', color: COLORS.functional.success, bg: COLORS.functional.successLight },
  preparing: { text: '준비중', color: COLORS.functional.info, bg: COLORS.functional.infoLight },
  ready: { text: '준비 완료', color: COLORS.functional.success, bg: COLORS.functional.successLight },
  seated: { text: '착석', color: COLORS.special.premium, bg: '#F2F0F6' },
  completed: { text: '완료', color: COLORS.text.tertiary, bg: COLORS.neutral.light },
  cancelled: { text: '취소됨', color: COLORS.functional.error, bg: COLORS.functional.errorLight },
};

const MyReservationsScreen: React.FC = () => {
  const navigate = useNavigate();
  const reservationStore = useReservationStore();
  const [activeTab, setActiveTab] = useState<TabKey>('active');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    reservationStore
      .fetchMyReservations()
      .finally(() => setLoading(false));
  }, []);

  const filteredReservations = reservationStore.reservations.filter((r) => {
    if (activeTab === 'active') return ACTIVE_STATUSES.includes(r.status);
    if (activeTab === 'completed') return COMPLETED_STATUSES.includes(r.status);
    return CANCELLED_STATUSES.includes(r.status);
  });

  const handleCancel = useCallback(async (id: string) => {
    if (!window.confirm('예약을 취소하시겠습니까?')) return;
    try {
      await reservationStore.cancelReservation(id);
    } catch (err: any) {
      alert(err.message || '취소에 실패했습니다.');
    }
  }, [reservationStore]);

  const handleCheckin = useCallback(async (id: string) => {
    try {
      await reservationStore.checkin(id);
      alert('체크인 완료!');
    } catch (err: any) {
      alert(err.message || '체크인에 실패했습니다.');
    }
  }, [reservationStore]);

  const handleArrivalNotify = useCallback(async (id: string) => {
    try {
      await import('../services/restaurantApiService').then((mod) =>
        mod.default.updateArrival(id, 'on_the_way'),
      );
      alert('도착 알림을 보냈습니다.');
    } catch {
      alert('알림 전송에 실패했습니다.');
    }
  }, []);

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return `${d.getMonth() + 1}/${d.getDate()} (${['일','월','화','수','목','금','토'][d.getDay()]})`;
    } catch {
      return dateStr;
    }
  };

  const getStatusChip = (status: string) => {
    const info = STATUS_LABELS[status] || { text: status, color: COLORS.text.tertiary, bg: COLORS.neutral.light };
    return (
      <span
        style={{
          fontSize: 11, fontWeight: 600, padding: '2px 8px',
          borderRadius: BORDER_RADIUS.sm, backgroundColor: info.bg, color: info.color,
          fontFamily: FONT,
        }}
      >
        {info.text}
      </span>
    );
  };

  const renderReservationCard = (reservation: Reservation) => {
    const canCancel = ['pending_payment', 'confirmed'].includes(reservation.status);
    const canCheckin = ['confirmed', 'preparing'].includes(reservation.status);
    const canNotify = ACTIVE_STATUSES.includes(reservation.status);

    return (
      <div
        key={reservation.id}
        style={s.card}
        onClick={() => navigate(`/reservation-confirm/${reservation.id}`)}
      >
        <div style={s.cardHeader}>
          <div style={s.cardRestaurant}>{reservation.restaurantName || '매장'}</div>
          {getStatusChip(reservation.status)}
        </div>

        <div style={s.cardBody}>
          <div style={s.cardRow}>
            <Icon name="calendar" size={14} color={COLORS.text.tertiary} />
            <span style={s.cardRowText}>
              {formatDate(reservation.reservationDate)} {reservation.reservationTime}
            </span>
          </div>
          <div style={s.cardRow}>
            <Icon name="users" size={14} color={COLORS.text.tertiary} />
            <span style={s.cardRowText}>{reservation.partySize}명</span>
          </div>
          {reservation.order?.items && (
            <div style={s.cardMenuSummary}>
              {reservation.order.items
                .slice(0, 2)
                .map((item: any) => item.menuName || item.name)
                .join(', ')}
              {reservation.order.items.length > 2 && ` 외 ${reservation.order.items.length - 2}개`}
            </div>
          )}
        </div>

        {/* 액션 버튼들 */}
        {activeTab === 'active' && (
          <div
            style={s.cardActions}
            onClick={(e) => e.stopPropagation()}
          >
            {canNotify && (
              <div
                style={s.actionButton}
                onClick={() => handleArrivalNotify(reservation.id)}
              >
                도착 알림
              </div>
            )}
            {canCheckin && (
              <div
                style={s.actionButtonPrimary}
                onClick={() => handleCheckin(reservation.id)}
              >
                체크인
              </div>
            )}
            {canCancel && (
              <div
                style={s.actionButtonDanger}
                onClick={() => handleCancel(reservation.id)}
              >
                취소
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={s.wrapper}>
      <div style={s.container}>
        {/* 헤더 */}
        <div style={s.header}>
          <div style={s.backBtn} onClick={() => navigate(-1)}>
            <Icon name="arrow-left" size={20} color={COLORS.text.primary} />
          </div>
          <div style={s.headerTitle}>내 예약</div>
          <div style={{ width: 36 }} />
        </div>

        {/* 탭 */}
        <div style={s.tabBar}>
          {([
            { key: 'active' as const, label: '진행중' },
            { key: 'completed' as const, label: '완료' },
            { key: 'cancelled' as const, label: '취소' },
          ]).map((tab) => (
            <div
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                ...s.tab,
                color: activeTab === tab.key ? COLORS.primary.main : COLORS.text.tertiary,
                borderBottom: activeTab === tab.key
                  ? `2px solid ${COLORS.primary.main}`
                  : '2px solid transparent',
                fontWeight: activeTab === tab.key ? 700 : 400,
              }}
            >
              {tab.label}
            </div>
          ))}
        </div>

        {/* 리스트 */}
        <div style={s.listSection}>
          {loading ? (
            <div style={s.loadingWrap}>
              <ActivityIndicator size="large" color={COLORS.primary.main} />
            </div>
          ) : filteredReservations.length > 0 ? (
            filteredReservations.map(renderReservationCard)
          ) : (
            <div style={s.emptySection}>
              <div style={s.emptyIcon}>
                <Icon name="calendar" size={40} color={COLORS.neutral.grey300} />
              </div>
              <div style={s.emptyText}>
                {activeTab === 'active'
                  ? '진행중인 예약이 없습니다.'
                  : activeTab === 'completed'
                  ? '완료된 예약이 없습니다.'
                  : '취소된 예약이 없습니다.'}
              </div>
              <div
                style={s.emptyButton}
                onClick={() => navigate('/')}
              >
                매장 둘러보기
              </div>
            </div>
          )}
        </div>

        <div style={{ height: 80 }} />
      </div>
    </div>
  );
};

// ── Styles ──

const FONT = '"Pretendard Variable", Pretendard, system-ui, -apple-system, sans-serif';

const s: Record<string, React.CSSProperties> = {
  wrapper: { minHeight: '100vh', backgroundColor: COLORS.neutral.background },
  container: { maxWidth: 480, margin: '0 auto', paddingBottom: SPACING.screen.horizontal },
  loadingWrap: { display: 'flex', justifyContent: 'center', alignItems: 'center', paddingTop: 80 },

  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: `${HEADER_STYLE.sub.paddingTop}px ${HEADER_STYLE.sub.paddingHorizontal}px ${HEADER_STYLE.sub.paddingBottom}px`,
    backgroundColor: HEADER_STYLE.sub.backgroundColor,
    borderBottom: `${HEADER_STYLE.sub.borderBottomWidth}px solid ${HEADER_STYLE.sub.borderBottomColor}`,
  },
  backBtn: {
    width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', fontFamily: FONT,
  },
  headerTitle: {
    fontSize: HEADER_STYLE.subTitle.fontSize,
    fontWeight: HEADER_STYLE.subTitle.fontWeight,
    letterSpacing: HEADER_STYLE.subTitle.letterSpacing,
    color: HEADER_STYLE.subTitle.color,
    fontFamily: FONT,
  },

  // 탭
  tabBar: {
    display: 'flex', backgroundColor: COLORS.neutral.white,
    borderBottom: `1px solid ${CARD_STYLE.borderColor}`,
    fontFamily: FONT,
  },
  tab: {
    flex: 1, textAlign: 'center' as const, padding: `${SPACING.md}px 0`,
    fontSize: 14, cursor: 'pointer', transition: `all ${TRANSITIONS.fast}`, fontFamily: FONT,
  },

  listSection: { padding: `${SPACING.md}px ${SPACING.screen.horizontal}px` },

  // 카드
  card: {
    borderRadius: CARD_STYLE.borderRadius,
    border: `${CARD_STYLE.borderWidth}px solid ${CARD_STYLE.borderColor}`,
    backgroundColor: COLORS.neutral.white, padding: SPACING.card.padding,
    marginBottom: SPACING.card.margin,
    boxShadow: CSS_SHADOWS.card, cursor: 'pointer',
    transition: `box-shadow ${TRANSITIONS.normal}`,
    fontFamily: FONT,
  },
  cardHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: SPACING.sm + 2,
  },
  cardRestaurant: { fontSize: 16, fontWeight: 700, color: COLORS.text.primary, fontFamily: FONT },
  cardBody: { display: 'flex', flexDirection: 'column' as const, gap: SPACING.xs + 2 },
  cardRow: { display: 'flex', alignItems: 'center', gap: SPACING.xs + 2 },
  cardRowText: { fontSize: 13, color: COLORS.text.secondary, fontFamily: FONT },
  cardMenuSummary: {
    fontSize: 12, color: COLORS.text.tertiary, fontFamily: FONT,
    marginTop: SPACING.xs, overflow: 'hidden', textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },

  // 액션 버튼
  cardActions: {
    display: 'flex', gap: SPACING.sm, marginTop: SPACING.md, paddingTop: SPACING.md,
    borderTop: `1px solid ${CARD_STYLE.borderColor}`,
    fontFamily: FONT,
  },
  actionButton: {
    padding: `${SPACING.xs + 2}px ${SPACING.md + 2}px`, borderRadius: BORDER_RADIUS.pill,
    border: `1px solid ${COLORS.neutral.grey200}`,
    backgroundColor: COLORS.neutral.white, fontSize: 12, fontWeight: 600,
    color: COLORS.text.secondary, cursor: 'pointer', fontFamily: FONT,
    transition: `all ${TRANSITIONS.fast}`,
  },
  actionButtonPrimary: {
    padding: `${SPACING.xs + 2}px ${SPACING.md + 2}px`, borderRadius: BORDER_RADIUS.pill,
    background: `linear-gradient(135deg, ${COLORS.primary.main} 0%, ${COLORS.primary.gradient} 100%)`,
    color: COLORS.text.white, fontSize: 12, fontWeight: 600,
    cursor: 'pointer', fontFamily: FONT, border: 'none',
    transition: `all ${TRANSITIONS.fast}`,
  },
  actionButtonDanger: {
    padding: `${SPACING.xs + 2}px ${SPACING.md + 2}px`, borderRadius: BORDER_RADIUS.pill,
    border: `1px solid ${COLORS.functional.error}`,
    backgroundColor: COLORS.neutral.white, fontSize: 12, fontWeight: 600,
    color: COLORS.functional.error, cursor: 'pointer', fontFamily: FONT,
    transition: `all ${TRANSITIONS.fast}`,
  },

  // 빈 상태
  emptySection: {
    display: 'flex', flexDirection: 'column' as const,
    alignItems: 'center', paddingTop: 60, fontFamily: FONT,
  },
  emptyIcon: { marginBottom: SPACING.lg },
  emptyText: {
    fontSize: 15, color: COLORS.text.tertiary, fontFamily: FONT,
    marginBottom: SPACING.screen.horizontal,
  },
  emptyButton: {
    padding: `${SPACING.sm + 2}px ${SPACING.xl}px`, borderRadius: BORDER_RADIUS.pill,
    background: `linear-gradient(135deg, ${COLORS.primary.main} 0%, ${COLORS.primary.gradient} 100%)`,
    color: COLORS.text.white, fontSize: 14, fontWeight: 600, cursor: 'pointer',
    fontFamily: FONT, transition: `all ${TRANSITIONS.fast}`,
  },
};

export default MyReservationsScreen;
