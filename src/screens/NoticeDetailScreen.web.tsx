import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigate, useParams } from 'react-router-dom';
import { COLORS, SHADOWS, CARD_STYLE, CSS_SHADOWS } from '../styles/colors';
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
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}.${month}.${day} ${hours}:${minutes}`;
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigate('/notices')}>
            <Icon name="arrow-left" size={24} color="#1A1714" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>공지사항</Text>
          <View style={{ width: 44 }} />
        </View>
        <View style={{ padding: 20, gap: 16 }}>
          <View className="animate-shimmer" style={{ gap: 12 }}>
            <View style={{ width: '40%', height: 12, borderRadius: 6, backgroundColor: '#EFECEA' }} />
            <View style={{ width: '90%', height: 20, borderRadius: 10, backgroundColor: '#EFECEA' }} />
            <View style={{ width: '60%', height: 12, borderRadius: 6, backgroundColor: '#EFECEA', marginBottom: 8 }} />
            <View style={{ width: '100%', height: 1, backgroundColor: '#EFECEA', marginVertical: 8 }} />
            <View style={{ width: '100%', height: 14, borderRadius: 7, backgroundColor: '#EFECEA' }} />
            <View style={{ width: '95%', height: 14, borderRadius: 7, backgroundColor: '#EFECEA' }} />
            <View style={{ width: '80%', height: 14, borderRadius: 7, backgroundColor: '#EFECEA' }} />
            <View style={{ width: '70%', height: 14, borderRadius: 7, backgroundColor: '#EFECEA' }} />
          </View>
        </View>
      </View>
    );
  }

  if (!notice) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Icon name="alert-circle" size={48} color="#5C4F42" />
        <Text style={styles.errorTitle}>공지사항을 찾을 수 없습니다</Text>
        <TouchableOpacity style={styles.backToListButton} onPress={() => navigate('/notices')}>
          <Text style={styles.backToListText}>공지사항 목록으로</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const typeStyle = getTypeStyle(notice.type);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigate('/notices')}>
          <Icon name="arrow-left" size={24} color="#1A1714" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>공지사항</Text>
        <TouchableOpacity style={styles.shareButton} onPress={() => {
          if (navigator.share) {
            navigator.share({ title: notice.title, text: notice.content.replace(/<[^>]*>/g, ''), url: window.location.href });
          } else {
            navigator.clipboard.writeText(window.location.href);
          }
        }}>
          <Icon name="share" size={20} color="#1A1714" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <FadeIn>
        <View style={styles.noticeContainer}>
          <View style={styles.noticeMeta}>
            <View style={styles.metaTop}>
              <View style={styles.metaLeft}>
                <View style={[styles.typeTag, { backgroundColor: typeStyle.backgroundColor }]}>
                  <Text style={styles.typeTagText}>{typeStyle.label}</Text>
                </View>
                {notice.is_pinned && (
                  <View style={styles.pinnedTag}>
                    <Icon name="pin" size={14} color="#C49A70" />
                    <Text style={styles.pinnedText}>고정</Text>
                  </View>
                )}
              </View>
              <View style={styles.viewCount}>
                <Icon name="eye" size={14} color="#5C4F42" />
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

          <Text style={styles.noticeTitle}>{notice.title}</Text>

          <View style={styles.contentContainer}>
            <Text style={styles.noticeContent}>{notice.content.replace(/<[^>]*>/g, '')}</Text>
          </View>

          <View style={styles.bottomActions}>
            <div
              onClick={() => navigate('/notices')}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.03)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(184,107,74,0.25)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(184,107,74,0.20)'; }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                paddingLeft: 24, paddingRight: 24, paddingTop: 12, paddingBottom: 12,
                background: 'linear-gradient(135deg, #9A7450 0%, #C49A70 100%)',
                borderRadius: 6, cursor: 'pointer', transition: 'all 200ms ease',
                boxShadow: '0 4px 12px rgba(184,107,74,0.20)',
              }}
            >
              <Icon name="list" size={16} color="#FFFFFF" />
              <span style={{ fontSize: 14, fontWeight: '600', color: '#FFFFFF' }}>목록으로</span>
            </div>
          </View>
        </View>
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
  shareButton: { padding: 4, cursor: 'pointer', transition: 'all 200ms ease', minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  content: { flex: 1 },
  noticeContainer: { margin: 16, backgroundColor: '#FFFFFF', borderRadius: 8, padding: 24, borderWidth: 1, borderColor: 'rgba(17,17,17,0.06)', shadowColor: '#111111', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  noticeMeta: { marginBottom: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(17,17,17,0.06)' },
  metaTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  metaLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  typeTag: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 4 },
  typeTagText: { fontSize: 11, fontWeight: '700', color: '#FFFFFF' },
  pinnedTag: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(224,146,110,0.08)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  pinnedText: { fontSize: 11, fontWeight: '500', color: '#C49A70' },
  viewCount: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  viewCountText: { fontSize: 12, color: '#5C4F42' },
  noticeDate: { fontSize: 13, color: '#8B7E72' },
  updatedText: { fontSize: 12, color: '#8B7E72' },
  noticeTitle: { fontSize: 20, fontWeight: '700', color: '#1A1714', lineHeight: 30, marginBottom: 24 },
  contentContainer: { marginBottom: 32 },
  noticeContent: { fontSize: 15, color: '#1A1714', lineHeight: 24 },
  bottomActions: { alignItems: 'center', paddingTop: 20, borderTopWidth: 1, borderTopColor: 'rgba(17,17,17,0.06)' },
  listButton: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: 'rgba(224,146,110,0.08)', borderRadius: 6 },
  listButtonText: { fontSize: 14, fontWeight: '600', color: '#C49A70' },
  errorTitle: { fontSize: 18, fontWeight: '600', color: '#1A1714', marginTop: 16, marginBottom: 24 },
  backToListButton: { paddingHorizontal: 24, paddingVertical: 12, backgroundColor: '#9A7450', borderRadius: 6, cursor: 'pointer', transition: 'all 200ms ease' },
  backToListText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
});

export default NoticeDetailScreen;
