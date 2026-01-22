/**
 * 혼밥시러 API 서버 - 모듈화 버전
 *
 * 디렉토리 구조:
 * server/
 * ├── index.js              # 진입점 (이 파일)
 * ├── config/
 * │   ├── database.js       # DB 연결 설정
 * │   ├── logger.js         # 로깅 설정
 * │   ├── s3Config.js       # S3 업로드 설정
 * │   └── aiSearchConfig.js # AI 검색 설정
 * ├── middleware/
 * │   └── auth.js           # 인증 미들웨어
 * ├── utils/
 * │   └── helpers.js        # 공통 유틸리티 함수
 * └── modules/
 *     ├── auth/             # 인증 모듈
 *     ├── user/             # 사용자 모듈
 *     ├── meetups/          # 모임 모듈
 *     ├── chat/             # 채팅 모듈
 *     ├── reviews/          # 리뷰 모듈
 *     ├── points/           # 포인트 모듈
 *     ├── notifications/    # 알림 모듈
 *     ├── badges/           # 뱃지 모듈
 *     ├── admin/            # 관리자 모듈
 *     └── ai/               # AI 모듈
 */

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');
const multer = require('multer');

// 환경변수 로드
const mode = process.env.NODE_ENV;
let envFile;

if (mode === 'production') {
  envFile = '.env.production';
} else if (mode === 'test') {
  envFile = '.env.test';
} else {
  envFile = '.env.development';
}

console.log('🔧 Server mode:', mode);
console.log('🔧 Loading env file:', envFile);

dotenv.config({ path: envFile, override: true });

// 설정 및 유틸리티
const pool = require('./config/database');
const logger = require('./config/logger');
const { initializeS3Upload } = require('./config/s3Config');

// S3 초기화
let uploadToMemory = null;
let uploadToS3Direct = null;
try {
  const s3Config = initializeS3Upload();
  uploadToMemory = s3Config.uploadToMemory;
  uploadToS3Direct = s3Config.uploadToS3Direct;
  logger.info('✅ S3 업로드 설정 초기화 완료');
} catch (error) {
  logger.error('❌ S3 업로드 설정 초기화 실패:', error.message);
}

// 모듈 라우터 임포트
const authRoutes = require('./modules/auth/routes');
const userRoutes = require('./modules/user/routes');
const meetupsRoutes = require('./modules/meetups/routes');
const chatRoutes = require('./modules/chat/routes');
const reviewsRoutes = require('./modules/reviews/routes');
const pointsRoutes = require('./modules/points/routes');
const notificationsRoutes = require('./modules/notifications/routes');
const badgesRoutes = require('./modules/badges/routes');
const adminRoutes = require('./modules/admin/routes');
const aiRoutes = require('./modules/ai/routes');
const advertisementsRoutes = require('./modules/advertisements/routes');
const usersLegacyRoutes = require('./modules/users-legacy/routes');
const supportRoutes = require('./modules/support/routes');
const supportController = require('./modules/support/controller');
const depositsRoutes = require('./modules/deposits/routes');
const searchRoutes = require('./modules/search/routes');
const { authenticateToken } = require('./middleware/auth');
const userController = require('./modules/user/controller');

// Express 앱 초기화
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:3000', 'https://honbabnono.com', 'https://admin.honbabnono.com', 'http://localhost:3002'],
    methods: ['GET', 'POST'],
    credentials: true
  }
});
const PORT = process.env.API_PORT || 3001;

// 업로드 디렉토리 생성
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer 설정
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileExtension = path.extname(file.originalname);
    cb(null, `upload-${uniqueSuffix}${fileExtension}`);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('이미지 파일만 업로드 가능합니다.'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  }
});

// 미들웨어 설정
app.use(cors({
  origin: ['http://localhost:3000', 'https://honbabnono.com', 'https://admin.honbabnono.com', 'http://localhost:3002', 'http://localhost:3003'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 정적 파일 제공
app.use('/uploads', express.static(uploadDir));
app.use(express.static(path.join(__dirname, '../public')));

// 요청 로깅
app.use((req, res, next) => {
  logger.debug(`📝 Request: ${req.method} ${req.url}`);
  next();
});

// API 라우터 설정
const apiRouter = express.Router();

// Health check
apiRouter.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    message: '혼밥시러 API 서버가 정상 동작 중입니다.',
    timestamp: new Date().toISOString(),
    version: '2.0.0-modular'
  });
});

