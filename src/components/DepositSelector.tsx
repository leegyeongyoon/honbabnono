import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import depositService from '../services/depositService';
import { PaymentMethod, PaymentRequest } from '../types/deposit';
import { useUserStore } from '../store/userStore';
import Icon from './Icon';

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
  const { user } = useUserStore();

  const defaultPolicy = depositService.getDefaultDepositPolicy();

  const paymentMethods = [
    {
      id: 'kakaopay' as PaymentMethod,
      name: '카카오페이',
      description: '간편하게 결제하세요',
      icon: '💳',
      color: '#FEE500',
    },
    {
      id: 'card' as PaymentMethod,
      name: '신용/체크카드',
      description: '카드로 결제하세요',
      icon: '💳',
      color: '#4A90E2',
    },
    {
      id: 'points' as PaymentMethod,
      name: '포인트 결제',
      description: '보유 포인트로 결제하세요',
      icon: '🎁',
      color: '#FF6B6B',
    },
  ];

  const handlePayment = async () => {
    if (!user) {
      Alert.alert('오류', '로그인이 필요합니다.');
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

      const response = await depositService.processPayment(paymentRequest);

      if (response.success) {
        // 실제로는 DB에서 생성된 약속금 ID를 받아와야 함
        const depositId = response.paymentId || `temp_${Date.now()}`;
        
        Alert.alert(
          '결제 완료',
          '약속금이 성공적으로 결제되었습니다!',
          [
            {
              text: '확인',
              onPress: () => {
                onDepositPaid(depositId, defaultPolicy.amount);
                onClose();
              },
            },
          ]
        );

        // 카카오페이의 경우 외부 브라우저 열기
        if (selectedPaymentMethod === 'kakaopay' && response.redirectUrl) {
          // 웹에서는 새 창으로 열기
          if (typeof window !== 'undefined') {
            window.open(response.redirectUrl, '_blank');
          }
        }
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
        {/* 헤더 */}
        <View style={styles.header}>
          <View style={styles.headerLeft} />
          <Text style={styles.title}>약속금 결제</Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Icon name="x" size={24} color="#666" />
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
            {paymentMethods.map((method) => (
              <TouchableOpacity
                key={method.id}
                style={[
                  styles.paymentMethod,
                  selectedPaymentMethod === method.id && styles.selectedPaymentMethod,
                ]}
                onPress={() => setSelectedPaymentMethod(method.id)}
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
            ))}
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
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerLeft: {
    width: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  depositInfoCard: {
    backgroundColor: '#F8F9FA',
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
    color: '#1A1A1A',
  },
  depositAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#007AFF',
  },
  depositDescription: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 16,
    lineHeight: 20,
  },
  policyInfo: {
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    paddingTop: 16,
  },
  policyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  policyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  policyLabel: {
    fontSize: 14,
    color: '#666666',
    flex: 1,
  },
  policyValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1A1A1A',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 16,
  },
  paymentMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 12,
    marginBottom: 12,
  },
  selectedPaymentMethod: {
    borderColor: '#007AFF',
    backgroundColor: '#F7F9FC',
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
    color: '#1A1A1A',
    marginBottom: 2,
  },
  paymentMethodDescription: {
    fontSize: 14,
    color: '#666666',
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#E5E5E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonSelected: {
    borderColor: '#007AFF',
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#007AFF',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  payButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  payButtonDisabled: {
    backgroundColor: '#C7C7CC',
  },
  payButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default DepositSelector;