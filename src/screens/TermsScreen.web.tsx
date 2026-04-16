import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icon';
import apiClient from '../services/apiClient';

const FALLBACK_TERMS = `제1조 (목적)

본 약관은 잇테이블(이하 "회사")가 제공하는 모든 서비스의 이용과 관련하여 회사와 이용자의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.

제2조 (정의)
1. "서비스"란 회사가 제공하는 모든 온라인 및 모바일 서비스를 의미합니다.
2. "이용자"란 본 약관에 따라 회사가 제공하는 서비스를 이용하는 회원 및 비회원을 말합니다.
3. "회원"이란 회사에 개인정보를 제공하여 회원등록을 한 자로서, 지속적으로 서비스를 이용할 수 있는 자를 의미합니다.

제3조 (약관의 게시 및 변경)
1. 회사는 본 약관의 내용을 이용자가 쉽게 알 수 있도록 서비스 초기 화면에 게시합니다.
2. 회사는 관련 법령을 위반하지 않는 범위에서 본 약관을 개정할 수 있습니다.
3. 약관이 변경되는 경우, 회사는 적용일자 및 변경사유를 명시하여 사전에 공지합니다.`;

const TermsScreen: React.FC = () => {
  const navigate = useNavigate();
  const [termsContent, setTermsContent] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTerms = async () => {
      try {
        const response = await apiClient.get('/support/terms');
        const content = response.data?.content || response.data?.terms || '';
        if (typeof content === 'string' && content.length > 0) {
          setTermsContent(content);
        } else {
          setTermsContent(FALLBACK_TERMS);
        }
      } catch (error) {
        setTermsContent(FALLBACK_TERMS);
      } finally {
        setLoading(false);
      }
    };
    fetchTerms();
  }, []);

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
        <span style={styles.headerTitle}>이용약관</span>
      </div>

      {/* Content */}
      <div style={styles.scrollContainer}>
        {loading ? (
          <div style={styles.skeletonContainer}>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} style={{
                ...styles.skeletonLine,
                width: i % 3 === 0 ? '40%' : i % 3 === 1 ? '100%' : '85%',
                marginTop: i % 3 === 0 ? 20 : 8,
              }} />
            ))}
          </div>
        ) : (
          <div style={styles.contentArea}>
            <div style={styles.termsText}>{termsContent}</div>
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
  contentArea: {
    padding: 20,
  },
  termsText: {
    fontSize: 16,
    fontWeight: 400,
    color: '#5f5f5f',
    lineHeight: 1.5,
    whiteSpace: 'pre-line',
  },
  // Skeleton
  skeletonContainer: {
    padding: 20,
  },
  skeletonLine: {
    height: 16,
    borderRadius: 4,
    backgroundColor: '#f0f0f0',
  },
};

export default TermsScreen;
