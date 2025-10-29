import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { COLORS, SHADOWS, LAYOUT } from '../styles/colors';
import { Icon } from '../components/Icon';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';
import { useRouterNavigation } from '../components/RouterNavigation';
import { FOOD_CATEGORY_NAMES, PRICE_RANGES } from '../constants/categories';

interface CreateMeetupScreenProps {
  navigation?: any;
  user?: any;
}

const CreateMeetupScreen: React.FC<CreateMeetupScreenProps> = ({ user }) => {
  const navigation = useRouterNavigation();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    address: '',
    date: '',
    time: '',
    maxParticipants: '',
    category: '한식',
    priceRange: '1-2만원',
    requirements: '',
  });

  const [preferenceFilter, setPreferenceFilter] = useState({
    genderFilter: 'anyone',
    ageFilterMin: 18,
    ageFilterMax: 100,
    eatingSpeed: 'no_preference',
    conversationDuringMeal: 'no_preference',
    introvertLevel: null,
    extrovertLevel: null,
    talkativeness: 'no_preference',
    interests: [],
    foodCategory: 'no_preference',
    specificRestaurant: '',
    mealPurpose: 'no_preference',
    isRequired: false
  });

  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const [loading, setLoading] = useState(false);
  const { toast, showSuccess, showError, hideToast } = useToast();

  const categories = FOOD_CATEGORY_NAMES;
  const priceRanges = PRICE_RANGES;

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFilterChange = (field: string, value: any) => {
    setPreferenceFilter(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleInterestToggle = (interest: string) => {
    setPreferenceFilter(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest]
    }));
  };

  const validateForm = () => {
    if (!formData.title.trim()) {
      Alert.alert('오류', '모임 제목을 입력해주세요.');
      return false;
    }
    if (!formData.location.trim()) {
      Alert.alert('오류', '모임 장소를 입력해주세요.');
      return false;
    }
    if (!formData.date.trim()) {
      Alert.alert('오류', '모임 날짜를 입력해주세요.');
      return false;
    }
    if (!formData.time.trim()) {
      Alert.alert('오류', '모임 시간을 입력해주세요.');
      return false;
    }
    if (!formData.maxParticipants.trim() || parseInt(formData.maxParticipants) < 2) {
      Alert.alert('오류', '최대 참가자 수를 2명 이상으로 입력해주세요.');
      return false;
    }
    return true;
  };

  const handleCreateMeetup = async () => {
    if (!validateForm()) return;

    setLoading(true);
    
    try {
      const meetupData = {
        ...formData,
        maxParticipants: parseInt(formData.maxParticipants),
      };

      const token = localStorage.getItem('token');
      
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/meetups`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(meetupData),
      });

      const data = await response.json();

      if (response.ok) {
        // 모임 생성 성공 시 필터 설정
        const meetupId = data.meetup?.id;
        if (meetupId && showAdvancedFilters) {
          try {
            const filterData = {
              ...preferenceFilter,
              locationFilter: formData.location || formData.address,
              foodCategory: formData.category === '한식' ? 'korean' : 
                          formData.category === '일식' ? 'japanese' :
                          formData.category === '양식' ? 'western' :
                          formData.category === '카페' ? 'dessert' : 'no_preference'
            };
            
            const filterResponse = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/meetups/${meetupId}/preference-filter`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
              },
              body: JSON.stringify(filterData),
            });
            
            if (filterResponse.ok) {
              console.log('✅ 모임 필터 설정 성공');
            } else {
              console.error('⚠️ 모임 필터 설정 실패');
            }
          } catch (filterError) {
            console.error('⚠️ 모임 필터 설정 중 오류:', filterError);
          }
        }
        
        showSuccess('모임이 성공적으로 생성되었습니다! 🎉');
        
        // 3초 후 모임 상세 페이지로 이동
        setTimeout(() => {
          if (navigation && meetupId) {
            navigation.navigate('MeetupDetail', { meetupId });
          } else if (navigation) {
            navigation.goBack();
          }
        }, 2000);
      } else {
        showError(data.error || '모임 생성에 실패했습니다.');
      }
    } catch (error) {
      console.error('모임 생성 오류:', error);
      showError('서버 연결에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation?.goBack()}
        >
          <Icon name="chevron-left" size={24} color={COLORS.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>모임 만들기</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* 기본 정보 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>기본 정보</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>모임 제목 *</Text>
            <TextInput
              style={styles.input}
              placeholder="예) 강남 맛집 탐방"
              value={formData.title}
              onChangeText={(value) => handleInputChange('title', value)}
              maxLength={50}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>모임 설명</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="모임에 대한 설명을 작성해주세요"
              value={formData.description}
              onChangeText={(value) => handleInputChange('description', value)}
              multiline
              numberOfLines={4}
              maxLength={500}
            />
          </View>
        </View>

        {/* 장소 정보 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>장소 정보</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>모임 장소 *</Text>
            <TextInput
              style={styles.input}
              placeholder="예) 강남역 맛집거리"
              value={formData.location}
              onChangeText={(value) => handleInputChange('location', value)}
              maxLength={100}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>상세 주소</Text>
            <TextInput
              style={styles.input}
              placeholder="구체적인 주소나 랜드마크"
              value={formData.address}
              onChangeText={(value) => handleInputChange('address', value)}
              maxLength={200}
            />
          </View>
        </View>

        {/* 일시 정보 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>일시 정보</Text>
          
          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
              <Text style={styles.label}>날짜 *</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                value={formData.date}
                onChangeText={(value) => handleInputChange('date', value)}
              />
            </View>
            
            <View style={[styles.inputGroup, { flex: 1, marginLeft: 10 }]}>
              <Text style={styles.label}>시간 *</Text>
              <TextInput
                style={styles.input}
                placeholder="HH:MM"
                value={formData.time}
                onChangeText={(value) => handleInputChange('time', value)}
              />
            </View>
          </View>
        </View>

        {/* 모임 설정 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>모임 설정</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>최대 참가자 수 *</Text>
            <TextInput
              style={styles.input}
              placeholder="예) 6"
              value={formData.maxParticipants}
              onChangeText={(value) => handleInputChange('maxParticipants', value)}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>카테고리</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.categoryContainer}>
                {categories.map((category) => (
                  <TouchableOpacity
                    key={category}
                    style={[
                      styles.categoryButton,
                      formData.category === category && styles.categoryButtonSelected
                    ]}
                    onPress={() => handleInputChange('category', category)}
                  >
                    <Text style={[
                      styles.categoryText,
                      formData.category === category && styles.categoryTextSelected
                    ]}>
                      {category}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>예상 비용</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.categoryContainer}>
                {priceRanges.map((range) => (
                  <TouchableOpacity
                    key={range}
                    style={[
                      styles.categoryButton,
                      formData.priceRange === range && styles.categoryButtonSelected
                    ]}
                    onPress={() => handleInputChange('priceRange', range)}
                  >
                    <Text style={[
                      styles.categoryText,
                      formData.priceRange === range && styles.categoryTextSelected
                    ]}>
                      {range}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>참가 조건</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="특별한 요구사항이나 참가 조건이 있다면 적어주세요"
              value={formData.requirements}
              onChangeText={(value) => handleInputChange('requirements', value)}
              multiline
              numberOfLines={3}
              maxLength={300}
            />
          </View>
        </View>

        {/* 식사 성향 필터 */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>식사 성향 필터 (선택)</Text>
            <TouchableOpacity
              style={styles.toggleButton}
              onPress={() => setShowAdvancedFilters(!showAdvancedFilters)}
            >
              <Text style={styles.toggleButtonText}>
                {showAdvancedFilters ? '간단히' : '상세설정'}
              </Text>
              <Icon 
                name={showAdvancedFilters ? 'chevron-up' : 'chevron-down'} 
                size={16} 
                color={COLORS.primary.main} 
              />
            </TouchableOpacity>
          </View>
          
          <Text style={styles.sectionSubtitle}>
            참가자들의 식사 성향을 미리 파악하여 더 좋은 모임을 만들어보세요
          </Text>

          {showAdvancedFilters && (
            <>
              {/* 기본 조건 */}
              <View style={styles.filterGroup}>
                <Text style={styles.filterGroupTitle}>기본 조건</Text>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>성별 제한</Text>
                  <View style={styles.categoryContainer}>
                    {[
                      { key: 'anyone', label: '누구나' },
                      { key: 'male', label: '남자만' },
                      { key: 'female', label: '여자만' }
                    ].map((option) => (
                      <TouchableOpacity
                        key={option.key}
                        style={[
                          styles.categoryButton,
                          preferenceFilter.genderFilter === option.key && styles.categoryButtonActive
                        ]}
                        onPress={() => handleFilterChange('genderFilter', option.key)}
                      >
                        <Text style={[
                          styles.categoryButtonText,
                          preferenceFilter.genderFilter === option.key && styles.categoryButtonTextActive
                        ]}>
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.row}>
                  <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                    <Text style={styles.label}>최소 나이</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="18"
                      value={preferenceFilter.ageFilterMin.toString()}
                      onChangeText={(value) => handleFilterChange('ageFilterMin', parseInt(value) || 18)}
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={[styles.inputGroup, { flex: 1, marginLeft: 10 }]}>
                    <Text style={styles.label}>최대 나이</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="100"
                      value={preferenceFilter.ageFilterMax.toString()}
                      onChangeText={(value) => handleFilterChange('ageFilterMax', parseInt(value) || 100)}
                      keyboardType="numeric"
                    />
                  </View>
                </View>
              </View>

              {/* 식사 성향 */}
              <View style={styles.filterGroup}>
                <Text style={styles.filterGroupTitle}>식사 성향</Text>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>식사 속도</Text>
                  <View style={styles.categoryContainer}>
                    {[
                      { key: 'fast', label: '빠르게' },
                      { key: 'slow', label: '천천히' },
                      { key: 'no_preference', label: '상관없음' }
                    ].map((option) => (
                      <TouchableOpacity
                        key={option.key}
                        style={[
                          styles.categoryButton,
                          preferenceFilter.eatingSpeed === option.key && styles.categoryButtonActive
                        ]}
                        onPress={() => handleFilterChange('eatingSpeed', option.key)}
                      >
                        <Text style={[
                          styles.categoryButtonText,
                          preferenceFilter.eatingSpeed === option.key && styles.categoryButtonTextActive
                        ]}>
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>대화 중 식사 스타일</Text>
                  <View style={styles.categoryContainer}>
                    {[
                      { key: 'quiet', label: '조용히' },
                      { key: 'no_talk', label: '말걸지 말아주세요' },
                      { key: 'chatty', label: '떠들며 먹기' },
                      { key: 'no_preference', label: '상관없음' }
                    ].map((option) => (
                      <TouchableOpacity
                        key={option.key}
                        style={[
                          styles.categoryButton,
                          preferenceFilter.conversationDuringMeal === option.key && styles.categoryButtonActive
                        ]}
                        onPress={() => handleFilterChange('conversationDuringMeal', option.key)}
                      >
                        <Text style={[
                          styles.categoryButtonText,
                          preferenceFilter.conversationDuringMeal === option.key && styles.categoryButtonTextActive
                        ]}>
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              {/* 대화 성향 */}
              <View style={styles.filterGroup}>
                <Text style={styles.filterGroupTitle}>대화 성향</Text>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>말 많음 여부</Text>
                  <View style={styles.categoryContainer}>
                    {[
                      { key: 'talkative', label: '말 많은 편' },
                      { key: 'listener', label: '듣는 편' },
                      { key: 'moderate', label: '보통' },
                      { key: 'no_preference', label: '상관없음' }
                    ].map((option) => (
                      <TouchableOpacity
                        key={option.key}
                        style={[
                          styles.categoryButton,
                          preferenceFilter.talkativeness === option.key && styles.categoryButtonActive
                        ]}
                        onPress={() => handleFilterChange('talkativeness', option.key)}
                      >
                        <Text style={[
                          styles.categoryButtonText,
                          preferenceFilter.talkativeness === option.key && styles.categoryButtonTextActive
                        ]}>
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              {/* 관심사 */}
              <View style={styles.filterGroup}>
                <Text style={styles.filterGroupTitle}>관심사</Text>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>관심 주제 (복수선택 가능)</Text>
                  <View style={styles.categoryContainer}>
                    {['영화', 'IT', '운동', '취미', '책', '애니'].map((interest) => (
                      <TouchableOpacity
                        key={interest}
                        style={[
                          styles.categoryButton,
                          preferenceFilter.interests.includes(interest) && styles.categoryButtonActive
                        ]}
                        onPress={() => handleInterestToggle(interest)}
                      >
                        <Text style={[
                          styles.categoryButtonText,
                          preferenceFilter.interests.includes(interest) && styles.categoryButtonTextActive
                        ]}>
                          {interest}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              {/* 음식 조건 */}
              <View style={styles.filterGroup}>
                <Text style={styles.filterGroupTitle}>음식 조건</Text>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>특정 가게 지정</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="특정 가게명이 있다면 입력해주세요"
                    value={preferenceFilter.specificRestaurant}
                    onChangeText={(value) => handleFilterChange('specificRestaurant', value)}
                  />
                </View>
              </View>

              {/* 목적성 */}
              <View style={styles.filterGroup}>
                <Text style={styles.filterGroupTitle}>목적성</Text>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>식사 목적</Text>
                  <View style={styles.categoryContainer}>
                    {[
                      { key: 'networking', label: '네트워킹' },
                      { key: 'info_sharing', label: '정보공유' },
                      { key: 'hobby_friendship', label: '취미친목' },
                      { key: 'just_meal', label: '그냥 밥만' },
                      { key: 'no_preference', label: '상관없음' }
                    ].map((option) => (
                      <TouchableOpacity
                        key={option.key}
                        style={[
                          styles.categoryButton,
                          preferenceFilter.mealPurpose === option.key && styles.categoryButtonActive
                        ]}
                        onPress={() => handleFilterChange('mealPurpose', option.key)}
                      >
                        <Text style={[
                          styles.categoryButtonText,
                          preferenceFilter.mealPurpose === option.key && styles.categoryButtonTextActive
                        ]}>
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <TouchableOpacity
                    style={styles.checkboxRow}
                    onPress={() => handleFilterChange('isRequired', !preferenceFilter.isRequired)}
                  >
                    <View style={[
                      styles.checkbox,
                      preferenceFilter.isRequired && styles.checkboxActive
                    ]}>
                      {preferenceFilter.isRequired && (
                        <Icon name="check" size={16} color={COLORS.neutral.white} />
                      )}
                    </View>
                    <Text style={styles.checkboxLabel}>
                      참가자들에게 성향 답변을 필수로 요구하기
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </>
          )}
        </View>

        {/* 생성 버튼 */}
        <TouchableOpacity
          style={[styles.createButton, loading && styles.createButtonDisabled]}
          onPress={handleCreateMeetup}
          disabled={loading}
        >
          <Text style={styles.createButtonText}>
            {loading ? '모임 생성 중...' : '모임 만들기'}
          </Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={hideToast}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.neutral.background,
  },
  header: {
    height: LAYOUT.HEADER_HEIGHT,
    backgroundColor: '#ede0c8',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ebe7dc',
    ...SHADOWS.small,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text.primary,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.neutral.white,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: COLORS.text.primary,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  categoryContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: COLORS.neutral.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  categoryButtonSelected: {
    backgroundColor: COLORS.primary.main,
    borderColor: COLORS.primary.main,
  },
  categoryText: {
    fontSize: 14,
    color: COLORS.text.secondary,
    fontWeight: '500',
  },
  categoryTextSelected: {
    color: COLORS.text.white,
  },
  createButton: {
    backgroundColor: COLORS.primary.main,
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginTop: 20,
    ...SHADOWS.medium,
  },
  createButtonDisabled: {
    backgroundColor: COLORS.text.secondary,
  },
  createButtonText: {
    color: COLORS.text.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  // 필터 관련 스타일
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: COLORS.neutral.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.primary.main,
  },
  toggleButtonText: {
    fontSize: 12,
    color: COLORS.primary.main,
    fontWeight: '600',
    marginRight: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  filterGroup: {
    backgroundColor: COLORS.neutral.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  filterGroupTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 12,
  },
  categoryButtonActive: {
    backgroundColor: COLORS.primary.main,
    borderColor: COLORS.primary.main,
  },
  categoryButtonText: {
    fontSize: 14,
    color: COLORS.text.secondary,
    fontWeight: '500',
  },
  categoryButtonTextActive: {
    color: COLORS.neutral.white,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    backgroundColor: COLORS.neutral.white,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: COLORS.primary.main,
    borderColor: COLORS.primary.main,
  },
  checkboxLabel: {
    fontSize: 14,
    color: COLORS.text.primary,
    flex: 1,
  },
});

export default CreateMeetupScreen;