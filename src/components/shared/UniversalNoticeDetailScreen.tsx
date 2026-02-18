import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
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

interface UniversalNoticeDetailScreenProps {
  navigation: NavigationAdapter;
  noticeId: number | string;
  user?: any;
  onViewIncrement?: (noticeId: number) => void;
  // Platform specific components
  WebRenderer?: React.ComponentType<{ content: string }>;
  NativeRenderer?: React.ComponentType<{ content: string }>;
}

interface Notice {
  id: number;
  title: string;
  content: string;
  type: 'general' | 'important' | 'maintenance' | 'event';
  created_at: string;
  updated_at: string;
  is_pinned: boolean;
  views?: number;
}

const UniversalNoticeDetailScreen: React.FC<UniversalNoticeDetailScreenProps> = ({
  navigation,
  noticeId,
  user,
  onViewIncrement,
  WebRenderer,
  NativeRenderer,
}) => {
  const [notice, setNotice] = useState<Notice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch notice detail from backend
  const fetchNotice = useCallback(async () => {
    if (!noticeId) {
      setError('공지사항 ID가 없습니다');
      setLoading(false);
      return;
    }

    try {
      setError(null);
      setLoading(true);
      const response = await userApiService.getNoticeDetail(String(noticeId));

      const noticeData = response.data || response.notice || response;
      setNotice(noticeData);

      // Increment view count if callback provided
      if (onViewIncrement && noticeData.id) {
        onViewIncrement(noticeData.id);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : '공지사항을 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  }, [noticeId, onViewIncrement]);

  useEffect(() => {
    fetchNotice();
  }, [fetchNotice]);

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
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      return '오늘';
    } else if (diffDays === 2) {
      return '어제';
    } else if (diffDays <= 7) {
      return `${diffDays - 1}일 전`;
    } else {
      return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
    }
  };

  // Render content based on platform
  const renderContent = (content: string) => {
    if (WebRenderer) {
      return <WebRenderer content={content} />;
    } else if (NativeRenderer) {
      return <NativeRenderer content={content} />;
    } else {
      // Default simple renderer
      return (
        <Text style={styles.contentText}>
          {content.replace(/<[^>]*>/g, '')} {/* Strip HTML tags */}
        </Text>
      );
    }
  };

  // Loading state
  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.placeholder} />
          <Text style={styles.headerTitle}>공지사항</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={[styles.centerContent, styles.loadingContainer]}>
          <ActivityIndicator size="large" color={COLORS.primary.accent} />
          <Text style={styles.loadingText}>공지사항을 불러오는 중...</Text>
        </View>
      </View>
    );
  }

  // Error state
  if (error || !notice) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.placeholder} />
          <Text style={styles.headerTitle}>공지사항</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={[styles.centerContent, styles.errorContainer]}>
          <Icon name="alert-circle" size={48} color={COLORS.text.tertiary} />
          <Text style={styles.errorTitle}>공지사항을 찾을 수 없습니다</Text>
          <Text style={styles.errorMessage}>
            {error || '공지사항이 삭제되었거나 존재하지 않습니다'}
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={fetchNotice}
          >
            <Text style={styles.retryButtonText}>다시 시도</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const typeStyle = getTypeStyle(notice.type);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.placeholder} />
        <Text style={styles.headerTitle}>공지사항</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Notice Header */}
        <View style={[styles.noticeHeader, notice.is_pinned && styles.pinnedHeader]}>
          <View style={styles.noticeMeta}>
            <View style={[styles.typeTag, { backgroundColor: typeStyle.backgroundColor }]}>
              <Text style={styles.typeTagText}>{typeStyle.label}</Text>
            </View>
            {notice.is_pinned && (
              <View style={styles.pinnedTag}>
                <Icon name="pin" size={12} color={COLORS.primary.accent} />
                <Text style={styles.pinnedText}>고정됨</Text>
              </View>
            )}
          </View>

          <View style={styles.noticeInfo}>
            <Text style={styles.noticeDate}>{formatDate(notice.created_at)}</Text>
            {notice.views !== undefined && (
              <View style={styles.viewCount}>
                <Icon name="eye" size={14} color={COLORS.text.tertiary} />
                <Text style={styles.viewCountText}>조회 {notice.views.toLocaleString()}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Notice Title */}
        <View style={styles.titleContainer}>
          <Text style={[styles.title, notice.is_pinned && styles.pinnedTitle]}>
            {notice.title}
          </Text>
        </View>

        {/* Notice Content */}
        <View style={styles.contentContainer}>
          {renderContent(notice.content)}
        </View>

        {/* Updated Date */}
        {notice.updated_at !== notice.created_at && (
          <View style={styles.updateInfo}>
            <Text style={styles.updateText}>
              수정됨: {formatDate(notice.updated_at)}
            </Text>
          </View>
        )}

        {/* Related Actions */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Notices')}
          >
            <Icon name="list" size={18} color={COLORS.primary.accent} />
            <Text style={styles.actionButtonText}>전체 공지사항 보기</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomSpacer} />
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

  // Header
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

  // Loading state
  loadingContainer: {
    paddingHorizontal: 40,
  },
  loadingText: {
    fontSize: 15,
    color: COLORS.text.secondary,
    marginTop: 12,
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

  // Scroll Content
  scrollContent: {
    flex: 1,
  },

  // Notice Header
  noticeHeader: {
    backgroundColor: COLORS.neutral.white,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 18,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(17,17,17,0.06)',
  },
  pinnedHeader: {
    backgroundColor: COLORS.primary.accent + '04',
    borderWidth: 1,
    borderColor: COLORS.primary.accent + '20',
    borderBottomWidth: 1,
  },
  noticeMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
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
  pinnedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary.accent + '12',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    gap: 4,
  },
  pinnedText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.primary.accent,
    letterSpacing: 0.2,
  },
  noticeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  noticeDate: {
    fontSize: 13,
    color: COLORS.text.tertiary,
  },
  viewCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewCountText: {
    fontSize: 12,
    color: COLORS.text.tertiary,
  },

  // Title
  titleContainer: {
    backgroundColor: COLORS.neutral.white,
    marginHorizontal: 16,
    paddingHorizontal: 18,
    paddingBottom: 18,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text.primary,
    lineHeight: 30,
    letterSpacing: -0.3,
  },
  pinnedTitle: {
    color: COLORS.primary.accent,
  },

  // Content
  contentContainer: {
    backgroundColor: COLORS.neutral.white,
    marginHorizontal: 16,
    paddingHorizontal: 18,
    paddingVertical: 20,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    ...SHADOWS.small,
  },
  contentText: {
    fontSize: 15,
    color: COLORS.text.primary,
    lineHeight: 24,
  },

  // Update info
  updateInfo: {
    marginHorizontal: 16,
    marginTop: 8,
    paddingHorizontal: 18,
  },
  updateText: {
    fontSize: 12,
    color: COLORS.text.tertiary,
    fontStyle: 'italic',
  },

  // Actions
  actionsContainer: {
    marginHorizontal: 16,
    marginTop: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.neutral.white,
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(17,17,17,0.06)',
    ...SHADOWS.small,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary.accent,
  },

  bottomSpacer: {
    height: 40,
  },
});

export default UniversalNoticeDetailScreen;
