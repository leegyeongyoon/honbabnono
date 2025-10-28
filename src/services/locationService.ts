// GPS 기반 위치 서비스

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
   * 현재 위치 가져오기
   */
  async getCurrentLocation(): Promise<LocationData> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('이 브라우저는 위치 서비스를 지원하지 않습니다.'));
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
          
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = '위치 접근 권한이 거부되었습니다.';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = '위치 정보를 사용할 수 없습니다.';
              break;
            case error.TIMEOUT:
              errorMessage = '위치 요청 시간이 초과되었습니다.';
              break;
          }
          
          reject(new Error(errorMessage));
        },
        {
          enableHighAccuracy: true, // GPS 사용
          timeout: 15000, // 15초 타임아웃
          maximumAge: 60000, // 1분간 캐시 사용
        }
      );
    });
  }

  /**
   * 위치 추적 시작
   */
  startWatchingLocation(callback: (location: LocationData) => void): void {
    if (!navigator.geolocation) {
      console.error('위치 서비스를 지원하지 않습니다.');
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
        console.error('위치 추적 오류:', error.message);
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
   * 주소를 좌표로 변환 (지오코딩)
   */
  async geocodeAddress(address: string): Promise<{ latitude: number; longitude: number } | null> {
    try {
      // 실제로는 Google Maps API나 Kakao Map API를 사용해야 함
      // 여기서는 간단한 예시로 서울 시청 좌표 반환
      console.log(`주소 "${address}"를 좌표로 변환 중...`);
      
      // 임시 더미 데이터 (실제 구현에서는 지오코딩 API 사용)
      const dummyCoordinates = {
        latitude: 37.5665,
        longitude: 126.9780,
      };
      
      return dummyCoordinates;
    } catch (error) {
      console.error('지오코딩 실패:', error);
      return null;
    }
  }

  /**
   * 좌표를 주소로 변환 (역지오코딩)
   */
  async reverseGeocode(latitude: number, longitude: number): Promise<string | null> {
    try {
      // 실제로는 지오코딩 API를 사용해야 함
      console.log(`좌표 (${latitude}, ${longitude})를 주소로 변환 중...`);
      
      // 임시 더미 데이터
      return `서울특별시 중구 세종대로 110 (위도: ${latitude.toFixed(4)}, 경도: ${longitude.toFixed(4)})`;
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
  async checkLocationPermission(): Promise<PermissionState> {
    try {
      if ('permissions' in navigator) {
        const result = await navigator.permissions.query({ name: 'geolocation' });
        return result.state;
      }
      return 'granted'; // 권한 API가 없으면 허용으로 가정
    } catch (error) {
      console.error('위치 권한 확인 실패:', error);
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
        color: '#4CAF50',
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
        color: '#F44336',
      };
    }
  }
}

// 싱글톤 인스턴스
export const locationService = new LocationService();
export default locationService;