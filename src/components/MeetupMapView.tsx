import React, { useRef, useEffect, useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Platform,
  ActivityIndicator,
  Text,
  TouchableOpacity,
} from 'react-native';
import WebView from 'react-native-webview';
import Geolocation from '@react-native-community/geolocation';
import { COLORS, SHADOWS } from '../styles/colors';

interface MeetupLocation {
  id: string;
  title: string;
  latitude: number;
  longitude: number;
  date: string;
  time: string;
  location: string;
  category: string;
  currentParticipants: number;
  maxParticipants: number;
}

interface MeetupMapViewProps {
  meetups: MeetupLocation[];
  center: { latitude: number; longitude: number };
  onMarkerClick: (meetupId: string) => void;
  onMapMoved: (latitude: number, longitude: number) => void;
  onSearchHere: () => void;
  selectedMeetupId?: string | null;
  showSearchButton?: boolean;
}

const MeetupMapView: React.FC<MeetupMapViewProps> = ({
  meetups,
  center,
  onMarkerClick,
  onMapMoved,
  onSearchHere,
  selectedMeetupId,
  showSearchButton = false,
}) => {
  const webViewRef = useRef<WebView>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Get user location
  useEffect(() => {
    if (Platform.OS === 'ios') {
      Geolocation.setRNConfiguration({
        skipPermissionRequests: false,
        authorizationLevel: 'whenInUse',
      });
      Geolocation.requestAuthorization();
    }

    Geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => {
        console.log('GPS error:', error);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    );
  }, []);

  // Update markers when meetups change
  useEffect(() => {
    if (mapReady && webViewRef.current) {
      const script = `
        if (typeof updateMeetupMarkers === 'function') {
          updateMeetupMarkers(${JSON.stringify(meetups)});
        }
        true;
      `;
      webViewRef.current.injectJavaScript(script);
    }
  }, [meetups, mapReady]);

  // Update selected marker
  useEffect(() => {
    if (mapReady && webViewRef.current) {
      const script = `
        if (typeof selectMarker === 'function') {
          selectMarker(${selectedMeetupId ? `"${selectedMeetupId}"` : 'null'});
        }
        true;
      `;
      webViewRef.current.injectJavaScript(script);
    }
  }, [selectedMeetupId, mapReady]);

  // Update user location on map
  useEffect(() => {
    if (mapReady && webViewRef.current && userLocation) {
      const script = `
        if (typeof setUserLocation === 'function') {
          setUserLocation(${userLocation.lat}, ${userLocation.lng});
        }
        true;
      `;
      webViewRef.current.injectJavaScript(script);
    }
  }, [userLocation, mapReady]);

  // HTML content for the map
  const mapHtml = useMemo(() => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=10.0, user-scalable=yes">
  <title>모임 지도</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; touch-action: manipulation; }
    html, body { width: 100%; height: 100%; overflow: hidden; touch-action: manipulation; }
    #map { width: 100%; height: 100%; touch-action: manipulation; }
    .search-here-btn {
      position: absolute;
      top: 16px;
      left: 50%;
      transform: translateX(-50%);
      background: white;
      padding: 10px 20px;
      border-radius: 20px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.2);
      border: none;
      font-size: 14px;
      font-weight: 600;
      color: #333;
      cursor: pointer;
      z-index: 100;
      display: none;
    }
    .search-here-btn.show { display: block; }
    .zoom-controls {
      position: absolute;
      right: 16px;
      bottom: 100px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      z-index: 100;
    }
    .zoom-btn {
      width: 40px;
      height: 40px;
      background: white;
      border: none;
      border-radius: 8px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.2);
      font-size: 20px;
      font-weight: bold;
      color: #333;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .zoom-btn:active {
      background: #f0f0f0;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <button id="searchHereBtn" class="search-here-btn" onclick="handleSearchHere()">이 위치로 재검색</button>

  <!-- 줌 컨트롤 버튼 -->
  <div class="zoom-controls">
    <button class="zoom-btn" onclick="zoomIn()">+</button>
    <button class="zoom-btn" onclick="zoomOut()">−</button>
  </div>

  <script src="https://dapi.kakao.com/v2/maps/sdk.js?appkey=5a202bd90ab8dff01348f24cb1c37f3f&autoload=false"></script>
  <script>
    let map = null;
    let markers = [];
    let userMarker = null;
    let selectedMarkerId = null;
    let mapMoved = false;

    // Zoom functions
    function zoomIn() {
      if (map) {
        const level = map.getLevel();
        map.setLevel(level - 1);
      }
    }

    function zoomOut() {
      if (map) {
        const level = map.getLevel();
        map.setLevel(level + 1);
      }
    }

    // Initialize map
    kakao.maps.load(function() {
      try {
        const container = document.getElementById('map');
        const options = {
          center: new kakao.maps.LatLng(${center.latitude}, ${center.longitude}),
          level: 5,
          scrollwheel: true,
          disableDoubleClick: false,
          disableDoubleClickZoom: false
        };

        map = new kakao.maps.Map(container, options);

        // 줌 컨트롤 추가
        const zoomControl = new kakao.maps.ZoomControl();
        map.addControl(zoomControl, kakao.maps.ControlPosition.RIGHT);

        // 지도 확대/축소 활성화
        map.setZoomable(true);

        // Map drag event
        kakao.maps.event.addListener(map, 'dragend', function() {
          mapMoved = true;
          document.getElementById('searchHereBtn').classList.add('show');
          const center = map.getCenter();
          sendMessage('MAP_MOVED', {
            latitude: center.getLat(),
            longitude: center.getLng()
          });
        });

        // Map click event (deselect marker)
        kakao.maps.event.addListener(map, 'click', function() {
          selectedMarkerId = null;
          sendMessage('MARKER_DESELECTED', {});
        });

        sendMessage('MAP_READY', {});
      } catch (e) {
        sendMessage('MAP_ERROR', { error: e.message });
      }
    });

    // Send message to React Native
    function sendMessage(type, data) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type, data }));
      }
    }

    // Update meetup markers
    function updateMeetupMarkers(meetups) {
      // Clear existing markers
      markers.forEach(m => m.setMap(null));
      markers = [];

      if (!meetups || !Array.isArray(meetups)) return;

      meetups.forEach(meetup => {
        if (!meetup.latitude || !meetup.longitude) return;

        const position = new kakao.maps.LatLng(meetup.latitude, meetup.longitude);

        // Custom marker image
        const markerImage = new kakao.maps.MarkerImage(
          'https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/marker_red.png',
          new kakao.maps.Size(30, 40),
          { offset: new kakao.maps.Point(15, 40) }
        );

        const marker = new kakao.maps.Marker({
          position: position,
          map: map,
          image: markerImage,
          title: meetup.title
        });

        marker.meetupId = meetup.id;

        // Marker click event
        kakao.maps.event.addListener(marker, 'click', function() {
          selectedMarkerId = meetup.id;
          sendMessage('MARKER_CLICKED', { meetupId: meetup.id });
        });

        markers.push(marker);
      });
    }

    // Select a specific marker
    function selectMarker(meetupId) {
      selectedMarkerId = meetupId;
      if (meetupId) {
        const marker = markers.find(m => m.meetupId === meetupId);
        if (marker) {
          map.setCenter(marker.getPosition());
        }
      }
    }

    // Set user location marker
    function setUserLocation(lat, lng) {
      if (userMarker) {
        userMarker.setMap(null);
      }

      const position = new kakao.maps.LatLng(lat, lng);

      // Blue circle marker for user location
      const userMarkerImage = new kakao.maps.MarkerImage(
        'https://maps.google.com/mapfiles/ms/icons/blue-dot.png',
        new kakao.maps.Size(32, 32),
        { offset: new kakao.maps.Point(16, 16) }
      );

      userMarker = new kakao.maps.Marker({
        position: position,
        map: map,
        image: userMarkerImage,
        title: '내 위치'
      });
    }

    // Handle search here button click
    function handleSearchHere() {
      const center = map.getCenter();
      document.getElementById('searchHereBtn').classList.remove('show');
      mapMoved = false;
      sendMessage('SEARCH_HERE', {
        latitude: center.getLat(),
        longitude: center.getLng()
      });
    }

    // Move map to location
    function moveToLocation(lat, lng) {
      if (map) {
        map.setCenter(new kakao.maps.LatLng(lat, lng));
      }
    }

    // Show/hide search button
    function setSearchButtonVisible(visible) {
      const btn = document.getElementById('searchHereBtn');
      if (visible) {
        btn.classList.add('show');
      } else {
        btn.classList.remove('show');
      }
    }
  </script>
