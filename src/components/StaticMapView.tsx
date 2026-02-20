import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Linking,
} from 'react-native';
import WebView from 'react-native-webview';
import { COLORS, SHADOWS } from '../styles/colors';
import { Icon } from './Icon';

interface StaticMapViewProps {
  location: string;
  address?: string;
  latitude?: number;
  longitude?: number;
}

const StaticMapView: React.FC<StaticMapViewProps> = ({
  location,
  address,
  latitude,
  longitude,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  // 유효한 좌표가 있는지 확인
  const hasValidCoords = latitude && longitude &&
    latitude !== 0 && longitude !== 0 &&
    latitude >= -90 && latitude <= 90 &&
    longitude >= -180 && longitude <= 180;

  // 카카오맵 정적 지도 HTML
  const mapHtml = useMemo(() => {
    if (!hasValidCoords) {return '';}

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; }
    #map { width: 100%; height: 100%; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script type="text/javascript" src="https://dapi.kakao.com/v2/maps/sdk.js?appkey=5a202bd90ab8dff01348f24cb1c37f3f&autoload=false"></script>
  <script>
    kakao.maps.load(function() {
      var container = document.getElementById('map');
      var options = {
        center: new kakao.maps.LatLng(${latitude}, ${longitude}),
        level: 3,
        draggable: false,
        scrollwheel: false,
        disableDoubleClickZoom: true
      };
      var map = new kakao.maps.Map(container, options);

      // 마커 추가
      var marker = new kakao.maps.Marker({
        position: new kakao.maps.LatLng(${latitude}, ${longitude}),
        map: map
      });

      // 인포윈도우 (장소명 표시)
      var infowindow = new kakao.maps.InfoWindow({
        content: '<div style="padding:8px 12px;font-size:13px;font-weight:500;white-space:nowrap;">${location.replace(/'/g, "\\'")}</div>'
      });
      infowindow.open(map, marker);

      // React Native에 준비 완료 알림
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'MAP_READY' }));
      }
    });
  </script>
</body>
</html>
    `;
  }, [latitude, longitude, location]);

  // 카카오맵 앱 또는 웹으로 열기
  const openInKakaoMap = () => {
    if (!hasValidCoords) {return;}

    // 카카오맵 앱 URL Scheme
    const kakaoMapUrl = `kakaomap://look?p=${latitude},${longitude}`;
    const kakaoWebUrl = `https://map.kakao.com/link/map/${encodeURIComponent(location)},${latitude},${longitude}`;

    Linking.canOpenURL(kakaoMapUrl).then((supported) => {
      if (supported) {
        Linking.openURL(kakaoMapUrl);
      } else {
        Linking.openURL(kakaoWebUrl);
      }
    });
  };

  if (!hasValidCoords) {
    return (
      <View style={styles.container}>
        <View style={styles.noMapContainer}>
          <Icon name="map-pin" size={32} color={COLORS.text.secondary} />
          <Text style={styles.noMapText}>위치 정보가 없습니다</Text>
          {location && (
            <Text style={styles.locationText}>{location}</Text>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Icon name="map-pin" size={18} color={COLORS.primary.main} />
        <Text style={styles.headerTitle}>약속 장소</Text>
      </View>

      <View style={styles.mapWrapper}>
        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="small" color={COLORS.primary.main} />
            <Text style={styles.loadingText}>지도 로딩 중...</Text>
          </View>
        )}

        {error ? (
          <View style={styles.errorContainer}>
            <Icon name="alert-circle" size={24} color={COLORS.text.secondary} />
            <Text style={styles.errorText}>지도를 불러올 수 없습니다</Text>
          </View>
        ) : (
          <WebView
            source={{ html: mapHtml }}
            style={styles.webview}
            onMessage={(event) => {
              try {
                const data = JSON.parse(event.nativeEvent.data);
                if (data.type === 'MAP_READY') {
                  setIsLoading(false);
                }
              } catch (err) {
                console.log('Map message parse error:', err);
              }
            }}
            onLoad={() => {
              // 5초 후에도 MAP_READY가 안 오면 강제로 로딩 완료
              setTimeout(() => setIsLoading(false), 5000);
            }}
            onError={() => {
              setError(true);
              setIsLoading(false);
            }}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            scrollEnabled={false}
            bounces={false}
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      {/* 주소 정보 */}
      <View style={styles.addressContainer}>
        <View style={styles.addressInfo}>
          <Text style={styles.locationName}>{location}</Text>
          {address && address !== location && (
            <Text style={styles.addressText}>{address}</Text>
          )}
        </View>

        <TouchableOpacity style={styles.openMapButton} onPress={openInKakaoMap}>
          <Text style={styles.openMapButtonText}>지도 앱 열기</Text>
          <Icon name="external-link" size={14} color={COLORS.primary.main} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.neutral.white,
    borderRadius: 8,
    marginVertical: 12,
    overflow: 'hidden',
    ...SHADOWS.medium,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.grey100,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginLeft: 8,
  },
  mapWrapper: {
    height: 180,
    position: 'relative',
  },
  webview: {
    flex: 1,
    backgroundColor: COLORS.neutral.grey100,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.neutral.grey100,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 13,
    color: COLORS.text.secondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.neutral.grey100,
  },
  errorText: {
    marginTop: 8,
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.neutral.grey100,
  },
  addressInfo: {
    flex: 1,
  },
  locationName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 2,
  },
  addressText: {
    fontSize: 13,
    color: COLORS.text.secondary,
  },
  openMapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary.light,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 12,
  },
  openMapButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.primary.main,
    marginRight: 4,
  },
  noMapContainer: {
    padding: 32,
    alignItems: 'center',
  },
  noMapText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  locationText: {
    marginTop: 4,
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text.primary,
  },
});

export default StaticMapView;
