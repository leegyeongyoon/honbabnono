import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform,
  Modal,
  Dimensions,
} from 'react-native';
import { COLORS, SHADOWS } from '../../styles/colors';
import { Icon } from '../Icon';
import { useToast } from '../../hooks/useToast';
import { FOOD_CATEGORIES, PRICE_RANGES } from '../../constants/categories';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Platform-specific navigation adapter
interface NavigationAdapter {
  navigate: (screen: string, params?: any) => void;
  goBack: () => void;
  replace?: (screen: string, params?: any) => void;
}

interface UniversalCreateMeetupWizardProps {
  navigation: NavigationAdapter;
  user?: any;
  // Platform-specific components
  WebDateTimePicker?: React.ComponentType<any>;
  NativeDateTimePicker?: React.ComponentType<any>;
  WebMap?: React.ComponentType<any>;
  NativeMap?: React.ComponentType<any>;
  onSuccess?: () => void;
  onCancel?: () => void;
}

interface MeetupData {
  category: string;
  date: string;
  time: string;
  datetime: Date | null;
  maxParticipants: number;
  genderPreference: string;
  ageRange: string;
  location: string;
  address: string;
  detailAddress: string;
  latitude: number;
  longitude: number;
  title: string;
  description: string;
  image: any; // File for web, asset for native
  priceRange: string;
  deposit: number;
  // 식사 성향 필드
  eatingSpeed: string;
  conversationLevel: string;
  talkativeness: string;
  mealPurpose: string;
  specificRestaurant: string;
}

// 모임 생성 steps 정의 (웹과 동일한 8단계)
const WIZARD_STEPS = [
  { id: 1, title: '카테고리', description: '어떤 음식을 함께 드실까요?' },
  { id: 2, title: '날짜 & 시간', description: '언제 만날까요?' },
  { id: 3, title: '참가 인원', description: '몇 명이 함께할까요?' },
  { id: 4, title: '참가자 조건', description: '누구와 함께할까요?' },
  { id: 5, title: '장소', description: '어디서 만날까요?' },
  { id: 6, title: '모임 정보', description: '모임에 대해 알려주세요' },
  { id: 7, title: '약속금', description: '노쇼 방지를 위한 약속금을 설정해주세요' },
  { id: 8, title: '결제', description: '모임 생성 비용을 결제해주세요' },
];

