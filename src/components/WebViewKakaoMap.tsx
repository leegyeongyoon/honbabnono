import React, { useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Text,
  Alert,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { COLORS, SHADOWS } from '../styles/colors';
import { Icon } from './Icon';

interface WebViewKakaoMapProps {
  visible: boolean;
  onClose: () => void;
  onLocationSelect: (location: {
    address: string;
    latitude: number;
    longitude: number;
  }) => void;
}

const WebViewKakaoMap: React.FC<WebViewKakaoMapProps> = ({
  visible,
  onClose,
  onLocationSelect,
}) => {
  const webViewRef = useRef<WebView>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // WebView에서 오는 메시지 처리
  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      console.log('📱 WebView 메시지 받음:', data);

      switch (data.type) {
        case 'MAP_READY':
          console.log('✅ 지도 준비 완료');
          setIsLoading(false);
          setError(null);
          break;

        case 'MAP_ERROR':
          console.error('❌ 지도 오류:', data.error);
          setError(data.error);
          setIsLoading(false);
          break;

        case 'LOCATION_SELECTED':
          console.log('📍 위치 선택됨:', data.data);
          onLocationSelect({
            address: data.data.address,
            latitude: data.data.latitude,
            longitude: data.data.longitude,
          });
          onClose();
          break;

        default:
          console.log('🔍 알 수 없는 메시지:', data);
      }
    } catch (error) {
      console.error('메시지 파싱 오류:', error);
    }
  };

  // 현재 위치로 이동
  const moveToCurrentLocation = () => {
    const script = `
      if (window.moveToCurrentLocation) {
        window.moveToCurrentLocation();
      }
    `;
    webViewRef.current?.injectJavaScript(script);
  };

  // WebView 로드 오류 처리
  const handleWebViewError = () => {
    setError('지도를 불러올 수 없습니다');
    setIsLoading(false);
  };

  const mapUrl = `http://localhost:3000/kakao-map.html`;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* 헤더 */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Icon name="x" size={24} color={COLORS.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>위치 선택</Text>
          <TouchableOpacity onPress={moveToCurrentLocation} style={styles.gpsButton}>
            <Icon name="navigation" size={24} color={COLORS.primary.main} />
          </TouchableOpacity>
        </View>

        {/* 에러 표시 */}
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorIcon}>⚠️</Text>
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

        {/* 로딩 표시 */}
        {isLoading && !error && (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingIcon}>🗺️</Text>
            <Text style={styles.loadingText}>카카오 지도를 불러오는 중...</Text>
          </View>
        )}

        {/* WebView */}
        {!error && (
          <WebView
            ref={webViewRef}
            source={{ uri: mapUrl }}
            style={styles.webview}
            onMessage={handleWebViewMessage}
            onError={handleWebViewError}
            onHttpError={handleWebViewError}
            onLoadStart={() => setIsLoading(true)}
            onLoadEnd={() => {
              // 로딩 상태는 MAP_READY 메시지에서 해제
            }}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            allowsInlineMediaPlayback={true}
            mediaPlaybackRequiresUserAction={false}
            startInLoadingState={false}
            originWhitelist={['*']}
            mixedContentMode="compatibility"
            allowsFullscreenVideo={true}
            allowFileAccess={true}
            allowUniversalAccessFromFileURLs={true}
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
          />
        )}

        {/* 안내 텍스트 */}
        {!error && !isLoading && (
          <View style={styles.instructionContainer}>
            <Text style={styles.instructionText}>
              📍 지도를 터치하거나 마커를 드래그하여 위치를 선택한 후 "선택완료" 버튼을 눌러주세요
            </Text>
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.neutral.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 50, // 상태바 영역 고려
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.grey200,
    ...SHADOWS.small,
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  gpsButton: {
    padding: 8,
  },
  webview: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  loadingIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.text.secondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 20,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.text.primary,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: COLORS.primary.main,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    ...SHADOWS.small,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  instructionContainer: {
    backgroundColor: COLORS.secondary.light,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.neutral.grey200,
  },
  instructionText: {
    fontSize: 14,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default WebViewKakaoMap;