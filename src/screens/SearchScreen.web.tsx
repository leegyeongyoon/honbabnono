import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import {COLORS, SHADOWS} from '../styles/colors';

const SearchScreen = () => {
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedTime, setSelectedTime] = useState('');

  const categories = [
    {id: 1, name: '한식', emoji: '🍚', color: '#FF6B6B'},
    {id: 2, name: '중식', emoji: '🥟', color: '#4ECDC4'},
    {id: 3, name: '일식', emoji: '🍣', color: '#45B7D1'},
    {id: 4, name: '양식', emoji: '🍝', color: '#96CEB4'},
    {id: 5, name: '카페', emoji: '☕', color: '#FFEAA7'},
    {id: 6, name: '술집', emoji: '🍻', color: '#DDA0DD'},
  ];

  const locations = [
    {name: '강남역', icon: '🏢', popular: true},
    {name: '홍대입구역', icon: '🎭', popular: true},
    {name: '신촌역', icon: '🎓', popular: false},
    {name: '명동역', icon: '🛍️', popular: true},
    {name: '이태원역', icon: '🌍', popular: false},
    {name: '건대입구역', icon: '🎪', popular: false},
  ];

  const timeSlots = [
    {id: 1, name: '아침', time: '7-11시', emoji: '🌅', period: 'morning'},
    {id: 2, name: '점심', time: '11-15시', emoji: '☀️', period: 'lunch'},
    {id: 3, name: '저녁', time: '17-21시', emoji: '🌆', period: 'dinner'},
    {id: 4, name: '야식', time: '21-24시', emoji: '🌙', period: 'night'},
  ];

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>모임 찾기</Text>
          <Text style={styles.headerSubtitle}>원하는 조건으로 완벽한 모임을 찾아보세요</Text>
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* 검색 바 */}
        <View style={styles.searchSection}>
          <View style={styles.searchContainer}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="모임 제목이나 키워드를 검색해보세요"
              placeholderTextColor={COLORS.text.secondary}
              value={searchText}
              onChangeText={setSearchText}
            />
            {searchText.length > 0 && (
              <TouchableOpacity 
                style={styles.clearButton}
                onPress={() => setSearchText('')}
              >
                <Text style={styles.clearButtonText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* 음식 카테고리 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🍽️ 음식 카테고리</Text>
            <Text style={styles.sectionSubtitle}>어떤 음식이 끌리시나요?</Text>
          </View>
          <View style={styles.categoryGrid}>
            {categories.map(category => (
              <TouchableOpacity 
                key={category.id} 
                style={[
                  styles.categoryCard,
                  selectedCategory === category.name && styles.selectedCategoryCard
                ]}
                onPress={() => {
                  setSelectedCategory(selectedCategory === category.name ? '' : category.name);
                }}
              >
                <View style={[styles.categoryIconContainer, {backgroundColor: category.color + '20'}]}>
                  <Text style={styles.categoryEmoji}>{category.emoji}</Text>
                </View>
                <Text style={[
                  styles.categoryName,
                  selectedCategory === category.name && styles.selectedCategoryName
                ]}>{category.name}</Text>
                {selectedCategory === category.name && (
                  <View style={styles.selectedIndicator}>
                    <Text style={styles.selectedIndicatorText}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 인기 지역 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>📍 지역 선택</Text>
            <Text style={styles.sectionSubtitle}>어디서 만나시겠어요?</Text>
          </View>
          <View style={styles.locationGrid}>
            {locations.map((location, index) => (
              <TouchableOpacity 
                key={index} 
                style={[
                  styles.locationCard,
                  selectedLocation === location.name && styles.selectedLocationCard
                ]}
                onPress={() => {
                  setSelectedLocation(selectedLocation === location.name ? '' : location.name);
                }}
              >
                <View style={styles.locationHeader}>
                  <Text style={styles.locationIcon}>{location.icon}</Text>
                  {location.popular && (
                    <View style={styles.popularBadge}>
                      <Text style={styles.popularBadgeText}>인기</Text>
                    </View>
                  )}
                </View>
                <Text style={[
                  styles.locationName,
                  selectedLocation === location.name && styles.selectedLocationName
                ]}>{location.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 시간대 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🕐 시간 선택</Text>
            <Text style={styles.sectionSubtitle}>언제 만나시겠어요?</Text>
          </View>
          <View style={styles.timeGrid}>
            {timeSlots.map(timeSlot => (
              <TouchableOpacity 
                key={timeSlot.id} 
                style={[
                  styles.timeCard,
                  selectedTime === timeSlot.period && styles.selectedTimeCard
                ]}
                onPress={() => {
                  setSelectedTime(selectedTime === timeSlot.period ? '' : timeSlot.period);
                }}
              >
                <Text style={styles.timeEmoji}>{timeSlot.emoji}</Text>
                <Text style={[
                  styles.timeName,
                  selectedTime === timeSlot.period && styles.selectedTimeName
                ]}>{timeSlot.name}</Text>
                <Text style={[
                  styles.timeRange,
                  selectedTime === timeSlot.period && styles.selectedTimeRange
                ]}>{timeSlot.time}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 검색 버튼 */}
        <View style={styles.searchButtonSection}>
          <TouchableOpacity 
            style={[
              styles.mainSearchButton,
              (selectedCategory || selectedLocation || selectedTime || searchText) && styles.activeSearchButton
            ]}
            onPress={() => {
              const filters = [];
              if (selectedCategory) filters.push(`카테고리: ${selectedCategory}`);
              if (selectedLocation) filters.push(`지역: ${selectedLocation}`);
              if (selectedTime) filters.push(`시간: ${selectedTime}`);
              if (searchText) filters.push(`검색어: ${searchText}`);
              
              Alert.alert(
                '검색 조건', 
                filters.length > 0 ? filters.join('\n') : '모든 모임을 검색합니다.',
                [{ text: '검색하기', onPress: () => console.log('검색 실행') }]
              );
            }}
          >
            <Text style={[
              styles.mainSearchButtonText,
              (selectedCategory || selectedLocation || selectedTime || searchText) && styles.activeSearchButtonText
            ]}>
              {(selectedCategory || selectedLocation || selectedTime || searchText) 
                ? '조건에 맞는 모임 찾기' 
                : '모든 모임 보기'
              }
            </Text>
            <Text style={styles.searchButtonIcon}>🔍</Text>
          </TouchableOpacity>
        </View>

        {/* 안전 가이드 */}
        <View style={styles.section}>
          <View style={styles.safetyContainer}>
            <View style={styles.safetyHeader}>
              <Text style={styles.safetyIcon}>🛡️</Text>
              <Text style={styles.safetyTitle}>안전한 모임을 위한 가이드</Text>
            </View>
            <View style={styles.safetyList}>
              <View style={styles.safetyItem}>
                <Text style={styles.safetyItemIcon}>✓</Text>
                <Text style={styles.safetyItemText}>첫 만남은 공개된 장소에서</Text>
              </View>
              <View style={styles.safetyItem}>
                <Text style={styles.safetyItemIcon}>✓</Text>
                <Text style={styles.safetyItemText}>개인정보는 신중하게 공유</Text>
              </View>
              <View style={styles.safetyItem}>
                <Text style={styles.safetyItemIcon}>✓</Text>
                <Text style={styles.safetyItemText}>불편한 상황 시 즉시 신고</Text>
              </View>
              <View style={styles.safetyItem}>
                <Text style={styles.safetyItemIcon}>✓</Text>
                <Text style={styles.safetyItemText}>음주는 적당히, 안전 우선</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={{height: 100}} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.neutral.background,
  },
  header: {
    backgroundColor: COLORS.neutral.white,
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 24,
    ...SHADOWS.small,
  },
  headerContent: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  searchSection: {
    backgroundColor: COLORS.neutral.white,
    paddingHorizontal: 24,
    paddingVertical: 20,
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.neutral.background,
    borderRadius: 20,
    paddingHorizontal: 16,
    height: 56,
    ...SHADOWS.small,
  },
  searchIcon: {
    fontSize: 20,
    marginRight: 12,
    color: COLORS.text.secondary,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text.primary,
    height: '100%',
  },
  clearButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.neutral.grey300,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  clearButtonText: {
    fontSize: 14,
    color: COLORS.text.secondary,
    fontWeight: 'bold',
  },
  section: {
    backgroundColor: COLORS.neutral.white,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 20,
    padding: 24,
    ...SHADOWS.small,
  },
  sectionHeader: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  categoryCard: {
    width: '30%',
    aspectRatio: 1,
    backgroundColor: COLORS.neutral.background,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderWidth: 2,
    borderColor: 'transparent',
    ...SHADOWS.small,
  },
  selectedCategoryCard: {
    borderColor: COLORS.primary.main,
    backgroundColor: COLORS.primary.light,
  },
  categoryIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryEmoji: {
    fontSize: 24,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.primary,
    textAlign: 'center',
  },
  selectedCategoryName: {
    color: COLORS.primary.dark,
    fontWeight: 'bold',
  },
  selectedIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.primary.main,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedIndicatorText: {
    fontSize: 12,
    color: COLORS.text.white,
    fontWeight: 'bold',
  },
  locationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  locationCard: {
    width: '48%',
    backgroundColor: COLORS.neutral.background,
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: 'transparent',
    ...SHADOWS.small,
  },
  selectedLocationCard: {
    borderColor: COLORS.primary.main,
    backgroundColor: COLORS.primary.light,
  },
  locationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationIcon: {
    fontSize: 24,
  },
  popularBadge: {
    backgroundColor: COLORS.functional.error,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  popularBadgeText: {
    fontSize: 10,
    color: COLORS.text.white,
    fontWeight: 'bold',
  },
  locationName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  selectedLocationName: {
    color: COLORS.primary.dark,
    fontWeight: 'bold',
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  timeCard: {
    width: '48%',
    backgroundColor: COLORS.neutral.background,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    ...SHADOWS.small,
  },
  selectedTimeCard: {
    borderColor: COLORS.primary.main,
    backgroundColor: COLORS.primary.light,
  },
  timeEmoji: {
    fontSize: 28,
    marginBottom: 8,
  },
  timeName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  selectedTimeName: {
    color: COLORS.primary.dark,
    fontWeight: 'bold',
  },
  timeRange: {
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  selectedTimeRange: {
    color: COLORS.primary.dark,
    fontWeight: '600',
  },
  searchButtonSection: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  mainSearchButton: {
    backgroundColor: COLORS.neutral.grey300,
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...SHADOWS.medium,
  },
  activeSearchButton: {
    backgroundColor: COLORS.primary.main,
  },
  mainSearchButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text.secondary,
    flex: 1,
  },
  activeSearchButtonText: {
    color: COLORS.text.white,
  },
  searchButtonIcon: {
    fontSize: 20,
    marginLeft: 12,
  },
  safetyContainer: {
    backgroundColor: COLORS.neutral.background,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.neutral.grey200,
  },
  safetyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  safetyIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  safetyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text.primary,
  },
  safetyList: {
    gap: 12,
  },
  safetyItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  safetyItemIcon: {
    fontSize: 16,
    color: COLORS.functional.success,
    marginRight: 12,
    fontWeight: 'bold',
  },
  safetyItemText: {
    fontSize: 15,
    color: COLORS.text.secondary,
    flex: 1,
    lineHeight: 20,
  },
});

export default SearchScreen;