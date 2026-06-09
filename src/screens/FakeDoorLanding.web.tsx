import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '../components/Icon';
import { COLORS, CSS_SHADOWS, CARD_STYLE } from '../styles/colors';
import { BORDER_RADIUS, SPACING } from '../styles/spacing';
import {
  FAKE_STORES,
  DEFAULT_STORE_REF,
  variantLabel,
  type FakeMenu,
} from '../constants/fakeStores';
import { track, submitLead } from '../services/landingApiService';

// ============================================================
// FakeDoorLanding — 가짜문(Fake Door) 검증 랜딩 (공개, 로그인 불필요)
//
// 목적: 가상 매장의 "선결제 예약" 퍼널을 돌려 단계별 이탈률 + 베타 전환율 측정.
// "결제하기"는 실결제가 아니라 베타 알림 신청(연락처 수집)으로 정직하게 게이트.
//
// 퍼널: landing_view → menu_view → add_to_cart → reservation_intent
//        → payment_click → lead_submit
// ============================================================

// URL ?store=hanwoo-gangnam 로 매장 선택 (없거나 잘못되면 DEFAULT_STORE_REF)
const resolveStoreRef = (): string => {
  try {
    const ref = new URLSearchParams(window.location.search).get('store');
    if (ref && FAKE_STORES[ref]) return ref;
  } catch {
    /* ignore */
  }
  return DEFAULT_STORE_REF;
};

// URL ?src=threads 로 유입 채널 식별 (채널별 전환율 측정용)
const resolveSrc = (): string => {
  try {
    return (new URLSearchParams(window.location.search).get('src') || 'direct').slice(0, 40);
  } catch {
    return 'direct';
  }
};

const TIME_OPTIONS = [
  '11:30', '12:00', '12:30', '13:00',
  '17:30', '18:00', '18:30', '19:00', '19:30', '20:00',
];

const formatPrice = (n: number) => n.toLocaleString('ko-KR');

