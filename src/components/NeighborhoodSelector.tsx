import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Platform,
} from 'react-native';
import { COLORS, SHADOWS } from '../styles/colors';
import { Icon } from './Icon';
import KakaoMapModal from './KakaoMapModal';
import NativeMapModal from './NativeMapModal';

interface NeighborhoodSelectorProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (district: string, neighborhood: string) => void;
  currentNeighborhood?: { district: string; neighborhood: string } | null;
}


const NeighborhoodSelector: React.FC<NeighborhoodSelectorProps> = ({
  visible,
  onClose,
  onSelect,
  currentNeighborhood,
}) => {
  const [showMapModal, setShowMapModal] = useState(false);

  // 카카오 지도 모달 열기
  const handleOpenKakaoMap = () => {
    console.log('🗺️ [NeighborhoodSelector] 지도 모달 열기 버튼 클릭됨');
    console.log('🗺️ [NeighborhoodSelector] Platform.OS:', Platform.OS);
    setShowMapModal(true);
    console.log('🗺️ [NeighborhoodSelector] showMapModal 상태가 true로 설정됨');
  };

  // 카카오 지도에서 위치 선택 처리 (GPS 권한 체크 포함)
  const handleKakaoMapLocationSelect = (district: string, neighborhood: string, lat: number, lng: number, address: string, radius?: number) => {
    console.log('🗺️ 카카오 지도에서 위치 선택됨:', { district, neighborhood, lat, lng, address, radius });
    // 먼저 맵 모달 닫기
    setShowMapModal(false);
    // 약간의 지연 후 선택 처리 및 부모 모달 닫기
    setTimeout(() => {
      onSelect(district, neighborhood);
      onClose();
    }, 100);
  };


  const renderCurrentLocationTab = () => (
    <View style={styles.tabContent}>
      {/* 카카오 지도로 위치 선택 */}
      <TouchableOpacity
        style={styles.locationButton}
        onPress={handleOpenKakaoMap}
      >
        <Icon name="map" size={24} color={COLORS.primary.main} />
        <View style={styles.locationButtonText}>
          <Text style={styles.locationButtonTitle}>
            🗺️지도에서 위치 선택
          </Text>
          <Text style={styles.locationButtonSubtitle}>
            GPS로 현재 위치를 자동 표시하고 지도에서 세밀하게 조정할 수 있어요
          </Text>
        </View>
        <Icon name="chevron-right" size={20} color={COLORS.text.secondary} />
      </TouchableOpacity>

      {currentNeighborhood && (
        <View style={styles.currentNeighborhoodContainer}>
          <Text style={styles.currentNeighborhoodTitle}>현재 설정된 동네</Text>
          <Text style={styles.currentNeighborhoodText}>
            {currentNeighborhood.district} {currentNeighborhood.neighborhood}
          </Text>
        </View>
      )}
    </View>
  );


  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* 헤더 */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Icon name="x" size={24} color={COLORS.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>동네 설정</Text>
          <View style={styles.headerPlaceholder} />
        </View>

        {/* 메인 컨텐츠 */}
        {renderCurrentLocationTab()}
      </View>

      {/* Platform에 따른 지도 모달 */}
      {Platform.OS === 'web' ? (
        <KakaoMapModal
          visible={showMapModal}
          onClose={() => setShowMapModal(false)}
          onLocationSelect={handleKakaoMapLocationSelect}
        />
      ) : (
        <NativeMapModal
          visible={showMapModal}
          onClose={() => setShowMapModal(false)}
          onLocationSelect={handleKakaoMapLocationSelect}
          mode="settings"
        />
      )}
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
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.grey200,
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  headerPlaceholder: {
    width: 32,
  },
  tabContent: {
    flex: 1,
    padding: 16,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    ...SHADOWS.small,
  },
  locationButtonDisabled: {
    opacity: 0.6,
  },
  locationButtonText: {
    flex: 1,
    marginLeft: 12,
  },
  locationButtonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  locationButtonSubtitle: {
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  currentNeighborhoodContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    ...SHADOWS.small,
  },
  currentNeighborhoodTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 12,
  },
  currentNeighborhoodItem: {
    paddingVertical: 8,
  },
  currentNeighborhoodText: {
    fontSize: 16,
    color: COLORS.primary.main,
    fontWeight: '500',
  },
  locationGuideContainer: {
    backgroundColor: COLORS.secondary.light,
    borderRadius: 8,
    padding: 12,
    marginVertical: 12,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary.main,
  },
  locationGuideTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary.dark,
    marginBottom: 8,
  },
  locationGuideText: {
    fontSize: 13,
    color: COLORS.text.secondary,
    lineHeight: 18,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 12,
  },
  popularList: {
    backgroundColor: 'white',
    borderRadius: 12,
    maxHeight: 400,
    ...SHADOWS.small,
  },
  popularItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.grey100,
  },
  popularItemText: {
    fontSize: 16,
    color: COLORS.text.primary,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    ...SHADOWS.small,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text.primary,
    marginLeft: 8,
  },
  searchButton: {
    backgroundColor: COLORS.primary.main,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  searchButtonDisabled: {
    opacity: 0.6,
  },
  searchButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  searchResults: {
    backgroundColor: 'white',
    borderRadius: 12,
    maxHeight: 400,
    ...SHADOWS.small,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.grey100,
  },
  searchResultInfo: {
    flex: 1,
  },
  searchResultTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  searchResultAddress: {
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  quickSelectContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    ...SHADOWS.small,
  },
  quickSelectTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 12,
  },
  quickSelectScroll: {
    flexDirection: 'row',
  },
  quickSelectButton: {
    alignItems: 'center',
    backgroundColor: COLORS.primary.light,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 8,
    minWidth: 80,
    borderWidth: 1,
    borderColor: COLORS.primary.main,
  },
  quickSelectEmoji: {
    fontSize: 20,
    marginBottom: 4,
  },
  quickSelectText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.primary.dark,
    textAlign: 'center',
  },
  recommendedContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: COLORS.primary.main,
    ...SHADOWS.medium,
  },
  recommendedTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary.main,
    marginBottom: 12,
    textAlign: 'center',
  },
  recommendedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary.light,
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: COLORS.primary.main,
  },
  recommendedEmoji: {
    fontSize: 32,
    marginRight: 16,
  },
  recommendedTextContainer: {
    flex: 1,
  },
  recommendedMainText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary.dark,
    marginBottom: 4,
  },
  recommendedSubText: {
    fontSize: 14,
    color: COLORS.text.secondary,
  },
});

export default NeighborhoodSelector;