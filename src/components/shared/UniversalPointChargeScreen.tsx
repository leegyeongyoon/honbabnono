import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  SafeAreaView
} from 'react-native';
import { COLORS, SHADOWS, LAYOUT } from '../../styles/colors';
import { Icon } from '../Icon';
import apiClient from '../../services/apiClient';

interface UniversalPointChargeScreenProps {
  navigation?: any;
  user?: any;
  onNavigate?: (screen: string, params?: any) => void;
  onGoBack?: () => void;
}

const UniversalPointChargeScreen: React.FC<UniversalPointChargeScreenProps> = ({
  navigation,
  user,
  onNavigate,
  onGoBack
}) => {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const presetAmounts = [1000, 3000, 5000, 10000, 20000, 50000];

  const handleGoBackPress = () => {
    if (onGoBack) {
      onGoBack();
    } else if (navigation?.goBack) {
      navigation.goBack();
    } else if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.location.href = '/point-history';
    }
  };

  const handleNavigate = (screen: string, params?: any) => {
    if (onNavigate) {
      onNavigate(screen, params);
    } else if (navigation?.navigate) {
      navigation.navigate(screen, params);
    } else if (Platform.OS === 'web' && typeof window !== 'undefined') {
      if (screen === 'PointHistory') {
        window.location.href = '/point-history';
      }
    }
  };

  const handleAmountSelect = (selectedAmount: number) => {
    setAmount(selectedAmount.toString());
  };

  const handleAmountChange = (text: string) => {
    // Only allow numbers
    const numericValue = text.replace(/[^0-9]/g, '');
    setAmount(numericValue);
  };

  const handleCharge = async () => {
    const chargeAmount = parseInt(amount);

    if (!chargeAmount || chargeAmount < 1000) {
      Alert.alert('알림', '최소 충전 금액은 1,000원입니다.');
      return;
    }

    if (chargeAmount > 100000) {
      Alert.alert('알림', '최대 충전 금액은 100,000원입니다.');
      return;
    }

    setLoading(true);
    try {
      const response = await apiClient.post('/users/charge-points', {
        amount: chargeAmount,
        description: `포인트 충전 ${chargeAmount.toLocaleString()}원`
      });

      if (response.data.success) {
        Alert.alert(
          '충전 완료',
          `${chargeAmount.toLocaleString()}원이 충전되었습니다.`,
          [
            {
              text: '확인',
              onPress: () => handleNavigate('PointHistory')
            }
          ]
        );
      } else {
        Alert.alert('오류', response.data.message || '포인트 충전에 실패했습니다.');
      }
    } catch (_error: any) {
      Alert.alert('오류', '포인트 충전 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (value: string) => {
    if (!value) {return '';}
    const numericValue = parseInt(value);
    return isNaN(numericValue) ? '' : numericValue.toLocaleString();
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleGoBackPress}
        >
          <Icon name="chevron-left" size={24} color={COLORS.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>포인트 충전</Text>
        <View style={styles.backButton} />
      </View>

      <View style={styles.content}>
        {/* 충전 안내 */}
        <View style={styles.infoCard}>
          <Icon name="info" size={20} color={COLORS.primary.accent} />
          <Text style={styles.infoText}>
            충전된 포인트는 모임 참가비로 사용할 수 있습니다.{'\n'}
            모임 완료 후 자동으로 환불처리 됩니다.
          </Text>
        </View>

        {/* 현재 보유 포인트 */}
        <View style={styles.currentPointsCard}>
          <View style={styles.pointsHeader}>
            <Icon name="star" size={18} color={COLORS.primary.accent} />
            <Text style={styles.currentPointsLabel}>현재 보유 포인트</Text>
          </View>
          <Text style={styles.currentPointsValue}>
            {user?.points?.toLocaleString() || '0'} P
          </Text>
        </View>

        {/* 충전 금액 입력 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>충전 금액</Text>
          <View style={styles.amountInputContainer}>
            <TextInput
              style={styles.amountInput}
              placeholder="충전할 금액을 입력하세요"
              placeholderTextColor={COLORS.neutral.grey400}
              value={formatAmount(amount)}
              onChangeText={handleAmountChange}
              keyboardType="number-pad"
              maxLength={7} // 100,000 max with commas
            />
            <Text style={styles.amountUnit}>원</Text>
          </View>
          <Text style={styles.amountHint}>최소 1,000원 ~ 최대 100,000원</Text>
        </View>

        {/* 추천 금액 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>추천 금액</Text>
          <View style={styles.presetContainer}>
            {presetAmounts.map((presetAmount) => (
              <TouchableOpacity
                key={presetAmount}
                style={[
                  styles.presetButton,
                  amount === presetAmount.toString() && styles.presetButtonSelected
                ]}
                onPress={() => handleAmountSelect(presetAmount)}
              >
                <Text style={[
                  styles.presetButtonText,
                  amount === presetAmount.toString() && styles.presetButtonTextSelected
                ]}>
                  {presetAmount.toLocaleString()}원
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 결제 방법 안내 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>결제 방법</Text>
          <View style={styles.paymentMethodCard}>
            <Icon name="credit-card" size={22} color={COLORS.functional.warning} />
            <View style={styles.paymentMethodInfo}>
              <Text style={styles.paymentMethodTitle}>카카오페이</Text>
              <Text style={styles.paymentMethodDescription}>
                간편하고 안전한 결제
              </Text>
            </View>
            <View style={styles.paymentMethodBadge}>
              <Text style={styles.paymentMethodBadgeText}>기본</Text>
            </View>
          </View>

          <View style={styles.paymentMethodCardSecondary}>
            <Icon name="credit-card" size={22} color={COLORS.text.tertiary} />
            <View style={styles.paymentMethodInfo}>
              <Text style={styles.paymentMethodTitle}>신용/체크카드</Text>
              <Text style={styles.paymentMethodDescription}>
                카드로 직접 결제
              </Text>
            </View>
            <View style={styles.paymentMethodBadgeSecondary}>
              <Text style={styles.paymentMethodBadgeTextSecondary}>지원예정</Text>
            </View>
          </View>
        </View>

        {/* 이용 안내 */}
        <View style={styles.noticeSection}>
          <Text style={styles.noticeTitle}>이용 안내</Text>
          <Text style={styles.noticeText}>
            • 충전한 포인트는 모임 참가비 결제에만 사용 가능합니다{'\n'}
            • 모임 참여 후 정상 완료 시 전액 환불됩니다{'\n'}
            • 노쇼 발생 시 포인트는 차감됩니다{'\n'}
            • 포인트 유효기간은 1년입니다
          </Text>
        </View>
      </View>

      {/* 충전 버튼 */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity
          style={[
            styles.chargeButton,
            (!amount || parseInt(amount) < 1000 || loading) && styles.chargeButtonDisabled
          ]}
          onPress={handleCharge}
          disabled={!amount || parseInt(amount) < 1000 || loading}
        >
          <Text style={styles.chargeButtonText}>
            {loading ? '충전 중...' : `${amount ? parseInt(amount).toLocaleString() : '0'}원 충전하기`}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.neutral.background,
  },
  header: {
    height: LAYOUT.HEADER_HEIGHT || 56,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    backgroundColor: COLORS.neutral.white,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(17,17,17,0.06)',
    ...SHADOWS.sticky,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text.primary,
    letterSpacing: -0.3,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.primary.accent + '08',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary.accent,
  },
  infoText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: COLORS.text.secondary,
    lineHeight: 20,
  },
  currentPointsCard: {
    backgroundColor: COLORS.neutral.white,
    padding: 20,
    borderRadius: 8,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(17,17,17,0.06)',
    ...SHADOWS.small,
  },
  pointsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  currentPointsLabel: {
    fontSize: 13,
    color: COLORS.text.tertiary,
    marginLeft: 8,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  currentPointsValue: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text.primary,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 10,
    letterSpacing: -0.1,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.neutral.white,
    borderWidth: 1,
    borderColor: 'rgba(17,17,17,0.06)',
    borderRadius: 8,
    paddingHorizontal: 16,
    ...SHADOWS.small,
  },
  amountInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text.primary,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  amountUnit: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text.tertiary,
    marginLeft: 8,
  },
  amountHint: {
    fontSize: 12,
    color: COLORS.text.tertiary,
    textAlign: 'center',
    marginTop: 8,
  },
  presetContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  presetButton: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(17,17,17,0.06)',
    backgroundColor: COLORS.neutral.white,
    minWidth: 90,
    alignItems: 'center',
    ...SHADOWS.small,
  },
  presetButtonSelected: {
    borderColor: COLORS.primary.accent,
    backgroundColor: COLORS.primary.accent + '08',
  },
  presetButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text.secondary,
  },
  presetButtonTextSelected: {
    color: COLORS.primary.accent,
    fontWeight: '600',
  },
  paymentMethodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.neutral.white,
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(17,17,17,0.06)',
    ...SHADOWS.small,
  },
  paymentMethodCardSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.neutral.white,
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(17,17,17,0.06)',
    marginTop: 8,
    ...SHADOWS.small,
  },
  paymentMethodInfo: {
    flex: 1,
    marginLeft: 12,
  },
  paymentMethodTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 2,
    letterSpacing: -0.1,
  },
  paymentMethodDescription: {
    fontSize: 13,
    color: COLORS.text.tertiary,
  },
  paymentMethodBadge: {
    backgroundColor: COLORS.primary.accent,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  paymentMethodBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.neutral.white,
    letterSpacing: 0.3,
  },
  paymentMethodBadgeSecondary: {
    backgroundColor: COLORS.neutral.grey100,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  paymentMethodBadgeTextSecondary: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.text.tertiary,
    letterSpacing: 0.3,
  },
  noticeSection: {
    backgroundColor: COLORS.neutral.light,
    padding: 16,
    borderRadius: 8,
    marginTop: 4,
  },
  noticeTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  noticeText: {
    fontSize: 12,
    color: COLORS.text.tertiary,
    lineHeight: 18,
  },
  bottomContainer: {
    padding: 20,
    backgroundColor: COLORS.neutral.white,
    borderTopWidth: 1,
    borderTopColor: 'rgba(17,17,17,0.06)',
    ...SHADOWS.sticky,
  },
  chargeButton: {
    backgroundColor: COLORS.primary.accent,
    paddingVertical: 16,
    borderRadius: 6,
    alignItems: 'center',
    ...SHADOWS.cta,
  },
  chargeButtonDisabled: {
    backgroundColor: COLORS.neutral.grey300,
    shadowOpacity: 0,
  },
  chargeButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text.white,
    letterSpacing: -0.2,
  },
});

export default UniversalPointChargeScreen;
