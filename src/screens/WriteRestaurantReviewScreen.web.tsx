import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigate, useParams } from 'react-router-dom';
import { COLORS, CSS_SHADOWS, CARD_STYLE } from '../styles/colors';
import { BORDER_RADIUS, SPACING } from '../styles/spacing';
import { Icon } from '../components/Icon';
import apiClient from '../services/apiClient';

// ============================================================
// WriteRestaurantReviewScreen — 잇테이블 v2 매장 리뷰 작성
// 3축 평가: 맛 / 서비스 / 분위기
// ============================================================

interface ReservationInfo {
  id: string;
  restaurant_id: string;
  restaurant_name: string;
  restaurant_image?: string;
  reserved_date: string;
  party_size: number;
}

const RATING_AXES = [
  { key: 'taste_rating' as const, label: '맛', icon: 'restaurant' },
  { key: 'service_rating' as const, label: '서비스', icon: 'person' },
  { key: 'ambiance_rating' as const, label: '분위기', icon: 'star' },
];

const WriteRestaurantReviewScreen: React.FC = () => {
  const navigate = useNavigate();
  const { reservationId } = useParams<{ reservationId: string }>();

  const [reservation, setReservation] = useState<ReservationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [tasteRating, setTasteRating] = useState(0);
  const [serviceRating, setServiceRating] = useState(0);
  const [ambianceRating, setAmbianceRating] = useState(0);
  const [content, setContent] = useState('');

  const ratings = { taste_rating: tasteRating, service_rating: serviceRating, ambiance_rating: ambianceRating };
  const setters = {
    taste_rating: setTasteRating,
    service_rating: setServiceRating,
    ambiance_rating: setAmbianceRating,
  };

  useEffect(() => {
    if (!reservationId) return;
    loadReservation();
  }, [reservationId]);

  const loadReservation = async () => {
    try {
      const res = await apiClient.get(`/reservations/${reservationId}`);
      const data = res.data?.reservation || res.data?.data || res.data;
      setReservation(data);
    } catch {
      // error
    } finally {
      setLoading(false);
    }
  };

  const isValid = tasteRating > 0 && serviceRating > 0 && ambianceRating > 0 && content.trim().length >= 10;

  const handleSubmit = async () => {
    if (!isValid || !reservation || submitting) return;
    setSubmitting(true);
    try {
      await apiClient.post('/reviews/restaurant', {
        reservation_id: reservationId,
        restaurant_id: reservation.restaurant_id,
        taste_rating: tasteRating,
        service_rating: serviceRating,
        ambiance_rating: ambianceRating,
        content: content.trim(),
      });
      alert('리뷰가 등록되었습니다');
      navigate(-1);
    } catch (err: any) {
      const msg = err?.response?.data?.error || '리뷰 등록에 실패했습니다';
      alert(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Star Row ──
  const renderStars = (value: number, onChange: (v: number) => void) => (
    <div style={{ display: 'flex', gap: 4 }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          onClick={() => onChange(star)}
          style={{
            cursor: 'pointer',
            fontSize: 28,
            color: star <= value ? COLORS.primary.main : COLORS.neutral.grey200,
            transition: 'color 0.15s',
          }}
        >
          ★
        </span>
      ))}
    </div>
  );

  // ── Loading / Error ──
  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <ActivityIndicator size="large" color={COLORS.primary.main} />
        </div>
      </div>
    );
  }

  if (!reservation) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <p style={{ textAlign: 'center' as const, color: COLORS.text.secondary }}>예약 정보를 찾을 수 없습니다.</p>
        </div>
      </div>
    );
  }

  const overallAvg = tasteRating && serviceRating && ambianceRating
    ? ((tasteRating + serviceRating + ambianceRating) / 3).toFixed(1)
    : '—';

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <span onClick={() => navigate(-1)} style={{ cursor: 'pointer', fontSize: 20 }}>
          <Icon name="arrow-left" size={22} color={COLORS.text.primary} />
        </span>
        <span style={styles.headerTitle}>리뷰 작성</span>
        <span style={{ width: 22 }} />
      </div>

      {/* Restaurant Info Card */}
      <div style={styles.card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {reservation.restaurant_image && (
            <img
              src={reservation.restaurant_image}
              alt=""
              style={{ width: 56, height: 56, borderRadius: 10, objectFit: 'cover' as const }}
            />
          )}
          <div>
            <p style={styles.restaurantName}>{reservation.restaurant_name || '매장'}</p>
            <p style={styles.metaText}>
              {reservation.reserved_date} · {reservation.party_size}명
            </p>
          </div>
        </div>
      </div>

      {/* Rating Axes */}
      <div style={styles.card}>
        <p style={styles.sectionTitle}>별점 평가</p>
        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 16 }}>
          {RATING_AXES.map((axis) => (
            <div key={axis.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 80 }}>
                <Icon name={axis.icon as any} size={18} color={COLORS.primary.main} />
                <span style={styles.axisLabel}>{axis.label}</span>
              </div>
              {renderStars(ratings[axis.key], setters[axis.key])}
            </div>
          ))}
        </div>

        {/* Overall */}
        <div style={styles.overallRow}>
          <span style={styles.overallLabel}>종합</span>
          <span style={styles.overallValue}>{overallAvg}</span>
        </div>
      </div>

      {/* Text Review */}
      <div style={styles.card}>
        <p style={styles.sectionTitle}>리뷰 작성</p>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="음식, 서비스, 분위기 등 방문 경험을 자유롭게 공유해주세요. (최소 10자)"
          rows={5}
          maxLength={1000}
          style={styles.textarea}
        />
        <p style={styles.charCount}>{content.length} / 1000</p>
      </div>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={!isValid || submitting}
        style={{
          ...styles.submitButton,
          opacity: !isValid || submitting ? 0.5 : 1,
          cursor: !isValid || submitting ? 'not-allowed' : 'pointer',
        }}
      >
        {submitting ? '등록 중...' : '리뷰 등록'}
      </button>
    </div>
  );
};

