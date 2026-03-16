import React, { useRef, useState, useEffect, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { COLORS, CATEGORY_COLORS } from '../styles/colors';

declare global {
  interface Window {
    kakao: any;
  }
}

export interface MapMarker {
  id: string;
  latitude: number;
  longitude: number;
  title: string;
  category?: string;
}

export interface MapBounds {
  south: number;
  west: number;
  north: number;
  east: number;
}

interface WebKakaoMapProps {
  center?: { lat: number; lng: number };
  markers?: MapMarker[];
  onMarkerClick?: (marker: MapMarker) => void;
  onMapMoved?: (center: { lat: number; lng: number }) => void;
  onBoundsChanged?: (bounds: MapBounds) => void;
  height?: number | string;
  showSearchButton?: boolean;
  onSearchHere?: (center: { lat: number; lng: number }) => void;
  selectedMarkerId?: string | null;
  showMyLocation?: boolean;
  myLocation?: { lat: number; lng: number } | null;
}

const KAKAO_APP_KEY = process.env.REACT_APP_KAKAO_JS_KEY || process.env.REACT_APP_KAKAO_CLIENT_ID || '';
const DEFAULT_CENTER = { lat: 37.498095, lng: 127.027610 }; // 강남역

/** Category name -> marker color mapping */
const CATEGORY_MARKER_COLORS: Record<string, string> = {
  '한식': CATEGORY_COLORS.korean.accent,
  '중식': CATEGORY_COLORS.chinese.accent,
  '일식': CATEGORY_COLORS.japanese.accent,
  '양식': CATEGORY_COLORS.western.accent,
  '고기/구이': CATEGORY_COLORS.bbq.accent,
  '해산물': CATEGORY_COLORS.seafood.accent,
  '찌개/전골': CATEGORY_COLORS.hotpot.accent,
  '카페': CATEGORY_COLORS.cafe.accent,
  '술집': CATEGORY_COLORS.bar.accent,
  '기타': CATEGORY_COLORS.etc.accent,
};

const DEFAULT_MARKER_COLOR = COLORS.primary.main;

/** Create a colored SVG marker as a data URI */
const createMarkerSvg = (color: string, isSelected: boolean): string => {
  const size = isSelected ? 40 : 32;
  const pinColor = color;
  const strokeColor = isSelected ? '#FFFFFF' : 'rgba(0,0,0,0.15)';
  const strokeWidth = isSelected ? 2.5 : 1;
  const shadow = isSelected ? 'filter="url(#shadow)"' : '';

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${Math.round(size * 1.3)}" viewBox="0 0 32 42">
      <defs>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="2" flood-opacity="0.25"/>
        </filter>
      </defs>
      <g ${shadow}>
        <path d="M16 0C7.16 0 0 7.16 0 16c0 12 16 26 16 26s16-14 16-26C32 7.16 24.84 0 16 0z"
          fill="${pinColor}" stroke="${strokeColor}" stroke-width="${strokeWidth}"/>
        <circle cx="16" cy="15" r="6" fill="white" opacity="0.9"/>
      </g>
    </svg>
  `.trim();

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

const loadKakaoScript = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (window.kakao && window.kakao.maps) {
      if (window.kakao.maps.LatLng) {
        resolve();
      } else {
        window.kakao.maps.load(() => resolve());
      }
      return;
    }

    const existing = document.querySelector('script[src*="dapi.kakao.com"]');
    if (existing) {
      existing.addEventListener('load', () => {
        if (window.kakao && window.kakao.maps) {
          window.kakao.maps.load(() => resolve());
        }
      });
      return;
    }

    const script = document.createElement('script');
    script.async = true;
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_APP_KEY}&libraries=services,clusterer&autoload=false`;
    script.onload = () => {
      if (window.kakao && window.kakao.maps) {
        window.kakao.maps.load(() => resolve());
      } else {
        reject(new Error('Kakao maps SDK load failed'));
      }
    };
    script.onerror = () => reject(new Error('Kakao maps script load failed'));
    document.head.appendChild(script);
  });
};

