import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { Heart } from 'lucide-react';
import apiClient from '../services/apiClient';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import { processImageUrl } from '../utils/imageUtils';

interface WishlistItem {
  wishlist_id: string;
  wishlisted_at: string;
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  address: string;
  category: string;
  max_participants: number;
  current_participants: number;
  deposit_amount: number;
  image?: string;
  status: string;
  host_name: string;
  host_profile_image?: string;
  is_ended: boolean;
  created_at: string;
}

const WishlistScreen: React.FC = () => {
  const navigate = useNavigate();
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchWishlist = async () => {
    try {
      setLoading(true);
      setError(false);
      const response = await apiClient.get('/user/wishlists', {
        params: { page: 1, limit: 50 }
      });

      if (response.data && response.data.success) {
        setWishlist(response.data.data || []);
      } else {
        setWishlist([]);
      }
    } catch (err) {
      setWishlist([]);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWishlist();
  }, []);

  const removeFromWishlist = async (meetupId: string) => {
    try {
      const response = await apiClient.delete(`/meetups/${meetupId}/wishlist`);

      if (response.data && response.data.success) {
        setWishlist(prev => prev.filter(item => item.id !== meetupId));
      }
    } catch (error) {
      // silently fail
    }
  };

  // ---- Skeleton list item ----
  const SkeletonListItem = () => (
    <div style={{
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 18,
      padding: '16px 20px',
    }}>
      <div style={{
        width: 70,
        height: 70,
        borderRadius: 16,
        backgroundColor: '#F5F5F5',
        flexShrink: 0,
        animation: 'pulse 1.5s ease-in-out infinite',
      }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
        <div style={{ width: '60%', height: 16, borderRadius: 4, backgroundColor: '#F5F5F5' }} />
        <div style={{ width: '80%', height: 14, borderRadius: 4, backgroundColor: '#F5F5F5' }} />
        <div style={{ width: '50%', height: 14, borderRadius: 4, backgroundColor: '#F5F5F5' }} />
      </div>
    </div>
  );

  // ---- Wishlist item row ----
  const WishlistRow = ({ item }: { item: WishlistItem }) => {
    const [hovered, setHovered] = useState(false);
    const imageUrl = processImageUrl(item.image, item.category);
    const location = item.location || item.address || '';
    const description = item.description || item.category || '';

    return (
      <div
        onClick={() => navigate(`/meetup/${item.id}`)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 18,
          padding: '16px 20px',
          cursor: 'pointer',
          backgroundColor: hovered ? '#FAFAFA' : '#FFFFFF',
          transition: 'background-color 150ms ease',
          opacity: item.is_ended ? 0.5 : 1,
        }}
      >
        {/* Thumbnail */}
        <img
          src={imageUrl}
          alt={item.title || ''}
          style={{
            width: 70,
            height: 70,
            borderRadius: 16,
            objectFit: 'cover',
            flexShrink: 0,
            backgroundColor: '#F5F5F5',
          }}
        />

        {/* Text area */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          flex: 1,
          minWidth: 0,
        }}>
          {/* Title */}
          <div style={{
            fontSize: 16,
            fontWeight: 600,
            color: '#121212',
            lineHeight: '22px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {item.title || ''}
          </div>
          {/* Description */}
          <div style={{
            fontSize: 14,
            fontWeight: 400,
            color: '#293038',
            lineHeight: '20px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {description}
          </div>
          {/* Meta row */}
          <div style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            fontSize: 14,
            fontWeight: 400,
            lineHeight: '20px',
          }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: '#878B94' }}>
              <Icon name="map-pin" size={13} color="#878B94" />
              <span style={{
                maxWidth: 100,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {location}
              </span>
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: '#878B94' }}>
              <Icon name="users" size={13} color="#878B94" />
              {item.current_participants ?? 0}/{item.max_participants ?? 4}명
            </span>
          </div>
        </div>

        {/* Heart remove button */}
        <div
          onClick={(e) => {
            e.stopPropagation();
            removeFromWishlist(item.id);
          }}
          style={{
            flexShrink: 0,
            padding: 8,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Heart
            size={18}
            color="#FF4D6A"
            fill="#FF4D6A"
          />
        </div>
      </div>
    );
  };

  // ---- Header ----
  const renderHeader = () => (
    <div style={{
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      height: 56,
      backgroundColor: '#FFFFFF',
      position: 'sticky' as any,
      top: 0,
      zIndex: 10,
      borderBottom: '1px solid rgba(17,17,17,0.06)',
    }}>
      <div
        onClick={() => navigate(-1)}
        style={{
          position: 'absolute',
          left: 12,
          width: 44,
          height: 44,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
        }}
      >
        <span style={{
          fontSize: 22,
          fontWeight: 300,
          color: '#121212',
          lineHeight: '22px',
        }}>
          &lt;
        </span>
      </div>
      <span style={{
        fontSize: 16,
        fontWeight: 600,
        color: '#121212',
      }}>
        찜 모임
      </span>
    </div>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        {renderHeader()}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <SkeletonListItem />
          <SkeletonListItem />
          <SkeletonListItem />
          <SkeletonListItem />
        </div>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        {renderHeader()}
        <ErrorState
          title="위시리스트를 불러올 수 없습니다"
          description="네트워크 상태를 확인하고 다시 시도해주세요"
          onRetry={fetchWishlist}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderHeader()}

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {wishlist.length === 0 ? (
          <EmptyState
            variant="no-data"
            icon="heart"
            title="아직 찜한 약속이 없어요"
            description="마음에 드는 밥약속을 찜해보세요! 언제든지 다시 확인할 수 있어요."
            actionLabel="약속 찾아보기"
            onAction={() => navigate('/home')}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {wishlist.map((item) => (
              <WishlistRow key={item.wishlist_id} item={item} />
            ))}
          </div>
        )}

        {/* Bottom spacing for bottom nav */}
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
});

export default WishlistScreen;
