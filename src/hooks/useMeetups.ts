import { useState, useEffect } from 'react';
import { useMeetupStore, Meetup } from '../store/meetupStore';

interface SearchParams {
  search?: string;
  category?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  radius?: number;
  page?: number;
  limit?: number;
}

export const useMeetups = () => {
  const [meetups, setMeetups] = useState<Meetup[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchMeetups = async (searchParams: SearchParams = {}) => {
    setLoading(true);
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

      // URL 구성
      const queryParams = new URLSearchParams();
      if (searchParams.search) {queryParams.append('search', searchParams.search);}
      if (searchParams.category && searchParams.category !== '전체') {
        queryParams.append('category', searchParams.category);
      }
      if (searchParams.location && searchParams.location !== '전체') {
        queryParams.append('location', searchParams.location);
      }
      if (searchParams.latitude) {queryParams.append('latitude', searchParams.latitude.toString());}
      if (searchParams.longitude) {queryParams.append('longitude', searchParams.longitude.toString());}
      if (searchParams.radius) {queryParams.append('radius', searchParams.radius.toString());}
      if (searchParams.page) {queryParams.append('page', searchParams.page.toString());}
      if (searchParams.limit) {queryParams.append('limit', searchParams.limit.toString());}
      
      const queryString = queryParams.toString();
      const fullUrl = `${apiUrl}/meetups${queryString ? '?' + queryString : ''}`;

      const response = await fetch(fullUrl);
      const data = await response.json();
      
      // 백엔드 데이터를 프론트엔드 형식에 맞게 변환
      const meetupList = data.meetups || [];
      const transformedMeetups = meetupList.map((meetup: any) => ({
        id: meetup.id,
        title: meetup.title || '제목 없음',
        description: meetup.description || '',
        category: meetup.category || '기타',
        location: meetup.location || '위치 미정',
        address: meetup.address,
        date: meetup.date || '',
        time: meetup.time || '',
        maxParticipants: meetup.maxParticipants ?? meetup.max_participants ?? 4,
        currentParticipants: meetup.currentParticipants ?? meetup.current_participants ?? 0,
        priceRange: meetup.priceRange,
        ageRange: meetup.ageRange,
        genderPreference: meetup.genderPreference,
        diningPreferences: meetup.diningPreferences || {},
        promiseDepositAmount: meetup.promiseDepositAmount || 0,
        promiseDepositRequired: meetup.promiseDepositRequired || false,
        hostName: meetup.host?.name || '익명',
        hostId: meetup.hostId,
        hostBabAlScore: Math.round(parseFloat(meetup.host?.rating || '5.0') * 20), // 5점을 100점으로 변환
        mealPreferences: {
          dietary: [],
          style: [],
          restriction: [],
          atmosphere: []
        },
        status: (() => {
          const statusMap: Record<string, string> = {
            '모집중': 'recruiting',
            '모집완료': 'confirmed',
            '진행중': 'in_progress',
            '종료': 'completed',
            '취소': 'cancelled',
          };
          return statusMap[meetup.status] || meetup.status;
        })(),
        latitude: meetup.latitude,
        longitude: meetup.longitude,
        distance: meetup.distance ?? null,
        isApproved: true, // 백엔드에서 온 데이터는 모두 승인된 것으로 처리
        createdAt: meetup.createdAt,
        image: meetup.image || undefined,
      }));
      
      setMeetups(transformedMeetups);
    } catch (error) {
      // 에러 시 빈 배열 설정
      setMeetups([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 백엔드에서 실제 데이터 가져오기
    fetchMeetups();
  }, []);

  const createMeetup = async (meetupData: {
    title: string;
    description: string;
    category: string;
    location: string;
    date: string;
    time: string;
    maxParticipants: number;
    hostName: string;
    hostId: string;
  }) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('로그인이 필요합니다');
      }

      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/meetups`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: meetupData.title,
          description: meetupData.description,
          category: meetupData.category,
          location: meetupData.location,
          date: meetupData.date,
          time: meetupData.time,
          maxParticipants: meetupData.maxParticipants,
        }),
      });

      if (!response.ok) {
        throw new Error('약속 생성에 실패했습니다');
      }

      const result = await response.json();
      
      // 새 모임 생성 후 목록 새로고침
      await fetchMeetups();
      
      setLoading(false);
      return result.meetup;
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  const joinMeetup = (meetupId: string, userId: string = 'currentUser') => {
    const meetupStore = useMeetupStore();
    return meetupStore.joinMeetup(meetupId, userId);
  };

  const leaveMeetup = (meetupId: string, userId: string = 'currentUser') => {
    const meetupStore = useMeetupStore();
    return meetupStore.leaveMeetup(meetupId, userId);
  };

  const getMeetupById = async (id: string) => {
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
      const response = await fetch(`${apiUrl}/meetups/${id}`);
      
      if (!response.ok) {
        throw new Error('약속을 찾을 수 없습니다');
      }
      
      const data = await response.json();
      
      // API 응답이 { success: true, meetup: {...} } 형태인지 확인
      const meetupData = data.success ? data.meetup : data;
      
      // 백엔드 데이터를 프론트엔드 형식에 맞게 변환
      const meetup = {
        id: meetupData.id,
        title: meetupData.title || '제목 없음',
        description: meetupData.description || '',
        category: meetupData.category || '기타',
        location: meetupData.location || '위치 미정',
        date: meetupData.date || '',
        time: meetupData.time || '',
        maxParticipants: meetupData.maxParticipants ?? meetupData.max_participants ?? 4,
        currentParticipants: meetupData.currentParticipants ?? meetupData.current_participants ?? 0,
        hostName: meetupData.host?.name || '익명',
        hostId: meetupData.hostId,
        hostBabAlScore: 98, // 임시 고정값
        status: meetupData.status,
        created_at: meetupData.createdAt,
        participants: meetupData.participants || []
      };
      
      return meetup;
    } catch (error) {
      // 에러 시 null 반환
      return null;
    }
  };

  const searchMeetups = async (searchParams: SearchParams) => {
    return fetchMeetups(searchParams);
  };

  return {
    meetups,
    loading,
    error: false, // 에러 상태 추가
    refreshMeetups: fetchMeetups, // refreshMeetups로 export
    searchMeetups, // 검색 기능 추가
    createMeetup,
    joinMeetup,
    leaveMeetup,
    getMeetupById,
  };
};