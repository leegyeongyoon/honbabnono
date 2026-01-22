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
import { COLORS, SHADOWS } from '../styles/colors';
import { Icon } from '../components/Icon';
import { useToast } from '../hooks/useToast';
import { useRouterNavigation } from '../components/RouterNavigation';
import { FOOD_CATEGORIES, PRICE_RANGES } from '../constants/categories';
// Web-only CSS imports - these will be handled by webpack in the web build
// React Native doesn't support CSS imports, so these are web-only
// import '../styles/datetime.css';
// import { Calendar, momentLocalizer } from 'react-big-calendar';
// import moment from 'moment';
// import 'react-big-calendar/lib/css/react-big-calendar.css';
// import '../styles/big-calendar.css';
// import DatePicker from 'react-datepicker';
// import 'react-datepicker/dist/react-datepicker.css';
// import '../styles/datepicker.css';
// Kakao Map 타입 선언
declare global {
  interface Window {
    kakao: any;
  }
}

interface CreateMeetupWizardProps {
  navigation?: any;
  user?: any;
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
  image: File | null;
  priceRange: string;
  deposit: number;
  // 식사 성향 필드
  eatingSpeed: string;
  conversationLevel: string;
  talkativeness: string;
  mealPurpose: string;
  specificRestaurant: string;
}

// const localizer = momentLocalizer(moment);

// Kakao Map 컴포넌트
interface KakaoMapComponentProps {
  onMapLoad: (map: any) => void;
  onLocationSelect: (location: { latLng: { lat: number; lng: number }; address: string }) => void;
}

