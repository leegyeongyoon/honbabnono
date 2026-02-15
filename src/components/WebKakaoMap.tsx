import React, { useRef, useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../styles/colors';

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

interface WebKakaoMapProps {
  center?: { lat: number; lng: number };
  markers?: MapMarker[];
  onMarkerClick?: (marker: MapMarker) => void;
  onMapMoved?: (center: { lat: number; lng: number }) => void;
  height?: number;
  showSearchButton?: boolean;
  onSearchHere?: (center: { lat: number; lng: number }) => void;
}

const KAKAO_APP_KEY = process.env.REACT_APP_KAKAO_CLIENT_ID || '';
const DEFAULT_CENTER = { lat: 37.498095, lng: 127.027610 }; // 강남역

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
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_APP_KEY}&libraries=services&autoload=false`;
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

const WebKakaoMap: React.FC<WebKakaoMapProps> = ({
  center = DEFAULT_CENTER,
  markers = [],
  onMarkerClick,
  onMapMoved,
  height = 300,
  showSearchButton = false,
  onSearchHere,
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mapMoved, setMapMoved] = useState(false);

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

        mapInstanceRef.current = map;
        setMapLoaded(true);

        // Map drag event
        window.kakao.maps.event.addListener(map, 'dragend', () => {
          const c = map.getCenter();
          setMapMoved(true);
          onMapMoved?.({ lat: c.getLat(), lng: c.getLng() });
        });
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
      mapInstanceRef.current.setCenter(coords);
    }
  }, [center.lat, center.lng, mapLoaded]);

  // Update markers
  useEffect(() => {
    if (!mapInstanceRef.current || !mapLoaded) return;

    // Clear existing markers
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];

    markers.forEach(markerData => {
      const position = new window.kakao.maps.LatLng(markerData.latitude, markerData.longitude);
      const marker = new window.kakao.maps.Marker({
        map: mapInstanceRef.current,
        position,
        title: markerData.title,
      });

      if (onMarkerClick) {
        window.kakao.maps.event.addListener(marker, 'click', () => {
          onMarkerClick(markerData);
        });
      }

      markersRef.current.push(marker);
    });
  }, [markers, mapLoaded, onMarkerClick]);

  const handleSearchHere = useCallback(() => {
    if (!mapInstanceRef.current) return;
    const c = mapInstanceRef.current.getCenter();
    setMapMoved(false);
    onSearchHere?.({ lat: c.getLat(), lng: c.getLng() });
  }, [onSearchHere]);

  return (
    <View style={[styles.container, { height }]}>
      <div
        ref={mapRef}
        style={{
          width: '100%',
          height: '100%',
          borderRadius: 12,
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
            borderRadius: 20,
            fontSize: 13,
            fontWeight: '600',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
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
    borderRadius: 12,
  },
});

export default WebKakaoMap;
