const { Pool } = require('pg');

// PostgreSQL 연결 설정
const pool = new Pool({
  host: 'honbabnono.c3iokeig2kd8.ap-northeast-2.rds.amazonaws.com',
  port: 5432,
  database: 'honbabnono',
  user: 'postgres',
  password: 'honbabnono',
});

// 카테고리별 모임 데이터
const meetupData = [
  // 한식 모임 (20개)
  { title: "강남 김치찌개 맛집 탐방", category: "한식", location: "강남역", address: "서울시 강남구 역삼동", price_per_person: 15000, max_participants: 6, age_range: "20-30", gender_preference: "상관없음" },
  { title: "홍대 삼겹살 파티", category: "한식", location: "홍대입구역", address: "서울시 마포구 서교동", price_per_person: 25000, max_participants: 8, age_range: "20-35", gender_preference: "남성만" },
  { title: "종로 한정식 모임", category: "한식", location: "종로3가역", address: "서울시 종로구", price_per_person: 35000, max_participants: 4, age_range: "30-40", gender_preference: "여성만" },
  { title: "이태원 불고기 저녁", category: "한식", location: "이태원역", address: "서울시 용산구 이태원동", price_per_person: 20000, max_participants: 5, age_range: "25-35", gender_preference: "상관없음" },
  { title: "건대 국밥 모임", category: "한식", location: "건대입구역", address: "서울시 광진구 화양동", price_per_person: 10000, max_participants: 4, age_range: "20-30", gender_preference: "남성만" },
  { title: "신촌 된장찌개 점심", category: "한식", location: "신촌역", address: "서울시 서대문구 창천동", price_per_person: 12000, max_participants: 6, age_range: "전체", gender_preference: "상관없음" },
  { title: "을지로 막걸리 모임", category: "한식", location: "을지로3가역", address: "서울시 중구 을지로", price_per_person: 18000, max_participants: 10, age_range: "25-40", gender_preference: "상관없음" },
  { title: "성수 갈비탕 브런치", category: "한식", location: "성수역", address: "서울시 성동구 성수동", price_per_person: 22000, max_participants: 4, age_range: "30-45", gender_preference: "여성만" },
  { title: "판교 비빔밥 런치", category: "한식", location: "판교역", address: "경기도 성남시 분당구", price_per_person: 13000, max_participants: 5, age_range: "25-35", gender_preference: "상관없음" },
  { title: "강북 순대국 모임", category: "한식", location: "수유역", address: "서울시 강북구 수유동", price_per_person: 9000, max_participants: 6, age_range: "전체", gender_preference: "남성만" },
  { title: "노원 백반 점심", category: "한식", location: "노원역", address: "서울시 노원구", price_per_person: 8000, max_participants: 8, age_range: "30-50", gender_preference: "상관없음" },
  { title: "마포 족발 야식", category: "한식", location: "마포역", address: "서울시 마포구", price_per_person: 30000, max_participants: 4, age_range: "25-35", gender_preference: "상관없음" },
  { title: "송파 감자탕 모임", category: "한식", location: "잠실역", address: "서울시 송파구 잠실동", price_per_person: 18000, max_participants: 6, age_range: "20-30", gender_preference: "여성만" },
  { title: "구로 보쌈 파티", category: "한식", location: "구로디지털단지역", address: "서울시 구로구", price_per_person: 28000, max_participants: 5, age_range: "25-40", gender_preference: "상관없음" },
  { title: "안양 전골 모임", category: "한식", location: "안양역", address: "경기도 안양시", price_per_person: 20000, max_participants: 8, age_range: "전체", gender_preference: "남성만" },
  { title: "분당 한우 저녁", category: "한식", location: "서현역", address: "경기도 성남시 분당구 서현동", price_per_person: 45000, max_participants: 4, age_range: "30-45", gender_preference: "상관없음" },
  { title: "인천 해물찜 모임", category: "한식", location: "부평역", address: "인천시 부평구", price_per_person: 35000, max_participants: 6, age_range: "25-35", gender_preference: "여성만" },
  { title: "수원 갈비 맛집", category: "한식", location: "수원역", address: "경기도 수원시", price_per_person: 38000, max_participants: 5, age_range: "전체", gender_preference: "상관없음" },
  { title: "일산 냉면 모임", category: "한식", location: "정발산역", address: "경기도 고양시 일산", price_per_person: 11000, max_participants: 4, age_range: "20-40", gender_preference: "상관없음" },
  { title: "용산 설렁탕 아침", category: "한식", location: "용산역", address: "서울시 용산구", price_per_person: 12000, max_participants: 6, age_range: "30-50", gender_preference: "남성만" },

  // 중식 모임 (15개)
  { title: "마포 짜장면 맛집", category: "중식", location: "공덕역", address: "서울시 마포구 공덕동", price_per_person: 8000, max_participants: 4, age_range: "전체", gender_preference: "상관없음" },
  { title: "대림 양꼬치 모임", category: "중식", location: "대림역", address: "서울시 영등포구 대림동", price_per_person: 25000, max_participants: 6, age_range: "25-35", gender_preference: "남성만" },
  { title: "건대 마라탕 도전", category: "중식", location: "건대입구역", address: "서울시 광진구", price_per_person: 15000, max_participants: 5, age_range: "20-30", gender_preference: "여성만" },
  { title: "신림 마라샹궈 파티", category: "중식", location: "신림역", address: "서울시 관악구 신림동", price_per_person: 18000, max_participants: 8, age_range: "20-35", gender_preference: "상관없음" },
  { title: "왕십리 훠궈 모임", category: "중식", location: "왕십리역", address: "서울시 성동구", price_per_person: 30000, max_participants: 6, age_range: "25-40", gender_preference: "상관없음" },
  { title: "연남동 중식당 탐방", category: "중식", location: "홍대입구역", address: "서울시 마포구 연남동", price_per_person: 22000, max_participants: 4, age_range: "전체", gender_preference: "여성만" },
  { title: "가로수길 딤섬 브런치", category: "중식", location: "신사역", address: "서울시 강남구 신사동", price_per_person: 35000, max_participants: 4, age_range: "25-35", gender_preference: "상관없음" },
  { title: "명동 중국집 투어", category: "중식", location: "명동역", address: "서울시 중구 명동", price_per_person: 20000, max_participants: 5, age_range: "전체", gender_preference: "남성만" },
  { title: "영등포 탕수육 맛집", category: "중식", location: "영등포역", address: "서울시 영등포구", price_per_person: 16000, max_participants: 6, age_range: "20-40", gender_preference: "상관없음" },
  { title: "노량진 짬뽕 도전", category: "중식", location: "노량진역", address: "서울시 동작구", price_per_person: 10000, max_participants: 4, age_range: "전체", gender_preference: "상관없음" },
  { title: "안산 중국요리 탐방", category: "중식", location: "안산역", address: "경기도 안산시", price_per_person: 18000, max_participants: 8, age_range: "25-35", gender_preference: "여성만" },
  { title: "부천 마파두부 모임", category: "중식", location: "부천역", address: "경기도 부천시", price_per_person: 13000, max_participants: 5, age_range: "전체", gender_preference: "상관없음" },
  { title: "성남 베이징덕 저녁", category: "중식", location: "야탑역", address: "경기도 성남시", price_per_person: 40000, max_participants: 4, age_range: "30-45", gender_preference: "남성만" },
  { title: "의정부 중화요리 모임", category: "중식", location: "의정부역", address: "경기도 의정부시", price_per_person: 15000, max_participants: 6, age_range: "전체", gender_preference: "상관없음" },
  { title: "구리 사천요리 도전", category: "중식", location: "구리역", address: "경기도 구리시", price_per_person: 20000, max_participants: 5, age_range: "25-40", gender_preference: "여성만" },

  // 일식 모임 (15개)
  { title: "강남 라멘 맛집 탐방", category: "일식", location: "강남역", address: "서울시 강남구", price_per_person: 12000, max_participants: 4, age_range: "20-30", gender_preference: "상관없음" },
  { title: "홍대 초밥 뷔페", category: "일식", location: "홍대입구역", address: "서울시 마포구", price_per_person: 35000, max_participants: 6, age_range: "25-35", gender_preference: "여성만" },
  { title: "이태원 이자카야 모임", category: "일식", location: "이태원역", address: "서울시 용산구", price_per_person: 30000, max_participants: 8, age_range: "25-40", gender_preference: "남성만" },
  { title: "압구정 오마카세", category: "일식", location: "압구정역", address: "서울시 강남구 압구정동", price_per_person: 80000, max_participants: 4, age_range: "30-45", gender_preference: "상관없음" },
  { title: "신촌 우동 맛집", category: "일식", location: "신촌역", address: "서울시 서대문구", price_per_person: 9000, max_participants: 5, age_range: "전체", gender_preference: "상관없음" },
  { title: "종로 돈카츠 런치", category: "일식", location: "종각역", address: "서울시 종로구", price_per_person: 13000, max_participants: 4, age_range: "20-35", gender_preference: "여성만" },
  { title: "성수 사케바 모임", category: "일식", location: "성수역", address: "서울시 성동구", price_per_person: 40000, max_participants: 6, age_range: "25-40", gender_preference: "상관없음" },
  { title: "을지로 소바 점심", category: "일식", location: "을지로3가역", address: "서울시 중구", price_per_person: 11000, max_participants: 4, age_range: "전체", gender_preference: "남성만" },
  { title: "판교 일식당 모임", category: "일식", location: "판교역", address: "경기도 성남시", price_per_person: 25000, max_participants: 5, age_range: "25-35", gender_preference: "상관없음" },
  { title: "분당 스시 오마카세", category: "일식", location: "정자역", address: "경기도 성남시 분당구", price_per_person: 60000, max_participants: 4, age_range: "30-50", gender_preference: "여성만" },
  { title: "수원 라멘 투어", category: "일식", location: "수원역", address: "경기도 수원시", price_per_person: 15000, max_participants: 6, age_range: "20-30", gender_preference: "상관없음" },
  { title: "인천 회전초밥", category: "일식", location: "부평역", address: "인천시 부평구", price_per_person: 20000, max_participants: 8, age_range: "전체", gender_preference: "남성만" },
  { title: "일산 가이세키 저녁", category: "일식", location: "정발산역", address: "경기도 고양시", price_per_person: 50000, max_participants: 4, age_range: "35-50", gender_preference: "상관없음" },
  { title: "용인 우나기동 맛집", category: "일식", location: "용인역", address: "경기도 용인시", price_per_person: 28000, max_participants: 5, age_range: "25-40", gender_preference: "여성만" },
  { title: "안양 텐동 런치", category: "일식", location: "안양역", address: "경기도 안양시", price_per_person: 14000, max_participants: 4, age_range: "전체", gender_preference: "상관없음" },

  // 양식 모임 (15개)
  { title: "이태원 파스타 맛집", category: "양식", location: "이태원역", address: "서울시 용산구", price_per_person: 25000, max_participants: 4, age_range: "25-35", gender_preference: "여성만" },
  { title: "강남 스테이크 하우스", category: "양식", location: "강남역", address: "서울시 강남구", price_per_person: 55000, max_participants: 6, age_range: "30-45", gender_preference: "상관없음" },
  { title: "홍대 피자 파티", category: "양식", location: "홍대입구역", address: "서울시 마포구", price_per_person: 20000, max_participants: 8, age_range: "20-30", gender_preference: "남성만" },
  { title: "성수 브런치 카페", category: "양식", location: "성수역", address: "서울시 성동구", price_per_person: 30000, max_participants: 4, age_range: "25-40", gender_preference: "여성만" },
  { title: "청담 이탈리안 저녁", category: "양식", location: "청담역", address: "서울시 강남구 청담동", price_per_person: 70000, max_participants: 4, age_range: "30-50", gender_preference: "상관없음" },
  { title: "연남동 수제버거 모임", category: "양식", location: "홍대입구역", address: "서울시 마포구 연남동", price_per_person: 18000, max_participants: 5, age_range: "20-35", gender_preference: "상관없음" },
  { title: "판교 리조또 런치", category: "양식", location: "판교역", address: "경기도 성남시", price_per_person: 22000, max_participants: 4, age_range: "25-35", gender_preference: "남성만" },
  { title: "분당 와인바 모임", category: "양식", location: "서현역", address: "경기도 성남시 분당구", price_per_person: 45000, max_participants: 6, age_range: "30-45", gender_preference: "여성만" },
  { title: "수원 그릴 스테이크", category: "양식", location: "수원역", address: "경기도 수원시", price_per_person: 40000, max_participants: 5, age_range: "전체", gender_preference: "상관없음" },
  { title: "일산 프렌치 코스", category: "양식", location: "정발산역", address: "경기도 고양시", price_per_person: 80000, max_participants: 4, age_range: "35-50", gender_preference: "상관없음" },
  { title: "인천 해산물 파스타", category: "양식", location: "부평역", address: "인천시 부평구", price_per_person: 28000, max_participants: 6, age_range: "25-40", gender_preference: "남성만" },
  { title: "용인 피자 뷔페", category: "양식", location: "용인역", address: "경기도 용인시", price_per_person: 25000, max_participants: 8, age_range: "전체", gender_preference: "여성만" },
  { title: "부천 샐러드 바", category: "양식", location: "부천역", address: "경기도 부천시", price_per_person: 15000, max_participants: 4, age_range: "20-30", gender_preference: "상관없음" },
  { title: "안산 치킨&맥주", category: "양식", location: "안산역", address: "경기도 안산시", price_per_person: 20000, max_participants: 10, age_range: "25-35", gender_preference: "상관없음" },
  { title: "의정부 BBQ 파티", category: "양식", location: "의정부역", address: "경기도 의정부시", price_per_person: 30000, max_participants: 8, age_range: "전체", gender_preference: "남성만" },

  // 카페/디저트 모임 (10개)
  { title: "강남 디저트 카페 투어", category: "카페", location: "강남역", address: "서울시 강남구", price_per_person: 15000, max_participants: 4, age_range: "20-30", gender_preference: "여성만" },
  { title: "연남동 커피 클래스", category: "카페", location: "홍대입구역", address: "서울시 마포구 연남동", price_per_person: 25000, max_participants: 6, age_range: "25-35", gender_preference: "상관없음" },
  { title: "성수 베이커리 카페", category: "카페", location: "성수역", address: "서울시 성동구", price_per_person: 12000, max_participants: 5, age_range: "전체", gender_preference: "여성만" },
  { title: "을지로 레트로 카페", category: "카페", location: "을지로3가역", address: "서울시 중구", price_per_person: 8000, max_participants: 4, age_range: "20-35", gender_preference: "상관없음" },
  { title: "판교 스터디 카페", category: "카페", location: "판교역", address: "경기도 성남시", price_per_person: 10000, max_participants: 8, age_range: "25-40", gender_preference: "남성만" },
  { title: "분당 브런치 카페", category: "카페", location: "정자역", address: "경기도 성남시 분당구", price_per_person: 20000, max_participants: 4, age_range: "30-45", gender_preference: "여성만" },
  { title: "수원 독서 카페", category: "카페", location: "수원역", address: "경기도 수원시", price_per_person: 6000, max_participants: 6, age_range: "전체", gender_preference: "상관없음" },
  { title: "인천 마카롱 클래스", category: "카페", location: "부평역", address: "인천시 부평구", price_per_person: 35000, max_participants: 4, age_range: "25-35", gender_preference: "여성만" },
  { title: "일산 애프터눈 티", category: "카페", location: "정발산역", address: "경기도 고양시", price_per_person: 30000, max_participants: 4, age_range: "30-50", gender_preference: "상관없음" },
  { title: "용인 케이크 만들기", category: "카페", location: "용인역", address: "경기도 용인시", price_per_person: 40000, max_participants: 5, age_range: "20-40", gender_preference: "남성만" },

  // 술/바 모임 (10개)
  { title: "이태원 칵테일 바", category: "술집", location: "이태원역", address: "서울시 용산구", price_per_person: 35000, max_participants: 6, age_range: "25-35", gender_preference: "상관없음" },
  { title: "강남 와인바 모임", category: "술집", location: "강남역", address: "서울시 강남구", price_per_person: 50000, max_participants: 4, age_range: "30-45", gender_preference: "여성만" },
  { title: "홍대 펍 크롤링", category: "술집", location: "홍대입구역", address: "서울시 마포구", price_per_person: 40000, max_participants: 8, age_range: "20-30", gender_preference: "남성만" },
  { title: "을지로 막걸리 투어", category: "술집", location: "을지로3가역", address: "서울시 중구", price_per_person: 25000, max_participants: 10, age_range: "25-40", gender_preference: "상관없음" },
  { title: "성수 수제맥주 모임", category: "술집", location: "성수역", address: "서울시 성동구", price_per_person: 30000, max_participants: 6, age_range: "25-35", gender_preference: "상관없음" },
  { title: "판교 위스키 바", category: "술집", location: "판교역", address: "경기도 성남시", price_per_person: 60000, max_participants: 4, age_range: "30-50", gender_preference: "남성만" },
  { title: "분당 샴페인 파티", category: "술집", location: "서현역", address: "경기도 성남시 분당구", price_per_person: 70000, max_participants: 5, age_range: "30-45", gender_preference: "여성만" },
  { title: "수원 호프집 모임", category: "술집", location: "수원역", address: "경기도 수원시", price_per_person: 25000, max_participants: 8, age_range: "전체", gender_preference: "상관없음" },
  { title: "인천 포차 투어", category: "술집", location: "부평역", address: "인천시 부평구", price_per_person: 20000, max_participants: 10, age_range: "20-35", gender_preference: "남성만" },
  { title: "일산 루프탑 바", category: "술집", location: "정발산역", address: "경기도 고양시", price_per_person: 45000, max_participants: 6, age_range: "25-40", gender_preference: "여성만" },
];