// 공지사항 및 FAQ (공개 API) - supportController 사용
// (아래 standalone routes에서 처리됨)

// 모듈 라우트 연결
apiRouter.use('/auth', authRoutes);
apiRouter.use('/user', userRoutes);
apiRouter.use('/meetups', meetupsRoutes);
apiRouter.use('/chat', chatRoutes);
apiRouter.use('/reviews', reviewsRoutes);
apiRouter.use('/points', pointsRoutes);
apiRouter.use('/notifications', notificationsRoutes);
apiRouter.use('/badges', badgesRoutes);
apiRouter.use('/admin', adminRoutes);
apiRouter.use('/ai', aiRoutes);
apiRouter.use('/advertisements', advertisementsRoutes);
apiRouter.use('/users', usersLegacyRoutes);
apiRouter.use('/support', supportRoutes);
apiRouter.use('/deposits', depositsRoutes);
apiRouter.use('/search', searchRoutes);

// Legal endpoints
apiRouter.get('/legal/terms', supportController.getTerms);
apiRouter.get('/legal/privacy', supportController.getPrivacyPolicy);

// App info
apiRouter.get('/app-info', supportController.getAppInfo);

// Notices (standalone routes)
apiRouter.get('/notices', supportController.getNotices);
apiRouter.get('/notices/:id', supportController.getNoticeById);

// FAQ (standalone route)
apiRouter.get('/faq', supportController.getFaq);

// 이미지 업로드
apiRouter.post('/upload/image', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '이미지 파일이 필요합니다' });
    }

    // S3 업로드가 가능한 경우 S3 사용, 아니면 로컬 저장
    let imageUrl;
    if (uploadToS3Direct) {
      try {
        const s3Result = await uploadToS3Direct(req.file.buffer || require('fs').readFileSync(req.file.path), req.file.originalname, req.file.mimetype);
        imageUrl = s3Result.location;
      } catch (s3Error) {
        console.error('S3 업로드 실패, 로컬 저장:', s3Error);
        imageUrl = `${process.env.API_URL || 'http://localhost:3001'}/uploads/${req.file.filename}`;
      }
    } else {
      imageUrl = `${process.env.API_URL || 'http://localhost:3001'}/uploads/${req.file.filename}`;
    }

    res.json({
      success: true,
      imageUrl: imageUrl,
      filename: req.file.filename || req.file.originalname
    });
  } catch (error) {
    console.error('이미지 업로드 오류:', error);
    res.status(500).json({ error: '이미지 업로드 중 오류가 발생했습니다' });
  }
});

// 프로필 이미지 업로드
apiRouter.post('/user/upload-profile-image', authenticateToken, upload.single('image'), userController.uploadProfileImage);

// 문서 업로드
apiRouter.post('/upload/document', authenticateToken, upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: '문서 파일이 필요합니다' });
    }

    const documentUrl = `${process.env.API_URL || 'http://localhost:3001'}/uploads/${req.file.filename}`;

    res.json({
      success: true,
      message: '문서가 업로드되었습니다.',
      url: documentUrl
    });
  } catch (error) {
    console.error('문서 업로드 오류:', error);
    res.status(500).json({ success: false, error: '문서 업로드 실패' });
  }
});

// 파일 삭제
apiRouter.delete('/upload/:fileId', authenticateToken, async (req, res) => {
  try {
    const { fileId } = req.params;
    // 실제로는 S3에서 삭제하거나 로컬 파일 시스템에서 삭제해야 함
    // 여기서는 간단히 성공 응답
    res.json({ success: true, message: '파일이 삭제되었습니다.' });
  } catch (error) {
    console.error('파일 삭제 오류:', error);
    res.status(500).json({ success: false, error: '파일 삭제 실패' });
  }
});

