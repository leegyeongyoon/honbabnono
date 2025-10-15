import { MealPreferences } from '../types/mealPreferences';

export interface Meetup {
  id: number;
  title: string;
  description: string;
  category: string;
  location: string;
  date: string;
  time: string;
  maxParticipants: number;
  currentParticipants: number;
  hostName: string;
  hostId: string;
  hostBabAlScore: number;
  mealPreferences: MealPreferences;
  isApproved: boolean;
  createdAt: string;
  image?: string;
}

class MeetupStore {
  private meetups: Meetup[] = [
    // 기본 샘플 데이터
    {
      id: 1,
      title: '강남역 파스타 맛집 탐방',
      description: '맛있는 파스타를 함께 먹으며 즐거운 대화를 나눠요!',
      category: '양식',
      location: '강남역 2번 출구',
      date: '2024-01-15',
      time: '19:00',
      maxParticipants: 4,
      currentParticipants: 1,
      hostName: '김혼밥',
      hostId: 'user1',
      hostBabAlScore: 85,
      mealPreferences: {
        dietary: [],
        style: ['fine_dining', 'course_meal'],
        restriction: ['no_spicy'],
        atmosphere: ['quiet', 'romantic']
      },
      isApproved: true,
      createdAt: '2024-01-10T10:00:00Z',
      image: 'https://via.placeholder.com/300x200/F5CB76/ffffff?text=Pasta',
    },
    {
      id: 2,
      title: '홍대 술집 호핑',
      description: '홍대의 분위기 좋은 술집들을 함께 탐방해요',
      category: '술집',
      location: '홍대입구역 9번 출구',
      date: '2024-01-16',
      time: '20:00',
      maxParticipants: 6,
      currentParticipants: 1,
      hostName: '이식사',
      hostId: 'user2',
      hostBabAlScore: 72,
      mealPreferences: {
        dietary: [],
        style: ['casual', 'street_food'],
        restriction: ['no_alcohol'],
        atmosphere: ['lively', 'trendy']
      },
      isApproved: true,
      createdAt: '2024-01-11T14:00:00Z',
      image: 'https://via.placeholder.com/300x200/F8E5A3/ffffff?text=Drinks',
    },
  ];

  private listeners: (() => void)[] = [];
  private idCounter = 3; // 다음 ID

  // 구독 기능
  subscribe(listener: () => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach(listener => listener());
  }

  // 모든 모임 가져오기
  getAllMeetups(): Meetup[] {
    return [...this.meetups];
  }

  // 승인된 모임만 가져오기
  getApprovedMeetups(): Meetup[] {
    return this.meetups.filter(meetup => meetup.isApproved);
  }

  // 특정 모임 가져오기
  getMeetupById(id: number): Meetup | undefined {
    return this.meetups.find(meetup => meetup.id === id);
  }

  // 새 모임 생성
  createMeetup(meetupData: Omit<Meetup, 'id' | 'currentParticipants' | 'isApproved' | 'createdAt'>): Meetup {
    const newMeetup: Meetup = {
      ...meetupData,
      id: this.idCounter++,
      currentParticipants: 1, // 호스트가 자동으로 참여
      isApproved: false, // 승인 대기 상태
      createdAt: new Date().toISOString(),
      image: this.getDefaultImage(meetupData.category),
    };

    this.meetups.unshift(newMeetup); // 맨 앞에 추가
    this.notify();
    return newMeetup;
  }

  // 모임 승인
  approveMeetup(id: number): boolean {
    const meetup = this.getMeetupById(id);
    if (meetup) {
      meetup.isApproved = true;
      this.notify();
      return true;
    }
    return false;
  }

  // 모임 참여
  joinMeetup(meetupId: number, userId: string): boolean {
    const meetup = this.getMeetupById(meetupId);
    if (meetup && meetup.currentParticipants < meetup.maxParticipants) {
      meetup.currentParticipants += 1;
      this.notify();
      return true;
    }
    return false;
  }

  // 모임 탈퇴
  leaveMeetup(meetupId: number, userId: string): boolean {
    const meetup = this.getMeetupById(meetupId);
    if (meetup && meetup.currentParticipants > 1) {
      meetup.currentParticipants -= 1;
      this.notify();
      return true;
    }
    return false;
  }

  // 카테고리별 기본 이미지
  private getDefaultImage(category: string): string {
    const imageMap: { [key: string]: string } = {
      '한식': 'https://via.placeholder.com/300x200/F5CB76/ffffff?text=한식',
      '중식': 'https://via.placeholder.com/300x200/F8E5A3/ffffff?text=중식',
      '일식': 'https://via.placeholder.com/300x200/F9E5B8/ffffff?text=일식',
      '양식': 'https://via.placeholder.com/300x200/F5CB76/ffffff?text=양식',
      '카페': 'https://via.placeholder.com/300x200/F2D68A/ffffff?text=카페',
      '술집': 'https://via.placeholder.com/300x200/F7D794/ffffff?text=술집',
    };
    return imageMap[category] || 'https://via.placeholder.com/300x200/F5CB76/ffffff?text=모임';
  }

  // 임시로 승인 처리 (실제로는 관리자가 처리)
  autoApproveMeetup(id: number, delayMs: number = 3000) {
    setTimeout(() => {
      this.approveMeetup(id);
    }, delayMs);
  }
}

// 싱글톤 인스턴스
export const meetupStore = new MeetupStore();