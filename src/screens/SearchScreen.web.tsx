import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  FlatList,
} from 'react-native';
import { useNavigate } from 'react-router-dom';
import { COLORS, SHADOWS, LAYOUT } from '../styles/colors';
import { TYPOGRAPHY } from '../styles/typography';
import { Icon } from '../components/Icon';
import { useMeetups } from '../hooks/useMeetups';
import { SEARCH_CATEGORIES, SEARCH_LOCATIONS, SORT_OPTION_NAMES } from '../constants/categories';
import { formatKoreanDateTime } from '../utils/dateUtils';

interface SearchScreenProps {
  navigation?: any;
  user?: any;
}

const SearchScreen: React.FC<SearchScreenProps> = ({ navigation, user }) => {
  const navigate = useNavigate();
  const [searchText, setSearchText] = useState('');
  const [selectedTab, setSelectedTab] = useState('내주변모임');
  const [selectedCategory, setSelectedCategory] = useState('전체');
  const [selectedLocation, setSelectedLocation] = useState('전체');
  const [selectedSort, setSelectedSort] = useState('최신순');
  
  const { meetups } = useMeetups();
  
  const tabs = ['내주변모임', '맛집리스트', '필터링'];

  const categories = SEARCH_CATEGORIES;
  const locations = SEARCH_LOCATIONS;
  const sortOptions = SORT_OPTION_NAMES;

  const filteredMeetups = meetups.filter(meetup => {
    const matchesSearch = meetup.title.toLowerCase().includes(searchText.toLowerCase()) ||
                         meetup.location.toLowerCase().includes(searchText.toLowerCase());
    const matchesCategory = selectedCategory === '전체' || meetup.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const renderTabButton = (title: string, selectedValue: string, onPress: (value: string) => void, options: string[]) => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabContainer}>
      {options.map((option) => (
        <TouchableOpacity
          key={option}
          style={[
            styles.tabButton,
            selectedValue === option && styles.selectedTabButton
          ]}
          onPress={() => onPress(option)}
        >
          <Text style={[
            styles.tabButtonText,
            selectedValue === option && styles.selectedTabButtonText
          ]}>
            {option}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const renderMeetupItem = (meetup: any) => (
    <TouchableOpacity
      style={styles.meetupCard}
      onPress={() => navigate(`/meetup/${meetup.id}`)}
    >
      <View style={styles.meetupHeader}>
        <View style={styles.meetupTitleSection}>
          <Text style={styles.meetupTitle} numberOfLines={2}>{meetup.title}</Text>
          <View style={styles.meetupMeta}>
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 4}}>
              <Icon name="map-pin" size={11} color={COLORS.text.secondary} />
              <Text style={styles.meetupLocation}>{meetup.location}</Text>
            </View>
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 4}}>
              <Icon name="clock" size={11} color={COLORS.text.secondary} />
              <Text style={styles.meetupTime}>
                {formatKoreanDateTime(meetup.date, 'datetime')}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.meetupStatus}>
          <Text style={styles.statusText}>모집중</Text>
          <Text style={styles.participantCount}>{meetup.currentParticipants}/{meetup.maxParticipants}</Text>
        </View>
      </View>
      
      <View style={styles.meetupFooter}>
        <View style={styles.hostInfo}>
          <View style={styles.hostAvatar}>
            <Text style={styles.hostInitial}>{meetup.hostName.charAt(0)}</Text>
          </View>
          <Text style={styles.hostName}>{meetup.hostName}</Text>
          <View style={{flexDirection: 'row', alignItems: 'center', gap: 2}}>
            <Icon name="star" size={11} color={COLORS.functional.warning} />
            <Text style={styles.hostRating}>4.8</Text>
          </View>
        </View>
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryBadgeText}>{meetup.category}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderRestaurantItem = (restaurant: any) => (
    <TouchableOpacity style={styles.restaurantCard}>
      <View style={styles.restaurantHeader}>
        <Text style={styles.restaurantName}>{restaurant.name}</Text>
        <View style={styles.restaurantRating}>
          <Icon name="star" size={12} color={COLORS.functional.warning} />
          <Text style={styles.ratingText}>{restaurant.rating}</Text>
        </View>
      </View>
      <Text style={styles.restaurantCategory}>{restaurant.category}</Text>
      <View style={styles.restaurantMeta}>
        <View style={{flexDirection: 'row', alignItems: 'center', gap: 4}}>
          <Icon name="map-pin" size={11} color={COLORS.text.secondary} />
          <Text style={styles.restaurantLocation}>{restaurant.location}</Text>
        </View>
        <View style={{flexDirection: 'row', alignItems: 'center', gap: 4}}>
          <Icon name="clock" size={11} color={COLORS.text.secondary} />
          <Text style={styles.restaurantHours}>{restaurant.hours}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderTabContent = () => {
    switch (selectedTab) {
      case '내주변모임':
        return (
          <FlatList
            data={filteredMeetups}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => renderMeetupItem(item)}
            style={styles.resultsList}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.resultsContainer}
          />
        );
      
      case '맛집리스트':
        const restaurants = [
          { id: 1, name: '맛있는 한식당', category: '한식', rating: 4.5, location: '강남구', hours: '11:00-22:00' },
          { id: 2, name: '이탈리안 레스토랑', category: '양식', rating: 4.3, location: '서초구', hours: '12:00-23:00' },
          { id: 3, name: '라멘 맛집', category: '일식', rating: 4.7, location: '송파구', hours: '11:30-21:30' },
        ];
        return (
          <FlatList
            data={restaurants}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => renderRestaurantItem(item)}
            style={styles.resultsList}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.resultsContainer}
          />
        );
      
      case '필터링':
        return (
          <ScrollView style={styles.filterContent}>
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>상세 필터</Text>
              
              <Text style={styles.filterLabel}>카테고리</Text>
              {renderTabButton('카테고리', selectedCategory, setSelectedCategory, categories)}
              
              <Text style={styles.filterLabel}>지역</Text>
              {renderTabButton('지역', selectedLocation, setSelectedLocation, locations)}
              
              <Text style={styles.filterLabel}>정렬</Text>
              {renderTabButton('정렬', selectedSort, setSelectedSort, sortOptions)}
              
              <TouchableOpacity style={styles.applyFilterButton}>
                <Text style={styles.applyFilterText}>필터 적용</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        );
      
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      {/* 검색바 */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Icon name="search" size={16} color="#5f6368" />
          <TextInput
            style={styles.searchInput}
            placeholder="모임 제목이나 장소를 검색해보세요"
            value={searchText}
            onChangeText={setSearchText}
            placeholderTextColor="#5f6368"
          />
        </View>
      </View>

      {/* 탭 네비게이션 */}
      <View style={styles.tabNavigation}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[
              styles.tabNavButton,
              selectedTab === tab && styles.selectedTabNavButton
            ]}
            onPress={() => setSelectedTab(tab)}
          >
            <Text style={[
              styles.tabNavButtonText,
              selectedTab === tab && styles.selectedTabNavButtonText
            ]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 검색 결과 */}
      {selectedTab === '내주변모임' && (
        <View style={styles.resultsHeader}>
          <Text style={styles.resultsCount}>총 {filteredMeetups.length}개의 모임</Text>
        </View>
      )}

      {renderTabContent()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
  },
  searchContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    height: LAYOUT.HEADER_HEIGHT,
    paddingHorizontal: LAYOUT.HEADER_PADDING_HORIZONTAL,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderBottomWidth: 0,
    justifyContent: 'center',
    ...SHADOWS.medium,
    shadowColor: 'rgba(0,0,0,0.05)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    borderWidth: 0,
    paddingHorizontal: 16,
    paddingVertical: 12,
    ...SHADOWS.small,
    shadowColor: 'rgba(0,0,0,0.04)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    ...TYPOGRAPHY.input,
    color: '#202124',
  },
  filtersSection: {
    paddingVertical: 16,
    paddingTop: LAYOUT.HEADER_HEIGHT + LAYOUT.CONTENT_TOP_MARGIN, // 고정 검색바 + 마진
  },
  filterLabel: {
    ...TYPOGRAPHY.card.subtitle,
    color: COLORS.text.primary,
    marginLeft: 16,
    marginBottom: 8,
    marginTop: 8,
  },
  tabContainer: {
    paddingHorizontal: 16,
  },
  tabButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  selectedTabButton: {
    backgroundColor: '#ede0c8',
    borderColor: '#ede0c8',
  },
  tabButtonText: {
    fontSize: 14,
    color: COLORS.text.secondary,
    fontWeight: '500',
  },
  selectedTabButtonText: {
    color: COLORS.text.white,
    fontWeight: '600',
  },
  resultsHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  resultsCount: {
    fontSize: 14,
    color: COLORS.text.secondary,
    fontWeight: '500',
  },
  resultsList: {
    flex: 1,
  },
  resultsContainer: {
    paddingBottom: 20,
  },
  meetupCard: {
    backgroundColor: COLORS.neutral.white,
    marginHorizontal: 0,
    marginTop: 0,
    padding: 16,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  meetupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  meetupTitleSection: {
    flex: 1,
    marginRight: 12,
  },
  meetupTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: 6,
    lineHeight: 22,
  },
  meetupMeta: {
    flexDirection: 'row',
    gap: 12,
  },
  meetupLocation: {
    fontSize: 12,
    color: '#718096',
    fontWeight: '500',
  },
  meetupTime: {
    fontSize: 12,
    color: '#718096',
    fontWeight: '500',
  },
  meetupStatus: {
    alignItems: 'flex-end',
  },
  statusText: {
    fontSize: 12,
    color: '#667eea',
    fontWeight: '600',
    marginBottom: 4,
  },
  participantCount: {
    fontSize: 12,
    color: '#718096',
    fontWeight: '500',
  },
  meetupFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  hostInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hostAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary.light,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  hostInitial: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.primary.main,
  },
  hostName: {
    fontSize: 12,
    color: COLORS.text.secondary,
    marginRight: 8,
  },
  hostRating: {
    fontSize: 12,
    color: COLORS.text.secondary,
  },
  categoryBadge: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  categoryBadgeText: {
    fontSize: 10,
    color: COLORS.text.secondary,
    fontWeight: '500',
  },
  tabNavigation: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderBottomWidth: 0,
    paddingTop: LAYOUT.HEADER_HEIGHT + LAYOUT.CONTENT_TOP_MARGIN,
    marginHorizontal: 16,
    borderRadius: 16,
    marginTop: 8,
    ...SHADOWS.small,
    shadowColor: 'rgba(0,0,0,0.04)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
  },
  tabNavButton: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 12,
    marginHorizontal: 4,
    marginVertical: 4,
  },
  selectedTabNavButton: {
    backgroundColor: COLORS.primary.main,
    ...SHADOWS.small,
  },
  tabNavButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text.secondary,
  },
  selectedTabNavButtonText: {
    color: COLORS.text.white,
    fontWeight: '600',
  },
  restaurantCard: {
    backgroundColor: COLORS.neutral.white,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  restaurantHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  restaurantName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    flex: 1,
  },
  restaurantRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 12,
    color: COLORS.text.secondary,
    fontWeight: '500',
  },
  restaurantCategory: {
    fontSize: 12,
    color: COLORS.primary.main,
    fontWeight: '500',
    marginBottom: 8,
  },
  restaurantMeta: {
    flexDirection: 'row',
    gap: 16,
  },
  restaurantLocation: {
    fontSize: 12,
    color: COLORS.text.secondary,
  },
  restaurantHours: {
    fontSize: 12,
    color: COLORS.text.secondary,
  },
  filterContent: {
    flex: 1,
  },
  filterSection: {
    padding: 16,
  },
  filterSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginBottom: 20,
  },
  applyFilterButton: {
    backgroundColor: COLORS.primary.main,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
    ...SHADOWS.medium,
  },
  applyFilterText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.white,
  },
});

export default SearchScreen;