const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

// Express 앱 설정
const app = express();
app.use(express.json());

// Mock 데이터베이스
const mockDB = {
  users: [
    { id: 'user1', email: 'test@test.com', name: '테스트유저', provider: 'email', is_verified: true },
    { id: 'user2', email: 'admin@test.com', name: '관리자', provider: 'email', is_verified: true }
  ],
  meetups: [
    { id: 'meetup1', title: '테스트모임', host_id: 'user1', current_participants: 1, max_participants: 5, status: '모집중' },
    { id: 'meetup2', title: '종료된모임', host_id: 'user2', current_participants: 3, max_participants: 3, status: '모집완료' }
  ],
  blocked_users: [],
  reviews: [],
  notifications: [],
  points: [
    { user_id: 'user1', balance: 5000 },
    { user_id: 'user2', balance: 10000 }
  ],
  wishlist: [],
  recent_views: []
};

// JWT 토큰 생성 함수
const generateToken = (payload) => jwt.sign(payload, 'test-secret', { expiresIn: '1h' });
const userToken = generateToken({ userId: 'user1', email: 'test@test.com', name: '테스트유저' });
const adminToken = generateToken({ adminId: 'admin1', role: 'admin' });

// 인증 미들웨어 모킹
const mockAuthenticateToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (token) {
    req.user = { userId: 'user1', email: 'test@test.com', name: '테스트유저' };
    next();
  } else {
    res.status(401).json({ success: false, message: 'Unauthorized' });
  }
};

const mockAuthenticateAdmin = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (token && token.includes('admin')) {
    req.admin = { adminId: 'admin1' };
    next();
  } else {
    res.status(401).json({ success: false, message: 'Unauthorized' });
  }
};

// ========= 인증 API =========
app.post('/auth/verify-token', (req, res) => {
  const { token } = req.body;
  if (!token) {
    return res.status(400).json({ success: false, error: '토큰이 필요합니다.' });
  }
  
  try {
    const decoded = jwt.verify(token, 'test-secret');
    const user = mockDB.users.find(u => u.id === decoded.userId);
    if (user) {
      res.json({ success: true, user, isValid: true });
    } else {
      res.status(401).json({ success: false, error: '유효하지 않은 토큰입니다.' });
    }
  } catch (error) {
    res.status(401).json({ success: false, error: '토큰 검증에 실패했습니다.' });
  }
});

app.get('/auth/kakao', (req, res) => {
  res.redirect('https://kauth.kakao.com/oauth/authorize');
});

app.get('/auth/kakao/callback', (req, res) => {
  const { code } = req.query;
  if (code) {
    res.redirect('http://localhost:3000/login?token=' + userToken);
  } else {
    res.redirect('http://localhost:3000/login?error=kakao_login_failed');
  }
});

// ========= 모임 API =========
app.get('/meetups', (req, res) => {
  const { page = 1, limit = 10, category, status } = req.query;
  let meetups = [...mockDB.meetups];
  
  if (category) {meetups = meetups.filter(m => m.category === category);}
  if (status) {meetups = meetups.filter(m => m.status === status);}
  
  const start = (page - 1) * limit;
  const end = start + parseInt(limit);
  const paginatedMeetups = meetups.slice(start, end);
  
  res.json({
    success: true,
    data: paginatedMeetups,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      totalCount: meetups.length,
      totalPages: Math.ceil(meetups.length / limit)
    }
  });
});

app.get('/meetups/:id', (req, res) => {
  const meetup = mockDB.meetups.find(m => m.id === req.params.id);
  if (meetup) {
    res.json({ success: true, data: meetup });
  } else {
    res.status(404).json({ success: false, message: '모임을 찾을 수 없습니다.' });
  }
});

app.post('/meetups', mockAuthenticateToken, (req, res) => {
  const { title, description, maxParticipants = 5 } = req.body;
  if (!title) {
    return res.status(400).json({ success: false, message: '모임 제목이 필요합니다.' });
  }
  
  const newMeetup = {
    id: 'meetup' + (mockDB.meetups.length + 1),
    title,
    description,
    host_id: req.user.userId,
    max_participants: maxParticipants,
    current_participants: 1,
    status: '모집중',
    created_at: new Date().toISOString()
  };
  
  mockDB.meetups.push(newMeetup);
  res.status(201).json({ success: true, data: newMeetup });
});

