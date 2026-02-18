// GPS 기반 위치 서비스 - React Native 버전
import { Platform, PermissionsAndroid } from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import { localStorage } from '../utils/localStorageCompat';
import { COLORS } from '../styles/colors';

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

export interface LocationVerificationResult {
  isNearMeetupLocation: boolean;
  distance: number; // 미터 단위
  accuracy: number;
  message: string;
}

class LocationServiceNative {
  private watchId: number | null = null;
  private currentLocation: LocationData | null = null;

  /**
   * Android 위치 권한 요청
   */
  private async requestAndroidPermission(): Promise<boolean> {
    if (Platform.OS !== 'android') {return true;}

    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: '위치 권한',
          message: '잇테이블 앱이 현재 위치에 접근하려고 합니다.',
          buttonNeutral: '나중에',
          buttonNegative: '거부',
          buttonPositive: '허용',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      console.warn('위치 권한 요청 실패:', err);
      return false;
    }
  }

  /**
   * 현재 위치 가져오기 (React Native)
   */
  async getCurrentLocation(): Promise<LocationData> {
    const isDevelopment = __DEV__;

    // Android 권한 확인
    if (Platform.OS === 'android') {
      const hasPermission = await this.requestAndroidPermission();
      if (!hasPermission) {
        throw new Error('위치 접근 권한이 거부되었습니다.');
      }
    }

    return new Promise((resolve, reject) => {
      Geolocation.getCurrentPosition(
        (position) => {
          const locationData: LocationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: Date.now(),
          };
          
          this.currentLocation = locationData;
          resolve(locationData);
        },
        (error) => {
          let errorMessage = '위치를 가져올 수 없습니다.';
          
          switch (error.code) {
            case 1: // PERMISSION_DENIED
              errorMessage = '위치 접근 권한이 거부되었습니다.';
              break;
            case 2: // POSITION_UNAVAILABLE
              errorMessage = '위치 정보를 사용할 수 없습니다.';
              break;
            case 3: // TIMEOUT
              errorMessage = '위치 요청 시간이 초과되었습니다.';
              break;
            default:
              errorMessage = `알 수 없는 위치 오류가 발생했습니다. (코드: ${error.code})`;
          }
          
          if (isDevelopment) {
            console.warn('📍 개발 환경: 위치 서비스 미지원');
          }
          
          reject(new Error(errorMessage));
        },
        {
          enableHighAccuracy: true,
          timeout: 20000,
          maximumAge: 60000,
        }
      );
    });
  }

  /**
   * 위치 추적 시작
   */
  startWatchingLocation(callback: (location: LocationData) => void): void {
    this.watchId = Geolocation.watchPosition(
      (position) => {
        const locationData: LocationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: Date.now(),
        };
        
        this.currentLocation = locationData;
        callback(locationData);
      },
      (error) => {
        console.error('위치 추적 오류:', error.message);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
        distanceFilter: 10, // 10미터 이동시 업데이트
      }
    );
  }

  /**
   * 위치 추적 중지
   */
  stopWatchingLocation(): void {
    if (this.watchId !== null) {
      Geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }

  /**
   * 두 지점 간의 거리 계산 (하버사인 공식)
   */
  calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371e3; // 지구 반지름 (미터)
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * 모임 장소와의 거리 확인 및 인증
   */
  async verifyMeetupLocation(
    meetupLatitude: number,
    meetupLongitude: number,
    maxDistance: number = 100 // 기본 100미터
  ): Promise<LocationVerificationResult> {
    try {
      const currentLocation = await this.getCurrentLocation();
      
      const distance = this.calculateDistance(
        currentLocation.latitude,
        currentLocation.longitude,
        meetupLatitude,
        meetupLongitude
      );

      const isNearMeetupLocation = distance <= maxDistance;

      let message = '';
      if (isNearMeetupLocation) {
        message = `모임 장소 근처에 있습니다! (${Math.round(distance)}m 거리)`;
      } else {
        message = `모임 장소에서 너무 멀리 있습니다. (${Math.round(distance)}m 거리, 최대 ${maxDistance}m)`;
      }

      return {
        isNearMeetupLocation,
        distance: Math.round(distance),
        accuracy: currentLocation.accuracy,
        message,
      };
    } catch (error) {
      throw new Error(`위치 인증 실패: ${error.message}`);
    }
  }

  /**
   * 좌표를 주소로 변환 (역지오코딩) - 카카오 API 사용
   */
  async reverseGeocode(latitude: number, longitude: number): Promise<{ district: string; neighborhood: string; fullAddress: string } | null> {
    try {
      const KAKAO_REST_API_KEY = '5a202bd90ab8dff01348f24cb1c37f3f';
      
      const response = await fetch(
        `https://dapi.kakao.com/v2/local/geo/coord2address.json?x=${longitude}&y=${latitude}`,
        {
          headers: {
            'Authorization': `KakaoAK ${KAKAO_REST_API_KEY}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('주소 조회 실패');
      }

      const data = await response.json();
      
      if (data.documents && data.documents.length > 0) {
        const doc = data.documents[0];
        const address = doc.road_address || doc.address;
        
        return {
          district: address.region_2depth_name, // 구/군
          neighborhood: address.region_3depth_name, // 동/읍/면
          fullAddress: address.address_name,
        };
      }
      
      return null;
    } catch (error) {
      console.error('역지오코딩 실패:', error);
      return null;
    }
  }

  /**
   * 현재 저장된 위치 반환
   */
  getCurrentLocationData(): LocationData | null {
    return this.currentLocation;
  }

  /**
   * 위치 권한 상태 확인
   */
  async checkLocationPermission(): Promise<'granted' | 'denied' | 'prompt'> {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );
      return granted ? 'granted' : 'denied';
    }
    // iOS는 항상 권한 요청 시 처리
    return 'prompt';
  }

  /**
   * 위치 정확도 등급 반환
   */
  getAccuracyGrade(accuracy: number): {
    grade: 'excellent' | 'good' | 'fair' | 'poor';
    description: string;
    color: string;
  } {
    if (accuracy <= 5) {
      return {
        grade: 'excellent',
        description: '매우 정확함',
        color: COLORS.functional.success,
      };
    } else if (accuracy <= 20) {
      return {
        grade: 'good',
        description: '정확함',
        color: '#8BC34A',
      };
    } else if (accuracy <= 50) {
      return {
        grade: 'fair',
        description: '보통',
        color: '#FF9800',
      };
    } else {
      return {
        grade: 'poor',
        description: '부정확함',
        color: COLORS.functional.error,
      };
    }
  }

  /**
   * 주소 검색으로 좌표 가져오기
   */
  async searchAddress(query: string): Promise<Array<{ latitude: number; longitude: number; district: string; neighborhood: string; fullAddress: string }>> {
    try {
      const KAKAO_REST_API_KEY = '5a202bd90ab8dff01348f24cb1c37f3f';
      
      const response = await fetch(
        `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(query)}`,
        {
          headers: {
            'Authorization': `KakaoAK ${KAKAO_REST_API_KEY}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('주소 검색 실패');
      }

      const data = await response.json();
      
      return data.documents.map((doc: any) => {
        const address = doc.road_address || doc.address;
        return {
          latitude: parseFloat(address.y),
          longitude: parseFloat(address.x),
          district: address.region_2depth_name,
          neighborhood: address.region_3depth_name,
          fullAddress: address.address_name,
        };
      });
    } catch (error) {
      console.error('주소 검색 실패:', error);
      return [];
    }
  }

  /**
   * 인기 동네 목록 (서울 기준)
   */
  getPopularNeighborhoods(): Array<{ district: string; neighborhood: string }> {
    return [
      { district: '강남구', neighborhood: '역삼동' },
      { district: '강남구', neighborhood: '삼성동' },
      { district: '강남구', neighborhood: '논현동' },
      { district: '서초구', neighborhood: '서초동' },
      { district: '서초구', neighborhood: '반포동' },
      { district: '마포구', neighborhood: '홍대입구' },
      { district: '마포구', neighborhood: '상수동' },
      { district: '성동구', neighborhood: '성수동' },
      { district: '용산구', neighborhood: '한남동' },
      { district: '용산구', neighborhood: '이태원동' },
      { district: '종로구', neighborhood: '종로1가' },
      { district: '중구', neighborhood: '을지로동' },
      { district: '영등포구', neighborhood: '여의도동' },
      { district: '송파구', neighborhood: '잠실동' },
      { district: '강서구', neighborhood: '화곡동' },
      { district: '노원구', neighborhood: '상계동' },
      { district: '관악구', neighborhood: '신림동' },
      { district: '은평구', neighborhood: '연신내' },
      { district: '동작구', neighborhood: '사당동' },
      { district: '광진구', neighborhood: '건대입구' },
    ];
  }

  /**
   * 사용자 설정 동네 저장
   */
  async saveUserNeighborhood(district: string, neighborhood: string): Promise<void> {
    await localStorage.setItem('user_neighborhood', JSON.stringify({ district, neighborhood }));
  }

  /**
   * 사용자 설정 동네 가져오기
   */
  async getUserNeighborhood(): Promise<{ district: string; neighborhood: string } | null> {
    const saved = await localStorage.getItem('user_neighborhood');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (error) {
        console.error('저장된 동네 정보 파싱 실패:', error);
      }
    }
    return null;
  }

  /**
   * 사용자 설정 동네 삭제
   */
  async clearUserNeighborhood(): Promise<void> {
    await localStorage.removeItem('user_neighborhood');
  }
}

// 싱글톤 인스턴스
export const locationServiceNative = new LocationServiceNative();
export default locationServiceNative;