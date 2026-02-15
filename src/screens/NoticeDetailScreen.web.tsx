import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigate, useParams } from 'react-router-dom';
import { COLORS, SHADOWS, CARD_STYLE } from '../styles/colors';
import { Icon } from '../components/Icon';
import apiClient from '../services/apiClient';
import { FadeIn } from '../components/animated';

interface Notice {
  id: number;
  title: string;
  content: string;
  type: 'general' | 'important' | 'maintenance' | 'event';
  created_at: string;
  updated_at: string;
  is_pinned: boolean;
  views: number;
}

const NoticeDetailScreen: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [notice, setNotice] = useState<Notice | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchNotice = async () => {
    if (!id) {return;}
    
    try {
      setLoading(true);
      const response = await apiClient.get(`/notices/${id}`);
      setNotice(response.data.notice);
    } catch (error) {
      // silently handle error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotice();
  }, [id]);

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
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}.${month}.${day} ${hours}:${minutes}`;
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.loadingText}>공지사항을 불러오는 중...</Text>
      </View>
    );
  }

  if (!notice) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Icon name="alert-circle" size={48} color={COLORS.text.secondary} />
        <Text style={styles.errorTitle}>공지사항을 찾을 수 없습니다</Text>
        <TouchableOpacity 
          style={styles.backToListButton}
          onPress={() => navigate('/notices')}
        >
          <Text style={styles.backToListText}>공지사항 목록으로</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const typeStyle = getTypeStyle(notice.type);

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigate('/notices')}
        >
          <Icon name="arrow-left" size={24} color={COLORS.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>공지사항</Text>
        <TouchableOpacity
          style={styles.shareButton}
          onPress={() => {
            if (navigator.share) {
              navigator.share({
                title: notice.title,
                text: notice.content.replace(/<[^>]*>/g, ''),
                url: window.location.href,
              });
            } else {
              navigator.clipboard.writeText(window.location.href);
            }
          }}
        >
          <Icon name="share" size={20} color={COLORS.text.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <FadeIn>
        <View style={styles.noticeContainer}>
          {/* 공지사항 메타 정보 */}
          <View style={styles.noticeMeta}>
            <View style={styles.metaTop}>
              <View style={styles.metaLeft}>
                <View style={[styles.typeTag, { backgroundColor: typeStyle.backgroundColor }]}>
                  <Text style={styles.typeTagText}>{typeStyle.label}</Text>
                </View>
                {notice.is_pinned && (
                  <View style={styles.pinnedTag}>
                    <Icon name="pin" size={14} color={COLORS.functional.warning} />
                    <Text style={styles.pinnedText}>고정</Text>
                  </View>
                )}
              </View>
              <View style={styles.viewCount}>
                <Icon name="eye" size={14} color={COLORS.text.secondary} />
                <Text style={styles.viewCountText}>{notice.views || 0}</Text>
              </View>
            </View>
            
            <Text style={styles.noticeDate}>
              {formatDate(notice.created_at)}
              {notice.updated_at !== notice.created_at && (
                <Text style={styles.updatedText}> (수정됨)</Text>
              )}
            </Text>
          </View>

          {/* 제목 */}
          <Text style={styles.noticeTitle}>{notice.title}</Text>

          {/* 내용 */}
          <View style={styles.contentContainer}>
            <Text style={styles.noticeContent}>
              {notice.content.replace(/<[^>]*>/g, '')}
            </Text>
          </View>

          {/* 하단 액션 */}
          <View style={styles.bottomActions}>
            <TouchableOpacity 
              style={styles.listButton}
              onPress={() => navigate('/notices')}
            >
              <Icon name="list" size={16} color={COLORS.primary.main} />
              <Text style={styles.listButtonText}>목록으로</Text>
            </TouchableOpacity>
          </View>
        </View>
        </FadeIn>
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
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  shareButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  noticeContainer: {
    margin: 16,
    backgroundColor: COLORS.neutral.white,
    borderRadius: 16,
    padding: 24,
    ...CARD_STYLE,
    ...SHADOWS.small,
  },
  noticeMeta: {
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  metaTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  metaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typeTag: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
  },
  typeTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.text.white,
  },
  pinnedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.functional.warning + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pinnedText: {
    fontSize: 11,
    fontWeight: '500',
    color: COLORS.functional.warning,
  },
  viewCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewCountText: {
    fontSize: 12,
    color: COLORS.text.secondary,
  },
  noticeDate: {
    fontSize: 13,
    color: COLORS.text.tertiary,
  },
  updatedText: {
    fontSize: 12,
    color: COLORS.text.tertiary,
  },
  noticeTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text.primary,
    lineHeight: 30,
    marginBottom: 24,
  },
  contentContainer: {
    marginBottom: 32,
  },
  noticeContent: {
    fontSize: 15,
    color: COLORS.text.primary,
    lineHeight: 24,
  },
  bottomActions: {
    alignItems: 'center',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  listButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: COLORS.primary.light,
    borderRadius: 12,
  },
  listButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary.main,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginTop: 16,
    marginBottom: 24,
  },
  backToListButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: COLORS.primary.main,
    borderRadius: 12,
  },
  backToListText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.white,
  },
});

export default NoticeDetailScreen;