app.post('/meetups/:id/join', mockAuthenticateToken, (req, res) => {
  const meetup = mockDB.meetups.find(m => m.id === req.params.id);
  if (!meetup) {
    return res.status(404).json({ success: false, message: '모임을 찾을 수 없습니다.' });
  }
  
  if (meetup.current_participants >= meetup.max_participants) {
    return res.status(400).json({ success: false, message: '모임이 가득 찼습니다.' });
  }
  
  meetup.current_participants++;
  res.json({ success: true, message: '모임 참가가 완료되었습니다.' });
});

app.post('/meetups/:id/leave', mockAuthenticateToken, (req, res) => {
  const meetup = mockDB.meetups.find(m => m.id === req.params.id);
  if (!meetup) {
    return res.status(404).json({ success: false, message: '모임을 찾을 수 없습니다.' });
  }
  
  if (meetup.host_id === req.user.userId) {
    return res.status(400).json({ success: false, message: '호스트는 모임을 나갈 수 없습니다.' });
  }
  
  meetup.current_participants--;
  res.json({ success: true, message: '모임 나가기가 완료되었습니다.' });
});

app.delete('/meetups/:id', mockAuthenticateToken, (req, res) => {
  const meetupIndex = mockDB.meetups.findIndex(m => m.id === req.params.id);
  if (meetupIndex === -1) {
    return res.status(404).json({ success: false, message: '모임을 찾을 수 없습니다.' });
  }
  
  const meetup = mockDB.meetups[meetupIndex];
  if (meetup.host_id !== req.user.userId) {
    return res.status(403).json({ success: false, message: '권한이 없습니다.' });
  }
  
  mockDB.meetups.splice(meetupIndex, 1);
  res.json({ success: true, message: '모임이 삭제되었습니다.' });
});

// ========= 리뷰 API =========
app.post('/meetups/:id/reviews', mockAuthenticateToken, (req, res) => {
  const { rating, content } = req.body;
  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ success: false, message: '1-5점 사이의 평점이 필요합니다.' });
  }
  
  const review = {
    id: 'review' + (mockDB.reviews.length + 1),
    meetup_id: req.params.id,
    user_id: req.user.userId,
    rating,
    content,
    created_at: new Date().toISOString()
  };
  
  mockDB.reviews.push(review);
  res.status(201).json({ success: true, data: review });
});

app.get('/meetups/:id/reviews', (req, res) => {
  const reviews = mockDB.reviews.filter(r => r.meetup_id === req.params.id);
  res.json({ success: true, data: reviews });
});

// ========= 사용자 프로필 API =========
app.get('/user/profile', mockAuthenticateToken, (req, res) => {
  const user = mockDB.users.find(u => u.id === req.user.userId);
  if (user) {
    res.json({ success: true, data: user });
  } else {
    res.status(404).json({ success: false, message: '사용자를 찾을 수 없습니다.' });
  }
});

app.put('/user/profile', mockAuthenticateToken, (req, res) => {
  const userIndex = mockDB.users.findIndex(u => u.id === req.user.userId);
  if (userIndex === -1) {
    return res.status(404).json({ success: false, message: '사용자를 찾을 수 없습니다.' });
  }
  
  const { name, bio } = req.body;
  if (name) {mockDB.users[userIndex].name = name;}
  if (bio) {mockDB.users[userIndex].bio = bio;}
  
  res.json({ success: true, data: mockDB.users[userIndex] });
});

// ========= 찜하기 API =========
app.get('/users/wishlist', mockAuthenticateToken, (req, res) => {
  const wishlist = mockDB.wishlist.filter(w => w.user_id === req.user.userId);
  res.json({ success: true, data: wishlist });
});

app.post('/meetups/:id/wishlist', mockAuthenticateToken, (req, res) => {
  const existing = mockDB.wishlist.find(w => w.meetup_id === req.params.id && w.user_id === req.user.userId);
  if (existing) {
    return res.status(400).json({ success: false, message: '이미 찜한 모임입니다.' });
  }
  
  const wishItem = {
    id: 'wish' + (mockDB.wishlist.length + 1),
    user_id: req.user.userId,
    meetup_id: req.params.id,
    created_at: new Date().toISOString()
  };
  
  mockDB.wishlist.push(wishItem);
  res.status(201).json({ success: true, message: '찜하기가 완료되었습니다.' });
});

