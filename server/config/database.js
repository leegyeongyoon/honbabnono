const { Pool } = require('pg');
const dotenv = require('dotenv');
const logger = require('./logger');

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

dotenv.config({ path: envFile, override: true });

// PostgreSQL 연결 설정
const dbConfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
};

// SSL 설정을 환경변수에 따라 조건부로 추가
if (process.env.DB_SSL !== 'false' && (process.env.NODE_ENV === 'production' || process.env.DB_HOST?.includes('amazonaws.com'))) {
  dbConfig.ssl = {
    rejectUnauthorized: false
  };
}

const pool = new Pool(dbConfig);

// 연결 테스트
pool.on('connect', () => {
  logger.debug('Database connected successfully');
});

pool.on('error', (err) => {
  logger.error('Unexpected database error:', err);
});

module.exports = pool;
