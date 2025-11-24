import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useNavigate } from 'react-router-dom';
import { COLORS, SHADOWS } from '../styles/colors';
import { Icon } from '../components/Icon';
import apiClient from '../services/apiClient';

const PointChargeScreen: React.FC = () => {
  const navigate = useNavigate();
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const presetAmounts = [1000, 3000, 5000, 10000, 20000, 50000];

  const handleAmountSelect = (selectedAmount: number) => {
    setAmount(selectedAmount.toString());
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
              onPress: () => navigate('/point-history')
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

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigate('/point-history')}
        >
          <Icon name="arrow-left" size={24} color={COLORS.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>포인트 충전</Text>
        <View style={styles.backButton} />
      </View>

      <View style={styles.content}>
        {/* 충전 안내 */}
        <View style={styles.infoCard}>
          <Icon name="info" size={24} color={COLORS.primary.main} />
          <Text style={styles.infoText}>
            충전된 포인트는 모임 참가비로 사용할 수 있습니다.
          </Text>
        </View>

        {/* 충전 금액 입력 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>충전 금액</Text>
          <TextInput
            style={styles.amountInput}
            placeholder="충전할 금액을 입력하세요"
            value={amount}
            onChangeText={setAmount}
            keyboardType="number-pad"
            maxLength={6}
          />
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
            <Icon name="credit-card" size={24} color={COLORS.secondary.main} />
            <View style={styles.paymentMethodInfo}>
              <Text style={styles.paymentMethodTitle}>카카오페이</Text>
              <Text style={styles.paymentMethodDescription}>
                간편하고 안전한 결제
              </Text>
            </View>
          </View>
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.neutral.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
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
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text.primary,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary.light,
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  infoText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: COLORS.primary.dark,
    lineHeight: 20,
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
  amountInput: {
    borderWidth: 1,
    borderColor: COLORS.neutral.grey200,
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.primary,
    backgroundColor: COLORS.neutral.white,
    textAlign: 'center',
    ...SHADOWS.small,
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
    borderRadius: 12,
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
  bottomContainer: {
    padding: 20,
    backgroundColor: COLORS.neutral.white,
    ...SHADOWS.medium,
  },
  chargeButton: {
    backgroundColor: COLORS.primary.main,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    ...SHADOWS.small,
  },
  chargeButtonDisabled: {
    backgroundColor: COLORS.neutral.grey200,
  },
  chargeButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text.white,
  },
});

export default PointChargeScreen;