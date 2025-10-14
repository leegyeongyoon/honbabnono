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
          placeholder="지역, 음식 종류로 검색해보세요"
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
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 20,
    backgroundColor: '#fff',
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 25,
    paddingHorizontal: 20,
    fontSize: 16,
    backgroundColor: '#f8f9fa',
  },
  searchButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  searchButtonText: {
    fontSize: 20,
  },
  section: {
    backgroundColor: '#fff',
    marginBottom: 10,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  categoryItem: {
    width: '30%',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 10,
  },
  categoryEmoji: {
    fontSize: 30,
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  selectedCategoryItem: {
    backgroundColor: '#007AFF',
  },
  locationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  locationItem: {
    width: '48%',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginBottom: 10,
  },
  locationText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  timeItem: {
    width: '48%',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginBottom: 10,
  },
  timeText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
});

export default SearchScreen;