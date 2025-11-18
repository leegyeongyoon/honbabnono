import React, { useState, useRef, useEffect } from 'react';
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
import { DepositSelector } from '../components/DepositSelector';

// Window 타입 확장
declare global {
  interface Window {
    kakao: any;
  }
}

interface CreateMeetupScreenProps {
  navigation?: any;
  user?: any;
}

// 카카오맵 위치 선택 컴포넌트
const LocationSelector: React.FC<{
  selectedLocation: string;
  selectedAddress: string;
  onLocationSelect: (location: string, address: string, lat: number, lng: number) => void;
}> = ({ selectedLocation, selectedAddress, onLocationSelect }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [mapInstance, setMapInstance] = useState<any>(null);
  const [markerInstance, setMarkerInstance] = useState<any>(null);

  useEffect(() => {
    const loadKakaoMap = () => {
      try {
        if (window.kakao && window.kakao.maps && mapRef.current) {
          console.log('🗺️ 위치 선택 지도 로드됨');
          
          // 강남역 1번 출구 좌표
          const gangnamStation = new window.kakao.maps.LatLng(37.498095, 127.027610);
          
          const options = {
            center: gangnamStation,
            level: 3
          };

          const map = new window.kakao.maps.Map(mapRef.current, options);
          const marker = new window.kakao.maps.Marker({
            position: gangnamStation,
            map: map
          });

          // 지도와 마커 인스턴스 저장
          setMapInstance(map);
          setMarkerInstance(marker);

          // 기본값으로 강남역 1번 출구 설정
          onLocationSelect('강남역 1번 출구', '서울 강남구 강남대로 390', 37.498095, 127.027610);

          // 지도 클릭 이벤트
          window.kakao.maps.event.addListener(map, 'click', function(mouseEvent: any) {
            const latlng = mouseEvent.latLng;
            
            // 마커 위치 업데이트
            marker.setPosition(latlng);
            
            // 주소 검색
            const geocoder = new window.kakao.maps.services.Geocoder();
            geocoder.coord2Address(latlng.getLng(), latlng.getLat(), function(result: any, status: any) {
              if (status === window.kakao.maps.services.Status.OK) {
                const detailAddr = result[0];
                const address = detailAddr.address || detailAddr.road_address;
                const locationName = address.address_name || address.road_address_name;
                
                console.log('📍 선택된 위치:', { locationName, address, lat: latlng.getLat(), lng: latlng.getLng() });
                onLocationSelect(locationName, address.address_name, latlng.getLat(), latlng.getLng());
              }
            });
          });

          setMapLoaded(true);
          setMapError(null);
        }
      } catch (error) {
        console.error('❌ 위치 선택 지도 로딩 에러:', error);
        setMapError('지도를 불러올 수 없습니다.');
      }
    };

    if (!window.kakao) {
      console.log('📥 카카오맵 스크립트 로딩 중...');
      const script = document.createElement('script');
      script.async = true;
      script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=5a202bd90ab8dff01348f24cb1c37f3f&libraries=services&autoload=false`;
      script.onload = () => {
        if (window.kakao && window.kakao.maps) {
          window.kakao.maps.load(loadKakaoMap);
        }
      };
      script.onerror = () => {
        setMapError('지도 스크립트를 불러올 수 없습니다.');
      };
      document.head.appendChild(script);
    } else {
      loadKakaoMap();
    }
  }, []);

  // 주소 검색 함수
  const searchAddress = () => {
    if (!searchQuery.trim() || !window.kakao) return;

    const geocoder = new window.kakao.maps.services.Geocoder();
    geocoder.addressSearch(searchQuery, function(result: any, status: any) {
      if (status === window.kakao.maps.services.Status.OK) {
        const coords = new window.kakao.maps.LatLng(result[0].y, result[0].x);
        const locationName = result[0].address_name;
        
        console.log('🔍 검색 결과:', { locationName, coords, result: result[0] });
        
        // 지도 중심 이동 및 마커 업데이트
        if (mapInstance && markerInstance) {
          mapInstance.setCenter(coords);
          markerInstance.setPosition(coords);
        }
        
        onLocationSelect(searchQuery, locationName, parseFloat(result[0].y), parseFloat(result[0].x));
      } else {
        alert('주소를 찾을 수 없습니다. 다른 검색어를 시도해보세요.');
      }
    });
  };


  return (
    <View style={styles.mapSelectorContainer}>
      <Text style={styles.mapSelectorTitle}>모임 장소 선택</Text>
      
      {/* 검색과 지도 선택 */}
          {/* 검색 입력창 */}
          <View style={styles.searchContainer}>
            <View style={styles.inputWithButton}>
              <TextInput
                style={styles.searchInput}
                placeholder="주소나 장소명을 검색하세요 (예: 강남역, 역삼동 카페)"
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={searchAddress}
              />
              <TouchableOpacity 
                style={styles.searchButton}
                onPress={searchAddress}
                disabled={!searchQuery.trim()}
              >
                <Text style={styles.searchButtonText}>검색</Text>
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.mapSelectorDescription}>또는 지도를 직접 클릭해서 위치를 선택하세요</Text>
          
          <div 
            ref={mapRef}
            style={{
              width: '100%',
              height: '300px',
              backgroundColor: '#f5f5f5',
              borderRadius: '8px',
              marginBottom: '12px',
              display: mapError ? 'flex' : 'block',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#666',
              fontSize: '14px'
            }}
          >
            {!mapLoaded && !mapError && '지도를 불러오는 중...'}
            {mapError && mapError}
          </div>
      
      {selectedLocation && (
        <View style={styles.selectedLocationInfo}>
          <Text style={styles.selectedLocationText}>📍 {selectedLocation}</Text>
          <Text style={styles.selectedAddressText}>{selectedAddress}</Text>
        </View>
      )}
    </View>
  );
};

const CreateMeetupScreen: React.FC<CreateMeetupScreenProps> = ({ user }) => {
  const navigation = useRouterNavigation();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    address: '',
    latitude: 37.498095, // 강남역 1번 출구 기본 좌표
    longitude: 127.027610,
    date: '',
    time: '',
    maxParticipants: '',
    category: '한식',
    priceRange: '1-2만원',
    requirements: '',
    image: null as File | null,
    imagePreview: '' as string,
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

  const [showAdvancedFilters, setShowAdvancedFilters] = useState(true);
  const [showOptionalFilters, setShowOptionalFilters] = useState(false);
  const [showDepositSelector, setShowDepositSelector] = useState(false);
  const [tempMeetupData, setTempMeetupData] = useState<any>(null);

  const [loading, setLoading] = useState(false);
  const { toast, showSuccess, showError, hideToast } = useToast();

  const categories = FOOD_CATEGORY_NAMES;
  const priceRanges = PRICE_RANGES;

  const handleInputChange = (field: string, value: string) => {
    console.log(`📝 입력 변경: ${field} = "${value}"`);
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleLocationSelect = (location: string, address: string, lat: number, lng: number) => {
    console.log(`📍 위치 선택됨: ${location} (${lat}, ${lng})`);
    setFormData(prev => ({
      ...prev,
      location,
      address,
      latitude: lat,
      longitude: lng
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
    console.log('🔍 폼 검증 시작');
    console.log('📋 폼 데이터:', formData);
    console.log('⚙️ 필터 데이터:', preferenceFilter);
    
    if (!formData.title.trim()) {
      console.log('❌ 제목 검증 실패:', formData.title);
      Alert.alert('오류', '모임 제목을 입력해주세요.');
      return false;
    }
    console.log('✅ 제목 검증 통과');
    
    if (!formData.location.trim()) {
      console.log('❌ 장소 검증 실패:', formData.location);
      Alert.alert('오류', '모임 장소를 입력해주세요.');
      return false;
    }
    console.log('✅ 장소 검증 통과');
    
    if (!formData.date || formData.date.trim() === '') {
      console.log('❌ 날짜 검증 실패:', `"${formData.date}"`);
      Alert.alert('오류', '모임 날짜를 입력해주세요.');
      return false;
    }
    console.log('✅ 날짜 검증 통과:', formData.date);
    
    if (!formData.time || formData.time.trim() === '') {
      console.log('❌ 시간 검증 실패:', `"${formData.time}"`);
      Alert.alert('오류', '모임 시간을 입력해주세요.');
      return false;
    }
    console.log('✅ 시간 검증 통과:', formData.time);
    
    if (!formData.maxParticipants.trim() || parseInt(formData.maxParticipants) < 2) {
      console.log('❌ 참가자 수 검증 실패:', formData.maxParticipants);
      Alert.alert('오류', '최대 참가자 수를 2명 이상으로 입력해주세요.');
      return false;
    }
    console.log('✅ 참가자 수 검증 통과');
    
    // 필수 필터 검증 (기본값이 있으면 통과)
    if (preferenceFilter.ageFilterMax < preferenceFilter.ageFilterMin) {
      console.log('❌ 나이 범위 검증 실패:', preferenceFilter.ageFilterMin, '-', preferenceFilter.ageFilterMax);
      Alert.alert('오류', '최대 나이는 최소 나이보다 크거나 같아야 합니다.');
      return false;
    }
    console.log('✅ 나이 범위 검증 통과');
    
    console.log('✅ 모든 검증 통과');
    return true;
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // 이미지 파일 검증
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
      if (!validTypes.includes(file.type)) {
        alert('JPG, PNG, GIF 파일만 업로드 가능합니다.');
        return;
      }

      // 파일 크기 검증 (5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('이미지 파일은 5MB 이하로 업로드 해주세요.');
        return;
      }

      // 미리보기 생성
      const reader = new FileReader();
      reader.onload = (e) => {
        setFormData(prev => ({
          ...prev,
          image: file,
          imagePreview: e.target?.result as string
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setFormData(prev => ({
      ...prev,
      image: null,
      imagePreview: ''
    }));
  };

  const handleCreateMeetup = async () => {
    console.log('🔍 모임 만들기 버튼 클릭됨');
    console.log('📋 현재 폼 데이터:', formData);
    console.log('⚙️ 현재 필터 데이터:', preferenceFilter);
    
    if (!validateForm()) {
      console.log('❌ 폼 검증 실패');
      return;
    }

    console.log('✅ 폼 검증 통과, 약속금 결제 팝업 표시');
    // 먼저 임시 모임을 생성하여 meetupId를 얻습니다
    await createTempMeetup();
  };

  const createTempMeetup = async () => {
    setLoading(true);
    
    try {
      const token = localStorage.getItem('token');
      
      // FormData 생성 (이미지 업로드를 위해)
      const formDataToSend = new FormData();
      formDataToSend.append('title', formData.title);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('category', formData.category);
      formDataToSend.append('location', formData.location);
      formDataToSend.append('address', formData.address);
      formDataToSend.append('latitude', formData.latitude.toString());
      formDataToSend.append('longitude', formData.longitude.toString());
      formDataToSend.append('date', formData.date);
      formDataToSend.append('time', formData.time);
      formDataToSend.append('maxParticipants', formData.maxParticipants);
      formDataToSend.append('priceRange', formData.priceRange);
      formDataToSend.append('requirements', formData.requirements);
      
      // 필터 정보 추가
      formDataToSend.append('genderFilter', preferenceFilter.genderFilter);
      formDataToSend.append('ageFilterMin', preferenceFilter.ageFilterMin.toString());
      formDataToSend.append('ageFilterMax', preferenceFilter.ageFilterMax.toString());
      formDataToSend.append('eatingSpeed', preferenceFilter.eatingSpeed);
      formDataToSend.append('conversationDuringMeal', preferenceFilter.conversationDuringMeal);
      formDataToSend.append('talkativeness', preferenceFilter.talkativeness);
      formDataToSend.append('mealPurpose', preferenceFilter.mealPurpose);
      formDataToSend.append('specificRestaurant', preferenceFilter.specificRestaurant);
      formDataToSend.append('interests', JSON.stringify(preferenceFilter.interests));
      formDataToSend.append('isRequired', preferenceFilter.isRequired.toString());
      
      // 이미지 파일이 있으면 추가
      if (formData.image) {
        formDataToSend.append('image', formData.image);
      }
      
      console.log('📤 전송할 FormData 내용:');
      for (let [key, value] of formDataToSend.entries()) {
        console.log(`  ${key}: ${value}`);
      }
      
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/meetups`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          // Content-Type을 설정하지 않음 (FormData가 자동으로 설정)
        },
        body: formDataToSend,
      });

      const data = await response.json();

      if (response.ok) {
        const meetupId = data.meetup?.id;
        console.log('✅ 임시 모임 생성 성공, meetupId:', meetupId);
        
        // 임시 모임 데이터와 meetupId 저장
        setTempMeetupData({ meetupId, formData, preferenceFilter });
        
        // 약속금 결제 팝업 표시
        setShowDepositSelector(true);
      } else {
        showError(data.error || '임시 모임 생성에 실패했습니다.');
      }
    } catch (error) {
      console.error('임시 모임 생성 오류:', error);
      showError('서버 연결에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleDepositPaid = async (depositId: string, amount: number) => {
    console.log('💰 약속금 결제 완료:', depositId, amount);
    
    if (!tempMeetupData) {
      showError('모임 데이터를 찾을 수 없습니다.');
      return;
    }

    try {
      const { meetupId, formData: tempFormData, preferenceFilter: tempPreferenceFilter } = tempMeetupData;
      
      // 필터 설정
      if (showAdvancedFilters) {
        try {
          const token = localStorage.getItem('token');
          const filterData = {
            ...tempPreferenceFilter,
            locationFilter: tempFormData.location || tempFormData.address,
            foodCategory: tempFormData.category === '한식' ? 'korean' : 
                        tempFormData.category === '일식' ? 'japanese' :
                        tempFormData.category === '양식' ? 'western' :
                        tempFormData.category === '카페' ? 'dessert' : 'no_preference'
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
      
      showSuccess('모임이 성공적으로 생성되고 약속금이 결제되었습니다! 🎉');
      
      // 모임 상세 페이지로 이동
      setTimeout(() => {
        if (navigation && meetupId) {
          navigation.navigate('MeetupDetail', { meetupId });
        } else if (navigation) {
          navigation.goBack();
        }
      }, 2000);
      
    } catch (error) {
      console.error('약속금 결제 후 처리 오류:', error);
      showError('모임 생성 완료 중 오류가 발생했습니다.');
    }
  };

  const handleDepositCancelled = () => {
    console.log('💸 약속금 결제 취소됨');
    // 임시 데이터 정리
    setTempMeetupData(null);
    setShowDepositSelector(false);
  };

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
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

          {/* 이미지 업로드 */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>모임 이미지</Text>
            <View style={styles.imageUploadContainer}>
              {formData.imagePreview ? (
                <View style={styles.imagePreviewContainer}>
                  <img 
                    src={formData.imagePreview} 
                    alt="모임 이미지 미리보기" 
                    style={styles.imagePreview}
                  />
                  <TouchableOpacity 
                    style={styles.removeImageButton} 
                    onPress={handleRemoveImage}
                  >
                    <Text style={styles.removeImageText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity 
                  style={styles.imageUploadButton}
                  onPress={() => document.getElementById('image-upload')?.click()}
                >
                  <Text style={styles.imageUploadIcon}>📷</Text>
                  <Text style={styles.imageUploadText}>이미지 추가</Text>
                  <Text style={styles.imageUploadSubText}>JPG, PNG, GIF (최대 5MB)</Text>
                </TouchableOpacity>
              )}
              <input
                id="image-upload"
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/gif"
                onChange={handleImageUpload}
                style={{ display: 'none' }}
              />
            </View>
          </View>
        </View>

        {/* 장소 정보 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>장소 정보</Text>
          
          {/* 위치 선택 지도 */}
          <LocationSelector
            selectedLocation={formData.location}
            selectedAddress={formData.address}
            onLocationSelect={handleLocationSelect}
          />

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
              <input
                type="date"
                style={{
                  ...styles.input as any,
                  fontFamily: 'inherit',
                  border: '1px solid #e2e8f0',
                }}
                value={formData.date}
                onChange={(e) => handleInputChange('date', e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </View>
            
            <View style={[styles.inputGroup, { flex: 1, marginLeft: 10 }]}>
              <Text style={styles.label}>시간 *</Text>
              <input
                type="time"
                style={{
                  ...styles.input as any,
                  fontFamily: 'inherit',
                  border: '1px solid #e2e8f0',
                }}
                value={formData.time}
                onChange={(e) => handleInputChange('time', e.target.value)}
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

        {/* 필수 성향 필터 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>필수 성향 필터</Text>
          
          <Text style={styles.sectionSubtitle}>
            모임 참가 시 필수로 설정되는 기본 조건입니다
          </Text>

          <View style={styles.filterGroup}>
            <Text style={styles.filterGroupTitle}>기본 조건 (필수)</Text>
                
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
                <select 
                  style={styles.selectInput}
                  value={preferenceFilter.ageFilterMin}
                  onChange={(e) => handleFilterChange('ageFilterMin', parseInt(e.target.value))}
                >
                  {Array.from({ length: 43 }, (_, i) => i + 18).map((age) => (
                    <option key={age} value={age}>{age}세</option>
                  ))}
                </select>
              </View>
              <View style={[styles.inputGroup, { flex: 1, marginLeft: 10 }]}>
                <Text style={styles.label}>최대 나이</Text>
                <select 
                  style={styles.selectInput}
                  value={preferenceFilter.ageFilterMax}
                  onChange={(e) => handleFilterChange('ageFilterMax', parseInt(e.target.value))}
                >
                  {Array.from({ length: 43 }, (_, i) => i + 18).map((age) => (
                    <option key={age} value={age}>{age}세</option>
                  ))}
                </select>
              </View>
            </View>
          </View>
        </View>

        {/* 선택 성향 필터 */}
        <View style={styles.section}>
          <TouchableOpacity 
            style={styles.accordionHeader}
            onPress={() => setShowOptionalFilters(!showOptionalFilters)}
          >
            <View style={styles.accordionHeaderLeft}>
              <Text style={styles.sectionTitle}>선택 성향 필터</Text>
              <Text style={styles.accordionSubtitle}>더욱 세밀한 설정 (선택사항)</Text>
            </View>
            <Icon 
              name={showOptionalFilters ? "chevron-up" : "chevron-down"} 
              size={20} 
              color="#666" 
            />
          </TouchableOpacity>
          
          {showOptionalFilters && (
            <>
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

        {/* 약속금 설정 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>약속금 정책</Text>
          <Text style={styles.sectionSubtitle}>
            이 모임은 노쇼 방지와 신뢰도 향상을 위해 약속금 제도를 운영합니다
          </Text>
          
          <View style={styles.depositPolicyInfo}>
            <View style={styles.depositToggleRow}>
              <View style={styles.depositToggleLeft}>
                <View style={styles.depositToggleIcon}>
                  <Text style={styles.depositToggleIconText}>💰</Text>
                </View>
                <View style={styles.depositToggleInfo}>
                  <Text style={styles.depositToggleTitle}>
                    약속금 3,000원
                  </Text>
                  <Text style={styles.depositToggleDesc}>
                    모임 참가 신청 시 결제됩니다
                  </Text>
                </View>
              </View>
            </View>
            
            <Text style={styles.policyTitle}>환불 정책</Text>
            <View style={styles.policyItem}>
              <Text style={styles.policyLabel}>• 정상 참석 + 후기 작성</Text>
              <Text style={styles.policyValue}>100% 환불</Text>
            </View>
            <View style={styles.policyItem}>
              <Text style={styles.policyLabel}>• 정상 참석 (후기 미작성)</Text>
              <Text style={styles.policyValue}>포인트 전환</Text>
            </View>
            <View style={styles.policyItem}>
              <Text style={styles.policyLabel}>• 노쇼</Text>
              <Text style={styles.policyValue}>약속금 몰수</Text>
            </View>
            
            <View style={styles.policyNote}>
              <Text style={styles.policyNoteText}>
                💡 약속금은 모임 참가 신청 시에 결제되며, 참석 및 후기 작성 시 자동 환불됩니다.
              </Text>
            </View>
          </View>
        </View>

        {/* 생성 버튼 */}
        <button
          style={{
            backgroundColor: loading ? '#a0aec0' : '#667eea',
            color: '#ffffff',
            fontSize: '18px',
            fontWeight: '700',
            borderRadius: '16px',
            padding: '20px',
            border: 'none',
            width: '100%',
            marginTop: '20px',
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
          onClick={() => {
            console.log('🖱️ 버튼 클릭 이벤트 발생, loading 상태:', loading);
            handleCreateMeetup();
          }}
          disabled={loading}
        >
          {loading ? '모임 생성 중...' : '모임 만들기'}
        </button>

        <View style={{ height: 40 }} />
      </ScrollView>

      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={hideToast}
      />

      {tempMeetupData && (
        <DepositSelector
          visible={showDepositSelector}
          onClose={handleDepositCancelled}
          onDepositPaid={handleDepositPaid}
          meetupId={tempMeetupData.meetupId}
        />
      )}

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
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    borderBottomWidth: 0,
    ...SHADOWS.medium,
    shadowColor: 'rgba(0,0,0,0.05)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text.primary,
    letterSpacing: -0.3,
  },
  content: {
    flex: 1,
    padding: 24,
    backgroundColor: COLORS.neutral.background,
  },
  section: {
    backgroundColor: COLORS.neutral.white,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    ...SHADOWS.medium,
    shadowColor: 'rgba(0,0,0,0.05)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2d3748',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4a5568',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#2d3748',
    borderWidth: 1,
    borderColor: '#e2e8f0',
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
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  categoryButtonSelected: {
    backgroundColor: '#667eea',
    borderColor: '#667eea',
  },
  categoryText: {
    fontSize: 14,
    color: '#718096',
    fontWeight: '500',
  },
  categoryTextSelected: {
    color: '#ffffff',
  },
  createButton: {
    backgroundColor: '#667eea',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginTop: 20,
    ...SHADOWS.large,
    shadowColor: 'rgba(102, 126, 234, 0.3)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 16,
  },
  createButtonDisabled: {
    backgroundColor: '#a0aec0',
  },
  createButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
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
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#667eea',
  },
  toggleButtonText: {
    fontSize: 12,
    color: '#667eea',
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
  // 약속금 관련 스타일
  depositToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    marginBottom: 16,
  },
  depositToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  depositToggleIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF3CD',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  depositToggleIconText: {
    fontSize: 20,
  },
  depositToggleInfo: {
    flex: 1,
  },
  depositToggleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  depositToggleDesc: {
    fontSize: 14,
    color: '#666666',
  },
  toggleSwitch: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E5E5E5',
    padding: 2,
    justifyContent: 'center',
  },
  toggleSwitchActive: {
    backgroundColor: '#007AFF',
  },
  toggleSwitchThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  toggleSwitchThumbActive: {
    transform: [{ translateX: 20 }],
  },
  depositPolicyInfo: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  policyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  policyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  policyLabel: {
    fontSize: 14,
    color: '#666666',
    flex: 1,
  },
  policyValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1A1A1A',
  },
  imageUploadContainer: {
    marginTop: 8,
  },
  imageUploadButton: {
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAFAFA',
    minHeight: 160,
  },
  imageUploadIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  imageUploadText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  imageUploadSubText: {
    fontSize: 12,
    color: '#666',
  },
  imagePreviewContainer: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
  },
  imagePreview: {
    width: '100%',
    height: 200,
    objectFit: 'cover',
    borderRadius: 12,
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 15,
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeImageText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // 약속금 정책 안내 스타일 추가
  policyNote: {
    backgroundColor: '#F0F8FF',
    borderRadius: 8,
    padding: 16,
    marginTop: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  policyNoteText: {
    fontSize: 14,
    color: '#2E5BBA',
    lineHeight: 20,
    fontWeight: '500',
  },
  // 아코디언 스타일
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 4,
    borderRadius: 8,
    backgroundColor: '#F8F9FA',
  },
  accordionHeaderLeft: {
    flex: 1,
  },
  accordionSubtitle: {
    fontSize: 14,
    color: '#666666',
    marginTop: 4,
    lineHeight: 20,
  },
  // select input 스타일
  selectInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    fontSize: 16,
    color: '#333333',
    minHeight: 48,
  },
  // 위치 선택 지도 스타일
  mapSelectorContainer: {
    marginBottom: 16,
  },
  mapSelectorTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  mapSelectorDescription: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginBottom: 12,
  },
  selectedLocationInfo: {
    padding: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  selectedLocationText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  selectedAddressText: {
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  // 검색 관련 스타일
  searchContainer: {
    marginBottom: 12,
  },
  inputWithButton: {
    flexDirection: 'row',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    fontSize: 16,
    color: '#333333',
  },
  searchButton: {
    backgroundColor: COLORS.primary.main,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButtonText: {
    color: COLORS.text.white,
    fontSize: 14,
    fontWeight: '600',
  },
});

export default CreateMeetupScreen;