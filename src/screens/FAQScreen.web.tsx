import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icon';
import apiClient from '../services/apiClient';

interface FAQItem {
  question: string;
  answer: string;
}

const FALLBACK_FAQ: FAQItem[] = [
  {
    question: '모임에 이상한 사람이 있으면 어떡하나요?',
    answer: '모임 내에서 불편한 상황이 발생하면 신고 기능을 이용해주세요. 신고된 사용자는 관리자가 검토 후 적절한 조치를 취합니다.',
  },
  {
    question: '심사 기준이 어떻게 되나요?',
    answer: '밥알 점수, 참여 이력, 리뷰 등을 종합적으로 고려하여 모임 참가 여부가 결정됩니다.',
  },
  {
    question: '모임 삭제는 어떻게 하나요?',
    answer: '내가 만든 모임은 모임 상세 페이지에서 삭제할 수 있습니다. 참가자가 있는 경우 사전 공지 후 삭제해주세요.',
  },
];

const FAQScreen: React.FC = () => {
  const navigate = useNavigate();
  const [faqItems, setFaqItems] = useState<FAQItem[]>([]);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFAQ = async () => {
      try {
        const response = await apiClient.get('/support/faq');
        const items = response.data?.faqs || response.data?.items || response.data || [];
        if (Array.isArray(items) && items.length > 0) {
          setFaqItems(items);
        } else {
          setFaqItems(FALLBACK_FAQ);
        }
      } catch (error) {
        setFaqItems(FALLBACK_FAQ);
      } finally {
        setLoading(false);
      }
    };
    fetchFAQ();
  }, []);

  const handleToggle = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  const renderSkeletons = () => (
    <div style={styles.listContainer}>
      {[0, 1, 2].map((i) => (
        <div key={i} style={styles.skeletonItem}>
          <div style={styles.skeletonQ} />
          <div style={styles.skeletonText} />
        </div>
      ))}
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
        <span style={styles.headerTitle}>자주 묻는 질문</span>
      </div>

      {/* Content */}
      <div style={styles.scrollContainer}>
        {loading ? renderSkeletons() : (
          <div style={styles.listContainer}>
            {faqItems.map((item, index) => {
              const isExpanded = expandedIndex === index;
              return (
                <div key={index} style={styles.faqItem}>
                  <button
                    onClick={() => handleToggle(index)}
                    style={styles.faqQuestionButton}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#fafafa'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                  >
                    <div style={styles.faqQuestionRow}>
                      <span style={styles.faqQIcon}>Q</span>
                      <span style={{
                        ...styles.faqQuestionText,
                        color: isExpanded ? '#fd784f' : '#181818',
                      }}>
                        {item.question}
                      </span>
                    </div>
                    <Icon
                      name={isExpanded ? 'chevron-up' : 'chevron-down'}
                      size={20}
                      color={isExpanded ? '#fd784f' : '#b7bbbf'}
                    />
                  </button>
                  {isExpanded && (
                    <div style={styles.faqAnswerContainer}>
                      <div style={styles.faqAnswerText}>{item.answer}</div>
                    </div>
                  )}
                </div>
              );
            })}
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
  faqItem: {
    borderBottom: '1px solid #efefef',
  },
  faqQuestionButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    padding: '20px 20px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'background-color 150ms ease',
    gap: 12,
  },
  faqQuestionRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
    flex: 1,
  },
  faqQIcon: {
    fontSize: 18,
    fontWeight: 500,
    color: '#fc6536',
    flexShrink: 0,
    lineHeight: '1.4',
  },
  faqQuestionText: {
    fontSize: 18,
    fontWeight: 500,
    color: '#181818',
    lineHeight: 1.4,
  },
  faqAnswerContainer: {
    backgroundColor: '#f5f5f5',
    padding: 20,
    marginLeft: 20,
    marginRight: 20,
    marginBottom: 16,
    borderRadius: 8,
  },
  faqAnswerText: {
    fontSize: 16,
    fontWeight: 400,
    color: '#5f5f5f',
    lineHeight: 1.6,
  },
  // Skeletons
  skeletonItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: 20,
    borderBottom: '1px solid #efefef',
  },
  skeletonQ: {
    width: 20,
    height: 20,
    borderRadius: 4,
    backgroundColor: '#f0f0f0',
    flexShrink: 0,
  },
  skeletonText: {
    width: '75%',
    height: 18,
    borderRadius: 4,
    backgroundColor: '#f0f0f0',
  },
};

export default FAQScreen;
