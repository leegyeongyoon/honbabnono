import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert, SafeAreaView, Linking } from 'react-native';
import { useParams } from 'react-router-dom';
import { COLORS, SHADOWS } from '../styles/colors';
import { Icon } from '../components/Icon';
import advertisementApiService, { Advertisement } from '../services/advertisementApiService';

interface AdvertisementDetailScreenProps {
  navigation: any;
  user?: any;
}

const AdvertisementDetailScreen: React.FC<AdvertisementDetailScreenProps> = ({
  navigation,
  user
}) => {
  const { id } = useParams<{ id: string }>();
  const advertisementId = parseInt(id || '0');
  const [advertisement, setAdvertisement] = useState<Advertisement | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAdvertisementDetail();
  }, [advertisementId]);

  const loadAdvertisementDetail = async () => {
    try {
      setLoading(true);
      const detail = await advertisementApiService.getAdvertisementDetail(advertisementId);
      setAdvertisement(detail);
    } catch (error) {
      console.error('광고 디테일 로딩 실패:', error);
      Alert.alert('오류', '광고 정보를 불러오는데 실패했습니다.');
      window.history.back();
    } finally {
      setLoading(false);
    }
  };

  const handleExternalLinkPress = () => {
    if (advertisement?.linkUrl) {
      Linking.openURL(advertisement.linkUrl);
    }
  };

  const renderContent = () => {
    if (!advertisement?.detailContent) {
      return (
        <Text style={styles.noContent}>
          상세 내용이 없습니다.
        </Text>
      );
    }

    // HTML 태그 제거 후 표시 (간단한 구현)
    const plainText = advertisement.detailContent
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"');

    return (
      <Text style={styles.content}>
        {plainText}
      </Text>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation.goBack()}
          >
            <Icon name="chevron-left" size={24} color={COLORS.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>광고</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>로딩 중...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!advertisement) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation.goBack()}
          >
            <Icon name="chevron-left" size={24} color={COLORS.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>광고</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>광고 정보를 찾을 수 없습니다.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const imageUrl = advertisement.imageUrl?.startsWith('http') 
    ? advertisement.imageUrl 
    : `${process.env.REACT_APP_API_URL || 'http://localhost:3001'}${advertisement.imageUrl}`;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
        >
          <Icon name="chevron-left" size={24} color={COLORS.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>광고</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView}>
        {/* 광고 이미지 */}
        {advertisement.imageUrl && (
          <Image
            source={{ uri: imageUrl }}
            style={styles.image}
            resizeMode="cover"
          />
        )}

        {/* 광고 내용 */}
        <View style={styles.contentContainer}>
          <Text style={styles.title}>{advertisement.title}</Text>
          
          {advertisement.description && (
            <Text style={styles.description}>{advertisement.description}</Text>
          )}

          {/* 사업체 정보 */}
          {(advertisement.businessName || advertisement.contactInfo) && (
            <View style={styles.businessInfo}>
              <Text style={styles.businessInfoTitle}>사업체 정보</Text>
              
              {advertisement.businessName && (
                <View style={styles.infoRow}>
                  <Icon name="building" size={16} color={COLORS.text.secondary} />
                  <Text style={styles.infoText}>{advertisement.businessName}</Text>
                </View>
              )}
              
              {advertisement.contactInfo && (
                <View style={styles.infoRow}>
                  <Icon name="phone" size={16} color={COLORS.text.secondary} />
                  <Text style={styles.infoText}>{advertisement.contactInfo}</Text>
                </View>
              )}
            </View>
          )}

          {/* 상세 내용 */}
          {advertisement.detailContent && (
            <View style={styles.detailSection}>
              <Text style={styles.sectionTitle}>상세 내용</Text>
              {renderContent()}
            </View>
          )}

          {/* 외부 링크가 있는 경우 */}
          {advertisement.linkUrl && !advertisement.useDetailPage && (
            <TouchableOpacity 
              style={styles.externalLinkButton}
              onPress={handleExternalLinkPress}
            >
              <Icon name="external-link" size={20} color={COLORS.neutral.white} />
              <Text style={styles.externalLinkText}>웹사이트 방문</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.neutral.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.neutral.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.gray200,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  image: {
    width: '100%',
    height: 200,
  },
  contentContainer: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: COLORS.text.secondary,
    lineHeight: 24,
    marginBottom: 24,
  },
  businessInfo: {
    backgroundColor: COLORS.neutral.gray50,
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  businessInfoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: COLORS.text.primary,
    marginLeft: 8,
  },
  detailSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 16,
  },
  content: {
    fontSize: 16,
    color: COLORS.text.primary,
    lineHeight: 24,
  },
  noContent: {
    fontSize: 14,
    color: COLORS.text.secondary,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 20,
  },
  externalLinkButton: {
    backgroundColor: COLORS.primary.main,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 20,
    ...SHADOWS.medium,
  },
  externalLinkText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.neutral.white,
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.text.secondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
});

export default AdvertisementDetailScreen;