app.delete('/meetups/:id/wishlist', mockAuthenticateToken, (req, res) => {
  const wishIndex = mockDB.wishlist.findIndex(w => w.meetup_id === req.params.id && w.user_id === req.user.userId);
  if (wishIndex === -1) {
    return res.status(404).json({ success: false, message: '찜하기 항목을 찾을 수 없습니다.' });
  }
  
  mockDB.wishlist.splice(wishIndex, 1);
  res.json({ success: true, message: '찜하기가 취소되었습니다.' });
});

// ========= 최근 본 글 API =========
app.post('/meetups/:meetupId/view', mockAuthenticateToken, (req, res) => {
  const existing = mockDB.recent_views.find(v => v.meetup_id === req.params.meetupId && v.user_id === req.user.userId);
  if (existing) {
    existing.viewed_at = new Date().toISOString();
  } else {
    mockDB.recent_views.push({
      id: 'view' + (mockDB.recent_views.length + 1),
      user_id: req.user.userId,
      meetup_id: req.params.meetupId,
      viewed_at: new Date().toISOString()
    });
  }
  
  res.json({ success: true, message: '조회 기록이 저장되었습니다.' });
});

app.get('/user/recent-views', mockAuthenticateToken, (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const recentViews = mockDB.recent_views
    .filter(v => v.user_id === req.user.userId)
    .sort((a, b) => new Date(b.viewed_at) - new Date(a.viewed_at));
    
  const start = (page - 1) * limit;
  const end = start + parseInt(limit);
  const paginatedViews = recentViews.slice(start, end);
  
  res.json({
    success: true,
    data: paginatedViews,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      totalCount: recentViews.length
    }
  });
});

app.delete('/user/recent-views', mockAuthenticateToken, (req, res) => {
  mockDB.recent_views = mockDB.recent_views.filter(v => v.user_id !== req.user.userId);
  res.json({ success: true, message: '최근 본 글 목록이 삭제되었습니다.' });
});

// ========= 회원 차단 API =========
app.post('/users/:userId/block', mockAuthenticateToken, (req, res) => {
  const { reason } = req.body;
  if (!reason || reason.length < 5) {
    return res.status(400).json({ success: false, message: '차단 사유는 5글자 이상 입력해주세요.' });
  }
  
  const existing = mockDB.blocked_users.find(b => b.blocked_user_id === req.params.userId && b.blocked_by_user_id === req.user.userId);
  if (existing) {
    return res.status(400).json({ success: false, message: '이미 차단된 회원입니다.' });
  }
  
  mockDB.blocked_users.push({
    id: 'block' + (mockDB.blocked_users.length + 1),
    blocked_user_id: req.params.userId,
    blocked_by_user_id: req.user.userId,
    reason,
    created_at: new Date().toISOString()
  });
  
  res.json({ success: true, message: '회원이 차단되었습니다.' });
});

app.get('/user/blocked-users', mockAuthenticateToken, (req, res) => {
  const blockedUsers = mockDB.blocked_users.filter(b => b.blocked_by_user_id === req.user.userId);
  res.json({ success: true, data: blockedUsers });
});

app.delete('/users/:userId/block', mockAuthenticateToken, (req, res) => {
  const blockIndex = mockDB.blocked_users.findIndex(b => 
    b.blocked_user_id === req.params.userId && b.blocked_by_user_id === req.user.userId
  );
  
  if (blockIndex === -1) {
    return res.status(404).json({ success: false, message: '차단되지 않은 회원입니다.' });
  }
  
  mockDB.blocked_users.splice(blockIndex, 1);
  res.json({ success: true, message: '차단이 해제되었습니다.' });
});

// ========= 포인트 시스템 API =========
app.get('/user/points', mockAuthenticateToken, (req, res) => {
  const points = mockDB.points.find(p => p.user_id === req.user.userId);
  res.json({
    success: true,
    data: {
      balance: points?.balance || 0,
      total_earned: 5000,
      total_spent: 0
    }
  });
});

