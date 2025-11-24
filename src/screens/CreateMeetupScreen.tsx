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
import { COLORS, SHADOWS } from '../styles/colors';
import { useMeetups } from '../hooks/useMeetups';
import MealPreferenceSelector from '../components/MealPreferenceSelector';
import { MealPreferences } from '../types/mealPreferences';

interface CreateMeetupScreenProps {
  onClose?: () => void;
}

const CreateMeetupScreen: React.FC<CreateMeetupScreenProps> = ({ onClose }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [locationCoords, setLocationCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [maxParticipants, setMaxParticipants] = useState('');
  const [category, setCategory] = useState('');
  const [mealPreferences, setMealPreferences] = useState<MealPreferences>({
    dietary: [],
    style: [],
    restriction: [],
    atmosphere: []
  });
  const [showMapPicker, setShowMapPicker] = useState(false);
  const { createMeetup } = useMeetups();

  const categories = [
    { id: '한식', name: '한식', emoji: '🍚' },
    { id: '중식', name: '중식', emoji: '🥟' },
    { id: '일식', name: '일식', emoji: '🍣' },
    { id: '양식', name: '양식', emoji: '🍝' },
    { id: '카페', name: '카페', emoji: '☕' },
    { id: '술집', name: '술집', emoji: '🍻' },
  ];

  const handleCreateMeetup = async () => {
    if (!title || !location || !date || !time || !maxParticipants || !category) {
      Alert.alert('오류', '필수 정보를 모두 입력해주세요.');
      return;
    }

    try {
      await createMeetup({
        title,
        description,
        category,
        location,
        address: location,
        latitude: locationCoords?.latitude,
        longitude: locationCoords?.longitude,
        date,
        time,
        maxParticipants: parseInt(maxParticipants, 10),
        hostName: '현재 사용자',
        hostId: 'currentUser',
        hostBabAlScore: 78, // 임시 값
        mealPreferences,
      });

      Alert.alert(
        '모임 생성 완료',
        '새로운 모임이 생성되었습니다!\n승인 대기 중입니다.',
        [{ 
          text: '확인', 
          onPress: () => {
            onClose?.();
          }
        }]
      );
    } catch (error) {
      Alert.alert('오류', '모임 생성에 실패했습니다.');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>새 모임 만들기</Text>
        <Text style={styles.subtitle}>즐거운 식사 모임을 만들어보세요</Text>
      </View>

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>모임 제목 *</Text>
          <TextInput
            style={styles.input}
            placeholder="ex) 강남역 맛집 탐방"
            value={title}
            onChangeText={setTitle}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>카테고리 *</Text>
          <View style={styles.categoryGrid}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.categoryItem,
                  category === cat.id && styles.selectedCategory
                ]}
                onPress={() => setCategory(cat.id)}
              >
                <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
                <Text style={styles.categoryName}>{cat.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>장소 *</Text>
          <TouchableOpacity 
            style={styles.mapPickerButton}
            onPress={() => setShowMapPicker(true)}
          >
            <Text style={styles.mapPickerButtonText}>
              {location ? location : '📍 지도에서 장소 선택하기'}
            </Text>
            <Text style={styles.mapPickerArrow}>{'>'}</Text>
          </TouchableOpacity>
          {location && (
            <TouchableOpacity 
              style={styles.clearLocationButton}
              onPress={() => {
                setLocation('');
                setLocationCoords(null);
              }}
            >
              <Text style={styles.clearLocationText}>다른 장소 선택</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.row}>
          <View style={styles.halfInput}>
            <Text style={styles.label}>날짜 *</Text>
            <TextInput
              style={styles.input}
              placeholder="2024-01-01"
              value={date}
              onChangeText={setDate}
            />
          </View>
          <View style={styles.halfInput}>
            <Text style={styles.label}>시간 *</Text>
            <TextInput
              style={styles.input}
              placeholder="19:00"
              value={time}
              onChangeText={setTime}
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>최대 인원 *</Text>
          <TextInput
            style={styles.input}
            placeholder="4"
            value={maxParticipants}
            onChangeText={setMaxParticipants}
            keyboardType="numeric"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>상세 설명</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="모임에 대한 자세한 설명을 작성해주세요"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
          />
        </View>

        <View style={styles.inputGroup}>
          <MealPreferenceSelector
            selectedPreferences={mealPreferences}
            onPreferencesChange={setMealPreferences}
            title="🍽️ 식사 성향 설정"
          />
        </View>

        <View style={styles.safetyNotice}>
          <Text style={styles.safetyTitle}>🛡️ 안전 수칙</Text>
          <Text style={styles.safetyText}>
            • 첫 만남은 공개된 장소에서 진행해주세요{'\n'}
            • 개인정보 공유는 신중하게 해주세요{'\n'}
            • 불편한 상황이 발생하면 즉시 신고해주세요
          </Text>
        </View>

        <TouchableOpacity
          style={styles.createButton}
          onPress={handleCreateMeetup}
        >
          <Text style={styles.createButtonText}>모임 생성하기</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.neutral.background,
  },
  header: {
    padding: 20,
    backgroundColor: COLORS.neutral.white,
    alignItems: 'center',
    ...SHADOWS.small,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  form: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.primary.light,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: COLORS.neutral.white,
    color: COLORS.text.primary,
    ...SHADOWS.small,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfInput: {
    width: '48%',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  categoryItem: {
    width: '30%',
    backgroundColor: COLORS.neutral.white,
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 2,
    borderColor: COLORS.neutral.grey200,
    ...SHADOWS.small,
  },
  selectedCategory: {
    borderColor: COLORS.primary.main,
    backgroundColor: COLORS.primary.light,
  },
  categoryEmoji: {
    fontSize: 24,
    marginBottom: 5,
  },
  categoryName: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.text.primary,
  },
  safetyNotice: {
    backgroundColor: COLORS.secondary.light,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary.main,
  },
  safetyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  safetyText: {
    fontSize: 14,
    color: COLORS.text.secondary,
    lineHeight: 20,
  },
  createButton: {
    backgroundColor: COLORS.primary.main,
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    ...SHADOWS.medium,
  },
  createButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text.white,
  },
  mapPickerButton: {
    borderWidth: 1,
    borderColor: COLORS.primary.light,
    borderRadius: 12,
    padding: 16,
    backgroundColor: COLORS.neutral.white,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...SHADOWS.small,
  },
  mapPickerButtonText: {
    fontSize: 16,
    color: COLORS.text.primary,
    flex: 1,
  },
  mapPickerArrow: {
    fontSize: 16,
    color: COLORS.text.secondary,
    marginLeft: 8,
  },
  clearLocationButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  clearLocationText: {
    fontSize: 14,
    color: COLORS.primary.main,
    textDecorationLine: 'underline',
  },
});

export default CreateMeetupScreen;