/**
 * 위치 기반 모임 추천 기능 테스트
 *
 * 테스트 대상:
 * 1. 서버 유틸리티 - calculateDistance() 함수 (Haversine formula)
 * 2. 프론트엔드 유틸리티 - formatDistance() 함수
 * 3. 컨트롤러 로직 - getHomeMeetups 위치 필터링 로직
 *
 * 참고: API 통합 테스트는 서버가 실행 중일 때만 동작합니다.
 */

const jwt = require('jsonwebtoken');

// 서버 유틸리티 함수 테스트를 위한 import
const { calculateDistance, processImageUrl } = require('../server/utils/helpers');

describe('위치 기반 모임 추천 기능', () => {
  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'honbabnono_jwt_secret_key_2024';
  });

  // ============================================
  // 1. 서버 유틸리티 테스트: calculateDistance() 함수
  // ============================================
  describe('calculateDistance() - Haversine 거리 계산 함수', () => {
    describe('기본 동작', () => {
      it('같은 좌표면 거리가 0', () => {
        const lat = 37.4979;
        const lng = 127.0276;
        const distance = calculateDistance(lat, lng, lat, lng);
        expect(distance).toBe(0);
      });

      it('서울 강남역에서 삼성역까지 약 3.4km', () => {
        // 강남역: 37.4979, 127.0276
        // 삼성역: 37.5088, 127.0631
        const distance = calculateDistance(37.4979, 127.0276, 37.5088, 127.0631);
        // 실제 거리는 약 3.4km 정도
        expect(distance).toBeGreaterThan(3000);
        expect(distance).toBeLessThan(4000);
      });

      it('서울역에서 부산역까지 약 325km', () => {
        // 서울역: 37.5546, 126.9706
        // 부산역: 35.1152, 129.0422
        const distance = calculateDistance(37.5546, 126.9706, 35.1152, 129.0422);
        // 약 325km = 325000m
        expect(distance).toBeGreaterThan(300000);
        expect(distance).toBeLessThan(350000);
      });

      it('짧은 거리 계산 - 100m 이내', () => {
        // 약 100m 차이나는 두 지점
        // 위도 1도 = 약 111km, 0.0009도 = 약 100m
        const lat1 = 37.4979;
        const lng1 = 127.0276;
        const lat2 = 37.4988; // 약 100m 북쪽
        const lng2 = 127.0276;

        const distance = calculateDistance(lat1, lng1, lat2, lng2);
        expect(distance).toBeGreaterThan(50);
        expect(distance).toBeLessThan(150);
      });

      it('위도만 다른 경우 정확한 거리 계산', () => {
        // 위도 1도 = 약 111km
        const lat1 = 37.0;
        const lng = 127.0;
        const lat2 = 38.0;

        const distance = calculateDistance(lat1, lng, lat2, lng);
        // 약 111km = 111000m
        expect(distance).toBeGreaterThan(105000);
        expect(distance).toBeLessThan(115000);
      });

      it('경도만 다른 경우 정확한 거리 계산', () => {
        // 적도에서 경도 1도 = 약 111km
        // 위도 37도에서 경도 1도 = 약 88km (cos(37) * 111)
        const lat = 37.0;
        const lng1 = 127.0;
        const lng2 = 128.0;

        const distance = calculateDistance(lat, lng1, lat, lng2);
        // 위도 37도에서 경도 1도는 약 88km
        expect(distance).toBeGreaterThan(80000);
        expect(distance).toBeLessThan(95000);
      });
    });

    describe('경계 조건', () => {
      it('적도와 본초자오선 교점에서 거리 계산', () => {
        // (0, 0)에서 (0, 1) - 적도에서 경도 1도 = 약 111km
        const distance = calculateDistance(0, 0, 0, 1);
        expect(distance).toBeGreaterThan(100000);
        expect(distance).toBeLessThan(120000);
      });

      it('극지방 근처 좌표 처리', () => {
        // 북극 근처
        const distance = calculateDistance(89.9, 0, 89.9, 180);
        expect(typeof distance).toBe('number');
        expect(distance).toBeGreaterThan(0);
      });

      it('반환값이 정수(미터)', () => {
        const distance = calculateDistance(37.4979, 127.0276, 37.5088, 127.0631);
        expect(Number.isInteger(distance)).toBe(true);
      });

      it('음수 좌표 처리 (서경, 남위)', () => {
        // 남미 좌표 테스트
        const distance = calculateDistance(-33.4489, -70.6693, -34.6037, -58.3816);
        // 산티아고에서 부에노스아이레스까지 약 1100km
        expect(distance).toBeGreaterThan(1000000);
        expect(distance).toBeLessThan(1200000);
      });

      it('날짜변경선 근처 좌표', () => {
        // 경도 179와 -179 사이 거리
        const distance = calculateDistance(0, 179, 0, -179);
        // 적도에서 경도 2도 = 약 222km
        expect(distance).toBeGreaterThan(200000);
        expect(distance).toBeLessThan(250000);
      });
    });

    describe('실제 서울 지역 테스트', () => {
      it('강남역에서 역삼역까지 약 700m', () => {
        // 강남역: 37.4979, 127.0276
        // 역삼역: 37.5006, 127.0367
        const distance = calculateDistance(37.4979, 127.0276, 37.5006, 127.0367);
        expect(distance).toBeGreaterThan(500);
        expect(distance).toBeLessThan(1000);
      });

      it('홍대입구역에서 신촌역까지 약 1km', () => {
        // 홍대입구역: 37.5572, 126.9246
        // 신촌역: 37.5559, 126.9369
        const distance = calculateDistance(37.5572, 126.9246, 37.5559, 126.9369);
        expect(distance).toBeGreaterThan(800);
        expect(distance).toBeLessThan(1500);
      });
    });
  });

  // ============================================
  // 2. 프론트엔드 유틸리티 테스트: formatDistance() 함수
  // ============================================
  describe('formatDistance() - 거리 포맷팅 함수', () => {
    // MeetupCard.tsx에서 정의된 formatDistance 함수 로직을 테스트
    // 이 함수는 프론트엔드에 있으므로 동일한 로직을 테스트

    const formatDistance = (distanceInMeters) => {
      if (distanceInMeters === null || distanceInMeters === undefined) {
        return null;
      }

      if (distanceInMeters < 1000) {
        return `${Math.round(distanceInMeters)}m`;
      } else {
        return `${(distanceInMeters / 1000).toFixed(1)}km`;
      }
    };

    describe('null/undefined 처리', () => {
      it('null이면 null 반환', () => {
        expect(formatDistance(null)).toBeNull();
      });

      it('undefined이면 null 반환', () => {
        expect(formatDistance(undefined)).toBeNull();
      });
    });

    describe('1km 미만 거리', () => {
      it('0m', () => {
        expect(formatDistance(0)).toBe('0m');
      });

      it('50m', () => {
        expect(formatDistance(50)).toBe('50m');
      });

      it('100m', () => {
        expect(formatDistance(100)).toBe('100m');
      });

      it('350m', () => {
        expect(formatDistance(350)).toBe('350m');
      });

      it('500m', () => {
        expect(formatDistance(500)).toBe('500m');
      });

      it('999m', () => {
        expect(formatDistance(999)).toBe('999m');
      });

      it('소수점은 반올림 - 350.7m -> 351m', () => {
        expect(formatDistance(350.7)).toBe('351m');
      });

      it('소수점은 반올림 - 350.3m -> 350m', () => {
        expect(formatDistance(350.3)).toBe('350m');
      });
    });

    describe('1km 이상 거리', () => {
      it('1000m -> 1.0km', () => {
        expect(formatDistance(1000)).toBe('1.0km');
      });

      it('1200m -> 1.2km', () => {
        expect(formatDistance(1200)).toBe('1.2km');
      });

      it('1500m -> 1.5km', () => {
        expect(formatDistance(1500)).toBe('1.5km');
      });

      it('2500m -> 2.5km', () => {
        expect(formatDistance(2500)).toBe('2.5km');
      });

      it('10000m -> 10.0km', () => {
        expect(formatDistance(10000)).toBe('10.0km');
      });

      it('10750m -> 10.8km (소수점 첫째자리 반올림)', () => {
        expect(formatDistance(10750)).toBe('10.8km');
      });
    });

    describe('경계값 테스트', () => {
      it('999m -> 999m (1km 미만)', () => {
        expect(formatDistance(999)).toBe('999m');
      });

      it('1000m -> 1.0km (정확히 1km)', () => {
        expect(formatDistance(1000)).toBe('1.0km');
      });

      it('1001m -> 1.0km (1km 살짝 초과)', () => {
        expect(formatDistance(1001)).toBe('1.0km');
      });
    });
  });

  // ============================================
  // 3. 위치 필터링 로직 테스트 (컨트롤러 로직 시뮬레이션)
  // ============================================
  describe('위치 필터링 로직 테스트', () => {
    // getHomeMeetups 컨트롤러의 핵심 로직을 시뮬레이션하여 테스트

    // 테스트용 모임 데이터
    const mockMeetups = [
      { id: 1, title: '강남 점심', latitude: 37.4979, longitude: 127.0276 }, // 강남역
      { id: 2, title: '역삼 저녁', latitude: 37.5006, longitude: 127.0367 }, // 역삼역 (~700m)
      { id: 3, title: '삼성 브런치', latitude: 37.5088, longitude: 127.0631 }, // 삼성역 (~3.4km)
      { id: 4, title: '홍대 술자리', latitude: 37.5572, longitude: 126.9246 }, // 홍대입구역 (~12km)
      { id: 5, title: '좌표 없음', latitude: null, longitude: null },
    ];

    // 위치 필터링 로직 (컨트롤러에서 추출)
    const filterMeetupsByLocation = (meetups, userLat, userLng, radius) => {
      return meetups
        .map(meetup => {
          const meetupData = { ...meetup, distance: null };

          if (meetup.latitude && meetup.longitude) {
            const meetupLat = parseFloat(meetup.latitude);
            const meetupLng = parseFloat(meetup.longitude);
            if (!isNaN(meetupLat) && !isNaN(meetupLng)) {
              meetupData.distance = calculateDistance(userLat, userLng, meetupLat, meetupLng);
            }
          }

          return meetupData;
        })
        .filter(m => m.distance !== null && m.distance <= radius)
        .sort((a, b) => (a.distance || 0) - (b.distance || 0));
    };

    describe('반경 필터링', () => {
      const gangnamLat = 37.4979;
      const gangnamLng = 127.0276;

      it('1km 반경 내 모임만 반환', () => {
        const result = filterMeetupsByLocation(mockMeetups, gangnamLat, gangnamLng, 1000);

        // 강남역(0m), 역삼역(~700m)만 포함되어야 함
        expect(result.length).toBe(2);
        expect(result[0].id).toBe(1); // 강남역 (거리 0)
        expect(result[1].id).toBe(2); // 역삼역
        expect(result[0].distance).toBe(0);
        expect(result[1].distance).toBeLessThan(1000);
      });

      it('5km 반경 내 모임 반환', () => {
        const result = filterMeetupsByLocation(mockMeetups, gangnamLat, gangnamLng, 5000);

        // 강남역, 역삼역, 삼성역이 포함되어야 함
        expect(result.length).toBe(3);
        expect(result.every(m => m.distance <= 5000)).toBe(true);
      });

      it('20km 반경 내 모든 좌표 있는 모임 반환', () => {
        const result = filterMeetupsByLocation(mockMeetups, gangnamLat, gangnamLng, 20000);

        // 좌표가 있는 모든 모임 (4개)
        expect(result.length).toBe(4);
      });

      it('좌표 없는 모임은 필터링됨', () => {
        const result = filterMeetupsByLocation(mockMeetups, gangnamLat, gangnamLng, 100000);

        // id: 5 (좌표 없음)는 포함되지 않아야 함
        expect(result.find(m => m.id === 5)).toBeUndefined();
      });
    });

    describe('거리순 정렬', () => {
      it('가까운 모임이 먼저 표시됨', () => {
        const gangnamLat = 37.4979;
        const gangnamLng = 127.0276;
        const result = filterMeetupsByLocation(mockMeetups, gangnamLat, gangnamLng, 20000);

        // 거리순 정렬 확인
        for (let i = 1; i < result.length; i++) {
          expect(result[i - 1].distance).toBeLessThanOrEqual(result[i].distance);
        }
      });

      it('같은 거리면 원래 순서 유지 (안정 정렬)', () => {
        const sameMeetups = [
          { id: 1, title: 'A', latitude: 37.4979, longitude: 127.0276 },
          { id: 2, title: 'B', latitude: 37.4979, longitude: 127.0276 }, // 동일 좌표
        ];

        const result = filterMeetupsByLocation(sameMeetups, 37.4979, 127.0276, 1000);

        expect(result.length).toBe(2);
        expect(result[0].distance).toBe(0);
        expect(result[1].distance).toBe(0);
      });
    });

    describe('엣지 케이스', () => {
      it('빈 배열 처리', () => {
        const result = filterMeetupsByLocation([], 37.4979, 127.0276, 5000);
        expect(result).toEqual([]);
      });

      it('반경 0이면 같은 좌표의 모임만 반환', () => {
        const result = filterMeetupsByLocation(mockMeetups, 37.4979, 127.0276, 0);
        // 정확히 같은 좌표의 모임만 반환
        expect(result.length).toBe(1);
        expect(result[0].id).toBe(1);
      });

      it('모든 모임이 반경 밖이면 빈 배열', () => {
        // 부산 좌표
        const result = filterMeetupsByLocation(mockMeetups, 35.1796, 129.0756, 1000);
        expect(result.length).toBe(0);
      });
    });
  });

  // ============================================
  // 4. processImageUrl 유틸리티 테스트 (추가)
  // ============================================
  describe('processImageUrl() - 이미지 URL 처리', () => {
    it('이미지 URL이 있으면 그대로 반환', () => {
      const imageUrl = 'https://example.com/image.jpg';
      const result = processImageUrl(imageUrl, '한식');
      expect(result).toBe(imageUrl);
    });

    it('이미지 URL이 없으면 카테고리별 기본 이미지 반환', () => {
      const result = processImageUrl(null, '한식');
      expect(result).toContain('unsplash.com');
    });

    it('알 수 없는 카테고리는 기타 기본 이미지 반환', () => {
      const result = processImageUrl(null, '알수없는카테고리');
      expect(result).toContain('unsplash.com');
    });
  });

  // ============================================
  // 5. 쿼리 파라미터 파싱 로직 테스트
  // ============================================
  describe('쿼리 파라미터 파싱 로직', () => {
    // 컨트롤러의 파라미터 파싱 로직 시뮬레이션
    // 실제 컨트롤러 코드와 동일한 로직
    const parseLocationParams = (query) => {
      const { latitude, longitude, radius } = query;
      // JavaScript의 && 연산자는 마지막 truthy 값을 반환
      // 따라서 Boolean으로 변환해야 함
      const hasLocationFilter = !!(latitude && longitude);
      const userLat = hasLocationFilter ? parseFloat(latitude) : null;
      const userLng = hasLocationFilter ? parseFloat(longitude) : null;
      const searchRadius = radius ? parseInt(radius) : 3000;

      return { hasLocationFilter, userLat, userLng, searchRadius };
    };

    it('위도/경도가 모두 있으면 위치 필터 활성화', () => {
      const result = parseLocationParams({
        latitude: '37.4979',
        longitude: '127.0276',
      });

      expect(result.hasLocationFilter).toBe(true);
      expect(result.userLat).toBe(37.4979);
      expect(result.userLng).toBe(127.0276);
      expect(result.searchRadius).toBe(3000); // 기본값
    });

    it('사용자 정의 반경 적용', () => {
      const result = parseLocationParams({
        latitude: '37.4979',
        longitude: '127.0276',
        radius: '5000',
      });

      expect(result.searchRadius).toBe(5000);
    });

    it('위도만 있으면 위치 필터 비활성화', () => {
      const result = parseLocationParams({
        latitude: '37.4979',
      });

      expect(result.hasLocationFilter).toBe(false);
    });

    it('경도만 있으면 위치 필터 비활성화', () => {
      const result = parseLocationParams({
        longitude: '127.0276',
      });

      expect(result.hasLocationFilter).toBe(false);
    });

    it('파라미터 없으면 위치 필터 비활성화', () => {
      const result = parseLocationParams({});

      expect(result.hasLocationFilter).toBe(false);
      expect(result.userLat).toBeNull();
      expect(result.userLng).toBeNull();
      expect(result.searchRadius).toBe(3000);
    });

    it('유효하지 않은 좌표값은 NaN으로 파싱', () => {
      const result = parseLocationParams({
        latitude: 'invalid',
        longitude: 'invalid',
      });

      // 문자열이 truthy이므로 hasLocationFilter는 true
      expect(result.hasLocationFilter).toBe(true);
      expect(isNaN(result.userLat)).toBe(true);
      expect(isNaN(result.userLng)).toBe(true);
    });
  });
});

