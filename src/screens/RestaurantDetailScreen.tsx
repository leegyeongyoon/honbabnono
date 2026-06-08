import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Modal,
  StyleSheet,
} from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { useTypedNavigation } from '../hooks/useNavigation';
import { Icon } from '../components/Icon';
import { COLORS, SHADOWS, CARD_STYLE } from '../styles/colors';
import { SPACING, BORDER_RADIUS } from '../styles/spacing';
import restaurantApiService, {
  Restaurant,
  MenuItem,
  MenuOptionGroup,
  RestaurantReview,
} from '../services/restaurantApiService';
import useCartStore from '../store/cartStore';
import { CartItemOptionPayload } from '../store/cartStore';
import { formatOperatingHours, buildKakaoMapUrl } from '../utils/operatingHours';

// ============================================================
// RestaurantDetailScreen — 잇테이블 v2 매장 상세 (React Native 포팅)
// 웹(.web.tsx)과 데이터/로직 동일, UI만 RN 변환.
// ============================================================

type TabType = 'menu' | 'info' | 'review';

type DetailRouteParams = { restaurantId: string };

const RestaurantDetailScreen: React.FC = () => {
  const navigation = useTypedNavigation();
  const route = useRoute<RouteProp<Record<string, DetailRouteParams>, string>>();
  const { restaurantId: id } = route.params || ({} as DetailRouteParams);
  const cartStore = useCartStore();

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [reviews, setReviews] = useState<RestaurantReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('menu');
  const [favorited, setFavorited] = useState(false);

  // 메뉴 옵션 모달 (옵션 그룹은 메뉴별로 캐시)
  const [optionModal, setOptionModal] = useState<{ menu: MenuItem; groups: MenuOptionGroup[] } | null>(null);
  const optionCache = React.useRef<Record<string, MenuOptionGroup[]>>({});

  useEffect(() => {
    if (!id) return;
    loadData();
    restaurantApiService.recordView(id).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    async (menu: MenuItem) => {
      if (!restaurant) return;

      // 옵션 그룹 조회 (메뉴별 캐시) — 옵션이 있으면 선택 모달 오픈
      let groups = optionCache.current[menu.id];
      if (!groups) {
        try {
          groups = await restaurantApiService.getMenuOptions(menu.id);
        } catch {
          groups = [];
        }
        optionCache.current[menu.id] = groups;
      }

      if (groups.length > 0) {
        setOptionModal({ menu, groups });
        return;
      }

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

  const handleOptionConfirm = useCallback(
    (result: { options: CartItemOptionPayload[]; optionLabel: string; optionsPrice: number }) => {
      if (!restaurant || !optionModal) return;
      cartStore.setRestaurantId(restaurant.id);
      cartStore.addItem({
        menuId: optionModal.menu.id,
        menuName: optionModal.menu.name,
        unitPrice: optionModal.menu.price,
        quantity: 1,
        options: result.options,
        optionLabel: result.optionLabel,
        optionsPrice: result.optionsPrice,
      });
      setOptionModal(null);
    },
    [restaurant, optionModal, cartStore],
  );

  // 예약 일시중지 여부 (점주 토글)
  const isPaused = restaurant?.isAcceptingReservations === false;

  const handleUpdateQuantity = useCallback(
    (menuId: string, delta: number) => {
      const item = cartStore.items.find((i) => i.menuId === menuId);
      const newQty = (item?.quantity || 0) + delta;
      cartStore.updateQuantity(menuId, newQty);
    },
    [cartStore],
  );

  // 현재 매장의 장바구니만 표시
  const isCurrentRestaurantCart = !!restaurant && cartStore.restaurantId === restaurant.id;

  const getCartQuantity = (menuId: string) => {
    if (!isCurrentRestaurantCart) return 0;
    return cartStore.items.find((i) => i.menuId === menuId)?.quantity || 0;
  };

  const formatPrice = (n: number) => n.toLocaleString('ko-KR');
  const totalAmount = isCurrentRestaurantCart ? cartStore.totalAmount : 0;
  const totalCount = isCurrentRestaurantCart
    ? cartStore.items.reduce((sum, i) => sum + i.quantity, 0)
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
      <View style={s.wrapper}>
        <View style={s.loadingWrap}>
          <ActivityIndicator size="large" color={COLORS.primary.main} />
        </View>
      </View>
    );
  }

  if (!restaurant) {
    return (
      <View style={s.wrapper}>
        <View style={s.loadingWrap}>
          <Text style={s.notFoundText}>매장을 찾을 수 없습니다.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={s.wrapper}>
      <ScrollView
        style={s.container}
        contentContainerStyle={{ paddingBottom: totalCount > 0 ? 80 : 20 }}
      >
        {/* 상단 이미지 */}
        <View style={s.heroWrapper}>
          {restaurant.imageUrl ? (
            <Image source={{ uri: restaurant.imageUrl }} style={s.heroImage} />
          ) : (
            <View style={s.heroPlaceholder}>
              <Text style={{ fontSize: 48 }}>🍽️</Text>
            </View>
          )}
          {/* 뒤로가기 */}
          <TouchableOpacity style={s.backButton} onPress={() => navigation.goBack()}>
            <Icon name="arrow-left" size={20} color={COLORS.neutral.white} />
          </TouchableOpacity>
          {/* 찜 */}
          <TouchableOpacity style={s.favoriteButton} onPress={handleToggleFavorite}>
            <Icon
              name="heart"
              size={20}
              color={favorited ? COLORS.functional.error : COLORS.neutral.white}
            />
          </TouchableOpacity>
        </View>

        {/* 매장 정보 */}
        <View style={s.infoSection}>
          <Text style={s.restaurantName}>{restaurant.name}</Text>
          <View style={s.metaRow}>
            {!!restaurant.category && <Text style={s.categoryChip}>{restaurant.category}</Text>}
            <Text style={s.ratingText}>★ {restaurant.avgRating?.toFixed(1) || '-'}</Text>
            {restaurant.reviewCount != null && (
              <Text style={s.reviewCountText}>리뷰 {restaurant.reviewCount}</Text>
            )}
          </View>
          {!!restaurant.address && <Text style={s.addressText}>{restaurant.address}</Text>}
          {!!restaurant.phone && (
            <Text
              style={[s.phoneText, s.phoneLink]}
              onPress={() => Linking.openURL(`tel:${restaurant.phone}`)}
            >
              📞 {restaurant.phone}
            </Text>
          )}
          {isPaused && (
            <Text style={s.pausedBadge}>
              예약 일시 중지{restaurant.pauseReason ? ` — ${restaurant.pauseReason}` : ''}
            </Text>
          )}
        </View>

        {/* 탭 */}
        <View style={s.tabBar}>
          {(['menu', 'info', 'review'] as TabType[]).map((tab) => {
            const active = activeTab === tab;
            return (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveTab(tab)}
                style={[s.tab, active ? s.tabActive : null]}
              >
                <Text style={[s.tabText, active ? s.tabTextActive : null]}>
                  {tab === 'menu' ? '메뉴' : tab === 'info' ? '정보' : '리뷰'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* 탭 콘텐츠 */}
        <View style={s.tabContent}>
          {activeTab === 'menu' && (
            <>
              {Object.entries(menusByCategory).map(([cat, items]) => (
                <View key={cat}>
                  <Text style={s.menuCategoryTitle}>{cat}</Text>
                  {items.map((menu) => {
                    const qty = getCartQuantity(menu.id);
                    return (
                      <View key={menu.id} style={s.menuItem}>
                        <View style={s.menuInfo}>
                          <Text style={s.menuName}>{menu.name}</Text>
                          {!!menu.description && <Text style={s.menuDesc}>{menu.description}</Text>}
                          <Text style={s.menuPrice}>{formatPrice(menu.price)}원</Text>
                        </View>
                        <View style={s.menuRight}>
                          {!!menu.imageUrl && (
                            <Image source={{ uri: menu.imageUrl }} style={s.menuImage} />
                          )}
                          <View style={s.qtyControls}>
                            {qty > 0 ? (
                              <>
                                <TouchableOpacity
                                  style={s.qtyButton}
                                  onPress={() => handleUpdateQuantity(menu.id, -1)}
                                >
                                  <Text style={s.qtyButtonText}>-</Text>
                                </TouchableOpacity>
                                <Text style={s.qtyText}>{qty}</Text>
                                <TouchableOpacity
                                  style={s.qtyButton}
                                  onPress={() => handleUpdateQuantity(menu.id, 1)}
                                >
                                  <Text style={s.qtyButtonText}>+</Text>
                                </TouchableOpacity>
                              </>
                            ) : (
                              <TouchableOpacity
                                style={[s.addButton, isPaused ? s.addButtonDisabled : null]}
                                disabled={isPaused}
                                onPress={() => {
                                  if (!isPaused) handleAddToCart(menu);
                                }}
                              >
                                <Text style={s.addButtonText}>담기</Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              ))}
              {menus.length === 0 && <Text style={s.emptyText}>등록된 메뉴가 없습니다.</Text>}
            </>
          )}

          {activeTab === 'info' && (
            <View style={s.infoTab}>
              <View style={s.infoRow}>
                <Text style={s.infoLabel}>주소</Text>
                <Text style={s.infoValue}>
                  {restaurant.address}
                  {restaurant.addressDetail ? ` ${restaurant.addressDetail}` : ''}
                </Text>
                {(() => {
                  const mapUrl = buildKakaoMapUrl(
                    restaurant.name,
                    restaurant.latitude,
                    restaurant.longitude,
                    restaurant.address,
                  );
                  return mapUrl ? (
                    <Text style={s.mapLink} onPress={() => Linking.openURL(mapUrl)}>
                      🗺️ 지도에서 보기
                    </Text>
                  ) : null;
                })()}
              </View>
              {!!restaurant.phone && (
                <View style={s.infoRow}>
                  <Text style={s.infoLabel}>전화번호</Text>
                  <Text
                    style={[s.infoValue, s.phoneLink]}
                    onPress={() => Linking.openURL(`tel:${restaurant.phone}`)}
                  >
                    {restaurant.phone}
                  </Text>
                </View>
              )}
              {formatOperatingHours(restaurant.operatingHours).map((row) => (
                <View key={row.label} style={s.infoRow}>
                  <Text style={s.infoLabel}>{row.label}</Text>
                  <Text style={s.infoValue}>{row.value}</Text>
                </View>
              ))}
              {!!restaurant.seatCount && (
                <View style={s.infoRow}>
                  <Text style={s.infoLabel}>좌석수</Text>
                  <Text style={s.infoValue}>{restaurant.seatCount}석</Text>
                </View>
              )}
            </View>
          )}

          {activeTab === 'review' && (
            <View>
              {reviews.length > 0 ? (
                reviews.map((review) => (
                  <View key={review.id} style={s.reviewCard}>
                    <View style={s.reviewHeader}>
                      <Text style={s.reviewUser}>{review.userName}</Text>
                      <Text style={s.reviewRating}>★ {review.rating.toFixed(1)}</Text>
                    </View>
                    {(review.tasteRating || review.serviceRating || review.ambianceRating) ? (
                      <View style={s.reviewSubRatings}>
                        {!!review.tasteRating && (
                          <Text style={s.reviewSubRatingText}>맛 {review.tasteRating}</Text>
                        )}
                        {!!review.serviceRating && (
                          <Text style={s.reviewSubRatingText}>서비스 {review.serviceRating}</Text>
                        )}
                        {!!review.ambianceRating && (
                          <Text style={s.reviewSubRatingText}>분위기 {review.ambianceRating}</Text>
                        )}
                      </View>
                    ) : null}
                    <Text style={s.reviewContent}>{review.content}</Text>
                    {review.images && review.images.length > 0 && (
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={s.reviewImages}
                      >
                        {review.images.map((url, i) => (
                          <TouchableOpacity key={i} onPress={() => Linking.openURL(url)}>
                            <Image source={{ uri: url }} style={s.reviewImage} />
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    )}
                    {!!review.reply && (
                      <View style={s.reviewReply}>
                        <Text style={s.reviewReplyLabel}>사장님 답글</Text>
                        <Text style={s.reviewReplyText}>{review.reply}</Text>
                      </View>
                    )}
                    <Text style={s.reviewDate}>
                      {new Date(review.createdAt).toLocaleDateString('ko-KR')}
                    </Text>
                  </View>
                ))
              ) : (
                <Text style={s.emptyText}>아직 리뷰가 없습니다.</Text>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* 장바구니 바 */}
      {totalCount > 0 && (
        <View style={s.cartBar}>
          <TouchableOpacity
            style={s.cartBarInner}
            onPress={() =>
              (navigation as any).navigate('ReservationForm', { restaurantId: restaurant.id })
            }
          >
            <Text style={s.cartBarText}>
              {totalCount}개 메뉴 {formatPrice(totalAmount)}원 - 예약하기
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 메뉴 옵션 선택 모달 */}
      {optionModal && (
        <MenuOptionModal
          menu={optionModal.menu}
          groups={optionModal.groups}
          onConfirm={handleOptionConfirm}
          onClose={() => setOptionModal(null)}
        />
      )}
    </View>
  );
};

// ============================================================
// MenuOptionModal (RN) — 웹 전용 MenuOptionModal.web.tsx 대체.
// 필수 그룹 min/max 검증 + 옵션 추가금 로직은 웹과 동일.
// ============================================================

interface OptionModalProps {
  menu: MenuItem;
  groups: MenuOptionGroup[];
  onConfirm: (result: {
    options: CartItemOptionPayload[];
    optionLabel: string;
    optionsPrice: number;
  }) => void;
  onClose: () => void;
}

const MenuOptionModal: React.FC<OptionModalProps> = ({ menu, groups, onConfirm, onClose }) => {
  // groupId → 선택된 item id 집합
  const [selected, setSelected] = useState<Record<string, string[]>>({});

  const toggleItem = (group: MenuOptionGroup, itemId: string) => {
    setSelected((prev) => {
      const current = prev[group.id] || [];
      if (current.includes(itemId)) {
        return { ...prev, [group.id]: current.filter((idValue) => idValue !== itemId) };
      }
      // 단일 선택 그룹(maxSelect 1)은 교체, 그 외엔 maxSelect까지 추가
      if (group.maxSelect <= 1) {
        return { ...prev, [group.id]: [itemId] };
      }
      if (current.length >= group.maxSelect) return prev;
      return { ...prev, [group.id]: [...current, itemId] };
    });
  };

  // 필수 그룹 충족 여부
  const isValid = useMemo(
    () =>
      groups.every((g) => {
        if (!g.isRequired) return true;
        const need = Math.max(g.minSelect, 1);
        return (selected[g.id] || []).length >= need;
      }),
    [groups, selected],
  );

  const { optionsPrice, optionLabel } = useMemo(() => {
    let price = 0;
    const labels: string[] = [];
    for (const g of groups) {
      for (const itemId of selected[g.id] || []) {
        const item = g.items.find((it) => it.id === itemId);
        if (item) {
          price += item.additionalPrice;
          labels.push(item.name);
        }
      }
    }
    return { optionsPrice: price, optionLabel: labels.join(', ') };
  }, [groups, selected]);

  const handleConfirm = () => {
    if (!isValid) return;
    const options: CartItemOptionPayload[] = Object.entries(selected)
      .filter(([, itemIds]) => itemIds.length > 0)
      .map(([groupId, itemIds]) => ({ group_id: groupId, item_ids: itemIds }));
    onConfirm({ options, optionLabel, optionsPrice });
  };

  const formatPrice = (n: number) => n.toLocaleString('ko-KR');
  const totalUnit = menu.price + optionsPrice;

  return (
    <Modal transparent visible animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={m.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity style={m.sheet} activeOpacity={1} onPress={() => {}}>
          {/* 헤더 */}
          <View style={m.header}>
            <Text style={m.menuName}>{menu.name}</Text>
            <TouchableOpacity style={m.closeButton} onPress={onClose}>
              <Text style={m.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
          <Text style={m.basePrice}>기본 {formatPrice(menu.price)}원</Text>

          {/* 옵션 그룹 */}
          <ScrollView style={m.groupList}>
            {groups.map((group) => {
              const picked = selected[group.id] || [];
              return (
                <View key={group.id} style={m.group}>
                  <View style={m.groupHeader}>
                    <Text style={m.groupName}>{group.name}</Text>
                    <Text style={group.isRequired ? m.requiredBadge : m.optionalBadge}>
                      {group.isRequired
                        ? `필수 ${Math.max(group.minSelect, 1)}개`
                        : `선택${group.maxSelect > 1 ? ` (최대 ${group.maxSelect}개)` : ''}`}
                    </Text>
                  </View>
                  {group.items.map((item) => {
                    const checked = picked.includes(item.id);
                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={[m.optionRow, checked ? m.optionRowChecked : null]}
                        onPress={() => toggleItem(group, item.id)}
                      >
                        <View style={[m.checkbox, checked ? m.checkboxOn : null]}>
                          {checked ? <Text style={m.checkboxMark}>✓</Text> : null}
                        </View>
                        <Text style={m.optionName}>{item.name}</Text>
                        <Text style={m.optionPrice}>
                          {item.additionalPrice > 0 ? `+${formatPrice(item.additionalPrice)}원` : ''}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              );
            })}
          </ScrollView>

          {/* 담기 버튼 */}
          <TouchableOpacity
            style={[m.confirmButton, !isValid ? m.confirmButtonDisabled : null]}
            disabled={!isValid}
            onPress={handleConfirm}
          >
            <Text style={m.confirmButtonText}>{formatPrice(totalUnit)}원 담기</Text>
          </TouchableOpacity>
          {!isValid && <Text style={m.hint}>필수 옵션을 선택해주세요.</Text>}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

// ── Styles ──

const s = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: COLORS.neutral.background },
  container: { flex: 1 },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 120 },
  notFoundText: { color: COLORS.text.tertiary, fontSize: 15 },

  // Hero
  heroWrapper: { width: '100%', height: 240, backgroundColor: COLORS.neutral.light },
  heroImage: { width: '100%', height: '100%' },
  heroPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.neutral.light,
  },
  backButton: {
    position: 'absolute',
    top: SPACING.lg,
    left: SPACING.lg,
    width: 36,
    height: 36,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.surface.dimmed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  favoriteButton: {
    position: 'absolute',
    top: SPACING.lg,
    right: SPACING.lg,
    width: 36,
    height: 36,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.surface.dimmed,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // 매장 정보
  infoSection: {
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.screen.horizontal,
    borderBottomWidth: 1,
    borderBottomColor: CARD_STYLE.borderColor,
  },
  restaurantName: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text.primary,
    letterSpacing: -0.3,
    marginBottom: SPACING.sm,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, flexWrap: 'wrap' },
  categoryChip: {
    fontSize: 12,
    fontWeight: '600',
    paddingVertical: 2,
    paddingHorizontal: 10,
    borderRadius: BORDER_RADIUS.pill,
    backgroundColor: COLORS.secondary.light,
    color: COLORS.text.secondary,
    overflow: 'hidden',
    marginRight: SPACING.sm,
  },
  ratingText: { fontSize: 14, fontWeight: '600', color: COLORS.primary.main, marginRight: SPACING.sm },
  reviewCountText: { fontSize: 13, color: COLORS.text.tertiary },
  addressText: { fontSize: 13, color: COLORS.text.tertiary, marginBottom: 2 },
  phoneText: { fontSize: 13, color: COLORS.text.tertiary },
  phoneLink: { color: COLORS.text.tertiary },
  pausedBadge: {
    marginTop: SPACING.sm,
    alignSelf: 'flex-start',
    fontSize: 12,
    fontWeight: '700',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: BORDER_RADIUS.pill,
    backgroundColor: COLORS.functional.errorLight,
    color: COLORS.functional.error,
    overflow: 'hidden',
  },
  mapLink: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary.main,
  },

  // 탭
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: CARD_STYLE.borderColor,
    backgroundColor: COLORS.surface.primary,
  },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: COLORS.primary.main },
  tabText: { fontSize: 14, color: COLORS.text.tertiary },
  tabTextActive: { color: COLORS.primary.main, fontWeight: '700' },
  tabContent: {
    paddingHorizontal: SPACING.screen.horizontal,
    paddingBottom: SPACING.screen.horizontal,
  },

  // 메뉴 탭
  menuCategoryTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text.primary,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: CARD_STYLE.borderColor,
    marginBottom: SPACING.xs,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: SPACING.card.padding,
    borderBottomWidth: 1,
    borderBottomColor: CARD_STYLE.borderColor,
  },
  menuInfo: { flex: 1, marginRight: SPACING.md },
  menuName: { fontSize: 15, fontWeight: '600', color: COLORS.text.primary, marginBottom: SPACING.xs },
  menuDesc: { fontSize: 12, color: COLORS.text.tertiary, marginBottom: SPACING.xs, lineHeight: 17 },
  menuPrice: { fontSize: 14, fontWeight: '700', color: COLORS.text.primary },
  menuRight: { alignItems: 'center' },
  menuImage: { width: 72, height: 72, borderRadius: BORDER_RADIUS.md, marginBottom: SPACING.sm },
  qtyControls: { flexDirection: 'row', alignItems: 'center' },
  qtyButton: {
    width: 28,
    height: 28,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.neutral.grey200,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface.primary,
  },
  qtyButtonText: { fontSize: 16, fontWeight: '600', color: COLORS.text.primary },
  qtyText: {
    fontSize: 14,
    fontWeight: '600',
    minWidth: 20,
    textAlign: 'center',
    color: COLORS.text.primary,
    marginHorizontal: SPACING.sm,
  },
  addButton: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: BORDER_RADIUS.pill,
    backgroundColor: COLORS.primary.main,
    ...SHADOWS.cta,
  },
  addButtonDisabled: { opacity: 0.4 },
  addButtonText: { color: COLORS.text.white, fontSize: 13, fontWeight: '600' },

  // 정보 탭
  infoTab: { paddingTop: SPACING.lg },
  infoRow: {
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: CARD_STYLE.borderColor,
  },
  infoLabel: { fontSize: 13, fontWeight: '600', color: COLORS.text.secondary, marginBottom: SPACING.xs },
  infoValue: { fontSize: 14, color: COLORS.text.primary, lineHeight: 21 },

  // 리뷰 탭
  reviewCard: {
    paddingVertical: SPACING.card.padding,
    borderBottomWidth: 1,
    borderBottomColor: CARD_STYLE.borderColor,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  reviewUser: { fontSize: 14, fontWeight: '600', color: COLORS.text.primary },
  reviewRating: { fontSize: 13, fontWeight: '600', color: COLORS.primary.main },
  reviewSubRatings: { flexDirection: 'row', marginBottom: 6 },
  reviewSubRatingText: { fontSize: 12, color: COLORS.text.tertiary, marginRight: SPACING.md },
  reviewContent: { fontSize: 14, color: COLORS.text.primary, lineHeight: 21, marginBottom: SPACING.xs },
  reviewImages: { marginBottom: SPACING.sm },
  reviewImage: {
    width: 84,
    height: 84,
    borderRadius: BORDER_RADIUS.md,
    marginRight: SPACING.sm,
  },
  reviewReply: {
    backgroundColor: COLORS.neutral.light,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.xs,
  },
  reviewReplyLabel: { fontSize: 12, fontWeight: '700', color: COLORS.text.secondary, marginBottom: 4 },
  reviewReplyText: { fontSize: 13, color: COLORS.text.primary, lineHeight: 19 },
  reviewDate: { fontSize: 12, color: COLORS.text.tertiary },

  emptyText: { fontSize: 14, color: COLORS.text.tertiary, textAlign: 'center', padding: 40 },

  // 장바구니 바
  cartBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.screen.horizontal,
    backgroundColor: COLORS.surface.primary,
    borderTopWidth: 1,
    borderTopColor: CARD_STYLE.borderColor,
    ...SHADOWS.fab,
  },
  cartBarInner: {
    backgroundColor: COLORS.primary.main,
    borderRadius: BORDER_RADIUS.xxl,
    paddingVertical: 14,
    alignItems: 'center',
    ...SHADOWS.cta,
  },
  cartBarText: { color: COLORS.text.white, fontSize: 15, fontWeight: '700' },
});

const m = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    width: '100%',
    maxHeight: '80%',
    backgroundColor: COLORS.surface.primary,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    padding: SPACING.screen.horizontal,
    ...SHADOWS.large,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  menuName: { fontSize: 18, fontWeight: '700', color: COLORS.text.primary },
  closeButton: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  closeButtonText: { color: COLORS.text.tertiary, fontSize: 16 },
  basePrice: { fontSize: 13, color: COLORS.text.tertiary, marginBottom: SPACING.md },

  groupList: { marginBottom: SPACING.lg },
  group: { marginBottom: SPACING.lg },
  groupHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm },
  groupName: { fontSize: 15, fontWeight: '700', color: COLORS.text.primary, marginRight: SPACING.sm },
  requiredBadge: {
    fontSize: 11,
    fontWeight: '600',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: BORDER_RADIUS.pill,
    backgroundColor: COLORS.functional.errorLight,
    color: COLORS.functional.error,
    overflow: 'hidden',
  },
  optionalBadge: {
    fontSize: 11,
    fontWeight: '600',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: BORDER_RADIUS.pill,
    backgroundColor: COLORS.neutral.light,
    color: COLORS.text.tertiary,
    overflow: 'hidden',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm + 2,
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
  },
  optionRowChecked: { backgroundColor: COLORS.secondary.light },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: COLORS.neutral.grey200,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  checkboxOn: { backgroundColor: COLORS.primary.main, borderColor: COLORS.primary.main },
  checkboxMark: { fontSize: 12, color: COLORS.text.white },
  optionName: { flex: 1, fontSize: 14, color: COLORS.text.primary },
  optionPrice: { fontSize: 13, fontWeight: '600', color: COLORS.text.secondary },

  confirmButton: {
    backgroundColor: COLORS.primary.main,
    borderRadius: BORDER_RADIUS.xxl,
    paddingVertical: 14,
    alignItems: 'center',
    ...SHADOWS.cta,
  },
  confirmButtonDisabled: { opacity: 0.4 },
  confirmButtonText: { color: COLORS.text.white, fontSize: 15, fontWeight: '700' },
  hint: { textAlign: 'center', fontSize: 12, color: COLORS.functional.error, marginTop: SPACING.sm },
});

export default RestaurantDetailScreen;
