import React, { useState, useEffect, useCallback } from 'react';
import { ActivityIndicator } from 'react-native';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { COLORS, CSS_SHADOWS, CARD_STYLE, TRANSITIONS } from '../styles/colors';
import { SPACING, BORDER_RADIUS, HEADER_STYLE } from '../styles/spacing';
import useReservationStore, { Reservation } from '../store/reservationStore';
import restaurantApiService, { CancelPreview, TimeSlot } from '../services/restaurantApiService';
import reservationChatApiService from '../services/reservationChatApiService';
import useReservationSocket from '../hooks/useReservationSocket';
import { nextArrivalStep } from '../constants/arrivalStatus';

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

  // 취소 다이얼로그 상태
  const [cancelTarget, setCancelTarget] = useState<Reservation | null>(null);
  const [cancelPreview, setCancelPreview] = useState<CancelPreview | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelSubmitting, setCancelSubmitting] = useState(false);

  // 변경 모달 상태
  const [modifyTarget, setModifyTarget] = useState<Reservation | null>(null);
  const [modifyDate, setModifyDate] = useState('');
  const [modifyTime, setModifyTime] = useState('');
  const [modifyPartySize, setModifyPartySize] = useState(2);
  const [modifySlots, setModifySlots] = useState<TimeSlot[]>([]);
  const [modifyLoadingSlots, setModifyLoadingSlots] = useState(false);
  const [modifySubmitting, setModifySubmitting] = useState(false);

  // 변경 모달 날짜 범위 (오늘~30일 후)
  const modifyToday = new Date();
  const modifyMinDate = modifyToday.toISOString().split('T')[0];
  const modifyMaxDate = new Date(modifyToday.getTime() + 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  useEffect(() => {
    reservationStore
      .fetchMyReservations()
      .finally(() => setLoading(false));
  }, []);

  // 진행중 예약 실시간 구독 — 점주가 상태를 바꾸면 카드 즉시 갱신
  const activeIds = reservationStore.reservations
    .filter((r) => ACTIVE_STATUSES.includes(r.status))
    .map((r) => r.id);
  useReservationSocket(activeIds, {
    onStatusUpdate: () => { reservationStore.fetchMyReservations().catch(() => {}); },
    onCookingUpdate: () => { reservationStore.fetchMyReservations().catch(() => {}); },
  });

  // 변경 모달: 날짜 변경 시 해당 매장의 시간 슬롯 조회
  useEffect(() => {
    if (!modifyTarget || !modifyDate) {
      setModifySlots([]);
      return;
    }
    let cancelled = false;
    setModifyLoadingSlots(true);
    restaurantApiService
      .getTimeSlots(modifyTarget.restaurantId, modifyDate)
      .then((slots) => { if (!cancelled) setModifySlots(Array.isArray(slots) ? slots : []); })
      .catch(() => { if (!cancelled) setModifySlots([]); })
      .finally(() => { if (!cancelled) setModifyLoadingSlots(false); });
    return () => { cancelled = true; };
  }, [modifyTarget, modifyDate]);

  const filteredReservations = reservationStore.reservations.filter((r) => {
    if (activeTab === 'active') return ACTIVE_STATUSES.includes(r.status);
    if (activeTab === 'completed') return COMPLETED_STATUSES.includes(r.status);
    return CANCELLED_STATUSES.includes(r.status);
  });

  // 취소 다이얼로그 열기 — 환불 미리보기 조회
  const openCancelDialog = useCallback(async (reservation: Reservation) => {
    setCancelTarget(reservation);
    setCancelPreview(null);
    setCancelLoading(true);
    try {
      const preview = await restaurantApiService.getCancelPreview(reservation.id);
      setCancelPreview(preview);
    } catch {
      // 미리보기 실패해도 다이얼로그는 유지 — 환불액 미표시로 진행
      setCancelPreview(null);
    } finally {
      setCancelLoading(false);
    }
  }, []);

  const closeCancelDialog = useCallback(() => {
    if (cancelSubmitting) return;
    setCancelTarget(null);
    setCancelPreview(null);
  }, [cancelSubmitting]);

  const confirmCancel = useCallback(async () => {
    if (!cancelTarget) return;
    setCancelSubmitting(true);
    try {
      const result = await reservationStore.cancelReservation(cancelTarget.id);
      setCancelTarget(null);
      setCancelPreview(null);
      if (result?.refund) {
        const { refundRate, refundAmount } = result.refund;
        alert(`예약이 취소되었습니다.\n환불: ${refundAmount.toLocaleString('ko-KR')}원 (${refundRate}%)`);
      } else {
        alert('예약이 취소되었습니다.');
      }
    } catch (err: any) {
      alert(err.message || '취소에 실패했습니다.');
    } finally {
      setCancelSubmitting(false);
    }
  }, [cancelTarget, reservationStore]);

  // 변경 모달 열기 — 현재 예약값으로 초기화
  const openModifyModal = useCallback((reservation: Reservation) => {
    setModifyTarget(reservation);
    setModifyDate(reservation.reservationDate?.slice(0, 10) || '');
    setModifyTime(reservation.reservationTime || '');
    setModifyPartySize(reservation.partySize || 2);
    setModifySlots([]);
  }, []);

  const closeModifyModal = useCallback(() => {
    if (modifySubmitting) return;
    setModifyTarget(null);
  }, [modifySubmitting]);

  const confirmModify = useCallback(async () => {
    if (!modifyTarget || !modifyDate || !modifyTime) return;
    setModifySubmitting(true);
    try {
      await reservationStore.modifyReservation(modifyTarget.id, {
        reservationDate: modifyDate,
        reservationTime: modifyTime,
        partySize: modifyPartySize,
      });
      setModifyTarget(null);
      alert('예약이 변경되었습니다.');
    } catch (err: any) {
      alert(err.message || '예약 변경에 실패했습니다.');
    } finally {
      setModifySubmitting(false);
    }
  }, [modifyTarget, modifyDate, modifyTime, modifyPartySize, reservationStore]);

  const handleCheckin = useCallback(async (id: string) => {
    try {
      await reservationStore.checkin(id);
      alert('체크인 완료!');
    } catch (err: any) {
      alert(err.message || '체크인에 실패했습니다.');
    }
  }, [reservationStore]);

  const handleArrival = useCallback(async (id: string, status: string, label: string) => {
    try {
      await reservationStore.updateArrival(id, status);
      alert(`'${label}' 상태를 매장에 알렸습니다.`);
    } catch (err: any) {
      alert(err?.response?.data?.error || '알림 전송에 실패했습니다.');
    }
  }, [reservationStore]);

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
    const canModify = reservation.status === 'confirmed';
    const canCheckin = ['confirmed', 'preparing'].includes(reservation.status);
    // 도착 알림은 확정/준비중에만 (결제대기/착석/완료 제외)
    const canNotify = ['confirmed', 'preparing'].includes(reservation.status);
    const arrivalStep = nextArrivalStep(reservation.arrivalStatus);
    const needsPayment = reservation.status === 'pending_payment';

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
                .map((item: any) => item.menu_name || item.menuName || item.name)
                .join(', ')}
              {reservation.order.items.length > 2 && ` 외 ${reservation.order.items.length - 2}개`}
            </div>
          )}
        </div>

        {/* 결제 대기 안내 — 15분 내 미결제 시 자동 취소 */}
        {needsPayment && (
          <div style={s.pendingPaymentNotice}>
            예약 후 15분 내 결제하지 않으면 자동 취소됩니다.
          </div>
        )}

        {/* 액션 버튼들 */}
        {activeTab === 'active' && (
          <div
            style={s.cardActions}
            onClick={(e) => e.stopPropagation()}
          >
            {needsPayment && (
              <div
                style={s.actionButtonPrimary}
                onClick={() => navigate(`/payment/${reservation.id}`)}
              >
                결제하기
              </div>
            )}
            {canNotify && arrivalStep && (
              <div
                style={s.actionButton}
                onClick={() => handleArrival(reservation.id, arrivalStep.value, arrivalStep.label)}
              >
                {arrivalStep.emoji} {arrivalStep.label}
              </div>
            )}
            <div
              style={s.actionButton}
              onClick={async () => {
                try {
                  const room = await reservationChatApiService.createOrGetRoom(reservation.id);
                  navigate(`/reservation-chat/${room.id}`);
                } catch (err: any) {
                  alert(err?.response?.data?.error || '문의를 시작할 수 없습니다.');
                }
              }}
            >
              문의
            </div>
            {canCheckin && (
              <div
                style={s.actionButtonPrimary}
                onClick={() => handleCheckin(reservation.id)}
              >
                체크인
              </div>
            )}
            {canModify && (
              <div
                style={s.actionButton}
                onClick={() => openModifyModal(reservation)}
              >
                변경
              </div>
            )}
            {canCancel && (
              <div
                style={s.actionButtonDanger}
                onClick={() => openCancelDialog(reservation)}
              >
                취소
              </div>
            )}
          </div>
        )}
        {activeTab === 'completed' && (
          <div
            style={s.cardActions}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={s.actionButtonPrimary}
              onClick={() => navigate(`/write-restaurant-review/${reservation.id}`)}
            >
              리뷰 작성
            </div>
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

      {/* 취소 다이얼로그 — 환불 미리보기 */}
      {cancelTarget && (
        <div style={s.modalOverlay} onClick={closeCancelDialog}>
          <div style={s.modal} onClick={(e) => e.stopPropagation()}>
            <div style={s.modalTitle}>예약 취소</div>
            <div style={s.modalRestaurant}>
              {cancelTarget.restaurantName || '매장'} · {formatDate(cancelTarget.reservationDate)} {cancelTarget.reservationTime}
            </div>

            <div style={s.modalBody}>
              {cancelLoading ? (
                <div style={s.modalLoadingWrap}>
                  <ActivityIndicator size="small" color={COLORS.primary.main} />
                </div>
              ) : cancelPreview && cancelPreview.hasPayment ? (
                <>
                  <div style={s.refundLine}>
                    지금 취소하면{' '}
                    <span style={s.refundAmount}>
                      {cancelPreview.refundAmount.toLocaleString('ko-KR')}원 환불
                    </span>
                    됩니다 ({cancelPreview.refundRate}%)
                  </div>
                  {cancelPreview.isImminent && (
                    <div style={s.imminentWarning}>
                      예약이 임박해 환불액이 줄어듭니다.
                    </div>
                  )}
                </>
              ) : (
                <div style={s.refundLine}>예약을 취소하시겠습니까?</div>
              )}
            </div>

            <div style={s.modalActions}>
              <div
                style={s.modalCancelBtn}
                onClick={closeCancelDialog}
              >
                닫기
              </div>
              <div
                style={{
                  ...s.modalConfirmDangerBtn,
                  opacity: cancelSubmitting ? 0.5 : 1,
                  cursor: cancelSubmitting ? 'not-allowed' : 'pointer',
                }}
                onClick={cancelSubmitting ? undefined : confirmCancel}
              >
                {cancelSubmitting ? '처리 중...' : '취소하기'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 변경 모달 — 날짜/시간/인원 */}
      {modifyTarget && (
        <div style={s.modalOverlay} onClick={closeModifyModal}>
          <div style={s.modal} onClick={(e) => e.stopPropagation()}>
            <div style={s.modalTitle}>예약 변경</div>
            <div style={s.modalRestaurant}>
              {modifyTarget.restaurantName || '매장'}
            </div>

            <div style={s.modalBody}>
              {/* 날짜 */}
              <div style={s.modifyField}>
                <div style={s.modifyLabel}>날짜</div>
                <input
                  type="date"
                  value={modifyDate}
                  min={modifyMinDate}
                  max={modifyMaxDate}
                  onChange={(e) => { setModifyDate(e.target.value); setModifyTime(''); }}
                  style={s.modifyDateInput}
                />
              </div>

              {/* 시간 */}
              <div style={s.modifyField}>
                <div style={s.modifyLabel}>시간</div>
                {!modifyDate ? (
                  <div style={s.modifyHint}>날짜를 먼저 선택해주세요.</div>
                ) : modifyLoadingSlots ? (
                  <ActivityIndicator size="small" color={COLORS.primary.main} />
                ) : modifySlots.length === 0 ? (
                  <div style={s.modifyHint}>예약 가능한 시간이 없습니다.</div>
                ) : (
                  <div style={s.modifySlotGrid}>
                    {modifySlots.map((slot) => {
                      const selected = modifyTime === slot.time;
                      return (
                        <div
                          key={slot.time}
                          onClick={() => slot.available && setModifyTime(slot.time)}
                          style={{
                            ...s.modifySlotButton,
                            backgroundColor: selected
                              ? COLORS.primary.main
                              : slot.available
                              ? COLORS.neutral.white
                              : COLORS.neutral.light,
                            color: selected
                              ? COLORS.text.white
                              : slot.available
                              ? COLORS.text.primary
                              : COLORS.text.tertiary,
                            cursor: slot.available ? 'pointer' : 'not-allowed',
                            borderColor: selected ? COLORS.primary.main : COLORS.neutral.grey200,
                          }}
                        >
                          {slot.time}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 인원 */}
              <div style={s.modifyField}>
                <div style={s.modifyLabel}>인원</div>
                <div style={s.modifyPartyRow}>
                  <div
                    style={{
                      ...s.modifyPmButton,
                      opacity: modifyPartySize <= 1 ? 0.3 : 1,
                      cursor: modifyPartySize <= 1 ? 'not-allowed' : 'pointer',
                    }}
                    onClick={() => modifyPartySize > 1 && setModifyPartySize(modifyPartySize - 1)}
                  >
                    -
                  </div>
                  <span style={s.modifyPartyText}>{modifyPartySize}명</span>
                  <div
                    style={{
                      ...s.modifyPmButton,
                      opacity: modifyPartySize >= 20 ? 0.3 : 1,
                      cursor: modifyPartySize >= 20 ? 'not-allowed' : 'pointer',
                    }}
                    onClick={() => modifyPartySize < 20 && setModifyPartySize(modifyPartySize + 1)}
                  >
                    +
                  </div>
                </div>
              </div>
            </div>

            <div style={s.modalActions}>
              <div style={s.modalCancelBtn} onClick={closeModifyModal}>
                닫기
              </div>
              <div
                style={{
                  ...s.modalConfirmBtn,
                  opacity: (!modifyDate || !modifyTime || modifySubmitting) ? 0.5 : 1,
                  cursor: (!modifyDate || !modifyTime || modifySubmitting) ? 'not-allowed' : 'pointer',
                }}
                onClick={(!modifyDate || !modifyTime || modifySubmitting) ? undefined : confirmModify}
              >
                {modifySubmitting ? '처리 중...' : '변경하기'}
              </div>
            </div>
          </div>
        </div>
      )}
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

  // 결제 대기 안내
  pendingPaymentNotice: {
    marginTop: SPACING.sm, padding: `${SPACING.xs + 2}px ${SPACING.md}px`,
    borderRadius: BORDER_RADIUS.sm, backgroundColor: COLORS.functional.warningLight,
    color: COLORS.functional.warning, fontSize: 12, fontWeight: 600, fontFamily: FONT,
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

  // ── 모달 (취소 다이얼로그 / 변경 모달) ──
  modalOverlay: {
    position: 'fixed' as const, inset: 0, zIndex: 1000,
    backgroundColor: 'rgba(0,0,0,0.45)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: SPACING.screen.horizontal, fontFamily: FONT,
  },
  modal: {
    width: '100%', maxWidth: 360,
    backgroundColor: COLORS.neutral.white, borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.xl, boxShadow: CSS_SHADOWS.card, fontFamily: FONT,
    maxHeight: '85vh', overflowY: 'auto' as const,
  },
  modalTitle: {
    fontSize: 17, fontWeight: 700, color: COLORS.text.primary, fontFamily: FONT,
    marginBottom: SPACING.xs,
  },
  modalRestaurant: {
    fontSize: 13, color: COLORS.text.secondary, fontFamily: FONT,
    marginBottom: SPACING.md,
  },
  modalBody: { marginBottom: SPACING.lg },
  modalLoadingWrap: {
    display: 'flex', justifyContent: 'center', alignItems: 'center', padding: `${SPACING.lg}px 0`,
  },
  refundLine: {
    fontSize: 14, color: COLORS.text.primary, fontFamily: FONT, lineHeight: '1.6',
  },
  refundAmount: { fontWeight: 700, color: COLORS.primary.main },
  imminentWarning: {
    marginTop: SPACING.sm, padding: `${SPACING.xs + 2}px ${SPACING.md}px`,
    borderRadius: BORDER_RADIUS.sm, backgroundColor: COLORS.functional.errorLight,
    color: COLORS.functional.error, fontSize: 12, fontWeight: 600, fontFamily: FONT,
  },
  modalActions: {
    display: 'flex', gap: SPACING.sm, fontFamily: FONT,
  },
  modalCancelBtn: {
    flex: 1, padding: `${SPACING.md}px 0`, textAlign: 'center' as const,
    borderRadius: BORDER_RADIUS.md, border: `1px solid ${COLORS.neutral.grey200}`,
    backgroundColor: COLORS.neutral.white, fontSize: 14, fontWeight: 600,
    color: COLORS.text.secondary, cursor: 'pointer', fontFamily: FONT,
  },
  modalConfirmBtn: {
    flex: 1, padding: `${SPACING.md}px 0`, textAlign: 'center' as const,
    borderRadius: BORDER_RADIUS.md, border: 'none',
    background: `linear-gradient(135deg, ${COLORS.primary.main} 0%, ${COLORS.primary.gradient} 100%)`,
    color: COLORS.text.white, fontSize: 14, fontWeight: 700, fontFamily: FONT,
  },
  modalConfirmDangerBtn: {
    flex: 1, padding: `${SPACING.md}px 0`, textAlign: 'center' as const,
    borderRadius: BORDER_RADIUS.md, border: 'none',
    backgroundColor: COLORS.functional.error,
    color: COLORS.text.white, fontSize: 14, fontWeight: 700, fontFamily: FONT,
  },

  // 변경 모달 필드
  modifyField: { marginBottom: SPACING.lg },
  modifyLabel: {
    fontSize: 13, fontWeight: 600, color: COLORS.text.primary, fontFamily: FONT,
    marginBottom: SPACING.sm,
  },
  modifyHint: { fontSize: 13, color: COLORS.text.tertiary, fontFamily: FONT },
  modifyDateInput: {
    width: '100%', padding: `${SPACING.sm + 2}px ${SPACING.md + 2}px`,
    borderRadius: BORDER_RADIUS.md, border: `1px solid ${COLORS.neutral.grey200}`,
    fontSize: 14, fontFamily: FONT, color: COLORS.text.primary,
    backgroundColor: COLORS.neutral.white, boxSizing: 'border-box' as const,
  },
  modifySlotGrid: { display: 'flex', flexWrap: 'wrap' as const, gap: SPACING.sm },
  modifySlotButton: {
    padding: `${SPACING.sm}px ${SPACING.md + 2}px`, borderRadius: BORDER_RADIUS.md,
    border: `1px solid ${COLORS.neutral.grey200}`, fontSize: 13, fontWeight: 500,
    textAlign: 'center' as const, fontFamily: FONT, minWidth: 60,
    transition: `all ${TRANSITIONS.fast}`,
  },
  modifyPartyRow: { display: 'flex', alignItems: 'center', gap: SPACING.xl },
  modifyPmButton: {
    width: 36, height: 36, borderRadius: 18, display: 'flex',
    alignItems: 'center', justifyContent: 'center',
    border: `1px solid ${COLORS.neutral.grey200}`, backgroundColor: COLORS.neutral.white,
    fontSize: 18, fontWeight: 600, fontFamily: FONT, color: COLORS.text.primary,
  },
  modifyPartyText: {
    fontSize: 16, fontWeight: 700, color: COLORS.text.primary, fontFamily: FONT,
    minWidth: 44, textAlign: 'center' as const,
  },
};

export default MyReservationsScreen;
