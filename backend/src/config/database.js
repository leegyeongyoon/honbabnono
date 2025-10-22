const { Sequelize } = require('sequelize');
// dotenv는 상위에서 이미 로드됨

const sequelize = new Sequelize({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  dialect: 'postgres',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  },
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  timezone: '+09:00' // 한국 시간
});

// 데이터베이스 연결 테스트
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ PostgreSQL 데이터베이스 연결 성공');
  } catch (error) {
    console.error('❌ PostgreSQL 데이터베이스 연결 실패:', error);
  }
};

module.exports = { sequelize, testConnection };