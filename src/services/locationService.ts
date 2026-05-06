// GPS 기반 위치 서비스
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

class LocationService {
  private watchId: number | null = null;
  private currentLocation: LocationData | null = null;

  /**
   * 현재 위치 가져오기 (개선된 에러 처리)
   */
  async getCurrentLocation(): Promise<LocationData> {
    // 개발 환경에서는 더 조용한 에러 처리
    const isDevelopment = process.env.NODE_ENV === 'development' || 
                          (typeof window !== 'undefined' && window.location && (
                            window.location.hostname === 'localhost' || 
                            window.location.hostname === '127.0.0.1'
                          ));

    // 먼저 권한 상태 확인
    const permissionState = await this.checkLocationPermission();
    
    if (permissionState === 'denied') {
      const error = new Error('위치 접근 권한이 차단되었습니다. 브라우저 설정에서 위치 권한을 허용해주세요.');
      throw error;
    }

    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        const error = new Error('이 브라우저는 위치 서비스를 지원하지 않습니다.');
        reject(error);
        return;
      }

      // 운영환경에서 HTTPS 확인
      const isSecure = typeof window !== 'undefined' && window.location.protocol === 'https:';
      if (!isDevelopment && !isSecure) {
        reject(new Error('위치 서비스는 HTTPS 환경에서만 사용할 수 있습니다.\n\nHTTPS 사이트에서 접속하거나 아래 목록에서 선택해주세요.'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
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
          let userAction = '';
          
          // 운영환경에서 상세한 디버깅 정보 제공
          const isProduction = process.env.NODE_ENV === 'production';
          const protocol = typeof window !== 'undefined' ? window.location.protocol : 'unknown';
          const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown';
          
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = '위치 접근 권한이 거부되었습니다.';
              if (protocol === 'http:') {
                userAction = '🚨 HTTP 사이트는 위치 서비스가 제한됩니다.\n\nHTTPS 사이트에서 이용하거나:\n• 브라우저 설정 → 사이트 설정 → 위치 → 허용\n• 또는 아래 목록에서 수동 선택';
              } else {
                userAction = '📍 브라우저 주소창 왼쪽 아이콘을 클릭하여:\n• 위치 → "허용" 선택\n• 페이지 새로고침 후 재시도';
              }
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = '위치 정보를 사용할 수 없습니다.';
              // iOS Safari 특별 처리
              if (userAgent.includes('iPhone') || userAgent.includes('iPad')) {
                userAction = '📱 iOS에서 GPS 사용법:\n\n✅ 설정 → 개인정보보호 → 위치서비스 → 켜기\n✅ Safari → 위치접근 → 허용\n✅ https:// 사이트에서만 GPS 동작\n✅ 실외에서 시도해보세요';
              } else {
                userAction = '📍 GPS 문제 해결:\n• 기기 위치 서비스 켜기\n• WiFi/모바일 데이터 확인\n• 실외에서 시도\n• 브라우저 재시작';
              }
              break;
            case error.TIMEOUT:
              errorMessage = '위치 요청 시간이 초과되었습니다.';
              userAction = '📍 GPS 신호가 약합니다:\n• 실외로 이동하여 재시도\n• 잠시 후 다시 시도\n• WiFi 환경에서 재시도';
              break;
            default:
              errorMessage = `알 수 없는 위치 오류가 발생했습니다. (코드: ${error.code})`;
              userAction = '📍 다음을 시도해보세요:\n• 브라우저 새로고침\n• 다른 브라우저 사용\n• 아래 목록에서 수동 선택';
          }
          
          const fullError = userAction ? `${errorMessage}\n\n해결방법: ${userAction}` : errorMessage;
          reject(new Error(fullError));
        },
        {
          enableHighAccuracy: true, // 운영환경에서는 정확한 위치 필요
          timeout: 20000, // 20초로 충분한 시간
          maximumAge: 60000, // 1분 캐시
        }
      );
    });
  }

  /**
   * 위치 추적 시작
   */
  startWatchingLocation(callback: (location: LocationData) => void): void {
    if (!navigator.geolocation) {
      return;
    }

    this.watchId = navigator.geolocation.watchPosition(
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
        // silently handle error
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
      }
    );
  }

  /**
   * 위치 추적 중지
   */
  stopWatchingLocation(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
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
        message = `매장 근처에 있습니다! (${Math.round(distance)}m 거리)`;
      } else {
        message = `매장에서 너무 멀리 있습니다. (${Math.round(distance)}m 거리, 최대 ${maxDistance}m)`;
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
   * 주소를 좌표로 변환 (지오코딩)
   */
  async geocodeAddress(address: string): Promise<{ latitude: number; longitude: number } | null> {
    try {
      // 실제로는 Google Maps API나 Kakao Map API를 사용해야 함
      // 임시 더미 데이터 (실제 구현에서는 지오코딩 API 사용)
      const dummyCoordinates = {
        latitude: 37.5665,
        longitude: 126.9780,
      };
      
      return dummyCoordinates;
    } catch (error) {
      // silently handle error
      return null;
    }
  }

  /**
   * 좌표를 주소로 변환 (역지오코딩) - 카카오 API 사용
   */
  async reverseGeocode(latitude: number, longitude: number): Promise<{ district: string; neighborhood: string; fullAddress: string } | null> {
    try {
      const KAKAO_REST_API_KEY = process.env.REACT_APP_KAKAO_REST_API_KEY || '';
      if (!KAKAO_REST_API_KEY) {
        console.warn('REACT_APP_KAKAO_REST_API_KEY 환경변수가 설정되지 않았습니다.');
        return null;
      }

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
      // silently handle error
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
    try {
      if ('permissions' in navigator && (navigator as any).permissions) {
        const result = await (navigator as any).permissions.query({ name: 'geolocation' });
        return result.state as 'granted' | 'denied' | 'prompt';
      }
      return 'granted'; // 권한 API가 없으면 허용으로 가정
    } catch (error) {
      // silently handle error
      return 'denied';
    }
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
      const KAKAO_REST_API_KEY = process.env.REACT_APP_KAKAO_REST_API_KEY || '';
      if (!KAKAO_REST_API_KEY) {
        console.warn('REACT_APP_KAKAO_REST_API_KEY 환경변수가 설정되지 않았습니다.');
        return [];
      }
      
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
      // silently handle error
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
  saveUserNeighborhood(district: string, neighborhood: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('user_neighborhood', JSON.stringify({ district, neighborhood }));
    }
  }

  /**
   * 사용자 설정 동네 가져오기
   */
  getUserNeighborhood(): { district: string; neighborhood: string } | null {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('user_neighborhood');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (error) {
          // silently handle error
        }
      }
    }
    return null;
  }

  /**
   * 사용자 설정 동네 삭제
   */
  clearUserNeighborhood(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('user_neighborhood');
    }
  }
}

// 싱글톤 인스턴스
export const locationService = new LocationService();
export default locationService;