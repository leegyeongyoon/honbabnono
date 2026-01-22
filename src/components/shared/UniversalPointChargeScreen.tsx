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
    } catch (error: any) {
      console.error('포인트 충전 오류:', error);
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
          <Icon name="info" size={24} color={COLORS.primary.main} />
          <Text style={styles.infoText}>
            충전된 포인트는 모임 참가비로 사용할 수 있습니다.{'\n'}
            모임 완료 후 자동으로 환불처리 됩니다.
          </Text>
        </View>

        {/* 현재 보유 포인트 */}
        <View style={styles.currentPointsCard}>
          <View style={styles.pointsHeader}>
            <Icon name="star" size={20} color={COLORS.functional.warning} />
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
            <Icon name="credit-card" size={24} color={COLORS.functional.warning} />
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
          
          <View style={[styles.paymentMethodCard, { marginTop: 8 }]}>
            <Icon name="credit-card" size={24} color={COLORS.primary.main} />
            <View style={styles.paymentMethodInfo}>
              <Text style={styles.paymentMethodTitle}>신용/체크카드</Text>
              <Text style={styles.paymentMethodDescription}>
                카드로 직접 결제
              </Text>
            </View>
            <View style={[styles.paymentMethodBadge, { backgroundColor: COLORS.primary.light }]}>
              <Text style={[styles.paymentMethodBadgeText, { color: COLORS.primary.main }]}>지원예정</Text>
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
    ...SHADOWS.small,
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
  },
  content: {
    flex: 1,
    padding: 20,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.primary.light,
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary.main,
  },
  infoText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: COLORS.primary.dark,
    lineHeight: 20,
  },
  currentPointsCard: {
    backgroundColor: COLORS.neutral.white,
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
    ...SHADOWS.medium,
    shadowColor: 'rgba(0,0,0,0.05)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
  },
  pointsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  currentPointsLabel: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginLeft: 8,
    fontWeight: '500',
  },
  currentPointsValue: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text.primary,
    textAlign: 'center',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 12,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.neutral.white,
    borderWidth: 1,
    borderColor: COLORS.neutral.grey200,
    borderRadius: 16,
    paddingHorizontal: 16,
    ...SHADOWS.small,
  },
  amountInput: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text.primary,
    textAlign: 'center',
  },
  amountUnit: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text.secondary,
    marginLeft: 8,
  },
  amountHint: {
    fontSize: 12,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginTop: 8,
  },
  presetContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  presetButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.neutral.grey200,
    backgroundColor: COLORS.neutral.white,
    minWidth: 90,
    alignItems: 'center',
    ...SHADOWS.small,
  },
  presetButtonSelected: {
    borderColor: COLORS.primary.main,
    backgroundColor: COLORS.primary.light,
  },
  presetButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text.secondary,
  },
  presetButtonTextSelected: {
    color: COLORS.primary.main,
    fontWeight: '600',
  },
  paymentMethodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.neutral.white,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.neutral.grey200,
    ...SHADOWS.small,
  },
  paymentMethodInfo: {
    flex: 1,
    marginLeft: 12,
  },
  paymentMethodTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  paymentMethodDescription: {
    fontSize: 13,
    color: COLORS.text.secondary,
  },
  paymentMethodBadge: {
    backgroundColor: COLORS.functional.warning,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  paymentMethodBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  noticeSection: {
    backgroundColor: COLORS.neutral.background,
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  noticeTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  noticeText: {
    fontSize: 12,
    color: COLORS.text.secondary,
    lineHeight: 18,
  },
  bottomContainer: {
    padding: 20,
    backgroundColor: COLORS.neutral.white,
    ...SHADOWS.medium,
  },
  chargeButton: {
    backgroundColor: COLORS.primary.main,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    ...SHADOWS.medium,
    shadowColor: 'rgba(102, 126, 234, 0.3)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 16,
  },
  chargeButtonDisabled: {
    backgroundColor: COLORS.neutral.grey300,
    shadowOpacity: 0,
  },
  chargeButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text.white,
  },
});

export default UniversalPointChargeScreen;