import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { COLORS, SHADOWS } from '../../styles/colors';
import { Icon } from '../Icon';
import userApiService from '../../services/userApiService';

// Platform-specific navigation adapter
interface NavigationAdapter {
  navigate: (screen: string, params?: any) => void;
  goBack: () => void;
  replace?: (screen: string, params?: any) => void;
}

interface UniversalNoticesScreenProps {
  navigation: NavigationAdapter;
  user?: any;
  onNoticePress?: (notice: Notice) => void;
  onNoticesLoad?: (notices: Notice[]) => void;
}

interface Notice {
  id: number;
  title: string;
  content: string;
  type: 'general' | 'important' | 'maintenance' | 'event';
  created_at: string;
  updated_at: string;
  is_pinned: boolean;
}

const UniversalNoticesScreen: React.FC<UniversalNoticesScreenProps> = ({
  navigation,
  user,
  onNoticePress,
  onNoticesLoad,
}) => {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch notices from backend
  const fetchNotices = useCallback(async () => {
    try {
      setError(null);

      const response = await userApiService.getNotices();

      const noticesData = response.data || response.notices || [];
      setNotices(noticesData);

      if (onNoticesLoad) {
        onNoticesLoad(noticesData);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : '공지사항을 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [onNoticesLoad]);

  // Handle refresh
  const handleRefresh = () => {
    setRefreshing(true);
    fetchNotices();
  };

  // Handle notice press
  const handleNoticePress = (notice: Notice) => {
    if (onNoticePress) {
      onNoticePress(notice);
    } else {
      navigation.navigate('NoticeDetail', { noticeId: notice.id });
    }
  };

  useEffect(() => {
    fetchNotices();
  }, [fetchNotices]);

  // Get notice type styling
  const getTypeStyle = (type: Notice['type']) => {
    switch (type) {
      case 'important':
        return { backgroundColor: COLORS.functional.error, label: '중요' };
      case 'maintenance':
        return { backgroundColor: COLORS.functional.warning, label: '점검' };
      case 'event':
        return { backgroundColor: COLORS.functional.success, label: '이벤트' };
      default:
        return { backgroundColor: COLORS.primary.main, label: '일반' };
    }
  };

  // Format date display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
  };

  // Render individual notice item
  const renderNoticeItem = (notice: Notice) => {
    const typeStyle = getTypeStyle(notice.type);

    return (
      <TouchableOpacity
        key={notice.id}
        style={[styles.noticeItem, notice.is_pinned && styles.pinnedNotice]}
        onPress={() => handleNoticePress(notice)}
        activeOpacity={0.7}
      >
        <View style={styles.noticeHeader}>
          <View style={styles.noticeInfo}>
            <View style={styles.noticeMeta}>
              <View style={[styles.typeTag, { backgroundColor: typeStyle.backgroundColor }]}>
                <Text style={styles.typeTagText}>{typeStyle.label}</Text>
              </View>
              {notice.is_pinned && (
                <Icon name="pin" size={14} color={COLORS.primary.accent} />
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
          <Icon name="chevron-right" size={16} color={COLORS.text.tertiary} />
        </View>
      </TouchableOpacity>
    );
  };

  // Loading state
  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={COLORS.primary.accent} />
        <Text style={styles.loadingText}>공지사항을 불러오는 중...</Text>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.placeholder} />
          <Text style={styles.headerTitle}>공지사항</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={[styles.centerContent, styles.errorContainer]}>
          <Icon name="alert-circle" size={48} color={COLORS.text.tertiary} />
          <Text style={styles.errorTitle}>오류가 발생했습니다</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={fetchNotices}
          >
            <Text style={styles.retryButtonText}>다시 시도</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.placeholder} />
        <Text style={styles.headerTitle}>공지사항</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[COLORS.primary.accent]}
            tintColor={COLORS.primary.accent}
          />
        }
      >
        {notices.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="bell-off" size={48} color={COLORS.text.tertiary} />
            <Text style={styles.emptyTitle}>등록된 공지사항이 없습니다</Text>
            <Text style={styles.emptySubtitle}>새로운 소식이 있으면 알려드릴게요!</Text>
          </View>
        ) : (
          <View style={styles.noticesList}>
            {/* Sort notices: pinned first, then by creation date */}
            {notices
              .sort((a, b) => {
                if (a.is_pinned && !b.is_pinned) {return -1;}
                if (!a.is_pinned && b.is_pinned) {return 1;}
                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
              })
              .map(renderNoticeItem)}

            <View style={styles.bottomSpacer} />
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
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 15,
    color: COLORS.text.secondary,
    marginTop: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: COLORS.neutral.white,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(17,17,17,0.06)',
    ...SHADOWS.sticky,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text.primary,
    letterSpacing: -0.3,
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
    borderRadius: 8,
    padding: 18,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(17,17,17,0.06)',
    ...SHADOWS.small,
  },
  pinnedNotice: {
    borderWidth: 1,
    borderColor: COLORS.primary.accent + '25',
    backgroundColor: COLORS.primary.accent + '04',
  },
  noticeHeader: {
    marginBottom: 10,
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
    paddingVertical: 3,
    borderRadius: 4,
  },
  typeTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.neutral.white,
    letterSpacing: 0.2,
  },
  noticeDate: {
    fontSize: 12,
    color: COLORS.text.tertiary,
  },
  noticeTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 6,
    lineHeight: 22,
    letterSpacing: -0.2,
  },
  pinnedTitle: {
    color: COLORS.primary.accent,
  },
  noticePreview: {
    fontSize: 14,
    color: COLORS.text.tertiary,
    lineHeight: 20,
    marginBottom: 10,
  },
  noticeActions: {
    alignItems: 'flex-end',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginTop: 16,
    marginBottom: 8,
    letterSpacing: -0.2,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Error state
  errorContainer: {
    paddingHorizontal: 40,
  },
  errorTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginTop: 16,
    marginBottom: 8,
    letterSpacing: -0.2,
  },
  errorMessage: {
    fontSize: 14,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: COLORS.primary.main,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 6,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.neutral.white,
  },
  bottomSpacer: {
    height: 20,
  },
});

export default UniversalNoticesScreen;