/** Extract current bounds from a kakao map instance */
const extractBounds = (map: any): MapBounds => {
  const bounds = map.getBounds();
  const sw = bounds.getSouthWest();
  const ne = bounds.getNorthEast();
  return {
    south: sw.getLat(),
    west: sw.getLng(),
    north: ne.getLat(),
    east: ne.getLng(),
  };
};

const WebKakaoMap: React.FC<WebKakaoMapProps> = ({
  center = DEFAULT_CENTER,
  markers = [],
  onMarkerClick,
  onMapMoved,
  onBoundsChanged,
  height = 300,
  showSearchButton = false,
  onSearchHere,
  selectedMarkerId = null,
  showMyLocation = false,
  myLocation = null,
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const clustererRef = useRef<any>(null);
  const myLocationMarkerRef = useRef<any>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mapMoved, setMapMoved] = useState(false);

  // Stable callback refs to avoid re-registering events
  const onMapMovedRef = useRef(onMapMoved);
  const onBoundsChangedRef = useRef(onBoundsChanged);
  const onMarkerClickRef = useRef(onMarkerClick);
  onMapMovedRef.current = onMapMoved;
  onBoundsChangedRef.current = onBoundsChanged;
  onMarkerClickRef.current = onMarkerClick;

  // Initialize map
  useEffect(() => {
    let cancelled = false;

    const initMap = async () => {
      try {
        await loadKakaoScript();
        if (cancelled || !mapRef.current) return;

        const coords = new window.kakao.maps.LatLng(center.lat, center.lng);
        const map = new window.kakao.maps.Map(mapRef.current, {
          center: coords,
          level: 5,
        });

        // Add zoom control
        const zoomControl = new window.kakao.maps.ZoomControl();
        map.addControl(zoomControl, window.kakao.maps.ControlPosition.RIGHT);

        mapInstanceRef.current = map;

        // Initialize clusterer
        if (window.kakao.maps.MarkerClusterer) {
          clustererRef.current = new window.kakao.maps.MarkerClusterer({
            map,
            averageCenter: true,
            minLevel: 6,
            disableClickZoom: false,
            styles: [{
              width: '44px',
              height: '44px',
              background: COLORS.primary.main,
              borderRadius: '22px',
              color: '#fff',
              textAlign: 'center',
              fontWeight: '700',
              lineHeight: '44px',
              fontSize: '14px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
              border: '2px solid #fff',
            }],
          });
        }

        setMapLoaded(true);

        // Map drag event
        window.kakao.maps.event.addListener(map, 'dragend', () => {
          const c = map.getCenter();
          setMapMoved(true);
          onMapMovedRef.current?.({ lat: c.getLat(), lng: c.getLng() });
          onBoundsChangedRef.current?.(extractBounds(map));
        });

        // Map zoom event
        window.kakao.maps.event.addListener(map, 'zoom_changed', () => {
          onBoundsChangedRef.current?.(extractBounds(map));
        });

        // Fire initial bounds
        setTimeout(() => {
          if (!cancelled && mapInstanceRef.current) {
            onBoundsChangedRef.current?.(extractBounds(mapInstanceRef.current));
          }
        }, 300);
      } catch (err) {
        if (!cancelled) setError('지도를 불러올 수 없습니다.');
      }
    };

    initMap();
    return () => { cancelled = true; };
  }, []);

  // Update center
  useEffect(() => {
    if (mapInstanceRef.current && mapLoaded) {
      const coords = new window.kakao.maps.LatLng(center.lat, center.lng);
      mapInstanceRef.current.panTo(coords);
    }
  }, [center.lat, center.lng, mapLoaded]);

  // Update markers with category colors and clusterer
  useEffect(() => {
    if (!mapInstanceRef.current || !mapLoaded) return;

    // Clear existing markers from clusterer (if available) and map
    if (clustererRef.current) {
      clustererRef.current.clear();
    }
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];

    const kakaoMarkers = markers.map(markerData => {
      const position = new window.kakao.maps.LatLng(markerData.latitude, markerData.longitude);
      const color = CATEGORY_MARKER_COLORS[markerData.category || ''] || DEFAULT_MARKER_COLOR;
      const isSelected = markerData.id === selectedMarkerId;
      const svgUrl = createMarkerSvg(color, isSelected);
      const markerSize = isSelected
        ? new window.kakao.maps.Size(40, 52)
        : new window.kakao.maps.Size(32, 42);
      const markerOffset = isSelected
        ? new window.kakao.maps.Point(20, 52)
        : new window.kakao.maps.Point(16, 42);

      const markerImage = new window.kakao.maps.MarkerImage(
        svgUrl,
        markerSize,
        { offset: markerOffset }
      );

      const marker = new window.kakao.maps.Marker({
        position,
        title: markerData.title,
        image: markerImage,
        zIndex: isSelected ? 10 : 1,
      });

      window.kakao.maps.event.addListener(marker, 'click', () => {
        onMarkerClickRef.current?.(markerData);
      });

      return marker;
    });

    markersRef.current = kakaoMarkers;

    // Use clusterer if available, otherwise add directly to map
    if (clustererRef.current) {
      clustererRef.current.addMarkers(kakaoMarkers);
    } else {
      kakaoMarkers.forEach(m => m.setMap(mapInstanceRef.current));
    }
  }, [markers, mapLoaded, selectedMarkerId]);

  // Show my-location blue dot
  useEffect(() => {
    if (!mapInstanceRef.current || !mapLoaded) return;

    // Remove previous
    if (myLocationMarkerRef.current) {
      myLocationMarkerRef.current.setMap(null);
      myLocationMarkerRef.current = null;
    }

    if (showMyLocation && myLocation) {
      const position = new window.kakao.maps.LatLng(myLocation.lat, myLocation.lng);
      const blueDotSvg = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20">
          <circle cx="10" cy="10" r="9" fill="#1976D2" stroke="white" stroke-width="3" opacity="0.9"/>
          <circle cx="10" cy="10" r="4" fill="white"/>
        </svg>
      `.trim())}`;

      const markerImage = new window.kakao.maps.MarkerImage(
        blueDotSvg,
        new window.kakao.maps.Size(20, 20),
        { offset: new window.kakao.maps.Point(10, 10) }
      );

      const marker = new window.kakao.maps.Marker({
        position,
        image: markerImage,
        zIndex: 0,
      });

      marker.setMap(mapInstanceRef.current);
      myLocationMarkerRef.current = marker;
    }
  }, [showMyLocation, myLocation, mapLoaded]);

  const handleSearchHere = useCallback(() => {
    if (!mapInstanceRef.current) return;
    const c = mapInstanceRef.current.getCenter();
    setMapMoved(false);
    onSearchHere?.({ lat: c.getLat(), lng: c.getLng() });
  }, [onSearchHere]);

  const containerHeight = typeof height === 'number' ? height : undefined;
  const containerStyle = typeof height === 'string'
    ? [styles.container, { height: undefined }]
    : [styles.container, { height: containerHeight }];

  return (
    <View style={containerStyle}>
      <div
        ref={mapRef}
        style={{
          width: '100%',
          height: typeof height === 'string' ? height : '100%',
          borderRadius: 0,
          backgroundColor: COLORS.neutral.grey100,
        }}
      >
        {!mapLoaded && !error && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: COLORS.text.secondary,
            fontSize: 14,
          }}>
            지도를 불러오는 중...
          </div>
        )}
        {error && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: COLORS.text.secondary,
            fontSize: 14,
          }}>
            {error}
          </div>
        )}
      </div>
      {showSearchButton && mapMoved && (
        <div
          onClick={handleSearchHere}
          style={{
            position: 'absolute',
            top: 12,
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: COLORS.primary.main,
            color: COLORS.text.white,
            padding: '8px 16px',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: '600',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(13,13,12,0.15)',
            zIndex: 10,
            whiteSpace: 'nowrap',
          }}
        >
          이 위치로 재검색
        </div>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
  },
});

export default WebKakaoMap;
