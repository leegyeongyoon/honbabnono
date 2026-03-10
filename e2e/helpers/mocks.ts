import { Page } from '@playwright/test';

/**
 * 카카오 맵 API Mock
 * window.kakao.maps 전체를 스텁으로 대체하여 지도/검색/지오코딩 동작
 */
export async function mockKakaoMaps(page: Page) {
  // SDK 스크립트 요청 차단 (실제 SDK 로딩 방지)
  await page.route('**/dapi.kakao.com/**', route =>
    route.fulfill({ body: '', contentType: 'application/javascript' })
  );

  // window.kakao mock 주입
  await page.addInitScript(() => {
    const mockAddress = {
      address_name: '서울특별시 강남구 역삼동 858',
      region_1depth_name: '서울',
      region_2depth_name: '강남구',
      region_3depth_name: '역삼동',
    };
    const mockRoadAddress = {
      address_name: '서울특별시 강남구 강남대로 396',
      road_name: '강남대로',
      building_name: '강남역',
    };
    const mockPlace = {
      place_name: '강남역 1번 출구',
      address_name: '서울특별시 강남구 강남대로 396',
      road_address_name: '서울특별시 강남구 강남대로 396',
      x: '127.0276',
      y: '37.4979',
      id: 'mock-place-1',
    };

    let clickHandler: ((mouseEvent: any) => void) | null = null;

    (window as any).kakao = {
      maps: {
        load: (callback: () => void) => {
          setTimeout(callback, 10);
        },
        LatLng: class {
          lat: number;
          lng: number;
          constructor(lat: number, lng: number) {
            this.lat = lat;
            this.lng = lng;
          }
          getLat() { return this.lat; }
          getLng() { return this.lng; }
        },
        Map: class {
          container: any;
          center: any;
          level: number;
          constructor(container: any, options: any) {
            this.container = container;
            this.center = options?.center;
            this.level = options?.level || 3;
            // 빈 div에 최소 스타일 적용
            if (container) {
              container.style.width = '100%';
              container.style.height = '300px';
              container.style.background = '#e0e0e0';
            }
          }
          setCenter() {}
          getCenter() { return new (window as any).kakao.maps.LatLng(37.4979, 127.0276); }
          setLevel() {}
          getLevel() { return this.level; }
          relayout() {}
          setBounds() {}
          panTo() {}
        },
        Marker: class {
          position: any;
          map: any;
          constructor(options: any) {
            this.position = options?.position;
            this.map = options?.map;
          }
          setPosition(pos: any) { this.position = pos; }
          setMap(map: any) { this.map = map; }
          getPosition() { return this.position; }
        },
        InfoWindow: class {
          constructor() {}
          setContent() {}
          open() {}
          close() {}
        },
        LatLngBounds: class {
          constructor() {}
          extend() {}
        },
        event: {
          addListener: (target: any, type: string, callback: any) => {
            if (type === 'click') {
              clickHandler = callback;
            }
          },
          removeListener: () => {},
          trigger: (target: any, type: string) => {
            if (type === 'click' && clickHandler) {
              clickHandler({
                latLng: new (window as any).kakao.maps.LatLng(37.4979, 127.0276),
              });
            }
          },
        },
        services: {
          Status: { OK: 'OK', ZERO_RESULT: 'ZERO_RESULT', ERROR: 'ERROR' },
          Geocoder: class {
            coord2Address(lng: number, lat: number, callback: any) {
              setTimeout(() => {
                callback(
                  [{ address: mockAddress, road_address: mockRoadAddress }],
                  'OK'
                );
              }, 10);
            }
            addressSearch(query: string, callback: any) {
              setTimeout(() => {
                callback(
                  [{
                    address_name: '서울특별시 강남구 강남대로 396',
                    x: '127.0276',
                    y: '37.4979',
                  }],
                  'OK'
                );
              }, 10);
            }
          },
          Places: class {
            keywordSearch(query: string, callback: any) {
              setTimeout(() => {
                callback(
                  [{ ...mockPlace, place_name: query || '강남역' }],
                  'OK'
                );
              }, 10);
            }
          },
        },
        // Proxy fallback: 미지원 속성 접근 시 빈 함수 반환
        CustomOverlay: class {
          constructor() {}
          setMap() {}
          setPosition() {}
        },
      },
    };
  });
}

/**
 * Geolocation Mock
 * navigator.geolocation.getCurrentPosition을 주어진 좌표로 즉시 응답
 */
export async function mockGeolocation(page: Page, latitude: number, longitude: number) {
  await page.addInitScript(({ lat, lng }) => {
    const mockPosition = {
      coords: {
        latitude: lat,
        longitude: lng,
        accuracy: 10,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
      },
      timestamp: Date.now(),
    };

    (navigator as any).geolocation = {
      getCurrentPosition: (success: any) => {
        setTimeout(() => success(mockPosition), 10);
      },
      watchPosition: (success: any) => {
        setTimeout(() => success(mockPosition), 10);
        return 1;
      },
      clearWatch: () => {},
    };
  }, { lat: latitude, lng: longitude });
}

/**
 * Socket.IO 연결 차단
 * WebSocket 연결 시도를 차단하여 테스트 안정성 확보
 */
export async function blockSocketIO(page: Page) {
  await page.route('**/socket.io/**', route => route.abort());
}
