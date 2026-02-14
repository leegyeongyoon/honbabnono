import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform } from 'react-native';
import { COLORS, SHADOWS } from '../../styles/colors';
import { Icon } from '../Icon';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface NavigationAdapter {
  navigate: (screen: string, params?: any) => void;
}

interface Advertisement {
  id: string;
  title: string;
  description: string;
  image_url?: string;
  link_url?: string;
  position: string;
  is_active: boolean;
}

interface UniversalAdvertisementBannerProps {
  navigation: NavigationAdapter;
  position: string;
  style?: any;
  onAdClick?: (ad: Advertisement) => void;
  onAdLoad?: (ads: Advertisement[]) => void;
}

const UniversalAdvertisementBanner: React.FC<UniversalAdvertisementBannerProps> = ({
  navigation,
  position,
  style,
  onAdClick,
  onAdLoad,
}) => {
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  const [loading, setLoading] = useState(false);

  // API base URL
  const getApiUrl = () => process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

  // Fetch advertisements
  const fetchAds = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('authToken');
      
      const response = await fetch(`${getApiUrl()}/advertisements?position=${position}`, {
        method: 'GET',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const activeAds = (data.ads || data.data || []).filter((ad: Advertisement) => ad.is_active);
        setAds(activeAds);
        
        if (onAdLoad) {
          onAdLoad(activeAds);
        }
      }
    } catch (error) {
      console.error('광고 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAds();
  }, [position]);

  // Auto rotate ads
  useEffect(() => {
    if (ads.length > 1) {
      const interval = setInterval(() => {
        setCurrentAdIndex(prev => (prev + 1) % ads.length);
      }, 5000); // Change ad every 5 seconds

      return () => clearInterval(interval);
    }
  }, [ads.length]);

  // Handle ad click
  const handleAdClick = (ad: Advertisement) => {
    if (onAdClick) {
      onAdClick(ad);
    }

    // Track ad click
    trackAdClick(ad);

    // Navigate if has link
    if (ad.link_url) {
      if (Platform.OS === 'web') {
        window.open(ad.link_url, '_blank');
      } else {
        // TODO: For native, use Linking.openURL or navigate to a WebView
      }
    }
  };

  // Track ad click for analytics
  const trackAdClick = async (ad: Advertisement) => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      
      await fetch(`${getApiUrl()}/advertisements/${ad.id}/click`, {
        method: 'POST',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      console.error('광고 클릭 추적 실패:', error);
    }
  };

  // Track ad impression
  const trackAdImpression = async (ad: Advertisement) => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      
      await fetch(`${getApiUrl()}/advertisements/${ad.id}/impression`, {
        method: 'POST',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      console.error('광고 노출 추적 실패:', error);
    }
  };

  // Track impression when ad loads
  useEffect(() => {
    const currentAd = ads[currentAdIndex];
    if (currentAd) {
      trackAdImpression(currentAd);
    }
  }, [currentAdIndex, ads]);

  // Don't render if no ads or loading
  if (loading || ads.length === 0) {
    return null;
  }

  const currentAd = ads[currentAdIndex];

  return (
    <TouchableOpacity
      style={[styles.container, style]}
      onPress={() => handleAdClick(currentAd)}
      activeOpacity={0.8}
    >
      <View style={styles.adContent}>
        {currentAd.image_url ? (
          <Image
            source={{ uri: currentAd.image_url }}
            style={styles.adImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.adPlaceholder}>
            <Icon name="image" size={24} color={COLORS.text.tertiary} />
          </View>
        )}
        
        <View style={styles.adText}>
          <Text style={styles.adTitle} numberOfLines={1}>
            {currentAd.title}
          </Text>
          <Text style={styles.adDescription} numberOfLines={2}>
            {currentAd.description}
          </Text>
        </View>

        <View style={styles.adIndicator}>
          <View style={styles.sponsorBadge}>
            <Text style={styles.sponsorText}>AD</Text>
          </View>
          <Icon name="external-link" size={16} color={COLORS.text.tertiary} />
        </View>
      </View>

      {/* Ad indicator dots */}
      {ads.length > 1 && (
        <View style={styles.dotsContainer}>
          {ads.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                index === currentAdIndex && styles.activeDot
              ]}
            />
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.neutral.white,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    overflow: 'hidden',
    ...SHADOWS.small,
  },
  adContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  adImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  adPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: COLORS.neutral.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  adText: {
    flex: 1,
    marginRight: 8,
  },
  adTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  adDescription: {
    fontSize: 12,
    color: COLORS.text.secondary,
    lineHeight: 16,
  },
  adIndicator: {
    alignItems: 'flex-end',
  },
  sponsorBadge: {
    backgroundColor: COLORS.neutral.grey300,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 8,
  },
  sponsorText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.text.white,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingBottom: 12,
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.neutral.grey300,
  },
  activeDot: {
    backgroundColor: COLORS.primary.main,
  },
});

export default UniversalAdvertisementBanner;