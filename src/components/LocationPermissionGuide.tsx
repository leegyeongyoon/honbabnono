import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { COLORS, SHADOWS } from '../styles/colors';
import { Icon } from './Icon';

interface LocationPermissionGuideProps {
  visible: boolean;
  onClose: () => void;
  onRetry?: () => void;
}

const LocationPermissionGuide: React.FC<LocationPermissionGuideProps> = ({
  visible,
  onClose,
  onRetry,
}) => {
  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <View style={styles.modal}>
        {/* 헤더 */}
        <View style={styles.header}>
          <Text style={styles.title}>📍 위치 권한 설정 안내</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Icon name="x" size={24} color={COLORS.text.secondary} />
          </TouchableOpacity>
        </View>

        {/* 설명 */}
        <View style={styles.content}>
          <Text style={styles.description}>
            현재 위치를 사용하여 동네를 설정하려면{'\n'}
            브라우저에서 위치 권한을 허용해주세요.
          </Text>

          {/* 단계별 안내 */}
          <View style={styles.stepContainer}>
            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepText}>1</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>주소창 확인</Text>
                <Text style={styles.stepDescription}>
                  브라우저 주소창 왼쪽의 🔒 아이콘을 클릭하세요
                </Text>
              </View>
            </View>

            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepText}>2</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>위치 권한 변경</Text>
                <Text style={styles.stepDescription}>
                  "위치" 설정을 "허용"으로 변경하세요
                </Text>
              </View>
            </View>

            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepText}>3</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>페이지 새로고침</Text>
                <Text style={styles.stepDescription}>
                  페이지를 새로고침하고 다시 시도하세요
                </Text>
              </View>
            </View>
          </View>

          {/* 대안 안내 */}
          <View style={styles.alternativeContainer}>
            <Icon name="info" size={16} color={COLORS.primary.main} />
            <Text style={styles.alternativeText}>
              위치 권한을 허용할 수 없다면 인기 동네나 직접 검색을 이용할 수 있습니다.
            </Text>
          </View>
        </View>

        {/* 버튼들 */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={[styles.button, styles.secondaryButton]} 
            onPress={onClose}
          >
            <Text style={styles.secondaryButtonText}>나중에 설정</Text>
          </TouchableOpacity>
          
          {onRetry && (
            <TouchableOpacity 
              style={[styles.button, styles.primaryButton]} 
              onPress={() => {
                onClose();
                onRetry();
              }}
            >
              <Text style={styles.primaryButtonText}>다시 시도</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  modal: {
    backgroundColor: COLORS.neutral.white,
    borderRadius: 16,
    margin: 20,
    maxWidth: 500,
    width: '100%',
    ...SHADOWS.medium,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.grey100,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 20,
  },
  description: {
    fontSize: 16,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  stepContainer: {
    marginBottom: 24,
  },
  step: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary.main,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  stepText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.neutral.white,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 14,
    color: COLORS.text.secondary,
    lineHeight: 20,
  },
  alternativeContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary.light,
    padding: 12,
    borderRadius: 8,
    alignItems: 'flex-start',
  },
  alternativeText: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginLeft: 8,
    flex: 1,
    lineHeight: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    padding: 20,
    paddingTop: 0,
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: COLORS.primary.main,
  },
  secondaryButton: {
    backgroundColor: COLORS.neutral.grey100,
    borderWidth: 1,
    borderColor: COLORS.neutral.grey200,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.neutral.white,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.secondary,
  },
});

export default LocationPermissionGuide;