import { useState, useEffect } from 'react';
import { meetupStore, Meetup } from '../store/meetupStore';

export const useMeetups = () => {
  const [meetups, setMeetups] = useState<Meetup[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchMeetups = async () => {
    setLoading(true);
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
      console.log('🔍 Using API URL:', apiUrl);
      console.log('🔍 ENV REACT_APP_API_URL:', process.env.REACT_APP_API_URL);
      const response = await fetch(`${apiUrl}/meetups`);
      const data = await response.json();
      
      // 백엔드 데이터를 프론트엔드 형식에 맞게 변환
      const transformedMeetups = data.meetups.map((meetup: any) => ({
        id: meetup.id,
        title: meetup.title,
        description: meetup.description || '',
        category: meetup.category,
        location: meetup.location,
        date: meetup.date,
        time: meetup.time,
        maxParticipants: meetup.maxParticipants,
        currentParticipants: meetup.currentParticipants,
        hostName: meetup.host?.name || '익명',
        hostId: meetup.hostId,
        hostBabAlScore: Math.round(parseFloat(meetup.host?.rating || '5.0') * 20), // 5점을 100점으로 변환
        mealPreferences: {
          dietary: [],
          style: [],
          restriction: [],
          atmosphere: []
        },
        isApproved: true, // 백엔드에서 온 데이터는 모두 승인된 것으로 처리
        createdAt: meetup.createdAt,
        image: meetup.image || undefined,
      }));
      
      setMeetups(transformedMeetups);
    } catch (error) {
      console.error('모임 목록 조회 실패:', error);
      // 에러 시 로컬 데이터 사용
      setMeetups(meetupStore.getApprovedMeetups());
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

      const response = await fetch(`http://localhost:3001/api/meetups`, {
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
        throw new Error('모임 생성에 실패했습니다');
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

  const joinMeetup = (meetupId: number, userId: string = 'currentUser') => {
    return meetupStore.joinMeetup(meetupId, userId);
  };

  const leaveMeetup = (meetupId: number, userId: string = 'currentUser') => {
    return meetupStore.leaveMeetup(meetupId, userId);
  };

  const getMeetupById = (id: number) => {
    return meetupStore.getMeetupById(id);
  };

  return {
    meetups,
    loading,
    createMeetup,
    joinMeetup,
    leaveMeetup,
    getMeetupById,
  };
};