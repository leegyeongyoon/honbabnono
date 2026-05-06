import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icon';
import EmptyState from '../components/EmptyState';
import restaurantApiService, { Restaurant } from '../services/restaurantApiService';

const RecentViewsScreen: React.FC = () => {
  const navigate = useNavigate();
  const [recentViews, setRecentViews] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecentViews();
  }, []);

  const fetchRecentViews = async () => {
    try {
      setLoading(true);
      const list = await restaurantApiService.getRecentViews();
      setRecentViews(list);
    } catch (error) {
      setRecentViews([]);
    } finally {
      setLoading(false);
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

  // ---- Recent view item row ----
  const RecentViewRow = ({ item }: { item: Restaurant }) => {
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
        최근 본 매장
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

  return (
    <View style={styles.container}>
      {renderHeader()}

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {recentViews.length === 0 ? (
          <EmptyState
            icon="clock"
            title="아직 본 매장이 없어요"
            description="매장을 둘러보고 관심있는 곳을 확인해보세요! 최근 본 매장 내역이 여기에 표시됩니다."
            actionLabel="매장 둘러보기"
            onAction={() => navigate('/home')}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {recentViews.map((item) => (
              <RecentViewRow key={item.id} item={item} />
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

export default RecentViewsScreen;