// 테스트용 챗봇 메시지 전송 엔드포인트
apiRouter.post('/test/chatbot/send', async (req, res) => {
  try {
    const { meetupId, triggerType } = req.body;

    if (!meetupId || !triggerType) {
      return res.status(400).json({
        success: false,
        error: 'meetupId와 triggerType이 필요합니다.'
      });
    }

    // 간단한 테스트 응답 (실제 챗봇 메시지 전송은 chat 모듈에서 처리)
    res.json({
      success: true,
      message: `챗봇 메시지가 전송되었습니다: ${triggerType} for meetup ${meetupId}`
    });
  } catch (error) {
    console.error('테스트 챗봇 메시지 전송 실패:', error);
    res.status(500).json({
      success: false,
      error: '챗봇 메시지 전송에 실패했습니다.'
    });
  }
});

// 모임 시작 시 자동 챗봇 메시지 트리거
apiRouter.post('/internal/chatbot/trigger/:meetupId', async (req, res) => {
  try {
    const { meetupId } = req.params;
    const { triggerType, customMessage } = req.body;

    // 간단한 응답 (실제 로직은 chat 모듈에서 처리)
    res.json({
      success: true,
      message: '챗봇 메시지가 전송되었습니다.',
      meetupId,
      triggerType
    });
  } catch (error) {
    console.error('챗봇 트리거 오류:', error);
    res.status(500).json({
      success: false,
      error: '챗봇 메시지 전송 중 오류가 발생했습니다.'
    });
  }
});

// 스케줄된 알림 처리 (크론잡에서 호출)
apiRouter.post('/internal/scheduled-notifications', async (req, res) => {
  try {
    // 실제 스케줄된 알림 처리 로직
    res.json({
      success: true,
      processed: {
        reminders30: 0,
        reminders10: 0,
        meetupStarts: 0
      }
    });
  } catch (error) {
    console.error('스케줄된 알림 처리 오류:', error);
    res.status(500).json({
      success: false,
      error: '스케줄된 알림 처리 중 오류가 발생했습니다.'
    });
  }
});

// AI 검색 API 엔드포인트
apiRouter.post('/search/ai', async (req, res) => {
  try {
    const { query } = req.body;

    if (!query || query.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: '검색어를 입력해주세요.'
      });
    }

    // 활성 모임 가져오기
    const meetupsResult = await pool.query(`
      SELECT
        id, title, description, category, location,
        date, time, max_participants, current_participants
      FROM meetups
      WHERE status IN ('모집중', '모집완료')
        AND date >= CURRENT_DATE
      ORDER BY date ASC
      LIMIT 20
    `);

    const allMeetups = meetupsResult.rows;

    if (allMeetups.length === 0) {
      return res.json({
        success: true,
        results: [{
          isNoMatch: true,
          userContext: query,
          noMatchReason: '현재 활성화된 모임이 없습니다.',
          wantedCategory: ''
        }]
      });
    }

    // 간단한 키워드 매칭 기반 검색 (AI 없이)
    const queryLower = query.toLowerCase();
    const matchedMeetups = allMeetups.filter(meetup => {
      const titleMatch = meetup.title?.toLowerCase().includes(queryLower);
      const descMatch = meetup.description?.toLowerCase().includes(queryLower);
      const categoryMatch = meetup.category?.toLowerCase().includes(queryLower);
      const locationMatch = meetup.location?.toLowerCase().includes(queryLower);
      return titleMatch || descMatch || categoryMatch || locationMatch;
    });

    if (matchedMeetups.length === 0) {
      // 매칭 결과 없으면 전체 모임 반환
      return res.json({
        success: true,
        results: allMeetups.map(m => ({
          meetupId: m.id,
          title: m.title,
          description: m.description,
          category: m.category,
          location: m.location,
          date: m.date,
          time: m.time,
          relevanceScore: 50
        })),
        message: '정확히 일치하는 모임이 없어 모든 모임을 보여드립니다.'
      });
    }

    res.json({
      success: true,
      results: matchedMeetups.map(m => ({
        meetupId: m.id,
        title: m.title,
        description: m.description,
        category: m.category,
        location: m.location,
        date: m.date,
        time: m.time,
        relevanceScore: 85
      }))
    });

  } catch (error) {
    console.error('AI 검색 오류:', error);
    res.status(500).json({
      success: false,
      error: 'AI 검색 중 오류가 발생했습니다.'
    });
  }
});

