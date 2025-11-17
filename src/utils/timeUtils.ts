// 시간 차이를 계산하는 헬퍼 함수들

export const getTimeDifference = (timestamp?: string) => {
  if (!timestamp) return '아직 대화 없음';
  
  const now = new Date();
  const targetTime = new Date(timestamp);
  const diffInMinutes = Math.floor((now.getTime() - targetTime.getTime()) / (1000 * 60));
  
  if (diffInMinutes < 1) return '방금 전';
  if (diffInMinutes < 60) return `${diffInMinutes}분 전`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}시간 전`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) return `${diffInDays}일 전`;
  
  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) return `${diffInMonths}개월 전`;
  
  const diffInYears = Math.floor(diffInMonths / 12);
  return `${diffInYears}년 전`;
};

// 채팅용 시간 표기 (대화 텍스트 포함)
export const getChatTimeDifference = (timestamp?: string) => {
  if (!timestamp) return '아직 대화 없음';
  
  const now = new Date();
  const targetTime = new Date(timestamp);
  const diffInMinutes = Math.floor((now.getTime() - targetTime.getTime()) / (1000 * 60));
  
  if (diffInMinutes < 1) return '방금 전 대화';
  if (diffInMinutes < 60) return `${diffInMinutes}분 전 대화`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}시간 전 대화`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) return `${diffInDays}일 전 대화`;
  
  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) return `${diffInMonths}개월 전 대화`;
  
  const diffInYears = Math.floor(diffInMonths / 12);
  return `${diffInYears}년 전 대화`;
};

// 상세한 날짜 포맷 (오늘, 어제, 요일, 날짜)
export const getDetailedDateFormat = (timestamp?: string) => {
  if (!timestamp) return '';
  
  const now = new Date();
  const targetTime = new Date(timestamp);
  
  const isToday = now.toDateString() === targetTime.toDateString();
  if (isToday) {
    return targetTime.toLocaleTimeString('ko-KR', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  }
  
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = yesterday.toDateString() === targetTime.toDateString();
  if (isYesterday) {
    return '어제';
  }
  
  const diffInDays = Math.floor((now.getTime() - targetTime.getTime()) / (1000 * 60 * 60 * 24));
  if (diffInDays < 7) {
    const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
    return `${weekdays[targetTime.getDay()]}요일`;
  }
  
  if (diffInDays < 365) {
    return targetTime.toLocaleDateString('ko-KR', { 
      month: 'numeric', 
      day: 'numeric' 
    });
  }
  
  return targetTime.toLocaleDateString('ko-KR', { 
    year: 'numeric',
    month: 'numeric', 
    day: 'numeric' 
  });
};

// 채팅방 날짜 헤더용 포맷 (2025년 11월 17일 일요일)
export const getChatDateHeader = (timestamp: string) => {
  const targetTime = new Date(timestamp);
  const now = new Date();
  
  const isToday = now.toDateString() === targetTime.toDateString();
  if (isToday) {
    return '오늘';
  }
  
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = yesterday.toDateString() === targetTime.toDateString();
  if (isYesterday) {
    return '어제';
  }
  
  const weekdays = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
  return `${targetTime.getFullYear()}년 ${targetTime.getMonth() + 1}월 ${targetTime.getDate()}일 ${weekdays[targetTime.getDay()]}`;
};

// 메시지가 같은 날인지 확인
export const isSameDay = (date1: string, date2: string) => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return d1.toDateString() === d2.toDateString();
};