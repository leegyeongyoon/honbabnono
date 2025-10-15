import { useState, useEffect } from 'react';
import { meetupStore, Meetup } from '../store/meetupStore';

export const useMeetups = () => {
  const [meetups, setMeetups] = useState<Meetup[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // 초기 데이터 로드
    setMeetups(meetupStore.getApprovedMeetups());

    // 스토어 변경 구독
    const unsubscribe = meetupStore.subscribe(() => {
      setMeetups(meetupStore.getApprovedMeetups());
    });

    return unsubscribe;
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
      const newMeetup = meetupStore.createMeetup(meetupData);
      
      // 임시로 3초 후 자동 승인 (실제로는 관리자 승인)
      meetupStore.autoApproveMeetup(newMeetup.id, 3000);
      
      setLoading(false);
      return newMeetup;
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