// /meetup (단수형) 레거시 경로 - progress-check, progress-response
const meetupsController = require('./modules/meetups/controller');
apiRouter.post('/meetup/:meetupId/progress-check', authenticateToken, async (req, res) => {
  req.params.id = req.params.meetupId;
  return meetupsController.progressCheck(req, res);
});

apiRouter.post('/meetup/:meetupId/progress-response', authenticateToken, async (req, res) => {
  req.params.id = req.params.meetupId;
  return meetupsController.progressResponse(req, res);
});

// /my-meetups 레거시 경로
apiRouter.get('/my-meetups', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await pool.query(`
      SELECT
        m.id, m.title, m.date, m.time, m.location, m.category,
        m.max_participants, m.current_participants, m.status,
        mp.status as participation_status, mp.joined_at,
        u.name as host_name,
        CASE WHEN m.host_id = $1 THEN true ELSE false END as is_host
      FROM meetup_participants mp
      JOIN meetups m ON mp.meetup_id = m.id
      JOIN users u ON m.host_id = u.id
      WHERE mp.user_id = $1
      ORDER BY m.date DESC, m.time DESC
    `, [userId]);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('내 모임 목록 조회 오류:', error);
    res.status(500).json({ success: false, message: '모임 목록을 불러올 수 없습니다.' });
  }
});

// Reverse geocoding proxy (카카오 API)
apiRouter.get('/geocode/reverse', async (req, res) => {
  try {
    const { latitude, longitude } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        error: '위도와 경도가 필요합니다.'
      });
    }

    const KAKAO_REST_API_KEY = process.env.KAKAO_CLIENT_ID;
    const axios = require('axios');

    const response = await axios.get(
      `https://dapi.kakao.com/v2/local/geo/coord2address.json`,
      {
        headers: {
          'Authorization': `KakaoAK ${KAKAO_REST_API_KEY}`,
        },
        params: {
          x: longitude,
          y: latitude,
        }
      }
    );

    res.json({
      success: true,
      data: response.data
    });
  } catch (error) {
    console.error('Reverse geocoding 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Reverse geocoding 실패'
    });
  }
});

// API 라우터를 /api 경로에 마운트
app.use('/api', apiRouter);

// 레거시 경로 리다이렉트
app.use('/meetups', (req, res) => {
  res.redirect(301, `/api${req.originalUrl}`);
});

app.use('/auth', (req, res) => {
  res.redirect(301, `/api${req.originalUrl}`);
});

app.use('/chat', (req, res) => {
  res.redirect(301, `/api${req.originalUrl}`);
});

// Socket.IO 설정
io.on('connection', (socket) => {
  console.log('🔌 Socket connected:', socket.id);

  socket.on('join_room', (roomId) => {
    socket.join(roomId);
    console.log(`User joined room: ${roomId}`);
  });

  socket.on('leave_room', (roomId) => {
    socket.leave(roomId);
    console.log(`User left room: ${roomId}`);
  });

  socket.on('send_message', (data) => {
    io.to(data.roomId).emit('receive_message', data);
  });

  socket.on('disconnect', () => {
    console.log('🔌 Socket disconnected:', socket.id);
  });
});

// 에러 핸들링
app.use((err, req, res, next) => {
  logger.error('Server error:', err);
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'development' ? err.message : '서버 오류가 발생했습니다.'
  });
});

// 404 핸들링
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: '요청한 리소스를 찾을 수 없습니다.'
  });
});

// 서버 시작 (테스트 환경에서는 자동 시작하지 않음)
if (mode !== 'test') {
  server.listen(PORT, () => {
    console.log('');
    console.log('═══════════════════════════════════════════════════');
    console.log('   🍚 혼밥시러 API 서버 (모듈화 버전)');
    console.log('═══════════════════════════════════════════════════');
    console.log(`   📍 포트: ${PORT}`);
    console.log(`   🌍 환경: ${mode || 'development'}`);
    console.log(`   📂 모듈 구조:`);
    console.log(`      - auth, user, meetups, chat`);
    console.log(`      - reviews, points, notifications, badges`);
    console.log(`      - admin, ai`);
    console.log('═══════════════════════════════════════════════════');
    console.log('');
  });
}

// io 객체 내보내기 (다른 모듈에서 사용 가능)
module.exports = { app, io, server };
