import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS, SHADOWS } from '../styles/colors';
import { Icon } from './Icon';
import advertisementApiService, { Advertisement } from '../services/advertisementApiService';

interface AdvertisementBannerProps {
  position?: 'home_banner' | 'sidebar' | 'bottom';
  style?: any;
}

const AdvertisementBannerWeb: React.FC<AdvertisementBannerProps> = ({ 
  position = 'home_banner', 
  style 
}) => {
  const [advertisements, setAdvertisements] = useState<Advertisement[]>([]);
  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAdvertisements();
  }, [position]);

  useEffect(() => {
    // 여러 광고가 있을 경우 10초마다 순환
    if (advertisements.length > 1) {
      const interval = setInterval(() => {
        setCurrentAdIndex((prev) => (prev + 1) % advertisements.length);
      }, 10000); // 10초

      return () => clearInterval(interval);
    }
  }, [advertisements.length]);

  const loadAdvertisements = async () => {
    try {
      setLoading(true);
      const ads = await advertisementApiService.getActiveAdvertisements(position);
      setAdvertisements(ads);
      setCurrentAdIndex(0);
    } catch (error) {
      console.error('광고 로딩 실패:', error);
      setAdvertisements([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAdvertisementClick = async (advertisement: Advertisement) => {
    try {
      console.log('🔔 광고 클릭 (웹):', advertisement);
      console.log('🔔 useDetailPage:', advertisement.useDetailPage);
      console.log('🔔 linkUrl:', advertisement.linkUrl);
      
      // 클릭 수 기록
      await advertisementApiService.recordClick(advertisement.id);
      
      // 디테일 페이지 사용 여부에 따라 분기
      if (advertisement.useDetailPage) {
        console.log('✅ 디테일 페이지로 이동 (웹)');
        // 디테일 페이지로 이동 (웹용 URL 변경)
        window.location.href = `/advertisement/${advertisement.id}`;
      } else if (advertisement.linkUrl) {
        console.log('🌐 외부 링크로 이동 (웹)');
        // 외부 링크로 이동
        if (advertisement.linkUrl.startsWith('http')) {
          window.open(advertisement.linkUrl, '_blank');
        } else {
          console.log('내부 링크:', advertisement.linkUrl);
        }
      } else {
        console.log('❓ 아무 동작도 없음 (웹)');
      }
    } catch (error) {
      console.error('광고 클릭 처리 실패:', error);
    }
  };

  const renderAdvertisement = (advertisement: Advertisement) => {
    const imageUrl = advertisement.imageUrl.startsWith('http') 
      ? advertisement.imageUrl 
      : `${process.env.REACT_APP_API_URL || 'http://localhost:3001'}${advertisement.imageUrl}`;

    return (
      <TouchableOpacity
        key={advertisement.id}
        style={[styles.container, style]}
        onPress={() => handleAdvertisementClick(advertisement)}
        activeOpacity={0.8}
      >
        <View style={styles.content}>
          <div style={{
            width: '100%',
            height: '100%',
            backgroundImage: `url(${imageUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            borderRadius: 16,
            position: 'relative',
          }}>
            {/* 오버레이 텍스트 */}
            <View style={styles.overlay}>
              <Text style={styles.title} numberOfLines={1}>
                {advertisement.title}
              </Text>
              {advertisement.description && (
                <Text style={styles.description} numberOfLines={2}>
                  {advertisement.description}
                </Text>
              )}
            </View>

            {/* 클릭 힌트 아이콘 */}
            <View style={styles.clickHint}>
              <Icon name="chevron-right" size={16} color={COLORS.neutral.white} />
            </View>
          </div>
        </View>

        {/* 광고 표시 */}
        <View style={styles.adLabel}>
          <Text style={styles.adLabelText}>광고</Text>
        </View>

        {/* 여러 광고가 있을 경우 인디케이터 */}
        {advertisements.length > 1 && (
          <View style={styles.indicators}>
            {advertisements.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.indicator,
                  index === currentAdIndex && styles.activeIndicator
                ]}
              />
            ))}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer, style]}>
        <Text style={styles.loadingText}>광고 로딩 중...</Text>
      </View>
    );
  }

  if (advertisements.length === 0) {
    return null; // 광고가 없으면 표시하지 않음
  }

  return renderAdvertisement(advertisements[currentAdIndex]);
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginVertical: 16,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    height: 180, // 높이 증가 (글씨보다 더 크게)
    ...SHADOWS.medium,
  },
  content: {
    flex: 1,
    position: 'relative',
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.neutral.white,
    marginBottom: 4,
  },
  description: {
    fontSize: 12,
    color: COLORS.neutral.white,
    opacity: 0.9,
  },
  clickHint: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  adLabel: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  adLabelText: {
    fontSize: 10,
    color: COLORS.neutral.white,
    fontWeight: '500',
  },
  indicators: {
    position: 'absolute',
    bottom: 8,
    right: 12,
    flexDirection: 'row',
    gap: 4,
  },
  indicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  activeIndicator: {
    backgroundColor: COLORS.neutral.white,
  },
  loadingContainer: {
    backgroundColor: COLORS.neutral.gray100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: COLORS.text.secondary,
  },
});

export default AdvertisementBannerWeb;