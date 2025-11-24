import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { COLORS, SHADOWS } from '../styles/colors';
import depositService from '../services/depositService';
import { PaymentMethod, PaymentRequest } from '../types/deposit';
import { useUserStore } from '../store/userStore';
import { Icon } from './Icon';

interface DepositSelectorProps {
  visible: boolean;
  onClose: () => void;
  onDepositPaid: (depositId: string, amount: number) => void;
  meetupId: string;
}

export const DepositSelector: React.FC<DepositSelectorProps> = ({
  visible,
  onClose,
  onDepositPaid,
  meetupId,
}) => {
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>('kakaopay');
  const [isProcessing, setIsProcessing] = useState(false);
  const [userPoints, setUserPoints] = useState(0);
  const [isPaymentComplete, setIsPaymentComplete] = useState(false);
  const [completedPaymentId, setCompletedPaymentId] = useState<string | null>(null);
  const { user } = useUserStore();

  const defaultPolicy = depositService.getDefaultDepositPolicy();

  // 사용자 포인트 조회
  useEffect(() => {
    const fetchUserPoints = async () => {
      if (user && visible) {
        try {
          const points = await depositService.getUserPoints(user.id);
          setUserPoints(points.availablePoints);
        } catch (error) {
          console.error('포인트 조회 실패:', error);
          setUserPoints(0);
        }
      }
    };
    
    fetchUserPoints();
  }, [user, visible]);

  const paymentMethods = [
    {
      id: 'kakaopay' as PaymentMethod,
      name: '카카오페이',
      description: '간편하게 결제하세요',
      icon: '💳',
      color: COLORS.functional.warning,
    },
    {
      id: 'card' as PaymentMethod,
      name: '신용/체크카드',
      description: '카드로 결제하세요',
      icon: '💳',
      color: COLORS.primary.main,
    },
    {
      id: 'points' as PaymentMethod,
      name: '포인트 결제',
      description: `보유 포인트: ${userPoints.toLocaleString()}P ${userPoints >= defaultPolicy.amount ? '(결제 가능)' : '(포인트 부족)'}`,
      icon: '🎁',
      color: userPoints >= defaultPolicy.amount ? COLORS.functional.error : COLORS.neutral.grey400,
    },
  ];

  const handlePayment = async () => {
    if (!user) {
      Alert.alert('오류', '로그인이 필요합니다.');
      return;
    }

    // 포인트 결제 시 잔액 확인
    if (selectedPaymentMethod === 'points' && userPoints < defaultPolicy.amount) {
      Alert.alert('오류', '보유 포인트가 부족합니다.');
      return;
    }

    setIsProcessing(true);

    try {
      const paymentRequest: PaymentRequest = {
        amount: defaultPolicy.amount,
        userId: user.id,
        meetupId,
        paymentMethod: selectedPaymentMethod,
      };

      console.log('💳 약속금 결제 요청:', paymentRequest);
      const response = await depositService.processPayment(paymentRequest);
      console.log('💳 약속금 결제 응답:', response);

      if (response.success) {
        // 실제로는 DB에서 생성된 약속금 ID를 받아와야 함
        const depositId = response.paymentId || `temp_${Date.now()}`;
        
        // 결제 완료 상태 설정
        setCompletedPaymentId(depositId);
        setIsPaymentComplete(true);
        
        // 카카오페이의 경우 외부 브라우저 열기
        if (selectedPaymentMethod === 'kakaopay' && response.redirectUrl) {
          if (typeof window !== 'undefined') {
            window.open(response.redirectUrl, '_blank');
          }
        }
        
        // 3초 후 자동으로 모달 닫기
        setTimeout(() => {
          onDepositPaid(depositId, defaultPolicy.amount);
          onClose();
          // 상태 리셋
          setIsPaymentComplete(false);
          setCompletedPaymentId(null);
        }, 3000);
      } else {
        Alert.alert('결제 실패', response.errorMessage || '결제 처리 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('결제 오류:', error);
      Alert.alert('결제 실패', '결제 처리 중 오류가 발생했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {isPaymentComplete ? (
          // 결제 완료 화면
          <View style={styles.successContainer}>
            <View style={styles.successIcon}>
              <Icon name="check" size={60} color={COLORS.functional.success} />
            </View>
            <Text style={styles.successTitle}>결제 완료!</Text>
            <Text style={styles.successMessage}>
              약속금이 성공적으로 결제되었습니다
            </Text>
            <Text style={styles.successAmount}>
              {defaultPolicy.amount.toLocaleString()}원
            </Text>
            <Text style={styles.successSubMessage}>
              잠시 후 자동으로 화면이 닫힙니다
            </Text>
          </View>
        ) : (
          <>
            {/* 헤더 */}
            <View style={styles.header}>
          <View style={styles.headerLeft} />
          <Text style={styles.title}>약속금 결제</Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Icon name="x" size={24} color={COLORS.text.secondary} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* 약속금 정보 */}
          <View style={styles.depositInfoCard}>
            <View style={styles.depositHeader}>
              <Text style={styles.depositTitle}>{defaultPolicy.name}</Text>
              <Text style={styles.depositAmount}>{defaultPolicy.amount.toLocaleString()}원</Text>
            </View>
            <Text style={styles.depositDescription}>
              {defaultPolicy.description}
            </Text>
            
            <View style={styles.policyInfo}>
              <Text style={styles.policyTitle}>환불 정책</Text>
              <View style={styles.policyItem}>
                <Text style={styles.policyLabel}>• 정상 참석 + 후기 작성</Text>
                <Text style={styles.policyValue}>100% 환불</Text>
              </View>
              <View style={styles.policyItem}>
                <Text style={styles.policyLabel}>• 정상 참석 (후기 미작성)</Text>
                <Text style={styles.policyValue}>포인트 전환</Text>
              </View>
              <View style={styles.policyItem}>
                <Text style={styles.policyLabel}>• 노쇼</Text>
                <Text style={styles.policyValue}>약속금 몰수</Text>
              </View>
            </View>
          </View>

          {/* 결제 방법 선택 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>결제 방법</Text>
            {paymentMethods.map((method) => {
              const isDisabled = method.id === 'points' && userPoints < defaultPolicy.amount;
              return (
                <TouchableOpacity
                  key={method.id}
                  style={[
                    styles.paymentMethod,
                    selectedPaymentMethod === method.id && styles.selectedPaymentMethod,
                    isDisabled && styles.paymentMethodDisabled,
                  ]}
                  onPress={() => !isDisabled && setSelectedPaymentMethod(method.id)}
                  disabled={isDisabled}
                >
                <View style={styles.paymentMethodLeft}>
                  <View style={[styles.paymentIcon, { backgroundColor: method.color }]}>
                    <Text style={styles.paymentIconText}>{method.icon}</Text>
                  </View>
                  <View style={styles.paymentMethodInfo}>
                    <Text style={styles.paymentMethodName}>{method.name}</Text>
                    <Text style={styles.paymentMethodDescription}>{method.description}</Text>
                  </View>
                </View>
                <View style={[
                  styles.radioButton,
                  selectedPaymentMethod === method.id && styles.radioButtonSelected,
                ]}>
                  {selectedPaymentMethod === method.id && (
                    <View style={styles.radioButtonInner} />
                  )}
                </View>
              </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

            {/* 결제 버튼 */}
            <View style={styles.footer}>
              <TouchableOpacity
                style={[styles.payButton, isProcessing && styles.payButtonDisabled]}
                onPress={handlePayment}
                disabled={isProcessing}
              >
                <Text style={styles.payButtonText}>
                  {isProcessing ? '결제 중...' : `${defaultPolicy.amount.toLocaleString()}원 결제하기`}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.neutral.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.grey200,
  },
  headerLeft: {
    width: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  depositInfoCard: {
    backgroundColor: COLORS.neutral.background,
    borderRadius: 12,
    padding: 20,
    marginVertical: 16,
  },
  depositHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  depositTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  depositAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary.main,
  },
  depositDescription: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  policyInfo: {
    borderTopWidth: 1,
    borderTopColor: COLORS.neutral.grey200,
    paddingTop: 16,
  },
  policyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 12,
  },
  policyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  policyLabel: {
    fontSize: 14,
    color: COLORS.text.secondary,
    flex: 1,
  },
  policyValue: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text.primary,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 16,
  },
  paymentMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: COLORS.neutral.white,
    borderWidth: 1,
    borderColor: COLORS.neutral.grey200,
    borderRadius: 12,
    marginBottom: 12,
  },
  selectedPaymentMethod: {
    borderColor: COLORS.primary.main,
    backgroundColor: COLORS.secondary.light,
  },
  paymentMethodDisabled: {
    opacity: 0.5,
    backgroundColor: COLORS.neutral.grey100,
  },
  paymentMethodLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  paymentIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  paymentIconText: {
    fontSize: 20,
  },
  paymentMethodInfo: {
    flex: 1,
  },
  paymentMethodName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 2,
  },
  paymentMethodDescription: {
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.neutral.grey200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonSelected: {
    borderColor: COLORS.primary.main,
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary.main,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.neutral.grey200,
  },
  payButton: {
    backgroundColor: COLORS.primary.main,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  payButtonDisabled: {
    backgroundColor: COLORS.neutral.grey400,
  },
  payButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.neutral.white,
  },
  // 결제 완료 화면 스타일
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    backgroundColor: COLORS.neutral.white,
  },
  successIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.secondary.warm,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.functional.success,
    marginBottom: 16,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: 18,
    fontWeight: '500',
    color: COLORS.text.primary,
    marginBottom: 12,
    textAlign: 'center',
    lineHeight: 24,
  },
  successAmount: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.primary.main,
    marginBottom: 24,
    textAlign: 'center',
  },
  successSubMessage: {
    fontSize: 16,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});

export default DepositSelector;