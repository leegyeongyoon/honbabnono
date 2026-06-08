import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
  Linking,
  SafeAreaView,
} from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { useRoute } from '@react-navigation/native';
import { useTypedNavigation } from '../hooks/useNavigation';
import { Icon } from '../components/Icon';
import { COLORS, CARD_STYLE, SHADOWS } from '../styles/colors';
import { BORDER_RADIUS } from '../styles/spacing';
import useReservationStore from '../store/reservationStore';
import useReservationSocket from '../hooks/useReservationSocket';
import reservationChatApiService from '../services/reservationChatApiService';
import { nextArrivalStep } from '../constants/arrivalStatus';

// ============================================================
// ReservationConfirmScreen — 잇테이블 v2 예약 확정 (React Native)
// 웹(.web.tsx)과 데이터/로직 동일, UI만 RN으로 포팅
// QR: react-native-qrcode-svg 미설치 → 예약번호/코드 텍스트로 대체
// ============================================================

const ReservationConfirmScreen: React.FC = () => {
  const navigation = useTypedNavigation();
  const route = useRoute<any>();
  const reservationId: string | undefined = route.params?.reservationId;
  const reservationStore = useReservationStore();
  const [loading, setLoading] = useState(true);

  const reservation = reservationStore.currentReservation;

  useEffect(() => {
    if (!reservationId) return;
    reservationStore
      .fetchReservationById(reservationId)
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reservationId]);

  // 점주의 상태 변경(준비중/픽업완료 등)을 실시간 반영
  useReservationSocket(reservationId ?? null, {
    onStatusUpdate: () => {
      if (reservationId)
        reservationStore.fetchReservationById(reservationId).catch(() => {});
    },
    onCookingUpdate: () => {
      if (reservationId)
        reservationStore.fetchReservationById(reservationId).catch(() => {});
    },
  });

  if (loading) {
    return (
      <SafeAreaView style={styles.wrapper}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={COLORS.primary.main} />
        </View>
      </SafeAreaView>
    );
  }

  const order = reservation?.order;
  const arrivalStep =
    reservation && ['confirmed', 'preparing'].includes(reservation.status)
      ? nextArrivalStep(reservation.arrivalStatus)
      : null;

  const handleArrival = async (stepValue: string, stepLabel: string) => {
    if (!reservation) return;
    try {
      await reservationStore.updateArrival(reservation.id, stepValue);
      Alert.alert('알림', `'${stepLabel}' 상태를 매장에 알렸습니다.`);
    } catch (err: any) {
      Alert.alert('오류', err?.response?.data?.error || '알림 전송에 실패했습니다.');
    }
  };

  const handleStartChat = async () => {
    if (!reservation) return;
    try {
      const room = await reservationChatApiService.createOrGetRoom(reservation.id);
      // RootTabParamList에 v2 스택 스크린이 아직 없어 as any 캐스트 (MeetupDetailScreen 패턴)
      navigation.navigate('ReservationChat' as any, { roomId: room.id });
    } catch (err: any) {
      Alert.alert('오류', err?.response?.data?.error || '문의를 시작할 수 없습니다.');
    }
  };

  return (
    <SafeAreaView style={styles.wrapper}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* 성공 아이콘 */}
        <View style={styles.successSection}>
          <View style={styles.checkCircle}>
            <Svg width={40} height={40} viewBox="0 0 40 40">
              <Circle cx={20} cy={20} r={20} fill={COLORS.functional.success} />
              <Path
                d="M12 20L18 26L28 14"
                stroke="#FFFFFF"
                strokeWidth={3}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </View>
          <Text style={styles.successTitle}>예약이 확정되었습니다!</Text>
          <Text style={styles.successSubtitle}>매장에서 맛있는 식사를 즐겨보세요.</Text>
        </View>

        {/* 예약 정보 카드 */}
        {reservation && (
          <View style={styles.infoCard}>
            <Text style={styles.cardTitle}>예약 정보</Text>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>매장</Text>
              <Text style={styles.infoValue}>{reservation.restaurantName || '-'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>날짜</Text>
              <Text style={styles.infoValue}>{reservation.reservationDate}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>시간</Text>
              <Text style={styles.infoValue}>{reservation.reservationTime}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>인원</Text>
              <Text style={styles.infoValue}>{reservation.partySize}명</Text>
            </View>

            {/* QR 코드 영역 — RN QR 라이브러리 미설치로 코드값 텍스트 표시 */}
            {reservation.qrCode ? (
              <View style={styles.qrSection}>
                <Text style={styles.qrLabel}>체크인 QR 코드</Text>
                <View style={styles.qrBox}>
                  <View style={styles.qrCodeValueBox}>
                    <Text style={styles.qrCodeValue} selectable>
                      {reservation.qrCode}
                    </Text>
                  </View>
                  <Text style={styles.qrHint}>
                    매장 도착 시 이 코드를 보여주세요.
                  </Text>
                </View>
              </View>
            ) : null}

            {/* 주문 메뉴 */}
            {order?.items && order.items.length > 0 ? (
              <View style={styles.menuSection}>
                <Text style={styles.menuSectionTitle}>주문 메뉴</Text>
                {order.items.map((item: any, idx: number) => (
                  <View key={idx} style={styles.menuRow}>
                    <Text style={styles.menuItemName}>
                      {item.menu_name || item.menuName || item.name} x{item.quantity}
                    </Text>
                    {item.unit_price ? (
                      <Text style={styles.menuItemPrice}>
                        {(item.unit_price * item.quantity).toLocaleString('ko-KR')}원
                      </Text>
                    ) : null}
                  </View>
                ))}
                {order.total_amount ? (
                  <View style={[styles.menuRow, styles.menuTotalRow]}>
                    <Text style={styles.menuTotalLabel}>총 금액</Text>
                    <Text style={styles.menuTotalValue}>
                      {Number(order.total_amount).toLocaleString('ko-KR')}원
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : null}
          </View>
        )}

        {/* 안내 */}
        <View style={styles.noticeBox}>
          <View style={styles.noticeIcon}>
            <Icon name="bell" size={16} color={COLORS.primary.main} />
          </View>
          <Text style={styles.noticeText}>
            예약 시간 30분 전에 도착 알림을 보내드립니다.
          </Text>
        </View>

        {/* 도착 상태 알림 — 확정/준비중일 때 단계별로 매장에 알림 */}
        {reservation && arrivalStep ? (
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.arrivalButton}
            onPress={() => handleArrival(arrivalStep.value, arrivalStep.label)}
          >
            <Text style={styles.arrivalButtonText}>
              {arrivalStep.emoji} {arrivalStep.label} — 매장에 알리기
            </Text>
          </TouchableOpacity>
        ) : null}

        {/* 버튼 */}
        <View style={styles.buttonGroup}>
          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.primaryButton}
            onPress={() => navigation.navigate('MyReservations' as any)}
          >
            <Text style={styles.primaryButtonText}>예약 내역 보기</Text>
          </TouchableOpacity>

          {reservation ? (
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.secondaryButton}
              onPress={handleStartChat}
            >
              <Text style={styles.secondaryButtonText}>💬 매장에 문의</Text>
            </TouchableOpacity>
          ) : null}

          {reservation?.restaurantPhone ? (
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.secondaryButton}
              onPress={() => Linking.openURL(`tel:${reservation.restaurantPhone}`)}
            >
              <Text style={styles.secondaryButtonText}>📞 매장에 전화</Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.secondaryButton}
            onPress={() => navigation.navigate('Home' as any)}
          >
            <Text style={styles.secondaryButtonText}>홈으로</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

// ── Styles ──

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: COLORS.neutral.background,
  },
  container: {
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 20,
  },
  loadingWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 120,
  },

  // 성공 영역
  successSection: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 32,
  },
  checkCircle: {
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 14,
    color: COLORS.text.tertiary,
  },

  // 정보 카드
  infoCard: {
    borderRadius: CARD_STYLE.borderRadius,
    borderWidth: 1,
    borderColor: CARD_STYLE.borderColor,
    padding: 20,
    backgroundColor: '#FFFFFF',
    ...SHADOWS.small,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(17,17,17,0.06)',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 7,
  },
  infoLabel: {
    color: COLORS.text.tertiary,
    fontSize: 14,
  },
  infoValue: {
    color: COLORS.text.primary,
    fontWeight: '500',
    fontSize: 14,
    flexShrink: 1,
    textAlign: 'right',
  },

  // QR
  qrSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(17,17,17,0.06)',
  },
  qrLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text.secondary,
    marginBottom: 10,
  },
  qrBox: {
    padding: 24,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(17,17,17,0.08)',
  },
  qrCodeValueBox: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: COLORS.neutral.light,
    borderRadius: BORDER_RADIUS.sm,
    marginBottom: 12,
  },
  qrCodeValue: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
    color: COLORS.text.primary,
    textAlign: 'center',
  },
  qrHint: {
    fontSize: 12,
    color: COLORS.text.tertiary,
  },

  // 메뉴
  menuSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(17,17,17,0.06)',
  },
  menuSectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text.secondary,
    marginBottom: 8,
  },
  menuRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  menuItemName: {
    fontSize: 14,
    color: COLORS.text.primary,
    flexShrink: 1,
  },
  menuItemPrice: {
    color: COLORS.text.tertiary,
    fontSize: 13,
  },
  menuTotalRow: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(17,17,17,0.06)',
    marginTop: 8,
    paddingTop: 8,
  },
  menuTotalLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  menuTotalValue: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary.main,
  },

  // 안내
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.primary.light,
    borderRadius: BORDER_RADIUS.md,
  },
  noticeIcon: {
    marginRight: 10,
  },
  noticeText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.text.secondary,
    lineHeight: 18,
  },

  // 버튼
  buttonGroup: {
    marginTop: 24,
    gap: 10,
  },
  primaryButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.primary.main,
    alignItems: 'center',
    ...SHADOWS.cta,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.neutral.grey200,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: COLORS.text.secondary,
    fontSize: 15,
    fontWeight: '600',
  },
  arrivalButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: '#FFF8F0',
    borderWidth: 1.5,
    borderColor: COLORS.primary.main,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 12,
  },
  arrivalButtonText: {
    color: COLORS.primary.dark,
    fontSize: 15,
    fontWeight: '700',
  },
});

export default ReservationConfirmScreen;