// 모임 생성 함수
async function createMeetups() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 모임 데이터 생성 시작...');
    
    // 호스트 ID 가져오기 (첫 번째 사용자를 호스트로 사용)
    const hostResult = await client.query('SELECT id FROM users LIMIT 1');
    if (hostResult.rows.length === 0) {
      console.error('❌ 사용자가 없습니다. 먼저 사용자를 생성해주세요.');
      return;
    }
    const hostId = hostResult.rows[0].id;
    console.log('✅ 호스트 ID:', hostId);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const meetup of meetupData) {
      try {
        // 날짜 생성 (오늘부터 30일 이내 랜덤)
        const daysToAdd = Math.floor(Math.random() * 30);
        const meetupDate = new Date();
        meetupDate.setDate(meetupDate.getDate() + daysToAdd);
        const dateStr = meetupDate.toISOString().split('T')[0];
        
        // 시간 생성 (10시부터 21시 사이 랜덤)
        const hour = 10 + Math.floor(Math.random() * 12);
        const minute = Math.random() > 0.5 ? '00' : '30';
        const timeStr = `${hour.toString().padStart(2, '0')}:${minute}:00`;
        
        // 현재 참가자 수 (0부터 최대 참가자의 70% 사이 랜덤)
        const currentParticipants = Math.floor(Math.random() * (meetup.max_participants * 0.7));
        
        // 상태 결정
        const status = currentParticipants >= meetup.max_participants ? '확정됨' : '모집중';
        
        // 설명 생성
        const description = `${meetup.title}에 함께하실 분들을 모집합니다! 
${meetup.location} 근처에서 만나서 즐거운 시간 보내요.
나이: ${meetup.age_range}, 성별: ${meetup.gender_preference}
예상 비용: 1인당 ${meetup.price_per_person}원`;
        
        // 요구사항
        const requirements = `- 시간 약속을 잘 지켜주세요
- 즐거운 마음으로 참여해주세요
- ${meetup.gender_preference === '상관없음' ? '누구나 환영합니다' : meetup.gender_preference + ' 모임입니다'}`;
        
        // 위도/경도 (서울 중심 기준 랜덤)
        const latitude = 37.5665 + (Math.random() - 0.5) * 0.2;
        const longitude = 126.9780 + (Math.random() - 0.5) * 0.3;
        
        // 이미지 URL (랜덤)
        const images = [
          'https://picsum.photos/400/300?random=1',
          'https://picsum.photos/400/300?random=2',
          'https://picsum.photos/400/300?random=3',
          'https://picsum.photos/400/300?random=4',
          'https://picsum.photos/400/300?random=5'
        ];
        const image = images[Math.floor(Math.random() * images.length)];
        
        const query = `
          INSERT INTO meetups (
            title, description, category, location, address, latitude, longitude,
            date, time, max_participants, current_participants, price_per_person,
            age_range, gender_preference, image, status, host_id, requirements,
            created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, NOW(), NOW())
          RETURNING id
        `;
        
        const values = [
          meetup.title,
          description,
          meetup.category,
          meetup.location,
          meetup.address,
          latitude,
          longitude,
          dateStr,
          timeStr,
          meetup.max_participants,
          currentParticipants,
          meetup.price_per_person,
          meetup.age_range,
          meetup.gender_preference,
          image,
          status,
          hostId,
          requirements
        ];
        
        const result = await client.query(query, values);
        console.log(`✅ 모임 생성: "${meetup.title}" (ID: ${result.rows[0].id})`);
        successCount++;
        
      } catch (error) {
        console.error(`❌ 모임 생성 실패: "${meetup.title}"`, error.message);
        errorCount++;
      }
    }
    
    console.log('\n📊 결과:');
    console.log(`✅ 성공: ${successCount}개`);
    console.log(`❌ 실패: ${errorCount}개`);
    console.log(`📋 전체: ${meetupData.length}개`);
    
  } catch (error) {
    console.error('❌ 오류 발생:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// 실행
createMeetups().then(() => {
  console.log('✨ 완료!');
  process.exit(0);
}).catch(error => {
  console.error('💥 실행 실패:', error);
  process.exit(1);
});