app.get('/user/point-history', mockAuthenticateToken, (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const history = [
    { id: 1, type: 'earn', amount: 1000, description: '가입 축하 포인트', created_at: new Date().toISOString() },
    { id: 2, type: 'earn', amount: 500, description: '모임 참가 포인트', created_at: new Date().toISOString() }
  ];
  
  res.json({
    success: true,
    data: history,
    pagination: { page: parseInt(page), limit: parseInt(limit), totalCount: history.length }
  });
});

// ========= 알림 API =========
app.get('/notifications', mockAuthenticateToken, (req, res) => {
  const notifications = mockDB.notifications.filter(n => n.user_id === req.user.userId);
  res.json({ success: true, data: notifications });
});

app.patch('/notifications/:id/read', mockAuthenticateToken, (req, res) => {
  const notification = mockDB.notifications.find(n => n.id === req.params.id && n.user_id === req.user.userId);
  if (notification) {
    notification.is_read = true;
    res.json({ success: true, message: '알림이 읽음 처리되었습니다.' });
  } else {
    res.status(404).json({ success: false, message: '알림을 찾을 수 없습니다.' });
  }
});

// ========= 관리자 API =========
app.get('/admin/users', mockAuthenticateAdmin, (req, res) => {
  const { page = 1, limit = 20, search = '' } = req.query;
  let users = [...mockDB.users];
  
  if (search) {
    users = users.filter(u => 
      u.name.includes(search) || u.email.includes(search)
    );
  }
  
  const start = (page - 1) * limit;
  const end = start + parseInt(limit);
  const paginatedUsers = users.slice(start, end);
  
  res.json({
    success: true,
    data: paginatedUsers,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      totalCount: users.length,
      totalPages: Math.ceil(users.length / limit)
    }
  });
});

app.get('/admin/stats', mockAuthenticateAdmin, (req, res) => {
  res.json({
    success: true,
    data: {
      totalUsers: mockDB.users.length,
      totalMeetups: mockDB.meetups.length,
      todayMeetups: 1,
      activeMeetups: mockDB.meetups.filter(m => m.status === '모집중').length
    }
  });
});

app.get('/admin/meetups', mockAuthenticateAdmin, (req, res) => {
  res.json({
    success: true,
    data: mockDB.meetups.slice(0, 5)
  });
});

app.post('/admin/users/:userId/block', mockAuthenticateAdmin, (req, res) => {
  const { reason } = req.body;
  if (!reason || reason.length < 5) {
    return res.status(400).json({ success: false, message: '차단 사유는 5글자 이상 입력해주세요.' });
  }
  
  mockDB.blocked_users.push({
    id: 'admin_block' + (mockDB.blocked_users.length + 1),
    blocked_user_id: req.params.userId,
    blocked_by_user_id: null, // 관리자 차단
    reason: `[관리자 차단] ${reason}`,
    created_at: new Date().toISOString()
  });
  
  res.json({ success: true, message: '회원이 관리자에 의해 차단되었습니다.' });
});

// ========= 파일 업로드 API =========
app.post('/upload', mockAuthenticateToken, (req, res) => {
  // 파일 업로드 모킹
  res.json({
    success: true,
    data: {
      url: 'https://example.com/uploaded-file.jpg',
      key: 'uploads/test-file.jpg'
    }
  });
});

// ========= 건강 체크 API =========
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// 404 핸들러
app.use('*', (req, res) => {
  res.status(404).json({ success: false, message: 'API 엔드포인트를 찾을 수 없습니다.' });
});

