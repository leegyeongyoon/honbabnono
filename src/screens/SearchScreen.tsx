import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
} from 'react-native';
import {COLORS, SHADOWS} from '../styles/colors';
import {useMeetups} from '../hooks/useMeetups';
import MealPreferenceSelector from '../components/MealPreferenceSelector';
import { MealPreferences } from '../types/mealPreferences';

interface SearchScreenProps {
  navigation?: any;
  route?: any;
}

const SearchScreen: React.FC<SearchScreenProps> = ({ navigation, route }) => {
  const { meetups } = useMeetups();
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(route?.params?.category || '');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [mealPreferences, setMealPreferences] = useState<MealPreferences>({
    dietary: [],
    style: [],
    restriction: [],
    atmosphere: []
  });

  const categories = [
    {id: 1, name: '한식', emoji: '🍚'},
    {id: 2, name: '중식', emoji: '🥟'},
    {id: 3, name: '일식', emoji: '🍣'},
    {id: 4, name: '양식', emoji: '🍝'},
    {id: 5, name: '카페', emoji: '☕'},
    {id: 6, name: '술집', emoji: '🍻'},
  ];

  const locations = [
    '강남역',
    '홍대입구역',
    '신촌역',
    '명동역',
    '이태원역',
    '건대입구역',
  ];

  // 필터링된 모임 목록
  const filteredMeetups = meetups.filter(meetup => {
    const matchesSearch = !searchText || 
      meetup.title.toLowerCase().includes(searchText.toLowerCase()) ||
      meetup.location.toLowerCase().includes(searchText.toLowerCase());
    
    const matchesCategory = !selectedCategory || meetup.category === selectedCategory;
    const matchesLocation = !selectedLocation || meetup.location.includes(selectedLocation);
    
    // 식사성향 필터링
    const hasMatchingPreferences = Object.entries(mealPreferences).every(([category, selectedIds]) => {
      if (selectedIds.length === 0) return true;
      const meetupPrefs = meetup.mealPreferences[category as keyof MealPreferences] || [];
      return selectedIds.some(id => meetupPrefs.includes(id));
    });
    
    return matchesSearch && matchesCategory && matchesLocation && hasMatchingPreferences;
  });

  return (
    <ScrollView style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="안전한 모임을 찾아보세요"
          value={searchText}
          onChangeText={setSearchText}
        />
        <TouchableOpacity style={styles.searchButton}>
          <Text style={styles.searchButtonText}>🔍</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🍽️ 음식 카테고리</Text>
        <View style={styles.categoryGrid}>
          {categories.map(category => (
            <TouchableOpacity 
              key={category.id} 
              style={[
                styles.categoryItem,
                selectedCategory === category.name && styles.selectedCategoryItem
              ]}
              onPress={() => {
                setSelectedCategory(selectedCategory === category.name ? '' : category.name);
              }}
            >
              <Text style={styles.categoryEmoji}>{category.emoji}</Text>
              <Text style={styles.categoryName}>{category.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>📍 인기 지역</Text>
          <TouchableOpacity 
            style={styles.filterToggle}
            onPress={() => setShowFilters(!showFilters)}
          >
            <Text style={styles.filterToggleText}>
              {showFilters ? '필터 숨기기' : '상세 필터'} {showFilters ? '⬆️' : '⬇️'}
            </Text>
          </TouchableOpacity>
        </View>
        <View style={styles.locationGrid}>
          {locations.map((location, index) => (
            <TouchableOpacity 
              key={index} 
              style={[
                styles.locationItem,
                selectedLocation === location && styles.selectedLocationItem
              ]}
              onPress={() => {
                setSelectedLocation(selectedLocation === location ? '' : location);
              }}
            >
              <Text style={[
                styles.locationText,
                selectedLocation === location && styles.selectedLocationText
              ]}>
                {location}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* 상세 필터 섹션 */}
      {showFilters && (
        <View style={styles.section}>
          <MealPreferenceSelector
            selectedPreferences={mealPreferences}
            onPreferencesChange={setMealPreferences}
            title="🍽️ 식사 성향 필터"
          />
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🕐 시간대별</Text>
        <View style={styles.timeGrid}>
          <TouchableOpacity style={styles.timeItem}>
            <Text style={styles.timeText}>아침 (7-11시)</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.timeItem}>
            <Text style={styles.timeText}>점심 (11-15시)</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.timeItem}>
            <Text style={styles.timeText}>저녁 (17-21시)</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.timeItem}>
            <Text style={styles.timeText}>야식 (21-24시)</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 검색 결과 섹션 */}
      {(searchText || selectedCategory) && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            🔍 검색 결과 ({filteredMeetups.length}개)
          </Text>
          {filteredMeetups.length > 0 ? (
            filteredMeetups.map(meetup => (
              <TouchableOpacity 
                key={meetup.id} 
                style={styles.meetupCard}
                onPress={() => navigation?.navigate('MeetupDetail', { meetupId: meetup.id })}
              >
                <Image source={{uri: meetup.image}} style={styles.meetupImage} />
                <View style={styles.meetupInfo}>
                  <Text style={styles.meetupTitle}>{meetup.title}</Text>
                  <Text style={styles.meetupLocation}>📍 {meetup.location}</Text>
                  <Text style={styles.meetupTime}>🕐 {meetup.date} {meetup.time}</Text>
                  <Text style={styles.meetupParticipants}>
                    👥 {meetup.currentParticipants}/{meetup.maxParticipants}명
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyResult}>
              <Text style={styles.emptyResultText}>검색 결과가 없습니다</Text>
              <Text style={styles.emptyResultSubtext}>다른 키워드로 검색해보세요</Text>
            </View>
          )}
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🛡️ 안전한 모임을 위한 수칙</Text>
        <View style={styles.safetyContainer}>
          <Text style={styles.safetyItem}>• 첫 만남은 공개된 장소에서</Text>
          <Text style={styles.safetyItem}>• 개인정보는 신중하게 공유</Text>
          <Text style={styles.safetyItem}>• 불편한 상황 시 즉시 신고</Text>
          <Text style={styles.safetyItem}>• 음주는 적당히, 안전 우선</Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.neutral.background,
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 20,
    backgroundColor: COLORS.neutral.white,
    marginBottom: 10,
    ...SHADOWS.small,
  },
  searchInput: {
    flex: 1,
    height: 50,
    borderWidth: 1,
    borderColor: COLORS.primary.light,
    borderRadius: 25,
    paddingHorizontal: 20,
    fontSize: 16,
    backgroundColor: COLORS.secondary.light,
    color: COLORS.text.primary,
  },
  searchButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.primary.main,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
    ...SHADOWS.medium,
  },
  searchButtonText: {
    fontSize: 20,
  },
  section: {
    backgroundColor: COLORS.neutral.white,
    marginBottom: 10,
    padding: 20,
    ...SHADOWS.small,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: COLORS.text.primary,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  categoryItem: {
    width: '30%',
    backgroundColor: COLORS.secondary.light,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 10,
    ...SHADOWS.small,
  },
  categoryEmoji: {
    fontSize: 30,
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text.primary,
  },
  selectedCategoryItem: {
    backgroundColor: COLORS.primary.main,
  },
  locationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  locationItem: {
    width: '48%',
    backgroundColor: COLORS.secondary.warm,
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    marginBottom: 10,
    ...SHADOWS.small,
  },
  locationText: {
    fontSize: 16,
    color: COLORS.text.primary,
    fontWeight: '500',
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  timeItem: {
    width: '48%',
    backgroundColor: COLORS.primary.light,
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    marginBottom: 10,
    ...SHADOWS.small,
  },
  timeText: {
    fontSize: 14,
    color: COLORS.text.primary,
    fontWeight: '500',
  },
  safetyContainer: {
    backgroundColor: COLORS.secondary.light,
    borderRadius: 12,
    padding: 15,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary.main,
  },
  safetyItem: {
    fontSize: 14,
    color: COLORS.text.primary,
    lineHeight: 22,
    marginBottom: 5,
  },
  meetupCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.secondary.light,
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    ...SHADOWS.small,
  },
  meetupImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 15,
  },
  meetupInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  meetupTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginBottom: 5,
  },
  meetupLocation: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginBottom: 2,
  },
  meetupTime: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginBottom: 2,
  },
  meetupParticipants: {
    fontSize: 14,
    color: COLORS.primary.dark,
    fontWeight: '500',
  },
  emptyResult: {
    alignItems: 'center',
    padding: 40,
  },
  emptyResultText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text.secondary,
    marginBottom: 8,
  },
  emptyResultSubtext: {
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  filterToggle: {
    backgroundColor: COLORS.primary.light,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  filterToggleText: {
    fontSize: 12,
    color: COLORS.primary.dark,
    fontWeight: '600',
  },
  selectedLocationItem: {
    backgroundColor: COLORS.primary.main,
  },
  selectedLocationText: {
    color: COLORS.text.white,
    fontWeight: 'bold',
  },
});

export default SearchScreen;