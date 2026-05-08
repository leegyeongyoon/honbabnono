import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useNavigate, useParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { COLORS, CSS_SHADOWS, CARD_STYLE, TRANSITIONS, CTA_STYLE } from '../styles/colors';
import { SPACING, BORDER_RADIUS, HEADER_STYLE } from '../styles/spacing';
import restaurantApiService, { Restaurant, MenuItem, RestaurantReview } from '../services/restaurantApiService';
import useCartStore from '../store/cartStore';

// ============================================================
// RestaurantDetailScreen — 잇테이블 v2 매장 상세
// ============================================================

type TabType = 'menu' | 'info' | 'review';

const RestaurantDetailScreen: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const cartStore = useCartStore();

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [reviews, setReviews] = useState<RestaurantReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('menu');
  const [favorited, setFavorited] = useState(false);

  useEffect(() => {
    if (!id) return;
    loadData();
    restaurantApiService.recordView(id).catch(() => {});
  }, [id]);

  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [rest, menuList, reviewData] = await Promise.all([
        restaurantApiService.getRestaurantById(id),
        restaurantApiService.getMenusByRestaurant(id),
        restaurantApiService.getRestaurantReviews(id).catch(() => ({ reviews: [], total: 0 })),
      ]);
      setRestaurant(rest);
      setMenus(Array.isArray(menuList) ? menuList : []);
      setReviews(reviewData.reviews);
      setFavorited((rest as any).isFavorited ?? false);
    } catch {
      // error
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFavorite = async () => {
    if (!id) return;
    try {
      const result = await restaurantApiService.toggleFavorite(id);
      setFavorited(result.favorited);
    } catch {
      // silent
    }
  };

  const handleAddToCart = useCallback(
    (menu: MenuItem) => {
      if (!restaurant) return;
      cartStore.setRestaurantId(restaurant.id);
      cartStore.addItem({
        menuId: menu.id,
        menuName: menu.name,
        unitPrice: menu.price,
        quantity: 1,
      });
    },
    [restaurant, cartStore],
  );

  const handleUpdateQuantity = useCallback(
    (menuId: string, delta: number) => {
      const item = cartStore.items.find((i) => i.menuId === menuId);
      const newQty = (item?.quantity || 0) + delta;
      cartStore.updateQuantity(menuId, newQty);
    },
    [cartStore],
  );

  // 현재 매장의 장바구니만 표시
  const isCurrentRestaurantCart = restaurant && cartStore.restaurantId === restaurant.id;

  const getCartQuantity = (menuId: string) => {
    if (!isCurrentRestaurantCart) return 0;
    return cartStore.items.find((i) => i.menuId === menuId)?.quantity || 0;
  };

  const formatPrice = (n: number) => n.toLocaleString('ko-KR');
  const totalAmount = isCurrentRestaurantCart ? cartStore.totalAmount : 0;
  const totalCount = isCurrentRestaurantCart
    ? cartStore.items.reduce((s, i) => s + i.quantity, 0)
    : 0;

  // 메뉴를 카테고리별로 그룹
  const menusByCategory = menus.reduce<Record<string, MenuItem[]>>((acc, m) => {
    const cat = m.category || '기타';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(m);
    return acc;
  }, {});

  if (loading) {
    return (
      <div style={s.wrapper}>
        <div style={s.container}>
          <div style={s.loadingWrap}>
            <ActivityIndicator size="large" color={COLORS.primary.main} />
          </div>
        </div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div style={s.wrapper}>
        <div style={s.container}>
          <div style={s.loadingWrap}>
            <div style={{ color: COLORS.text.tertiary, fontSize: 15, fontFamily: FONT }}>
              매장을 찾을 수 없습니다.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={s.wrapper}>
      <div style={s.container}>
        {/* 상단 이미지 */}
        <div style={s.heroWrapper}>
          {restaurant.imageUrl ? (
            <img src={restaurant.imageUrl} alt={restaurant.name} style={s.heroImage} />
          ) : (
            <div style={s.heroPlaceholder}>
              <span style={{ fontSize: 48 }}>🍽️</span>
            </div>
          )}
          {/* 뒤로가기 */}
          <div style={s.backButton} onClick={() => navigate(-1)}>
            <Icon name="arrow-left" size={20} color={COLORS.neutral.white} />
          </div>
          {/* 찜 */}
          <div style={s.favoriteButton} onClick={handleToggleFavorite}>
            <Icon
              name="heart"
              size={20}
              color={favorited ? COLORS.functional.error : COLORS.neutral.white}
            />
          </div>
        </div>

        {/* 매장 정보 */}
        <div style={s.infoSection}>
          <div style={s.restaurantName}>{restaurant.name}</div>
          <div style={s.metaRow}>
            {restaurant.category && (
              <span style={s.categoryChip}>{restaurant.category}</span>
            )}
            <span style={s.ratingText}>
              ★ {restaurant.avgRating?.toFixed(1) || '-'}
            </span>
            {restaurant.reviewCount != null && (
              <span style={s.reviewCountText}>리뷰 {restaurant.reviewCount}</span>
            )}
          </div>
          {restaurant.address && (
            <div style={s.addressText}>{restaurant.address}</div>
          )}
          {restaurant.phone && (
            <div style={s.phoneText}>{restaurant.phone}</div>
          )}
        </div>

        {/* 탭 */}
        <div style={s.tabBar}>
          {(['menu', 'info', 'review'] as TabType[]).map((tab) => (
            <div
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                ...s.tab,
                color: activeTab === tab ? COLORS.primary.main : COLORS.text.tertiary,
                borderBottom: activeTab === tab
                  ? `2px solid ${COLORS.primary.main}`
                  : '2px solid transparent',
                fontWeight: activeTab === tab ? 700 : 400,
              }}
            >
              {tab === 'menu' ? '메뉴' : tab === 'info' ? '정보' : '리뷰'}
            </div>
          ))}
        </div>

        {/* 탭 콘텐츠 */}
        <div style={s.tabContent}>
          {activeTab === 'menu' && (
            <>
              {Object.entries(menusByCategory).map(([cat, items]) => (
                <div key={cat}>
                  <div style={s.menuCategoryTitle}>{cat}</div>
                  {items.map((menu) => {
                    const qty = getCartQuantity(menu.id);
                    return (
                      <div key={menu.id} style={s.menuItem}>
                        <div style={s.menuInfo}>
                          <div style={s.menuName}>{menu.name}</div>
                          {menu.description && (
                            <div style={s.menuDesc}>{menu.description}</div>
                          )}
                          <div style={s.menuPrice}>{formatPrice(menu.price)}원</div>
                        </div>
                        <div style={s.menuRight}>
                          {menu.imageUrl && (
                            <img src={menu.imageUrl} alt={menu.name} style={s.menuImage} />
                          )}
                          <div style={s.qtyControls}>
                            {qty > 0 ? (
                              <>
                                <div
                                  style={s.qtyButton}
                                  onClick={() => handleUpdateQuantity(menu.id, -1)}
                                >
                                  -
                                </div>
                                <span style={s.qtyText}>{qty}</span>
                                <div
                                  style={s.qtyButton}
                                  onClick={() => handleUpdateQuantity(menu.id, 1)}
                                >
                                  +
                                </div>
                              </>
                            ) : (
                              <div
                                style={s.addButton}
                                onClick={() => handleAddToCart(menu)}
                              >
                                담기
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
              {menus.length === 0 && (
                <div style={s.emptyText}>등록된 메뉴가 없습니다.</div>
              )}
            </>
          )}

          {activeTab === 'info' && (
            <div style={s.infoTab}>
              <div style={s.infoRow}>
                <div style={s.infoLabel}>주소</div>
                <div style={s.infoValue}>
                  {restaurant.address}
                  {restaurant.addressDetail ? ` ${restaurant.addressDetail}` : ''}
                </div>
              </div>
              {restaurant.phone && (
                <div style={s.infoRow}>
                  <div style={s.infoLabel}>전화번호</div>
                  <div style={s.infoValue}>{restaurant.phone}</div>
                </div>
              )}
              {restaurant.operatingHours && (
                <div style={s.infoRow}>
                  <div style={s.infoLabel}>영업시간</div>
                  <div style={s.infoValue}>
                    {typeof restaurant.operatingHours === 'string'
                      ? restaurant.operatingHours
                      : JSON.stringify(restaurant.operatingHours)}
                  </div>
                </div>
              )}
              {restaurant.seatCount && (
                <div style={s.infoRow}>
                  <div style={s.infoLabel}>좌석수</div>
                  <div style={s.infoValue}>{restaurant.seatCount}석</div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'review' && (
            <div>
              {reviews.length > 0 ? (
                reviews.map((review) => (
                  <div key={review.id} style={s.reviewCard}>
                    <div style={s.reviewHeader}>
                      <span style={s.reviewUser}>{review.userName}</span>
                      <span style={s.reviewRating}>★ {review.rating.toFixed(1)}</span>
                    </div>
                    {(review.tasteRating || review.serviceRating || review.ambianceRating) && (
                      <div style={s.reviewSubRatings}>
                        {review.tasteRating && <span>맛 {review.tasteRating}</span>}
                        {review.serviceRating && <span>서비스 {review.serviceRating}</span>}
                        {review.ambianceRating && <span>분위기 {review.ambianceRating}</span>}
                      </div>
                    )}
                    <div style={s.reviewContent}>{review.content}</div>
                    <div style={s.reviewDate}>
                      {new Date(review.createdAt).toLocaleDateString('ko-KR')}
                    </div>
                  </div>
                ))
              ) : (
                <div style={s.emptyText}>아직 리뷰가 없습니다.</div>
              )}
            </div>
          )}
        </div>

        {/* 하단 여백 (장바구니 바 높이) */}
        <div style={{ height: totalCount > 0 ? 80 : 20 }} />

        {/* 장바구니 바 */}
        {totalCount > 0 && (
          <div style={s.cartBar}>
            <div
              style={s.cartBarInner}
              onClick={() => navigate(`/reservation/${restaurant.id}`)}
            >
              <span style={s.cartBarText}>
                {totalCount}개 메뉴 {formatPrice(totalAmount)}원 - 예약하기
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Styles ──

const FONT = '"Pretendard Variable", Pretendard, system-ui, -apple-system, sans-serif';

const s: Record<string, React.CSSProperties> = {
  wrapper: { minHeight: '100vh', backgroundColor: COLORS.neutral.background },
  container: { maxWidth: 480, margin: '0 auto', position: 'relative' as const },
  loadingWrap: { display: 'flex', justifyContent: 'center', alignItems: 'center', paddingTop: 120, fontFamily: FONT },

  // Hero
  heroWrapper: { position: 'relative' as const, width: '100%', height: 240, backgroundColor: COLORS.neutral.light },
  heroImage: { width: '100%', height: '100%', objectFit: 'cover' as const },
  heroPlaceholder: { width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.neutral.light },
  backButton: {
    position: 'absolute' as const, top: SPACING.lg, left: SPACING.lg,
    width: 36, height: 36, borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.surface.dimmed, display: 'flex',
    alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
    transition: TRANSITIONS.normal,
  },
  favoriteButton: {
    position: 'absolute' as const, top: SPACING.lg, right: SPACING.lg,
    width: 36, height: 36, borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.surface.dimmed, display: 'flex',
    alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
    transition: TRANSITIONS.normal,
  },

  // 매장 정보
  infoSection: {
    padding: `${SPACING.lg}px ${SPACING.screen.horizontal}px`,
    borderBottom: `1px solid ${CARD_STYLE.borderColor}`,
  },
  restaurantName: {
    fontSize: HEADER_STYLE.title.fontSize, fontWeight: 700,
    color: COLORS.text.primary, fontFamily: FONT,
    letterSpacing: HEADER_STYLE.title.letterSpacing, marginBottom: SPACING.sm,
  },
  metaRow: { display: 'flex', alignItems: 'center', gap: SPACING.sm, marginBottom: 6 },
  categoryChip: {
    fontSize: 12, fontWeight: 600, padding: '2px 10px',
    borderRadius: BORDER_RADIUS.pill, backgroundColor: COLORS.secondary.light,
    color: COLORS.text.secondary, fontFamily: FONT,
  },
  ratingText: { fontSize: 14, fontWeight: 600, color: COLORS.primary.main, fontFamily: FONT },
  reviewCountText: { fontSize: 13, color: COLORS.text.tertiary, fontFamily: FONT },
  addressText: { fontSize: 13, color: COLORS.text.tertiary, fontFamily: FONT, marginBottom: 2 },
  phoneText: { fontSize: 13, color: COLORS.text.tertiary, fontFamily: FONT },

  // 탭
  tabBar: {
    display: 'flex', borderBottom: `1px solid ${CARD_STYLE.borderColor}`,
    position: 'sticky' as const, top: 0, backgroundColor: COLORS.surface.primary,
    zIndex: 10, boxShadow: CSS_SHADOWS.stickyHeader,
  },
  tab: {
    flex: 1, textAlign: 'center' as const, padding: '12px 0',
    fontSize: 14, cursor: 'pointer', transition: TRANSITIONS.normal, fontFamily: FONT,
  },
  tabContent: { padding: `0 ${SPACING.screen.horizontal}px ${SPACING.screen.horizontal}px` },

  // 메뉴 탭
  menuCategoryTitle: {
    fontSize: 17, fontWeight: 700, color: COLORS.text.primary,
    fontFamily: FONT, padding: `${SPACING.lg}px 0 ${SPACING.sm}px`,
    borderBottom: `1px solid ${CARD_STYLE.borderColor}`, marginBottom: SPACING.xs,
  },
  menuItem: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    padding: `${SPACING.card.padding}px 0`,
    borderBottom: `1px solid ${CARD_STYLE.borderColor}`,
    transition: TRANSITIONS.normal,
  },
  menuInfo: { flex: 1, marginRight: SPACING.md },
  menuName: { fontSize: 15, fontWeight: 600, color: COLORS.text.primary, fontFamily: FONT, marginBottom: SPACING.xs },
  menuDesc: { fontSize: 12, color: COLORS.text.tertiary, fontFamily: FONT, marginBottom: SPACING.xs, lineHeight: '1.4' },
  menuPrice: { fontSize: 14, fontWeight: 700, color: COLORS.text.primary, fontFamily: FONT },
  menuRight: { display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: SPACING.sm },
  menuImage: { width: 72, height: 72, borderRadius: BORDER_RADIUS.md, objectFit: 'cover' as const },
  qtyControls: { display: 'flex', alignItems: 'center', gap: SPACING.sm },
  qtyButton: {
    width: 28, height: 28, borderRadius: BORDER_RADIUS.full,
    border: `1px solid ${COLORS.neutral.grey200}`, display: 'flex',
    alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
    fontSize: 16, fontWeight: 600, color: COLORS.text.primary, fontFamily: FONT,
    backgroundColor: COLORS.surface.primary, transition: TRANSITIONS.fast,
  },
  qtyText: { fontSize: 14, fontWeight: 600, minWidth: 20, textAlign: 'center' as const, fontFamily: FONT, color: COLORS.text.primary },
  addButton: {
    padding: '6px 16px', borderRadius: BORDER_RADIUS.pill,
    background: `linear-gradient(135deg, ${COLORS.primary.main} 0%, ${COLORS.primary.gradient} 100%)`,
    color: COLORS.text.white, fontSize: 13, fontWeight: 600, cursor: 'pointer',
    fontFamily: FONT, boxShadow: CSS_SHADOWS.cta, transition: TRANSITIONS.normal,
  },

  // 정보 탭
  infoTab: { paddingTop: SPACING.lg },
  infoRow: { padding: `${SPACING.md}px 0`, borderBottom: `1px solid ${CARD_STYLE.borderColor}` },
  infoLabel: { fontSize: 13, fontWeight: 600, color: COLORS.text.secondary, fontFamily: FONT, marginBottom: SPACING.xs },
  infoValue: { fontSize: 14, color: COLORS.text.primary, fontFamily: FONT, lineHeight: '1.5' },

  // 리뷰 탭
  reviewCard: {
    padding: `${SPACING.card.padding}px 0`,
    borderBottom: `1px solid ${CARD_STYLE.borderColor}`,
  },
  reviewHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.xs },
  reviewUser: { fontSize: 14, fontWeight: 600, color: COLORS.text.primary, fontFamily: FONT },
  reviewRating: { fontSize: 13, fontWeight: 600, color: COLORS.primary.main, fontFamily: FONT },
  reviewSubRatings: { display: 'flex', gap: SPACING.md, fontSize: 12, color: COLORS.text.tertiary, fontFamily: FONT, marginBottom: 6 },
  reviewContent: { fontSize: 14, color: COLORS.text.primary, fontFamily: FONT, lineHeight: '1.5', marginBottom: SPACING.xs },
  reviewDate: { fontSize: 12, color: COLORS.text.tertiary, fontFamily: FONT },

  emptyText: { fontSize: 14, color: COLORS.text.tertiary, textAlign: 'center' as const, padding: 40, fontFamily: FONT },

  // 장바구니 바
  cartBar: {
    position: 'fixed' as const, bottom: 0, left: 0, right: 0,
    padding: `${SPACING.md}px ${SPACING.screen.horizontal}px`,
    backgroundColor: COLORS.surface.primary,
    borderTop: `1px solid ${CARD_STYLE.borderColor}`,
    boxShadow: CSS_SHADOWS.bottomSheet, zIndex: 100,
  },
  cartBarInner: {
    maxWidth: 480, margin: '0 auto',
    background: `linear-gradient(135deg, ${COLORS.primary.main} 0%, ${COLORS.primary.gradient} 100%)`,
    borderRadius: BORDER_RADIUS.xxl, padding: '14px 0',
    textAlign: 'center' as const, cursor: 'pointer',
    boxShadow: CSS_SHADOWS.cta, transition: TRANSITIONS.normal,
  },
  cartBarText: { color: COLORS.text.white, fontSize: 15, fontWeight: 700, fontFamily: FONT },
};

export default RestaurantDetailScreen;
