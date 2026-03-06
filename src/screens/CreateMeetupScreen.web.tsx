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
import { COLORS, SHADOWS, CSS_SHADOWS, LAYOUT } from '../styles/colors';
import { HEADER_STYLE } from '../styles/spacing';
import { Icon } from '../components/Icon';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';
import { useRouterNavigation } from '../components/RouterNavigation';
import { FOOD_CATEGORY_NAMES, PRICE_RANGES } from '../constants/categories';
import { DepositSelector } from '../components/DepositSelector';
// Web-only imports - these are handled by webpack for web builds
// React Native doesn't support CSS imports
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
// CSS imports commented out to prevent React Native build issues
// import 'react-big-calendar/lib/css/react-big-calendar.css';
// import '../styles/big-calendar.css';

const localizer = momentLocalizer(moment);

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
          // 서울 시청 좌표 (중립적인 기본 위치)
          const seoulCityHall = new window.kakao.maps.LatLng(37.5665, 126.9780);
          
          const options = {
            center: seoulCityHall,
            level: 5  // 좀 더 넓은 범위로 표시
          };

          const map = new window.kakao.maps.Map(mapRef.current, options);
          const marker = new window.kakao.maps.Marker({
            position: seoulCityHall,
            map: map
          });

          // 지도와 마커 인스턴스 저장
          setMapInstance(map);
          setMarkerInstance(marker);

          // 사용자 현재 위치 가져오기 시도
          if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
              (position) => {
                const userLat = position.coords.latitude;
                const userLng = position.coords.longitude;
                const userLocation = new window.kakao.maps.LatLng(userLat, userLng);
                
                // 지도 중심을 사용자 위치로 이동
                map.setCenter(userLocation);
                marker.setPosition(userLocation);
                
                // 사용자 위치 주소 검색
                const geocoder = new window.kakao.maps.services.Geocoder();
                geocoder.coord2Address(userLng, userLat, function(result: any, status: any) {
                  if (status === window.kakao.maps.services.Status.OK) {
                    const detailAddr = result[0];
                    const roadAddress = detailAddr.road_address;
                    const basicAddress = detailAddr.address;
                    const displayAddress = roadAddress ? roadAddress.address_name : basicAddress.address_name;
                    onLocationSelect('현재 위치', displayAddress, userLat, userLng);
                  }
                });
              },
              (error) => {
                // 위치 정보를 가져올 수 없는 경우 서울 시청으로 설정
                onLocationSelect('서울 시청', '서울특별시 중구 세종대로 110', 37.5665, 126.9780);
              },
              { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
            );
          } else {
            // Geolocation을 지원하지 않는 경우 서울 시청으로 설정
            onLocationSelect('서울 시청', '서울특별시 중구 세종대로 110', 37.5665, 126.9780);
          }

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
                const roadAddress = detailAddr.road_address;
                const basicAddress = detailAddr.address;
                
                // 도로명 주소를 우선적으로 사용
                const displayAddress = roadAddress ? roadAddress.address_name : basicAddress.address_name;
                const addressType = roadAddress ? '도로명' : '지번';
                
                onLocationSelect(displayAddress, displayAddress, latlng.getLat(), latlng.getLng());
              }
            });
          });

          setMapLoaded(true);
          setMapError(null);
        }
      } catch (error) {
        // silently handle error
        setMapError('지도를 불러올 수 없습니다.');
      }
    };

    if (!window.kakao) {
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

  // 키워드 및 주소 검색 함수
  const searchAddress = () => {
    if (!searchQuery.trim() || !window.kakao) {return;}

    // 1. 먼저 키워드 검색 (가게명, 장소명)
    const places = new window.kakao.maps.services.Places();
    
    places.keywordSearch(searchQuery, function(keywordResult: any, keywordStatus: any) {
      if (keywordStatus === window.kakao.maps.services.Status.OK && keywordResult.length > 0) {
        // 키워드 검색 성공
        const place = keywordResult[0]; // 첫 번째 결과 사용
        const coords = new window.kakao.maps.LatLng(place.y, place.x);
        
        // 지도 중심 이동 및 마커 업데이트
        if (mapInstance && markerInstance) {
          mapInstance.setCenter(coords);
          markerInstance.setPosition(coords);
        }
        
        // 가게명을 location으로, 도로명 주소를 우선적으로 사용
        const displayLocation = place.place_name;
        const displayAddress = place.road_address_name || place.address_name;
        
        onLocationSelect(displayLocation, displayAddress, parseFloat(place.y), parseFloat(place.x));
      } else {
        // 키워드 검색 실패 시 주소 검색 시도
        const geocoder = new window.kakao.maps.services.Geocoder();
        geocoder.addressSearch(searchQuery, function(addressResult: any, addressStatus: any) {
          if (addressStatus === window.kakao.maps.services.Status.OK && addressResult.length > 0) {
            const address = addressResult[0];
            const coords = new window.kakao.maps.LatLng(address.y, address.x);
            
            // 도로명 주소 우선 사용
            const displayAddress = address.road_address_name || address.address_name;
            const addressType = address.road_address_name ? '도로명' : '지번';
            
            // 지도 중심 이동 및 마커 업데이트
            if (mapInstance && markerInstance) {
              mapInstance.setCenter(coords);
              markerInstance.setPosition(coords);
            }
            
            onLocationSelect(displayAddress, displayAddress, parseFloat(address.y), parseFloat(address.x));
          } else {
            alert('장소를 찾을 수 없습니다. 가게명, 지역명 또는 도로명 주소를 다시 확인해주세요.');
          }
        });
      }
    });
  };


  return (
    <View style={styles.mapSelectorContainer}>
      <Text style={styles.mapSelectorTitle}>약속 장소 선택</Text>
      
      {/* 검색과 지도 선택 */}
          {/* 검색 입력창 */}
          <View style={styles.searchContainer}>
            <View style={styles.inputWithButton}>
              <TextInput
                style={styles.searchInput}
                placeholder="도로명 주소를 검색하세요 (예: 서울 강남구 강남대로 390)"
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

          <Text style={styles.mapSelectorDescription}>또는 지도를 직접 클릭해서 도로명 주소를 선택하세요</Text>
          
          <View style={styles.mapContainer}>
            <div 
              ref={mapRef}
              style={{
                width: '100%',
                height: '400px',
                backgroundColor: COLORS.neutral.background,
                borderRadius: '12px',
                position: 'relative'
              }}
            />
            
            {/* 지도 위 툴팁 */}
            {mapLoaded && selectedLocation && (
              <View style={styles.mapTooltip}>
                <Text style={styles.tooltipText}>선택한 위치가 맞는지 확인해주세요</Text>
                <View style={styles.tooltipArrow} />
              </View>
            )}
            
            {!mapLoaded && !mapError && (
              <View style={styles.mapLoadingContainer}>
                <Text style={styles.mapLoadingText}>지도를 불러오는 중...</Text>
              </View>
            )}
            {mapError && (
              <View style={styles.mapErrorContainer}>
                <Text style={styles.mapErrorText}>{mapError}</Text>
              </View>
            )}
          </View>
      
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
    detailAddress: '', // 상세 주소 전용 필드 추가
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
    allowDirectChat: false,
  });

  // 달력 및 시간 선택기용 상태
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState('오후');
  const [selectedHour, setSelectedHour] = useState(6);
  const [selectedMinute, setSelectedMinute] = useState(0);

  // 시간 업데이트 함수
  const updateSelectedTime = () => {
    let hour24 = selectedHour;
    if (selectedPeriod === '오후' && selectedHour !== 12) {
      hour24 = selectedHour + 12;
    } else if (selectedPeriod === '오전' && selectedHour === 12) {
      hour24 = 0;
    }
    
    const timeString = `${hour24.toString().padStart(2, '0')}:${selectedMinute.toString().padStart(2, '0')}`;
    setFormData(prev => ({ ...prev, time: timeString }));
    
    if (selectedDate) {
      const dateString = selectedDate.toISOString().split('T')[0];
      setFormData(prev => ({ ...prev, date: dateString }));
    }
  };

  // 시간 업데이트 효과
  useEffect(() => {
    updateSelectedTime();
  }, [selectedPeriod, selectedHour, selectedMinute, selectedDate]);

  // 달력 날짜 선택 핸들러
  const handleSelectSlot = (slotInfo: any) => {
    if (slotInfo.start) {
      const newDate = new Date(slotInfo.start);
      setSelectedDate(newDate);
    }
  };

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
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleLocationSelect = (location: string, address: string, lat: number, lng: number) => {
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
    if (!formData.title.trim()) {
      Alert.alert('오류', '약속 제목을 입력해주세요.');
      return false;
    }

    if (!formData.location.trim()) {
      Alert.alert('오류', '약속 장소를 입력해주세요.');
      return false;
    }

    if (!formData.date || formData.date.trim() === '') {
      Alert.alert('오류', '약속 날짜를 입력해주세요.');
      return false;
    }

    if (!formData.time || formData.time.trim() === '') {
      Alert.alert('오류', '약속 시간을 입력해주세요.');
      return false;
    }

    if (!formData.maxParticipants.trim() || parseInt(formData.maxParticipants) < 2) {
      Alert.alert('오류', '최대 참가자 수를 2명 이상으로 입력해주세요.');
      return false;
    }

    // 필수 필터 검증 (기본값이 있으면 통과)
    if (preferenceFilter.ageFilterMax < preferenceFilter.ageFilterMin) {
      Alert.alert('오류', '최대 나이는 최소 나이보다 크거나 같아야 합니다.');
      return false;
    }

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
    if (!validateForm()) {
      return;
    }

    // 모임 데이터를 임시로 저장하고 약속금 결제 팝업만 표시
    setTempMeetupData({ meetupId: '', formData, preferenceFilter });
    setShowDepositSelector(true);
  };

  const createActualMeetup = async (depositId: string) => {
    if (!tempMeetupData) {
      showError('약속 데이터를 찾을 수 없습니다.');
      return null;
    }

    setLoading(true);
    
    try {
      const token = localStorage.getItem('token');
      const { formData: meetupFormData, preferenceFilter: meetupPreferenceFilter } = tempMeetupData;
      
      // FormData 생성 (이미지 업로드를 위해)
      const formDataToSend = new FormData();
      formDataToSend.append('title', meetupFormData.title);
      formDataToSend.append('description', meetupFormData.description);
      formDataToSend.append('category', meetupFormData.category);
      formDataToSend.append('location', meetupFormData.location);
      formDataToSend.append('address', meetupFormData.address);
      formDataToSend.append('detailAddress', meetupFormData.detailAddress);
      formDataToSend.append('latitude', meetupFormData.latitude.toString());
      formDataToSend.append('longitude', meetupFormData.longitude.toString());
      formDataToSend.append('date', meetupFormData.date);
      formDataToSend.append('time', meetupFormData.time);
      formDataToSend.append('maxParticipants', meetupFormData.maxParticipants);
      formDataToSend.append('priceRange', meetupFormData.priceRange);
      formDataToSend.append('requirements', meetupFormData.requirements);
      formDataToSend.append('allowDirectChat', meetupFormData.allowDirectChat.toString());
      formDataToSend.append('depositId', depositId); // 결제된 약속금 ID 추가
      
      // 필터 정보 추가
      formDataToSend.append('genderFilter', meetupPreferenceFilter.genderFilter);
      formDataToSend.append('ageFilterMin', meetupPreferenceFilter.ageFilterMin.toString());
      formDataToSend.append('ageFilterMax', meetupPreferenceFilter.ageFilterMax.toString());
      formDataToSend.append('eatingSpeed', meetupPreferenceFilter.eatingSpeed);
      formDataToSend.append('conversationDuringMeal', meetupPreferenceFilter.conversationDuringMeal);
      formDataToSend.append('talkativeness', meetupPreferenceFilter.talkativeness);
      formDataToSend.append('mealPurpose', meetupPreferenceFilter.mealPurpose);
      formDataToSend.append('specificRestaurant', meetupPreferenceFilter.specificRestaurant);
      formDataToSend.append('interests', JSON.stringify(meetupPreferenceFilter.interests));
      formDataToSend.append('isRequired', meetupPreferenceFilter.isRequired.toString());
      
      // 이미지 파일이 있으면 추가
      if (meetupFormData.image) {
        formDataToSend.append('image', meetupFormData.image);
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
        return meetupId;
      } else {
        showError(data.error || '약속 생성에 실패했습니다.');
        return null;
      }
    } catch (error) {
      // silently handle error
      showError('서버 연결에 실패했습니다.');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handleDepositPaid = async (depositId: string, amount: number) => {
    // 약속금 결제 완료 후 실제 모임 생성
    const meetupId = await createActualMeetup(depositId);
    
    if (!meetupId) {
      showError('약속 생성에 실패했습니다.');
      return;
    }

    try {
      const { formData: tempFormData, preferenceFilter: tempPreferenceFilter } = tempMeetupData!;
      
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
          
          if (!filterResponse.ok) {
            // silently handle filter setting failure
          }
        } catch (filterError) {
          // silently handle error
        }
      }
      
      showSuccess('약속이 성공적으로 생성되고 약속금이 결제되었습니다! 🎉');
      
      // 모임 상세 페이지로 이동
      setTimeout(() => {
        if (navigation && meetupId) {
          navigation.navigate('MeetupDetail', { meetupId });
        } else if (navigation) {
          navigation.goBack();
        }
      }, 2000);
      
    } catch (error) {
      // silently handle error
      showError('약속 생성 완료 중 오류가 발생했습니다.');
    }
  };

  const handleDepositCancelled = () => {
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
        <Text style={styles.headerTitle}>약속 만들기</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* 기본 정보 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>기본 정보</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>약속 제목 *</Text>
            <TextInput
              style={styles.input}
              placeholder="예) 강남 맛집 탐방"
              value={formData.title}
              onChangeText={(value) => handleInputChange('title', value)}
              maxLength={50}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>약속 설명</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="약속에 대한 설명을 작성해주세요"
              value={formData.description}
              onChangeText={(value) => handleInputChange('description', value)}
              multiline
              numberOfLines={4}
              maxLength={500}
            />
          </View>

          {/* 이미지 업로드 */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>약속 이미지</Text>
            <View style={styles.imageUploadContainer}>
              {formData.imagePreview ? (
                <View style={styles.imagePreviewContainer}>
                  <img 
                    src={formData.imagePreview} 
                    alt="약속 이미지 미리보기" 
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
          
          {/* 선택된 도로명 주소 표시 */}
          {formData.address && (
            <View style={styles.addressDisplayContainer}>
              <Text style={styles.addressDisplayLabel}>선택된 주소 (도로명)</Text>
              <View style={styles.addressDisplayBox}>
                <Text style={styles.addressDisplayText}>{formData.address}</Text>
                <Text style={styles.addressDisplayNote}>* 위 지도에서 다른 위치를 선택하여 주소를 변경할 수 있습니다</Text>
              </View>
            </View>
          )}

          {/* 상세 주소 입력란 */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>상세 주소</Text>
            <TextInput
              style={styles.input}
              placeholder="건물명, 층수, 호수 등 구체적인 위치 (예: 스타벅스 강남점 2층)"
              value={formData.detailAddress}
              onChangeText={(value) => handleInputChange('detailAddress', value)}
              maxLength={200}
            />
            <Text style={styles.inputHint}>선택사항 - 구체적인 위치나 랜드마크를 입력하세요</Text>
          </View>
        </View>

        {/* 일시 정보 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>언제 만날까요?</Text>
          <Text style={styles.sectionSubtitle}>달력에서 날짜를 선택하고, 시간을 입력해주세요</Text>
          
          <View style={styles.calendarContainer}>
            <Calendar
              localizer={localizer}
              events={selectedDate ? [{
                id: 1,
                title: '약속 일정',
                start: selectedDate,
                end: new Date(selectedDate.getTime() + 60 * 60 * 1000),
                resource: null
              }] : []}
              startAccessor="start"
              endAccessor="end"
              style={{ height: 280 }}
              onSelectSlot={handleSelectSlot}
              onSelectEvent={() => {}}
              selectable={true}
              popup={true}
              views={['month']}
              defaultView="month"
              step={60}
              showMultiDayTimes
              min={new Date(0, 0, 0, 9, 0, 0)}
              max={new Date(0, 0, 0, 23, 0, 0)}
              messages={{
                next: "다음",
                previous: "이전",
                today: "오늘",
                month: "월",
                week: "주",
                day: "일"
              }}
              className="custom-big-calendar"
            />
          </View>

          <View style={styles.timePickerContainer}>
            <Text style={styles.timePickerLabel}>시간 선택</Text>
            
            <View style={styles.compactTimePickerWrapper}>
              {/* 오전/오후 */}
              <View style={styles.compactTimeSection}>
                <View style={styles.timeToggleContainer}>
                  {['오전', '오후'].map((period) => (
                    <TouchableOpacity
                      key={period}
                      style={[
                        styles.timeToggleButton,
                        selectedPeriod === period ? styles.selectedTimeToggleButton : null
                      ]}
                      onPress={() => setSelectedPeriod(period)}
                    >
                      <Text style={[
                        styles.timeToggleText,
                        selectedPeriod === period ? styles.selectedTimeToggleText : null
                      ]}>
                        {period}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* 시간:분 */}
              <View style={styles.compactTimeSection}>
                <View style={styles.timeDisplayContainer}>
                  <TouchableOpacity style={styles.timeSelector} onPress={() => {
                    const newHour = selectedHour === 12 ? 1 : selectedHour + 1;
                    setSelectedHour(newHour);
                  }}>
                    <Text style={styles.timeArrow}>▲</Text>
                  </TouchableOpacity>
                  
                  <View style={styles.timeValueContainer}>
                    <Text style={styles.timeValue}>{selectedHour.toString().padStart(2, '0')}</Text>
                  </View>
                  
                  <TouchableOpacity style={styles.timeSelector} onPress={() => {
                    const newHour = selectedHour === 1 ? 12 : selectedHour - 1;
                    setSelectedHour(newHour);
                  }}>
                    <Text style={styles.timeArrow}>▼</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.timeSeparator}>:</Text>

                <View style={styles.timeDisplayContainer}>
                  <TouchableOpacity style={styles.timeSelector} onPress={() => {
                    const newMinute = selectedMinute === 55 ? 0 : selectedMinute + 5;
                    setSelectedMinute(newMinute);
                  }}>
                    <Text style={styles.timeArrow}>▲</Text>
                  </TouchableOpacity>
                  
                  <View style={styles.timeValueContainer}>
                    <Text style={styles.timeValue}>{selectedMinute.toString().padStart(2, '0')}</Text>
                  </View>
                  
                  <TouchableOpacity style={styles.timeSelector} onPress={() => {
                    const newMinute = selectedMinute === 0 ? 55 : selectedMinute - 5;
                    setSelectedMinute(newMinute);
                  }}>
                    <Text style={styles.timeArrow}>▼</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* 선택된 일시 표시 */}
            {selectedDate && (
              <View style={styles.selectedDateTimeDisplay}>
                <Text style={styles.selectedDateTimeText}>
                  ✨ 선택된 일정: {selectedDate.toLocaleDateString('ko-KR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    weekday: 'long'
                  })} {selectedPeriod} {selectedHour.toString().padStart(2, '0')}:{selectedMinute.toString().padStart(2, '0')}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* 약속 설정 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>약속 설정</Text>
          
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

          {/* 1대1 채팅 허용 설정 */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>약속 내 1대1 채팅</Text>
            <TouchableOpacity 
              style={styles.checkboxContainer} 
              onPress={() => handleInputChange('allowDirectChat', !formData.allowDirectChat)}
            >
              <View style={[styles.checkbox, formData.allowDirectChat && styles.checkboxActive]}>
                {formData.allowDirectChat && (
                  <Text style={styles.checkboxCheck}>✓</Text>
                )}
              </View>
              <Text style={styles.checkboxLabel}>약속 참가자 간 1대1 채팅 허용</Text>
            </TouchableOpacity>
            <Text style={styles.helperText}>
              체크 시 약속 참가자들이 서로 개인 메시지를 주고받을 수 있습니다
            </Text>
          </View>
        </View>

        {/* 필수 성향 필터 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>필수 성향 필터</Text>
          
          <Text style={styles.sectionSubtitle}>
            약속 참가 시 필수로 설정되는 기본 조건입니다
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
                <Text style={styles.label}>최소 출생연도</Text>
                <View style={styles.birthYearContainer}>
                  {Array.from({ length: 43 }, (_, i) => 2006 - i).map((year) => (
                    <TouchableOpacity
                      key={`min-${year}`}
                      style={[
                        styles.yearButton,
                        preferenceFilter.ageFilterMin === year && styles.yearButtonActive
                      ]}
                      onPress={() => handleFilterChange('ageFilterMin', year)}
                    >
                      <Text style={[
                        styles.yearButtonText,
                        preferenceFilter.ageFilterMin === year && styles.yearButtonTextActive
                      ]}>
                        {year}년
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={[styles.inputGroup, { flex: 1, marginLeft: 10 }]}>
                <Text style={styles.label}>최대 출생연도</Text>
                <View style={styles.birthYearContainer}>
                  {Array.from({ length: 43 }, (_, i) => 2006 - i).map((year) => (
                    <TouchableOpacity
                      key={`max-${year}`}
                      style={[
                        styles.yearButton,
                        preferenceFilter.ageFilterMax === year && styles.yearButtonActive
                      ]}
                      onPress={() => handleFilterChange('ageFilterMax', year)}
                    >
                      <Text style={[
                        styles.yearButtonText,
                        preferenceFilter.ageFilterMax === year && styles.yearButtonTextActive
                      ]}>
                        {year}년
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
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
              color={COLORS.text.secondary} 
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
            이 약속은 노쇼 방지와 신뢰도 향상을 위해 약속금 제도를 운영합니다
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
                    약속 참가 신청 시 결제됩니다
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
                💡 약속금은 약속 참가 신청 시에 결제되며, 참석 및 후기 작성 시 자동 환불됩니다.
              </Text>
            </View>
          </View>
        </View>

        {/* 생성 버튼 */}
        <button
          style={{
            background: loading ? COLORS.neutral.grey400 : COLORS.gradient.ctaCSS,
            color: COLORS.neutral.white,
            fontSize: '18px',
            fontWeight: '700',
            borderRadius: '8px',
            padding: '20px',
            border: 'none',
            width: '100%',
            marginTop: '20px',
            cursor: loading ? 'not-allowed' : 'pointer',
            boxShadow: loading ? 'none' : '0 4px 12px rgba(224,146,110,0.25)',
            transition: 'all 200ms ease',
          }}
          onMouseEnter={(e) => {
            if (!loading) {
              e.currentTarget.style.transform = 'scale(1.01)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(224,146,110,0.35)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = loading ? 'none' : '0 4px 12px rgba(224,146,110,0.25)';
          }}
          onClick={() => {
            handleCreateMeetup();
          }}
          disabled={loading}
        >
          {loading ? '약속 생성 중...' : '약속 만들기'}
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
          meetupId={''} // 실제 모임 생성 전이므로 빈 문자열
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
    ...HEADER_STYLE.sub,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...SHADOWS.sticky,
    zIndex: 10,
  },
  backButton: {
    padding: 10,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 200ms ease',
  },
  headerTitle: {
    ...HEADER_STYLE.subTitle,
  },
  content: {
    flex: 1,
    padding: 24,
    backgroundColor: COLORS.neutral.background,
  },
  section: {
    backgroundColor: COLORS.neutral.white,
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
    ...SHADOWS.medium,
    shadowColor: COLORS.neutral.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.secondary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.neutral.white,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: COLORS.text.primary,
    borderWidth: 1,
    borderColor: COLORS.neutral.grey200,
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
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.neutral.grey200,
  },
  categoryButtonSelected: {
    backgroundColor: COLORS.functional.info,
    borderColor: COLORS.functional.info,
  },
  categoryText: {
    fontSize: 14,
    color: COLORS.text.secondary,
    fontWeight: '500',
  },
  categoryTextSelected: {
    color: COLORS.neutral.white,
  },
  createButton: {
    backgroundColor: COLORS.functional.info,
    borderRadius: 8,
    padding: 20,
    alignItems: 'center',
    marginTop: 20,
    ...SHADOWS.large,
    shadowColor: COLORS.primary.dark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 16,
  },
  createButtonDisabled: {
    backgroundColor: COLORS.neutral.grey400,
  },
  createButtonText: {
    color: COLORS.neutral.white,
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
    backgroundColor: COLORS.neutral.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.functional.info,
  },
  toggleButtonText: {
    fontSize: 12,
    color: COLORS.functional.info,
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
    borderColor: COLORS.neutral.background,
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
    borderColor: COLORS.neutral.grey200,
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
    backgroundColor: COLORS.primary.light,
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
  // Calendar and Time Picker Styles
  calendarContainer: {
    marginBottom: 20,
    backgroundColor: COLORS.neutral.white,
    borderRadius: 8,
    overflow: 'hidden',
    shadowColor: COLORS.neutral.grey400,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  timePickerContainer: {
    marginTop: 16,
    padding: 16,
    backgroundColor: COLORS.primary.light,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.neutral.grey200,
  },
  timePickerLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: 16,
    textAlign: 'center',
  },
  compactTimePickerWrapper: {
    alignItems: 'center',
  },
  compactTimeSection: {
    marginBottom: 16,
  },
  timeToggleContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.neutral.white,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  timeToggleButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedTimeToggleButton: {
    backgroundColor: COLORS.primary.main,
  },
  timeToggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.secondary,
  },
  selectedTimeToggleText: {
    color: COLORS.text.white,
  },
  timeDisplayContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.neutral.white,
    borderRadius: 12,
    padding: 16,
  },
  timeSelector: {
    alignItems: 'center',
  },
  timeArrow: {
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeValueContainer: {
    minWidth: 60,
    height: 48,
    backgroundColor: COLORS.primary.accent,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 4,
  },
  timeValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  timeSeparator: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginHorizontal: 8,
  },
  selectedDateTimeDisplay: {
    marginTop: 16,
    padding: 16,
    backgroundColor: COLORS.primary.accent,
    borderRadius: 12,
    alignItems: 'center',
  },
  depositToggleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 2,
  },
  depositToggleDesc: {
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  toggleSwitch: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.neutral.grey200,
    padding: 2,
    justifyContent: 'center',
  },
  toggleSwitchActive: {
    backgroundColor: COLORS.primary.main,
  },
  toggleSwitchThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.neutral.white,
    shadowColor: COLORS.neutral.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  toggleSwitchThumbActive: {
    transform: [{ translateX: 20 }],
  },
  depositPolicyInfo: {
    backgroundColor: COLORS.neutral.background,
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  policyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 12,
  },
  policyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  policyLabel: {
    fontSize: 14,
    color: COLORS.text.secondary,
    flex: 1,
  },
  policyValue: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text.primary,
  },
  imageUploadContainer: {
    marginTop: 8,
  },
  imageUploadButton: {
    borderWidth: 2,
    borderColor: COLORS.neutral.grey200,
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.neutral.background,
    minHeight: 160,
  },
  imageUploadIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  imageUploadText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  imageUploadSubText: {
    fontSize: 12,
    color: COLORS.text.secondary,
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
    backgroundColor: 'rgba(17,17,17,0.6)',
    borderRadius: 15,
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeImageText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  // 약속금 정책 안내 스타일 추가
  policyNote: {
    backgroundColor: COLORS.functional.infoLight,
    borderRadius: 8,
    padding: 16,
    marginTop: 16,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary.main,
  },
  policyNoteText: {
    fontSize: 14,
    color: COLORS.functional.info,
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
    backgroundColor: COLORS.neutral.background,
  },
  accordionHeaderLeft: {
    flex: 1,
  },
  accordionSubtitle: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginTop: 4,
    lineHeight: 20,
  },
  // select input 스타일
  selectInput: {
    backgroundColor: COLORS.neutral.white,
    borderWidth: 1,
    borderColor: COLORS.neutral.grey200,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    fontSize: 16,
    color: COLORS.text.primary,
    minHeight: 48,
  },
  // 출생연도 선택기 스타일
  birthYearContainer: {
    backgroundColor: COLORS.neutral.white,
    borderWidth: 1,
    borderColor: COLORS.neutral.grey200,
    borderRadius: 8,
    padding: 8,
    maxHeight: 120,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    overflow: 'scroll',
  },
  yearButton: {
    backgroundColor: COLORS.neutral.grey100,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginBottom: 4,
    minWidth: 50,
    alignItems: 'center',
  },
  yearButtonActive: {
    backgroundColor: COLORS.primary.main,
  },
  yearButtonText: {
    fontSize: 14,
    color: COLORS.text.primary,
    fontWeight: '500',
  },
  yearButtonTextActive: {
    color: COLORS.neutral.white,
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
  mapContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  mapLoadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.neutral.background,
    borderRadius: 12,
  },
  mapLoadingText: {
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  mapErrorContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.neutral.background,
    borderRadius: 12,
  },
  mapErrorText: {
    fontSize: 14,
    color: COLORS.functional.error,
  },
  // 지도 위 툴팁
  mapTooltip: {
    position: 'absolute',
    top: 20,
    left: '50%',
    transform: [{ translateX: -50 }],
    backgroundColor: 'rgba(17,17,17,0.8)',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    zIndex: 1000,
  },
  tooltipText: {
    color: COLORS.text.white,
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  tooltipArrow: {
    position: 'absolute',
    bottom: -6,
    left: '50%',
    marginLeft: -6,
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: 'rgba(17,17,17,0.8)',
  },
  // 위치 확인 컨테이너
  locationConfirmContainer: {
    backgroundColor: COLORS.neutral.white,
    borderRadius: 12,
    ...SHADOWS.small,
    marginTop: 16,
  },
  selectedLocationCard: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.background,
  },
  selectedLocationTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  selectedLocationAddress: {
    fontSize: 16,
    color: COLORS.text.secondary,
    marginBottom: 8,
  },
  locationHint: {
    fontSize: 14,
    color: COLORS.text.secondary,
    fontStyle: 'italic',
  },
  confirmLocationButton: {
    backgroundColor: COLORS.primary.main,
    margin: 16,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    ...SHADOWS.small,
  },
  confirmLocationText: {
    color: COLORS.text.white,
    fontSize: 16,
    fontWeight: '600',
  },
  // 주소 표시 컨테이너
  addressDisplayContainer: {
    marginTop: 16,
  },
  addressDisplayLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  addressDisplayBox: {
    backgroundColor: COLORS.neutral.background,
    borderWidth: 1,
    borderColor: COLORS.neutral.grey200,
    borderRadius: 12,
    padding: 16,
  },
  addressDisplayText: {
    fontSize: 16,
    color: COLORS.text.primary,
    fontWeight: '500',
    marginBottom: 8,
  },
  addressDisplayNote: {
    fontSize: 12,
    color: COLORS.text.secondary,
    fontStyle: 'italic',
  },
  // 입력 힌트 스타일
  inputHint: {
    fontSize: 12,
    color: COLORS.text.tertiary,
    marginTop: 6,
    fontStyle: 'italic',
  },
  selectedLocationInfo: {
    padding: 12,
    backgroundColor: COLORS.neutral.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.neutral.grey200,
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
    backgroundColor: COLORS.neutral.white,
    borderWidth: 1,
    borderColor: COLORS.neutral.grey200,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    fontSize: 16,
    color: COLORS.text.primary,
  },
  searchButton: {
    backgroundColor: COLORS.primary.dark,
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
  // 체크박스 스타일
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: COLORS.neutral.grey300,
    backgroundColor: COLORS.neutral.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  checkboxActive: {
    backgroundColor: COLORS.primary.main,
    borderColor: COLORS.primary.main,
  },
  checkboxCheck: {
    color: COLORS.text.white,
    fontSize: 12,
    fontWeight: '700',
  },
  checkboxLabel: {
    fontSize: 14,
    color: COLORS.text.primary,
    flex: 1,
  },
  helperText: {
    fontSize: 12,
    color: COLORS.text.secondary,
    marginTop: 4,
    lineHeight: 16,
  },
});

export default CreateMeetupScreen;