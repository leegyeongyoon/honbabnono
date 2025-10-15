const express = require('express');
const router = express.Router();

// 더미 데이터
let dummyUsers = [
  {
    id: '1',
    email: 'test@example.com',
    name: '김혼밥',
    profileImage: 'https://via.placeholder.com/120x120/F5CB76/ffffff?text=김',
    rating: 4.8,
    meetupsJoined: 12,
    meetupsHosted: 5,
    babAlScore: 78
  }
];

let dummyMeetups = [
  {
    id: '1',
    title: '🍕 홍대 맛집 피자 투어',
    description: '홍대 근처 유명한 피자집들을 돌아다니며 맛있는 피자를 먹어요!',
    location: '홍대입구역',
    address: '서울시 마포구 홍익로',
    date: '2024-11-20',
    time: '18:00',
    maxParticipants: 6,
    currentParticipants: 3,
    category: '양식',
    priceRange: '2-3만원',
    image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400',
    status: '모집중',
    host: {
      id: '1',
      name: '김혼밥',
      profileImage: 'https://via.placeholder.com/120x120/F5CB76/ffffff?text=김',
      rating: 4.8
    }
  },
  {
    id: '2',
    title: '🍜 강남 라멘 맛집 탐방',
    description: '강남 최고의 라멘집에서 진짜 일본 라멘을 맛보아요',
    location: '강남역',
    address: '서울시 강남구 테헤란로',
    date: '2024-11-22',
    time: '19:30',
    maxParticipants: 4,
    currentParticipants: 2,
    category: '일식',
    priceRange: '1-2만원',
    image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400',
    status: '모집중',
    host: {
      id: '1',
      name: '김혼밥',
      profileImage: 'https://via.placeholder.com/120x120/F5CB76/ffffff?text=김',
      rating: 4.8
    }
  }
];

// 사용자 목록 조회
router.get('/users', (req, res) => {
  res.json({
    users: dummyUsers,
    pagination: {
      total: dummyUsers.length,
      page: 1,
      limit: 10,
      totalPages: 1
    }
  });
});

// 모임 목록 조회
router.get('/meetups', (req, res) => {
  const { category, search } = req.query;
  let filteredMeetups = [...dummyMeetups];
  
  if (category) {
    filteredMeetups = filteredMeetups.filter(m => m.category === category);
  }
  
  if (search) {
    filteredMeetups = filteredMeetups.filter(m => 
      m.title.includes(search) || m.description.includes(search)
    );
  }
  
  res.json({
    meetups: filteredMeetups,
    pagination: {
      total: filteredMeetups.length,
      page: 1,
      limit: 10,
      totalPages: 1
    }
  });
});

// 모임 상세 조회
router.get('/meetups/:id', (req, res) => {
  const { id } = req.params;
  const meetup = dummyMeetups.find(m => m.id === id);
  
  if (!meetup) {
    return res.status(404).json({ error: '모임을 찾을 수 없습니다' });
  }
  
  res.json({ meetup });
});

// 모임 생성 (테스트용)
router.post('/meetups', (req, res) => {
  const { title, description, location, date, time, maxParticipants, category } = req.body;
  
  if (!title || !location || !date || !time || !maxParticipants || !category) {
    return res.status(400).json({ error: '필수 필드를 모두 입력해주세요' });
  }
  
  const newMeetup = {
    id: (dummyMeetups.length + 1).toString(),
    title,
    description: description || '',
    location,
    date,
    time,
    maxParticipants: parseInt(maxParticipants),
    currentParticipants: 1,
    category,
    status: '모집중',
    host: dummyUsers[0]
  };
  
  dummyMeetups.push(newMeetup);
  
  res.status(201).json({
    message: '모임이 생성되었습니다',
    meetup: newMeetup
  });
});

// 서버 상태 조회
router.get('/status', (req, res) => {
  res.json({
    status: 'OK',
    database: 'disconnected',
    features: {
      oauth: true,
      basicAPI: true,
      database: false
    },
    dummyData: {
      users: dummyUsers.length,
      meetups: dummyMeetups.length
    }
  });
});

module.exports = router;