</body>
</html>
  `, [center.latitude, center.longitude]);

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);

      switch (data.type) {
        case 'MAP_READY':
          setMapReady(true);
          setIsLoading(false);
          break;
        case 'MAP_ERROR':
          setError(data.data.error || 'Map loading failed');
          setIsLoading(false);
          break;
        case 'MARKER_CLICKED':
          onMarkerClick(data.data.meetupId);
          break;
        case 'MARKER_DESELECTED':
          onMarkerClick('');
          break;
        case 'MAP_MOVED':
          onMapMoved(data.data.latitude, data.data.longitude);
          break;
        case 'SEARCH_HERE':
          onSearchHere();
          break;
      }
    } catch (err) {
      console.error('WebView message parse error:', err);
    }
  };

  // Update search button visibility
  useEffect(() => {
    if (mapReady && webViewRef.current) {
      const script = `
        setSearchButtonVisible(${showSearchButton});
        true;
      `;
      webViewRef.current.injectJavaScript(script);
    }
  }, [showSearchButton, mapReady]);

  return (
    <View style={styles.container}>
      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary.main} />
          <Text style={styles.loadingText}>지도를 불러오는 중...</Text>
        </View>
      )}

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              setError(null);
              setIsLoading(true);
              webViewRef.current?.reload();
            }}
          >
            <Text style={styles.retryButtonText}>다시 시도</Text>
          </TouchableOpacity>
        </View>
      )}

      <WebView
        ref={webViewRef}
        source={{ html: mapHtml }}
        style={[styles.webview, (isLoading || error) && styles.hidden]}
        onMessage={handleMessage}
        onLoadEnd={() => {
          setTimeout(() => {
            if (!mapReady) {
              setError('지도 로딩 시간이 초과되었습니다.');
              setIsLoading(false);
            }
          }, 15000);
        }}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        originWhitelist={['*']}
        mixedContentMode="always"
        allowsInlineMediaPlayback={true}
        geolocationEnabled={true}
        bounces={false}
        scrollEnabled={true}
        scalesPageToFit={true}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        overScrollMode="never"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.neutral.background,
  },
  webview: {
    flex: 1,
  },
  hidden: {
    opacity: 0,
    height: 0,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    zIndex: 100,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  errorContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 20,
    zIndex: 100,
  },
  errorText: {
    fontSize: 14,
    color: COLORS.functional.error,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: COLORS.primary.main,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default MeetupMapView;
