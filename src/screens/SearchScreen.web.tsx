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
                setSelectedCategory(category.name);
                Alert.alert('카테고리 선택', `${category.name} 카테고리를 선택했습니다!`);
              }}
            >
              <Text style={styles.categoryEmoji}>{category.emoji}</Text>
              <Text style={styles.categoryName}>{category.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📍 인기 지역</Text>
        <View style={styles.locationGrid}>
          {locations.map((location, index) => (
            <TouchableOpacity key={index} style={styles.locationItem}>
              <Text style={styles.locationText}>{location}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

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
});

export default SearchScreen;