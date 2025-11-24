import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useNavigate } from 'react-router-dom';
import { COLORS, SHADOWS } from '../styles/colors';
import { Icon } from '../components/Icon';
import apiClient from '../services/apiClient';

interface WishlistItem {
  wishlist_id: string;
  added_at: string;
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  category: string;
  max_participants: number;
  current_participants: number;
  image?: string;
  status: string;
  host_name: string;
}

const WishlistScreen: React.FC = () => {
  const navigate = useNavigate();
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWishlist = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get('/user/wishlist');
        setWishlist(response.data.wishlist);
      } catch (error) {
        console.error('위시리스트 조회 실패:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchWishlist();
  }, []);

  const removeFromWishlist = async (meetupId: string) => {
    try {
      await apiClient.post(`/user/wishlist/${meetupId}`);
      setWishlist(prev => prev.filter(item => item.id !== meetupId));
    } catch (error) {
      console.error('위시리스트 제거 실패:', error);
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return '모집 중';
      case 'full': return '모집 완료';
      case 'closed': return '마감';
      case 'cancelled': return '취소됨';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return COLORS.secondary.main;
      case 'full': return COLORS.primary.main;
      case 'closed': return COLORS.text.secondary;
      case 'cancelled': return COLORS.text.error;
      default: return COLORS.text.secondary;
    }
  };

  const renderWishlistItem = (item: WishlistItem) => (
    <TouchableOpacity
      key={item.wishlist_id}
      style={styles.wishlistItem}
      onPress={() => navigate(`/meetup/${item.id}`)}
    >
      <View style={styles.profileImage}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>❤️</Text>
        </View>
      </View>

      <View style={styles.itemInfo}>
        <Text style={styles.itemTitle}>{item.title}</Text>
        <Text style={styles.itemCategory}>{item.category}</Text>
        <View style={styles.itemMeta}>
          <Text style={styles.metaText}>
            {item.location} • {item.current_participants}/{item.max_participants}명 • 
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {' '}{getStatusText(item.status)}
            </Text>
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.removeButton}
        onPress={(e) => {
          e.stopPropagation();
          removeFromWishlist(item.id);
        }}
      >
        <Icon name="heart" size={20} color={COLORS.text.error} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.loadingText}>위시리스트를 불러오는 중...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigate('/mypage')}
        >
          <Icon name="arrow-left" size={24} color={COLORS.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>위시리스트</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        {wishlist.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="heart" size={48} color={COLORS.text.secondary} />
            <Text style={styles.emptyTitle}>위시리스트가 비어있습니다</Text>
            <Text style={styles.emptyDescription}>
              관심있는 모임을 위시리스트에 추가해보세요!
            </Text>
            <TouchableOpacity
              style={styles.exploreButton}
              onPress={() => navigate('/home')}
            >
              <Text style={styles.exploreButtonText}>모임 찾아보기</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.wishlistList}>
            <Text style={styles.sectionTitle}>저장한 모임 ({wishlist.length}개)</Text>
            {wishlist.map(renderWishlistItem)}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.neutral.background,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.text.secondary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: COLORS.neutral.white,
    ...SHADOWS.small,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  placeholder: {
    width: 32,
  },
  content: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 100,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  exploreButton: {
    backgroundColor: COLORS.primary.main,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  exploreButtonText: {
    color: COLORS.text.white,
    fontSize: 16,
    fontWeight: '600',
  },
  wishlistList: {
    backgroundColor: COLORS.neutral.white,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text.primary,
    padding: 20,
    paddingBottom: 0,
  },
  wishlistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.grey200,
  },
  profileImage: {
    marginRight: 16,
  },
  avatarCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFE0B2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 20,
  },
  itemInfo: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  itemCategory: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginBottom: 4,
  },
  itemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 12,
    color: COLORS.text.secondary,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  removeButton: {
    padding: 4,
  },
});

export default WishlistScreen;