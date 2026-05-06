import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Platform,
} from 'react-native';
import { COLORS, CSS_SHADOWS, SHADOWS } from '../styles/colors';
import { BORDER_RADIUS, SPACING } from '../styles/spacing';
import { Icon } from './Icon';
import KakaoMapModal from './KakaoMapModal';

interface NeighborhoodSelectorProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (district: string, neighborhood: string) => void;
  currentNeighborhood?: { district: string; neighborhood: string } | null;
  onOpenMapModal?: () => void;
}

const NeighborhoodSelector: React.FC<NeighborhoodSelectorProps> = ({
  visible,
  onClose,
  onSelect,
  currentNeighborhood,
  onOpenMapModal,
}) => {
  const [showWebMapModal, setShowWebMapModal] = useState(false);

  const handleOpenMap = () => {
    if (Platform.OS === 'web') {
      setShowWebMapModal(true);
    } else if (onOpenMapModal) {
      onOpenMapModal();
    }
  };

  const handleWebMapLocationSelect = (
    district: string,
    neighborhood: string,
    _lat: number,
    _lng: number,
    _address: string,
    _radius?: number,
  ) => {
    setShowWebMapModal(false);
    setTimeout(() => {
      onSelect(district, neighborhood);
      onClose();
    }, 100);
  };

  return (
    <>
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
              <Icon name="x" size={22} color={COLORS.text.secondary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>동네 설정</Text>
            <View style={styles.headerPlaceholder} />
          </View>

          {/* 본문 */}
          <View style={styles.body}>
            {/* 현재 동네 */}
            {currentNeighborhood && (
              <View style={styles.currentCard}>
                <View style={styles.currentDot} />
                <View style={styles.currentTextWrap}>
                  <Text style={styles.currentLabel}>현재 동네</Text>
                  <Text style={styles.currentValue}>
                    {currentNeighborhood.district} {currentNeighborhood.neighborhood}
                  </Text>
                </View>
              </View>
            )}

            {/* 지도에서 선택 버튼 */}
            <TouchableOpacity
              style={styles.mapButton}
              onPress={handleOpenMap}
              activeOpacity={0.7}
            >
              <View style={styles.mapIconWrap}>
                <Icon name="map-pin" size={20} color={COLORS.primary.main} />
              </View>
              <View style={styles.mapTextWrap}>
                <Text style={styles.mapTitle}>지도에서 위치 선택</Text>
                <Text style={styles.mapSubtitle}>
                  GPS로 현재 위치를 찾고 지도에서 정확하게 설정해요
                </Text>
              </View>
              <Icon name="chevron-right" size={18} color={COLORS.text.tertiary} />
            </TouchableOpacity>

            {/* 안내 */}
            <View style={styles.guideWrap}>
              <Text style={styles.guideText}>
                동네 설정에 따라 주변 매장이 표시됩니다
              </Text>
            </View>
          </View>
        </View>

        {/* Web용 카카오 지도 모달 */}
        {Platform.OS === 'web' && (
          <KakaoMapModal
            visible={showWebMapModal}
            onClose={() => setShowWebMapModal(false)}
            onLocationSelect={handleWebMapLocationSelect}
          />
        )}
      </Modal>
    </>
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
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: COLORS.neutral.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.grey100,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.neutral.grey50,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.text.primary,
    letterSpacing: -0.2,
  },
  headerPlaceholder: {
    width: 40,
  },

  // ─── 본문 ────────────────────────────────
  body: {
    padding: 20,
    gap: 16,
  },

  // 현재 동네 카드
  currentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary.light,
    borderRadius: BORDER_RADIUS.md,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(212,136,44,0.12)',
  },
  currentDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary.main,
  },
  currentTextWrap: {
    flex: 1,
    gap: 2,
  },
  currentLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.text.tertiary,
  },
  currentValue: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary.dark,
    letterSpacing: -0.2,
  },

  // 지도 버튼
  mapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.neutral.white,
    borderRadius: BORDER_RADIUS.md,
    padding: 18,
    gap: 14,
    ...SHADOWS.small,
    borderWidth: 1,
    borderColor: COLORS.neutral.grey100,
  },
  mapIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.primary.light,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapTextWrap: {
    flex: 1,
    gap: 3,
  },
  mapTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text.primary,
    letterSpacing: -0.2,
  },
  mapSubtitle: {
    fontSize: 13,
    color: COLORS.text.tertiary,
    lineHeight: 18,
  },

  // 안내
  guideWrap: {
    alignItems: 'center',
    paddingTop: 8,
  },
  guideText: {
    fontSize: 13,
    color: COLORS.text.tertiary,
  },
});

export default NeighborhoodSelector;
