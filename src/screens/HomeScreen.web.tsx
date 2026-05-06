import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
} from 'react-native';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { NotificationBell } from '../components/NotificationBell';
import CreateMeetupWizard from './CreateMeetupWizard.web';
import NeighborhoodSelector from '../components/NeighborhoodSelector';
import locationService from '../services/locationService';
import { useUserStore } from '../store/userStore';
import { useMeetupStore } from '../store/meetupStore';
import { FOOD_CATEGORIES } from '../constants/categories';
import { useMeetups } from '../hooks/useMeetups';
import advertisementApiService, { Advertisement } from '../services/advertisementApiService';

interface HomeScreenProps {
  navigateToLogin?: () => void;
  navigation?: any;
  user?: any;
}

// 시간 경과 텍스트 헬퍼
const getTimeAgo = (dateStr: string): string => {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return '방금 전 대화';
  if (minutes < 60) return `${minutes}분 전 대화`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전 대화`;
  const days = Math.floor(hours / 24);
  return `${days}일 전 대화`;
};

const HomeScreen: React.FC<HomeScreenProps> = ({ navigateToLogin, navigation, user: propUser }) => {
  const navigate = useNavigate();
  const { updateNeighborhood, user } = useUserStore();
  const { meetups, fetchHomeMeetups } = useMeetupStore();
  const { searchMeetups, meetups: searchResults, loading: searchLoading } = useMeetups();
  const [showCreateMeetup, setShowCreateMeetup] = useState(false);
  const [showNeighborhoodSelector, setShowNeighborhoodSelector] = useState(false);
  const [currentNeighborhood, setCurrentNeighborhood] = useState<{ district: string; neighborhood: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [fabHovered, setFabHovered] = useState(false);
  const [fabPressed, setFabPressed] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const [hoveredCategoryId, setHoveredCategoryId] = useState<string | null>(null);

  // 배너 광고
  const [bannerAds, setBannerAds] = useState<Advertisement[]>([]);
  const [currentAdIndex, setCurrentAdIndex] = useState(0);

  const handleMeetupClick = useCallback((meetup: any) => {
    const meetupId = typeof meetup === 'string' ? meetup : meetup.id;
    navigate(`/meetup/${meetupId}`);
  }, [navigate]);

  useEffect(() => {
    loadSavedNeighborhood();
    setFetchError(false);
    fetchHomeMeetups()
      .catch(() => setFetchError(true))
      .finally(() => setIsLoading(false));
    // 배너 광고 로드
    advertisementApiService.getActiveAdvertisements('home_banner')
      .then(ads => setBannerAds(ads))
      .catch(() => {});
  }, []);

  // 배너 자동 순환 (5초)
  useEffect(() => {
    if (bannerAds.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentAdIndex(prev => (prev + 1) % bannerAds.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [bannerAds.length]);

  const loadSavedNeighborhood = () => {
    const saved = locationService.getUserNeighborhood();
    if (saved) {
      setCurrentNeighborhood(saved);
    } else {
      setCurrentNeighborhood({ district: '강남구', neighborhood: '역삼동' });
    }
  };

  const handleNeighborhoodSelect = (district: string, neighborhood: string) => {
    const newNeighborhood = { district, neighborhood };
    setCurrentNeighborhood(newNeighborhood);
    locationService.saveUserNeighborhood(district, neighborhood);
    updateNeighborhood(district, neighborhood);
  };

  const handleSearchSubmit = () => {
    if (searchQuery.trim()) {
      navigate(`/ai-search?q=${encodeURIComponent(searchQuery)}&autoSearch=true`);
    }
  };

  const handleSearchInput = (text: string) => {
    setSearchQuery(text);
  };

  const handleKeyPress = (e: any) => {
    if (e.key === 'Enter' || e.nativeEvent?.key === 'Enter') {
      e.preventDefault();
      handleSearchSubmit();
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
  };

  const openNeighborhoodSelector = () => {
    setShowNeighborhoodSelector(true);
  };

  const handleRetry = () => {
    setIsLoading(true);
    setFetchError(false);
    fetchHomeMeetups()
      .catch(() => setFetchError(true))
      .finally(() => setIsLoading(false));
  };

  // ---- Meetup data classification ----
  const now = new Date();

  const soonMeetups = meetups
    .filter((m) => {
      if (!m.date) return false;
      const meetupDate = new Date(m.date);
      const diffMs = meetupDate.getTime() - now.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      return diffHours > -2 && diffHours < 48 && m.status === 'recruiting';
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 6);

  const newMeetups = [...meetups]
    .sort((a, b) => {
      const aTime = new Date(a.createdAt || a.updatedAt).getTime();
      const bTime = new Date(b.createdAt || b.updatedAt).getTime();
      return bTime - aTime;
    })
    .slice(0, 6);

  // ---- Meetup List Item Component ----
  const MeetupListItem = ({ meetup }: { meetup: any }) => {
    const [hovered, setHovered] = useState(false);
    const imageUrl = meetup.image || meetup.restaurant_image || '/categories/korean.png';
    const location = meetup.location || meetup.restaurant_name || '';
    const currentCount = meetup.currentMembers || meetup.current_members || 1;
    const maxCount = meetup.maxMembers || meetup.max_members || 4;
    const timeAgo = getTimeAgo(meetup.updatedAt || meetup.createdAt);
    const description = meetup.description || meetup.restaurant_name || '';

    return (
      <div
        onClick={() => handleMeetupClick(meetup)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 18,
          paddingLeft: 20,
          paddingRight: 20,
          cursor: 'pointer',
          backgroundColor: hovered ? '#FAFAFA' : 'transparent',
          transition: 'background-color 150ms ease',
        }}
      >
        <img
          src={imageUrl}
          alt={meetup.title || ''}
          style={{
            width: 70,
            height: 70,
            borderRadius: 16,
            objectFit: 'cover',
            flexShrink: 0,
            backgroundColor: '#F5F5F5',
          }}
        />
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          flex: 1,
          minWidth: 0,
        }}>
          {/* Row 1: Title */}
          <div style={{
            fontSize: 16,
            fontWeight: 600,
            color: '#121212',
            lineHeight: '22px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {meetup.title || ''}
          </div>
          {/* Row 2: Description */}
          <div style={{
            fontSize: 14,
            fontWeight: 400,
            color: '#293038',
            lineHeight: '20px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {description}
          </div>
          {/* Row 3: Meta */}
          <div style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            fontSize: 14,
            fontWeight: 400,
            lineHeight: '20px',
          }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: '#878B94' }}>
              <Icon name="map-pin" size={13} color="#878B94" />
              <span style={{
                maxWidth: 100,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {location}
              </span>
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: '#878B94' }}>
              <Icon name="users" size={13} color="#878B94" />
              {currentCount}/{maxCount}
            </span>
            {timeAgo && (
              <>
                <span style={{ color: '#878B94' }}>|</span>
                <span style={{ color: '#121212' }}>{timeAgo}</span>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ---- Skeleton list item ----
  const SkeletonListItem = () => (
    <div style={{
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 18,
      paddingLeft: 20,
      paddingRight: 20,
    }}>
      <div style={{
        width: 70,
        height: 70,
        borderRadius: 16,
        backgroundColor: '#F5F5F5',
        animation: 'pulse 1.5s ease-in-out infinite',
      }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
        <div style={{ width: '60%', height: 16, borderRadius: 4, backgroundColor: '#F5F5F5' }} />
        <div style={{ width: '80%', height: 14, borderRadius: 4, backgroundColor: '#F5F5F5' }} />
        <div style={{ width: '50%', height: 14, borderRadius: 4, backgroundColor: '#F5F5F5' }} />
      </div>
    </div>
  );

  return (
    <View style={styles.container}>
      {/* ===== Header ===== */}
      <div style={{
        backgroundColor: '#FFFFFF',
        zIndex: 10,
        position: 'sticky' as any,
        top: 0,
        borderBottom: '1px solid rgba(17,17,17,0.06)',
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingLeft: 20,
          paddingRight: 20,
          height: 56,
        }}>
          {/* Location */}
          <TouchableOpacity
            style={[styles.locationButton, { cursor: 'pointer' } as any]}
            onPress={openNeighborhoodSelector}
            accessibilityLabel="동네 변경"
          >
            <Text style={styles.locationText}>
              {currentNeighborhood
                ? `${currentNeighborhood.neighborhood}`
                : '신도림역[2호선] 3번출구'}
            </Text>
            <Icon name="chevron-down" size={16} color="#121212" />
          </TouchableOpacity>

          {/* Bell */}
          <NotificationBell
            userId={user?.id?.toString()}
            onPress={() => {
              if (navigation?.navigateToNotifications) {
                navigation.navigateToNotifications();
              } else if (navigation?.navigate) {
                navigation.navigate('Notifications');
              }
            }}
            color="#121212"
            size={24}
          />
        </div>
      </div>

      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={100}
      >
        {/* ===== Search Bar ===== */}
        <div style={{
          paddingLeft: 20,
          paddingRight: 20,
          paddingTop: 16,
          paddingBottom: 16,
        }}>
          <div style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            height: 44,
            backgroundColor: '#FFFFFF',
            borderRadius: 22,
            paddingLeft: 20,
            paddingRight: 16,
            border: '1px solid #F5F5F5',
            boxShadow: '0 1px 4px rgba(17,17,17,0.04)',
          }}>
            <TextInput
              style={styles.searchInput}
              placeholder="매장을 검색해보세요"
              placeholderTextColor="#7E8082"
              value={searchQuery}
              onChangeText={handleSearchInput}
              onKeyPress={handleKeyPress}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              aria-label="매장 검색"
            />
            {searchQuery.length > 0 ? (
              <TouchableOpacity onPress={clearSearch} style={{ padding: 4 }}>
                <Icon name="x" size={16} color="#878B94" />
              </TouchableOpacity>
            ) : (
              <Icon name="search" size={20} color="#878B94" />
            )}
          </div>
        </div>

        {/* ===== Category Grid (4x2) ===== */}
        <div style={{
          padding: '8px 20px 24px 20px',
          overflow: 'visible',
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '20px 0',
            width: '100%',
            boxSizing: 'border-box' as any,
            overflow: 'visible',
          }}>
            {FOOD_CATEGORIES.map((category) => (
              <div
                key={category.id}
                onClick={() => navigate(`/explore?category=${encodeURIComponent(category.name)}`)}
                onMouseEnter={() => setHoveredCategoryId(category.id)}
                onMouseLeave={() => setHoveredCategoryId(null)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 8,
                  cursor: 'pointer',
                  transition: 'transform 150ms ease',
                  transform: hoveredCategoryId === category.id ? 'scale(1.06)' : 'none',
                  overflow: 'visible',
                }}
                role="button"
                aria-label={category.name}
              >
                <div style={{
                  width: 64,
                  height: 64,
                  borderRadius: 9999,
                  overflow: 'hidden',
                  backgroundColor: '#F5F5F5',
                  flexShrink: 0,
                  boxShadow: hoveredCategoryId === category.id
                    ? '0 4px 12px rgba(17,17,17,0.12)'
                    : 'none',
                  transition: 'box-shadow 150ms ease',
                }}>
                  <img
                    src={category.image}
                    alt={category.name}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                  />
                </div>
                <span style={{
                  fontSize: 13,
                  fontWeight: 600,
                  lineHeight: '18px',
                  color: '#2D2E2F',
                  textAlign: 'center',
                  whiteSpace: 'nowrap',
                }}>
                  {category.name}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ===== 배너 광고 ===== */}
        <div style={{
          marginLeft: 20,
          marginRight: 20,
          marginBottom: 28,
        }}>
          {bannerAds.length > 0 ? (
            <div
              onClick={() => {
                const ad = bannerAds[currentAdIndex];
                if (!ad) return;
                advertisementApiService.recordClick(ad.id).catch(() => {});
                if (ad.useDetailPage) {
                  navigate(`/advertisement/${ad.id}`);
                } else if (ad.linkUrl) {
                  if (ad.linkUrl.startsWith('http')) {
                    window.open(ad.linkUrl, '_blank');
                  } else {
                    navigate(ad.linkUrl);
                  }
                }
              }}
              style={{
                height: 86,
                borderRadius: 20,
                overflow: 'hidden',
                position: 'relative',
                cursor: 'pointer',
              }}
            >
              <img
                src={bannerAds[currentAdIndex]?.imageUrl?.startsWith('http')
                  ? bannerAds[currentAdIndex].imageUrl
                  : `${process.env.REACT_APP_API_URL || ''}/uploads${bannerAds[currentAdIndex]?.imageUrl || ''}`
                }
                alt={bannerAds[currentAdIndex]?.title || '광고'}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
              {/* 오버레이 텍스트 */}
              <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                padding: '8px 16px',
                background: 'linear-gradient(transparent, rgba(0,0,0,0.5))',
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'space-between',
              }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>
                  {bannerAds[currentAdIndex]?.title}
                </span>
                {bannerAds.length > 1 && (
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)' }}>
                    {currentAdIndex + 1}/{bannerAds.length}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div
              onClick={() => navigate('/create')}
              style={{
                height: 86,
                borderRadius: 20,
                background: 'linear-gradient(135deg, #FFA529 0%, #FF8C00 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                cursor: 'pointer',
              }}
            >
              <span style={{ fontSize: 15, fontWeight: 600, color: '#fff' }}>
                지금 바로 매장을 검색해보세요!
              </span>
            </div>
          )}
        </div>

        {/* ===== Section 1: 바로 참여할 수 있는 번개 ===== */}
        {(isLoading || soonMeetups.length > 0) && (
          <div style={{
            paddingBottom: 28,
            backgroundColor: '#FFFFFF',
          }}>
            {/* Section title */}
            <div style={{
              paddingLeft: 20,
              paddingRight: 20,
              paddingBottom: 20,
            }}>
              <span style={{
                fontSize: 16,
                fontWeight: 600,
                color: '#121212',
                lineHeight: '22px',
              }}>
                바로 참여할 수 있는 번개
              </span>
            </div>

            {/* List items */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {isLoading ? (
                <>
                  <SkeletonListItem />
                  <SkeletonListItem />
                  <SkeletonListItem />
                </>
              ) : fetchError ? (
                <div style={{
                  padding: 20,
                  textAlign: 'center',
                  color: '#878B94',
                  fontSize: 14,
                }}>
                  <span>불러오기에 실패했어요</span>
                  <div
                    onClick={handleRetry}
                    style={{
                      marginTop: 8,
                      color: '#FFA529',
                      cursor: 'pointer',
                      fontWeight: 600,
                    }}
                  >
                    다시 시도
                  </div>
                </div>
              ) : (
                soonMeetups.map((meetup) => {
                  if (!meetup.id) return null;
                  return <MeetupListItem key={meetup.id} meetup={meetup} />;
                })
              )}
            </div>
          </div>
        )}

        {/* ===== Section 2: 오늘은 걸스나잇 ===== */}
        {(isLoading || newMeetups.length > 0) && (
          <div style={{
            paddingTop: 28,
            paddingBottom: 28,
            backgroundColor: '#FFFFFF',
          }}>
            {/* Section title */}
            <div style={{
              paddingLeft: 20,
              paddingRight: 20,
              paddingBottom: 20,
            }}>
              <span style={{
                fontSize: 16,
                fontWeight: 600,
                color: '#121212',
                lineHeight: '22px',
              }}>
                오늘은 걸스나잇
              </span>
            </div>

            {/* List items */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {isLoading ? (
                <>
                  <SkeletonListItem />
                  <SkeletonListItem />
                  <SkeletonListItem />
                </>
              ) : fetchError ? (
                <div style={{
                  padding: 20,
                  textAlign: 'center',
                  color: '#878B94',
                  fontSize: 14,
                }}>
                  <span>불러오기에 실패했어요</span>
                  <div
                    onClick={handleRetry}
                    style={{
                      marginTop: 8,
                      color: '#FFA529',
                      cursor: 'pointer',
                      fontWeight: 600,
                    }}
                  >
                    다시 시도
                  </div>
                </div>
              ) : (
                newMeetups.map((meetup) => {
                  if (!meetup.id) return null;
                  return <MeetupListItem key={meetup.id} meetup={meetup} />;
                })
              )}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !fetchError && meetups.length === 0 && (
          <div style={{
            padding: 40,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 12,
          }}>
            <span style={{ fontSize: 48 }}>&#x1F37D;</span>
            <span style={{
              fontSize: 16,
              fontWeight: 600,
              color: '#121212',
            }}>
              아직 등록된 매장이 없어요
            </span>
            <span style={{
              fontSize: 14,
              color: '#878B94',
            }}>
              주변 맛집을 검색해보세요!
            </span>
            <div
              onClick={() => setShowCreateMeetup(true)}
              style={{
                marginTop: 8,
                paddingTop: 10,
                paddingBottom: 10,
                paddingLeft: 24,
                paddingRight: 24,
                backgroundColor: '#FFA529',
                borderRadius: 20,
                color: '#FFFFFF',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              매장 검색하기
            </div>
          </div>
        )}

        {/* Bottom spacing for FAB + bottom nav */}
        <View style={{ height: 120 }} />
      </ScrollView>

      {/* ===== FAB Button (57x57 circle, orange, + icon) ===== */}
      <div
        onClick={() => setShowCreateMeetup(true)}
        onMouseEnter={() => setFabHovered(true)}
        onMouseLeave={() => { setFabHovered(false); setFabPressed(false); }}
        onMouseDown={() => setFabPressed(true)}
        onMouseUp={() => setFabPressed(false)}
        style={{
          position: 'fixed',
          bottom: 100,
          right: 20,
          width: 57,
          height: 57,
          borderRadius: 9999,
          backgroundColor: '#FFA529',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: fabHovered
            ? '0 8px 24px rgba(255,165,41,0.35)'
            : '0 4px 16px rgba(255,165,41,0.3)',
          cursor: 'pointer',
          zIndex: 1000,
          transition: 'all 200ms ease',
          transform: fabPressed ? 'scale(0.93)' : fabHovered ? 'scale(1.05)' : 'none',
        }}
        role="button"
        aria-label="매장 검색"
      >
        <Icon name="plus" size={26} color="#FFFFFF" />
      </div>

      {/* ===== Modals ===== */}
      <Modal
        visible={showCreateMeetup}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <CreateMeetupWizard
          user={user}
          onClose={() => setShowCreateMeetup(false)}
        />
      </Modal>

      <NeighborhoodSelector
        visible={showNeighborhoodSelector}
        onClose={() => setShowNeighborhoodSelector(false)}
        onSelect={handleNeighborhoodSelect}
        currentNeighborhood={currentNeighborhood}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    overflow: 'visible' as any,
  },
  scrollView: {
    flex: 1,
    overflow: 'visible' as any,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 44,
  },
  locationText: {
    fontSize: 16,
    fontWeight: '600' as any,
    color: '#121212',
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500' as any,
    lineHeight: 20,
    color: '#121212',
    borderWidth: 0,
    backgroundColor: 'transparent',
    outlineStyle: 'none',
  },
});

export default HomeScreen;
