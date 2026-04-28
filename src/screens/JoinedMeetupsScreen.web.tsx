import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../services/apiClient';
import { processImageUrl } from '../utils/imageUtils';

interface JoinedMeetup {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  category: string;
  max_participants: number;
  current_participants: number;
  image?: string;
  participation_status: string;
  joined_at: string;
  host_name: string;
  meetup_status: string;
  has_reviewed: boolean;
}

type TabType = 'applied' | 'created' | 'past';

const JoinedMeetupsScreen: React.FC = () => {
  const navigate = useNavigate();
  const [joinedMeetups, setJoinedMeetups] = useState<JoinedMeetup[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('applied');
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  useEffect(() => {
    const fetchJoinedMeetups = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get('/user/joined-meetups');
        setJoinedMeetups(response.data.meetups || []);
      } catch (error) {
        setJoinedMeetups([]);
      } finally {
        setLoading(false);
      }
    };

    fetchJoinedMeetups();
  }, []);

  const getStatusText = (status: string) => {
    switch (status) {
      case '참가승인': return '참여 완료';
      case '참가신청': return '신청 중';
      case '참가거절': return '신청 거절';
      case '참가취소': return '참여 취소';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case '참가승인': return '#22c55e';
      case '참가신청': return '#3b82f6';
      case '참가거절': return '#ef4444';
      case '참가취소': return '#878b94';
      default: return '#878b94';
    }
  };

  const getMeetupStatusText = (status: string) => {
    switch (status) {
      case 'active': return '모집 중';
      case 'full': return '모집 완료';
      case 'closed': return '마감';
      case 'completed': return '완료';
      case 'cancelled': return '취소됨';
      default: return status;
    }
  };

  const isUpcoming = (meetupStatus: string, date: string) => {
    const meetupDate = new Date(date);
    const now = new Date();
    return meetupDate > now && meetupStatus !== 'completed';
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return '방금 전';
    if (diffMin < 60) return `${diffMin}분 전`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour}시간 전`;
    const diffDay = Math.floor(diffHour / 24);
    return `${diffDay}일 전`;
  };

  const filteredMeetups = (joinedMeetups || []).filter(meetup => {
    let tabMatch = false;
    if (activeTab === 'applied') {
      tabMatch = isUpcoming(meetup.meetup_status, meetup.date) && meetup.participation_status === '참가신청';
    } else if (activeTab === 'created') {
      tabMatch = isUpcoming(meetup.meetup_status, meetup.date);
    } else {
      tabMatch = !isUpcoming(meetup.meetup_status, meetup.date) || meetup.meetup_status === 'completed';
    }

    if (!tabMatch) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      return (
        meetup.title.toLowerCase().includes(q) ||
        meetup.location.toLowerCase().includes(q) ||
        meetup.category.toLowerCase().includes(q)
      );
    }

    return true;
  });

  const handleReviewWrite = (meetupId: string) => {
    navigate(`/write-review/${meetupId}`);
  };

  const tabs: { key: TabType; label: string }[] = [
    { key: 'applied', label: '신청한 모임' },
    { key: 'created', label: '내가 만든 모임' },
    { key: 'past', label: '지난 모임' },
  ];

  const searchPlaceholders: Record<TabType, string> = {
    applied: '신청한 모임을 찾아봐요',
    created: '내가 만든 모임을 찾아봐요',
    past: '지난 모임을 찾아봐요',
  };

  const renderSkeleton = () => (
    <div style={styles.container}>
      <div style={styles.header}>
        <div
          style={styles.backButton}
          onClick={() => navigate('/mypage')}
        >
          <span style={{ fontSize: 20, color: '#121212' }}>&#8249;</span>
        </div>
        <span style={styles.headerTitle}>참가한 모임</span>
        <div style={{ width: 44 }} />
      </div>
      <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} style={{ display: 'flex', gap: 18, padding: '16px 0' }}>
            <div style={{
              width: 70, height: 70, borderRadius: 16,
              backgroundColor: '#f1f2f3', flexShrink: 0,
              animation: 'pulse 1.5s ease-in-out infinite',
            }} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ width: '60%', height: 16, borderRadius: 4, backgroundColor: '#f1f2f3' }} />
              <div style={{ width: '80%', height: 14, borderRadius: 4, backgroundColor: '#f1f2f3' }} />
              <div style={{ width: '50%', height: 14, borderRadius: 4, backgroundColor: '#f1f2f3' }} />
            </div>
          </div>
        ))}
      </div>
      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }`}</style>
    </div>
  );

  const renderMeetupItem = (meetup: JoinedMeetup) => {
    const imageUrl = processImageUrl(meetup.image || null, meetup.category);
    const isHovered = hoveredCard === meetup.id;

    return (
      <div
        key={meetup.id}
        style={{
          ...styles.cardItem,
          backgroundColor: isHovered ? '#f9fafb' : 'transparent',
        }}
        onClick={() => navigate(`/meetup/${meetup.id}`)}
        onMouseEnter={() => setHoveredCard(meetup.id)}
        onMouseLeave={() => setHoveredCard(null)}
      >
        <img
          src={imageUrl}
          alt={meetup.title}
          style={styles.thumbnail}
        />
        <div style={styles.cardContent}>
          <span style={styles.cardTitle}>{meetup.title}</span>
          <span style={styles.cardDescription}>
            {meetup.description || meetup.category}
          </span>
          <div style={styles.cardMeta}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#878b94" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <span style={styles.metaText}>{meetup.location}</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#878b94" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
            </svg>
            <span style={styles.metaText}>
              {meetup.current_participants}/{meetup.max_participants}명
            </span>
            <span style={styles.metaText}>
              {getTimeAgo(meetup.joined_at)} 대화
            </span>
          </div>
        </div>

        {activeTab === 'past' && !meetup.has_reviewed && (
          <div
            style={styles.reviewBtn}
            onClick={(e) => {
              e.stopPropagation();
              handleReviewWrite(meetup.id);
            }}
          >
            리뷰
          </div>
        )}
        {activeTab === 'past' && meetup.has_reviewed && (
          <div style={styles.reviewedBadge}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span style={{ fontSize: 12, color: '#22c55e', fontWeight: 600 }}>완료</span>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return renderSkeleton();
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div
          style={styles.backButton}
          onClick={() => navigate('/mypage')}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#121212" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </div>
        <span style={styles.headerTitle}>참가한 모임</span>
        <div style={{ width: 44 }} />
      </div>

      {/* 3-Tab bar */}
      <div style={styles.tabContainer}>
        {tabs.map((tab) => (
          <div
            key={tab.key}
            style={{
              ...styles.tab,
              borderBottomColor: activeTab === tab.key ? '#121212' : 'transparent',
            }}
            onClick={() => setActiveTab(tab.key)}
          >
            <span
              style={{
                fontSize: 15,
                fontWeight: activeTab === tab.key ? 600 : 400,
                color: activeTab === tab.key ? '#121212' : '#666666',
                lineHeight: '22px',
              }}
            >
              {tab.label}
            </span>
          </div>
        ))}
      </div>

      {/* Search bar */}
      <div style={styles.searchWrapper}>
        <div style={styles.searchInputContainer}>
          <input
            type="text"
            placeholder={searchPlaceholders[activeTab]}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={styles.searchInput}
          />
          <svg
            width="20" height="20" viewBox="0 0 24 24"
            fill="none" stroke="#878b94" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round"
            style={{ flexShrink: 0 }}
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>
      </div>

      {/* Card list */}
      <div style={styles.listContainer}>
        {filteredMeetups.length === 0 ? (
          <div style={styles.emptyState}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span style={{ fontSize: 16, fontWeight: 600, color: '#121212', marginTop: 16 }}>
              {activeTab === 'applied' ? '신청한 모임이 없어요' :
               activeTab === 'created' ? '만든 모임이 없어요' :
               '지난 모임이 없어요'}
            </span>
            <span style={{ fontSize: 14, color: '#878b94', marginTop: 8 }}>
              새로운 모임을 찾아 참여해보세요!
            </span>
            <div
              style={styles.exploreButton}
              onClick={() => navigate('/home')}
            >
              모임 찾아보기
            </div>
          </div>
        ) : (
          filteredMeetups.map(renderMeetupItem)
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
    backgroundColor: '#FFFFFF',
  },

  // Header
  header: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 56,
    paddingLeft: 4,
    paddingRight: 4,
    backgroundColor: '#FFFFFF',
    position: 'sticky' as const,
    top: 0,
    zIndex: 10,
  },
  backButton: {
    width: 44,
    height: 44,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: '#121212',
    position: 'absolute' as const,
    left: '50%',
    transform: 'translateX(-50%)',
  },

  // Tabs
  tabContainer: {
    display: 'flex',
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottom: '1px solid #f1f2f3',
  },
  tab: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 14,
    paddingBottom: 14,
    borderBottom: '2px solid transparent',
    cursor: 'pointer',
    transition: 'all 150ms ease',
  },

  // Search
  searchWrapper: {
    padding: '12px 20px',
  },
  searchInputContainer: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f2f3',
    borderRadius: 12,
    height: 44,
    paddingLeft: 16,
    paddingRight: 14,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    border: 'none',
    outline: 'none',
    backgroundColor: 'transparent',
    fontSize: 14,
    color: '#121212',
    lineHeight: '20px',
  },

  // Card list
  listContainer: {
    flex: 1,
    overflowY: 'auto' as const,
  },
  cardItem: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    padding: '16px 20px',
    gap: 18,
    cursor: 'pointer',
    transition: 'background-color 150ms ease',
  },
  thumbnail: {
    width: 70,
    height: 70,
    borderRadius: 16,
    objectFit: 'cover' as const,
    flexShrink: 0,
  },
  cardContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    minWidth: 0,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: '#121212',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  cardDescription: {
    fontSize: 14,
    color: '#293038',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  cardMeta: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  metaText: {
    fontSize: 14,
    color: '#878b94',
    marginRight: 6,
  },

  // Review
  reviewBtn: {
    fontSize: 13,
    fontWeight: 600,
    color: '#3b82f6',
    backgroundColor: '#eff6ff',
    padding: '6px 14px',
    borderRadius: 16,
    cursor: 'pointer',
    flexShrink: 0,
  },
  reviewedBadge: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
  },

  // Empty state
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingTop: 80,
    paddingBottom: 40,
    paddingLeft: 40,
    paddingRight: 40,
    textAlign: 'center' as const,
  },
  exploreButton: {
    marginTop: 24,
    backgroundColor: '#121212',
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 600,
    padding: '12px 28px',
    borderRadius: 12,
    cursor: 'pointer',
  },
};

export default JoinedMeetupsScreen;
