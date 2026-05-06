import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { Heart } from 'lucide-react';
import restaurantApiService, { Restaurant } from '../services/restaurantApiService';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';

const WishlistScreen: React.FC = () => {
  const navigate = useNavigate();
  const [wishlist, setWishlist] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchWishlist = async () => {
    try {
      setLoading(true);
      setError(false);
      const list = await restaurantApiService.getFavorites();
      setWishlist(list);
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

  const removeFromWishlist = async (restaurantId: string) => {
    try {
      await restaurantApiService.toggleFavorite(restaurantId);
      setWishlist(prev => prev.filter(item => item.id !== restaurantId));
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
  const WishlistRow = ({ item }: { item: Restaurant }) => {
    const [hovered, setHovered] = useState(false);

    return (
      <div
        onClick={() => navigate(`/restaurant/${item.id}`)}
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
        }}
      >
        {/* Thumbnail */}
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.name || ''}
            style={{
              width: 70,
              height: 70,
              borderRadius: 16,
              objectFit: 'cover',
              flexShrink: 0,
              backgroundColor: '#F5F5F5',
            }}
          />
        ) : (
          <div style={{
            width: 70,
            height: 70,
            borderRadius: 16,
            backgroundColor: '#F5F5F5',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Icon name="utensils" size={24} color="#CCC" />
          </div>
        )}

        {/* Text area */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          flex: 1,
          minWidth: 0,
        }}>
          {/* Name */}
          <div style={{
            fontSize: 16,
            fontWeight: 600,
            color: '#121212',
            lineHeight: '22px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {item.name || ''}
          </div>
          {/* Category */}
          {item.category && (
            <div style={{
              fontSize: 14,
              fontWeight: 400,
              color: '#293038',
              lineHeight: '20px',
            }}>
              {item.category}
            </div>
          )}
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
            {item.address && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: '#878B94' }}>
                <Icon name="map-pin" size={13} color="#878B94" />
                <span style={{
                  maxWidth: 140,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {item.address}
                </span>
              </span>
            )}
            {item.avgRating != null && item.avgRating > 0 && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: '#FFA529' }}>
                <Icon name="star" size={13} color="#FFA529" />
                {item.avgRating.toFixed(1)}
              </span>
            )}
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
        <Icon name="arrow-left" size={20} color="#121212" />
      </div>
      <span style={{
        fontSize: 16,
        fontWeight: 600,
        color: '#121212',
      }}>
        찜한 매장
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
          title="찜한 매장을 불러올 수 없습니다"
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
            title="아직 찜한 매장이 없어요"
            description="마음에 드는 매장을 찜해보세요! 언제든지 다시 확인할 수 있어요."
            actionLabel="매장 찾아보기"
            onAction={() => navigate('/home')}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {wishlist.map((item) => (
              <WishlistRow key={item.id} item={item} />
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
