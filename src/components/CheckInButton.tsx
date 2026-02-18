import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform, PermissionsAndroid } from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import { COLORS, SHADOWS } from '../styles/colors';
import { Icon } from './Icon';
import apiClient from '../services/apiClient';

interface AttendanceInfo {
  attended: boolean;
  attendedAt: string | null;
  distance?: number;
}

interface CheckInButtonProps {
  meetupId: string;
  meetupStatus: string;
  meetupLocation: string;
  meetupLatitude?: number;
  meetupLongitude?: number;
  checkInRadius?: number;
  onCheckInSuccess?: () => void;
}

const CheckInButton: React.FC<CheckInButtonProps> = ({
  meetupId,
  meetupStatus,
  meetupLocation,
  meetupLatitude,
  meetupLongitude,
  checkInRadius = 300,
  onCheckInSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [myAttendance, setMyAttendance] = useState<AttendanceInfo | null>(null);
  const [attendanceData, setAttendanceData] = useState<any>(null);

  useEffect(() => {
    if (meetupStatus === '진행중' || meetupStatus === '종료') {
      fetchAttendance();
    }
  }, [meetupId, meetupStatus]);

  const fetchAttendance = async () => {
    try {
      const response = await apiClient.get(`/meetups/${meetupId}/attendance`);
      if (response.data) {
        setAttendanceData(response.data);
        setMyAttendance(response.data.myAttendance);
      }
    } catch (_error) {
    }
  };

  // Android 위치 권한 요청
  const requestLocationPermission = async (): Promise<boolean> => {
    if (Platform.OS === 'ios') {
      // iOS는 Geolocation.getCurrentPosition 호출 시 자동으로 권한 요청
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
      // 위치 권한 요청
      const hasPermission = await requestLocationPermission();
      if (!hasPermission) {
        Alert.alert('위치 권한 필요', 'GPS 체크인을 위해 위치 권한이 필요합니다.');
        setLoading(false);
        return;
      }

      // 현재 위치 가져오기
      Geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;

          try {
            // 체크인 API 호출
            const response = await apiClient.post(`/meetups/${meetupId}/check-in`, {
              latitude,
              longitude,
            });

            if (response.data && response.data.attended) {
              Alert.alert(
                '체크인 완료',
                `${response.data.distance}m 거리에서 체크인되었습니다.`,
                [{ text: '확인' }]
              );
              setMyAttendance({
                attended: true,
                attendedAt: response.data.attendedAt,
                distance: response.data.distance,
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
                `현재 위치가 모임 장소에서 ${distance}m 떨어져 있습니다.\n체크인 가능 거리: ${maxDistance}m 이내`
              );
            } else {
              Alert.alert('체크인 실패', errorMessage);
            }
          } finally {
            setLoading(false);
          }
        },
        (_error) => {
          Alert.alert('위치 오류', '현재 위치를 가져올 수 없습니다. GPS를 확인해주세요.');
          setLoading(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 10000,
        }
      );
    } catch (_error: any) {
      Alert.alert('체크인 실패', '체크인 중 오류가 발생했습니다.');
      setLoading(false);
    }
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

    return (
      <View style={styles.container}>
        <View style={styles.checkedInContainer}>
          <View style={styles.checkedInIcon}>
            <Icon name="check-circle" size={24} color={COLORS.functional.success} />
          </View>
          <View style={styles.checkedInInfo}>
            <Text style={styles.checkedInTitle}>체크인 완료</Text>
            <Text style={styles.checkedInTime}>
              {attendedTime} ({myAttendance.distance}m 거리에서 인증)
            </Text>
          </View>
        </View>

        {attendanceData && (
          <View style={styles.attendanceStats}>
            <Text style={styles.attendanceText}>
              출석: {attendanceData.attendedCount}/{attendanceData.totalParticipants}명
            </Text>
          </View>
        )}
      </View>
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

      {attendanceData && (
        <View style={styles.attendanceStats}>
          <Text style={styles.attendanceText}>
            현재 {attendanceData.attendedCount}/{attendanceData.totalParticipants}명 체크인
          </Text>
        </View>
      )}
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
});

export default CheckInButton;