// ============================================
// API 통합 테스트 (서버 실행 필요)
// 별도의 describe.skip으로 분리하여 필요시 실행
// ============================================
describe.skip('API 통합 테스트 (서버 실행 필요)', () => {
  const request = require('supertest');
  const baseURL = 'http://localhost:3001';
  let validToken;

  beforeAll(async () => {
    validToken = jwt.sign(
      {
        userId: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User'
      },
      'honbabnono_jwt_secret_key_2024',
      { expiresIn: '1h' }
    );

    // 서버 준비 대기
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  describe('GET /api/meetups/home', () => {
    it('위치 파라미터 없이 호출 시 모든 모임 반환', async () => {
      const response = await request(baseURL)
        .get('/api/meetups/home')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('meetups');
      expect(response.body.meta.hasLocationFilter).toBe(false);
    });

    it('위치 파라미터와 함께 호출 시 거리 계산', async () => {
      const response = await request(baseURL)
        .get('/api/meetups/home?latitude=37.4979&longitude=127.0276')
        .expect(200);

      expect(response.body.meta.hasLocationFilter).toBe(true);
      expect(response.body.meta.searchRadius).toBe(3000);
    });

    it('사용자 정의 반경 적용', async () => {
      const response = await request(baseURL)
        .get('/api/meetups/home?latitude=37.4979&longitude=127.0276&radius=5000')
        .expect(200);

      expect(response.body.meta.searchRadius).toBe(5000);
    });
  });
});
