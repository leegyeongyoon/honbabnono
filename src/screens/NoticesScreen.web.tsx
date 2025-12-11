import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useNavigate } from 'react-router-dom';
import { COLORS, SHADOWS } from '../styles/colors';
import { Icon } from '../components/Icon';
import apiClient from '../services/apiClient';

interface Notice {
  id: number;
  title: string;
  content: string;
  type: 'general' | 'important' | 'maintenance' | 'event';
  created_at: string;
  updated_at: string;
  is_pinned: boolean;
}

const NoticesScreen: React.FC = () => {
  const navigate = useNavigate();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotices = async () => {
    try {
      const response = await apiClient.get('/notices');
      setNotices(response.data.notices || []);
    } catch (error) {
      console.error('공지사항 로드 실패:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNotices();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchNotices();
  };

  const getTypeStyle = (type: Notice['type']) => {
    switch (type) {
      case 'important':
        return { backgroundColor: COLORS.functional.error, label: '중요' };
      case 'maintenance':
        return { backgroundColor: '#FF9800', label: '점검' };
      case 'event':
        return { backgroundColor: COLORS.functional.success, label: '이벤트' };
      default:
        return { backgroundColor: COLORS.primary.main, label: '일반' };
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
  };

  const renderNoticeItem = (notice: Notice) => {
    const typeStyle = getTypeStyle(notice.type);
    
    return (
      <TouchableOpacity 
        key={notice.id} 
        style={[styles.noticeItem, notice.is_pinned && styles.pinnedNotice]}
        onPress={() => navigate(`/notices/${notice.id}`)}
      >
        <View style={styles.noticeHeader}>
          <View style={styles.noticeInfo}>
            <View style={styles.noticeMeta}>
              <View style={[styles.typeTag, { backgroundColor: typeStyle.backgroundColor }]}>
                <Text style={styles.typeTagText}>{typeStyle.label}</Text>
              </View>
              {notice.is_pinned && (
                <Icon name="pin" size={16} color={COLORS.functional.warning} />
              )}
              <Text style={styles.noticeDate}>{formatDate(notice.created_at)}</Text>
            </View>
          </View>
        </View>
        
        <Text style={[styles.noticeTitle, notice.is_pinned && styles.pinnedTitle]}>
          {notice.title}
        </Text>
        
        <Text style={styles.noticePreview} numberOfLines={2}>
          {notice.content.replace(/<[^>]*>/g, '').substring(0, 100)}...
        </Text>
        
        <View style={styles.noticeActions}>
          <Icon name="chevron-right" size={16} color={COLORS.text.secondary} />
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.loadingText}>공지사항을 불러오는 중...</Text>
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
        <Text style={styles.headerTitle}>공지사항</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {notices.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="bell-off" size={48} color={COLORS.text.secondary} />
            <Text style={styles.emptyTitle}>등록된 공지사항이 없습니다</Text>
            <Text style={styles.emptySubtitle}>새로운 소식이 있으면 알려드릴게요!</Text>
          </View>
        ) : (
          <View style={styles.noticesList}>
            {notices.map(renderNoticeItem)}
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
  noticesList: {
    padding: 16,
  },
  noticeItem: {
    backgroundColor: COLORS.neutral.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    ...SHADOWS.small,
  },
  pinnedNotice: {
    borderWidth: 2,
    borderColor: COLORS.functional.warning + '30',
    backgroundColor: COLORS.functional.warning + '08',
  },
  noticeHeader: {
    marginBottom: 12,
  },
  noticeInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  noticeMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typeTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typeTagText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text.white,
  },
  noticeDate: {
    fontSize: 12,
    color: COLORS.text.secondary,
  },
  noticeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 8,
    lineHeight: 22,
  },
  pinnedTitle: {
    color: COLORS.functional.warning,
  },
  noticePreview: {
    fontSize: 14,
    color: COLORS.text.secondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  noticeActions: {
    alignItems: 'flex-end',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
});

export default NoticesScreen;