// ── Styles ──
const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: 480,
    margin: '0 auto',
    padding: '0 16px 32px',
    minHeight: '100vh',
    background: COLORS.neutral.background,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 56,
    position: 'sticky' as const,
    top: 0,
    background: COLORS.neutral.white,
    zIndex: 10,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: 600,
    color: COLORS.text.primary,
  },
  card: {
    background: COLORS.neutral.white,
    borderRadius: 12,
    padding: 20,
    marginTop: 12,
    boxShadow: CSS_SHADOWS?.card || '0 1px 4px rgba(0,0,0,0.06)',
    border: `1px solid ${COLORS.neutral.grey100}`,
  },
  restaurantName: {
    fontSize: 16,
    fontWeight: 600,
    color: COLORS.text.primary,
    margin: 0,
  },
  metaText: {
    fontSize: 13,
    color: COLORS.text.tertiary,
    margin: '4px 0 0',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 600,
    color: COLORS.text.primary,
    margin: '0 0 14px',
  },
  axisLabel: {
    fontSize: 14,
    fontWeight: 500,
    color: COLORS.text.secondary,
  },
  overallRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 14,
    borderTop: `1px solid ${COLORS.neutral.grey100}`,
  },
  overallLabel: {
    fontSize: 14,
    fontWeight: 600,
    color: COLORS.text.primary,
  },
  overallValue: {
    fontSize: 22,
    fontWeight: 700,
    color: COLORS.primary.main,
  },
  textarea: {
    width: '100%',
    minHeight: 120,
    padding: 14,
    fontSize: 14,
    lineHeight: 1.6,
    border: `1px solid ${COLORS.neutral.grey200}`,
    borderRadius: 10,
    resize: 'vertical' as const,
    fontFamily: 'inherit',
    outline: 'none',
    boxSizing: 'border-box' as const,
  },
  charCount: {
    textAlign: 'right' as const,
    fontSize: 12,
    color: COLORS.text.tertiary,
    margin: '6px 0 0',
  },
  submitButton: {
    width: '100%',
    padding: '14px 0',
    marginTop: 16,
    background: `linear-gradient(135deg, ${COLORS.primary.main} 0%, ${COLORS.primary.gradient} 100%)`,
    color: '#fff',
    fontSize: 16,
    fontWeight: 600,
    border: 'none',
    borderRadius: 12,
    transition: 'opacity 0.2s',
  },
};

export default WriteRestaurantReviewScreen;
