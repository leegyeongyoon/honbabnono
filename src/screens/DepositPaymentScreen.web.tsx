import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, ActivityIndicator } from 'react-native';
import { useNavigate, useParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { COLORS, SHADOWS, CARD_STYLE, CSS_SHADOWS } from '../styles/colors';
import { HEADER_STYLE, BORDER_RADIUS } from '../styles/spacing';
import { useToast } from '../hooks/useToast';
import Toast from '../components/Toast';
import { FadeIn } from '../components/animated';

// PortOne (iamport) SDK 타입 선언
declare global {
  interface Window {
    IMP?: {
      init: (storeId: string) => void;
      request_pay: (params: any, callback: (response: any) => void) => void;
    };
  }
}

interface MeetupInfo {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  promiseDepositAmount: number;
  promiseDepositRequired: boolean;
  hostName: string;
  category: string;
}

interface UserPoints {
  availablePoints: number;
  totalPoints: number;
}

interface DepositInfo {
  id: string;
  status: 'pending' | 'paid' | 'refunded' | 'converted' | 'forfeited' | 'failed';
  amount: number;
  paidAt?: string;
}

type ScreenState = 'loading' | 'payment' | 'processing' | 'success' | 'error' | 'already_paid';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const getAuthHeader = (): Record<string, string> => {
  const token = localStorage.getItem('token');
  return {
    'Authorization': token ? `Bearer ${token}` : '',
    'Content-Type': 'application/json',
  };
};

const DepositPaymentScreen: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { toast, showSuccess, showError, hideToast } = useToast();

  const [screenState, setScreenState] = useState<ScreenState>('loading');
  const [meetup, setMeetup] = useState<MeetupInfo | null>(null);
  const [existingDeposit, setExistingDeposit] = useState<DepositInfo | null>(null);
  const [userPoints, setUserPoints] = useState<UserPoints>({ availablePoints: 0, totalPoints: 0 });
  const [selectedMethod, setSelectedMethod] = useState<'points' | 'card'>('card');
  const [impReady, setImpReady] = useState(false);
  const [payButtonHovered, setPayButtonHovered] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const depositAmount = meetup?.promiseDepositAmount || 0;

  // PortOne SDK 스크립트 로드
  useEffect(() => {
    if (window.IMP) {
      setImpReady(true);
      return;
    }

    const existingScript = document.querySelector('script[src="https://cdn.iamport.kr/v1/iamport.js"]');
    if (existingScript) {
      existingScript.addEventListener('load', () => setImpReady(true));
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdn.iamport.kr/v1/iamport.js';
    script.async = true;
    script.onload = () => setImpReady(true);
    script.onerror = () => {
      // PortOne SDK 로드 실패 - 카드 결제 비활성화
    };
    document.head.appendChild(script);
  }, []);

  // 초기 데이터 로드: 모임 정보 + 포인트 + 기존 결제 상태
  useEffect(() => {
    const loadInitialData = async () => {
      if (!id) {
        setScreenState('error');
        setErrorMessage('모임 정보가 없습니다.');
        return;
      }

      try {
        // 모임 정보 조회와 포인트 조회를 병렬로 실행
        const [meetupRes, pointsRes] = await Promise.all([
          fetch(`${API_URL}/meetups/${id}`, { headers: getAuthHeader() }),
          fetch(`${API_URL}/user/points`, { headers: getAuthHeader() }).catch(() => null),
        ]);

        // 모임 정보 파싱
        const meetupData = await meetupRes.json();
        if (!meetupRes.ok || !meetupData.success) {
          setScreenState('error');
          setErrorMessage('모임 정보를 불러올 수 없습니다.');
          return;
        }

        const m = meetupData.data || meetupData.meetup || meetupData;
        const meetupInfo: MeetupInfo = {
          id: m.id,
          title: m.title || '약속',
          date: m.date || '',
          time: m.time || '',
          location: m.location || '',
          promiseDepositAmount: m.promiseDepositAmount ?? m.promise_deposit_amount ?? 3000,
          promiseDepositRequired: m.promiseDepositRequired ?? m.promise_deposit_required ?? true,
          hostName: m.hostName || m.host_name || '',
          category: m.category || '',
        };
        setMeetup(meetupInfo);

        // 약속금이 0원이면 결제 스킵 안내
        if (!meetupInfo.promiseDepositRequired || meetupInfo.promiseDepositAmount <= 0) {
          // 무료 모임 - 바로 참여 처리
          try {
            await fetch(`${API_URL}/meetups/${id}/join`, {
              method: 'POST',
              headers: getAuthHeader(),
            });
            showSuccess('무료 모임입니다. 약속에 참여되었습니다!');
            setTimeout(() => navigate(`/meetup/${id}`), 1500);
            return;
          } catch (_err) {
            // join 실패해도 계속 진행
          }
        }

        // 포인트 정보 파싱
        if (pointsRes) {
          try {
            const pointsData = await pointsRes.json();
            if (pointsData.success) {
              const pts = pointsData.data?.availablePoints ?? pointsData.data?.points ?? 0;
              setUserPoints({ availablePoints: pts, totalPoints: pts });

              if (pts >= meetupInfo.promiseDepositAmount) {
                setSelectedMethod('points');
              } else {
                setSelectedMethod('card');
              }
            }
          } catch (_e) {
            // 포인트 조회 실패 시 무시
          }
        }

        // 기존 결제 상태 확인 (이미 결제했는지)
        try {
          const depositRes = await fetch(`${API_URL}/deposits/refund-preview/${id}`, {
            headers: getAuthHeader(),
          });
          if (depositRes.ok) {
            const depositData = await depositRes.json();
            if (depositData.success && depositData.preview) {
              // 이미 결제된 약속금이 있음
              setExistingDeposit({
                id: depositData.preview.depositId || '',
                status: 'paid',
                amount: depositData.preview.originalAmount || meetupInfo.promiseDepositAmount,
                paidAt: depositData.preview.paidAt,
              });
              setScreenState('already_paid');
              return;
            }
          }
        } catch (_e) {
          // 조회 실패는 무시 (아직 결제 안 된 것)
        }

        setScreenState('payment');
      } catch (_error) {
        setScreenState('error');
        setErrorMessage('데이터를 불러오는 중 오류가 발생했습니다.');
      }
    };

    loadInitialData();
  }, [id, navigate]);

  // PortOne 카드 결제 처리
  const handlePortonePayment = useCallback(async () => {
    if (!impReady || !window.IMP) {
      showError('결제 모듈을 불러오는 중입니다. 잠시 후 다시 시도해주세요.');
      return;
    }

    setScreenState('processing');

    try {
      // 1. 서버에 결제 준비 요청
      const prepareResponse = await fetch(`${API_URL}/deposits/prepare`, {
        method: 'POST',
        headers: getAuthHeader(),
        body: JSON.stringify({
          amount: depositAmount,
          meetupId: id,
          paymentMethod: 'card',
        }),
      });

      const prepareData = await prepareResponse.json();
      if (!prepareData.success) {
        // 이미 결제한 경우
        if (prepareData.error?.includes('이미')) {
          setScreenState('already_paid');
          return;
        }
        showError(prepareData.error || '결제 준비에 실패했습니다.');
        setScreenState('payment');
        return;
      }

      const { paymentData } = prepareData;

      // 2. PortOne SDK 초기화 및 결제 요청
      window.IMP!.init(paymentData.storeId);

      window.IMP!.request_pay(
        {
          pg: 'html5_inicis',
          pay_method: 'card',
          merchant_uid: paymentData.merchantUid,
          name: paymentData.name,
          amount: paymentData.amount,
          buyer_name: paymentData.buyerName,
          buyer_email: paymentData.buyerEmail,
          m_redirect_url: `${window.location.origin}/meetup/${id}/deposit-payment/complete`,
        },
        async (response: any) => {
          if (response.success) {
            // 3. 결제 성공 - 서버에 검증 요청
            try {
              const verifyResponse = await fetch(`${API_URL}/deposits/verify`, {
                method: 'POST',
                headers: getAuthHeader(),
                body: JSON.stringify({
                  impUid: response.imp_uid,
                  merchantUid: response.merchant_uid,
                  depositId: paymentData.depositId,
                }),
              });

              const verifyData = await verifyResponse.json();

              if (verifyData.success) {
                // 모임 참여 API 호출
                await fetch(`${API_URL}/meetups/${id}/join`, {
                  method: 'POST',
                  headers: getAuthHeader(),
                });

                setScreenState('success');
              } else {
                setErrorMessage(verifyData.error || '결제 검증에 실패했습니다. 고객센터에 문의해주세요.');
                setScreenState('error');
              }
            } catch (_verifyError) {
              setErrorMessage('결제 검증 중 오류가 발생했습니다. 고객센터에 문의해주세요.');
              setScreenState('error');
            }
          } else {
            // 결제 실패 또는 사용자 취소
            const errorMsg = response.error_msg || '결제가 취소되었습니다.';
            showError(errorMsg);
            setScreenState('payment');
          }
        }
      );
    } catch (_error) {
      setErrorMessage('결제 처리 중 오류가 발생했습니다.');
      setScreenState('error');
    }
  }, [impReady, id, depositAmount, showError]);

  // 포인트 결제 처리
  const handlePointsPayment = useCallback(async () => {
    setScreenState('processing');

    try {
      // 서버 deposits/payment API 사용 (포인트 결제)
      const payResponse = await fetch(`${API_URL}/deposits/payment`, {
        method: 'POST',
        headers: getAuthHeader(),
        body: JSON.stringify({
          amount: depositAmount,
          meetupId: id,
          paymentMethod: 'points',
        }),
      });

      const payData = await payResponse.json();
      if (!payData.success) {
        // 이미 결제한 경우
        if (payData.error?.includes('이미')) {
          setScreenState('already_paid');
          return;
        }
        showError(payData.error || '결제에 실패했습니다.');
        setScreenState('payment');
        return;
      }

      // 모임 참여 API 호출
      await fetch(`${API_URL}/meetups/${id}/join`, {
        method: 'POST',
        headers: getAuthHeader(),
      });

      setScreenState('success');
    } catch (_error) {
      setErrorMessage('결제 중 오류가 발생했습니다.');
      setScreenState('error');
    }
  }, [id, depositAmount, showError]);

  // 결제 실행
  const handlePayment = async () => {
    if (selectedMethod === 'points' && userPoints.availablePoints < depositAmount) {
      // 포인트 부족 - 충전 안내
      sessionStorage.setItem('returnUrl', `/meetup/${id}/deposit-payment`);
      sessionStorage.setItem('requiredPoints', (depositAmount - userPoints.availablePoints).toString());
      navigate(`/payment?amount=${depositAmount - userPoints.availablePoints}&reason=deposit`);
      return;
    }

    if (selectedMethod === 'card') {
      await handlePortonePayment();
    } else {
      await handlePointsPayment();
    }
  };

  // 재시도
  const handleRetry = () => {
    setErrorMessage('');
    setScreenState('payment');
  };

  // 채팅방 이동
  const handleGoToChat = async () => {
    try {
      const response = await fetch(`${API_URL}/chat/rooms/by-meetup/${id}`, {
        headers: getAuthHeader(),
      });
      const data = await response.json();
      if (data.success && data.data?.chatRoomId) {
        navigate(`/chat/${data.data.chatRoomId}`);
        return;
      }
    } catch (_e) {
      // 채팅방 조회 실패
    }
    navigate(`/meetup/${id}`);
  };

  // ============ 로딩 화면 ============
  if (screenState === 'loading') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigate(`/meetup/${id}`)} style={styles.backButton}>
            <Icon name="chevron-left" size={24} color={COLORS.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>약속금 결제</Text>
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary.accent} />
          <Text style={styles.loadingText}>결제 정보를 불러오는 중...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ============ 결제 성공 화면 ============
  if (screenState === 'success') {
    return (
      <SafeAreaView style={styles.container}>
        <FadeIn>
          <View style={styles.centerContainer}>
            <div style={{
              width: 100,
              height: 100,
              borderRadius: 50,
              background: COLORS.functional.successLight,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 28,
            }}>
              <Icon name="check" size={48} color={COLORS.functional.success} />
            </div>
            <Text style={styles.successTitle}>결제 완료!</Text>
            <Text style={styles.successAmount}>
              {depositAmount.toLocaleString()}원
            </Text>
            <Text style={styles.successMessage}>
              약속금이 결제되었습니다.{'\n'}
              약속에 참여되었어요!
            </Text>

            <View style={styles.successInfoBox}>
              <View style={styles.successInfoRow}>
                <Icon name="calendar" size={16} color={COLORS.text.secondary} />
                <Text style={styles.successInfoText}>
                  {meetup?.title || '약속'}
                </Text>
              </View>
              <View style={styles.successInfoRow}>
                <Icon name="shield" size={16} color={COLORS.functional.success} />
                <Text style={styles.successInfoText}>
                  정상 참석 + 리뷰 작성 시 24시간 내 전액 환불
                </Text>
              </View>
            </View>

            <View style={styles.successButtonContainer}>
              <div
                style={{
                  background: COLORS.gradient.heroCSS,
                  borderRadius: 8,
                  boxShadow: CSS_SHADOWS.cta,
                  cursor: 'pointer',
                  flex: 1,
                }}
              >
                <TouchableOpacity
                  style={styles.successButton}
                  onPress={handleGoToChat}
                >
                  <Icon name="message-circle" size={18} color={COLORS.neutral.white} />
                  <Text style={styles.successButtonText}>채팅방 입장</Text>
                </TouchableOpacity>
              </div>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => navigate(`/meetup/${id}`)}
              >
                <Text style={styles.secondaryButtonText}>약속 상세보기</Text>
              </TouchableOpacity>
            </View>
          </View>
        </FadeIn>
      </SafeAreaView>
    );
  }

  // ============ 이미 결제 완료 화면 ============
  if (screenState === 'already_paid') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigate(`/meetup/${id}`)} style={styles.backButton}>
            <Icon name="chevron-left" size={24} color={COLORS.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>약속금 결제</Text>
        </View>
        <FadeIn>
          <View style={styles.centerContainer}>
            <div style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              background: COLORS.functional.infoLight,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 24,
            }}>
              <Icon name="check-circle" size={40} color={COLORS.functional.info} />
            </div>
            <Text style={styles.alreadyPaidTitle}>이미 결제 완료</Text>
            <Text style={styles.alreadyPaidMessage}>
              이 약속의 약속금은 이미 결제되었습니다.
            </Text>
            {existingDeposit && (
              <Text style={styles.alreadyPaidAmount}>
                결제 금액: {existingDeposit.amount.toLocaleString()}원
              </Text>
            )}

            <View style={styles.successButtonContainer}>
              <div
                style={{
                  background: COLORS.gradient.heroCSS,
                  borderRadius: 8,
                  boxShadow: CSS_SHADOWS.cta,
                  cursor: 'pointer',
                  flex: 1,
                }}
              >
                <TouchableOpacity
                  style={styles.successButton}
                  onPress={handleGoToChat}
                >
                  <Icon name="message-circle" size={18} color={COLORS.neutral.white} />
                  <Text style={styles.successButtonText}>채팅방 입장</Text>
                </TouchableOpacity>
              </div>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => navigate(`/meetup/${id}`)}
              >
                <Text style={styles.secondaryButtonText}>약속 상세보기</Text>
              </TouchableOpacity>
            </View>
          </View>
        </FadeIn>
      </SafeAreaView>
    );
  }

  // ============ 에러 화면 ============
  if (screenState === 'error') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigate(`/meetup/${id}`)} style={styles.backButton}>
            <Icon name="chevron-left" size={24} color={COLORS.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>약속금 결제</Text>
        </View>
        <FadeIn>
          <View style={styles.centerContainer}>
            <div style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              background: COLORS.functional.errorLight,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 24,
            }}>
              <Icon name="alert-circle" size={40} color={COLORS.functional.error} />
            </div>
            <Text style={styles.errorTitle}>결제 실패</Text>
            <Text style={styles.errorMessage}>
              {errorMessage || '결제 처리 중 오류가 발생했습니다.'}
            </Text>

            <View style={styles.errorButtonContainer}>
              <div
                style={{
                  background: COLORS.gradient.heroCSS,
                  borderRadius: 8,
                  boxShadow: CSS_SHADOWS.cta,
                  cursor: 'pointer',
                }}
              >
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={handleRetry}
                >
                  <Icon name="refresh-cw" size={18} color={COLORS.neutral.white} />
                  <Text style={styles.retryButtonText}>다시 시도</Text>
                </TouchableOpacity>
              </div>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => navigate(`/meetup/${id}`)}
              >
                <Text style={styles.secondaryButtonText}>약속으로 돌아가기</Text>
              </TouchableOpacity>
            </View>
          </View>
        </FadeIn>
      </SafeAreaView>
    );
  }

  // ============ 결제 진행중 화면 ============
  if (screenState === 'processing') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigate(`/meetup/${id}`)} style={styles.backButton}>
            <Icon name="chevron-left" size={24} color={COLORS.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>약속금 결제</Text>
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary.accent} />
          <Text style={styles.processingTitle}>결제 처리 중...</Text>
          <Text style={styles.processingMessage}>
            잠시만 기다려주세요.{'\n'}결제창이 닫히지 않으면 결제를 완료해주세요.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ============ 결제 선택 화면 (메인) ============
  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigate(`/meetup/${id}`)} style={styles.backButton}>
          <Icon name="chevron-left" size={24} color={COLORS.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>서로의 신뢰를 위해{'\n'}약속금을 미리 걸어둬요</Text>
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        <FadeIn>
          {/* 모임 정보 */}
          {meetup && (
            <View style={styles.meetupInfoCard}>
              <Text style={styles.meetupTitle}>{meetup.title}</Text>
              <View style={styles.meetupInfoRow}>
                <Icon name="map-pin" size={14} color={COLORS.text.tertiary} />
                <Text style={styles.meetupInfoText}>{meetup.location || '위치 미정'}</Text>
              </View>
              {meetup.date && (
                <View style={styles.meetupInfoRow}>
                  <Icon name="calendar" size={14} color={COLORS.text.tertiary} />
                  <Text style={styles.meetupInfoText}>{meetup.date} {meetup.time}</Text>
                </View>
              )}
            </View>
          )}

          {/* 약속금 정보 */}
          <View style={styles.amountSection}>
            <Text style={styles.amountLabel}>약속금</Text>
            <Text style={styles.amountValue}>{depositAmount.toLocaleString()}원</Text>
            <View style={styles.warningBox}>
              <Icon name="info" size={14} color={COLORS.functional.info} />
              <Text style={styles.amountDescription}>
                노쇼 방지 목적이며, 정상 참석 시 환불됩니다.
              </Text>
            </View>
          </View>

          {/* 취소/환불 정책 안내 */}
          <View style={styles.policySection}>
            <Text style={styles.policySectionTitle}>취소/환불 정책</Text>
            <View style={styles.policyCard}>
              <View style={styles.policyRow}>
                <View style={[styles.policyDot, { backgroundColor: COLORS.functional.success }]} />
                <View style={styles.policyContent}>
                  <Text style={styles.policyLabel}>정상 참석 + 리뷰 작성</Text>
                  <Text style={styles.policyValue}>24시간 내 전액 환불 (100%)</Text>
                </View>
              </View>
              <View style={styles.policyDivider} />
              <View style={styles.policyRow}>
                <View style={[styles.policyDot, { backgroundColor: COLORS.functional.info }]} />
                <View style={styles.policyContent}>
                  <Text style={styles.policyLabel}>정상 참석 (리뷰 미작성)</Text>
                  <Text style={styles.policyValue}>포인트로 전환 (100%)</Text>
                </View>
              </View>
              <View style={styles.policyDivider} />
              <View style={styles.policyRow}>
                <View style={[styles.policyDot, { backgroundColor: COLORS.functional.warning }]} />
                <View style={styles.policyContent}>
                  <Text style={styles.policyLabel}>24시간 전 취소</Text>
                  <Text style={styles.policyValue}>전액 환불 (100%)</Text>
                </View>
              </View>
              <View style={styles.policyDivider} />
              <View style={styles.policyRow}>
                <View style={[styles.policyDot, { backgroundColor: COLORS.functional.warning }]} />
                <View style={styles.policyContent}>
                  <Text style={styles.policyLabel}>24시간 ~ 1시간 전 취소</Text>
                  <Text style={styles.policyValue}>부분 환불 (60%)</Text>
                </View>
              </View>
              <View style={styles.policyDivider} />
              <View style={styles.policyRow}>
                <View style={[styles.policyDot, { backgroundColor: COLORS.functional.error }]} />
                <View style={styles.policyContent}>
                  <Text style={styles.policyLabel}>1시간 이내 취소 / 노쇼</Text>
                  <Text style={styles.policyValue}>환불 불가 (0%)</Text>
                </View>
              </View>
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
                <View>
                  <Text style={styles.paymentOptionText}>포인트 결제</Text>
                  <Text style={styles.paymentOptionSub}>보유 포인트로 바로 결제</Text>
                </View>
              </View>
              <View style={styles.paymentOptionRight}>
                <Text style={[
                  styles.pointsText,
                  userPoints.availablePoints < depositAmount && styles.insufficientPoints
                ]}>
                  {userPoints.availablePoints.toLocaleString()}P
                </Text>
                {userPoints.availablePoints < depositAmount && (
                  <Text style={styles.insufficientText}>
                    {(depositAmount - userPoints.availablePoints).toLocaleString()}P 부족
                  </Text>
                )}
              </View>
            </TouchableOpacity>

            {/* 카드 결제 (PortOne) */}
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
                <View>
                  <Text style={styles.paymentOptionText}>카드 결제</Text>
                  <Text style={styles.paymentOptionSub}>신용/체크카드</Text>
                </View>
              </View>
              {selectedMethod === 'card' && !impReady && (
                <Text style={styles.sdkLoadingText}>로딩중...</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* 플랫폼 수수료 안내 */}
          <View style={styles.feeNotice}>
            <Icon name="info" size={13} color={COLORS.text.tertiary} />
            <Text style={styles.feeNoticeText}>
              플랫폼 수수료 5%는 별도 부과되지 않습니다 (서비스 부담).
            </Text>
          </View>

          <View style={{ height: 100 }} />
        </FadeIn>
      </ScrollView>

      {/* 고정 결제 버튼 */}
      <View style={styles.fixedBottom}>
        <div
          style={{
            background: COLORS.gradient.heroCSS,
            borderRadius: 8,
            boxShadow: '0 4px 12px rgba(224,146,110,0.3), 0 8px 24px rgba(224,146,110,0.15)',
            cursor: 'pointer',
            transition: 'all 200ms ease',
            transform: payButtonHovered ? 'scale(1.02)' : 'scale(1)',
          }}
          onMouseEnter={() => setPayButtonHovered(true)}
          onMouseLeave={() => setPayButtonHovered(false)}
        >
          <TouchableOpacity
            style={styles.paymentButton}
            onPress={handlePayment}
          >
            <Text style={styles.paymentButtonText}>
              {selectedMethod === 'points' && userPoints.availablePoints < depositAmount
                ? '포인트 충전하기'
                : `${depositAmount.toLocaleString()}원 결제하기`
              }
            </Text>
          </TouchableOpacity>
        </div>
      </View>

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
    ...HEADER_STYLE.sub,
    ...SHADOWS.sticky,
    zIndex: 10,
  },
  backButton: {
    padding: 10,
    marginRight: 8,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    ...HEADER_STYLE.subTitle,
    lineHeight: 26,
  },
  // 센터 컨테이너 (성공/에러/로딩 화면용)
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingBottom: 60,
  },
  loadingText: {
    fontSize: 15,
    color: COLORS.text.secondary,
    marginTop: 16,
  },
  // 모임 정보 카드
  meetupInfoCard: {
    marginHorizontal: 20,
    marginTop: 16,
    padding: 16,
    backgroundColor: COLORS.neutral.white,
    borderRadius: BORDER_RADIUS.md,
    ...CARD_STYLE,
    ...SHADOWS.small,
  },
  meetupTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: 10,
  },
  meetupInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  meetupInfoText: {
    fontSize: 13,
    color: COLORS.text.secondary,
  },
  // 약속금 정보
  amountSection: {
    padding: 24,
    alignItems: 'center',
    marginVertical: 12,
    marginHorizontal: 20,
    backgroundColor: COLORS.neutral.white,
    borderRadius: BORDER_RADIUS.md,
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
    fontSize: 40,
    fontWeight: '700',
    color: COLORS.primary.main,
    marginBottom: 16,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primary.light,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  amountDescription: {
    fontSize: 13,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  // 취소/환불 정책
  policySection: {
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  policySectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: 12,
  },
  policyCard: {
    backgroundColor: COLORS.neutral.white,
    borderRadius: BORDER_RADIUS.md,
    padding: 16,
    ...CARD_STYLE,
    ...SHADOWS.small,
  },
  policyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
  },
  policyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 5,
    marginRight: 12,
  },
  policyContent: {
    flex: 1,
  },
  policyLabel: {
    fontSize: 14,
    color: COLORS.text.primary,
    fontWeight: '500',
    marginBottom: 2,
  },
  policyValue: {
    fontSize: 13,
    color: COLORS.text.secondary,
  },
  policyDivider: {
    height: 1,
    backgroundColor: COLORS.neutral.grey100,
    marginVertical: 2,
  },
  // 결제 방식
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
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1.5,
    borderColor: 'rgba(224,146,110,0.08)',
    marginBottom: 12,
    ...SHADOWS.small,
  },
  selectedOption: {
    borderColor: COLORS.primary.accent,
    borderWidth: 2,
    backgroundColor: COLORS.primary.light,
    ...SHADOWS.cta,
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
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  paymentOptionSub: {
    fontSize: 12,
    color: COLORS.text.tertiary,
    marginTop: 2,
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
  sdkLoadingText: {
    fontSize: 12,
    color: COLORS.text.tertiary,
  },
  // 수수료 안내
  feeNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 24,
    marginBottom: 8,
  },
  feeNoticeText: {
    fontSize: 12,
    color: COLORS.text.tertiary,
    lineHeight: 16,
  },
  // 고정 하단 결제 버튼
  fixedBottom: {
    padding: 20,
    paddingBottom: 28,
    backgroundColor: COLORS.neutral.white,
    borderTopWidth: 1,
    borderTopColor: 'rgba(17,17,17,0.06)',
    ...SHADOWS.sticky,
  },
  paymentButton: {
    paddingVertical: 18,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  paymentButtonText: {
    color: COLORS.neutral.white,
    fontSize: 17,
    fontWeight: '700',
  },
  // 성공 화면
  successTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: COLORS.functional.success,
    marginBottom: 8,
    textAlign: 'center',
  },
  successAmount: {
    fontSize: 36,
    fontWeight: '700',
    color: COLORS.primary.main,
    marginBottom: 12,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: 16,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 28,
  },
  successInfoBox: {
    backgroundColor: COLORS.neutral.grey50,
    borderRadius: BORDER_RADIUS.md,
    padding: 16,
    width: '100%',
    maxWidth: 340,
    marginBottom: 32,
    gap: 10,
  },
  successInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  successInfoText: {
    fontSize: 14,
    color: COLORS.text.secondary,
    flex: 1,
    lineHeight: 20,
  },
  successButtonContainer: {
    width: '100%',
    maxWidth: 340,
    gap: 12,
  },
  successButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  successButtonText: {
    color: COLORS.neutral.white,
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    paddingVertical: 14,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.neutral.grey200,
    alignItems: 'center',
    backgroundColor: COLORS.neutral.white,
  },
  secondaryButtonText: {
    color: COLORS.text.secondary,
    fontSize: 15,
    fontWeight: '600',
  },
  // 이미 결제 완료 화면
  alreadyPaidTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.functional.info,
    marginBottom: 12,
    textAlign: 'center',
  },
  alreadyPaidMessage: {
    fontSize: 15,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 8,
  },
  alreadyPaidAmount: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 32,
    textAlign: 'center',
  },
  // 에러 화면
  errorTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.functional.error,
    marginBottom: 12,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 15,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  errorButtonContainer: {
    width: '100%',
    maxWidth: 340,
    gap: 12,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  retryButtonText: {
    color: COLORS.neutral.white,
    fontSize: 16,
    fontWeight: '700',
  },
  // 처리 중 화면
  processingTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginTop: 24,
    marginBottom: 8,
    textAlign: 'center',
  },
  processingMessage: {
    fontSize: 14,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});

export default DepositPaymentScreen;