const KakaoMapComponent: React.FC<KakaoMapComponentProps> = ({ onMapLoad, onLocationSelect }) => {
  const mapRef = React.useRef<HTMLDivElement>(null);
  const [map, setMap] = React.useState<any>(null);
  const [isScriptLoaded, setIsScriptLoaded] = React.useState(false);
  const [mapLoadError, setMapLoadError] = React.useState(false);
  const [isWebView, setIsWebView] = React.useState(false);

  const sendLogToNative = (message: string) => {
    console.log(`🗺️ [KakaoMapComponent] ${message}`);
    
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'LOG',
        message: `[KakaoMapComponent] ${message}`
      }));
    }
  };

  React.useEffect(() => {
    sendLogToNative('KakaoMapComponent 초기화 시작...');
    
    // WebView 환경 체크
    const isInWebView = window.ReactNativeWebView || window.navigator.userAgent.includes('wv');
    setIsWebView(isInWebView);
    sendLogToNative(`환경 체크 - WebView: ${isInWebView}`);
    
    // Kakao Map API 스크립트가 이미 로드되었는지 확인
    if (window.kakao && window.kakao.maps) {
      sendLogToNative('Kakao maps 이미 로드됨');
      setIsScriptLoaded(true);
      return;
    }

    sendLogToNative('Kakao maps 스크립트 로드 중...');
    
    // 기존 스크립트가 있는지 확인
    const existingScript = document.querySelector('script[src*="dapi.kakao.com"]');
    if (existingScript) {
      sendLogToNative('기존 스크립트 발견, 로드 대기 중...');
      const checkKakao = setInterval(() => {
        if (window.kakao && window.kakao.maps) {
          clearInterval(checkKakao);
          sendLogToNative('기존 스크립트로부터 Kakao maps 로드됨');
          setIsScriptLoaded(true);
        }
      }, 100);
      return;
    }

    // Kakao Map API 스크립트 로드
    const script = document.createElement('script');
    script.async = true;
    // WebView 환경을 위한 JavaScript 키 사용 (REST API 키 대신)
    const apiKey = process.env.REACT_APP_KAKAO_JS_KEY || '9d1ee4bec9bd24d0ac9f8c9d68fbf432';
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${apiKey}&libraries=services,clusterer,drawing&autoload=true`;
    
    sendLogToNative(`스크립트 생성: ${script.src}`);
    
    script.onload = () => {
      sendLogToNative('Kakao 스크립트 로드 성공');
      
      // autoload=true이므로 지연 후 확인
      setTimeout(() => {
        if (window.kakao && window.kakao.maps && window.kakao.maps.LatLng) {
          sendLogToNative('window.kakao.maps.LatLng 확인됨');
          setIsScriptLoaded(true);
        } else {
          sendLogToNative(`ERROR: LatLng 미확인 - kakao: ${!!window.kakao}, maps: ${!!window.kakao?.maps}, LatLng: ${!!window.kakao?.maps?.LatLng}`);
          
          // window.kakao 전체 구조 확인
          if (window.kakao) {
            sendLogToNative(`kakao 객체 keys: ${Object.keys(window.kakao)}`);
            if (window.kakao.maps) {
              sendLogToNative(`maps 객체 keys: ${Object.keys(window.kakao.maps)}`);
            }
          }
          
          // kakao.maps.load() 강제 실행 시도
          if (window.kakao && window.kakao.maps && window.kakao.maps.load) {
            sendLogToNative('kakao.maps.load() 강제 실행 시도...');
            window.kakao.maps.load(() => {
              sendLogToNative('kakao.maps.load 콜백 실행됨');
              if (window.kakao.maps.LatLng) {
                sendLogToNative('load 후 LatLng 확인됨');
                setIsScriptLoaded(true);
              } else {
                sendLogToNative('load 후에도 LatLng 없음');
              }
            });
          }
          
          // 재시도
          setTimeout(() => {
            if (window.kakao && window.kakao.maps && window.kakao.maps.LatLng) {
              sendLogToNative('재시도 성공 - LatLng 확인됨');
              setIsScriptLoaded(true);
            } else {
              sendLogToNative('ERROR: 재시도 후에도 LatLng 없음 - WebView 환경에서 지도 로드 실패');
              setMapLoadError(true);
              setIsScriptLoaded(false);
            }
          }, 2000);
        }
      }, 500);
    };
    
    script.onerror = (error) => {
      sendLogToNative(`ERROR: 스크립트 로드 실패 - ${error}`);
    };
    
    document.head.appendChild(script);
    
    return () => {
      // 컴포넌트 언마운트 시 스크립트 제거하지 않음 (재사용 위해)
    };
  }, []);

  React.useEffect(() => {
    if (isScriptLoaded && mapRef.current && !map) {
      sendLogToNative('지도 초기화 시작...');
      
      const initializeMapDirectly = () => {
        try {
          sendLogToNative('직접 지도 생성 시도...');
          
          if (!window.kakao || !window.kakao.maps) {
            sendLogToNative('ERROR: window.kakao.maps가 없음');
            return;
          }
          
          if (!window.kakao.maps.LatLng) {
            sendLogToNative('ERROR: LatLng가 없음, 지도 생성 불가능');
            return;
          }
          
          const options = {
            center: new window.kakao.maps.LatLng(37.5665, 126.9780), // 서울 시청
            level: 3
          };
          
          const mapInstance = new window.kakao.maps.Map(mapRef.current, options);
          sendLogToNative('지도 인스턴스 생성 성공');
          
          setMap(mapInstance);
          onMapLoad(mapInstance);
          sendLogToNative('지도 로드 완료');

          // 지도 클릭 이벤트 리스너
          window.kakao.maps.event.addListener(mapInstance, 'click', (mouseEvent: any) => {
            const latlng = mouseEvent.latLng;
            const lat = latlng.getLat();
            const lng = latlng.getLng();
            
            sendLogToNative(`지도 클릭: lat=${lat}, lng=${lng}`);
            
            // 좌표로 주소 변환
            const geocoder = new window.kakao.maps.services.Geocoder();
            
            geocoder.coord2Address(lng, lat, (result: any, status: any) => {
              if (status === window.kakao.maps.services.Status.OK) {
                const address = result[0]?.address?.address_name || `위도: ${lat.toFixed(6)}, 경도: ${lng.toFixed(6)}`;
                sendLogToNative(`주소 변환 성공: ${address}`);
                onLocationSelect({
                  latLng: { lat, lng },
                  address: address,
                });
              } else {
                sendLogToNative(`주소 변환 실패, 좌표 정보 사용`);
                // Geocoding 실패 시 좌표 정보 제공
                onLocationSelect({
                  latLng: { lat, lng },
                  address: `위도: ${lat.toFixed(6)}, 경도: ${lng.toFixed(6)}`,
                });
              }
            });
          });
        } catch (error) {
          sendLogToNative(`ERROR: 직접 지도 초기화 실패 - ${error}`);
          setMapLoadError(true);
        }
      };
      
      try {
        // autoload=true이므로 kakao.maps.load 없이 직접 초기화
        sendLogToNative('autoload=true이므로 직접 지도 초기화 시도...');
        initializeMapDirectly();
      } catch (error) {
        sendLogToNative(`ERROR: 지도 초기화 실패 - ${error}`);
        setMapLoadError(true);
      }
    }
  }, [isScriptLoaded, map, onMapLoad, onLocationSelect]);

  // WebView에서 지도 로드 실패 시 대안 UI 제공
  if (mapLoadError || (isWebView && !map && isScriptLoaded)) {
    return (
      <div style={{ 
        height: '200px', 
        width: '100%', 
        borderRadius: '12px', 
        backgroundColor: '#f5f5f5',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        border: '2px dashed #ddd',
        padding: '20px',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '24px', marginBottom: '10px' }}>📍</div>
        <div style={{ fontSize: '14px', color: '#666', marginBottom: '15px' }}>
          {isWebView ? 'WebView 환경에서는 지도를 표시할 수 없습니다' : '지도를 로드할 수 없습니다'}
        </div>
        <TouchableOpacity
          style={{
            backgroundColor: COLORS.primary,
            padding: 10,
            borderRadius: 8,
            minWidth: 120,
            alignItems: 'center'
          }}
          onPress={() => {
            const defaultLocation = {
              latLng: { lat: 37.5665, lng: 126.9780 },
              address: '서울특별시 중구 태평로1가 31 (서울시청 인근)'
            };
            sendLogToNative('기본 위치로 설정');
            onLocationSelect(defaultLocation);
          }}
        >
          <Text style={{ color: 'white', fontSize: 12 }}>서울시청 인근으로 설정</Text>
        </TouchableOpacity>
      </div>
    );
  }

  return <div ref={mapRef} style={{ height: '200px', width: '100%', borderRadius: '12px' }} />;
};

const CreateMeetupWizard: React.FC<CreateMeetupWizardProps> = ({ user }) => {
  const navigation = useRouterNavigation();
  const { showToast } = useToast();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [createdMeetupId, setCreatedMeetupId] = useState<string | null>(null);
  
  // 결제 관련 상태
  const [paymentMethod, setPaymentMethod] = useState<'points' | 'card' | 'kakao'>('points');
  const [userPoints, setUserPoints] = useState<number>(0);
  const [isPaymentLoading, setIsPaymentLoading] = useState<boolean>(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [selectedTime, setSelectedTime] = useState('18:00');
  const [selectedPeriod, setSelectedPeriod] = useState('오후'); // 오전/오후
  const [selectedHour, setSelectedHour] = useState(6); // 1-12
  const [selectedMinute, setSelectedMinute] = useState(0); // 0, 5, 10, ... 55

  // 모달 상태
  const [showDateModal, setShowDateModal] = useState(false);
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [showAlarmModal, setShowAlarmModal] = useState(false);
  
  // 알림 설정
  const [selectedAlarm, setSelectedAlarm] = useState('30분 전');
  
  // 연령 범위 설정
  const [showAgeModal, setShowAgeModal] = useState(false);
  const [minAge, setMinAge] = useState(20);
  const [maxAge, setMaxAge] = useState(30);
  
  // 위치 설정
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  
  // Google Maps 관련 state
  const [mapInstance, setMapInstance] = useState<any>(null);
  const [selectedLatLng, setSelectedLatLng] = useState<{lat: number, lng: number} | null>(null);
  
  // 서울 주요 지역 데이터
  const seoulLocations = [
    { name: '강남역', district: '강남구', fullAddress: '서울특별시 강남구 강남역 일대' },
    { name: '홍대입구역', district: '마포구', fullAddress: '서울특별시 마포구 홍대입구역 일대' },
    { name: '명동역', district: '중구', fullAddress: '서울특별시 중구 명동역 일대' },
    { name: '이태원역', district: '용산구', fullAddress: '서울특별시 용산구 이태원역 일대' },
    { name: '신촌역', district: '서대문구', fullAddress: '서울특별시 서대문구 신촌역 일대' },
    { name: '건대입구역', district: '광진구', fullAddress: '서울특별시 광진구 건대입구역 일대' },
    { name: '잠실역', district: '송파구', fullAddress: '서울특별시 송파구 잠실역 일대' },
    { name: '종로3가역', district: '종로구', fullAddress: '서울특별시 종로구 종로3가역 일대' },
    { name: '신림역', district: '관악구', fullAddress: '서울특별시 관악구 신림역 일대' },
    { name: '노원역', district: '노원구', fullAddress: '서울특별시 노원구 노원역 일대' },
    { name: '수원역', district: '수원시', fullAddress: '경기도 수원시 팔달구 수원역 일대' },
    { name: '인천역', district: '인천시', fullAddress: '인천광역시 중구 인천역 일대' },
  ];
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
    deposit: 0,
    // 식사 성향 초기값
    eatingSpeed: 'normal',
    conversationLevel: 'moderate',
    talkativeness: 'moderate',
    mealPurpose: 'casual',
    specificRestaurant: 'no_preference',
  });

  // meetupData.datetime이 변경될 때 selectedDate와 selectedTime 동기화
  useEffect(() => {
    if (meetupData.datetime) {
      setSelectedDate(meetupData.datetime);
      const hours = meetupData.datetime.getHours();
      const minutes = meetupData.datetime.getMinutes();
      setSelectedTime(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`);
      
      // 날짜와 시간 문자열 업데이트
      const year = meetupData.datetime.getFullYear();
      const month = (meetupData.datetime.getMonth() + 1).toString().padStart(2, '0');
      const day = meetupData.datetime.getDate().toString().padStart(2, '0');
      updateMeetupData('date', `${year}-${month}-${day}`);
      updateMeetupData('time', `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`);
      
      // 오전/오후, 시간, 분 설정
      if (hours >= 12) {
        setSelectedPeriod('오후');
        setSelectedHour(hours === 12 ? 12 : hours - 12);
      } else {
        setSelectedPeriod('오전');
        setSelectedHour(hours === 0 ? 12 : hours);
      }
      setSelectedMinute(Math.floor(minutes / 5) * 5); // 5분 단위로 맞춤
    }
  }, [meetupData.datetime]);


  // 시간 업데이트 효과 (selectedDate 제외하여 무한 루프 방지)
  useEffect(() => {
    if (selectedDate) {
      let hour24 = selectedHour;
      if (selectedPeriod === '오후' && selectedHour !== 12) {
        hour24 = selectedHour + 12;
      } else if (selectedPeriod === '오전' && selectedHour === 12) {
        hour24 = 0;
      }
      
      const newTime = `${hour24.toString().padStart(2, '0')}:${selectedMinute.toString().padStart(2, '0')}`;
      setSelectedTime(newTime);
      
      const newDateTime = new Date(selectedDate);
      newDateTime.setHours(hour24, selectedMinute);
      updateMeetupData('datetime', newDateTime);
      updateMeetupData('time', newTime);
    }
  }, [selectedPeriod, selectedHour, selectedMinute]);

  const updateMeetupData = (field: keyof MeetupData, value: any) => {
    setMeetupData(prev => ({ ...prev, [field]: value }));
  };

  // Kakao 장소 검색 함수
  const performKakaoPlaceSearch = React.useCallback((query: string) => {
    if (!(window as any).kakao || !(window as any).kakao.maps || !(window as any).kakao.maps.services) {
      console.warn('Kakao Maps API not loaded');
      return;
    }

    const places = new (window as any).kakao.maps.services.Places();
    
    places.keywordSearch(query, (data: any, status: any) => {
      if (status === (window as any).kakao.maps.services.Status.OK) {
        const results = data.slice(0, 10).map((place: any) => ({
          name: place.place_name,
          district: place.address_name.split(' ')[1] || '',
          fullAddress: place.address_name,
          roadAddress: place.road_address_name || place.address_name,
          lat: parseFloat(place.y),
          lng: parseFloat(place.x),
          phone: place.phone || '',
          categoryName: place.category_name || '',
        }));
        setSearchResults(results);
      } else {
        setSearchResults([]);
      }
    }, {
      location: new (window as any).kakao.maps.LatLng(37.5665, 126.9780), // 서울 중심
      radius: 20000, // 20km 반경
      sort: (window as any).kakao.maps.services.SortBy.DISTANCE
    });
  }, []);


  const nextStep = () => {
    if (currentStep < 7) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1: return meetupData.category !== '';
      case 2: return meetupData.datetime !== null;
      case 3: return meetupData.maxParticipants > 0;
      case 4: return true; // 성별/연령은 기본값 있음
      case 5: return meetupData.location !== '';
      case 6: return meetupData.title.trim() !== '';
      case 7: return meetupData.deposit > 0; // 약속금 입력 필수
      case 8: return paymentMethod === 'card' || (paymentMethod === 'points' && userPoints >= meetupData.deposit); // 결제 방법 선택 및 포인트 충분한지 확인
      default: return false;
    }
  };

  const handleSubmit = async () => {
    if (!canProceed()) {
      showToast('모든 필수 정보를 입력해주세요.', 'error');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        showToast('로그인이 필요합니다.', 'error');
        return;
      }

      // 카테고리 매핑 (UI 카테고리 -> DB enum 값)
      const categoryMap: { [key: string]: string } = {
        '한식': '한식',
        '중식': '중식', 
        '일식': '일식',
        '양식': '양식',
        '카페/디저트': '카페',
        '고기/구이': '기타',
        '술집': '술집',
        '기타': '기타'
      };

      // FormData 생성
      const formData = new FormData();
      formData.append('title', meetupData.title);
      formData.append('description', meetupData.description);
      formData.append('category', categoryMap[meetupData.category] || '기타');
      formData.append('location', meetupData.location);
      formData.append('address', meetupData.address);
      formData.append('latitude', meetupData.latitude.toString());
      formData.append('longitude', meetupData.longitude.toString());
      formData.append('date', meetupData.date);
      formData.append('time', meetupData.time);
      formData.append('maxParticipants', meetupData.maxParticipants.toString());
      formData.append('priceRange', meetupData.priceRange);
      formData.append('deposit', meetupData.deposit.toString());
      formData.append('genderPreference', meetupData.genderPreference);
      formData.append('ageRange', meetupData.ageRange);
      formData.append('detailAddress', meetupData.detailAddress);
      
      // 필터 정보 추가 (서버에서 필수로 요구함)
      const genderFilter = meetupData.genderPreference === '남성만' ? 'male' : 
                          meetupData.genderPreference === '여성만' ? 'female' : 'all';
      const ageFilterMin = meetupData.ageRange === '20-30대' ? '20' : '20';
      const ageFilterMax = meetupData.ageRange === '20-30대' ? '39' : '59';

      formData.append('genderFilter', genderFilter);
      formData.append('ageFilterMin', ageFilterMin);
      formData.append('ageFilterMax', ageFilterMax);
      formData.append('eatingSpeed', meetupData.eatingSpeed);
      formData.append('conversationDuringMeal', meetupData.conversationLevel);
      formData.append('talkativeness', meetupData.talkativeness);
      formData.append('mealPurpose', meetupData.mealPurpose);
      formData.append('specificRestaurant', meetupData.specificRestaurant);
      formData.append('interests', '[]');
      formData.append('isRequired', 'false');
      
      // 이미지가 있으면 추가
      if (meetupData.image) {
        formData.append('image', meetupData.image);
      }

      console.log('📤 모임 생성 요청:', {
        title: meetupData.title,
        description: meetupData.description,
        category: meetupData.category,
        location: meetupData.location,
        date: meetupData.date,
        time: meetupData.time
      });

      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/meetups`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const meetupId = data.meetup.id;
        
        // 필터 설정 API는 현재 미구현으로 스킵
        console.log('📝 모임 생성 완료 - 필터 설정은 향후 구현 예정');

        // 약속금이 있는 경우 결제 단계로 이동
        if (meetupData.deposit > 0) {
          setCreatedMeetupId(meetupId);
          setCurrentStep(8); // 새로운 결제 단계
          showToast('모임이 생성되었습니다. 약속금을 결제해 주세요.', 'success');
        } else {
          showToast('모임이 성공적으로 생성되었습니다!', 'success');
          navigation.navigate('/home');
        }
      } else {
        showToast(data.message || '모임 생성에 실패했습니다.', 'error');
      }
    } catch (error) {
      console.error('모임 생성 오류:', error);
      showToast('서버 오류가 발생했습니다.', 'error');
    }
  };

  // 사용자 포인트 조회
  const fetchUserPoints = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {return;}

      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/user/points`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUserPoints(data.data?.availablePoints || 0);
      }
    } catch (error) {
      console.error('포인트 조회 오류:', error);
    }
  };

  // 결제 처리
  const handlePayment = async () => {
    if (!createdMeetupId) {
      showToast('모임 정보를 찾을 수 없습니다.', 'error');
      return;
    }

    if (isPaymentLoading) {
      return; // 이미 결제 중이면 무시
    }

    setIsPaymentLoading(true);
    
    // 최소 1초는 로딩 상태를 보여주기 위한 타이머
    const startTime = Date.now();
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        showToast('로그인이 필요합니다.', 'error');
        setIsPaymentLoading(false);
        return;
      }

      const paymentData = {
        meetupId: createdMeetupId,
        amount: meetupData.deposit,
        paymentMethod: paymentMethod,
      };

      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/deposits/payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(paymentData),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        showToast('약속금 결제가 완료되었습니다!', 'success');
        
        // 최소 1초는 로딩 상태를 보여준 후 페이지 이동
        const elapsedTime = Date.now() - startTime;
        const remainingTime = Math.max(1000 - elapsedTime, 0);
        
        setTimeout(() => {
          // 결제 완료 후 모임 디테일 페이지로 이동
          (window as any).location.href = `/meetup/${createdMeetupId}`;
        }, remainingTime);
      } else {
        showToast(data.message || '결제에 실패했습니다.', 'error');
        // 실패한 경우 즉시 로딩 해제
        const elapsedTime = Date.now() - startTime;
        const remainingTime = Math.max(1000 - elapsedTime, 0);
        
        setTimeout(() => {
          setIsPaymentLoading(false);
        }, remainingTime);
      }
    } catch (error) {
      console.error('결제 오류:', error);
      showToast('결제 처리 중 오류가 발생했습니다.', 'error');
      // 에러한 경우 즉시 로딩 해제
      const elapsedTime = Date.now() - startTime;
      const remainingTime = Math.max(1000 - elapsedTime, 0);
      
      setTimeout(() => {
        setIsPaymentLoading(false);
      }, remainingTime);
    }
  };

  // Step 7, 8에 진입할 때 포인트 조회
  React.useEffect(() => {
    if (currentStep === 7 || currentStep === 8) {
      fetchUserPoints();
    }
  }, [currentStep]);

  const renderStepIndicator = () => {
    return (
      <View style={styles.stepIndicator}>
        {[1, 2, 3, 4, 5, 6].map((step) => (
          <View
            key={step}
            style={[
              styles.stepDot,
              step <= currentStep ? styles.stepDotActive : null,
              step === currentStep ? styles.stepDotCurrent : null
            ]}
          />
        ))}
      </View>
    );
  };

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>어떤 메뉴를 드시고 싶으세요?</Text>
      <View style={styles.homeCategorySection}>
        <View style={styles.homeCategoryGrid}>
          {FOOD_CATEGORIES.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={styles.homeCategoryItem}
              onPress={() => updateMeetupData('category', category.name)}
            >
              <View style={[
                styles.homeCategoryBox,
                { backgroundColor: meetupData.category === category.name ? COLORS.neutral.grey700 : category.bgColor }
              ]}>
                <Icon 
                  name={category.icon as any} 
                  size={40} 
                  color={meetupData.category === category.name ? COLORS.neutral.white : category.color} 
                />
              </View>
              <Text style={[
                styles.homeCategoryName,
                meetupData.category === category.name ? styles.homeCategoryNameSelected : null
              ]}>
                {category.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );

  const renderStep2 = () => {
    return (
      <View style={styles.stepContainer}>
        <Text style={styles.stepTitle}>언제 만날까요?</Text>
        <View style={styles.dateTimeContainer}>
          <View style={styles.dateTimeRow}>
            <Text style={styles.dateTimeRowLabel}>날짜</Text>
            <TouchableOpacity style={styles.dropdownButton} onPress={() => setShowDateModal(true)}>
              <Text style={styles.dropdownButtonText}>
                {selectedDate ? 
                  selectedDate.getMonth() + 1 + '월 ' + selectedDate.getDate() + '일 ' + ['일', '월', '화', '수', '목', '금', '토'][selectedDate.getDay()] + '요일'
                  : '12월 12일 금요일'}
              </Text>
              <Text style={styles.dropdownArrow}>▼</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.dateTimeRow}>
            <Text style={styles.dateTimeRowLabel}>시간</Text>
            <TouchableOpacity style={styles.dropdownButton} onPress={() => setShowTimeModal(true)}>
              <Text style={styles.dropdownButtonText}>
                {selectedPeriod + ' ' + selectedHour + ':' + selectedMinute.toString().padStart(2, '0')}
              </Text>
              <Text style={styles.dropdownArrow}>▼</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.dateTimeRow}>
            <Text style={styles.dateTimeRowLabel}>약속 전 나에게 알림</Text>
            <TouchableOpacity style={styles.dropdownButton} onPress={() => setShowAlarmModal(true)}>
              <Text style={styles.dropdownButtonText}>{selectedAlarm}</Text>
              <Text style={styles.dropdownArrow}>▼</Text>
            </TouchableOpacity>
          </View>

          {meetupData.datetime ? (
            <View style={styles.selectedDateTimeDisplay}>
              <Text style={styles.selectedDateTimeText}>
                ✨ 선택된 일정: {meetupData.datetime.toLocaleDateString('ko-KR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  weekday: 'long'
                })} {meetupData.datetime.toLocaleTimeString('ko-KR', {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true
                })}
              </Text>
            </View>
          ) : null}

          {showDateModal ? (
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
                      // 현재 선택된 시간 적용
                      let hour24 = selectedHour;
                      if (selectedPeriod === '오후' && selectedHour !== 12) {
                        hour24 = selectedHour + 12;
                      } else if (selectedPeriod === '오전' && selectedHour === 12) {
                        hour24 = 0;
                      }
                      newDate.setHours(hour24, selectedMinute);
                      
                      updateMeetupData('datetime', newDate);
                      
                      const year = newDate.getFullYear();
                      const month = (newDate.getMonth() + 1).toString().padStart(2, '0');
                      const day = newDate.getDate().toString().padStart(2, '0');
                      updateMeetupData('date', `${year}-${month}-${day}`);
                      updateMeetupData('time', `${hour24.toString().padStart(2, '0')}:${selectedMinute.toString().padStart(2, '0')}`);
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
                        // const lastDay = new Date(year, month + 1, 0);
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
                                console.log('날짜 클릭:', date);
                                const newDate = new Date(date);
                                
                                // 현재 선택된 시간 적용
                                let hour24 = selectedHour;
                                if (selectedPeriod === '오후' && selectedHour !== 12) {
                                  hour24 = selectedHour + 12;
                                } else if (selectedPeriod === '오전' && selectedHour === 12) {
                                  hour24 = 0;
                                }
                                newDate.setHours(hour24, selectedMinute);
                                
                                setSelectedDate(newDate);
                                updateMeetupData('datetime', newDate);
                                
                                const year = newDate.getFullYear();
                                const month = (newDate.getMonth() + 1).toString().padStart(2, '0');
                                const day = newDate.getDate().toString().padStart(2, '0');
                                updateMeetupData('date', `${year}-${month}-${day}`);
                                
                                console.log('날짜 업데이트 완료:', newDate.toLocaleDateString('ko-KR'));
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
          ) : null}

          {showTimeModal ? (
            <View style={styles.modalOverlay}>
              <View style={styles.modalContainer}>
                <View style={styles.modalHeader}>
                  <TouchableOpacity onPress={() => setShowTimeModal(false)}>
                    <Text style={styles.modalCloseButton}>✕</Text>
                  </TouchableOpacity>
                  <Text style={styles.modalTitle}>시간 선택</Text>
                  <TouchableOpacity onPress={() => {
                    // 현재 선택된 날짜나 기본 날짜 사용
                    const currentDate = selectedDate || new Date();
                    let hour24 = selectedHour;
                    if (selectedPeriod === '오후' && selectedHour !== 12) {
                      hour24 = selectedHour + 12;
                    } else if (selectedPeriod === '오전' && selectedHour === 12) {
                      hour24 = 0;
                    }
                    
                    currentDate.setHours(hour24, selectedMinute);
                    setSelectedDate(currentDate);
                    
                    updateMeetupData('datetime', currentDate);
                    updateMeetupData('time', `${hour24.toString().padStart(2, '0')}:${selectedMinute.toString().padStart(2, '0')}`);
                    
                    setShowTimeModal(false);
                  }}>
                    <Text style={styles.modalConfirmButton}>확인</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.timeWheelContainer}>
                  <View style={styles.timeWheelSection}>
                    <Text style={styles.wheelLabel}>오전/오후</Text>
                    <ScrollView style={styles.timeScrollView} showsVerticalScrollIndicator={false}>
                      {['오전', '오후'].map((period) => (
                        <TouchableOpacity
                          key={period}
                          style={[styles.timeScrollItem, selectedPeriod === period ? styles.timeScrollItemSelected : null]}
                          onPress={() => setSelectedPeriod(period)}
                        >
                          <Text style={[styles.timeScrollText, selectedPeriod === period ? styles.timeScrollTextSelected : null]}>
                            {period}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                  
                  <View style={styles.timeWheelSection}>
                    <Text style={styles.wheelLabel}>시</Text>
                    <ScrollView style={styles.timeScrollView} showsVerticalScrollIndicator={false}>
                      {Array.from({length: 12}, (_, i) => i + 1).map((hour) => (
                        <TouchableOpacity
                          key={hour}
                          style={[styles.timeScrollItem, selectedHour === hour ? styles.timeScrollItemSelected : null]}
                          onPress={() => setSelectedHour(hour)}
                        >
                          <Text style={[styles.timeScrollText, selectedHour === hour ? styles.timeScrollTextSelected : null]}>
                            {hour}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                  
                  <View style={styles.timeWheelSection}>
                    <Text style={styles.wheelLabel}>분</Text>
                    <ScrollView style={styles.timeScrollView} showsVerticalScrollIndicator={false}>
                      {Array.from({length: 12}, (_, i) => i * 5).map((minute) => (
                        <TouchableOpacity
                          key={minute}
                          style={[styles.timeScrollItem, selectedMinute === minute ? styles.timeScrollItemSelected : null]}
                          onPress={() => setSelectedMinute(minute)}
                        >
                          <Text style={[styles.timeScrollText, selectedMinute === minute ? styles.timeScrollTextSelected : null]}>
                            {minute.toString().padStart(2, '0')}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                </View>
              </View>
            </View>
          ) : null}

          {showAlarmModal ? (
            <View style={styles.modalOverlay}>
              <View style={styles.modalContainer}>
                <View style={styles.modalHeader}>
                  <TouchableOpacity onPress={() => setShowAlarmModal(false)}>
                    <Text style={styles.modalCloseButton}>✕</Text>
                  </TouchableOpacity>
                  <Text style={styles.modalTitle}>알림 설정</Text>
                  <TouchableOpacity onPress={() => setShowAlarmModal(false)}>
                    <Text style={styles.modalConfirmButton}>확인</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.alarmOptionsContainer}>
                  {['알림 없음', '정시', '10분 전', '30분 전', '1시간 전', '3시간 전', '1일 전'].map((option) => (
                    <TouchableOpacity
                      key={option}
                      style={[
                        styles.alarmOption,
                        selectedAlarm === option ? styles.alarmOptionSelected : null
                      ]}
                      onPress={() => setSelectedAlarm(option)}
                    >
                      <Text style={[
                        styles.alarmOptionText,
                        selectedAlarm === option ? styles.alarmOptionTextSelected : null
                      ]}>
                        {option}
                      </Text>
                      {selectedAlarm === option ? (
                        <Text style={styles.checkMark}>✓</Text>
                      ) : null}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          ) : null}
        </View>
      </View>
    );
  };

  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>몇명의 모임으로 할까요?</Text>
      <View style={styles.participantSelector}>
        {[
          { value: 1, label: '1명' },
          { value: 2, label: '2명' }, 
          { value: 3, label: '3명' },
          { value: 4, label: '4명' },
          { value: 5, label: '5명+' }
        ].map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.participantCard,
              (meetupData.maxParticipants === option.value || 
               (option.value === 5 && meetupData.maxParticipants >= 5)) ? styles.participantCardSelected : null
            ]}
            onPress={() => updateMeetupData('maxParticipants', option.value)}
          >
            <Text style={[
              styles.participantCardText,
              (meetupData.maxParticipants === option.value || 
               (option.value === 5 && meetupData.maxParticipants >= 5)) ? styles.participantCardTextSelected : null
            ]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderStep4 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>선호하는 유형을 설정해주세요</Text>
      <View style={styles.preferenceSection}>
        <Text style={styles.preferenceLabel}>성별</Text>
        <View style={styles.preferenceOptions}>
          {['남성만', '여성만', '상관없음'].map((gender) => (
            <TouchableOpacity
              key={gender}
              style={[
                styles.preferenceOption,
                meetupData.genderPreference === gender ? styles.preferenceSelected : null
              ]}
              onPress={() => updateMeetupData('genderPreference', gender)}
            >
              <Text style={[
                styles.preferenceText,
                meetupData.genderPreference === gender ? styles.preferenceTextSelected : null
              ]}>
                {gender}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      
      <View style={styles.preferenceSection}>
        <Text style={styles.preferenceLabel}>연령</Text>
        <TouchableOpacity style={styles.dropdownButton} onPress={() => setShowAgeModal(true)}>
          <Text style={styles.dropdownButtonText}>
            {meetupData.ageRange === '전체' ? '전체 연령' : 
             minAge === maxAge ? `${minAge}세` :
             `${minAge}세 - ${maxAge}세`}
          </Text>
          <Text style={styles.dropdownArrow}>▼</Text>
        </TouchableOpacity>
      </View>
      
      {showAgeModal ? (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowAgeModal(false)}>
                <Text style={styles.modalCloseButton}>✕</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>연령 설정</Text>
              <TouchableOpacity onPress={() => {
                if (minAge === maxAge) {
                  updateMeetupData('ageRange', `${minAge}세`);
                } else {
                  updateMeetupData('ageRange', `${minAge}-${maxAge}`);
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
                  updateMeetupData('ageRange', '전체');
                  setShowAgeModal(false);
                }}
              >
                <Text style={[
                  styles.ageRangeText,
                  meetupData.ageRange === '전체' ? styles.ageRangeTextSelected : null
                ]}>전체 연령</Text>
              </TouchableOpacity>
              
              <View style={styles.compactAgeContainer}>
                <View style={styles.ageRow}>
                  <Text style={styles.compactAgeLabel}>최소 {minAge}세</Text>
                  <input
                    type="range"
                    min="18"
                    max="100"
                    value={minAge}
                    onChange={(e) => {
                      const age = parseInt(e.target.value);
                      setMinAge(age);
                      if (age > maxAge) {
                        setMaxAge(age);
                        updateMeetupData('ageRange', `${age}-${age}`);
                      } else {
                        updateMeetupData('ageRange', `${age}-${maxAge}`);
                      }
                    }}
                    style={styles.compactSlider}
                  />
                </View>
                
                <View style={styles.ageRow}>
                  <Text style={styles.compactAgeLabel}>최대 {maxAge}세</Text>
                  <input
                    type="range"
                    min="18"
                    max="100"
                    value={maxAge}
                    onChange={(e) => {
                      const age = parseInt(e.target.value);
                      if (age >= minAge) {
                        setMaxAge(age);
                        updateMeetupData('ageRange', `${minAge}-${age}`);
                      }
                    }}
                    style={styles.compactSlider}
                  />
                </View>
                
                <View style={styles.compactLabels}>
                  <Text style={styles.compactLabel}>18세</Text>
                  <Text style={styles.compactLabel}>100세</Text>
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
                          updateMeetupData('ageRange', '전체');
                        } else {
                          updateMeetupData('ageRange', `${option.min}-${option.max}`);
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
      ) : null}
    </View>
  );

  const renderStep5 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>어디서 만날까요?</Text>
      <View style={styles.locationContainer}>
        <TouchableOpacity style={styles.dropdownButton} onPress={() => setShowLocationModal(true)}>
          <Text style={styles.dropdownButtonText}>
            {meetupData.location || '위치를 선택해주세요'}
          </Text>
          <Text style={styles.dropdownArrow}>▼</Text>
        </TouchableOpacity>
        
        {meetupData.address ? (
          <View style={styles.addressContainer}>
            <View style={styles.baseAddressContainer}>
              <Text style={styles.addressLabel}>도로명 주소</Text>
              <Text style={styles.addressText}>{meetupData.address}</Text>
            </View>
            <View style={styles.detailAddressContainer}>
              <Text style={styles.addressLabel}>상세 주소</Text>
              <TextInput
                style={styles.detailAddressInput}
                placeholder="건물명, 층수, 호수 등을 입력하세요"
                value={meetupData.detailAddress}
                onChangeText={(text) => updateMeetupData('detailAddress', text)}
                placeholderTextColor={COLORS.text.tertiary}
              />
            </View>
          </View>
        ) : null}
      </View>
      
      {showLocationModal ? (
        <View style={styles.modalOverlay}>
          <View style={styles.locationModalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowLocationModal(false)}>
                <Text style={styles.modalCloseButton}>✕</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>위치 검색</Text>
              <TouchableOpacity onPress={() => setShowLocationModal(false)}>
                <Text style={styles.modalConfirmButton}>완료</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.locationSearchContainer}>
              <TextInput
                style={styles.locationSearchInput}
                placeholder="주소나 장소명을 검색하세요"
                value={searchQuery}
                onChangeText={(text) => {
                  setSearchQuery(text);
                  // 카카오 장소 검색 API 사용
                  if (text.length > 1) {
                    performKakaoPlaceSearch(text);
                  } else {
                    setSearchResults([]);
                  }
                }}
                autoFocus
              />
              <TouchableOpacity 
                style={styles.searchButton}
                onPress={() => {
                  if (searchQuery.length > 1) {
                    performKakaoPlaceSearch(searchQuery);
                  }
                }}
              >
                <Icon name="search" size={20} color={COLORS.text.white} />
              </TouchableOpacity>
            </View>
            
            {searchResults.length > 0 ? (
              <View style={styles.searchResultsContainer}>
                <Text style={styles.searchResultsTitle}>검색 결과</Text>
                <ScrollView 
                  style={styles.searchResultsList}
                  showsVerticalScrollIndicator={true}
                  nestedScrollEnabled={true}
                >
                  {searchResults.map((location, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.searchResultItem}
                      onPress={() => {
                        updateMeetupData('location', location.name);
                        updateMeetupData('address', location.fullAddress);
                        if (location.lat && location.lng) {
                          updateMeetupData('latitude', location.lat);
                          updateMeetupData('longitude', location.lng);
                          setSelectedLatLng({ lat: location.lat, lng: location.lng });
                        }
                        setSearchQuery('');
                        setSearchResults([]);
                        setShowLocationModal(false);
                      }}
                    >
                      <Text style={styles.searchResultName}>{location.name}</Text>
                      <Text style={styles.searchResultAddress}>{location.fullAddress}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            ) : null}
            
            {searchResults.length === 0 ? (
              <View style={styles.mapContainer}>
                <KakaoMapComponent
                  onMapLoad={setMapInstance}
                  onLocationSelect={(location) => {
                    setSelectedLatLng(location.latLng);
                    updateMeetupData('location', location.address);
                    updateMeetupData('address', location.address);
                    updateMeetupData('latitude', location.latLng.lat);
                    updateMeetupData('longitude', location.latLng.lng);
                  }}
                />
                <Text style={styles.mapHelpText}>지도를 클릭해서 위치를 선택하거나 위에서 검색하세요</Text>
              </View>
            ) : null}
            
            {searchResults.length === 0 ? (
              <View style={styles.popularLocations}>
                <Text style={styles.popularLocationsTitle}>인기 지역</Text>
                <View style={styles.popularLocationsList}>
                  {seoulLocations.slice(0, 8).map((location) => (
                    <TouchableOpacity
                      key={location.name}
                      style={styles.popularLocationItem}
                      onPress={() => {
                        updateMeetupData('location', location.name);
                        updateMeetupData('address', location.fullAddress);
                        setShowLocationModal(false);
                      }}
                    >
                      <Text style={styles.popularLocationText}>{location.name}</Text>
                      <Text style={styles.popularLocationDistrict}>{location.district}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ) : null}
          </View>
        </View>
      ) : null}
    </View>
  );

  const renderStep6 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>모임에 대해 설명해주세요</Text>
      <View style={styles.titleSection}>
        <Text style={styles.inputLabel}>모임 제목</Text>
        <TextInput
          style={styles.titleInput}
          placeholder="모임 제목을 입력하세요"
          value={meetupData.title}
          onChangeText={(text) => updateMeetupData('title', text)}
        />
      </View>
      
      <View style={styles.descriptionSection}>
        <Text style={styles.inputLabel}>모임 소개</Text>
        <TextInput
          style={styles.descriptionInput}
          placeholder="모임에 대해 자유롭게 소개해주세요"
          value={meetupData.description}
          onChangeText={(text) => updateMeetupData('description', text)}
          multiline
          numberOfLines={4}
        />
      </View>
      
      <View style={styles.imageSection}>
        <Text style={styles.inputLabel}>모임 사진 (선택사항)</Text>
        <TouchableOpacity 
          style={styles.imageUploadButton}
          onPress={() => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.onchange = (e: any) => {
              const file = e.target.files[0];
              if (file) {
                updateMeetupData('image', file);
              }
            };
            input.click();
          }}
        >
          {meetupData.image ? (
            <View style={styles.imagePreviewContainer}>
              <Text style={styles.imageUploadText}>📸 {meetupData.image.name}</Text>
              <TouchableOpacity 
                style={styles.removeImageButton}
                onPress={() => updateMeetupData('image', null)}
              >
                <Text style={styles.removeImageText}>✕</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.imageUploadContainer}>
              <Text style={styles.imageUploadIcon}>📷</Text>
              <Text style={styles.imageUploadText}>사진 추가하기</Text>
              <Text style={styles.imageUploadSubText}>모임을 더 잘 표현할 수 있는 사진을 업로드하세요</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
      
      <View style={styles.priceSection}>
        <Text style={styles.inputLabel}>예상 가격대</Text>
        <View style={styles.priceOptions}>
          {PRICE_RANGES.map((range) => (
            <TouchableOpacity
              key={range}
              style={[
                styles.priceOption,
                meetupData.priceRange === range ? styles.priceSelected : null
              ]}
              onPress={() => updateMeetupData('priceRange', range)}
            >
              <Text style={[
                styles.priceText,
                meetupData.priceRange === range ? styles.priceTextSelected : null
              ]}>
                {range}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );

  const renderStep7 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>약속금을 설정해주세요</Text>
      <Text style={styles.stepSubtitle}>약속금은 모임 참여의 신뢰성을 높여줍니다</Text>
      <View style={styles.depositSection}>
        <Text style={styles.inputLabel}>약속금 금액</Text>
        <View style={styles.depositAmountContainer}>
          <TextInput
            style={styles.depositInput}
            placeholder="10,000"
            value={meetupData.deposit.toString()}
            onChangeText={(text) => {
              const amount = parseInt(text.replace(/[^0-9]/g, '')) || 0;
              updateMeetupData('deposit', amount);
            }}
            keyboardType="numeric"
          />
          <Text style={styles.currencyText}>원</Text>
        </View>
        
        <View style={styles.quickAmountButtons}>
          {[5000, 10000, 15000, 20000].map((amount) => (
            <TouchableOpacity
              key={amount}
              style={[
                styles.quickAmountButton,
                meetupData.deposit === amount ? styles.quickAmountButtonSelected : null
              ]}
              onPress={() => updateMeetupData('deposit', amount)}
            >
              <Text style={[
                styles.quickAmountText,
                meetupData.deposit === amount ? styles.quickAmountTextSelected : null
              ]}>
                {amount.toLocaleString()}원
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        
        <View style={styles.depositInfo}>
          <Text style={styles.depositInfoText}>
            💡 약속금은 모임 참여 후 자동으로 환불됩니다
          </Text>
        </View>
      </View>
      
      <View style={styles.paymentMethodSection}>
        <Text style={styles.inputLabel}>결제 방법</Text>
        <View style={styles.paymentMethods}>
          <TouchableOpacity 
            style={[
              styles.paymentMethod,
              paymentMethod === 'points' ? styles.paymentMethodStep7Selected : null
            ]}
            onPress={() => setPaymentMethod('points')}
          >
            <Text style={[
              styles.paymentMethodText,
              paymentMethod === 'points' ? styles.paymentMethodTextSelected : null
            ]}>
              포인트 결제
            </Text>
            {userPoints > 0 && (
              <Text style={styles.paymentMethodSubText}>
                보유: {userPoints.toLocaleString()}P
              </Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity 
            style={[
              styles.paymentMethod,
              paymentMethod === 'card' ? styles.paymentMethodStep7Selected : null
            ]}
            onPress={() => setPaymentMethod('card')}
          >
            <Text style={[
              styles.paymentMethodText,
              paymentMethod === 'card' ? styles.paymentMethodTextSelected : null
            ]}>토스페이</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[
              styles.paymentMethod,
              paymentMethod === 'kakao' ? styles.paymentMethodStep7Selected : null
            ]}
            onPress={() => setPaymentMethod('kakao')}
          >
            <Text style={[
              styles.paymentMethodText,
              paymentMethod === 'kakao' ? styles.paymentMethodTextSelected : null
            ]}>카카오페이</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  // Step 8: 약속금 결제
  const renderStep8 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>약속금 결제</Text>
      <Text style={styles.stepSubtitle}>
        모임 참여를 위한 약속금을 결제해 주세요
      </Text>

      {/* 결제 정보 */}
      <View style={styles.paymentInfoContainer}>
        <View style={styles.paymentRow}>
          <Text style={styles.paymentLabel}>결제 금액</Text>
          <Text style={styles.paymentAmount}>{meetupData.deposit?.toLocaleString() || 0}원</Text>
        </View>
        <View style={styles.paymentRow}>
          <Text style={styles.paymentLabel}>보유 포인트</Text>
          <Text style={styles.pointAmount}>{userPoints.toLocaleString()}P</Text>
        </View>
      </View>

      {/* 결제 방법 선택 */}
      <View style={styles.paymentMethodContainer}>
        <Text style={styles.sectionLabel}>결제 방법</Text>
        
        <TouchableOpacity
          style={[
            styles.paymentMethodOption,
            paymentMethod === 'points' ? styles.paymentMethodSelected : null
          ]}
          onPress={() => setPaymentMethod('points')}
          disabled={userPoints < meetupData.deposit}
        >
          <View style={styles.paymentMethodInfo}>
            <Text style={[
              styles.paymentMethodTitle,
              userPoints < meetupData.deposit ? styles.paymentMethodDisabled : null
            ]}>
              포인트 결제
            </Text>
            <Text style={[
              styles.paymentMethodSubtitle,
              userPoints < meetupData.deposit ? styles.paymentMethodDisabled : null
            ]}>
              보유 포인트: {userPoints.toLocaleString()}P
            </Text>
          </View>
          {userPoints < meetupData.deposit && (
            <Text style={styles.paymentMethodError}>포인트 부족</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.paymentMethodOption,
            paymentMethod === 'card' ? styles.paymentMethodSelected : null
          ]}
          onPress={() => setPaymentMethod('card')}
        >
          <View style={styles.paymentMethodInfo}>
            <Text style={styles.paymentMethodTitle}>카드 결제</Text>
            <Text style={styles.paymentMethodSubtitle}>
              신용카드 / 체크카드
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* 결제 안내 */}
      <View style={styles.paymentNoticeContainer}>
        <Text style={styles.paymentNoticeTitle}>💡 약속금 안내</Text>
        <Text style={styles.paymentNoticeText}>
          • 약속금은 모임 참석 시 100% 환불됩니다{'\n'}
          • 무단 불참 시 약속금은 차감됩니다{'\n'}
          • 모임 취소 시 즉시 환불 처리됩니다
        </Text>
      </View>
    </View>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep3();
      case 4: return renderStep4();
      case 5: return renderStep5();
      case 6: return renderStep6();
      case 7: return renderStep7();
      case 8: return renderStep8();
      default: return null;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => currentStep === 1 ? navigation.goBack() : prevStep()}
        >
          <Icon name="arrow-left" size={24} color={COLORS.text.primary} />
        </TouchableOpacity>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {renderCurrentStep()}
      </ScrollView>

      <View style={styles.bottomContainer}>
        {renderStepIndicator()}
        <TouchableOpacity
          style={[
            styles.nextButton,
            !canProceed() ? styles.nextButtonDisabled : null
          ]}
          onPress={currentStep === 7 ? handleSubmit : currentStep === 8 ? handlePayment : nextStep}
          disabled={!canProceed() || (currentStep === 8 && isPaymentLoading)}
        >
          <Text style={[
            styles.nextButtonText,
            !canProceed() ? styles.nextButtonTextDisabled : null
          ]}>
            {currentStep === 8 && isPaymentLoading ? '결제 중...' : currentStep === 7 ? '모임 생성하기' : currentStep === 8 ? '결제하기' : '다음'}
          </Text>
        </TouchableOpacity>
      </View>

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.neutral.white,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLORS.neutral.white,
    ...SHADOWS.small,
  },
  backButton: {
    padding: 4,
  },
  placeholder: {
    width: 32,
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 20,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.neutral.grey300,
  },
  stepDotActive: {
    backgroundColor: COLORS.neutral.grey500,
  },
  stepDotCurrent: {
    backgroundColor: COLORS.primary.main,
    width: 24,
    borderRadius: 12,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  stepContainer: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: 32,
    textAlign: 'center',
  },
  
  // Step 1 - 홈과 동일한 카테고리 디자인
  homeCategorySection: {
    backgroundColor: COLORS.neutral.white,
    paddingVertical: 24,
    paddingHorizontal: 20,
    marginBottom: 12,
    ...SHADOWS.small,
    borderRadius: 16,
    marginHorizontal: 16,
  },
  homeCategoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    paddingHorizontal: 4,
    gap: 8,
  },
  homeCategoryItem: {
    width: '22.5%',
    alignItems: 'center',
    marginBottom: 20,
  },
  homeCategoryBox: {
    width: 70,
    height: 70,
    borderRadius: 16,
    backgroundColor: COLORS.neutral.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.neutral.grey200,
  },
  homeCategoryName: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text.primary,
    textAlign: 'center',
  },
  homeCategoryNameSelected: {
    fontWeight: '700',
    color: COLORS.neutral.grey700,
  },
  
  // Step 2 - 날짜/시간
  dateTimeContainer: {
    paddingHorizontal: 8,
    flex: 1,
  },
  dateTimeContent: {
    alignItems: 'center',
  },
  dateTimeLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.text.secondary,
    marginBottom: 8,
    textAlign: 'center',
  },
  calendarContainer: {
    width: '100%',
    backgroundColor: COLORS.neutral.white,
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    ...SHADOWS.medium,
  },
  timePickerContainer: {
    marginTop: 8,
    padding: 12,
    backgroundColor: '#F5F3F0',
    borderRadius: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5DDD5',
  },
  timePickerLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4C422C',
    marginBottom: 8,
    textAlign: 'center',
  },
  compactTimePickerWrapper: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
  },
  compactTimeSection: {
    flex: 1,
    alignItems: 'center',
  },
  timeToggleContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.neutral.grey100,
    borderRadius: 12,
    padding: 2,
  },
  timeToggleButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: 'transparent',
  },
  selectedTimeToggleButton: {
    backgroundColor: COLORS.primary.main,
    ...SHADOWS.small,
  },
  timeToggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text.secondary,
  },
  selectedTimeToggleText: {
    color: COLORS.text.white,
    fontWeight: '700',
  },
  timeDisplayContainer: {
    alignItems: 'center',
    backgroundColor: COLORS.neutral.white,
    borderRadius: 12,
    padding: 8,
    borderWidth: 2,
    borderColor: COLORS.primary.accent,
    minWidth: 60,
  },
  timeSelector: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  timeArrow: {
    fontSize: 12,
    color: COLORS.primary.main,
    fontWeight: '700',
  },
  timeValueContainer: {
    paddingVertical: 4,
    alignItems: 'center',
  },
  timeValue: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text.primary,
    textAlign: 'center',
  },
  timeSeparator: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginHorizontal: 8,
  },
  datePickerWrapper: {
    width: '100%',
    backgroundColor: COLORS.neutral.white,
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    ...SHADOWS.small,
    alignItems: 'center',
  },
  selectedDateTimeDisplay: {
    backgroundColor: COLORS.primary.light,
    borderRadius: 16,
    padding: 20,
    width: '100%',
    alignItems: 'center',
  },
  selectedDateTimeText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary.main,
    textAlign: 'center',
    lineHeight: 24,
  },
  
  // Step 3 - 인원
  participantSelector: {
    gap: 20,
    paddingHorizontal: 20,
  },
  participantCard: {
    backgroundColor: COLORS.neutral.grey100,
    borderRadius: 16,
    paddingVertical: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.neutral.grey200,
  },
  participantCardSelected: {
    backgroundColor: COLORS.primary.main,
    borderColor: COLORS.primary.main,
  },
  participantCardText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  participantCardTextSelected: {
    color: COLORS.text.white,
  },
  
  // Step 4 - 성별/연령
  preferenceSection: {
    marginBottom: 32,
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
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.neutral.grey200,
    backgroundColor: COLORS.neutral.white,
  },
  preferenceSelected: {
    backgroundColor: COLORS.primary.main,
    borderColor: COLORS.primary.main,
  },
  preferenceText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text.primary,
    textAlign: 'center',
  },
  preferenceTextSelected: {
    color: COLORS.text.white,
  },
  ageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  ageOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.neutral.grey200,
    backgroundColor: COLORS.neutral.white,
    minWidth: 70,
  },
  ageSelected: {
    backgroundColor: COLORS.primary.main,
    borderColor: COLORS.primary.main,
  },
  ageText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text.primary,
    textAlign: 'center',
  },
  ageTextSelected: {
    color: COLORS.text.white,
  },
  
  // Step 5 - 위치
  locationContainer: {
    gap: 16,
  },
  locationInput: {
    backgroundColor: COLORS.neutral.white,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: COLORS.neutral.grey200,
    ...SHADOWS.small,
  },
  currentLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.neutral.white,
    borderRadius: 12,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.primary.main,
    ...SHADOWS.small,
  },
  currentLocationText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.primary.main,
  },
  
  // Step 6 - 제목/설명
  titleSection: {
    marginBottom: 24,
  },
  descriptionSection: {
    marginBottom: 24,
  },
  imageSection: {
    marginBottom: 24,
  },
  imageUploadButton: {
    borderWidth: 2,
    borderColor: COLORS.neutral.grey300,
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    backgroundColor: COLORS.primary.light,
  },
  imageUploadContainer: {
    alignItems: 'center',
  },
  imageUploadIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  imageUploadText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  imageUploadSubText: {
    fontSize: 14,
    color: COLORS.text.tertiary,
    textAlign: 'center',
  },
  imagePreviewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  removeImageButton: {
    backgroundColor: COLORS.functional.error,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  removeImageText: {
    color: COLORS.text.white,
    fontWeight: '600',
  },
  priceSection: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  titleInput: {
    backgroundColor: COLORS.neutral.white,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: COLORS.neutral.grey200,
    ...SHADOWS.small,
  },
  descriptionInput: {
    backgroundColor: COLORS.neutral.white,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: COLORS.neutral.grey200,
    minHeight: 120,
    textAlignVertical: 'top',
    ...SHADOWS.small,
  },
  priceOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  priceOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.neutral.grey200,
    backgroundColor: COLORS.neutral.white,
  },
  priceSelected: {
    backgroundColor: COLORS.primary.main,
    borderColor: COLORS.primary.main,
  },
  priceText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text.primary,
  },
  priceTextSelected: {
    color: COLORS.text.white,
  },
  
  // 하단 버튼
  bottomContainer: {
    padding: 20,
    paddingBottom: 30,
    backgroundColor: COLORS.neutral.white,
  },
  nextButton: {
    backgroundColor: COLORS.neutral.grey800,
    borderRadius: 16,
    paddingVertical: 20,
    alignItems: 'center',
    marginHorizontal: 20,
  },
  nextButtonDisabled: {
    backgroundColor: COLORS.neutral.grey300,
  },
  nextButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.white,
  },
  nextButtonTextDisabled: {
    color: COLORS.text.secondary,
  },
  
  // 당근마켓 스타일 - 드롭다운 선택기
  dateTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  dateTimeRowLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    flex: 1,
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'transparent',
    minWidth: 140,
  },
  dropdownButtonText: {
    fontSize: 16,
    color: '#000000',
    fontWeight: '400',
    marginRight: 8,
  },
  dropdownArrow: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '600',
  },
  
  // 모달 스타일
  modalOverlay: {
    position: 'fixed' as any,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%' as any,
    height: '100%' as any,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%' as any,
    overflow: 'hidden',
    margin: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  modalCloseButton: {
    fontSize: 18,
    color: '#8E8E93',
    fontWeight: '600',
  },
  modalConfirmButton: {
    fontSize: 16,
    color: COLORS.primary.main,
    fontWeight: '600',
  },
  
  // 모달 달력 스타일
  modalCalendarContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  
  // 시간 휠 스타일
  timeWheelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 20,
    paddingHorizontal: 16,
    minHeight: 200,
  },
  timeWheelSection: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  wheelLabel: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  timeScrollView: {
    height: 150,
    width: 70,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
  },
  timeScrollItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    marginVertical: 2,
    marginHorizontal: 4,
  },
  timeScrollItemSelected: {
    backgroundColor: COLORS.neutral.grey700,
  },
  timeScrollText: {
    fontSize: 16,
    color: '#000000',
    fontWeight: '400',
    textAlign: 'center',
  },
  timeScrollTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  
  // 알림 옵션 스타일
  alarmOptionsContainer: {
    paddingVertical: 16,
  },
  alarmOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  alarmOptionSelected: {
    backgroundColor: COLORS.neutral.grey200,
  },
  alarmOptionText: {
    fontSize: 16,
    color: '#000000',
    fontWeight: '400',
  },
  alarmOptionTextSelected: {
    color: COLORS.neutral.grey800,
    fontWeight: '700',
  },
  checkMark: {
    fontSize: 16,
    color: COLORS.neutral.grey800,
    fontWeight: '700',
  },
  
  // 사용자 정의 달력 스타일
  customCalendar: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    margin: 16,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  calendarTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  calendarNavButton: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.primary.main,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  weekHeader: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekDay: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
    paddingVertical: 8,
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
    marginVertical: 2,
  },
  selectedDateButton: {
    backgroundColor: COLORS.neutral.grey700,
    borderRadius: 20,
  },
  otherMonthDate: {
    opacity: 0.3,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '400',
    color: '#000000',
    textAlign: 'center',
  },
  selectedDateText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  otherMonthDateText: {
    color: '#C7C7CC',
  },
  
  // Step 7 - 약속금 결제 스타일
  stepSubtitle: {
    fontSize: 16,
    fontWeight: '400',
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginBottom: 24,
    marginTop: -20,
  },
  depositSection: {
    marginBottom: 32,
  },
  depositAmountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.neutral.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.neutral.grey200,
    paddingHorizontal: 16,
    marginBottom: 16,
    ...SHADOWS.small,
  },
  depositInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.primary,
    paddingVertical: 16,
    textAlign: 'right',
  },
  currencyText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text.secondary,
    marginLeft: 8,
  },
  quickAmountButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  quickAmountButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.neutral.grey200,
    backgroundColor: COLORS.neutral.white,
  },
  quickAmountButtonSelected: {
    backgroundColor: COLORS.neutral.grey700,
    borderColor: COLORS.neutral.grey700,
  },
  quickAmountText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text.primary,
    textAlign: 'center',
  },
  quickAmountTextSelected: {
    color: COLORS.neutral.white,
    fontWeight: '600',
  },
  depositInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary.light,
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  depositInfoText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text.secondary,
    lineHeight: 20,
  },
  paymentMethodSection: {
    marginBottom: 32,
  },
  paymentMethods: {
    gap: 12,
  },
  paymentMethod: {
    backgroundColor: COLORS.neutral.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.neutral.grey200,
    paddingVertical: 16,
    paddingHorizontal: 20,
    ...SHADOWS.small,
  },
  paymentMethodText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text.primary,
    textAlign: 'center',
  },
  paymentMethodTextSelected: {
    color: COLORS.neutral.white,
    fontWeight: '600',
  },
  paymentMethodStep7Selected: {
    backgroundColor: COLORS.primary.main,
    borderColor: COLORS.primary.main,
  },
  paymentMethodSubText: {
    fontSize: 12,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginTop: 4,
  },
  
  // 연령 모달 스타일
  ageRangeContainer: {
    padding: 20,
  },
  ageRangeOption: {
    backgroundColor: COLORS.neutral.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.neutral.grey200,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 16,
    ...SHADOWS.small,
  },
  ageRangeOptionSelected: {
    backgroundColor: COLORS.neutral.grey700,
    borderColor: COLORS.neutral.grey700,
  },
  ageRangeText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text.primary,
    textAlign: 'center',
  },
  ageRangeTextSelected: {
    color: COLORS.text.white,
    fontWeight: '600',
  },
  ageRangeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 12,
    marginTop: 16,
  },
  ageSliderContainer: {
    marginBottom: 20,
  },
  ageScrollView: {
    height: 60,
  },
  ageScrollContent: {
    paddingHorizontal: 10,
  },
  ageItem: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.neutral.white,
    borderWidth: 1,
    borderColor: COLORS.neutral.grey200,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 5,
  },
  ageItemSelected: {
    backgroundColor: COLORS.neutral.grey700,
    borderColor: COLORS.neutral.grey700,
  },
  ageItemDisabled: {
    opacity: 0.3,
  },
  ageItemText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text.primary,
  },
  ageItemTextSelected: {
    color: COLORS.text.white,
    fontWeight: '600',
  },
  ageItemTextDisabled: {
    color: COLORS.text.secondary,
  },
  
  // 위치 모달 스타일
  locationModalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '95%',
    maxWidth: 500,
    maxHeight: '85%' as any,
    overflow: 'hidden',
    margin: 20,
  },
  locationSearchContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  locationSearchInput: {
    flex: 1,
    backgroundColor: COLORS.neutral.grey100,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.text.primary,
  },
  searchButton: {
    backgroundColor: COLORS.neutral.grey700,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapPlaceholder: {
    height: 200,
    backgroundColor: COLORS.neutral.grey100,
    margin: 16,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapPlaceholderText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.secondary,
    marginBottom: 8,
  },
  mapHelpText: {
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  popularLocations: {
    padding: 16,
    paddingTop: 0,
  },
  popularLocationsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 12,
  },
  popularLocationsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  popularLocationItem: {
    backgroundColor: COLORS.neutral.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.neutral.grey200,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  popularLocationText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text.primary,
  },
  addressContainer: {
    marginTop: 16,
    padding: 16,
    backgroundColor: COLORS.primary.light,
    borderRadius: 12,
  },
  addressLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.secondary,
    marginBottom: 4,
  },
  addressText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text.primary,
  },
  baseAddressContainer: {
    marginBottom: 12,
  },
  detailAddressContainer: {
    marginTop: 8,
  },
  detailAddressInput: {
    backgroundColor: COLORS.neutral.white,
    borderWidth: 1,
    borderColor: COLORS.neutral.grey200,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.text.primary,
  },
  
  // 검색 결과 스타일
  searchResultsContainer: {
    maxHeight: 200,
    backgroundColor: COLORS.neutral.white,
    borderRadius: 12,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: COLORS.neutral.grey200,
  },
  searchResultsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.secondary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.grey200,
    backgroundColor: COLORS.primary.light,
  },
  searchResultsList: {
    maxHeight: 160,
    flexGrow: 0,
  },
  searchResultItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.grey100,
  },
  searchResultName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  searchResultAddress: {
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.text.secondary,
  },
  popularLocationDistrict: {
    fontSize: 12,
    fontWeight: '400',
    color: COLORS.text.secondary,
    marginTop: 2,
  },
  
  // 연령 입력 스타일
  ageInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
    padding: 4,
    backgroundColor: COLORS.neutral.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.neutral.grey200,
  },
  ageInput: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    textAlign: 'center',
  },
  ageUnit: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text.secondary,
    paddingRight: 16,
  },
  
  // 컴팩트 나이 슬라이더 스타일
  compactAgeContainer: {
    backgroundColor: COLORS.neutral.white,
    borderWidth: 1,
    borderColor: COLORS.neutral.grey200,
    borderRadius: 12,
    padding: 12,
    marginVertical: 8,
  },
  ageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  compactAgeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.primary,
    minWidth: 70,
    marginRight: 12,
  },
  compactSlider: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    background: `linear-gradient(to right, ${COLORS.neutral.grey200} 0%, ${COLORS.primary.main} 50%, ${COLORS.neutral.grey200} 100%)`,
    outline: 'none',
    appearance: 'none',
    cursor: 'pointer',
  },
  compactLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingHorizontal: 82,
  },
  compactLabel: {
    fontSize: 10,
    color: COLORS.text.secondary,
    fontWeight: '500',
  },
  ageQuickOptions: {
    marginTop: 16,
  },
  ageQuickLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.secondary,
    marginBottom: 8,
  },
  ageQuickButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  ageQuickButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: COLORS.neutral.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.neutral.grey200,
  },
  ageQuickButtonSelected: {
    backgroundColor: COLORS.primary.main,
    borderColor: COLORS.primary.main,
  },
  ageQuickButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text.primary,
  },
  ageQuickButtonTextSelected: {
    color: COLORS.text.white,
    fontWeight: '600',
  },
  
  // Map 스타일
  mapContainer: {
    marginVertical: 16,
  },

  // Step 8: 결제 관련 스타일
  paymentInfoContainer: {
    backgroundColor: COLORS.primary.light,
    padding: 16,
    borderRadius: 12,
    marginVertical: 16,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  paymentLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text.secondary,
  },
  paymentAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary.main,
  },
  pointAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.functional.success,
  },
  paymentMethodContainer: {
    marginVertical: 16,
  },
  sectionLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 12,
  },
  paymentMethodOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: COLORS.neutral.white,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.neutral.grey200,
    marginBottom: 12,
  },
  paymentMethodSelected: {
    borderColor: COLORS.primary.main,
    backgroundColor: COLORS.primary.light,
  },
  paymentMethodInfo: {
    flex: 1,
  },
  paymentMethodTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  paymentMethodSubtitle: {
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.text.secondary,
  },
  paymentMethodDisabled: {
    color: COLORS.neutral.grey400,
  },
  paymentMethodError: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.functional.error,
  },
  paymentNoticeContainer: {
    backgroundColor: COLORS.neutral.light,
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
  },
  paymentNoticeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  paymentNoticeText: {
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.text.secondary,
    lineHeight: 20,
  },

});

export default CreateMeetupWizard;