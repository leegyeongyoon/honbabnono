import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useNavigate } from 'react-router-dom';
import { COLORS, SHADOWS, CARD_STYLE } from '../styles/colors';
import { Icon } from '../components/Icon';
import apiClient from '../services/apiClient';
import EmptyState from '../components/EmptyState';
import { FadeIn } from '../components/animated';

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
      // silently handle error
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
        return { backgroundColor: '#D32F2F', label: '중요' };
      case 'maintenance':
        return { backgroundColor: '#C4883C', label: '점검' };
      case 'event':
        return { backgroundColor: '#2E7D4F', label: '이벤트' };
      default:
        return { backgroundColor: '#9A7450', label: '일반' };
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
  };

  const renderNoticeItem = (notice: Notice) => {
    const typeStyle = getTypeStyle(notice.type);

    return (
      <div
        key={notice.id}
        onClick={() => navigate(`/notices/${notice.id}`)}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 4px 16px rgba(17,17,17,0.10)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '';
        }}
        style={{
          cursor: 'pointer',
          transition: 'all 200ms ease',
          marginBottom: 12,
        }}
      >
        <View style={[styles.noticeItem, notice.is_pinned && styles.pinnedNotice]}>
          <View style={styles.noticeHeader}>
            <View style={styles.noticeInfo}>
              <View style={styles.noticeMeta}>
                <View style={[styles.typeTag, { backgroundColor: typeStyle.backgroundColor }]}>
                  <Text style={styles.typeTagText}>{typeStyle.label}</Text>
                </View>
                {notice.is_pinned && (
                  <Icon name="pin" size={16} color="#C49A70" />
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
            <Icon name="chevron-right" size={16} color="#5C4F42" />
          </View>
        </View>
      </div>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigate('/mypage')}>
            <Icon name="arrow-left" size={24} color="#1A1714" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>공지사항</Text>
          <View style={{ width: 44 }} />
        </View>
        <View style={{ padding: 20, gap: 12 }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <View key={i} className="animate-shimmer" style={{ padding: 16, backgroundColor: '#FAFAF8', borderRadius: 8, gap: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ width: 48, height: 20, borderRadius: 4, backgroundColor: '#EFECEA' }} />
                <View style={{ width: 80, height: 12, borderRadius: 6, backgroundColor: '#EFECEA' }} />
              </View>
              <View style={{ width: '80%', height: 14, borderRadius: 7, backgroundColor: '#EFECEA' }} />
              <View style={{ width: '50%', height: 10, borderRadius: 5, backgroundColor: '#EFECEA' }} />
            </View>
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigate('/mypage')}
        >
          <Icon name="arrow-left" size={24} color="#1A1714" />
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
        <FadeIn>
        {notices.length === 0 ? (
          <EmptyState
            icon="bell-off"
            title="등록된 공지사항이 없습니다"
            description="새로운 소식이 있으면 알려드릴게요!"
          />
        ) : (
          <View style={styles.noticesList}>
            {notices.map(renderNoticeItem)}
          </View>
        )}
        </FadeIn>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EFECEA' },
  centerContent: { justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 16, color: '#5C4F42' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: 'rgba(17,17,17,0.06)', shadowColor: '#111111', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3, zIndex: 10 },
  backButton: { padding: 10, minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 200ms ease' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#1A1714' },
  placeholder: { width: 32 },
  content: { flex: 1 },
  noticesList: { padding: 16 },
  noticeItem: { backgroundColor: '#FFFFFF', borderRadius: 8, padding: 20, borderWidth: 1, borderColor: 'rgba(17,17,17,0.06)', shadowColor: '#111111', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  pinnedNotice: { borderWidth: 1.5, borderColor: 'rgba(224,146,110,0.20)', backgroundColor: '#FAFAF8' },
  noticeHeader: { marginBottom: 12 },
  noticeInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  noticeMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  typeTag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4 },
  typeTagText: { fontSize: 11, fontWeight: '700', color: '#FFFFFF' },
  noticeDate: { fontSize: 13, color: '#8B7E72' },
  noticeTitle: { fontSize: 16, fontWeight: '600', color: '#1A1714', marginBottom: 8, lineHeight: 22 },
  pinnedTitle: { color: '#C49A70' },
  noticePreview: { fontSize: 14, color: '#5C4F42', lineHeight: 20, marginBottom: 8 },
  noticeActions: { alignItems: 'flex-end' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 80 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#1A1714', marginTop: 16, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#5C4F42', textAlign: 'center' },
});

export default NoticesScreen;