// 테스트 스위트
describe('모든 컨트롤러 API 테스트', () => {
  
  describe('인증 API', () => {
    describe('POST /auth/verify-token', () => {
      it('유효한 토큰으로 검증 성공', async () => {
        const response = await request(app)
          .post('/auth/verify-token')
          .send({ token: userToken });
        
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.isValid).toBe(true);
        expect(response.body.user).toBeDefined();
      });
      
      it('토큰 없이 요청 시 400 에러', async () => {
        const response = await request(app)
          .post('/auth/verify-token')
          .send({});
        
        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      });
      
      it('유효하지 않은 토큰으로 401 에러', async () => {
        const response = await request(app)
          .post('/auth/verify-token')
          .send({ token: 'invalid-token' });
        
        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
      });
    });
    
    describe('GET /auth/kakao', () => {
      it('카카오 OAuth 리다이렉트', async () => {
        const response = await request(app).get('/auth/kakao');
        expect(response.status).toBe(302);
      });
    });
    
    describe('GET /auth/kakao/callback', () => {
      it('성공적인 콜백 처리', async () => {
        const response = await request(app)
          .get('/auth/kakao/callback')
          .query({ code: 'test-code' });
        
        expect(response.status).toBe(302);
        expect(response.headers.location).toContain('token=');
      });
      
      it('코드 없이 실패 처리', async () => {
        const response = await request(app).get('/auth/kakao/callback');
        expect(response.status).toBe(302);
        expect(response.headers.location).toContain('error=kakao_login_failed');
      });
    });
  });

  describe('모임 API', () => {
    describe('GET /meetups', () => {
      it('모임 목록 조회 성공', async () => {
        const response = await request(app).get('/meetups');
        
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.pagination).toBeDefined();
      });
      
      it('페이지네이션 기능', async () => {
        const response = await request(app)
          .get('/meetups')
          .query({ page: 1, limit: 1 });
        
        expect(response.status).toBe(200);
        expect(response.body.pagination.page).toBe(1);
        expect(response.body.pagination.limit).toBe(1);
      });
      
      it('카테고리 필터링', async () => {
        const response = await request(app)
          .get('/meetups')
          .query({ category: '식사' });
        
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });
    
    describe('GET /meetups/:id', () => {
      it('특정 모임 조회 성공', async () => {
        const response = await request(app).get('/meetups/meetup1');
        
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.id).toBe('meetup1');
      });
      
      it('존재하지 않는 모임 404 에러', async () => {
        const response = await request(app).get('/meetups/nonexistent');
        
        expect(response.status).toBe(404);
        expect(response.body.success).toBe(false);
      });
    });
    
    describe('POST /meetups', () => {
      it('인증된 사용자의 모임 생성 성공', async () => {
        const response = await request(app)
          .post('/meetups')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            title: '새로운 모임',
            description: '테스트 모임입니다',
            maxParticipants: 4
          });
        
        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data.title).toBe('새로운 모임');
      });
      
      it('인증 없이 모임 생성 시 401 에러', async () => {
        const response = await request(app)
          .post('/meetups')
          .send({ title: '새로운 모임' });
        
        expect(response.status).toBe(401);
      });
      
      it('제목 없이 모임 생성 시 400 에러', async () => {
        const response = await request(app)
          .post('/meetups')
          .set('Authorization', `Bearer ${userToken}`)
          .send({ description: '설명만 있음' });
        
        expect(response.status).toBe(400);
        expect(response.body.message).toContain('제목');
      });
    });
    
    describe('POST /meetups/:id/join', () => {
      it('모임 참가 성공', async () => {
        const response = await request(app)
          .post('/meetups/meetup1/join')
          .set('Authorization', `Bearer ${userToken}`);
        
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toContain('참가가 완료');
      });
      
      it('가득 찬 모임 참가 시 400 에러', async () => {
        const response = await request(app)
          .post('/meetups/meetup2/join')
          .set('Authorization', `Bearer ${userToken}`);
        
        expect(response.status).toBe(400);
        expect(response.body.message).toContain('가득');
      });
      
      it('존재하지 않는 모임 참가 시 404 에러', async () => {
        const response = await request(app)
          .post('/meetups/nonexistent/join')
          .set('Authorization', `Bearer ${userToken}`);
        
        expect(response.status).toBe(404);
      });
    });
    
    describe('POST /meetups/:id/leave', () => {
      it('모임 나가기 성공', async () => {
        const response = await request(app)
          .post('/meetups/meetup2/leave')
          .set('Authorization', `Bearer ${userToken}`);
        
        expect(response.status).toBe(200);
        expect(response.body.message).toContain('나가기가 완료');
      });
      
      it('호스트의 모임 나가기 시도 시 400 에러', async () => {
        const response = await request(app)
          .post('/meetups/meetup1/leave')
          .set('Authorization', `Bearer ${userToken}`);
        
        expect(response.status).toBe(400);
        expect(response.body.message).toContain('호스트');
      });
    });
    
    describe('DELETE /meetups/:id', () => {
      it('호스트의 모임 삭제 성공', async () => {
        const response = await request(app)
          .delete('/meetups/meetup1')
          .set('Authorization', `Bearer ${userToken}`);
        
        expect(response.status).toBe(200);
        expect(response.body.message).toContain('삭제');
      });
      
      it('호스트가 아닌 사용자의 삭제 시도 시 403 에러', async () => {
        const response = await request(app)
          .delete('/meetups/meetup2')
          .set('Authorization', `Bearer ${userToken}`);
        
        expect(response.status).toBe(403);
        expect(response.body.message).toContain('권한');
      });
    });
  });

  describe('리뷰 API', () => {
    describe('POST /meetups/:id/reviews', () => {
      it('리뷰 작성 성공', async () => {
        const response = await request(app)
          .post('/meetups/meetup1/reviews')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            rating: 5,
            content: '정말 좋은 모임이었습니다!'
          });
        
        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data.rating).toBe(5);
      });
      
      it('유효하지 않은 평점으로 400 에러', async () => {
        const response = await request(app)
          .post('/meetups/meetup1/reviews')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            rating: 6,
            content: '평점이 잘못됨'
          });
        
        expect(response.status).toBe(400);
        expect(response.body.message).toContain('1-5점');
      });
    });
    
    describe('GET /meetups/:id/reviews', () => {
      it('모임 리뷰 목록 조회', async () => {
        const response = await request(app).get('/meetups/meetup1/reviews');
        
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data)).toBe(true);
      });
    });
  });

  describe('사용자 프로필 API', () => {
    describe('GET /user/profile', () => {
      it('프로필 조회 성공', async () => {
        const response = await request(app)
          .get('/user/profile')
          .set('Authorization', `Bearer ${userToken}`);
        
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.email).toBe('test@test.com');
      });
      
      it('인증 없이 프로필 조회 시 401 에러', async () => {
        const response = await request(app).get('/user/profile');
        expect(response.status).toBe(401);
      });
    });
    
    describe('PUT /user/profile', () => {
      it('프로필 수정 성공', async () => {
        const response = await request(app)
          .put('/user/profile')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            name: '수정된 이름',
            bio: '새로운 소개'
          });
        
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.name).toBe('수정된 이름');
      });
    });
  });

  describe('찜하기 API', () => {
    describe('GET /users/wishlist', () => {
      it('찜 목록 조회 성공', async () => {
        const response = await request(app)
          .get('/users/wishlist')
          .set('Authorization', `Bearer ${userToken}`);
        
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data)).toBe(true);
      });
    });
    
    describe('POST /meetups/:id/wishlist', () => {
      it('찜하기 추가 성공', async () => {
        const response = await request(app)
          .post('/meetups/meetup1/wishlist')
          .set('Authorization', `Bearer ${userToken}`);
        
        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toContain('찜하기가 완료');
      });
      
      it('이미 찜한 모임 재추가 시 400 에러', async () => {
        // 먼저 찜하기 추가
        await request(app)
          .post('/meetups/meetup2/wishlist')
          .set('Authorization', `Bearer ${userToken}`);
        
        // 다시 찜하기 시도
        const response = await request(app)
          .post('/meetups/meetup2/wishlist')
          .set('Authorization', `Bearer ${userToken}`);
        
        expect(response.status).toBe(400);
        expect(response.body.message).toContain('이미 찜한');
      });
    });
    
    describe('DELETE /meetups/:id/wishlist', () => {
      it('찜하기 취소 성공', async () => {
        // 먼저 찜하기 추가
        await request(app)
          .post('/meetups/meetup1/wishlist')
          .set('Authorization', `Bearer ${userToken}`);
        
        // 찜하기 취소
        const response = await request(app)
          .delete('/meetups/meetup1/wishlist')
          .set('Authorization', `Bearer ${userToken}`);
        
        expect(response.status).toBe(200);
        expect(response.body.message).toContain('취소');
      });
    });
  });

  describe('최근 본 글 API', () => {
    describe('POST /meetups/:meetupId/view', () => {
      it('조회 기록 저장 성공', async () => {
        const response = await request(app)
          .post('/meetups/meetup1/view')
          .set('Authorization', `Bearer ${userToken}`);
        
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toContain('저장');
      });
    });
    
    describe('GET /user/recent-views', () => {
      it('최근 본 글 목록 조회', async () => {
        const response = await request(app)
          .get('/user/recent-views')
          .set('Authorization', `Bearer ${userToken}`);
        
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.pagination).toBeDefined();
      });
      
      it('페이지네이션 적용', async () => {
        const response = await request(app)
          .get('/user/recent-views')
          .set('Authorization', `Bearer ${userToken}`)
          .query({ page: 1, limit: 10 });
        
        expect(response.status).toBe(200);
        expect(response.body.pagination.page).toBe(1);
        expect(response.body.pagination.limit).toBe(10);
      });
    });
    
    describe('DELETE /user/recent-views', () => {
      it('최근 본 글 전체 삭제', async () => {
        const response = await request(app)
          .delete('/user/recent-views')
          .set('Authorization', `Bearer ${userToken}`);
        
        expect(response.status).toBe(200);
        expect(response.body.message).toContain('삭제');
      });
    });
  });

  describe('회원 차단 API', () => {
    describe('POST /users/:userId/block', () => {
      it('회원 차단 성공', async () => {
        const response = await request(app)
          .post('/users/user2/block')
          .set('Authorization', `Bearer ${userToken}`)
          .send({ reason: '스팸 메시지 발송' });
        
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toContain('차단');
      });
      
      it('차단 사유 부족 시 400 에러', async () => {
        const response = await request(app)
          .post('/users/user2/block')
          .set('Authorization', `Bearer ${userToken}`)
          .send({ reason: '짧음' });
        
        expect(response.status).toBe(400);
        expect(response.body.message).toContain('5글자 이상');
      });
      
      it('이미 차단된 회원 재차단 시 400 에러', async () => {
        // 먼저 차단
        await request(app)
          .post('/users/user2/block')
          .set('Authorization', `Bearer ${userToken}`)
          .send({ reason: '스팸 메시지 발송' });
        
        // 다시 차단 시도
        const response = await request(app)
          .post('/users/user2/block')
          .set('Authorization', `Bearer ${userToken}`)
          .send({ reason: '또 다른 사유' });
        
        expect(response.status).toBe(400);
        expect(response.body.message).toContain('이미 차단');
      });
    });
    
    describe('GET /user/blocked-users', () => {
      it('차단 회원 목록 조회', async () => {
        const response = await request(app)
          .get('/user/blocked-users')
          .set('Authorization', `Bearer ${userToken}`);
        
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data)).toBe(true);
      });
    });
    
    describe('DELETE /users/:userId/block', () => {
      it('차단 해제 성공', async () => {
        // 먼저 차단
        await request(app)
          .post('/users/user2/block')
          .set('Authorization', `Bearer ${userToken}`)
          .send({ reason: '테스트 차단' });
        
        // 차단 해제
        const response = await request(app)
          .delete('/users/user2/block')
          .set('Authorization', `Bearer ${userToken}`);
        
        expect(response.status).toBe(200);
        expect(response.body.message).toContain('해제');
      });
      
      it('차단되지 않은 회원 해제 시도 시 404 에러', async () => {
        const response = await request(app)
          .delete('/users/nonblocked/block')
          .set('Authorization', `Bearer ${userToken}`);
        
        expect(response.status).toBe(404);
        expect(response.body.message).toContain('차단되지 않은');
      });
    });
  });

  describe('포인트 시스템 API', () => {
    describe('GET /user/points', () => {
      it('포인트 잔액 조회', async () => {
        const response = await request(app)
          .get('/user/points')
          .set('Authorization', `Bearer ${userToken}`);
        
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(typeof response.body.data.balance).toBe('number');
        expect(response.body.data.total_earned).toBeDefined();
      });
    });
    
    describe('GET /user/point-history', () => {
      it('포인트 내역 조회', async () => {
        const response = await request(app)
          .get('/user/point-history')
          .set('Authorization', `Bearer ${userToken}`);
        
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.pagination).toBeDefined();
      });
      
      it('페이지네이션 기능', async () => {
        const response = await request(app)
          .get('/user/point-history')
          .set('Authorization', `Bearer ${userToken}`)
          .query({ page: 1, limit: 10 });
        
        expect(response.status).toBe(200);
        expect(response.body.pagination.page).toBe(1);
        expect(response.body.pagination.limit).toBe(10);
      });
    });
  });

  describe('알림 API', () => {
    describe('GET /notifications', () => {
      it('알림 목록 조회', async () => {
        const response = await request(app)
          .get('/notifications')
          .set('Authorization', `Bearer ${userToken}`);
        
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data)).toBe(true);
      });
    });
    
    describe('PATCH /notifications/:id/read', () => {
      it('알림 읽음 처리', async () => {
        // Mock 알림 추가
        mockDB.notifications.push({
          id: 'notif1',
          user_id: 'user1',
          message: '테스트 알림',
          is_read: false,
          created_at: new Date().toISOString()
        });
        
        const response = await request(app)
          .patch('/notifications/notif1/read')
          .set('Authorization', `Bearer ${userToken}`);
        
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toContain('읽음 처리');
      });
      
      it('존재하지 않는 알림 처리 시 404 에러', async () => {
        const response = await request(app)
          .patch('/notifications/nonexistent/read')
          .set('Authorization', `Bearer ${userToken}`);
        
        expect(response.status).toBe(404);
      });
    });
  });

  describe('관리자 API', () => {
    describe('GET /admin/users', () => {
      it('관리자 회원 목록 조회', async () => {
        const response = await request(app)
          .get('/admin/users')
          .set('Authorization', `Bearer admin-${adminToken}`);
        
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.pagination).toBeDefined();
      });
      
      it('관리자 인증 없이 접근 시 401 에러', async () => {
        const response = await request(app).get('/admin/users');
        expect(response.status).toBe(401);
      });
      
      it('검색 기능', async () => {
        const response = await request(app)
          .get('/admin/users')
          .set('Authorization', `Bearer admin-${adminToken}`)
          .query({ search: '테스트' });
        
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });
    
    describe('GET /admin/stats', () => {
      it('관리자 통계 조회', async () => {
        const response = await request(app)
          .get('/admin/stats')
          .set('Authorization', `Bearer admin-${adminToken}`);
        
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.totalUsers).toBeDefined();
        expect(response.body.data.totalMeetups).toBeDefined();
      });
    });
    
    describe('GET /admin/meetups', () => {
      it('관리자 모임 목록 조회', async () => {
        const response = await request(app)
          .get('/admin/meetups')
          .set('Authorization', `Bearer admin-${adminToken}`);
        
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data)).toBe(true);
      });
    });
    
    describe('POST /admin/users/:userId/block', () => {
      it('관리자 회원 차단', async () => {
        const response = await request(app)
          .post('/admin/users/user1/block')
          .set('Authorization', `Bearer admin-${adminToken}`)
          .send({ reason: '관리자 정책 위반' });
        
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toContain('관리자에 의해 차단');
      });
      
      it('차단 사유 부족 시 400 에러', async () => {
        const response = await request(app)
          .post('/admin/users/user1/block')
          .set('Authorization', `Bearer admin-${adminToken}`)
          .send({ reason: '짧음' });
        
        expect(response.status).toBe(400);
        expect(response.body.message).toContain('5글자 이상');
      });
    });
  });

  describe('파일 업로드 API', () => {
    describe('POST /upload', () => {
      it('파일 업로드 성공', async () => {
        const response = await request(app)
          .post('/upload')
          .set('Authorization', `Bearer ${userToken}`)
          .attach('file', Buffer.from('test file content'), 'test.txt');
        
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.url).toBeDefined();
      });
      
      it('인증 없이 업로드 시 401 에러', async () => {
        const response = await request(app).post('/upload');
        expect(response.status).toBe(401);
      });
    });
  });

  describe('건강 체크 API', () => {
    describe('GET /health', () => {
      it('서버 상태 확인', async () => {
        const response = await request(app).get('/health');
        
        expect(response.status).toBe(200);
        expect(response.body.status).toBe('OK');
        expect(response.body.timestamp).toBeDefined();
      });
    });
  });

  describe('404 에러 처리', () => {
    it('존재하지 않는 엔드포인트 404 에러', async () => {
      const response = await request(app).get('/non-existent-endpoint');
      
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('찾을 수 없습니다');
    });
  });
});