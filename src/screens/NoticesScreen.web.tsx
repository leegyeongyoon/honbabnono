import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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

  const fetchNotices = async () => {
    try {
      const response = await apiClient.get('/notices');
      setNotices(response.data.notices || []);
    } catch (error) {
      // silently handle error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotices();
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const yy = String(date.getFullYear()).slice(2);
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yy}.${mm}.${dd}`;
  };

  const renderSkeletons = () => (
    <div style={styles.listContainer}>
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} style={styles.skeletonItem}>
          <div style={styles.skeletonTitle} />
          <div style={styles.skeletonDate} />
        </div>
      ))}
    </div>
  );

  const renderEmpty = () => (
    <div style={styles.emptyState}>
      <Icon name="bell" size={48} color="#b7bbbf" />
      <div style={styles.emptyTitle}>등록된 공지사항이 없습니다</div>
      <div style={styles.emptyDescription}>새로운 소식이 있으면 알려드릴게요!</div>
    </div>
  );

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <button
          onClick={() => navigate(-1)}
          style={styles.headerBackButton}
        >
          <Icon name="chevron-left" size={24} color="#121212" />
        </button>
        <span style={styles.headerTitle}>공지사항</span>
      </div>

      {/* Content */}
      <div style={styles.scrollContainer}>
        {loading ? renderSkeletons() : notices.length === 0 ? renderEmpty() : (
          <div style={styles.listContainer}>
            {notices.map((notice) => (
              <button
                key={notice.id}
                onClick={() => navigate(`/notices/${notice.id}`)}
                style={styles.noticeItem}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#fafafa'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                <div style={styles.noticeTitle}>{notice.title}</div>
                <div style={styles.noticeDate}>{formatDate(notice.created_at)}</div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    backgroundColor: '#ffffff',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    backgroundColor: '#fff',
    position: 'relative',
    borderBottom: '1px solid #f1f2f3',
    flexShrink: 0,
  },
  headerBackButton: {
    position: 'absolute',
    left: 20,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 600,
    color: '#121212',
    letterSpacing: -0.3,
  },
  scrollContainer: {
    flex: 1,
    overflowY: 'auto',
  },
  listContainer: {
    display: 'flex',
    flexDirection: 'column',
  },
  noticeItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 6,
    padding: 20,
    borderBottom: '1px solid #efefef',
    background: 'none',
    border: 'none',
    borderBottomStyle: 'solid',
    borderBottomWidth: 1,
    borderBottomColor: '#efefef',
    cursor: 'pointer',
    textAlign: 'left',
    width: '100%',
    transition: 'background-color 150ms ease',
  },
  noticeTitle: {
    fontSize: 16,
    fontWeight: 500,
    color: '#121212',
    lineHeight: 1.4,
  },
  noticeDate: {
    fontSize: 14,
    fontWeight: 400,
    color: '#4e637b',
  },
  // Skeleton
  skeletonItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    padding: 20,
    borderBottom: '1px solid #efefef',
  },
  skeletonTitle: {
    width: '70%',
    height: 16,
    borderRadius: 4,
    backgroundColor: '#f0f0f0',
  },
  skeletonDate: {
    width: '25%',
    height: 14,
    borderRadius: 4,
    backgroundColor: '#f0f0f0',
  },
  // Empty state
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 120,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 600,
    color: '#121212',
    marginTop: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: '#5f5f5f',
  },
};

export default NoticesScreen;