const UniversalCreateMeetupWizard: React.FC<UniversalCreateMeetupWizardProps> = ({
  navigation,
  user,
  WebDateTimePicker,
  NativeDateTimePicker,
  WebMap,
  NativeMap,
  onSuccess,
  onCancel,
}) => {
  const { showToast } = useToast();

  const [currentStep, setCurrentStep] = useState(1);
  const [createdMeetupId, setCreatedMeetupId] = useState<string | null>(null);
  
  // 결제 관련 상태
  const [paymentMethod, setPaymentMethod] = useState<'points' | 'card' | 'kakao'>('points');
  const [userPoints, setUserPoints] = useState<number>(0);
  const [isPaymentLoading, setIsPaymentLoading] = useState<boolean>(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [selectedTime, setSelectedTime] = useState('18:00');
  const [selectedPeriod, setSelectedPeriod] = useState('오후');
  const [selectedHour, setSelectedHour] = useState(6);
  const [selectedMinute, setSelectedMinute] = useState(0);
  const [showAgeModal, setShowAgeModal] = useState(false);
  const [minAge, setMinAge] = useState(20);
  const [maxAge, setMaxAge] = useState(40);
  
  // 모달 상태
  const [showDateModal, setShowDateModal] = useState(false);
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [showAlarmModal, setShowAlarmModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [meetupData, setMeetupData] = useState<MeetupData>({
    category: '',
    date: '',
    time: '',
    datetime: null,
    maxParticipants: 4,
    genderPreference: '상관없음',
    ageRange: '전체',
    location: '',
    address: '',
    detailAddress: '',
    latitude: 0,
    longitude: 0,
    title: '',
    description: '',
    image: null,
    priceRange: '',
    deposit: 3000,
    eatingSpeed: '보통',
    conversationLevel: '적당히',
    talkativeness: '보통',
    mealPurpose: '맛있는 음식',
    specificRestaurant: '',
  });

  // API 통합
  const createMeetup = async (): Promise<{ success: boolean; meetupId?: string; error?: string }> => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        throw new Error('인증 토큰이 없습니다');
      }

      // FormData 생성 (웹/네이티브 호환)
      const formData = new FormData();
      
      // 기본 정보
      formData.append('category', meetupData.category);
      formData.append('title', meetupData.title);
      formData.append('description', meetupData.description);
      formData.append('maxParticipants', meetupData.maxParticipants.toString());
      formData.append('priceRange', meetupData.priceRange);
      formData.append('deposit', meetupData.deposit.toString());
      
      // 날짜/시간
      if (meetupData.datetime) {
        formData.append('date', meetupData.datetime.toISOString().split('T')[0]);
        formData.append('time', meetupData.datetime.toTimeString().split(' ')[0].substring(0, 5));
      }
      
      // 위치 정보
      formData.append('location', meetupData.location);
      formData.append('address', meetupData.address);
      formData.append('detailAddress', meetupData.detailAddress);
      formData.append('latitude', meetupData.latitude.toString());
      formData.append('longitude', meetupData.longitude.toString());
      
      // 필터 정보
      const genderFilter = meetupData.genderPreference === '남성만' ? 'male' : 
                          meetupData.genderPreference === '여성만' ? 'female' : 'all';
      const ageFilterMin = meetupData.ageRange === '20-30대' ? '20' : '20';
      const ageFilterMax = meetupData.ageRange === '20-30대' ? '39' : '59';
      
      formData.append('genderFilter', genderFilter);
      formData.append('ageFilterMin', ageFilterMin);
      formData.append('ageFilterMax', ageFilterMax);
      
      // 식사 성향
      formData.append('eatingSpeed', meetupData.eatingSpeed);
      formData.append('conversationDuringMeal', meetupData.conversationLevel);
      formData.append('talkativeness', meetupData.talkativeness);
      formData.append('mealPurpose', meetupData.mealPurpose);
      formData.append('specificRestaurant', meetupData.specificRestaurant);
      formData.append('interests', '[]');

      // 이미지 첨부
      if (meetupData.image) {
        if (Platform.OS === 'web' && meetupData.image instanceof File) {
          formData.append('image', meetupData.image);
        } else {
          // React Native에서 이미지 처리
          formData.append('image', {
            uri: meetupData.image.uri,
            type: meetupData.image.type || 'image/jpeg',
            name: meetupData.image.fileName || 'meetup_image.jpg',
          } as any);
        }
      }

      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/meetups`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        return { success: true, meetupId: data.meetup?.id };
      } else {
        return { success: false, error: data.message || '모임 생성에 실패했습니다' };
      }
    } catch (error) {
      console.error('모임 생성 오류:', error);
      return { success: false, error: error instanceof Error ? error.message : '네트워크 오류가 발생했습니다' };
    }
  };

  // 결제 처리 함수
  const processPayment = async (): Promise<boolean> => {
    try {
      setIsPaymentLoading(true);
      const token = await AsyncStorage.getItem('authToken');
      
      const paymentData = {
        meetupId: createdMeetupId,
        amount: meetupData.deposit + 1000, // 기본 생성비 1000원
        paymentMethod,
        description: `모임 생성: ${meetupData.title}`,
      };

      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/payments/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(paymentData),
      });

      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error('결제 처리 오류:', error);
      return false;
    } finally {
      setIsPaymentLoading(false);
    }
  };

  // 사용자 포인트 조회
  const fetchUserPoints = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/users/points`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        setUserPoints(data.points || 0);
      }
    } catch (error) {
      console.error('포인트 조회 오류:', error);
    }
  }, []);

  useEffect(() => {
    fetchUserPoints();
  }, [fetchUserPoints]);

  // 다음 단계로 이동
  const nextStep = () => {
    if (currentStep < WIZARD_STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  // 이전 단계로 이동
  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // 모임 생성 완료
  const handleCreateMeetup = async () => {
    setIsLoading(true);
    
    try {
      // 1. 모임 생성
      const result = await createMeetup();
      
      if (!result.success) {
        showToast(result.error || '모임 생성에 실패했습니다', 'error');
        setIsLoading(false);
        return;
      }

      setCreatedMeetupId(result.meetupId || null);
      
      // 2. 다음 단계 (결제)로 이동
      nextStep();
      
    } catch (error) {
      console.error('모임 생성 오류:', error);
      showToast('모임 생성 중 오류가 발생했습니다', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // 결제 및 완료
  const handlePaymentComplete = async () => {
    const paymentSuccess = await processPayment();
    
    if (paymentSuccess) {
      showToast('모임이 성공적으로 생성되었습니다!', 'success');
      
      if (onSuccess) {
        onSuccess();
      } else {
        navigation.navigate('MeetupDetail', { meetupId: createdMeetupId });
      }
    } else {
      showToast('결제에 실패했습니다', 'error');
    }
  };

  // 카테고리 선택 화면
  const renderCategoryStep = () => {
    const categories = [
      { id: 1, name: '고기구이', icon: '🥩', color: '#FF6B6B' },
      { id: 2, name: '전통/제철', icon: '🍲', color: '#4ECDC4' },
      { id: 3, name: '뷔페/무한리필', icon: '🍽️', color: '#45B7D1' },
      { id: 4, name: '퓨전/창작', icon: '👨‍🍳', color: '#96CEB4' },
      { id: 5, name: '과자/차전', icon: '🍰', color: '#FFEAA7' },
      { id: 6, name: '주점/술집', icon: '🍻', color: '#DDA0DD' },
      { id: 7, name: '코스요리', icon: '⭐', color: '#FFB347' },
      { id: 8, name: '카페', icon: '☕', color: '#D2B48C' }
    ];

    return (
      <View style={styles.stepContent}>
        <View style={styles.categoryGrid}>
          {categories.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.categoryItem,
                meetupData.category === category.name && styles.categoryItemSelected
              ]}
              onPress={() => setMeetupData(prev => ({ ...prev, category: category.name }))}
            >
              <View style={[
                styles.categoryIconWrapper,
                meetupData.category === category.name && styles.categoryIconWrapperSelected
              ]}>
                <Text style={styles.categoryEmoji}>{category.icon}</Text>
              </View>
              <Text style={[
                styles.categoryName,
                meetupData.category === category.name && styles.categoryNameSelected
              ]}>
                {category.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  // 날짜/시간 선택 화면
  const renderDateTimeStep = () => (
    <View style={styles.stepContent}>
      <View style={styles.dateTimeSection}>
        <Text style={styles.sectionLabel}>날짜</Text>
        <TouchableOpacity
          style={styles.selectButton}
          onPress={() => setShowDateModal(true)}
        >
          <Icon name="calendar" size={20} color={COLORS.primary.main} />
          <Text style={styles.selectButtonText}>
            {selectedDate ?
              `${selectedDate.getMonth() + 1}월 ${selectedDate.getDate()}일 ${['일', '월', '화', '수', '목', '금', '토'][selectedDate.getDay()]}요일` :
              '날짜를 선택해주세요'}
          </Text>
          <Icon name="chevron-right" size={20} color={COLORS.text.tertiary} />
        </TouchableOpacity>
      </View>

      <View style={styles.dateTimeSection}>
        <Text style={styles.sectionLabel}>시간</Text>
        <TouchableOpacity
          style={styles.selectButton}
          onPress={() => setShowTimeModal(true)}
        >
          <Icon name="clock" size={20} color={COLORS.primary.main} />
          <Text style={styles.selectButtonText}>
            {`${selectedPeriod} ${selectedHour}:${selectedMinute.toString().padStart(2, '0')}`}
          </Text>
          <Icon name="chevron-right" size={20} color={COLORS.text.tertiary} />
        </TouchableOpacity>
      </View>

      {meetupData.datetime && (
        <View style={styles.selectedInfoBox}>
          <Text style={styles.selectedInfoIcon}>✨</Text>
          <Text style={styles.selectedInfoText}>
            {meetupData.datetime.toLocaleDateString('ko-KR', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })} {selectedPeriod} {selectedHour}:{selectedMinute.toString().padStart(2, '0')}
          </Text>
        </View>
      )}
    </View>
  );

  // 참가자 설정 화면
  const renderParticipantsStep = () => (
    <View style={styles.stepContent}>
      <View style={styles.cardBox}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardIcon}>👥</Text>
          <Text style={styles.cardTitle}>최대 참가자 수</Text>
        </View>
        <View style={styles.numberGrid}>
          {[2, 3, 4, 5, 6, 7, 8].map(num => (
            <TouchableOpacity
              key={num}
              style={[
                styles.numberBtn,
                meetupData.maxParticipants === num && styles.numberBtnSelected
              ]}
              onPress={() => setMeetupData(prev => ({ ...prev, maxParticipants: num }))}
            >
              <Text style={[
                styles.numberBtnText,
                meetupData.maxParticipants === num && styles.numberBtnTextSelected
              ]}>
                {num}명
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.hintText}>본인 포함 {meetupData.maxParticipants}명이 함께합니다</Text>
      </View>
    </View>
  );

  // 성별/연령 제한 설정 화면
  const renderFilterStep = () => (
    <View style={styles.stepContent}>
      <View style={styles.filterSection}>
        <Text style={styles.sectionLabel}>성별</Text>
        <View style={styles.chipGroup}>
          {['남성만', '여성만', '상관없음'].map((gender) => (
            <TouchableOpacity
              key={gender}
              style={[
                styles.chip,
                meetupData.genderPreference === gender && styles.chipSelected
              ]}
              onPress={() => setMeetupData(prev => ({ ...prev, genderPreference: gender }))}
            >
              <Text style={[
                styles.chipText,
                meetupData.genderPreference === gender && styles.chipTextSelected
              ]}>
                {gender}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.filterSection}>
        <Text style={styles.sectionLabel}>연령</Text>
        <TouchableOpacity style={styles.selectButton} onPress={() => setShowAgeModal(true)}>
          <Icon name="users" size={20} color={COLORS.primary.main} />
          <Text style={styles.selectButtonText}>
            {meetupData.ageRange === '전체' ? '전체 연령' :
             minAge === maxAge ? `${minAge}세` :
             `${minAge}세 - ${maxAge}세`}
          </Text>
          <Icon name="chevron-right" size={20} color={COLORS.text.tertiary} />
        </TouchableOpacity>
      </View>
    </View>
  );

  // 나이 선택 모달 (웹과 동일한 디자인)
  const renderAgeModal = () => (
    <View style={styles.modalOverlay}>
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowAgeModal(false)}>
            <Text style={styles.modalCloseButton}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>연령 설정</Text>
          <TouchableOpacity onPress={() => {
            if (minAge === maxAge) {
              setMeetupData(prev => ({ ...prev, ageRange: `${minAge}세` }));
            } else {
              setMeetupData(prev => ({ ...prev, ageRange: `${minAge}-${maxAge}` }));
            }
            setShowAgeModal(false);
          }}>
            <Text style={styles.modalConfirmButton}>확인</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.ageRangeContainer}>
          <TouchableOpacity 
            style={[
              styles.ageRangeOption,
              meetupData.ageRange === '전체' ? styles.ageRangeOptionSelected : null
            ]}
            onPress={() => {
              setMeetupData(prev => ({ ...prev, ageRange: '전체' }));
              setShowAgeModal(false);
            }}
          >
            <Text style={[
              styles.ageRangeText,
              meetupData.ageRange === '전체' ? styles.ageRangeTextSelected : null
            ]}>전체 연령</Text>
          </TouchableOpacity>
          
          <View style={styles.ageSliderContainer}>
            <View style={styles.ageRow}>
              <Text style={styles.ageLabel}>최소 연령: {minAge}세</Text>
              <View style={styles.sliderContainer}>
                <Text style={styles.sliderEndLabel}>18</Text>
                <View style={styles.sliderTrack}>
                  <View style={[
                    styles.sliderFill,
                    { width: `${((minAge - 18) / 82) * 100}%` }
                  ]} />
                </View>
                <Text style={styles.sliderEndLabel}>100</Text>
              </View>
              {/* 실제 슬라이더는 플랫폼별로 다르게 처리 */}
            </View>
            
            <View style={styles.ageRow}>
              <Text style={styles.ageLabel}>최대 연령: {maxAge}세</Text>
              <View style={styles.sliderContainer}>
                <Text style={styles.sliderEndLabel}>18</Text>
                <View style={styles.sliderTrack}>
                  <View style={[
                    styles.sliderFill,
                    { width: `${((maxAge - 18) / 82) * 100}%` }
                  ]} />
                </View>
                <Text style={styles.sliderEndLabel}>100</Text>
              </View>
            </View>
          </View>
          
          <View style={styles.ageQuickOptions}>
            <Text style={styles.ageQuickLabel}>빠른 선택</Text>
            <View style={styles.ageQuickButtons}>
              {[
                {label: '20대', min: 20, max: 29},
                {label: '30대', min: 30, max: 39},
                {label: '40대', min: 40, max: 49},
                {label: '전체', min: 18, max: 70}
              ].map((option) => (
                <TouchableOpacity
                  key={option.label}
                  style={[
                    styles.ageQuickButton,
                    minAge === option.min && maxAge === option.max ? styles.ageQuickButtonSelected : null
                  ]}
                  onPress={() => {
                    setMinAge(option.min);
                    setMaxAge(option.max);
                    if (option.label === '전체') {
                      setMeetupData(prev => ({ ...prev, ageRange: '전체' }));
                    } else {
                      setMeetupData(prev => ({ ...prev, ageRange: `${option.min}-${option.max}` }));
                    }
                  }}
                >
                  <Text style={[
                    styles.ageQuickButtonText,
                    minAge === option.min && maxAge === option.max ? styles.ageQuickButtonTextSelected : null
                  ]}>{option.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </View>
    </View>
  );

  // 위치 선택 화면
  const renderLocationStep = () => (
    <View style={styles.stepContent}>
      {/* Platform-specific map component */}
      {Platform.OS === 'web' && WebMap && (
        <View style={styles.webMapContainer}>
          <WebMap
            onLocationSelect={(location: any) => {
              setMeetupData(prev => ({
                ...prev,
                latitude: location.latLng.lat,
                longitude: location.latLng.lng,
                address: location.address,
              }));
            }}
          />
        </View>
      )}

      {Platform.OS !== 'web' && NativeMap && (
        <NativeMap
          selectedLocation={{
            latitude: meetupData.latitude,
            longitude: meetupData.longitude,
            address: meetupData.address,
            location: meetupData.location,
          }}
          onLocationSelect={(location: any) => {
            setMeetupData(prev => ({
              ...prev,
              latitude: location.latitude,
              longitude: location.longitude,
              address: location.address,
              location: location.location || location.address,
            }));
          }}
        />
      )}

      {/* 상세 주소 입력 */}
      {meetupData.address && (
        <View style={styles.detailAddressSection}>
          <Text style={styles.sectionLabel}>상세 주소 (선택)</Text>
          <TextInput
            style={styles.textInput}
            placeholder="상세 주소를 입력하세요 (예: 2층, 101호)"
            value={meetupData.detailAddress}
            onChangeText={(text) => setMeetupData(prev => ({ ...prev, detailAddress: text }))}
            placeholderTextColor={COLORS.text.tertiary}
          />
        </View>
      )}
    </View>
  );

  // 모임 정보 입력 화면
  const renderInfoStep = () => (
    <View style={styles.stepContent}>
      <View style={styles.inputSection}>
        <Text style={styles.sectionLabel}>모임 제목</Text>
        <TextInput
          style={styles.textInput}
          placeholder="모임 제목을 입력하세요"
          value={meetupData.title}
          onChangeText={(text) => setMeetupData(prev => ({ ...prev, title: text }))}
          maxLength={50}
          placeholderTextColor={COLORS.text.tertiary}
        />
      </View>

      <View style={styles.inputSection}>
        <Text style={styles.sectionLabel}>모임 설명</Text>
        <TextInput
          style={[styles.textInput, styles.textArea]}
          placeholder="모임에 대한 설명을 입력하세요"
          value={meetupData.description}
          onChangeText={(text) => setMeetupData(prev => ({ ...prev, description: text }))}
          multiline
          numberOfLines={4}
          maxLength={500}
          textAlignVertical="top"
          placeholderTextColor={COLORS.text.tertiary}
        />
      </View>

      <View style={styles.inputSection}>
        <Text style={styles.sectionLabel}>가격대</Text>
        <View style={styles.chipGroup}>
          {PRICE_RANGES.map(range => (
            <TouchableOpacity
              key={range.id}
              style={[
                styles.chip,
                meetupData.priceRange === range.label && styles.chipSelected
              ]}
              onPress={() => setMeetupData(prev => ({ ...prev, priceRange: range.label }))}
            >
              <Text style={[
                styles.chipText,
                meetupData.priceRange === range.label && styles.chipTextSelected
              ]}>
                {range.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );

  // 날짜 선택 모달 (웹과 동일한 디자인)
  const renderDateModal = () => (
    <View style={styles.modalOverlay}>
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowDateModal(false)}>
            <Text style={styles.modalCloseButton}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>날짜 선택</Text>
          <TouchableOpacity onPress={() => {
            if (selectedDate) {
              const newDate = new Date(selectedDate);
              let hour24 = selectedHour;
              if (selectedPeriod === '오후' && selectedHour !== 12) {
                hour24 = selectedHour + 12;
              } else if (selectedPeriod === '오전' && selectedHour === 12) {
                hour24 = 0;
              }
              newDate.setHours(hour24, selectedMinute);
              
              setMeetupData(prev => ({ ...prev, datetime: newDate }));
              const year = newDate.getFullYear();
              const month = (newDate.getMonth() + 1).toString().padStart(2, '0');
              const day = newDate.getDate().toString().padStart(2, '0');
              setMeetupData(prev => ({ 
                ...prev, 
                date: `${year}-${month}-${day}`,
                time: `${hour24.toString().padStart(2, '0')}:${selectedMinute.toString().padStart(2, '0')}`
              }));
            }
            setShowDateModal(false);
          }}>
            <Text style={styles.modalConfirmButton}>확인</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.modalCalendarContainer}>
          <View style={styles.customCalendar}>
            <View style={styles.calendarHeader}>
              <TouchableOpacity onPress={() => {
                const newDate = new Date(selectedDate || new Date());
                newDate.setMonth(newDate.getMonth() - 1);
                setSelectedDate(newDate);
              }}>
                <Text style={styles.calendarNavButton}>‹</Text>
              </TouchableOpacity>
              <Text style={styles.calendarTitle}>
                {(selectedDate || new Date()).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' })}
              </Text>
              <TouchableOpacity onPress={() => {
                const newDate = new Date(selectedDate || new Date());
                newDate.setMonth(newDate.getMonth() + 1);
                setSelectedDate(newDate);
              }}>
                <Text style={styles.calendarNavButton}>›</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.weekHeader}>
              {['일', '월', '화', '수', '목', '금', '토'].map((day, index) => (
                <Text key={index} style={styles.weekDay}>{day}</Text>
              ))}
            </View>
            
            <View style={styles.datesGrid}>
              {(() => {
                const currentDate = selectedDate || new Date();
                const year = currentDate.getFullYear();
                const month = currentDate.getMonth();
                const firstDay = new Date(year, month, 1);
                const startDate = new Date(firstDay);
                startDate.setDate(startDate.getDate() - firstDay.getDay());
                
                const dates = [];
                for (let i = 0; i < 42; i++) {
                  const date = new Date(startDate);
                  date.setDate(startDate.getDate() + i);
                  dates.push(date);
                }
                
                return dates.map((date, index) => {
                  const isCurrentMonth = date.getMonth() === month;
                  const isSelected = selectedDate && 
                    date.getDate() === selectedDate.getDate() && 
                    date.getMonth() === selectedDate.getMonth() && 
                    date.getFullYear() === selectedDate.getFullYear();
                  
                  return (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.dateButton,
                        isSelected ? styles.selectedDateButton : null,
                        !isCurrentMonth ? styles.otherMonthDate : null
                      ]}
                      onPress={() => {
                        const newDate = new Date(date);
                        let hour24 = selectedHour;
                        if (selectedPeriod === '오후' && selectedHour !== 12) {
                          hour24 = selectedHour + 12;
                        } else if (selectedPeriod === '오전' && selectedHour === 12) {
                          hour24 = 0;
                        }
                        newDate.setHours(hour24, selectedMinute);
                        setSelectedDate(newDate);
                        setMeetupData(prev => ({ ...prev, datetime: newDate }));
                      }}
                    >
                      <Text style={[
                        styles.dateText,
                        isSelected ? styles.selectedDateText : null,
                        !isCurrentMonth ? styles.otherMonthDateText : null
                      ]}>
                        {date.getDate()}
                      </Text>
                    </TouchableOpacity>
                  );
                });
              })()}
            </View>
          </View>
        </View>
      </View>
    </View>
  );

  // 시간 선택 모달 (스크롤 휠 방식)
  const renderTimeModal = () => {
    const periodScrollRef = useRef<ScrollView>(null);
    const hourScrollRef = useRef<ScrollView>(null);
    const minuteScrollRef = useRef<ScrollView>(null);

    const periods = ['오전', '오후'];
    const hours = [...Array(12)].map((_, i) => i + 1);
    const minutes = [0, 10, 20, 30, 40, 50];

    const ITEM_HEIGHT = 50;

    return (
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowTimeModal(false)}>
              <Text style={styles.modalCloseButton}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>시간 선택</Text>
            <TouchableOpacity onPress={() => {
              const currentDate = selectedDate || new Date();
              let hour24 = selectedHour;
              if (selectedPeriod === '오후' && selectedHour !== 12) {
                hour24 = selectedHour + 12;
              } else if (selectedPeriod === '오전' && selectedHour === 12) {
                hour24 = 0;
              }

              currentDate.setHours(hour24, selectedMinute);
              setSelectedDate(currentDate);
              setSelectedTime(`${hour24.toString().padStart(2, '0')}:${selectedMinute.toString().padStart(2, '0')}`);

              setMeetupData(prev => ({
                ...prev,
                datetime: currentDate,
                time: `${hour24.toString().padStart(2, '0')}:${selectedMinute.toString().padStart(2, '0')}`
              }));

              setShowTimeModal(false);
            }}>
              <Text style={styles.modalConfirmButton}>확인</Text>
            </TouchableOpacity>
          </View>

          {/* 선택된 시간 미리보기 */}
          <View style={styles.timePreview}>
            <Text style={styles.timePreviewText}>
              {selectedPeriod} {selectedHour}:{selectedMinute.toString().padStart(2, '0')}
            </Text>
          </View>

          <View style={styles.timeWheelPickerContainer}>
            {/* 오전/오후 선택 */}
            <View style={styles.wheelColumn}>
              <Text style={styles.wheelColumnLabel}>오전/오후</Text>
              <View style={styles.wheelWrapper}>
                <View style={styles.wheelHighlight} />
                <ScrollView
                  ref={periodScrollRef}
                  style={styles.wheelScrollView}
                  contentContainerStyle={styles.wheelScrollContent}
                  showsVerticalScrollIndicator={false}
                  snapToInterval={ITEM_HEIGHT}
                  decelerationRate="fast"
                  onMomentumScrollEnd={(e) => {
                    const index = Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT);
                    if (index >= 0 && index < periods.length) {
                      setSelectedPeriod(periods[index]);
                    }
                  }}
                >
                  <View style={{ height: ITEM_HEIGHT }} />
                  {periods.map((period, index) => (
                    <TouchableOpacity
                      key={period}
                      style={styles.wheelItem}
                      onPress={() => {
                        setSelectedPeriod(period);
                        periodScrollRef.current?.scrollTo({ y: index * ITEM_HEIGHT, animated: true });
                      }}
                    >
                      <Text style={[
                        styles.wheelItemText,
                        selectedPeriod === period && styles.wheelItemTextSelected
                      ]}>
                        {period}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  <View style={{ height: ITEM_HEIGHT }} />
                </ScrollView>
              </View>
            </View>

            {/* 시간 선택 */}
            <View style={styles.wheelColumn}>
              <Text style={styles.wheelColumnLabel}>시</Text>
              <View style={styles.wheelWrapper}>
                <View style={styles.wheelHighlight} />
                <ScrollView
                  ref={hourScrollRef}
                  style={styles.wheelScrollView}
                  contentContainerStyle={styles.wheelScrollContent}
                  showsVerticalScrollIndicator={false}
                  snapToInterval={ITEM_HEIGHT}
                  decelerationRate="fast"
                  onMomentumScrollEnd={(e) => {
                    const index = Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT);
                    if (index >= 0 && index < hours.length) {
                      setSelectedHour(hours[index]);
                    }
                  }}
                >
                  <View style={{ height: ITEM_HEIGHT }} />
                  {hours.map((hour, index) => (
                    <TouchableOpacity
                      key={hour}
                      style={styles.wheelItem}
                      onPress={() => {
                        setSelectedHour(hour);
                        hourScrollRef.current?.scrollTo({ y: index * ITEM_HEIGHT, animated: true });
                      }}
                    >
                      <Text style={[
                        styles.wheelItemText,
                        selectedHour === hour && styles.wheelItemTextSelected
                      ]}>
                        {hour}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  <View style={{ height: ITEM_HEIGHT }} />
                </ScrollView>
              </View>
            </View>

            {/* 분 선택 */}
            <View style={styles.wheelColumn}>
              <Text style={styles.wheelColumnLabel}>분</Text>
              <View style={styles.wheelWrapper}>
                <View style={styles.wheelHighlight} />
                <ScrollView
                  ref={minuteScrollRef}
                  style={styles.wheelScrollView}
                  contentContainerStyle={styles.wheelScrollContent}
                  showsVerticalScrollIndicator={false}
                  snapToInterval={ITEM_HEIGHT}
                  decelerationRate="fast"
                  onMomentumScrollEnd={(e) => {
                    const index = Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT);
                    if (index >= 0 && index < minutes.length) {
                      setSelectedMinute(minutes[index]);
                    }
                  }}
                >
                  <View style={{ height: ITEM_HEIGHT }} />
                  {minutes.map((minute, index) => (
                    <TouchableOpacity
                      key={minute}
                      style={styles.wheelItem}
                      onPress={() => {
                        setSelectedMinute(minute);
                        minuteScrollRef.current?.scrollTo({ y: index * ITEM_HEIGHT, animated: true });
                      }}
                    >
                      <Text style={[
                        styles.wheelItemText,
                        selectedMinute === minute && styles.wheelItemTextSelected
                      ]}>
                        {minute.toString().padStart(2, '0')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  <View style={{ height: ITEM_HEIGHT }} />
                </ScrollView>
              </View>
            </View>
          </View>
        </View>
      </View>
    );
  };

  // 식사 성향 화면 (제거 - 필수 스텝에서 제외)
  const renderEatingStyleStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>나의 식사 스타일을 알려주세요</Text>
      
      <View style={styles.settingSection}>
        <Text style={styles.settingLabel}>식사 속도</Text>
        <View style={styles.optionSelector}>
          {['빠름', '보통', '느림'].map(option => (
            <TouchableOpacity
              key={option}
              style={[
                styles.optionButton,
                meetupData.eatingSpeed === option && styles.optionButtonSelected
              ]}
              onPress={() => setMeetupData(prev => ({ ...prev, eatingSpeed: option }))}
            >
              <Text style={[
                styles.optionText,
                meetupData.eatingSpeed === option && styles.optionTextSelected
              ]}>
                {option}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.settingSection}>
        <Text style={styles.settingLabel}>대화 선호도</Text>
        <View style={styles.optionSelector}>
          {['조용히', '적당히', '활발히'].map(option => (
            <TouchableOpacity
              key={option}
              style={[
                styles.optionButton,
                meetupData.conversationLevel === option && styles.optionButtonSelected
              ]}
              onPress={() => setMeetupData(prev => ({ ...prev, conversationLevel: option }))}
            >
              <Text style={[
                styles.optionText,
                meetupData.conversationLevel === option && styles.optionTextSelected
              ]}>
                {option}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.settingSection}>
        <Text style={styles.settingLabel}>수다 정도</Text>
        <View style={styles.optionSelector}>
          {['내향적', '보통', '외향적'].map(option => (
            <TouchableOpacity
              key={option}
              style={[
                styles.optionButton,
                meetupData.talkativeness === option && styles.optionButtonSelected
              ]}
              onPress={() => setMeetupData(prev => ({ ...prev, talkativeness: option }))}
            >
              <Text style={[
                styles.optionText,
                meetupData.talkativeness === option && styles.optionTextSelected
              ]}>
                {option}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.settingSection}>
        <Text style={styles.settingLabel}>식사 목적</Text>
        <View style={styles.optionSelector}>
          {['맛있는 음식', '새로운 만남', '혼자 먹기 아쉬워서', '기타'].map(option => (
            <TouchableOpacity
              key={option}
              style={[
                styles.optionButton,
                meetupData.mealPurpose === option && styles.optionButtonSelected
              ]}
              onPress={() => setMeetupData(prev => ({ ...prev, mealPurpose: option }))}
            >
              <Text style={[
                styles.optionText,
                meetupData.mealPurpose === option && styles.optionTextSelected
              ]}>
                {option}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );

  // 약속금 설정 화면
  const renderDepositStep = () => (
    <View style={styles.stepContent}>
      <View style={styles.depositDisplay}>
        <Text style={styles.depositAmountText}>{meetupData.deposit.toLocaleString()}원</Text>
        <Text style={styles.depositHint}>노쇼 방지를 위한 보증금입니다</Text>
        <Text style={styles.depositSubHint}>모임 참여 후 100% 환불됩니다</Text>
      </View>

      <View style={styles.chipGroup}>
        {[3000, 5000, 10000, 20000].map(amount => (
          <TouchableOpacity
            key={amount}
            style={[
              styles.depositChip,
              meetupData.deposit === amount && styles.depositChipSelected
            ]}
            onPress={() => setMeetupData(prev => ({ ...prev, deposit: amount }))}
          >
            <Text style={[
              styles.depositChipText,
              meetupData.deposit === amount && styles.depositChipTextSelected
            ]}>
              {amount.toLocaleString()}원
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.infoBox}>
        <Icon name="info" size={16} color={COLORS.text.secondary} />
        <Text style={styles.infoBoxText}>
          보증금은 모임 완료 후 자동으로 환불됩니다.{'\n'}
          노쇼 시 보증금이 차감될 수 있습니다.
        </Text>
      </View>
    </View>
  );

  // 결제 화면
  const renderPaymentStep = () => (
    <View style={styles.stepContent}>
      <View style={styles.paymentOptions}>
        <TouchableOpacity
          style={[
            styles.paymentOption,
            paymentMethod === 'points' && styles.paymentOptionSelected
          ]}
          onPress={() => setPaymentMethod('points')}
        >
          <View style={styles.paymentOptionIcon}>
            <Icon name="dollar-sign" size={24} color={COLORS.primary.main} />
          </View>
          <View style={styles.paymentOptionInfo}>
            <Text style={styles.paymentOptionTitle}>포인트 결제</Text>
            <Text style={styles.paymentOptionSubtitle}>
              보유 포인트: {userPoints.toLocaleString()}P
            </Text>
          </View>
          <Icon
            name={paymentMethod === 'points' ? "check-circle" : "circle"}
            size={24}
            color={paymentMethod === 'points' ? COLORS.primary.main : COLORS.text.tertiary}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.paymentOption,
            paymentMethod === 'card' && styles.paymentOptionSelected
          ]}
          onPress={() => setPaymentMethod('card')}
        >
          <View style={styles.paymentOptionIcon}>
            <Icon name="credit-card" size={24} color={COLORS.primary.main} />
          </View>
          <View style={styles.paymentOptionInfo}>
            <Text style={styles.paymentOptionTitle}>신용카드</Text>
            <Text style={styles.paymentOptionSubtitle}>모든 카드사 이용 가능</Text>
          </View>
          <Icon
            name={paymentMethod === 'card' ? "check-circle" : "circle"}
            size={24}
            color={paymentMethod === 'card' ? COLORS.primary.main : COLORS.text.tertiary}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.paymentOption,
            paymentMethod === 'kakao' && styles.paymentOptionSelected
          ]}
          onPress={() => setPaymentMethod('kakao')}
        >
          <View style={styles.paymentOptionIcon}>
            <Icon name="message-circle" size={24} color="#FEE500" />
          </View>
          <View style={styles.paymentOptionInfo}>
            <Text style={styles.paymentOptionTitle}>카카오페이</Text>
            <Text style={styles.paymentOptionSubtitle}>간편하고 안전한 결제</Text>
          </View>
          <Icon
            name={paymentMethod === 'kakao' ? "check-circle" : "circle"}
            size={24}
            color={paymentMethod === 'kakao' ? COLORS.primary.main : COLORS.text.tertiary}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.costCard}>
        <View style={styles.costItem}>
          <Text style={styles.costItemLabel}>보증금 (환불 가능)</Text>
          <Text style={styles.costItemValue}>{meetupData.deposit.toLocaleString()}원</Text>
        </View>
        <View style={styles.costDivider} />
        <View style={styles.costItem}>
          <Text style={styles.costTotalLabel}>결제금액</Text>
          <Text style={styles.costTotalValue}>{meetupData.deposit.toLocaleString()}원</Text>
        </View>
      </View>
    </View>
  );

  // 현재 단계에 따른 내용 렌더링
  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return renderCategoryStep();
      case 2:
        return renderDateTimeStep();
      case 3:
        return renderParticipantsStep();
      case 4:
        return renderFilterStep();
      case 5:
        return renderLocationStep();
      case 6:
        return renderInfoStep();
      case 7:
        return renderDepositStep();
      case 8:
        return renderPaymentStep();
      default:
        return null;
    }
  };

  // 다음 버튼 유효성 검사
  const isNextButtonEnabled = () => {
    switch (currentStep) {
      case 1:
        return meetupData.category !== '';
      case 2:
        return meetupData.datetime !== null;
      case 3:
        return meetupData.maxParticipants > 0;
      case 4:
        return true; // 성별/연령은 기본값 있음
      case 5:
        return meetupData.location !== '';
      case 6:
        return meetupData.title.trim() !== '';
      case 7:
        return meetupData.deposit > 0;
      case 8:
        return paymentMethod === 'card' || (paymentMethod === 'points' && userPoints >= meetupData.deposit);
      default:
        return false;
    }
  };

  // 다음 버튼 액션
  const handleNextStep = async () => {
    if (currentStep === 7) {
      // 7단계에서 모임 생성
      await handleCreateMeetup();
    } else if (currentStep === 8) {
      // 8단계에서 결제 및 완료
      await handlePaymentComplete();
    } else {
      nextStep();
    }
  };

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => onCancel ? onCancel() : navigation.goBack()}>
          <Icon name="arrow-left" size={24} color={COLORS.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>모임 만들기</Text>
        <View style={styles.headerButton} />
      </View>

      {/* 프로그레스 바 */}
      <View style={styles.progressSection}>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${(currentStep / WIZARD_STEPS.length) * 100}%` }
            ]}
          />
        </View>
        <Text style={styles.progressText}>
          {currentStep} / {WIZARD_STEPS.length}
        </Text>
      </View>

      {/* 단계 정보 */}
      <View style={styles.stepHeader}>
        <Text style={styles.stepNumber}>STEP {currentStep}</Text>
        <Text style={styles.stepTitleText}>{WIZARD_STEPS[currentStep - 1]?.title}</Text>
        <Text style={styles.stepSubtitle}>{WIZARD_STEPS[currentStep - 1]?.description}</Text>
      </View>

      {/* 메인 컨텐트 */}
      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={styles.scrollContentContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {renderCurrentStep()}
      </ScrollView>

      {/* 하단 버튼 */}
      <View style={styles.footer}>
        {currentStep > 1 && (
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={prevStep}
          >
            <Text style={styles.secondaryButtonText}>이전</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[
            styles.primaryButton,
            !isNextButtonEnabled() && styles.primaryButtonDisabled,
            currentStep === 1 && styles.primaryButtonFull
          ]}
          onPress={handleNextStep}
          disabled={!isNextButtonEnabled() || isLoading || isPaymentLoading}
        >
          <Text style={styles.primaryButtonText}>
            {isLoading || isPaymentLoading ? '처리중...' :
             currentStep === 7 ? '모임 생성' :
             currentStep === 8 ? '결제하기' : '다음'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* 모달들 */}
      <Modal visible={showDateModal} transparent animationType="fade">
        {renderDateModal()}
      </Modal>

      <Modal visible={showTimeModal} transparent animationType="fade">
        {renderTimeModal()}
      </Modal>

      <Modal visible={showAgeModal} transparent animationType="fade">
        {renderAgeModal()}
      </Modal>
    </View>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  // ===== 기본 레이아웃 =====
  container: {
    flex: 1,
    backgroundColor: COLORS.neutral.background,
  },

  // ===== 헤더 =====
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.neutral.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.grey200,
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.primary,
  },

  // ===== 프로그레스 =====
  progressSection: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: COLORS.neutral.white,
  },
  progressBar: {
    height: 4,
    backgroundColor: COLORS.neutral.grey200,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary.main,
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },

  // ===== 스텝 헤더 =====
  stepHeader: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: COLORS.neutral.white,
    marginBottom: 8,
  },
  stepNumber: {
    fontSize: 12,
    color: COLORS.primary.main,
    fontWeight: '600',
    marginBottom: 4,
  },
  stepTitleText: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: 6,
  },
  stepSubtitle: {
    fontSize: 14,
    color: COLORS.text.secondary,
    lineHeight: 20,
  },

  // ===== 스크롤 컨텐트 =====
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },

  // ===== 스텝 컨텐트 (각 스텝의 메인 컨테이너) =====
  stepContent: {
    backgroundColor: COLORS.neutral.white,
    borderRadius: 16,
    padding: 20,
    marginTop: 8,
  },

  // ===== 카테고리 스타일 =====
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  categoryItem: {
    width: '48%',
    alignItems: 'center',
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.neutral.grey200,
    backgroundColor: COLORS.neutral.white,
  },
  categoryItemSelected: {
    borderColor: COLORS.primary.main,
    backgroundColor: `${COLORS.primary.main}10`,
  },
  categoryIconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: COLORS.neutral.grey100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  categoryIconWrapperSelected: {
    backgroundColor: `${COLORS.primary.main}15`,
  },
  categoryEmoji: {
    fontSize: 28,
  },
  categoryName: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
  categoryNameSelected: {
    color: COLORS.primary.main,
    fontWeight: '600',
  },

  // ===== 공통 섹션/라벨 스타일 =====
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 12,
  },
  dateTimeSection: {
    marginBottom: 20,
  },
  filterSection: {
    marginBottom: 24,
  },
  inputSection: {
    marginBottom: 20,
  },
  detailAddressSection: {
    marginTop: 20,
  },

  // ===== 선택 버튼 (날짜, 시간, 연령 등) =====
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: COLORS.neutral.grey50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.neutral.grey200,
  },
  selectButtonText: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text.primary,
    marginLeft: 12,
  },

  // ===== 선택 정보 박스 =====
  selectedInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    padding: 14,
    backgroundColor: `${COLORS.primary.main}10`,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.primary.main,
  },
  selectedInfoIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  selectedInfoText: {
    fontSize: 14,
    color: COLORS.primary.dark,
    fontWeight: '500',
  },

  // ===== 칩 그룹 (성별, 가격대 등) =====
  chipGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: COLORS.neutral.grey100,
  },
  chipSelected: {
    backgroundColor: COLORS.primary.main,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text.secondary,
  },
  chipTextSelected: {
    color: COLORS.neutral.white,
  },

  // ===== 텍스트 입력 =====
  textInput: {
    borderWidth: 1,
    borderColor: COLORS.neutral.grey200,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: COLORS.text.primary,
    backgroundColor: COLORS.neutral.white,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },

  // ===== 카드 박스 (참가자 수 등) =====
  cardBox: {
    backgroundColor: COLORS.neutral.white,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  cardIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  numberGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  numberBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.neutral.grey100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  numberBtnSelected: {
    backgroundColor: COLORS.primary.main,
  },
  numberBtnText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text.primary,
  },
  numberBtnTextSelected: {
    color: COLORS.neutral.white,
  },
  hintText: {
    fontSize: 13,
    color: COLORS.text.tertiary,
    textAlign: 'center',
  },

  // ===== 웹 맵 컨테이너 =====
  webMapContainer: {
    height: 250,
    borderRadius: 12,
    overflow: 'hidden',
  },

  // ===== 보증금 스타일 =====
  depositDisplay: {
    alignItems: 'center',
    marginBottom: 24,
  },
  depositAmountText: {
    fontSize: 36,
    fontWeight: '700',
    color: COLORS.primary.main,
    marginBottom: 8,
  },
  depositHint: {
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  depositSubHint: {
    fontSize: 13,
    color: COLORS.text.tertiary,
    marginTop: 4,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.neutral.grey50,
    padding: 14,
    borderRadius: 10,
    marginTop: 20,
    gap: 10,
  },
  infoBoxText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.text.secondary,
    lineHeight: 18,
  },
  depositChip: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: COLORS.neutral.grey100,
    alignItems: 'center',
  },
  depositChipSelected: {
    backgroundColor: COLORS.primary.main,
  },
  depositChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  depositChipTextSelected: {
    color: COLORS.neutral.white,
  },

  // ===== 비용 카드 =====
  costCard: {
    marginTop: 24,
    padding: 16,
    backgroundColor: COLORS.neutral.grey50,
    borderRadius: 12,
  },
  costCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 16,
  },
  costItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  costItemLabel: {
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  costItemValue: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text.primary,
  },
  costDivider: {
    height: 1,
    backgroundColor: COLORS.neutral.grey200,
    marginVertical: 12,
  },
  costTotalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  costTotalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary.main,
  },

  // ===== 결제 옵션 =====
  paymentOptions: {
    gap: 12,
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: COLORS.neutral.grey50,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  paymentOptionSelected: {
    borderColor: COLORS.primary.main,
    backgroundColor: `${COLORS.primary.main}08`,
  },
  paymentOptionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.neutral.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentOptionInfo: {
    flex: 1,
    marginLeft: 14,
  },
  paymentOptionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 2,
  },
  paymentOptionSubtitle: {
    fontSize: 13,
    color: COLORS.text.secondary,
  },

  // ===== 하단 버튼 =====
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 24,
    backgroundColor: COLORS.neutral.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.neutral.grey200,
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.neutral.grey300,
    alignItems: 'center',
    backgroundColor: COLORS.neutral.white,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.secondary,
  },
  primaryButton: {
    flex: 2,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: COLORS.primary.main,
    alignItems: 'center',
  },
  primaryButtonFull: {
    flex: 1,
  },
  primaryButtonDisabled: {
    backgroundColor: COLORS.neutral.grey300,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.neutral.white,
  },

  // ===== 모달 스타일 =====
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: COLORS.neutral.white,
    borderRadius: 20,
    overflow: 'hidden',
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.grey200,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  modalCloseButton: {
    fontSize: 20,
    color: COLORS.text.secondary,
    padding: 4,
  },
  modalConfirmButton: {
    fontSize: 16,
    color: COLORS.primary.main,
    fontWeight: '600',
  },

  // ===== 옛 스타일 호환 (모달 내부용) =====
  settingSection: {
    marginBottom: 24,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 12,
  },
  
  // 참가자 수 선택
  participantSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  participantButton: {
    flex: 1,
    paddingVertical: 12,
    marginHorizontal: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.neutral.grey200,
    alignItems: 'center',
  },
  participantButtonSelected: {
    borderColor: COLORS.primary.main,
    backgroundColor: COLORS.primary.main,
  },
  participantText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text.primary,
  },
  participantTextSelected: {
    color: COLORS.neutral.white,
  },

  // 옵션 선택
  optionSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.neutral.grey200,
  },
  optionButtonSelected: {
    borderColor: COLORS.primary.main,
    backgroundColor: COLORS.primary.main,
  },
  optionText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text.primary,
  },
  optionTextSelected: {
    color: COLORS.neutral.white,
  },

  // 입력 필드
  locationInput: {
    borderWidth: 1,
    borderColor: COLORS.neutral.grey200,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.text.primary,
    marginBottom: 12,
  },
  titleInput: {
    borderWidth: 1,
    borderColor: COLORS.neutral.grey200,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.text.primary,
    marginBottom: 16,
  },
  descriptionInput: {
    borderWidth: 1,
    borderColor: COLORS.neutral.grey200,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.text.primary,
    height: 120,
    marginBottom: 20,
  },

  // 지도 컨테이너
  mapContainer: {
    height: 200,
    borderRadius: 8,
    overflow: 'hidden',
    marginTop: 16,
    backgroundColor: COLORS.neutral.grey100,
  },

  // 보증금 스타일
  depositSection: {
    marginTop: 20,
  },
  depositSlider: {
    alignItems: 'center',
  },
  depositAmount: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.primary.main,
    marginBottom: 20,
  },
  depositOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  depositButton: {
    flex: 1,
    paddingVertical: 12,
    marginHorizontal: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.neutral.grey200,
    alignItems: 'center',
  },
  depositButtonSelected: {
    borderColor: COLORS.primary.main,
    backgroundColor: COLORS.primary.main,
  },
  depositText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text.primary,
  },
  depositTextSelected: {
    color: COLORS.neutral.white,
  },

  // 비용 분석
  costBreakdown: {
    marginTop: 24,
    padding: 16,
    backgroundColor: COLORS.neutral.background,
    borderRadius: 8,
  },
  costTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 12,
  },
  costRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  costLabel: {
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  costValue: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text.primary,
  },
  costTotal: {
    borderTopWidth: 1,
    borderTopColor: COLORS.neutral.grey200,
    marginTop: 8,
    paddingTop: 12,
  },
  costTotalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  costTotalValue: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary.main,
  },

  // 결제 방법
  paymentMethods: {
    marginTop: 20,
  },
  paymentMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: COLORS.neutral.background,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.neutral.grey200,
  },
  paymentMethodSelected: {
    borderColor: COLORS.primary.main,
    backgroundColor: `${COLORS.primary.main}10`,
  },
  paymentInfo: {
    flex: 1,
    marginLeft: 12,
  },
  paymentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  paymentSubtitle: {
    fontSize: 12,
    color: COLORS.text.secondary,
  },

  finalCostBreakdown: {
    marginTop: 24,
    padding: 16,
    backgroundColor: COLORS.neutral.background,
    borderRadius: 8,
  },

  // 하단 버튼
  bottomButtons: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLORS.neutral.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.neutral.grey200,
    gap: 12,
  },
  prevButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.neutral.grey300,
    alignItems: 'center',
  },
  prevButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.secondary,
  },
  nextButton: {
    flex: 2,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: COLORS.primary.main,
    alignItems: 'center',
  },
  nextButtonFullWidth: {
    flex: 1,
  },
  nextButtonDisabled: {
    backgroundColor: COLORS.neutral.grey300,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.neutral.white,
  },

  // 새로운 카테고리 화면 스타일
  categoryStepContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 60,
  },
  categoryTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: COLORS.text.primary,
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 30,
  },
  newCategoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    flex: 1,
  },
  newCategoryItem: {
    width: '23%',
    alignItems: 'center',
    marginBottom: 32,
  },
  newCategoryItemSelected: {
    transform: [{ scale: 1.05 }],
  },
  newCategoryIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  newCategoryIcon: {
    fontSize: 28,
  },
  newCategoryName: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 16,
  },
  newCategoryNameSelected: {
    color: COLORS.primary.main,
    fontWeight: '600',
  },
  pageIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  indicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  indicatorDotActive: {
    backgroundColor: COLORS.primary.main,
  },
  indicatorDotInactive: {
    backgroundColor: COLORS.neutral.grey300,
  },
  
  // 날짜/시간 선택 스타일 (웹 디자인)
  dateTimeCard: {
    marginTop: 20,
  },
  dateTimeButton: {
    padding: 20,
    backgroundColor: COLORS.neutral.white,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.neutral.grey200,
    ...SHADOWS.small,
  },
  dateTimeIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: COLORS.primary.light + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateTimeIcon: {
    fontSize: 24,
  },
  dateTimeButtonLabel: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginBottom: 4,
  },
  dateTimeButtonValue: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text.primary,
  },
  selectedDateTimeDisplay: {
    marginTop: 20,
    padding: 16,
    backgroundColor: COLORS.primary.light + '10',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.primary.main,
  },
  selectedDateTimeText: {
    fontSize: 14,
    color: COLORS.primary.dark,
    fontWeight: '500',
    textAlign: 'center',
  },
  
  // 모달 스타일
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContainer: {
    width: width - 40,
    maxWidth: 400,
    backgroundColor: COLORS.neutral.white,
    borderRadius: 16,
    overflow: 'hidden',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.grey200,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  modalCloseButton: {
    fontSize: 20,
    color: COLORS.text.secondary,
  },
  modalConfirmButton: {
    fontSize: 16,
    color: COLORS.primary.main,
    fontWeight: '600',
  },
  
  // 캘린더 스타일
  modalCalendarContainer: {
    padding: 20,
  },
  customCalendar: {
    width: '100%',
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  calendarTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  calendarNavButton: {
    fontSize: 24,
    color: COLORS.text.secondary,
    paddingHorizontal: 12,
  },
  weekHeader: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  weekDay: {
    width: '14%',
    textAlign: 'center',
    fontSize: 12,
    color: COLORS.text.secondary,
    fontWeight: '500',
  },
  datesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dateButton: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedDateButton: {
    backgroundColor: COLORS.primary.main,
    borderRadius: 8,
  },
  otherMonthDate: {
    opacity: 0.3,
  },
  dateText: {
    fontSize: 14,
    color: COLORS.text.primary,
  },
  selectedDateText: {
    color: COLORS.neutral.white,
    fontWeight: '600',
  },
  otherMonthDateText: {
    color: COLORS.text.tertiary,
  },
  
  // 시간 선택 스타일
  timeWheelContainer: {
    flexDirection: 'row',
    padding: 20,
  },
  timeWheelSection: {
    flex: 1,
    alignItems: 'center',
  },
  wheelLabel: {
    fontSize: 14,
    color: COLORS.text.secondary,
    fontWeight: '500',
    marginBottom: 12,
  },
  timeScrollView: {
    height: 200,
  },
  timeScrollItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginVertical: 4,
    borderRadius: 8,
  },
  timeScrollItemSelected: {
    backgroundColor: COLORS.primary.main,
  },
  timeScrollText: {
    fontSize: 16,
    color: COLORS.text.primary,
    textAlign: 'center',
  },
  timeScrollTextSelected: {
    color: COLORS.neutral.white,
    fontWeight: '600',
  },
  
  // 참가자 설정 스타일
  participantCard: {
    backgroundColor: COLORS.neutral.white,
    borderRadius: 12,
    padding: 20,
    ...SHADOWS.small,
  },
  participantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  participantIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  participantTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  numberSelector: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  numberButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.neutral.grey100,
  },
  numberButtonSelected: {
    backgroundColor: COLORS.primary.main,
  },
  numberButtonText: {
    fontSize: 16,
    color: COLORS.text.primary,
  },
  numberButtonTextSelected: {
    color: COLORS.neutral.white,
    fontWeight: '600',
  },
  participantHint: {
    fontSize: 12,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
  
  // 필터 설정 스타일
  filterCard: {
    backgroundColor: COLORS.neutral.white,
    borderRadius: 12,
    padding: 20,
    ...SHADOWS.small,
  },
  filterSection: {
    marginBottom: 20,
  },
  filterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  filterIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  filterTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: COLORS.neutral.grey100,
  },
  filterButtonSelected: {
    backgroundColor: COLORS.primary.main,
  },
  filterButtonText: {
    fontSize: 14,
    color: COLORS.text.primary,
  },
  filterButtonTextSelected: {
    color: COLORS.neutral.white,
    fontWeight: '500',
  },
  filterDivider: {
    height: 1,
    backgroundColor: COLORS.neutral.grey200,
    marginVertical: 20,
  },
  
  // Preference 스타일 (웹과 동일)
  preferenceSection: {
    marginBottom: 24,
  },
  preferenceLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 12,
  },
  preferenceOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  preferenceOption: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.neutral.grey200,
    alignItems: 'center',
  },
  preferenceSelected: {
    borderColor: COLORS.primary.main,
    backgroundColor: COLORS.primary.light + '10',
  },
  preferenceText: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.text.secondary,
  },
  preferenceTextSelected: {
    color: COLORS.primary.main,
    fontWeight: '600',
  },
  
  // Dropdown 스타일
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.neutral.grey200,
    backgroundColor: COLORS.neutral.white,
  },
  dropdownButtonText: {
    fontSize: 15,
    color: COLORS.text.primary,
  },
  dropdownArrow: {
    fontSize: 12,
    color: COLORS.text.secondary,
  },
  
  // Age Modal 스타일
  ageRangeContainer: {
    padding: 20,
  },
  ageRangeOption: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.neutral.grey200,
    alignItems: 'center',
    marginBottom: 20,
  },
  ageRangeOptionSelected: {
    borderColor: COLORS.primary.main,
    backgroundColor: COLORS.primary.light + '10',
  },
  ageRangeText: {
    fontSize: 15,
    color: COLORS.text.secondary,
  },
  ageRangeTextSelected: {
    color: COLORS.primary.main,
    fontWeight: '600',
  },
  ageSliderContainer: {
    marginBottom: 20,
  },
  ageRow: {
    marginBottom: 20,
  },
  ageLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text.primary,
    marginBottom: 12,
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  sliderTrack: {
    flex: 1,
    height: 4,
    backgroundColor: COLORS.neutral.grey200,
    borderRadius: 2,
    marginHorizontal: 12,
    position: 'relative',
  },
  sliderFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: COLORS.primary.main,
    borderRadius: 2,
  },
  sliderEndLabel: {
    fontSize: 12,
    color: COLORS.text.secondary,
  },
  ageQuickOptions: {
    borderTopWidth: 1,
    borderTopColor: COLORS.neutral.grey200,
    paddingTop: 16,
  },
  ageQuickLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.secondary,
    marginBottom: 12,
  },
  ageQuickButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  ageQuickButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: COLORS.neutral.grey100,
  },
  ageQuickButtonSelected: {
    backgroundColor: COLORS.primary.main,
  },
  ageQuickButtonText: {
    fontSize: 14,
    color: COLORS.text.primary,
  },
  ageQuickButtonTextSelected: {
    color: COLORS.neutral.white,
    fontWeight: '500',
  },
  
  // 날짜/시간 스크린샷 스타일
  dateTimeSection: {
    marginBottom: 24,
  },
  dateTimeLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text.secondary,
    marginBottom: 8,
  },
  dateTimeDropdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: COLORS.neutral.grey50,
    borderWidth: 1,
    borderColor: COLORS.neutral.grey200,
  },
  dateTimeDropdownText: {
    fontSize: 15,
    color: COLORS.text.primary,
  },
  selectedDateTimeIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  
  // 시간 모달 새로운 스타일
  timePickerContainer: {
    maxHeight: 400,
    paddingBottom: 20,
  },
  timePeriodSection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.grey200,
  },
  timeSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.secondary,
    marginBottom: 12,
  },
  timeButtonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  timePeriodButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: COLORS.neutral.grey100,
    alignItems: 'center',
  },
  timePeriodButtonSelected: {
    backgroundColor: COLORS.primary.main,
  },
  timePeriodText: {
    fontSize: 15,
    color: COLORS.text.primary,
  },
  timePeriodTextSelected: {
    color: COLORS.neutral.white,
    fontWeight: '600',
  },
  timeHourSection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.grey200,
  },
  timeMinuteSection: {
    padding: 20,
  },
  timeButtonsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  timeHourButton: {
    width: '22%',
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: COLORS.neutral.grey100,
    alignItems: 'center',
    marginBottom: 8,
  },
  timeHourButtonSelected: {
    backgroundColor: COLORS.primary.main,
  },
  timeHourText: {
    fontSize: 14,
    color: COLORS.text.primary,
  },
  timeHourTextSelected: {
    color: COLORS.neutral.white,
    fontWeight: '500',
  },
  timeMinuteButton: {
    width: '22%',
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: COLORS.neutral.grey100,
    alignItems: 'center',
    marginBottom: 8,
  },
  timeMinuteButtonSelected: {
    backgroundColor: COLORS.primary.main,
  },
  timeMinuteText: {
    fontSize: 14,
    color: COLORS.text.primary,
  },
  timeMinuteTextSelected: {
    color: COLORS.neutral.white,
    fontWeight: '500',
  },

  // 스크롤 휠 피커 스타일
  timePreview: {
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.grey200,
  },
  timePreviewText: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.primary.main,
  },
  timeWheelPickerContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  wheelColumn: {
    flex: 1,
    alignItems: 'center',
  },
  wheelColumnLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text.secondary,
    marginBottom: 12,
  },
  wheelWrapper: {
    height: 150,
    position: 'relative',
    width: '100%',
    overflow: 'hidden',
  },
  wheelHighlight: {
    position: 'absolute',
    top: 50,
    left: 8,
    right: 8,
    height: 50,
    backgroundColor: COLORS.primary.main + '15',
    borderRadius: 10,
    zIndex: 0,
  },
  wheelScrollView: {
    height: 150,
  },
  wheelScrollContent: {
    alignItems: 'center',
  },
  wheelItem: {
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  wheelItemText: {
    fontSize: 18,
    color: COLORS.text.tertiary,
  },
  wheelItemTextSelected: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.primary.main,
  },
});

export default UniversalCreateMeetupWizard;