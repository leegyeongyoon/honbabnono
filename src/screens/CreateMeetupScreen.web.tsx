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

interface CreateMeetupScreenProps {
  navigation?: any;
  user?: any;
}

const CreateMeetupScreen: React.FC<CreateMeetupScreenProps> = ({ navigation, user }) => {
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

  const [loading, setLoading] = useState(false);
  const { toast, showSuccess, showError, hideToast } = useToast();

  const categories = ['한식', '중식', '일식', '양식', '카페', '술집', '기타'];
  const priceRanges = ['1만원 이하', '1-2만원', '2-3만원', '3만원 이상'];

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
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
      
      const response = await fetch('http://localhost:3001/api/meetups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(meetupData),
      });

      const data = await response.json();

      if (response.ok) {
        showSuccess('모임이 성공적으로 생성되었습니다! 🎉');
        
        // 3초 후 모임 상세 페이지로 이동
        setTimeout(() => {
          if (navigation && data.meetup?.id) {
            navigation.navigate('MeetupDetail', { meetupId: data.meetup.id });
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
});

export default CreateMeetupScreen;