const FakeDoorLanding: React.FC = () => {
  const storeRef = useMemo(resolveStoreRef, []);
  const src = useMemo(resolveSrc, []);
  const store = FAKE_STORES[storeRef];
  const { variant, depositAmount } = store;

  // ── 퍼널 상태 ──
  const [selectedMenus, setSelectedMenus] = useState<Record<string, boolean>>({});
  const [showReservation, setShowReservation] = useState(false);
  const [showBetaModal, setShowBetaModal] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // 예약 정보
  const today = new Date();
  const minDate = today.toISOString().split('T')[0];
  const maxDate = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];
  const [resDate, setResDate] = useState('');
  const [partySize, setPartySize] = useState(2);
  const [resTime, setResTime] = useState('');

  // 베타 신청
  const [contactType, setContactType] = useState<'email' | 'phone'>('email');
  const [contact, setContact] = useState('');
  const [leadError, setLeadError] = useState('');

  // ── 중복 track 가드 ──
  const landingTracked = useRef(false);
  const menuTracked = useRef(false);
  const reservationTracked = useRef(false);
  const menuSectionRef = useRef<HTMLDivElement | null>(null);

  // 마운트 시 landing_view (1회)
  useEffect(() => {
    if (landingTracked.current) return;
    landingTracked.current = true;
    track('landing_view', { restaurantRef: storeRef, variant, metadata: { src } });
  }, [storeRef, variant, src]);

  // 메뉴 섹션 노출 시 menu_view (IntersectionObserver, 1회) — fallback으로 마운트 후에도 보장
  useEffect(() => {
    const fireMenuView = () => {
      if (menuTracked.current) return;
      menuTracked.current = true;
      track('menu_view', { restaurantRef: storeRef, variant });
    };
    const el = menuSectionRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      // 옵저버 미지원 환경: 마운트 직후 1회 기록
      fireMenuView();
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          fireMenuView();
          observer.disconnect();
        }
      },
      { threshold: 0.25 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [storeRef, variant]);

  // ── 핸들러 ──
  const toggleMenu = (menu: FakeMenu) => {
    setSelectedMenus((prev) => {
      const next = { ...prev, [menu.name]: !prev[menu.name] };
      // 새로 담는 동작일 때만 add_to_cart
      if (!prev[menu.name]) {
        track('add_to_cart', {
          restaurantRef: storeRef,
          variant,
          metadata: { menu: menu.name, price: menu.price },
        });
      }
      return next;
    });
  };

  const selectedList = store.menus.filter((m) => selectedMenus[m.name]);
  const hasMenu = selectedList.length > 0;
  const menuTotal = selectedList.reduce((sum, m) => sum + m.price, 0);

  const handleReserveCta = () => {
    if (!hasMenu) return;
    setShowReservation(true);
    if (!reservationTracked.current) {
      reservationTracked.current = true;
      track('reservation_intent', { restaurantRef: storeRef, variant });
    }
    // 예약 섹션으로 스크롤
    requestAnimationFrame(() => {
      document
        .getElementById('reservation-section')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const canPay = hasMenu && !!resDate && !!resTime && partySize > 0;

  const handlePayClick = () => {
    if (!canPay) return;
    track('payment_click', {
      restaurantRef: storeRef,
      variant,
      metadata: {
        menus: selectedList.map((m) => m.name),
        menuTotal,
        date: resDate,
        time: resTime,
        partySize,
      },
    });
    setShowBetaModal(true);
  };

  const validContact = (): boolean => {
    const v = contact.trim();
    if (!v) return false;
    if (contactType === 'email') return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
    return /^[0-9+\-\s]{8,}$/.test(v);
  };

  const handleSubmitLead = async () => {
    setLeadError('');
    if (!validContact()) {
      setLeadError(
        contactType === 'email'
          ? '올바른 이메일 주소를 입력해주세요.'
          : '올바른 전화번호를 입력해주세요.',
      );
      return;
    }
    setSubmitting(true);
    try {
      await submitLead({
        contact: contact.trim(),
        contactType,
        restaurantRef: storeRef,
        variant,
        note: JSON.stringify({
          menus: selectedList.map((m) => m.name),
          menuTotal,
          date: resDate,
          time: resTime,
          partySize,
        }),
      });
      track('lead_submit', { restaurantRef: storeRef, variant, metadata: { contactType } });
      setSubmitted(true);
    } catch {
      setLeadError('신청 중 문제가 발생했어요. 잠시 후 다시 시도해주세요.');
    } finally {
      setSubmitting(false);
    }
  };

  const closeModal = () => {
    if (submitting) return;
    setShowBetaModal(false);
    setLeadError('');
  };

  // ============================================================
  // Render
  // ============================================================
  return (
    <div style={s.wrapper}>
      <div style={s.container}>
        {/* ── 히어로 ── */}
        <div style={s.hero}>
          <img src={store.heroImage} alt={store.name} style={s.heroImage} />
          <div style={s.heroOverlay} />
          <div style={s.heroContent}>
            <span style={s.variantBadge}>{variantLabel(variant, depositAmount)}</span>
            <div style={s.heroName}>{store.name}</div>
            <div style={s.heroMeta}>
              <span style={s.heroCategory}>{store.category}</span>
              <span style={s.metaDot}>·</span>
              <span style={s.heroMetaItem}>
                <Icon name="map-pin" size={13} color="#FFFFFF" /> {store.area}
              </span>
              <span style={s.metaDot}>·</span>
              <span style={s.heroMetaItem}>
                <Icon name="star" size={13} color={COLORS.primary.gradient} />{' '}
                {store.rating.toFixed(1)}
                <span style={s.reviewCount}>({store.reviewCount})</span>
              </span>
            </div>
          </div>
        </div>

        {/* ── 가치 카피 ── */}
        <div style={s.valueSection}>
          <div style={s.valueBadge}>
            <Icon name="zap" size={15} color={COLORS.primary.main} />
            <span>웨이팅 제로</span>
          </div>
          <div style={s.valueHeadline}>도착하면 바로 식사 시작</div>
          <div style={s.valueSub}>{store.tagline}</div>
        </div>

        {/* ── 메뉴 섹션 ── */}
        <div style={s.section} ref={menuSectionRef}>
          <div style={s.sectionTitle}>메뉴 선주문</div>
          <div style={s.sectionHint}>
            드실 메뉴를 미리 담아두면 도착 시간에 맞춰 조리를 시작해요.
          </div>
          <div style={s.menuList}>
            {store.menus.map((menu) => {
              const picked = !!selectedMenus[menu.name];
              return (
                <div
                  key={menu.name}
                  style={{
                    ...s.menuCard,
                    borderColor: picked ? COLORS.primary.main : CARD_STYLE.borderColor,
                    boxShadow: picked ? CSS_SHADOWS.focused : CSS_SHADOWS.card,
                  }}
                >
                  {menu.image && (
                    <img src={menu.image} alt={menu.name} style={s.menuImage} />
                  )}
                  <div style={s.menuBody}>
                    <div style={s.menuName}>{menu.name}</div>
                    <div style={s.menuDesc}>{menu.description}</div>
                    <div style={s.menuBottomRow}>
                      <span style={s.menuPrice}>{formatPrice(menu.price)}원</span>
                      <button
                        type="button"
                        onClick={() => toggleMenu(menu)}
                        style={{
                          ...s.addButton,
                          ...(picked ? s.addButtonActive : {}),
                        }}
                      >
                        {picked ? (
                          <>
                            <Icon name="check" size={14} color="#FFFFFF" /> 담음
                          </>
                        ) : (
                          '담기'
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── 선결제 예약 CTA ── */}
        <div style={s.ctaSection}>
          <button
            type="button"
            onClick={handleReserveCta}
            disabled={!hasMenu}
            style={{
              ...s.primaryCta,
              opacity: hasMenu ? 1 : 0.45,
              cursor: hasMenu ? 'pointer' : 'not-allowed',
            }}
          >
            {hasMenu
              ? `선결제 예약하기 · ${formatPrice(menuTotal)}원`
              : '메뉴를 먼저 담아주세요'}
          </button>
        </div>

        {/* ── 예약 정보 섹션 (CTA 후 노출) ── */}
        {showReservation && (
          <div id="reservation-section" style={s.section}>
            <div style={s.sectionTitle}>예약 정보</div>

            {/* 날짜 */}
            <div style={s.field}>
              <div style={s.fieldLabel}>
                <Icon name="calendar" size={15} color={COLORS.text.secondary} /> 날짜
              </div>
              <input
                type="date"
                value={resDate}
                min={minDate}
                max={maxDate}
                onChange={(e) => setResDate(e.target.value)}
                style={s.dateInput}
              />
            </div>

            {/* 인원 */}
            <div style={s.field}>
              <div style={s.fieldLabel}>
                <Icon name="users" size={15} color={COLORS.text.secondary} /> 인원
              </div>
              <div style={s.partyRow}>
                <button
                  type="button"
                  onClick={() => setPartySize((p) => Math.max(1, p - 1))}
                  disabled={partySize <= 1}
                  style={{ ...s.pmButton, opacity: partySize <= 1 ? 0.3 : 1 }}
                >
                  −
                </button>
                <span style={s.partyText}>{partySize}명</span>
                <button
                  type="button"
                  onClick={() => setPartySize((p) => Math.min(12, p + 1))}
                  disabled={partySize >= 12}
                  style={{ ...s.pmButton, opacity: partySize >= 12 ? 0.3 : 1 }}
                >
                  +
                </button>
              </div>
            </div>

            {/* 시간 */}
            <div style={s.field}>
              <div style={s.fieldLabel}>
                <Icon name="clock" size={15} color={COLORS.text.secondary} /> 시간
              </div>
              <select
                value={resTime}
                onChange={(e) => setResTime(e.target.value)}
                style={s.select}
              >
                <option value="">시간 선택</option>
                {TIME_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            {/* 결제 요약 */}
            <div style={s.paysummary}>
              <div style={s.payRow}>
                <span>선택 메뉴 ({selectedList.length})</span>
                <span>{formatPrice(menuTotal)}원</span>
              </div>
              <div style={s.payTotalRow}>
                <span>
                  {variant === 'deposit' ? '지금 결제 (예약금)' : '지금 결제'}
                </span>
                <span style={s.payTotalAmount}>
                  {variant === 'deposit'
                    ? `${formatPrice(depositAmount ?? 30000)}원`
                    : `${formatPrice(menuTotal)}원`}
                </span>
              </div>
            </div>

            {/* 결제하기 */}
            <button
              type="button"
              onClick={handlePayClick}
              disabled={!canPay}
              style={{
                ...s.payButton,
                opacity: canPay ? 1 : 0.45,
                cursor: canPay ? 'pointer' : 'not-allowed',
              }}
            >
              결제하기
            </button>
            <div style={s.payNote}>예약 시간에 맞춰 조리·상차림이 준비됩니다.</div>
          </div>
        )}

        <div style={{ height: 48 }} />
      </div>

      {/* ── 베타 알림 모달 ── */}
      {showBetaModal && (
        <div style={s.modalOverlay} onClick={closeModal}>
          <div style={s.modalSheet} onClick={(e) => e.stopPropagation()}>
            {!submitted ? (
              <>
                <button type="button" onClick={closeModal} style={s.modalClose}>
                  <Icon name="x" size={20} color={COLORS.text.secondary} />
                </button>
                <div style={s.modalEmoji}>🔔</div>
                <div style={s.modalTitle}>정식 출시 준비 중이에요</div>
                <div style={s.modalDesc}>
                  출시되면 가장 먼저 알려드릴게요. 연락처를 남겨주시면
                  오픈 소식과 얼리버드 혜택을 보내드립니다.
                </div>

                {/* 정직성 고지 */}
                <div style={s.honestBox}>
                  <Icon name="info" size={15} color={COLORS.functional.info} />
                  <span>
                    실제 결제는 진행되지 않습니다. 베타 알림 신청만 접수됩니다.
                  </span>
                </div>

                {/* 연락처 타입 토글 */}
                <div style={s.toggleRow}>
                  <button
                    type="button"
                    onClick={() => {
                      setContactType('email');
                      setLeadError('');
                    }}
                    style={{
                      ...s.toggleBtn,
                      ...(contactType === 'email' ? s.toggleBtnActive : {}),
                    }}
                  >
                    <Icon
                      name="mail"
                      size={15}
                      color={contactType === 'email' ? '#FFFFFF' : COLORS.text.secondary}
                    />{' '}
                    이메일
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setContactType('phone');
                      setLeadError('');
                    }}
                    style={{
                      ...s.toggleBtn,
                      ...(contactType === 'phone' ? s.toggleBtnActive : {}),
                    }}
                  >
                    <Icon
                      name="phone"
                      size={15}
                      color={contactType === 'phone' ? '#FFFFFF' : COLORS.text.secondary}
                    />{' '}
                    전화번호
                  </button>
                </div>

                <input
                  type={contactType === 'email' ? 'email' : 'tel'}
                  inputMode={contactType === 'email' ? 'email' : 'tel'}
                  placeholder={
                    contactType === 'email' ? 'you@example.com' : '010-1234-5678'
                  }
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  style={s.contactInput}
                  autoFocus
                />
                {leadError ? <div style={s.errorText}>{leadError}</div> : null}

                <button
                  type="button"
                  onClick={handleSubmitLead}
                  disabled={submitting}
                  style={{
                    ...s.modalSubmit,
                    opacity: submitting ? 0.6 : 1,
                    cursor: submitting ? 'default' : 'pointer',
                  }}
                >
                  {submitting ? '신청 중...' : '출시 알림 신청하기'}
                </button>
                <div style={s.modalFinePrint}>
                  입력하신 연락처는 출시 알림 발송 목적으로만 사용됩니다.
                </div>
              </>
            ) : (
              <div style={s.thankYou}>
                <div style={s.thankYouIcon}>
                  <Icon name="check-circle" size={56} color={COLORS.functional.success} />
                </div>
                <div style={s.thankYouTitle}>신청 완료!</div>
                <div style={s.thankYouDesc}>
                  출시되면 가장 먼저 알림 드릴게요.
                  <br />
                  관심 가져주셔서 감사합니다.
                </div>
                <button type="button" onClick={() => setShowBetaModal(false)} style={s.thankYouBtn}>
                  닫기
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================
// Styles — 순수 스타일 객체 (모바일 우선, maxWidth 480 중앙 정렬)
// ============================================================

const FONT = '"Pretendard Variable", Pretendard, system-ui, -apple-system, sans-serif';

const s: Record<string, React.CSSProperties> = {
  wrapper: { minHeight: '100vh', backgroundColor: COLORS.neutral.background, fontFamily: FONT },
  container: { maxWidth: 480, margin: '0 auto', backgroundColor: COLORS.neutral.background },

  // 히어로
  hero: { position: 'relative', width: '100%', height: 320, overflow: 'hidden' },
  heroImage: { width: '100%', height: '100%', objectFit: 'cover' as const, display: 'block' },
  heroOverlay: {
    position: 'absolute', inset: 0,
    background: 'linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.05) 40%, rgba(0,0,0,0.75) 100%)',
  },
  heroContent: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    padding: '0 20px 20px', color: '#FFFFFF',
    display: 'flex', flexDirection: 'column' as const, gap: 8,
  },
  variantBadge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.primary.main, color: '#FFFFFF',
    fontSize: 12, fontWeight: 700, padding: '5px 12px',
    borderRadius: BORDER_RADIUS.pill, boxShadow: CSS_SHADOWS.cta,
  },
  heroName: { fontSize: 26, fontWeight: 800, letterSpacing: -0.5, lineHeight: '1.2' },
  heroMeta: {
    display: 'flex', alignItems: 'center', flexWrap: 'wrap' as const, gap: 6,
    fontSize: 13, fontWeight: 500,
  },
  heroCategory: { fontWeight: 600 },
  heroMetaItem: { display: 'inline-flex', alignItems: 'center', gap: 3 },
  reviewCount: { opacity: 0.85, marginLeft: 2 },
  metaDot: { opacity: 0.6 },

  // 가치 카피
  valueSection: {
    padding: '22px 20px 6px',
    display: 'flex', flexDirection: 'column' as const, gap: 8,
  },
  valueBadge: {
    alignSelf: 'flex-start',
    display: 'inline-flex', alignItems: 'center', gap: 5,
    backgroundColor: COLORS.primary.light, color: COLORS.primary.dark,
    fontSize: 12.5, fontWeight: 700, padding: '5px 11px', borderRadius: BORDER_RADIUS.pill,
  },
  valueHeadline: {
    fontSize: 23, fontWeight: 800, color: COLORS.text.primary, letterSpacing: -0.5, lineHeight: '1.3',
  },
  valueSub: { fontSize: 14.5, color: COLORS.text.secondary, lineHeight: '1.55' },

  // 공통 섹션
  section: { padding: '24px 20px 0' },
  sectionTitle: {
    fontSize: 18, fontWeight: 700, color: COLORS.text.primary, letterSpacing: -0.3, marginBottom: 4,
  },
  sectionHint: { fontSize: 13, color: COLORS.text.tertiary, lineHeight: '1.5', marginBottom: 16 },

  // 메뉴
  menuList: { display: 'flex', flexDirection: 'column' as const, gap: 12 },
  menuCard: {
    display: 'flex', gap: 12, padding: 12,
    borderRadius: BORDER_RADIUS.xl, border: `1px solid ${CARD_STYLE.borderColor}`,
    backgroundColor: COLORS.neutral.white, transition: 'all 180ms',
  },
  menuImage: {
    width: 84, height: 84, borderRadius: BORDER_RADIUS.md,
    objectFit: 'cover' as const, flexShrink: 0, display: 'block',
  },
  menuBody: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' as const, gap: 4 },
  menuName: { fontSize: 15, fontWeight: 700, color: COLORS.text.primary, letterSpacing: -0.2 },
  menuDesc: { fontSize: 12.5, color: COLORS.text.tertiary, lineHeight: '1.45', flex: 1 },
  menuBottomRow: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4,
  },
  menuPrice: { fontSize: 15, fontWeight: 800, color: COLORS.text.primary },
  addButton: {
    display: 'inline-flex', alignItems: 'center', gap: 4,
    padding: '7px 16px', borderRadius: BORDER_RADIUS.md,
    border: `1px solid ${COLORS.primary.main}`, backgroundColor: COLORS.neutral.white,
    color: COLORS.primary.main, fontSize: 13, fontWeight: 700,
    cursor: 'pointer', fontFamily: FONT, transition: 'all 150ms',
  },
  addButtonActive: {
    backgroundColor: COLORS.primary.main, color: '#FFFFFF', border: `1px solid ${COLORS.primary.main}`,
  },

  // 선결제 CTA
  ctaSection: { padding: '24px 20px 0' },
  primaryCta: {
    width: '100%', padding: '16px 0', borderRadius: BORDER_RADIUS.md, border: 'none',
    background: `linear-gradient(135deg, ${COLORS.primary.main} 0%, ${COLORS.primary.gradient} 100%)`,
    color: '#FFFFFF', fontSize: 16, fontWeight: 800, fontFamily: FONT,
    boxShadow: CSS_SHADOWS.cta, transition: 'all 200ms',
  },

  // 예약 필드
  field: { marginBottom: 18 },
  fieldLabel: {
    display: 'flex', alignItems: 'center', gap: 6,
    fontSize: 14, fontWeight: 600, color: COLORS.text.primary, marginBottom: 9,
  },
  dateInput: {
    width: '100%', padding: '11px 14px', borderRadius: BORDER_RADIUS.md,
    border: '1px solid rgba(17,17,17,0.12)', fontSize: 14, fontFamily: FONT,
    color: COLORS.text.primary, backgroundColor: COLORS.neutral.white,
    boxSizing: 'border-box' as const,
  },
  select: {
    width: '100%', padding: '11px 14px', borderRadius: BORDER_RADIUS.md,
    border: '1px solid rgba(17,17,17,0.12)', fontSize: 14, fontFamily: FONT,
    color: COLORS.text.primary, backgroundColor: COLORS.neutral.white,
    boxSizing: 'border-box' as const, appearance: 'none' as const,
  },
  partyRow: { display: 'flex', alignItems: 'center', gap: 20 },
  pmButton: {
    width: 38, height: 38, borderRadius: 19,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    border: `1px solid ${COLORS.neutral.grey200}`, backgroundColor: COLORS.neutral.white,
    fontSize: 20, fontWeight: 600, color: COLORS.text.primary, cursor: 'pointer', fontFamily: FONT,
  },
  partyText: {
    fontSize: 18, fontWeight: 700, color: COLORS.text.primary,
    minWidth: 52, textAlign: 'center' as const,
  },

  // 결제 요약
  paysummary: {
    marginTop: 4, padding: 14, borderRadius: BORDER_RADIUS.md,
    border: `1px solid ${CARD_STYLE.borderColor}`, backgroundColor: COLORS.neutral.grey50,
  },
  payRow: {
    display: 'flex', justifyContent: 'space-between',
    fontSize: 13.5, color: COLORS.text.secondary, padding: '4px 0',
  },
  payTotalRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 10, marginTop: 6, borderTop: '1px solid rgba(17,17,17,0.07)',
    fontSize: 15, fontWeight: 700, color: COLORS.text.primary,
  },
  payTotalAmount: { color: COLORS.primary.main, fontWeight: 800, fontSize: 17 },
  payButton: {
    width: '100%', padding: '16px 0', marginTop: 18, borderRadius: BORDER_RADIUS.md, border: 'none',
    background: `linear-gradient(135deg, ${COLORS.primary.main} 0%, ${COLORS.primary.gradient} 100%)`,
    color: '#FFFFFF', fontSize: 16, fontWeight: 800, fontFamily: FONT,
    boxShadow: CSS_SHADOWS.cta, transition: 'all 200ms',
  },
  payNote: {
    fontSize: 12, color: COLORS.text.tertiary, textAlign: 'center' as const,
    marginTop: 10, lineHeight: '1.5',
  },

  // 모달
  modalOverlay: {
    position: 'fixed', inset: 0, backgroundColor: COLORS.surface.overlay,
    display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 1000,
  },
  modalSheet: {
    position: 'relative', width: '100%', maxWidth: 480,
    backgroundColor: COLORS.neutral.white,
    borderTopLeftRadius: BORDER_RADIUS.xxl, borderTopRightRadius: BORDER_RADIUS.xxl,
    padding: '28px 22px 26px', boxShadow: CSS_SHADOWS.bottomSheet,
    boxSizing: 'border-box' as const,
  },
  modalClose: {
    position: 'absolute', top: 14, right: 14, width: 32, height: 32,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    border: 'none', backgroundColor: 'transparent', cursor: 'pointer',
  },
  modalEmoji: { fontSize: 34, marginBottom: 8 },
  modalTitle: { fontSize: 20, fontWeight: 800, color: COLORS.text.primary, letterSpacing: -0.4, marginBottom: 8 },
  modalDesc: { fontSize: 14, color: COLORS.text.secondary, lineHeight: '1.55', marginBottom: 16 },
  honestBox: {
    display: 'flex', alignItems: 'flex-start', gap: 7,
    backgroundColor: COLORS.functional.infoLight, color: COLORS.functional.info,
    padding: '10px 12px', borderRadius: BORDER_RADIUS.md,
    fontSize: 12.5, fontWeight: 600, lineHeight: '1.45', marginBottom: 18,
  },
  toggleRow: { display: 'flex', gap: 8, marginBottom: 12 },
  toggleBtn: {
    flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5,
    padding: '10px 0', borderRadius: BORDER_RADIUS.md,
    border: `1px solid ${COLORS.neutral.grey200}`, backgroundColor: COLORS.neutral.white,
    color: COLORS.text.secondary, fontSize: 13.5, fontWeight: 600, cursor: 'pointer', fontFamily: FONT,
  },
  toggleBtnActive: {
    backgroundColor: COLORS.primary.main, color: '#FFFFFF', border: `1px solid ${COLORS.primary.main}`,
  },
  contactInput: {
    width: '100%', padding: '13px 14px', borderRadius: BORDER_RADIUS.md,
    border: '1px solid rgba(17,17,17,0.14)', fontSize: 15, fontFamily: FONT,
    color: COLORS.text.primary, boxSizing: 'border-box' as const,
  },
  errorText: { fontSize: 12.5, color: COLORS.functional.error, marginTop: 8 },
  modalSubmit: {
    width: '100%', padding: '15px 0', marginTop: 16, borderRadius: BORDER_RADIUS.md, border: 'none',
    background: `linear-gradient(135deg, ${COLORS.primary.main} 0%, ${COLORS.primary.gradient} 100%)`,
    color: '#FFFFFF', fontSize: 16, fontWeight: 800, fontFamily: FONT, boxShadow: CSS_SHADOWS.cta,
  },
  modalFinePrint: {
    fontSize: 11.5, color: COLORS.text.tertiary, textAlign: 'center' as const,
    marginTop: 12, lineHeight: '1.5',
  },

  // 감사 화면
  thankYou: {
    display: 'flex', flexDirection: 'column' as const, alignItems: 'center',
    textAlign: 'center' as const, padding: '14px 4px 6px',
  },
  thankYouIcon: { marginBottom: 14 },
  thankYouTitle: { fontSize: 22, fontWeight: 800, color: COLORS.text.primary, marginBottom: 10 },
  thankYouDesc: { fontSize: 14.5, color: COLORS.text.secondary, lineHeight: '1.6', marginBottom: 22 },
  thankYouBtn: {
    width: '100%', padding: '14px 0', borderRadius: BORDER_RADIUS.md, border: 'none',
    backgroundColor: COLORS.secondary.light, color: COLORS.text.primary,
    fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: FONT,
  },
};

export default FakeDoorLanding;
