import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { useTypedNavigation } from '../hooks/useNavigation';
import { Icon } from '../components/Icon';
import { COLORS, SHADOWS, CARD_STYLE } from '../styles/colors';
import { BORDER_RADIUS } from '../styles/spacing';
import restaurantApiService, {
  Restaurant,
  TimeSlot,
  RefundPolicyTier,
} from '../services/restaurantApiService';
import useCartStore from '../store/cartStore';
import useReservationStore from '../store/reservationStore';

// ============================================================
// ReservationFormScreen — 잇테이블 v2 예약 폼 (React Native 포팅)
// 웹(.web.tsx)과 데이터/로직 동일, UI만 RN 변환.
// 날짜 선택: datetimepicker 미설치 → TextInput(YYYY-MM-DD)로 대체.
// ============================================================

type FormRouteParams = { restaurantId: string };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const ReservationFormScreen: React.FC = () => {
  const navigation = useTypedNavigation();
  const route = useRoute<RouteProp<Record<string, FormRouteParams>, string>>();
  const { restaurantId } = route.params || ({} as FormRouteParams);
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
  const [refundPolicy, setRefundPolicy] = useState<RefundPolicyTier[]>([]);

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

  // 매장 환불정책 조회 (공개)
  useEffect(() => {
    if (!restaurantId) return;
    restaurantApiService
      .getRefundPolicy(restaurantId)
      .then((tiers) => setRefundPolicy(Array.isArray(tiers) ? tiers : []))
      .catch(() => setRefundPolicy([]));
  }, [restaurantId]);

  // 유효한 날짜(YYYY-MM-DD)일 때만 슬롯 조회
  const isValidDate = DATE_RE.test(selectedDate);

  useEffect(() => {
    if (!restaurantId || !selectedDate || !isValidDate) {
      setTimeSlots([]);
      return;
    }
    setLoadingSlots(true);
    setSelectedTime('');
    restaurantApiService
      .getTimeSlots(restaurantId, selectedDate)
      .then((slots) => setTimeSlots(Array.isArray(slots) ? slots : []))
      .catch(() => setTimeSlots([]))
      .finally(() => setLoadingSlots(false));
  }, [restaurantId, selectedDate, isValidDate]);

  const formatPrice = (n: number) => n.toLocaleString('ko-KR');

  // 환불정책 안내 문장 — 정책 없으면 기본값(당일 50% / 1일 전 90% / 그 외 100%)
  const refundPolicyLines: string[] =
    refundPolicy.length > 0
      ? [...refundPolicy]
          .sort((a, b) => b.daysBefore - a.daysBefore)
          .map((tier) =>
            tier.daysBefore <= 0
              ? `예약 당일 ${tier.refundRate}% 환불`
              : `예약 ${tier.daysBefore}일 전 ${tier.refundRate}% 환불`,
          )
      : ['예약 1일 전까지 90% 환불', '예약 당일 50% 환불', '그 외 100% 환불'];

  // 현재 매장 장바구니만 사용
  const isCurrentCart = !!restaurantId && cartStore.restaurantId === restaurantId;
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
      (navigation as any).navigate('Payment', { reservationId });
    } catch (err: any) {
      Alert.alert('알림', err.message || '예약 생성에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  }, [
    restaurantId,
    selectedDate,
    selectedTime,
    partySize,
    specialRequest,
    submitting,
    reservationStore,
    navigation,
  ]);

  // 선주문이 핵심 서비스 — 메뉴 1개 이상 필수
  const hasMenu = isCurrentCart && cartStore.items.length > 0;
  const canSubmit = !!selectedDate && isValidDate && !!selectedTime && partySize > 0 && hasMenu && !submitting;

  if (loading) {
    return (
      <View style={s.wrapper}>
        <View style={s.loadingWrap}>
          <ActivityIndicator size="large" color={COLORS.primary.main} />
        </View>
      </View>
    );
  }

  return (
    <View style={s.wrapper}>
      <ScrollView style={s.container} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* 헤더 */}
        <View style={s.header}>
          <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
            <Icon name="arrow-left" size={20} color={COLORS.text.primary} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>예약하기</Text>
          <View style={{ width: 36 }} />
        </View>

        {/* 매장 요약 */}
        {restaurant && (
          <View style={s.restaurantSummary}>
            <Text style={s.restaurantName}>{restaurant.name}</Text>
            {!!restaurant.category && <Text style={s.categoryChip}>{restaurant.category}</Text>}
          </View>
        )}

        {/* 날짜 선택 */}
        <View style={s.section}>
          <Text style={s.label}>날짜</Text>
          <TextInput
            value={selectedDate}
            onChangeText={setSelectedDate}
            placeholder={`${minDate} ~ ${maxDate}`}
            placeholderTextColor={COLORS.neutral.grey400}
            keyboardType="numbers-and-punctuation"
            autoCapitalize="none"
            autoCorrect={false}
            style={s.dateInput}
          />
          <Text style={s.dateHint}>YYYY-MM-DD 형식으로 입력해주세요.</Text>
        </View>

        {/* 시간 선택 */}
        <View style={s.section}>
          <Text style={s.label}>시간</Text>
          {!selectedDate || !isValidDate ? (
            <Text style={s.hintText}>날짜를 먼저 선택해주세요.</Text>
          ) : loadingSlots ? (
            <ActivityIndicator size="small" color={COLORS.primary.main} />
          ) : timeSlots.length === 0 ? (
            <Text style={s.hintText}>
              이 날짜는 예약 가능한 시간이 없어요.{'\n'}다른 날짜를 선택하거나 매장에 전화로
              문의해보세요.
            </Text>
          ) : (
            <View style={s.slotGrid}>
              {timeSlots.map((slot) => {
                const isSelected = selectedTime === slot.time;
                return (
                  <TouchableOpacity
                    key={slot.time}
                    disabled={!slot.available}
                    onPress={() => slot.available && setSelectedTime(slot.time)}
                    style={[
                      s.slotButton,
                      {
                        backgroundColor: isSelected
                          ? COLORS.primary.main
                          : slot.available
                          ? '#FFFFFF'
                          : COLORS.neutral.light,
                        borderColor: isSelected ? COLORS.primary.main : 'rgba(17,17,17,0.1)',
                      },
                    ]}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: '500',
                        textAlign: 'center',
                        color: isSelected
                          ? '#FFFFFF'
                          : slot.available
                          ? COLORS.text.primary
                          : COLORS.text.tertiary,
                      }}
                    >
                      {slot.time}
                    </Text>
                    {slot.remainingSeats != null && (
                      <Text
                        style={{
                          fontSize: 10,
                          textAlign: 'center',
                          color: isSelected ? '#FFFFFF' : COLORS.text.tertiary,
                        }}
                      >
                        {slot.remainingSeats}석
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* 인원 선택 */}
        <View style={s.section}>
          <Text style={s.label}>인원</Text>
          <View style={s.partySizeRow}>
            <TouchableOpacity
              style={[s.pmButton, partySize <= 1 ? s.pmButtonDisabled : null]}
              disabled={partySize <= 1}
              onPress={() => partySize > 1 && setPartySize(partySize - 1)}
            >
              <Text style={s.pmButtonText}>-</Text>
            </TouchableOpacity>
            <Text style={s.partySizeText}>{partySize}명</Text>
            <TouchableOpacity
              style={[s.pmButton, partySize >= 20 ? s.pmButtonDisabled : null]}
              disabled={partySize >= 20}
              onPress={() => partySize < 20 && setPartySize(partySize + 1)}
            >
              <Text style={s.pmButtonText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 장바구니 요약 */}
        {hasMenu ? (
          <View style={s.section}>
            <Text style={s.label}>선택 메뉴</Text>
            <View style={s.cartList}>
              {cartStore.items.map((item) => (
                <View key={item.menuId} style={s.cartItem}>
                  <Text style={s.cartItemName}>
                    {item.menuName} x{item.quantity}
                    {item.optionLabel ? (
                      <Text style={s.cartItemOption}> ({item.optionLabel})</Text>
                    ) : null}
                  </Text>
                  <Text style={s.cartItemPrice}>{formatPrice(item.subtotal)}원</Text>
                </View>
              ))}
              <View style={s.cartTotal}>
                <Text style={s.cartTotalLabel}>총액</Text>
                <Text style={s.cartTotalPrice}>{formatPrice(totalAmount)}원</Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={s.section}>
            <Text style={s.label}>선택 메뉴</Text>
            <Text style={s.hintText}>선주문할 메뉴를 1개 이상 선택해주세요.</Text>
            <TouchableOpacity
              style={s.selectMenuButton}
              onPress={() =>
                restaurantId &&
                (navigation as any).navigate('RestaurantDetail', { restaurantId })
              }
            >
              <Text style={s.selectMenuButtonText}>메뉴 선택하러 가기</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 요청사항 */}
        <View style={s.section}>
          <Text style={s.label}>요청사항 (선택)</Text>
          <TextInput
            placeholder="알레르기, 특별 요청 등을 적어주세요"
            placeholderTextColor={COLORS.neutral.grey400}
            value={specialRequest}
            onChangeText={setSpecialRequest}
            style={s.textarea}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        {/* 환불정책 안내 */}
        <View style={s.section}>
          <Text style={s.label}>취소·환불 정책</Text>
          <View style={s.refundPolicyBox}>
            {refundPolicyLines.map((line, idx) => (
              <View key={idx} style={s.refundPolicyLine}>
                <Text style={s.refundPolicyDot}>•</Text>
                <Text style={s.refundPolicyText}>{line}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* 결제 버튼 */}
        <View style={s.submitSection}>
          <TouchableOpacity
            disabled={!canSubmit}
            onPress={canSubmit ? handleSubmit : undefined}
            style={[s.submitButton, !canSubmit ? s.submitButtonDisabled : null]}
          >
            <Text style={s.submitButtonText}>{submitting ? '처리 중...' : '결제하기'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

// ── Styles ──

const s = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: COLORS.neutral.background },
  container: { flex: 1 },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 120 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(17,17,17,0.06)',
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: COLORS.text.primary },

  restaurantSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(17,17,17,0.06)',
  },
  restaurantName: { fontSize: 16, fontWeight: '700', color: COLORS.text.primary, marginRight: 10 },
  categoryChip: {
    fontSize: 12,
    fontWeight: '600',
    paddingVertical: 2,
    paddingHorizontal: 10,
    borderRadius: BORDER_RADIUS.pill,
    backgroundColor: COLORS.secondary.light,
    color: COLORS.text.secondary,
    overflow: 'hidden',
  },

  section: { paddingHorizontal: 20, paddingTop: 20 },
  label: { fontSize: 14, fontWeight: '600', color: COLORS.text.primary, marginBottom: 10 },
  hintText: { fontSize: 13, color: COLORS.text.tertiary, lineHeight: 21 },
  selectMenuButton: {
    marginTop: 10,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.primary.main,
    borderRadius: BORDER_RADIUS.md,
  },
  selectMenuButtonText: { color: COLORS.primary.main, fontSize: 14, fontWeight: '600' },

  dateInput: {
    width: '100%',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(17,17,17,0.1)',
    fontSize: 14,
    color: COLORS.text.primary,
    backgroundColor: '#FFFFFF',
  },
  dateHint: { fontSize: 12, color: COLORS.text.tertiary, marginTop: 6 },

  slotGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  slotButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    minWidth: 64,
    marginRight: 8,
    marginBottom: 8,
  },

  partySizeRow: { flexDirection: 'row', alignItems: 'center' },
  pmButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.neutral.grey200,
    backgroundColor: '#FFFFFF',
  },
  pmButtonDisabled: { opacity: 0.3 },
  pmButtonText: { fontSize: 18, fontWeight: '600', color: COLORS.text.primary },
  partySizeText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text.primary,
    minWidth: 48,
    textAlign: 'center',
    marginHorizontal: 20,
  },

  cartList: {
    borderRadius: CARD_STYLE.borderRadius,
    borderWidth: 1,
    borderColor: CARD_STYLE.borderColor,
    padding: 14,
    backgroundColor: '#FFFFFF',
  },
  cartItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  cartItemName: { flex: 1, fontSize: 13, color: COLORS.text.primary, marginRight: 8 },
  cartItemOption: { fontSize: 12, color: COLORS.text.tertiary },
  cartItemPrice: { fontSize: 13, color: COLORS.text.secondary, fontWeight: '600' },
  cartTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(17,17,17,0.06)',
    marginTop: 8,
  },
  cartTotalLabel: { fontSize: 15, fontWeight: '700', color: COLORS.text.primary },
  cartTotalPrice: { fontSize: 15, fontWeight: '700', color: COLORS.primary.main },

  textarea: {
    width: '100%',
    minHeight: 80,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(17,17,17,0.1)',
    fontSize: 14,
    color: COLORS.text.primary,
    backgroundColor: '#FFFFFF',
  },

  refundPolicyBox: {
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: CARD_STYLE.borderColor,
    padding: 14,
    backgroundColor: COLORS.neutral.light,
  },
  refundPolicyLine: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 },
  refundPolicyDot: { color: COLORS.text.tertiary, marginRight: 6, fontSize: 13, lineHeight: 20 },
  refundPolicyText: { flex: 1, fontSize: 13, color: COLORS.text.secondary, lineHeight: 20 },

  submitSection: { paddingHorizontal: 20, paddingTop: 24 },
  submitButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.primary.main,
    alignItems: 'center',
    ...SHADOWS.cta,
  },
  submitButtonDisabled: { opacity: 0.5 },
  submitButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});

export default ReservationFormScreen;
