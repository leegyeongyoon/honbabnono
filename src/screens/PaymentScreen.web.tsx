import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { COLORS, SHADOWS, CARD_STYLE } from '../styles/colors';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { useToast } from '../hooks/useToast';
import Toast from '../components/Toast';
import { FadeIn } from '../components/animated';

interface User {
  id: string;
  name: string;
  email: string;
  points: number;
}

const PaymentScreen: React.FC = () => {
  const navigate = useNavigate();
  const { toast, showSuccess, showError, showInfo, hideToast } = useToast();
  const [user, setUser] = useState<User>({ id: 'user1', name: '사용자', email: 'user@example.com', points: 0 });
  const [loading, setLoading] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState<number>(0);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [selectedMethod, setSelectedMethod] = useState<'points' | 'card'>('card');
  const [requiredAmount, setRequiredAmount] = useState<number>(0);
  const [isFromMeetup, setIsFromMeetup] = useState<boolean>(false);
  const [payButtonPressed, setPayButtonPressed] = useState(false);
  const [payButtonHovered, setPayButtonHovered] = useState(false);
  const [customAmountFocused, setCustomAmountFocused] = useState(false);
  const [hoveredAmount, setHoveredAmount] = useState<number | null>(null);

  const predefinedAmounts = [3000, 5000, 10000, 20000, 50000, 100000];

  useEffect(() => {
    const fetchUserPoints = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/users/points`, {
          headers: { 'Authorization': token ? `Bearer ${token}` : '' },
        });
        const data = await response.json();
        if (data.success) {
          setUser(prev => ({ ...prev, id: data.data.userId, name: data.data.name, points: data.data.points }));
        }
      } catch (error) { /* ignore */ }
    };
    fetchUserPoints();
    const urlParams = new URLSearchParams(window.location.search);
    const amountParam = urlParams.get('amount');
    const reasonParam = urlParams.get('reason');
    if (amountParam) {
      const amount = parseInt(amountParam);
      setRequiredAmount(amount);
      setSelectedAmount(amount);
      setCustomAmount(amount.toString());
      if (reasonParam === 'meetup') setIsFromMeetup(true);
    }
  }, []);

  const handleAmountSelect = (amount: number) => { setSelectedAmount(amount); setCustomAmount(''); };
  const handleCustomAmountChange = (value: string) => { setCustomAmount(value); setSelectedAmount(parseInt(value) || 0); };
  const getCurrentAmount = () => customAmount ? parseInt(customAmount) || 0 : selectedAmount;

  const handlePointCharge = async () => {
    const amount = getCurrentAmount();
    if (amount < 1000) { showError('최소 충전 금액은 1,000원입니다.'); return; }
    setLoading(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/users/charge-points`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ amount }),
      });
      const data = await response.json();
      if (data.success) {
        setUser(prev => ({ ...prev, points: data.data.newPoints }));
        let toastMessage = data.data.message || `${amount.toLocaleString()}원이 충전되었습니다.`;
        if (data.data.isDeveloperAccount && data.data.bonusAmount > 0) toastMessage = data.data.message;
        showSuccess(toastMessage);
        setSelectedAmount(0); setCustomAmount('');
        const returnUrl = sessionStorage.getItem('returnUrl');
        if (returnUrl) {
          sessionStorage.removeItem('returnUrl'); sessionStorage.removeItem('requiredPoints');
          setTimeout(() => navigate(returnUrl), data.data.isDeveloperAccount ? 2000 : 1000);
        }
      } else { showError(data.message || '충전 중 오류가 발생했습니다.'); }
    } catch (error) { showError('네트워크 오류가 발생했습니다.'); }
    finally { setLoading(false); }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => {
          const returnUrl = sessionStorage.getItem('returnUrl');
          if (returnUrl && isFromMeetup) { sessionStorage.removeItem('returnUrl'); sessionStorage.removeItem('requiredPoints'); navigate(returnUrl); }
          else navigate(-1);
        }} style={styles.backButton}>
          <Icon name="arrow-left" size={20} color="#1A1714" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isFromMeetup ? '모임 참여비 충전' : '포인트 충전'}</Text>
      </View>

      <FadeIn>
      <View style={styles.content}>
        {isFromMeetup && requiredAmount > 0 && (
          <View style={styles.meetupInfoSection}>
            <Text style={styles.meetupInfoTitle}>모임 참여 안내</Text>
            <View style={styles.meetupInfoRow}>
              <Text style={styles.meetupInfoLabel}>필요한 참여비</Text>
              <Text style={styles.meetupInfoAmount}>{requiredAmount.toLocaleString()}원</Text>
            </View>
            <View style={styles.meetupInfoRow}>
              <Text style={styles.meetupInfoLabel}>현재 포인트</Text>
              <Text style={[styles.meetupInfoAmount, { color: user.points >= requiredAmount ? '#2E7D4F' : '#D32F2F' }]}>{user.points.toLocaleString()}원</Text>
            </View>
            {user.points < requiredAmount && (
              <View style={styles.meetupInfoRow}>
                <Text style={styles.meetupInfoLabel}>부족한 포인트</Text>
                <Text style={[styles.meetupInfoAmount, { color: '#D32F2F' }]}>{(requiredAmount - user.points).toLocaleString()}원</Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.pointsSection}>
          <Text style={styles.pointsTitle}>내 포인트</Text>
          <Text style={styles.pointsAmount}>{user.points.toLocaleString()}P</Text>
          <Text style={styles.pointsSubtext}>포인트로 결제하면 빠르고 간편해요!</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>충전 금액</Text>
          <View style={styles.amountGrid}>
            {predefinedAmounts.map((amount) => (
              <div key={amount} style={{ flex: 1, minWidth: '30%', transition: 'all 150ms ease', transform: hoveredAmount === amount ? 'scale(1.04)' : 'scale(1)' }}
                onMouseEnter={() => setHoveredAmount(amount)} onMouseLeave={() => setHoveredAmount(null)}>
                <TouchableOpacity style={[styles.amountButton, selectedAmount === amount && !customAmount && styles.selectedAmountButton]} onPress={() => handleAmountSelect(amount)}>
                  <Text style={[styles.amountButtonText, selectedAmount === amount && !customAmount && styles.selectedAmountButtonText]}>{amount.toLocaleString()}원</Text>
                </TouchableOpacity>
              </div>
            ))}
          </View>
          <View style={styles.customAmountSection}>
            <Text style={styles.customAmountLabel}>직접 입력</Text>
            <TextInput style={[styles.customAmountInput, customAmountFocused && { borderColor: '#C49A70', boxShadow: '0 0 0 3px rgba(196,154,112,0.12)' } as any]}
              placeholder="원하는 금액을 입력하세요" value={customAmount} onChangeText={handleCustomAmountChange}
              keyboardType="numeric" onFocus={() => setCustomAmountFocused(true)} onBlur={() => setCustomAmountFocused(false)} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>결제 방법</Text>
          <TouchableOpacity style={[styles.paymentMethodButton, selectedMethod === 'card' && styles.selectedPaymentMethod]} onPress={() => setSelectedMethod('card')}>
            <View style={styles.paymentMethodRow}>
              <View style={styles.radioButton}>{selectedMethod === 'card' && <View style={styles.radioButtonInner} />}</View>
              <Text style={styles.paymentMethodText}>카드 결제</Text>
            </View>
            <Text style={styles.paymentMethodSubtext}>신용카드, 체크카드로 포인트 충전</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.paymentMethodButton, false && styles.selectedPaymentMethod]} disabled={true}>
            <View style={styles.paymentMethodRow}><View style={styles.radioButton} /><Text style={[styles.paymentMethodText, { color: '#B0A89E' }]}>계좌이체</Text></View>
            <Text style={[styles.paymentMethodSubtext, { color: '#B0A89E' }]}>준비 중입니다</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.paymentMethodButton, false && styles.selectedPaymentMethod]} disabled={true}>
            <View style={styles.paymentMethodRow}><View style={styles.radioButton} /><Text style={[styles.paymentMethodText, { color: '#B0A89E' }]}>간편결제</Text></View>
            <Text style={[styles.paymentMethodSubtext, { color: '#B0A89E' }]}>카카오페이, 네이버페이 등 (준비 중)</Text>
          </TouchableOpacity>
        </View>

        {getCurrentAmount() > 0 && (
          <View style={styles.paymentInfo}>
            <Text style={styles.paymentInfoTitle}>결제 정보</Text>
            <View style={styles.paymentInfoRow}><Text style={styles.paymentInfoLabel}>충전 금액</Text><Text style={styles.paymentInfoValue}>{getCurrentAmount().toLocaleString()}원</Text></View>
            <View style={styles.paymentInfoRow}><Text style={styles.paymentInfoLabel}>결제 방법</Text><Text style={styles.paymentInfoValue}>카드 결제</Text></View>
          </View>
        )}
      </View>
      </FadeIn>

      <View style={styles.footer}>
        <div style={{
          background: (getCurrentAmount() === 0 || loading) ? '#B0A89E' : 'linear-gradient(135deg, #9A7450 0%, #C49A70 100%)',
          borderRadius: 6,
          boxShadow: (getCurrentAmount() === 0 || loading) ? 'none' : '0 4px 12px rgba(196,154,112,0.25), 0 8px 24px rgba(196,154,112,0.12)',
          cursor: (getCurrentAmount() === 0 || loading) ? 'not-allowed' : 'pointer',
          transition: 'all 200ms ease',
          transform: payButtonHovered && getCurrentAmount() > 0 && !loading ? 'scale(1.02)' : payButtonPressed ? 'scale(0.98)' : 'scale(1)',
          opacity: (getCurrentAmount() === 0 || loading) ? 0.7 : 1,
        }}
          onMouseEnter={() => getCurrentAmount() > 0 && !loading && setPayButtonHovered(true)}
          onMouseLeave={() => { setPayButtonHovered(false); setPayButtonPressed(false); }}
          onMouseDown={() => getCurrentAmount() > 0 && !loading && setPayButtonPressed(true)}
          onMouseUp={() => setPayButtonPressed(false)}>
          <TouchableOpacity style={styles.payButton} onPress={handlePointCharge} disabled={getCurrentAmount() === 0 || loading}>
            <Text style={styles.payButtonText}>{loading ? '충전 중...' : getCurrentAmount() > 0 ? `${getCurrentAmount().toLocaleString()}원 충전하기` : '금액을 선택하세요'}</Text>
          </TouchableOpacity>
        </div>
      </View>

      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAF8' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, paddingVertical: 18, backgroundColor: '#FFFFFF', shadowColor: '#111111', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3, zIndex: 10 },
  backButton: { marginRight: 16, padding: 10, minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  backButtonText: { fontSize: 20, color: '#1A1714' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1A1714' },
  content: { flex: 1, padding: 16 },
  pointsSection: { backgroundColor: '#9A7450', borderRadius: 8, padding: 24, marginBottom: 24, alignItems: 'center', shadowColor: '#111111', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 12, elevation: 5 },
  pointsTitle: { fontSize: 14, fontWeight: '500', color: '#FFFFFF', opacity: 0.9, marginBottom: 8 },
  pointsAmount: { fontSize: 36, fontWeight: '800', color: '#FFFFFF', marginBottom: 8 },
  pointsSubtext: { fontSize: 13, color: '#FFFFFF', opacity: 0.8 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#1A1714', marginBottom: 16 },
  amountGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
  amountButton: { width: '100%', backgroundColor: '#FFFFFF', borderRadius: 8, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(17,17,17,0.06)', shadowColor: '#111111', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  selectedAmountButton: { backgroundColor: 'rgba(196,154,112,0.06)', borderColor: '#C49A70', borderWidth: 2 },
  amountButtonText: { fontSize: 15, fontWeight: '600', color: '#1A1714' },
  selectedAmountButtonText: { color: '#C49A70', fontWeight: '700' },
  customAmountSection: { marginTop: 12 },
  customAmountLabel: { fontSize: 16, fontWeight: '500', color: '#1A1714', marginBottom: 8 },
  customAmountInput: { borderWidth: 1, borderColor: 'rgba(17,17,17,0.06)', borderRadius: 8, padding: 16, fontSize: 16, backgroundColor: '#FFFFFF', transition: 'border-color 150ms ease, box-shadow 150ms ease' },
  paymentMethodButton: { backgroundColor: '#FFFFFF', borderRadius: 8, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(17,17,17,0.06)' },
  selectedPaymentMethod: { borderColor: '#C49A70', backgroundColor: 'rgba(196,154,112,0.04)' },
  paymentMethodRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  radioButton: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#B0A89E', marginRight: 12, alignItems: 'center', justifyContent: 'center' },
  radioButtonInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#C49A70' },
  paymentMethodText: { fontSize: 16, fontWeight: '500', color: '#1A1714' },
  paymentMethodSubtext: { fontSize: 14, color: '#5C4F42', marginLeft: 32 },
  paymentInfo: { backgroundColor: '#FFFFFF', borderRadius: 8, padding: 20, marginBottom: 24, borderWidth: 1, borderColor: 'rgba(17,17,17,0.06)', shadowColor: '#111111', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  paymentInfoTitle: { fontSize: 16, fontWeight: '700', color: '#1A1714', marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(17,17,17,0.06)' },
  paymentInfoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  paymentInfoLabel: { fontSize: 14, color: '#5C4F42' },
  paymentInfoValue: { fontSize: 15, fontWeight: '600', color: '#1A1714' },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: 'rgba(17,17,17,0.06)', backgroundColor: '#FFFFFF' },
  payButton: { paddingVertical: 16, paddingHorizontal: 24, alignItems: 'center' },
  payButtonText: { fontSize: 17, fontWeight: '700', color: '#FFFFFF' },
  meetupInfoSection: { backgroundColor: 'rgba(196,154,112,0.06)', borderRadius: 8, padding: 20, marginBottom: 24, borderWidth: 1, borderColor: 'rgba(196,154,112,0.15)' },
  meetupInfoTitle: { fontSize: 15, fontWeight: '700', color: '#C49A70', marginBottom: 12, textAlign: 'center' },
  meetupInfoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  meetupInfoLabel: { fontSize: 14, color: '#5C4F42', fontWeight: '500' },
  meetupInfoAmount: { fontSize: 16, fontWeight: '700', color: '#1A1714' },
});

export default PaymentScreen;
