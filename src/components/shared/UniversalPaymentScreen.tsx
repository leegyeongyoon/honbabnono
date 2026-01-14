import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Platform } from 'react-native';
import { COLORS, SHADOWS } from '../../styles/colors';
import { Icon } from '../Icon';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface NavigationAdapter {
  navigate: (screen: string, params?: any) => void;
  goBack: () => void;
}

interface PaymentMethod {
  id: string;
  type: 'card' | 'kakao' | 'points' | 'bank';
  name: string;
  icon: string;
  available: boolean;
}

const UniversalPaymentScreen: React.FC<{navigation: NavigationAdapter, user?: any, route?: any}> = ({ 
  navigation, user, route 
}) => {
  const { amount, description, meetupId, type = 'general' } = route?.params || {};
  
  const [paymentMethods] = useState<PaymentMethod[]>([
    { id: 'points', type: 'points', name: '포인트 결제', icon: 'coins', available: true },
    { id: 'card', type: 'card', name: '신용/체크카드', icon: 'credit-card', available: true },
    { id: 'kakao', type: 'kakao', name: '카카오페이', icon: 'message-circle', available: true },
    { id: 'bank', type: 'bank', name: '계좌이체', icon: 'dollar-sign', available: true },
  ]);
  
  const [selectedMethod, setSelectedMethod] = useState<string>('points');
  const [userPoints, setUserPoints] = useState(0);
  const [processing, setProcessing] = useState(false);

  const getApiUrl = () => process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

  useEffect(() => {
    fetchUserPoints();
  }, []);

  const fetchUserPoints = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await fetch(`${getApiUrl()}/user/points`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      setUserPoints(data.points || 0);
    } catch (error) {
      console.error('포인트 조회 실패:', error);
    }
  };

  const processPayment = async () => {
    if (!amount) {
      Alert.alert('오류', '결제 금액이 설정되지 않았습니다.');
      return;
    }

    setProcessing(true);

    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await fetch(`${getApiUrl()}/payments/process`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount,
          paymentMethod: selectedMethod,
          description,
          meetupId,
          type,
        }),
      });

      const data = await response.json();

      if (data.success) {
        Alert.alert('결제 완료', '결제가 성공적으로 완료되었습니다.', [
          { text: '확인', onPress: () => navigation.goBack() },
        ]);
      } else {
        Alert.alert('결제 실패', data.message || '결제에 실패했습니다.');
      }
    } catch (error) {
      console.error('결제 처리 실패:', error);
      Alert.alert('오류', '결제 처리 중 오류가 발생했습니다.');
    } finally {
      setProcessing(false);
    }
  };

  const renderPaymentMethod = (method: PaymentMethod) => {
    const isSelected = selectedMethod === method.id;
    const isPointsMethod = method.type === 'points';
    const hasInsufficientPoints = isPointsMethod && userPoints < amount;

    return (
      <TouchableOpacity
        key={method.id}
        style={[styles.paymentMethod, isSelected && styles.selectedMethod]}
        onPress={() => setSelectedMethod(method.id)}
        disabled={!method.available || hasInsufficientPoints}
      >
        <View style={styles.methodLeft}>
          <View style={[styles.methodIcon, !method.available && styles.disabledIcon]}>
            <Icon name={method.icon} size={24} color={method.available ? COLORS.primary.main : COLORS.text.tertiary} />
          </View>
          <View style={styles.methodInfo}>
            <Text style={[styles.methodName, !method.available && styles.disabledText]}>
              {method.name}
            </Text>
            {isPointsMethod && (
              <Text style={[styles.methodDetail, hasInsufficientPoints && styles.errorText]}>
                보유: {userPoints.toLocaleString()}P {hasInsufficientPoints && '(잔액 부족)'}
              </Text>
            )}
          </View>
        </View>
        <Icon 
          name={isSelected ? 'check-circle' : 'circle'} 
          size={24} 
          color={isSelected ? COLORS.primary.main : COLORS.text.tertiary} 
        />
      </TouchableOpacity>
    );
  };

  if (!amount) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-left" size={24} color={COLORS.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>결제</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text>결제 정보가 없습니다.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color={COLORS.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>결제</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.amountCard}>
          <Text style={styles.amountLabel}>결제 금액</Text>
          <Text style={styles.amountValue}>{amount?.toLocaleString()}원</Text>
          {description && <Text style={styles.description}>{description}</Text>}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>결제 방법</Text>
          <View style={styles.paymentMethods}>
            {paymentMethods.map(renderPaymentMethod)}
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.payButton, processing && styles.disabledButton]}
          onPress={processPayment}
          disabled={processing}
        >
          {processing ? (
            <ActivityIndicator size="small" color={COLORS.neutral.white} />
          ) : (
            <Text style={styles.payButtonText}>
              {amount?.toLocaleString()}원 결제하기
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.neutral.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16,
    backgroundColor: COLORS.neutral.white, ...SHADOWS.small,
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text.primary },
  content: { flex: 1 },
  amountCard: {
    backgroundColor: COLORS.primary.main, margin: 16, padding: 24, borderRadius: 16, alignItems: 'center',
  },
  amountLabel: { fontSize: 14, color: COLORS.neutral.white, opacity: 0.8 },
  amountValue: { fontSize: 32, fontWeight: '700', color: COLORS.neutral.white, marginVertical: 8 },
  description: { fontSize: 14, color: COLORS.neutral.white, opacity: 0.9, textAlign: 'center' },
  section: { margin: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: COLORS.text.primary, marginBottom: 12 },
  paymentMethods: { backgroundColor: COLORS.neutral.white, borderRadius: 12, ...SHADOWS.small },
  paymentMethod: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.neutral.grey200,
  },
  selectedMethod: { backgroundColor: COLORS.primary.main + '10' },
  methodLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  methodIcon: { marginRight: 12 },
  disabledIcon: { opacity: 0.5 },
  methodInfo: { flex: 1 },
  methodName: { fontSize: 16, fontWeight: '600', color: COLORS.text.primary },
  methodDetail: { fontSize: 12, color: COLORS.text.secondary, marginTop: 2 },
  errorText: { color: COLORS.functional.error },
  disabledText: { color: COLORS.text.tertiary },
  footer: { padding: 16, backgroundColor: COLORS.neutral.white, ...SHADOWS.small },
  payButton: {
    backgroundColor: COLORS.primary.main, paddingVertical: 16, borderRadius: 12, alignItems: 'center',
  },
  disabledButton: { backgroundColor: COLORS.neutral.grey300 },
  payButtonText: { fontSize: 16, fontWeight: '600', color: COLORS.neutral.white },
});

export default UniversalPaymentScreen;