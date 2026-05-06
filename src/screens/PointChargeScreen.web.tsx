import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { useNavigate } from 'react-router-dom';
import { COLORS, SHADOWS, CARD_STYLE, CSS_SHADOWS } from '../styles/colors';
import { HEADER_STYLE } from '../styles/spacing';
import { Icon } from '../components/Icon';
import apiClient from '../services/apiClient';
import { useToast } from '../hooks/useToast';
import Toast from '../components/Toast';

const PointChargeScreen: React.FC = () => {
  const navigate = useNavigate();
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [chargeButtonHovered, setChargeButtonHovered] = useState(false);
  const [hoveredPreset, setHoveredPreset] = useState<number | null>(null);
  const { toast, showSuccess, showError, showInfo, hideToast } = useToast();

  const isDisabled = !amount || parseInt(amount) < 1000 || loading;
  const presetAmounts = [1000, 3000, 5000, 10000, 20000, 50000];

  const handleAmountSelect = (selectedAmount: number) => {
    setAmount(selectedAmount.toString());
  };

  const handleCharge = async () => {
    const chargeAmount = parseInt(amount);

    if (!chargeAmount || chargeAmount < 1000) {
      showInfo('최소 충전 금액은 1,000원입니다.');
      return;
    }

    if (chargeAmount > 100000) {
      showInfo('최대 충전 금액은 100,000원입니다.');
      return;
    }

    setLoading(true);
    try {
      const response = await apiClient.post('/users/charge-points', {
        amount: chargeAmount,
        description: `포인트 충전 ${chargeAmount.toLocaleString()}원`
      });

      if (response.data.success) {
        showSuccess(`${chargeAmount.toLocaleString()}원이 충전되었습니다.`);
        setTimeout(() => navigate('/point-history'), 1000);
      } else {
        showError(response.data.message || '포인트 충전에 실패했습니다.');
      }
    } catch (error: any) {
      showError('포인트 충전 중 오류가 발생했습니다.');
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
            충전된 포인트는 예약 결제에 사용할 수 있습니다.
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
              <div
                key={presetAmount}
                style={{
                  transition: 'all 150ms ease',
                  transform: hoveredPreset === presetAmount ? 'scale(1.04)' : 'scale(1)',
                }}
                onMouseEnter={() => setHoveredPreset(presetAmount)}
                onMouseLeave={() => setHoveredPreset(null)}
              >
                <TouchableOpacity
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
              </div>
            ))}
          </View>
        </View>

        {/* 결제 방법 안내 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>결제 방법</Text>
          <View style={styles.paymentMethodCard}>
            <Icon name="credit-card" size={24} color={COLORS.primary.main} />
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
        <div
          style={{
            background: isDisabled ? '#E0E0E0' : '#FFA529',
            borderRadius: 12,
            cursor: isDisabled ? 'default' : 'pointer',
            transition: 'all 200ms ease',
            transform: chargeButtonHovered && !isDisabled ? 'scale(1.02)' : 'scale(1)',
          }}
          onMouseEnter={() => !isDisabled && setChargeButtonHovered(true)}
          onMouseLeave={() => setChargeButtonHovered(false)}
        >
          <TouchableOpacity
            style={styles.chargeButton}
            onPress={handleCharge}
            disabled={isDisabled}
          >
            <Text style={[styles.chargeButtonText, isDisabled && styles.chargeButtonTextDisabled]}>
              {loading ? '충전 중...' : `${amount ? (parseInt(amount) || 0).toLocaleString() : '0'}원 충전하기`}
            </Text>
          </TouchableOpacity>
        </div>
      </View>

      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.neutral.grey100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...HEADER_STYLE.sub,
    zIndex: 10,
  },
  backButton: {
    padding: 10,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    ...HEADER_STYLE.subTitle,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(212,136,44,0.06)',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(212,136,44,0.10)',
  },
  infoText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: COLORS.text.secondary,
    lineHeight: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: 12,
  },
  amountInput: {
    borderWidth: 2,
    borderColor: '#f1f2f3',
    borderRadius: 12,
    padding: 20,
    fontSize: 28,
    fontWeight: '700',
    color: '#121212',
    backgroundColor: COLORS.neutral.white,
    textAlign: 'center',
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
    borderColor: '#E0E0E0',
    backgroundColor: COLORS.neutral.white,
    minWidth: 90,
    alignItems: 'center',
  },
  presetButtonSelected: {
    borderColor: '#FFA529',
    backgroundColor: '#FFF5E6',
    borderWidth: 1.5,
  },
  presetButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#293038',
  },
  presetButtonTextSelected: {
    color: '#FFA529',
    fontWeight: '700',
  },
  paymentMethodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.neutral.white,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f1f2f3',
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
    position: 'sticky',
    bottom: 0,
    borderTopWidth: 1,
    borderTopColor: '#f1f2f3',
  },
  chargeButton: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  chargeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  chargeButtonTextDisabled: {
    color: '#999999',
  },
});

export default PointChargeScreen;
