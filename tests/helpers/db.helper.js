/**
 * Database Test Helper
 * 데이터베이스 관련 테스트 헬퍼 함수
 */

let pool;

/**
 * 데이터베이스 풀 초기화
 * @returns {Object} Database pool
 */
const initializePool = () => {
  if (!pool) {
    pool = require('../../server/config/database');
  }
  return pool;
};

/**
 * 테스트 사용자 시딩
 * @param {Object} userData - 사용자 데이터
 * @returns {Object} 생성된 사용자
 */
const seedUser = async (userData) => {
  const db = initializePool();
  const result = await db.query(
    `INSERT INTO users (id, email, name, password, provider, provider_id, profile_image,
      is_verified, is_blocked, rating, bab_al_score, points_balance, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
     ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name
     RETURNING *`,
    [
      userData.id,
      userData.email,
      userData.name,
      userData.password || 'hashedPassword',
      userData.provider || 'email',
      userData.provider_id,
      userData.profile_image,
      userData.is_verified !== undefined ? userData.is_verified : true,
      userData.is_blocked || false,
      userData.rating || 4.5,
      userData.bab_al_score || 50,
      userData.points_balance || 0,
      userData.created_at || new Date(),
      userData.updated_at || new Date(),
    ]
  );
  return result.rows[0];
};

/**
 * 테스트 모임 시딩
 * @param {Object} meetupData - 모임 데이터
 * @returns {Object} 생성된 모임
 */
const seedMeetup = async (meetupData) => {
  const db = initializePool();
  const result = await db.query(
    `INSERT INTO meetups (id, host_id, title, description, category, location, address,
      latitude, longitude, date, time, max_participants, current_participants,
      price_range, age_range, gender_preference, status, image, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
     RETURNING *`,
    [
      meetupData.id,
      meetupData.host_id,
      meetupData.title,
      meetupData.description,
      meetupData.category || '한식',
      meetupData.location,
      meetupData.address,
      meetupData.latitude,
      meetupData.longitude,
      meetupData.date,
      meetupData.time,
      meetupData.max_participants || 4,
      meetupData.current_participants || 1,
      meetupData.price_range,
      meetupData.age_range,
      meetupData.gender_preference,
      meetupData.status || '모집중',
      meetupData.image,
      meetupData.created_at || new Date(),
      meetupData.updated_at || new Date(),
    ]
  );
  return result.rows[0];
};

/**
 * 테스트 참가자 시딩
 * @param {Object} participantData - 참가자 데이터
 * @returns {Object} 생성된 참가자
 */
const seedParticipant = async (participantData) => {
  const db = initializePool();
  const result = await db.query(
    `INSERT INTO meetup_participants (id, meetup_id, user_id, status, attended, joined_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      participantData.id || `participant-${Date.now()}`,
      participantData.meetup_id,
      participantData.user_id,
      participantData.status || '참가승인',
      participantData.attended || false,
      participantData.joined_at || new Date(),
    ]
  );
  return result.rows[0];
};

/**
 * 테스트 데이터 정리 (사용자)
 * @param {Array<string>} userIds - 삭제할 사용자 ID 배열
 */
const cleanupUsers = async (userIds) => {
  if (!userIds || userIds.length === 0) {return;}
  const db = initializePool();
  await db.query(`DELETE FROM users WHERE id = ANY($1)`, [userIds]);
};

/**
 * 테스트 데이터 정리 (모임)
 * @param {Array<string>} meetupIds - 삭제할 모임 ID 배열
 */
const cleanupMeetups = async (meetupIds) => {
  if (!meetupIds || meetupIds.length === 0) {return;}
  const db = initializePool();
  await db.query(`DELETE FROM meetup_participants WHERE meetup_id = ANY($1)`, [meetupIds]);
  await db.query(`DELETE FROM meetups WHERE id = ANY($1)`, [meetupIds]);
};

/**
 * 전체 테스트 데이터 정리
 * @param {Object} data - 정리할 데이터 { userIds, meetupIds }
 */
const cleanupTestData = async (data = {}) => {
  const { userIds = [], meetupIds = [] } = data;

  if (meetupIds.length > 0) {
    await cleanupMeetups(meetupIds);
  }

  if (userIds.length > 0) {
    await cleanupUsers(userIds);
  }
};

/**
 * 테스트용 테이블 초기화 (트랜잭션)
 * @param {Array<string>} tables - 초기화할 테이블 목록
 */
const truncateTables = async (tables) => {
  const db = initializePool();
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    for (const table of tables) {
      await client.query(`TRUNCATE TABLE ${table} CASCADE`);
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * 데이터베이스 연결 확인
 * @returns {boolean} 연결 상태
 */
const checkConnection = async () => {
  try {
    const db = initializePool();
    await db.query('SELECT 1');
    return true;
  } catch {
    return false;
  }
};

module.exports = {
  initializePool,
  seedUser,
  seedMeetup,
  seedParticipant,
  cleanupUsers,
  cleanupMeetups,
  cleanupTestData,
  truncateTables,
  checkConnection,
};
