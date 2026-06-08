import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { useTypedNavigation } from '../hooks/useNavigation';
import { Icon } from '../components/Icon';
import { COLORS, CARD_STYLE } from '../styles/colors';
import { SPACING, BORDER_RADIUS } from '../styles/spacing';
import useReservationStore, { Reservation } from '../store/reservationStore';
import restaurantApiService, { CancelPreview, TimeSlot } from '../services/restaurantApiService';
import reservationChatApiService from '../services/reservationChatApiService';
import useReservationSocket from '../hooks/useReservationSocket';
import { nextArrivalStep } from '../constants/arrivalStatus';

// ============================================================
// MyReservationsScreen — 잇테이블 v2 내 예약 목록 (React Native 포팅)
// 로직/데이터는 .web.tsx와 동일하게 공유, UI만 RN 컴포넌트로 변환
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

const TABS: { key: TabKey; label: string }[] = [
  { key: 'active', label: '진행중' },
  { key: 'completed', label: '완료' },
  { key: 'cancelled', label: '취소' },
];

const MyReservationsScreen: React.FC = () => {
  const navigation = useTypedNavigation();
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

  useEffect(() => {
    reservationStore
      .fetchMyReservations()
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 진행중 예약 실시간 구독 — 점주가 상태를 바꾸면 카드 즉시 갱신
  // (socket.io-client는 크로스플랫폼이라 RN에서도 동작)
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
        Alert.alert('취소 완료', `예약이 취소되었습니다.\n환불: ${refundAmount.toLocaleString('ko-KR')}원 (${refundRate}%)`);
      } else {
        Alert.alert('취소 완료', '예약이 취소되었습니다.');
      }
    } catch (err: any) {
      Alert.alert('오류', err.message || '취소에 실패했습니다.');
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
      Alert.alert('변경 완료', '예약이 변경되었습니다.');
    } catch (err: any) {
      Alert.alert('오류', err.message || '예약 변경에 실패했습니다.');
    } finally {
      setModifySubmitting(false);
    }
  }, [modifyTarget, modifyDate, modifyTime, modifyPartySize, reservationStore]);

  const handleCheckin = useCallback(async (id: string) => {
    try {
      await reservationStore.checkin(id);
      Alert.alert('체크인 완료!', '');
    } catch (err: any) {
      Alert.alert('오류', err.message || '체크인에 실패했습니다.');
    }
  }, [reservationStore]);

  const handleArrival = useCallback(async (id: string, status: string, label: string) => {
    try {
      await reservationStore.updateArrival(id, status);
      Alert.alert('알림 전송', `'${label}' 상태를 매장에 알렸습니다.`);
    } catch (err: any) {
      Alert.alert('오류', err?.response?.data?.error || '알림 전송에 실패했습니다.');
    }
  }, [reservationStore]);

  const handleInquiry = useCallback(async (reservation: Reservation) => {
    try {
      const room = await reservationChatApiService.createOrGetRoom(reservation.id);
      navigation.navigate('ReservationChat' as any, { roomId: room.id });
    } catch (err: any) {
      Alert.alert('오류', err?.response?.data?.error || '문의를 시작할 수 없습니다.');
    }
  }, [navigation]);

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return `${d.getMonth() + 1}/${d.getDate()} (${['일', '월', '화', '수', '목', '금', '토'][d.getDay()]})`;
    } catch {
      return dateStr;
    }
  };

  const renderStatusChip = (status: string) => {
    const info = STATUS_LABELS[status] || { text: status, color: COLORS.text.tertiary, bg: COLORS.neutral.light };
    return (
      <View style={[s.statusChip, { backgroundColor: info.bg }]}>
        <Text style={[s.statusChipText, { color: info.color }]}>{info.text}</Text>
      </View>
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
      <TouchableOpacity
        key={reservation.id}
        style={s.card}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('ReservationConfirm' as any, { reservationId: reservation.id })}
      >
        <View style={s.cardHeader}>
          <Text style={s.cardRestaurant}>{reservation.restaurantName || '매장'}</Text>
          {renderStatusChip(reservation.status)}
        </View>

        <View style={s.cardBody}>
          <View style={s.cardRow}>
            <Icon name="calendar" size={14} color={COLORS.text.tertiary} />
            <Text style={s.cardRowText}>
              {formatDate(reservation.reservationDate)} {reservation.reservationTime}
            </Text>
          </View>
          <View style={s.cardRow}>
            <Icon name="users" size={14} color={COLORS.text.tertiary} />
            <Text style={s.cardRowText}>{reservation.partySize}명</Text>
          </View>
          {reservation.order?.items && (
            <Text style={s.cardMenuSummary} numberOfLines={1}>
              {reservation.order.items
                .slice(0, 2)
                .map((item: any) => item.menu_name || item.menuName || item.name)
                .join(', ')}
              {reservation.order.items.length > 2 && ` 외 ${reservation.order.items.length - 2}개`}
            </Text>
          )}
        </View>

        {/* 결제 대기 안내 — 15분 내 미결제 시 자동 취소 */}
        {needsPayment && (
          <View style={s.pendingPaymentNotice}>
            <Text style={s.pendingPaymentText}>
              예약 후 15분 내 결제하지 않으면 자동 취소됩니다.
            </Text>
          </View>
        )}

        {/* 액션 버튼들 */}
        {activeTab === 'active' && (
          <View style={s.cardActions}>
            {needsPayment && (
              <TouchableOpacity
                style={s.actionButtonPrimary}
                onPress={() => navigation.navigate('Payment' as any, { reservationId: reservation.id })}
              >
                <Text style={s.actionButtonPrimaryText}>결제하기</Text>
              </TouchableOpacity>
            )}
            {canNotify && arrivalStep && (
              <TouchableOpacity
                style={s.actionButton}
                onPress={() => handleArrival(reservation.id, arrivalStep.value, arrivalStep.label)}
              >
                <Text style={s.actionButtonText}>{arrivalStep.emoji} {arrivalStep.label}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={s.actionButton} onPress={() => handleInquiry(reservation)}>
              <Text style={s.actionButtonText}>문의</Text>
            </TouchableOpacity>
            {canCheckin && (
              <TouchableOpacity
                style={s.actionButtonPrimary}
                onPress={() => handleCheckin(reservation.id)}
              >
                <Text style={s.actionButtonPrimaryText}>체크인</Text>
              </TouchableOpacity>
            )}
            {canModify && (
              <TouchableOpacity style={s.actionButton} onPress={() => openModifyModal(reservation)}>
                <Text style={s.actionButtonText}>변경</Text>
              </TouchableOpacity>
            )}
            {canCancel && (
              <TouchableOpacity style={s.actionButtonDanger} onPress={() => openCancelDialog(reservation)}>
                <Text style={s.actionButtonDangerText}>취소</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        {activeTab === 'completed' && (
          <View style={s.cardActions}>
            <TouchableOpacity
              style={s.actionButtonPrimary}
              onPress={() => navigation.navigate('WriteRestaurantReview' as any, { reservationId: reservation.id })}
            >
              <Text style={s.actionButtonPrimaryText}>리뷰 작성</Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={s.wrapper}>
      {/* 헤더 */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={20} color={COLORS.text.primary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>내 예약</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* 탭 */}
      <View style={s.tabBar}>
        {TABS.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[s.tab, active && s.tabActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text style={[s.tabText, active && s.tabTextActive]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* 리스트 */}
      {loading ? (
        <View style={s.loadingWrap}>
          <ActivityIndicator size="large" color={COLORS.primary.main} />
        </View>
      ) : filteredReservations.length > 0 ? (
        <ScrollView contentContainerStyle={s.listSection} keyboardShouldPersistTaps="handled">
          {filteredReservations.map(renderReservationCard)}
          <View style={{ height: 80 }} />
        </ScrollView>
      ) : (
        <View style={s.emptySection}>
          <View style={s.emptyIcon}>
            <Icon name="calendar" size={40} color={COLORS.neutral.grey300} />
          </View>
          <Text style={s.emptyText}>
            {activeTab === 'active'
              ? '진행중인 예약이 없습니다.'
              : activeTab === 'completed'
              ? '완료된 예약이 없습니다.'
              : '취소된 예약이 없습니다.'}
          </Text>
          <TouchableOpacity style={s.emptyButton} onPress={() => navigation.navigate('Home')}>
            <Text style={s.emptyButtonText}>매장 둘러보기</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 취소 다이얼로그 — 환불 미리보기 */}
      <Modal
        visible={!!cancelTarget}
        transparent
        animationType="fade"
        onRequestClose={closeCancelDialog}
      >
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={closeCancelDialog}>
          <TouchableOpacity style={s.modal} activeOpacity={1} onPress={() => {}}>
            <Text style={s.modalTitle}>예약 취소</Text>
            {cancelTarget && (
              <Text style={s.modalRestaurant}>
                {cancelTarget.restaurantName || '매장'} · {formatDate(cancelTarget.reservationDate)} {cancelTarget.reservationTime}
              </Text>
            )}

            <View style={s.modalBody}>
              {cancelLoading ? (
                <View style={s.modalLoadingWrap}>
                  <ActivityIndicator size="small" color={COLORS.primary.main} />
                </View>
              ) : cancelPreview && cancelPreview.hasPayment ? (
                <>
                  <Text style={s.refundLine}>
                    지금 취소하면{' '}
                    <Text style={s.refundAmount}>
                      {cancelPreview.refundAmount.toLocaleString('ko-KR')}원 환불
                    </Text>
                    됩니다 ({cancelPreview.refundRate}%)
                  </Text>
                  {cancelPreview.isImminent && (
                    <View style={s.imminentWarning}>
                      <Text style={s.imminentWarningText}>
                        예약이 임박해 환불액이 줄어듭니다.
                      </Text>
                    </View>
                  )}
                </>
              ) : (
                <Text style={s.refundLine}>예약을 취소하시겠습니까?</Text>
              )}
            </View>

            <View style={s.modalActions}>
              <TouchableOpacity style={s.modalCancelBtn} onPress={closeCancelDialog}>
                <Text style={s.modalCancelBtnText}>닫기</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.modalConfirmDangerBtn, cancelSubmitting && s.btnDisabled]}
                onPress={cancelSubmitting ? undefined : confirmCancel}
                disabled={cancelSubmitting}
              >
                <Text style={s.modalConfirmBtnText}>
                  {cancelSubmitting ? '처리 중...' : '취소하기'}
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* 변경 모달 — 날짜/시간/인원 */}
      <Modal
        visible={!!modifyTarget}
        transparent
        animationType="fade"
        onRequestClose={closeModifyModal}
      >
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={closeModifyModal}>
          <TouchableOpacity style={s.modal} activeOpacity={1} onPress={() => {}}>
            <Text style={s.modalTitle}>예약 변경</Text>
            {modifyTarget && (
              <Text style={s.modalRestaurant}>{modifyTarget.restaurantName || '매장'}</Text>
            )}

            <ScrollView style={s.modalScroll} keyboardShouldPersistTaps="handled">
              {/* 날짜 — RN에는 date picker가 없어 YYYY-MM-DD 텍스트 입력으로 대체 */}
              <View style={s.modifyField}>
                <Text style={s.modifyLabel}>날짜 (YYYY-MM-DD)</Text>
                <TextInput
                  style={s.modifyDateInput}
                  value={modifyDate}
                  placeholder="2026-06-08"
                  placeholderTextColor={COLORS.text.tertiary}
                  onChangeText={(text) => { setModifyDate(text); setModifyTime(''); }}
                  keyboardType="numbers-and-punctuation"
                  autoCapitalize="none"
                />
              </View>

              {/* 시간 */}
              <View style={s.modifyField}>
                <Text style={s.modifyLabel}>시간</Text>
                {!modifyDate ? (
                  <Text style={s.modifyHint}>날짜를 먼저 입력해주세요.</Text>
                ) : modifyLoadingSlots ? (
                  <ActivityIndicator size="small" color={COLORS.primary.main} />
                ) : modifySlots.length === 0 ? (
                  <Text style={s.modifyHint}>예약 가능한 시간이 없습니다.</Text>
                ) : (
                  <View style={s.modifySlotGrid}>
                    {modifySlots.map((slot) => {
                      const selected = modifyTime === slot.time;
                      return (
                        <TouchableOpacity
                          key={slot.time}
                          disabled={!slot.available}
                          onPress={() => slot.available && setModifyTime(slot.time)}
                          style={[
                            s.modifySlotButton,
                            {
                              backgroundColor: selected
                                ? COLORS.primary.main
                                : slot.available
                                ? COLORS.neutral.white
                                : COLORS.neutral.light,
                              borderColor: selected ? COLORS.primary.main : COLORS.neutral.grey200,
                            },
                          ]}
                        >
                          <Text
                            style={{
                              fontSize: 13,
                              fontWeight: '500',
                              color: selected
                                ? COLORS.text.white
                                : slot.available
                                ? COLORS.text.primary
                                : COLORS.text.tertiary,
                            }}
                          >
                            {slot.time}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>

              {/* 인원 */}
              <View style={s.modifyField}>
                <Text style={s.modifyLabel}>인원</Text>
                <View style={s.modifyPartyRow}>
                  <TouchableOpacity
                    style={[s.modifyPmButton, modifyPartySize <= 1 && s.btnDisabled]}
                    disabled={modifyPartySize <= 1}
                    onPress={() => modifyPartySize > 1 && setModifyPartySize(modifyPartySize - 1)}
                  >
                    <Text style={s.modifyPmButtonText}>-</Text>
                  </TouchableOpacity>
                  <Text style={s.modifyPartyText}>{modifyPartySize}명</Text>
                  <TouchableOpacity
                    style={[s.modifyPmButton, modifyPartySize >= 20 && s.btnDisabled]}
                    disabled={modifyPartySize >= 20}
                    onPress={() => modifyPartySize < 20 && setModifyPartySize(modifyPartySize + 1)}
                  >
                    <Text style={s.modifyPmButtonText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>

            <View style={s.modalActions}>
              <TouchableOpacity style={s.modalCancelBtn} onPress={closeModifyModal}>
                <Text style={s.modalCancelBtnText}>닫기</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  s.modalConfirmBtn,
                  (!modifyDate || !modifyTime || modifySubmitting) && s.btnDisabled,
                ]}
                onPress={(!modifyDate || !modifyTime || modifySubmitting) ? undefined : confirmModify}
                disabled={!modifyDate || !modifyTime || modifySubmitting}
              >
                <Text style={s.modalConfirmBtnText}>
                  {modifySubmitting ? '처리 중...' : '변경하기'}
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

// ── Styles ──

const s = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: COLORS.neutral.background },

  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.screen.horizontal,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: COLORS.neutral.white,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(17,17,17,0.06)',
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '600', letterSpacing: -0.2, color: '#1A1714' },

  // 탭
  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.neutral.white,
    borderBottomWidth: 1,
    borderBottomColor: CARD_STYLE.borderColor,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: COLORS.primary.main },
  tabText: { fontSize: 14, color: COLORS.text.tertiary, fontWeight: '400' },
  tabTextActive: { color: COLORS.primary.main, fontWeight: '700' },

  listSection: { padding: SPACING.md, paddingHorizontal: SPACING.screen.horizontal },

  // 상태 칩
  statusChip: { paddingVertical: 2, paddingHorizontal: 8, borderRadius: BORDER_RADIUS.sm },
  statusChipText: { fontSize: 11, fontWeight: '600' },

  // 카드
  card: {
    borderRadius: CARD_STYLE.borderRadius,
    borderWidth: CARD_STYLE.borderWidth,
    borderColor: CARD_STYLE.borderColor,
    backgroundColor: COLORS.neutral.white,
    padding: SPACING.card.padding,
    marginBottom: SPACING.card.margin,
    shadowColor: '#111111',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm + 2,
  },
  cardRestaurant: { fontSize: 16, fontWeight: '700', color: COLORS.text.primary, flex: 1, marginRight: 8 },
  cardBody: { gap: SPACING.xs + 2 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs + 2 },
  cardRowText: { fontSize: 13, color: COLORS.text.secondary },
  cardMenuSummary: { fontSize: 12, color: COLORS.text.tertiary, marginTop: SPACING.xs },

  // 결제 대기 안내
  pendingPaymentNotice: {
    marginTop: SPACING.sm,
    paddingVertical: SPACING.xs + 2,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.functional.warningLight,
  },
  pendingPaymentText: { color: COLORS.functional.warning, fontSize: 12, fontWeight: '600' },

  // 액션 버튼
  cardActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: CARD_STYLE.borderColor,
  },
  actionButton: {
    paddingVertical: SPACING.xs + 2,
    paddingHorizontal: SPACING.md + 2,
    borderRadius: BORDER_RADIUS.pill,
    borderWidth: 1,
    borderColor: COLORS.neutral.grey200,
    backgroundColor: COLORS.neutral.white,
  },
  actionButtonText: { fontSize: 12, fontWeight: '600', color: COLORS.text.secondary },
  actionButtonPrimary: {
    paddingVertical: SPACING.xs + 2,
    paddingHorizontal: SPACING.md + 2,
    borderRadius: BORDER_RADIUS.pill,
    backgroundColor: COLORS.primary.main,
  },
  actionButtonPrimaryText: { fontSize: 12, fontWeight: '600', color: COLORS.text.white },
  actionButtonDanger: {
    paddingVertical: SPACING.xs + 2,
    paddingHorizontal: SPACING.md + 2,
    borderRadius: BORDER_RADIUS.pill,
    borderWidth: 1,
    borderColor: COLORS.functional.error,
    backgroundColor: COLORS.neutral.white,
  },
  actionButtonDangerText: { fontSize: 12, fontWeight: '600', color: COLORS.functional.error },

  // 빈 상태
  emptySection: { flex: 1, alignItems: 'center', paddingTop: 60 },
  emptyIcon: { marginBottom: SPACING.lg },
  emptyText: { fontSize: 15, color: COLORS.text.tertiary, marginBottom: SPACING.screen.horizontal },
  emptyButton: {
    paddingVertical: SPACING.sm + 2,
    paddingHorizontal: SPACING.xl,
    borderRadius: BORDER_RADIUS.pill,
    backgroundColor: COLORS.primary.main,
  },
  emptyButtonText: { color: COLORS.text.white, fontSize: 14, fontWeight: '600' },

  // ── 모달 (취소 다이얼로그 / 변경 모달) ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.screen.horizontal,
  },
  modal: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: COLORS.neutral.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.xl,
    maxHeight: '85%',
  },
  modalScroll: { marginBottom: SPACING.md },
  modalTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text.primary, marginBottom: SPACING.xs },
  modalRestaurant: { fontSize: 13, color: COLORS.text.secondary, marginBottom: SPACING.md },
  modalBody: { marginBottom: SPACING.lg },
  modalLoadingWrap: { justifyContent: 'center', alignItems: 'center', paddingVertical: SPACING.lg },
  refundLine: { fontSize: 14, color: COLORS.text.primary, lineHeight: 22 },
  refundAmount: { fontWeight: '700', color: COLORS.primary.main },
  imminentWarning: {
    marginTop: SPACING.sm,
    paddingVertical: SPACING.xs + 2,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.functional.errorLight,
  },
  imminentWarningText: { color: COLORS.functional.error, fontSize: 12, fontWeight: '600' },
  modalActions: { flexDirection: 'row', gap: SPACING.sm },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.neutral.grey200,
    backgroundColor: COLORS.neutral.white,
  },
  modalCancelBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.text.secondary },
  modalConfirmBtn: {
    flex: 1,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.primary.main,
  },
  modalConfirmDangerBtn: {
    flex: 1,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.functional.error,
  },
  modalConfirmBtnText: { fontSize: 14, fontWeight: '700', color: COLORS.text.white },
  btnDisabled: { opacity: 0.5 },

  // 변경 모달 필드
  modifyField: { marginBottom: SPACING.lg },
  modifyLabel: { fontSize: 13, fontWeight: '600', color: COLORS.text.primary, marginBottom: SPACING.sm },
  modifyHint: { fontSize: 13, color: COLORS.text.tertiary },
  modifyDateInput: {
    paddingVertical: SPACING.sm + 2,
    paddingHorizontal: SPACING.md + 2,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.neutral.grey200,
    fontSize: 14,
    color: COLORS.text.primary,
    backgroundColor: COLORS.neutral.white,
  },
  modifySlotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  modifySlotButton: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md + 2,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    minWidth: 60,
    alignItems: 'center',
  },
  modifyPartyRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xl },
  modifyPmButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.neutral.grey200,
    backgroundColor: COLORS.neutral.white,
  },
  modifyPmButtonText: { fontSize: 18, fontWeight: '600', color: COLORS.text.primary },
  modifyPartyText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text.primary,
    minWidth: 44,
    textAlign: 'center',
  },
});

export default MyReservationsScreen;
