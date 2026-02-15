import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';
import { useNavigate, useParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { COLORS, SHADOWS, CARD_STYLE } from '../styles/colors';
import { useToast } from '../hooks/useToast';
import Toast from '../components/Toast';
import { FadeIn } from '../components/animated';

interface UserPoints {
  availablePoints: number;
  totalPoints: number;
}

const DepositPaymentScreen: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { toast, showSuccess, showError, showInfo, hideToast } = useToast();
  const [userPoints, setUserPoints] = useState<UserPoints>({ availablePoints: 0, totalPoints: 0 });
  const [selectedMethod, setSelectedMethod] = useState<'points' | 'card'>('points');
  const [loading, setLoading] = useState(false);
  const [showInsufficientModal, setShowInsufficientModal] = useState(false);
  
  const depositAmount = 3000; // 약속금 금액

  // 사용자 포인트 조회
  useEffect(() => {
    const fetchUserPoints = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/users/points`, {
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
          },
        });

        const data = await response.json();
        if (data.success) {
          setUserPoints({
            availablePoints: data.data.points || 0,
            totalPoints: data.data.points || 0
          });
          
          // 포인트가 충분하면 포인트 결제를 기본값으로
          if (data.data.points >= depositAmount) {
            setSelectedMethod('points');
          } else {
            setSelectedMethod('card');
          }
        }
      } catch (error) {
        // 포인트 조회 실패 시 무시
      }
    };

    fetchUserPoints();
  }, [depositAmount]);

  const handlePayment = async () => {
    if (selectedMethod === 'points' && userPoints.availablePoints < depositAmount) {
      setShowInsufficientModal(true);
      return;
    }

    setLoading(true);
    try {
      if (selectedMethod === 'points') {
        // 포인트 결제
        const token = localStorage.getItem('token');
        const usePointsResponse = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/users/use-points`, {
          method: 'POST',
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: depositAmount,
            description: `모임 약속금 결제`
          }),
        });

        const pointsData = await usePointsResponse.json();
        if (!pointsData.success) {
          showError(pointsData.message || '포인트 사용 중 오류가 발생했습니다.');
          setLoading(false);
          return;
        }

        // 모임 참여 API 호출
        const joinResponse = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/meetups/${id}/join`, {
          method: 'POST',
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
            'Content-Type': 'application/json',
          },
        });

        const joinData = await joinResponse.json();
        if (!joinData.success) {
          showError(joinData.message || '모임 참여 중 오류가 발생했습니다.');
          setLoading(false);
          return;
        }

        showSuccess(`약속금 ${depositAmount.toLocaleString()}원이 결제되어 모임에 참여했습니다.`);
        setTimeout(() => navigate(`/meetup/${id}`), 1000);
      } else {
        // 카드 결제 (추후 구현)
        showInfo('카드 결제는 준비중입니다.');
        setLoading(false);
      }
    } catch (error) {
      showError('결제 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleInsufficientPoints = () => {
    setShowInsufficientModal(false);
    // 포인트 충전 페이지로 이동
    sessionStorage.setItem('returnUrl', `/meetup/${id}/deposit-payment`);
    sessionStorage.setItem('requiredPoints', (depositAmount - userPoints.availablePoints).toString());
    navigate(`/payment?amount=${depositAmount - userPoints.availablePoints}&reason=deposit`);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigate(`/meetup/${id}`)} style={styles.backButton}>
          <Icon name="chevron-left" size={24} color={COLORS.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>서로의 신뢰를 위해{'\n'}약속금을 미리 걸어두요</Text>
      </View>

      <FadeIn>
      {/* 약속금 정보 */}
      <View style={styles.amountSection}>
        <Text style={styles.amountLabel}>약속금</Text>
        <Text style={styles.amountValue}>{depositAmount.toLocaleString()}원</Text>
        <View style={styles.warningBox}>
          <Icon name="info" size={14} color={COLORS.functional.info} />
          <Text style={styles.amountDescription}>
            노쇼 방지 목적이며, 1일 이내 다시 입금됩니다.
          </Text>
        </View>
      </View>

      {/* 결제 방식 선택 */}
      <View style={styles.paymentSection}>
        <Text style={styles.sectionTitle}>결제 방식</Text>
        
        {/* 포인트 결제 */}
        <TouchableOpacity
          style={[
            styles.paymentOption,
            selectedMethod === 'points' && styles.selectedOption
          ]}
          onPress={() => setSelectedMethod('points')}
        >
          <View style={styles.paymentOptionLeft}>
            <View style={[styles.radioButton, selectedMethod === 'points' && styles.radioSelected]}>
              {selectedMethod === 'points' && <View style={styles.radioInner} />}
            </View>
            <Text style={styles.paymentOptionText}>포인트 결제</Text>
          </View>
          <View style={styles.paymentOptionRight}>
            <Text style={[
              styles.pointsText,
              userPoints.availablePoints < depositAmount && styles.insufficientPoints
            ]}>
              {userPoints.availablePoints.toLocaleString()}P
            </Text>
            {userPoints.availablePoints < depositAmount && (
              <Text style={styles.insufficientText}>포인트 부족</Text>
            )}
          </View>
        </TouchableOpacity>

        {/* 카드 결제 */}
        <TouchableOpacity
          style={[
            styles.paymentOption,
            selectedMethod === 'card' && styles.selectedOption
          ]}
          onPress={() => setSelectedMethod('card')}
        >
          <View style={styles.paymentOptionLeft}>
            <View style={[styles.radioButton, selectedMethod === 'card' && styles.radioSelected]}>
              {selectedMethod === 'card' && <View style={styles.radioInner} />}
            </View>
            <Text style={styles.paymentOptionText}>카드 결제</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* 결제 버튼 */}
      <View style={styles.bottomSection}>
        <TouchableOpacity
          style={[styles.paymentButton, loading && styles.disabledButton]}
          onPress={handlePayment}
          disabled={loading}
        >
          <Text style={styles.paymentButtonText}>
            {loading ? '결제 중...' : `${depositAmount.toLocaleString()}원 결제하기`}
          </Text>
        </TouchableOpacity>
      </View>
      </FadeIn>

      {/* 포인트 부족 모달 */}
      {showInsufficientModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>서로의 신뢰를 위해{'\n'}약속금을 미리 걸어두요</Text>
            <Text style={styles.modalSubtitle}>약속금 {depositAmount.toLocaleString()}원</Text>
            <Text style={styles.modalDescription}>
              노쇼 방지 목적이며, 1일 이내에 다시 입금됩니다.
            </Text>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.modalCancelButton}
                onPress={() => setShowInsufficientModal(false)}
              >
                <Text style={styles.modalCancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.modalConfirmButton}
                onPress={handleInsufficientPoints}
              >
                <Text style={styles.modalConfirmText}>다음</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.neutral.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
    backgroundColor: COLORS.neutral.white,
  },
  backButton: {
    padding: 4,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text.primary,
    lineHeight: 26,
  },
  amountSection: {
    padding: 24,
    alignItems: 'center',
    marginVertical: 16,
    marginHorizontal: 20,
    backgroundColor: COLORS.neutral.white,
    borderRadius: 16,
    ...CARD_STYLE,
    ...SHADOWS.small,
  },
  amountLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text.secondary,
    marginBottom: 8,
  },
  amountValue: {
    fontSize: 36,
    fontWeight: '700',
    color: COLORS.primary.main,
    marginBottom: 16,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primary.light,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  amountDescription: {
    fontSize: 13,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  paymentSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: 16,
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: COLORS.neutral.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    marginBottom: 12,
  },
  selectedOption: {
    borderColor: COLORS.primary.main,
    borderWidth: 2,
    backgroundColor: COLORS.primary.light,
  },
  paymentOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.neutral.grey300,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: COLORS.primary.main,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary.main,
  },
  paymentOptionText: {
    fontSize: 16,
    color: COLORS.text.primary,
  },
  paymentOptionRight: {
    alignItems: 'flex-end',
  },
  pointsText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  insufficientPoints: {
    color: COLORS.functional.error,
  },
  insufficientText: {
    fontSize: 12,
    color: COLORS.functional.error,
    marginTop: 2,
  },
  bottomSection: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 20,
  },
  paymentButton: {
    backgroundColor: COLORS.primary.main,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: COLORS.neutral.grey300,
    opacity: 0.7,
  },
  paymentButtonText: {
    color: COLORS.neutral.white,
    fontSize: 17,
    fontWeight: '700',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: COLORS.neutral.white,
    borderRadius: 20,
    padding: 28,
    width: '100%',
    maxWidth: 320,
    ...SHADOWS.large,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text.primary,
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 26,
  },
  modalSubtitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.primary.main,
    textAlign: 'center',
    marginBottom: 8,
  },
  modalDescription: {
    fontSize: 14,
    color: COLORS.text.tertiary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    alignItems: 'center',
    backgroundColor: COLORS.neutral.background,
  },
  modalCancelText: {
    color: COLORS.text.secondary,
    fontSize: 15,
    fontWeight: '600',
  },
  modalConfirmButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: COLORS.primary.main,
    alignItems: 'center',
  },
  modalConfirmText: {
    color: COLORS.neutral.white,
    fontSize: 15,
    fontWeight: '700',
  },
});

export default DepositPaymentScreen;