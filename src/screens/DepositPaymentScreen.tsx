import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ActivityIndicator, Alert } from 'react-native';
import { WebView } from 'react-native-webview';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, SHADOWS } from '../styles/colors';
import { Icon } from '../components/Icon';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

interface PaymentData {
  depositId: string;
  merchantUid: string;
  meetupId: string;
  amount: number;
  storeId: string;
  name: string;
  buyerName: string;
  buyerEmail: string;
}

const DepositPaymentScreen = ({ navigation, user, route }: any) => {
  const meetupId = route?.params?.meetupId || route?.params?.id;
  const [loading, setLoading] = useState(false);
  const [showWebView, setShowWebView] = useState(false);
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<'points' | 'card'>('card');
  const [userPoints, setUserPoints] = useState(0);
  const webViewRef = useRef<WebView>(null);

  const depositAmount = 3000;

  useEffect(() => {
    fetchUserPoints();
  }, []);

  const fetchUserPoints = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await fetch(`${API_URL}/user/points`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success || data.points !== undefined) {
        setUserPoints(data.points || data.data?.points || 0);
        if ((data.points || data.data?.points || 0) >= depositAmount) {
          setSelectedMethod('points');
        }
      }
    } catch (_error) {
    }
  };

  const handleCardPayment = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('authToken');

      // 서버에 결제 준비 요청
      const response = await fetch(`${API_URL}/deposits/prepare`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: depositAmount,
          meetupId: meetupId,
          paymentMethod: 'card',
        }),
      });

      const data = await response.json();
      if (!data.success) {
        Alert.alert('오류', data.error || '결제 준비에 실패했습니다.');
        setLoading(false);
        return;
      }

      setPaymentData(data.paymentData);
      setShowWebView(true);
      setLoading(false);
    } catch (_error) {
      Alert.alert('오류', '결제 준비 중 오류가 발생했습니다.');
      setLoading(false);
    }
  };

  const handlePointsPayment = async () => {
    if (userPoints < depositAmount) {
      Alert.alert('포인트 부족', '보유 포인트가 부족합니다.');
      return;
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('authToken');

      const usePointsResponse = await fetch(`${API_URL}/deposits/payment`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: depositAmount,
          meetupId: meetupId,
          paymentMethod: 'points',
        }),
      });

      const pointsData = await usePointsResponse.json();
      if (!pointsData.success) {
        Alert.alert('오류', pointsData.error || '결제에 실패했습니다.');
        setLoading(false);
        return;
      }

      Alert.alert('결제 완료', `약속금 ${depositAmount.toLocaleString()}원이 포인트로 결제되었습니다.`, [
        { text: '확인', onPress: () => navigation.goBack() },
      ]);
    } catch (_error) {
      Alert.alert('오류', '결제 처리 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = () => {
    if (selectedMethod === 'card') {
      handleCardPayment();
    } else {
      handlePointsPayment();
    }
  };

  // PortOne 결제 완료 후 검증 처리
  const handlePaymentComplete = async (impUid: string, merchantUid: string) => {
    try {
      const token = await AsyncStorage.getItem('authToken');

      const verifyResponse = await fetch(`${API_URL}/deposits/verify`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          impUid,
          merchantUid,
          depositId: paymentData?.depositId,
        }),
      });

      const verifyData = await verifyResponse.json();

      if (verifyData.success) {
        // 모임 참여 API 호출
        await fetch(`${API_URL}/meetups/${meetupId}/join`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        Alert.alert('결제 완료', `약속금 ${depositAmount.toLocaleString()}원이 결제되었습니다.`, [
          { text: '확인', onPress: () => navigation.goBack() },
        ]);
      } else {
        Alert.alert('결제 검증 실패', verifyData.error || '결제 검증에 실패했습니다. 고객센터에 문의해주세요.');
      }
    } catch (_error) {
      Alert.alert('오류', '결제 검증 중 오류가 발생했습니다.');
    } finally {
      setShowWebView(false);
      setPaymentData(null);
    }
  };

  // WebView에서 결제 결과를 받는 메시지 핸들러
  const onWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'PAYMENT_SUCCESS') {
        handlePaymentComplete(data.imp_uid, data.merchant_uid);
      } else if (data.type === 'PAYMENT_FAILED') {
        Alert.alert('결제 실패', data.error_msg || '결제가 취소되었습니다.');
        setShowWebView(false);
        setPaymentData(null);
      }
    } catch (_error) {
    }
  };

  // PortOne WebView용 HTML 생성
  const getPaymentHTML = () => {
    if (!paymentData) return '';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <script src="https://cdn.iamport.kr/v1/iamport.js"></script>
        <style>
          body {
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            font-family: -apple-system, BlinkMacSystemFont, sans-serif;
            background-color: #F5F3F0;
          }
          .loading {
            text-align: center;
            color: #5C4F42;
          }
        </style>
      </head>
      <body>
        <div class="loading">
          <p>결제창을 불러오는 중...</p>
        </div>
        <script>
          var IMP = window.IMP;
          IMP.init('${paymentData.storeId}');

          IMP.request_pay({
            pg: 'html5_inicis',
            pay_method: 'card',
            merchant_uid: '${paymentData.merchantUid}',
            name: '${paymentData.name}',
            amount: ${paymentData.amount},
            buyer_name: '${paymentData.buyerName}',
            buyer_email: '${paymentData.buyerEmail}',
            app_scheme: 'honbabnono'
          }, function(response) {
            if (response.success) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'PAYMENT_SUCCESS',
                imp_uid: response.imp_uid,
                merchant_uid: response.merchant_uid
              }));
            } else {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'PAYMENT_FAILED',
                error_msg: response.error_msg || '결제가 취소되었습니다.'
              }));
            }
          });
        </script>
      </body>
      </html>
    `;
  };

  // WebView 결제 화면
  if (showWebView && paymentData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.webViewHeader}>
          <TouchableOpacity
            onPress={() => {
              setShowWebView(false);
              setPaymentData(null);
            }}
            style={styles.webViewCloseButton}
          >
            <Icon name="x" size={24} color={COLORS.text.primary} />
          </TouchableOpacity>
          <Text style={styles.webViewTitle}>카드 결제</Text>
          <View style={{ width: 32 }} />
        </View>
        <WebView
          ref={webViewRef}
          source={{ html: getPaymentHTML() }}
          onMessage={onWebViewMessage}
          javaScriptEnabled={true}
          originWhitelist={['*']}
          mixedContentMode="always"
          style={{ flex: 1 }}
        />
      </SafeAreaView>
    );
  }

  // 메인 결제 선택 화면
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="chevron-left" size={24} color={COLORS.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>약속금 결제</Text>
        <View style={{ width: 32 }} />
      </View>

      <View style={styles.amountSection}>
        <Text style={styles.amountLabel}>약속금</Text>
        <Text style={styles.amountValue}>{depositAmount.toLocaleString()}원</Text>
        <Text style={styles.amountDescription}>
          노쇼 방지 목적이며, 1일 이내 다시 입금됩니다.
        </Text>
      </View>

      <View style={styles.paymentSection}>
        <Text style={styles.sectionTitle}>결제 방식</Text>

        <TouchableOpacity
          style={[styles.paymentOption, selectedMethod === 'points' && styles.selectedOption]}
          onPress={() => setSelectedMethod('points')}
        >
          <View style={styles.paymentOptionLeft}>
            <View style={[styles.radioButton, selectedMethod === 'points' && styles.radioSelected]}>
              {selectedMethod === 'points' && <View style={styles.radioInner} />}
            </View>
            <Text style={styles.paymentOptionText}>포인트 결제</Text>
          </View>
          <Text style={[
            styles.pointsText,
            userPoints < depositAmount && styles.insufficientPoints
          ]}>
            {userPoints.toLocaleString()}P
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.paymentOption, selectedMethod === 'card' && styles.selectedOption]}
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

      <View style={styles.bottomSection}>
        <TouchableOpacity
          style={[styles.paymentButton, loading && styles.disabledButton]}
          onPress={handlePayment}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color={COLORS.neutral.white} />
          ) : (
            <Text style={styles.paymentButtonText}>
              {depositAmount.toLocaleString()}원 결제하기
            </Text>
          )}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: COLORS.neutral.white,
    ...SHADOWS.small,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  amountSection: {
    padding: 24,
    alignItems: 'center',
    margin: 16,
    backgroundColor: COLORS.neutral.white,
    borderRadius: 8,
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
    color: COLORS.primary.accent,
    marginBottom: 12,
  },
  amountDescription: {
    fontSize: 13,
    color: COLORS.text.tertiary,
    textAlign: 'center',
  },
  paymentSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: 12,
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: COLORS.neutral.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(13,13,12,0.06)',
    marginBottom: 10,
  },
  selectedOption: {
    borderColor: COLORS.primary.accent,
    borderWidth: 2,
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
    borderColor: COLORS.neutral.grey100,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: COLORS.primary.accent,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary.accent,
  },
  paymentOptionText: {
    fontSize: 16,
    color: COLORS.text.primary,
  },
  pointsText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  insufficientPoints: {
    color: COLORS.functional.error,
  },
  bottomSection: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 16,
  },
  paymentButton: {
    backgroundColor: COLORS.primary.accent,
    borderRadius: 6,
    paddingVertical: 16,
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
  webViewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: COLORS.neutral.white,
    ...SHADOWS.small,
  },
  webViewCloseButton: {
    padding: 4,
  },
  webViewTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
});

export default DepositPaymentScreen;
