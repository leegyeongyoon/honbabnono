// 한국 시간 기준 날짜/시간 유틸리티

/**
 * 한국 시간 기준으로 날짜를 포맷팅합니다.
 * @param date - Date 객체 또는 ISO 문자열
 * @param format - 'full' | 'date' | 'time' | 'datetime'
 * @returns 포맷팅된 문자열
 */
export const formatKoreanDateTime = (
  date: string | Date, 
  format: 'full' | 'date' | 'time' | 'datetime' | 'relative' = 'full'
): string => {
  try {
    let dateObj: Date;
    
    if (typeof date === 'string') {
      // ISO 문자열인 경우 (예: "2025-10-23T15:00:00.000Z")
      if (date.includes('T') || date.includes('Z')) {
        dateObj = new Date(date);
      } else {
        // 일반 날짜 문자열인 경우
        dateObj = new Date(date);
      }
    } else {
      dateObj = date;
    }
    
    // 유효한 날짜인지 확인
    if (isNaN(dateObj.getTime())) {
      console.error('Invalid date:', date);
      return '날짜 오류';
    }
  
    // 한국 시간대로 변환
    const koreanTime = new Date(dateObj.toLocaleString("en-US", {timeZone: "Asia/Seoul"}));
    
    const year = koreanTime.getFullYear();
    const month = koreanTime.getMonth() + 1;
    const day = koreanTime.getDate();
    const hours = koreanTime.getHours();
    const minutes = koreanTime.getMinutes();
    const dayOfWeek = ['일', '월', '화', '수', '목', '금', '토'][koreanTime.getDay()];
    
    // 오전/오후 구분
    const ampm = hours >= 12 ? '오후' : '오전';
    const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    
    switch (format) {
      case 'full':
        return `${year}년 ${month}월 ${day}일 (${dayOfWeek}) ${ampm} ${displayHours}시 ${minutes.toString().padStart(2, '0')}분`;
      
      case 'date':
        return `${year}년 ${month}월 ${day}일 (${dayOfWeek})`;
      
      case 'time':
        return `${ampm} ${displayHours}시 ${minutes.toString().padStart(2, '0')}분`;
      
      case 'datetime':
        return `${month}월 ${day}일 ${ampm} ${displayHours}시 ${minutes.toString().padStart(2, '0')}분`;
      
      case 'relative':
        return getRelativeTimeString(dateObj);
      
      default:
        return formatKoreanDateTime(date, 'full');
    }
  } catch (error) {
    console.error('formatKoreanDateTime error:', error, 'date:', date, 'format:', format);
    return '날짜 오류';
  }
};

/**
 * 모임까지 남은 시간을 상대적으로 표시
 */
export const getRelativeTimeString = (date: Date): string => {
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  
  if (diff < 0) {
    // 지난 모임
    const pastDiff = Math.abs(diff);
    const days = Math.floor(pastDiff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((pastDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) {
      return `${days}일 전 종료`;
    } else if (hours > 0) {
      return `${hours}시간 전 종료`;
    } else {
      return '방금 전 종료';
    }
  } else {
    // 다가오는 모임
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) {
      return `${days}일 후`;
    } else if (hours > 0) {
      return `${hours}시간 후`;
    } else if (minutes > 0) {
      return `${minutes}분 후`;
    } else {
      return '곧 시작';
    }
  }
};

/**
 * 모임 시간이 지났는지 확인
 */
export const isMeetupPast = (meetupDate: string, meetupTime: string): boolean => {
  const meetupDateTime = new Date(`${meetupDate}T${meetupTime}`);
  return meetupDateTime.getTime() < Date.now();
};

/**
 * 모임 시작 30분 전인지 확인
 */
export const isWithin30Minutes = (meetupDate: string, meetupTime: string): boolean => {
  const meetupDateTime = new Date(`${meetupDate}T${meetupTime}`);
  const now = new Date();
  const diff = meetupDateTime.getTime() - now.getTime();
  
  // 30분 = 30 * 60 * 1000 = 1800000ms
  return diff > 0 && diff <= 1800000;
};

/**
 * 모임 상태 계산
 */
export const getMeetupStatus = (meetupDate: string, meetupTime: string): {
  status: 'upcoming' | 'starting_soon' | 'ongoing' | 'finished';
  label: string;
  color: string;
} => {
  try {
    let meetupDateTime: Date;
    
    // ISO 문자열인 경우와 일반 날짜 문자열인 경우를 구분
    if (meetupDate.includes('T') || meetupDate.includes('Z')) {
      // 이미 ISO 형태라면 그대로 사용
      meetupDateTime = new Date(meetupDate);
    } else {
      // 날짜와 시간을 합쳐서 처리
      meetupDateTime = new Date(`${meetupDate}T${meetupTime}`);
    }
    
    // 유효한 날짜인지 확인
    if (isNaN(meetupDateTime.getTime())) {
      console.error('Invalid meetup date/time:', meetupDate, meetupTime);
      return {
        status: 'upcoming',
        label: '예정',
        color: COLORS.primary.dark
      };
    }
    
    const now = new Date();
    const diff = meetupDateTime.getTime() - now.getTime();
  
    if (diff < -7200000) { // 2시간 지남
      return {
        status: 'finished',
        label: '종료됨',
        color: COLORS.text.tertiary
      };
    } else if (diff < 0) { // 시작 시간 지남
      return {
        status: 'ongoing',
        label: '진행중',
        color: COLORS.functional.success
      };
    } else if (diff <= 1800000) { // 30분 이내
      return {
        status: 'starting_soon',
        label: '곧 시작',
        color: '#FF9800'
      };
    } else {
      return {
        status: 'upcoming',
        label: '예정',
        color: COLORS.primary.dark
      };
    }
  } catch (error) {
    console.error('getMeetupStatus error:', error, 'meetupDate:', meetupDate, 'meetupTime:', meetupTime);
    return {
      status: 'upcoming',
      label: '예정',
      color: COLORS.primary.dark
    };
  }
};

/**
 * 다음 알림 시간 계산 (30분 전)
 */
export const getNotificationTime = (meetupDate: string, meetupTime: string): Date => {
  const meetupDateTime = new Date(`${meetupDate}T${meetupTime}`);
  return new Date(meetupDateTime.getTime() - 1800000); // 30분 전
};

/**
 * 요일별 색상 반환
 */
export const getDayColor = (date: Date): string => {
  const day = date.getDay();
  const colors = {
    0: '#FF5722', // 일요일 - 빨간색
    1: '#607D8B', // 월요일 - 블루그레이
    2: '#795548', // 화요일 - 브라운
    3: COLORS.functional.success, // 수요일 - 그린
    4: '#FF9800', // 목요일 - 오렌지
    5: COLORS.primary.dark, // 금요일 - 블루
    6: '#9C27B0', // 토요일 - 퍼플
  };
  return colors[day as keyof typeof colors] || '#607D8B';
};