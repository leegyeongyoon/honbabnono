import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icon';
import EmptyState from '../components/EmptyState';
import apiClient from '../services/apiClient';
import { processImageUrl } from '../utils/imageUtils';

interface RecentViewItem {
  id: string;
  viewed_at: string;
  meetup_id: string;
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

const RecentViewsScreen: React.FC = () => {
  const navigate = useNavigate();
  const [recentViews, setRecentViews] = useState<RecentViewItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecentViews();
  }, []);

  const fetchRecentViews = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/user/recent-views', {
        params: { page: 1, limit: 50 }
      });

      if (response.data && response.data.success) {
        setRecentViews(response.data.data || []);
      } else {
        setRecentViews([]);
      }
    } catch (error) {
      setRecentViews([]);
    } finally {
      setLoading(false);
    }
  };

  const removeFromRecentViews = async (viewId: string) => {
    try {
      const response = await apiClient.delete(`/user/recent-views/${viewId}`);

      if (response.data && response.data.success) {
        setRecentViews(prev => prev.filter(item => item.id !== viewId));
      }
    } catch (error) {
      // silently fail
    }
  };

  const clearAllRecentViews = async () => {
    try {
      const response = await apiClient.delete('/user/recent-views');

      if (response.data && response.data.success) {
        setRecentViews([]);
      }
    } catch (error) {
      // silently fail
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
      return `${diffInMinutes}분 전`;
    } else if (diffInHours < 24) {
      return `${diffInHours}시간 전`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      if (diffInDays < 7) {
        return `${diffInDays}일 전`;
      } else {
        return date.toLocaleDateString('ko-KR', {
          month: 'short',
          day: 'numeric'
        });
      }
    }
  };

  const formatMeetupDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (timeString: string) => {
    if (!timeString) return '';
    const [hours, minutes] = timeString.split(':');
    const time = new Date();
    time.setHours(parseInt(hours) || 0, parseInt(minutes) || 0);
    return time.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const getStatusText = (item: RecentViewItem) => {
    if (item.is_ended) {
      return '이미 종료된 약속';
    }
    switch (item.status) {
      case '모집중': return '모집 중';
      case '모집완료': return '모집 완료';
      case '진행중': return '진행 중';
      case '종료': return '종료됨';
      case '취소': return '취소됨';
      default: return item.status;
    }
  };

  const getStatusColor = (item: RecentViewItem) => {
    if (item.is_ended) {
      return '#878B94';
    }
    switch (item.status) {
      case '모집중': return '#6B7280';
      case '모집완료': return '#FFA529';
      case '진행중': return '#2E7D4F';
      case '종료': return '#878B94';
      case '취소': return '#D32F2F';
      default: return '#5F5F5F';
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
  const RecentViewRow = ({ item }: { item: RecentViewItem }) => {
    const [hovered, setHovered] = useState(false);
    const imageUrl = processImageUrl(item.image, item.category);
    const location = item.location || item.address || '';
    const description = item.description || item.category || '';

    return (
      <div
        onClick={() => navigate(`/meetup/${item.meetup_id}`)}
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
        최근 본 모임
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
            title="아직 본 글이 없어요"
            description="밥약속을 둘러보고 관심있는 약속을 확인해보세요! 최근 본 글 내역이 여기에 표시됩니다."
            actionLabel="약속 둘러보기"
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
