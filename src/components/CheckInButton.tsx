import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform, PermissionsAndroid, Modal, ActivityIndicator } from 'react-native';
import { COLORS, SHADOWS } from '../styles/colors';

// Only import native Geolocation on non-web platforms
let Geolocation: any = null;
if (Platform.OS !== 'web') {
  try {
    Geolocation = require('@react-native-community/geolocation').default;
  } catch (_e) {
    // Module not available
  }
}
import { Icon } from './Icon';
import apiClient from '../services/apiClient';

const QR_REFRESH_INTERVAL = 10 * 60 * 1000; // 10분

interface AttendanceInfo {
  attended: boolean;
  attendedAt: string | null;
  distance?: number;
  attendanceType?: string;
}

interface CheckInButtonProps {
  meetupId: string;
  meetupStatus: string;
  meetupLocation: string;
  meetupLatitude?: number;
  meetupLongitude?: number;
  checkInRadius?: number;
  isHost?: boolean;
  onCheckInSuccess?: () => void;
}

const CheckInButton: React.FC<CheckInButtonProps> = ({
  meetupId,
  meetupStatus,
  meetupLocation,
  meetupLatitude,
  meetupLongitude,
  checkInRadius = 300,
  isHost = false,
  onCheckInSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [myAttendance, setMyAttendance] = useState<AttendanceInfo | null>(null);
  const [attendanceData, setAttendanceData] = useState<any>(null);

  // QR 관련 state
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [qrData, setQrData] = useState<string | null>(null);
  const [qrExpiresAt, setQrExpiresAt] = useState<Date | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrTimeLeft, setQrTimeLeft] = useState<number>(0);

  // QR 스캔 관련 state
  const [scanModalVisible, setScanModalVisible] = useState(false);
  const [scanInput, setScanInput] = useState('');
  const [scanLoading, setScanLoading] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (meetupStatus === '진행중' || meetupStatus === '종료') {
      fetchAttendance();
    }
  }, [meetupId, meetupStatus]);

  // QR 타이머
  useEffect(() => {
    if (qrExpiresAt && qrModalVisible) {
      timerRef.current = setInterval(() => {
        const remaining = Math.max(0, qrExpiresAt.getTime() - Date.now());
        setQrTimeLeft(remaining);

        if (remaining <= 0) {
          // 자동 재생성
          handleGenerateQR();
        }
      }, 1000);

      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      };
    }
  }, [qrExpiresAt, qrModalVisible]);

  // 모달 닫을 때 타이머 정리
  useEffect(() => {
    if (!qrModalVisible && timerRef.current) {
      clearInterval(timerRef.current);
    }
  }, [qrModalVisible]);

  const fetchAttendance = async () => {
    try {
      const response = await apiClient.get(`/meetups/${meetupId}/attendance`);
      if (response.data) {
        setAttendanceData(response.data);
        setMyAttendance(response.data.myAttendance);
      }
    } catch (_error) {
      // 조용히 실패
    }
  };

  // Android 위치 권한 요청
  const requestLocationPermission = async (): Promise<boolean> => {
    if (Platform.OS === 'web' || Platform.OS === 'ios') {
      return true;
    }

    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: '위치 권한 필요',
          message: 'GPS 체크인을 위해 위치 권한이 필요합니다.',
          buttonNeutral: '나중에',
          buttonNegative: '거부',
          buttonPositive: '허용',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (_err) {
      return false;
    }
  };

  const handleCheckIn = async () => {
    if (loading) {return;}

    setLoading(true);
    try {
      const hasPermission = await requestLocationPermission();
      if (!hasPermission) {
        Alert.alert('위치 권한 필요', 'GPS 체크인을 위해 위치 권한이 필요합니다.\nQR 체크인을 사용해보세요.');
        setLoading(false);
        return;
      }

      const geoSuccess = async (position: any) => {
        const { latitude, longitude } = position.coords;

        try {
          const response = await apiClient.post(`/meetups/${meetupId}/checkin/gps`, {
            latitude,
            longitude,
          });

          if (response.data?.success) {
            const result = response.data.data;
            Alert.alert(
              '체크인 완료',
              `${result.distance}m 거리에서 체크인되었습니다.`,
              [{ text: '확인' }]
            );
            setMyAttendance({
              attended: true,
              attendedAt: result.checkedInAt,
              distance: result.distance,
              attendanceType: 'gps',
            });
            onCheckInSuccess?.();
          }
        } catch (error: any) {
          const errorMessage = error.response?.data?.error || '체크인 중 오류가 발생했습니다.';
          const distance = error.response?.data?.distance;
          const maxDistance = error.response?.data?.maxDistance;

          if (distance && maxDistance) {
            Alert.alert(
              '체크인 실패',
              `현재 위치가 약속 장소에서 ${distance}m 떨어져 있습니다.\n체크인 가능 거리: ${maxDistance}m 이내\n\nQR 체크인을 사용해보세요.`,
              [
                { text: '확인' },
                { text: 'QR 체크인', onPress: () => setScanModalVisible(true) },
              ]
            );
          } else {
            Alert.alert('체크인 실패', errorMessage);
          }
        } finally {
          setLoading(false);
        }
      };

      const geoError = (_error: any) => {
        Alert.alert(
          '위치 오류',
          '현재 위치를 가져올 수 없습니다.\nQR 체크인을 사용해보세요.',
          [
            { text: '확인' },
            { text: 'QR 체크인', onPress: () => setScanModalVisible(true) },
          ]
        );
        setLoading(false);
      };

      const geoOptions = {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 10000,
      };

      if (Platform.OS === 'web') {
        // Use browser geolocation API on web
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(geoSuccess, geoError, geoOptions);
        } else {
          geoError(new Error('Geolocation not available'));
        }
      } else if (Geolocation) {
        Geolocation.getCurrentPosition(geoSuccess, geoError, geoOptions);
      } else {
        geoError(new Error('Geolocation module not available'));
      }
    } catch (_error: any) {
      Alert.alert('체크인 실패', '체크인 중 오류가 발생했습니다.');
      setLoading(false);
    }
  };

  // 호스트: QR 토큰 생성
  const handleGenerateQR = useCallback(async () => {
    setQrLoading(true);
    try {
      const response = await apiClient.post(`/meetups/${meetupId}/qrcode/generate`);
      if (response.data?.success) {
        const { qrCodeData, expiresAt } = response.data.data;
        setQrData(qrCodeData);
        setQrExpiresAt(new Date(expiresAt));
        setQrTimeLeft(new Date(expiresAt).getTime() - Date.now());
      }
    } catch (_error) {
      Alert.alert('오류', 'QR 코드 생성에 실패했습니다.');
    } finally {
      setQrLoading(false);
    }
  }, [meetupId]);

  // 호스트: QR 모달 열기
  const handleOpenQRModal = async () => {
    setQrModalVisible(true);
    await handleGenerateQR();
  };

  // 참가자: QR 체크인 수행
  const handleQRCheckin = async (tokenData: string) => {
    setScanLoading(true);
    try {
      let parsedToken: string;
      try {
        const parsed = JSON.parse(tokenData);
        parsedToken = parsed.token;
      } catch {
        // 직접 토큰 문자열인 경우
        parsedToken = tokenData;
      }

      const response = await apiClient.post(`/meetups/${meetupId}/checkin/qr`, {
        token: parsedToken,
      });

      if (response.data?.success) {
        Alert.alert('체크인 완료', 'QR 코드 체크인이 완료되었습니다!');
        setMyAttendance({
          attended: true,
          attendedAt: new Date().toISOString(),
          attendanceType: 'qr',
        });
        setScanModalVisible(false);
        setScanInput('');
        onCheckInSuccess?.();
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'QR 체크인에 실패했습니다.';
      Alert.alert('체크인 실패', errorMessage);
    } finally {
      setScanLoading(false);
    }
  };

  const formatTimeLeft = (ms: number): string => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // 모임 상태가 진행중이 아니면 체크인 버튼 숨기기
  if (meetupStatus !== '진행중') {
    return null;
  }

  // 이미 체크인한 경우
  if (myAttendance?.attended) {
    const attendedTime = myAttendance.attendedAt
      ? new Date(myAttendance.attendedAt).toLocaleTimeString('ko-KR', {
          hour: '2-digit',
          minute: '2-digit',
        })
      : '';

    const typeLabel = myAttendance.attendanceType === 'qr' ? 'QR' : 'GPS';

    return (
      <View style={styles.container}>
        <View style={styles.checkedInContainer}>
          <View style={styles.checkedInIcon}>
            <Icon name="check-circle" size={24} color={COLORS.functional.success} />
          </View>
          <View style={styles.checkedInInfo}>
            <Text style={styles.checkedInTitle}>체크인 완료</Text>
            <Text style={styles.checkedInTime}>
              {attendedTime} ({typeLabel} 인증{myAttendance.distance ? `, ${myAttendance.distance}m` : ''})
            </Text>
          </View>
        </View>

        {/* 호스트는 체크인 완료 후에도 QR 코드 표시 가능 */}
        {isHost && (
          <TouchableOpacity style={styles.qrHostButton} onPress={handleOpenQRModal}>
            <Icon name="grid" size={18} color={COLORS.neutral.white} />
            <Text style={styles.qrHostButtonText}>QR 체크인 열기</Text>
          </TouchableOpacity>
        )}

        {attendanceData && (
          <View style={styles.attendanceStats}>
            <Text style={styles.attendanceText}>
              출석: {attendanceData.attendedCount}/{attendanceData.totalParticipants}명
            </Text>
          </View>
        )}

        {renderQRHostModal()}
      </View>
    );
  }

  // 호스트 QR 코드 모달
  function renderQRHostModal() {
    return (
      <Modal
        visible={qrModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setQrModalVisible(false)}
      >
        <View style={styles.qrModalOverlay}>
          <View style={styles.qrModalContainer}>
            <View style={styles.qrModalHeader}>
              <Text style={styles.qrModalTitle}>QR 체크인</Text>
              <TouchableOpacity onPress={() => setQrModalVisible(false)}>
                <Icon name="x" size={24} color={COLORS.text.secondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.qrModalBody}>
              {qrLoading ? (
                <View style={styles.qrLoadingContainer}>
                  <ActivityIndicator size="large" color={COLORS.primary.main} />
                  <Text style={styles.qrLoadingText}>QR 코드 생성 중...</Text>
                </View>
              ) : qrData ? (
                <View style={styles.qrCodeContainer}>
                  {/* QR 코드 표시 영역 */}
                  <View style={styles.qrCodeBox}>
                    <View style={styles.qrPlaceholder}>
                      <Icon name="grid" size={80} color={COLORS.primary.main} />
                      <Text style={styles.qrPlaceholderText}>QR Code</Text>
                      <Text style={styles.qrDataText} numberOfLines={2} ellipsizeMode="middle">
                        {qrData}
                      </Text>
                    </View>
                  </View>

                  {/* 타이머 */}
                  <View style={styles.qrTimerContainer}>
                    <Icon name="clock" size={16} color={qrTimeLeft < 60000 ? COLORS.functional.error : COLORS.text.secondary} />
                    <Text style={[
                      styles.qrTimerText,
                      qrTimeLeft < 60000 && styles.qrTimerExpiring
                    ]}>
                      {qrTimeLeft <= 0 ? '만료됨' : `${formatTimeLeft(qrTimeLeft)} 남음`}
                    </Text>
                  </View>

                  <Text style={styles.qrInstructionText}>
                    이 QR 코드를 참가자에게 보여주세요
                  </Text>

                  <TouchableOpacity
                    style={styles.qrRefreshButton}
                    onPress={handleGenerateQR}
                    disabled={qrLoading}
                  >
                    <Icon name="refresh-cw" size={16} color={COLORS.primary.main} />
                    <Text style={styles.qrRefreshButtonText}>새 QR 코드 생성</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.qrErrorContainer}>
                  <Icon name="alert-circle" size={48} color={COLORS.functional.error} />
                  <Text style={styles.qrErrorText}>QR 코드를 생성하지 못했습니다</Text>
                  <TouchableOpacity style={styles.qrRetryButton} onPress={handleGenerateQR}>
                    <Text style={styles.qrRetryButtonText}>다시 시도</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  // 참가자 QR 스캔 모달 (웹 환경: 텍스트 입력 방식)
  function renderQRScanModal() {
    return (
      <Modal
        visible={scanModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setScanModalVisible(false)}
      >
        <View style={styles.qrModalOverlay}>
          <View style={styles.qrModalContainer}>
            <View style={styles.qrModalHeader}>
              <Text style={styles.qrModalTitle}>QR 체크인</Text>
              <TouchableOpacity onPress={() => setScanModalVisible(false)}>
                <Icon name="x" size={24} color={COLORS.text.secondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.qrModalBody}>
              <View style={styles.scanInstructionContainer}>
                <Icon name="camera" size={48} color={COLORS.primary.main} />
                <Text style={styles.scanInstructionTitle}>
                  호스트의 QR 코드를 스캔하세요
                </Text>
                <Text style={styles.scanInstructionText}>
                  호스트에게 QR 코드를 요청한 후{'\n'}카메라로 스캔하거나 코드를 입력해주세요
                </Text>
              </View>

              {/* 카메라 스캔은 네이티브에서만 - 웹에서는 코드 직접 입력 */}
              {Platform.OS === 'web' && (
                <View style={styles.scanInputContainer}>
                  <Text style={styles.scanInputLabel}>체크인 코드 직접 입력</Text>
                  <View style={styles.scanInputRow}>
                    <View style={styles.scanInputWrapper}>
                      <Icon name="hash" size={18} color={COLORS.text.tertiary} />
                      <input
                        type="text"
                        placeholder="QR 코드 데이터를 붙여넣으세요"
                        value={scanInput}
                        onChange={(e: any) => setScanInput(e.target.value)}
                        style={{
                          flex: 1,
                          border: 'none',
                          outline: 'none',
                          fontSize: 14,
                          color: COLORS.text.primary,
                          backgroundColor: 'transparent',
                          padding: '8px',
                        }}
                      />
                    </View>
                    <TouchableOpacity
                      style={[styles.scanSubmitButton, (!scanInput.trim() || scanLoading) && styles.scanSubmitDisabled]}
                      onPress={() => handleQRCheckin(scanInput.trim())}
                      disabled={!scanInput.trim() || scanLoading}
                    >
                      {scanLoading ? (
                        <ActivityIndicator size="small" color={COLORS.neutral.white} />
                      ) : (
                        <Text style={styles.scanSubmitText}>확인</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  // 체크인 가능 상태
  return (
    <View style={styles.container}>
      <View style={styles.infoContainer}>
        <Icon name="map-pin" size={20} color={COLORS.primary.accent} />
        <Text style={styles.infoText}>
          {meetupLocation} 근처 {checkInRadius}m 이내에서 체크인하세요
        </Text>
      </View>

      {/* GPS 체크인 버튼 */}
      <TouchableOpacity
        style={[styles.checkInButton, loading && styles.checkInButtonDisabled]}
        onPress={handleCheckIn}
        disabled={loading}
      >
        <Icon name="map-pin" size={20} color={COLORS.neutral.white} />
        <Text style={styles.checkInButtonText}>
          {loading ? '위치 확인 중...' : 'GPS 체크인'}
        </Text>
      </TouchableOpacity>

      {/* QR 버튼 영역 */}
      <View style={styles.qrButtonRow}>
        {isHost ? (
          <TouchableOpacity style={styles.qrHostButton} onPress={handleOpenQRModal}>
            <Icon name="grid" size={18} color={COLORS.neutral.white} />
            <Text style={styles.qrHostButtonText}>QR 체크인 열기</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.qrScanButton} onPress={() => setScanModalVisible(true)}>
            <Icon name="camera" size={18} color={COLORS.primary.main} />
            <Text style={styles.qrScanButtonText}>QR로 체크인</Text>
          </TouchableOpacity>
        )}
      </View>

      {attendanceData && (
        <View style={styles.attendanceStats}>
          <Text style={styles.attendanceText}>
            현재 {attendanceData.attendedCount}/{attendanceData.totalParticipants}명 체크인
          </Text>
        </View>
      )}

      {renderQRHostModal()}
      {renderQRScanModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.neutral.white,
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.neutral.grey200,
    ...SHADOWS.small,
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    color: COLORS.text.secondary,
    flex: 1,
  },
  checkInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary.accent,
    borderRadius: 6,
    paddingVertical: 14,
    gap: 8,
  },
  checkInButtonDisabled: {
    opacity: 0.6,
  },
  checkInButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.neutral.white,
  },
  // QR 버튼 영역
  qrButtonRow: {
    marginTop: 10,
  },
  qrHostButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary.dark,
    borderRadius: 6,
    paddingVertical: 12,
    gap: 8,
    marginTop: 8,
  },
  qrHostButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.neutral.white,
  },
  qrScanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.primary.main,
    borderRadius: 6,
    paddingVertical: 12,
    gap: 8,
    backgroundColor: COLORS.neutral.white,
  },
  qrScanButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.primary.main,
  },
  // Checked in
  checkedInContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkedInIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.functional.success + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkedInInfo: {
    flex: 1,
  },
  checkedInTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.functional.success,
    marginBottom: 2,
  },
  checkedInTime: {
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  attendanceStats: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.neutral.grey200,
    alignItems: 'center',
  },
  attendanceText: {
    fontSize: 14,
    color: COLORS.text.secondary,
    fontWeight: '500',
  },
  // QR Host Modal
  qrModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  qrModalContainer: {
    backgroundColor: COLORS.neutral.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
  },
  qrModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(17,17,17,0.06)',
  },
  qrModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  qrModalBody: {
    padding: 20,
    alignItems: 'center',
  },
  qrLoadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 12,
  },
  qrLoadingText: {
    fontSize: 15,
    color: COLORS.text.secondary,
  },
  qrCodeContainer: {
    alignItems: 'center',
    width: '100%',
  },
  qrCodeBox: {
    width: 300,
    height: 300,
    backgroundColor: COLORS.neutral.white,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: COLORS.neutral.grey200,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.medium,
  },
  qrPlaceholder: {
    alignItems: 'center',
    gap: 8,
  },
  qrPlaceholderText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary.main,
  },
  qrDataText: {
    fontSize: 10,
    color: COLORS.text.tertiary,
    maxWidth: 250,
    textAlign: 'center',
  },
  qrTimerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: COLORS.neutral.grey100,
    borderRadius: 20,
  },
  qrTimerText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text.secondary,
  },
  qrTimerExpiring: {
    color: COLORS.functional.error,
  },
  qrInstructionText: {
    fontSize: 15,
    color: COLORS.text.secondary,
    marginTop: 16,
    textAlign: 'center',
  },
  qrRefreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: COLORS.primary.main,
    borderRadius: 8,
  },
  qrRefreshButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary.main,
  },
  qrErrorContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  qrErrorText: {
    fontSize: 15,
    color: COLORS.text.secondary,
  },
  qrRetryButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: COLORS.primary.main,
    borderRadius: 8,
  },
  qrRetryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.neutral.white,
  },
  // QR Scan Modal
  scanInstructionContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 12,
  },
  scanInstructionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  scanInstructionText: {
    fontSize: 14,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  scanInputContainer: {
    width: '100%',
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(17,17,17,0.06)',
  },
  scanInputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 10,
  },
  scanInputRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  scanInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.neutral.grey200,
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: COLORS.neutral.grey100,
    minHeight: 44,
  },
  scanSubmitButton: {
    backgroundColor: COLORS.primary.main,
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  scanSubmitDisabled: {
    opacity: 0.5,
  },
  scanSubmitText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.neutral.white,
  },
});

export default CheckInButton;
