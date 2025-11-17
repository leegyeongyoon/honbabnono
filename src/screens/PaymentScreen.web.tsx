import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useNavigate } from 'react-router-dom';

interface User {
  id: string;
  name: string;
  email: string;
  points: number;
}

const PaymentScreen: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User>({ id: 'user1', name: '사용자', email: 'user@example.com', points: 0 });
  const [loading, setLoading] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState<number>(0);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [selectedMethod, setSelectedMethod] = useState<'points' | 'card'>('card');
  const [requiredAmount, setRequiredAmount] = useState<number>(0);
  const [isFromMeetup, setIsFromMeetup] = useState<boolean>(false);

  const predefinedAmounts = [3000, 5000, 10000, 20000, 50000, 100000];

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
          setUser(prev => ({ 
            ...prev, 
            id: data.data.userId,
            name: data.data.name,
            points: data.data.points 
          }));
        }
      } catch (error) {
        console.error('포인트 조회 오류:', error);
      }
    };

    fetchUserPoints();
    
    // URL 파라미터에서 필요한 포인트 확인
    const urlParams = new URLSearchParams(window.location.search);
    const amountParam = urlParams.get('amount');
    const reasonParam = urlParams.get('reason');
    
    if (amountParam) {
      const amount = parseInt(amountParam);
      setRequiredAmount(amount);
      setSelectedAmount(amount);
      setCustomAmount(amount.toString());
      
      if (reasonParam === 'meetup') {
        setIsFromMeetup(true);
      }
    }
  }, []);

  const handleAmountSelect = (amount: number) => {
    setSelectedAmount(amount);
    setCustomAmount('');
  };

  const handleCustomAmountChange = (value: string) => {
    setCustomAmount(value);
    const numericValue = parseInt(value) || 0;
    setSelectedAmount(numericValue);
  };

  const getCurrentAmount = () => {
    return customAmount ? parseInt(customAmount) || 0 : selectedAmount;
  };

  const handlePointCharge = async () => {
    const amount = getCurrentAmount();
    if (amount < 1000) {
      Alert.alert('충전 오류', '최소 충전 금액은 1,000원입니다.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/users/charge-points`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          amount: amount,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setUser(prev => ({ ...prev, points: data.data.newPoints }));
        
        let alertTitle = '충전 완료';
        let alertMessage = data.data.message || `${amount.toLocaleString()}원이 충전되었습니다.`;
        
        if (data.data.isDeveloperAccount && data.data.bonusAmount > 0) {
          alertTitle = '🎉 개발자 혜택!';
          alertMessage = data.data.message;
        }
        
        Alert.alert(alertTitle, alertMessage);
        setSelectedAmount(0);
        setCustomAmount('');
        
        // 충전 완료 후 원래 페이지로 돌아가기
        const returnUrl = sessionStorage.getItem('returnUrl');
        if (returnUrl) {
          sessionStorage.removeItem('returnUrl');
          sessionStorage.removeItem('requiredPoints');
          setTimeout(() => {
            navigate(returnUrl);
          }, data.data.isDeveloperAccount ? 2000 : 1000); // 개발자는 2초 후 이동
        }
      } else {
        Alert.alert('충전 실패', data.message || '충전 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('포인트 충전 오류:', error);
      Alert.alert('충전 실패', '네트워크 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => {
            const returnUrl = sessionStorage.getItem('returnUrl');
            if (returnUrl && isFromMeetup) {
              // 모임에서 온 경우, 취소하면 세션 스토리지 정리하고 원래 페이지로
              sessionStorage.removeItem('returnUrl');
              sessionStorage.removeItem('requiredPoints');
              navigate(returnUrl);
            } else {
              navigate(-1);
            }
          }} 
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isFromMeetup ? '모임 참여비 충전' : '포인트 충전'}
        </Text>
      </View>

      <View style={styles.content}>
        {/* 모임 참여비 정보 (모임에서 온 경우만 표시) */}
        {isFromMeetup && requiredAmount > 0 && (
          <View style={styles.meetupInfoSection}>
            <Text style={styles.meetupInfoTitle}>모임 참여 안내</Text>
            <View style={styles.meetupInfoRow}>
              <Text style={styles.meetupInfoLabel}>필요한 참여비</Text>
              <Text style={styles.meetupInfoAmount}>{requiredAmount.toLocaleString()}원</Text>
            </View>
            <View style={styles.meetupInfoRow}>
              <Text style={styles.meetupInfoLabel}>현재 포인트</Text>
              <Text style={[styles.meetupInfoAmount, { 
                color: user.points >= requiredAmount ? '#4CAF50' : '#f44336' 
              }]}>
                {user.points.toLocaleString()}원
              </Text>
            </View>
            {user.points < requiredAmount && (
              <View style={styles.meetupInfoRow}>
                <Text style={styles.meetupInfoLabel}>부족한 포인트</Text>
                <Text style={[styles.meetupInfoAmount, { color: '#f44336' }]}>
                  {(requiredAmount - user.points).toLocaleString()}원
                </Text>
              </View>
            )}
          </View>
        )}

        {/* 포인트 잔액 */}
        <View style={styles.pointsSection}>
          <Text style={styles.pointsTitle}>내 포인트</Text>
          <Text style={styles.pointsAmount}>{user.points.toLocaleString()}P</Text>
          <Text style={styles.pointsSubtext}>포인트로 결제하면 빠르고 간편해요!</Text>
        </View>

        {/* 충전 금액 선택 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>충전 금액</Text>
          <View style={styles.amountGrid}>
            {predefinedAmounts.map((amount) => (
              <TouchableOpacity
                key={amount}
                style={[
                  styles.amountButton,
                  selectedAmount === amount && !customAmount && styles.selectedAmountButton
                ]}
                onPress={() => handleAmountSelect(amount)}
              >
                <Text style={[
                  styles.amountButtonText,
                  selectedAmount === amount && !customAmount && styles.selectedAmountButtonText
                ]}>
                  {amount.toLocaleString()}원
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.customAmountSection}>
            <Text style={styles.customAmountLabel}>직접 입력</Text>
            <TextInput
              style={styles.customAmountInput}
              placeholder="원하는 금액을 입력하세요"
              value={customAmount}
              onChangeText={handleCustomAmountChange}
              keyboardType="numeric"
            />
          </View>
        </View>

        {/* 결제 수단 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>결제 방법</Text>
          
          <TouchableOpacity
            style={[
              styles.paymentMethodButton,
              selectedMethod === 'card' && styles.selectedPaymentMethod
            ]}
            onPress={() => setSelectedMethod('card')}
          >
            <View style={styles.paymentMethodRow}>
              <View style={styles.radioButton}>
                {selectedMethod === 'card' && <View style={styles.radioButtonInner} />}
              </View>
              <Text style={styles.paymentMethodText}>카드 결제</Text>
            </View>
            <Text style={styles.paymentMethodSubtext}>
              신용카드, 체크카드로 포인트 충전
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.paymentMethodButton,
              false && styles.selectedPaymentMethod
            ]}
            disabled={true}
          >
            <View style={styles.paymentMethodRow}>
              <View style={styles.radioButton}>
              </View>
              <Text style={[styles.paymentMethodText, { color: '#ccc' }]}>계좌이체</Text>
            </View>
            <Text style={[styles.paymentMethodSubtext, { color: '#ccc' }]}>
              준비 중입니다
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.paymentMethodButton,
              false && styles.selectedPaymentMethod
            ]}
            disabled={true}
          >
            <View style={styles.paymentMethodRow}>
              <View style={styles.radioButton}>
              </View>
              <Text style={[styles.paymentMethodText, { color: '#ccc' }]}>간편결제</Text>
            </View>
            <Text style={[styles.paymentMethodSubtext, { color: '#ccc' }]}>
              카카오페이, 네이버페이 등 (준비 중)
            </Text>
          </TouchableOpacity>
        </View>

        {/* 결제 정보 */}
        {getCurrentAmount() > 0 && (
          <View style={styles.paymentInfo}>
            <Text style={styles.paymentInfoTitle}>결제 정보</Text>
            <View style={styles.paymentInfoRow}>
              <Text style={styles.paymentInfoLabel}>충전 금액</Text>
              <Text style={styles.paymentInfoValue}>{getCurrentAmount().toLocaleString()}원</Text>
            </View>
            <View style={styles.paymentInfoRow}>
              <Text style={styles.paymentInfoLabel}>결제 방법</Text>
              <Text style={styles.paymentInfoValue}>카드 결제</Text>
            </View>
          </View>
        )}
      </View>

      {/* 결제 버튼 */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.payButton,
            (getCurrentAmount() === 0 || loading) && styles.payButtonDisabled
          ]}
          onPress={handlePointCharge}
          disabled={getCurrentAmount() === 0 || loading}
        >
          <Text style={styles.payButtonText}>
            {loading ? '충전 중...' : getCurrentAmount() > 0 ? `${getCurrentAmount().toLocaleString()}원 충전하기` : '금액을 선택하세요'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    marginRight: 16,
  },
  backButtonText: {
    fontSize: 20,
    color: '#333',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  pointsSection: {
    backgroundColor: '#4A90E2',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    alignItems: 'center',
  },
  pointsTitle: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
    marginBottom: 8,
  },
  pointsAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  pointsSubtext: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.8,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  amountGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  amountButton: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  selectedAmountButton: {
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2',
  },
  amountButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  selectedAmountButtonText: {
    color: '#fff',
  },
  customAmountSection: {
    marginTop: 12,
  },
  customAmountLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  customAmountInput: {
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
  },
  paymentMethodButton: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  selectedPaymentMethod: {
    borderColor: '#4A90E2',
    backgroundColor: '#f0f7ff',
  },
  paymentMethodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#ddd',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#4A90E2',
  },
  paymentMethodText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  paymentMethodSubtext: {
    fontSize: 14,
    color: '#666',
    marginLeft: 32,
  },
  paymentInfo: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
  },
  paymentInfoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  paymentInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  paymentInfoLabel: {
    fontSize: 14,
    color: '#666',
  },
  paymentInfoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  payButton: {
    backgroundColor: '#4A90E2',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  payButtonDisabled: {
    backgroundColor: '#ccc',
  },
  payButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  meetupInfoSection: {
    backgroundColor: '#FFF3E0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#FFB74D',
  },
  meetupInfoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E65100',
    marginBottom: 12,
    textAlign: 'center',
  },
  meetupInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  meetupInfoLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  meetupInfoAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
});

export default PaymentScreen;