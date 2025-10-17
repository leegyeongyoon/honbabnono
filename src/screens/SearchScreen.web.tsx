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
import { COLORS, SHADOWS, LAYOUT } from '../styles/colors';
import { TYPOGRAPHY } from '../styles/typography';
import { Icon } from '../components/Icon';
import { useMeetups } from '../hooks/useMeetups';

interface SearchScreenProps {
  navigation?: any;
  user?: any;
}

const SearchScreen: React.FC<SearchScreenProps> = ({ navigation, user }) => {
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('전체');
  const [selectedLocation, setSelectedLocation] = useState('전체');
  const [selectedSort, setSelectedSort] = useState('최신순');
  
  const { meetups } = useMeetups();

  const categories = ['전체', '한식', '중식', '일식', '양식', '카페', '술집'];
  const locations = ['전체', '강남구', '서초구', '송파구', '마포구', '용산구'];
  const sortOptions = ['최신순', '인기순', '마감임박순', '가격순'];

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
      onPress={() => navigation?.navigate('MeetupDetail', { meetupId: meetup.id })}
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
              <Text style={styles.meetupTime}>{meetup.date} {meetup.time}</Text>
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

      {/* 필터 탭들 */}
      <View style={styles.filtersSection}>
        <Text style={styles.filterLabel}>카테고리</Text>
        {renderTabButton('카테고리', selectedCategory, setSelectedCategory, categories)}
        
        <Text style={styles.filterLabel}>지역</Text>
        {renderTabButton('지역', selectedLocation, setSelectedLocation, locations)}
        
        <Text style={styles.filterLabel}>정렬</Text>
        {renderTabButton('정렬', selectedSort, setSelectedSort, sortOptions)}
      </View>

      {/* 검색 결과 */}
      <View style={styles.resultsHeader}>
        <Text style={styles.resultsCount}>총 {filteredMeetups.length}개의 모임</Text>
      </View>

      <FlatList
        data={filteredMeetups}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => renderMeetupItem(item)}
        style={styles.resultsList}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.resultsContainer}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    height: LAYOUT.HEADER_HEIGHT,
    paddingHorizontal: LAYOUT.HEADER_PADDING_HORIZONTAL,
    backgroundColor: '#ede0c8',
    borderBottomWidth: 1,
    borderBottomColor: '#ebe7dc',
    justifyContent: 'center',
    ...SHADOWS.small,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e8eaed',
    paddingHorizontal: 16,
    paddingVertical: 12,
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
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginBottom: 6,
    lineHeight: 22,
  },
  meetupMeta: {
    flexDirection: 'row',
    gap: 12,
  },
  meetupLocation: {
    fontSize: 12,
    color: COLORS.text.secondary,
  },
  meetupTime: {
    fontSize: 12,
    color: COLORS.text.secondary,
  },
  meetupStatus: {
    alignItems: 'flex-end',
  },
  statusText: {
    fontSize: 12,
    color: COLORS.primary.main,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  participantCount: {
    fontSize: 12,
    color: COLORS.text.secondary,
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
});

export default SearchScreen;