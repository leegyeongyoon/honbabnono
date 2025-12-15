// 로그 레벨 관리 시스템
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

class Logger {
  constructor() {
    // 환경에 따른 로그 레벨 설정
    this.currentLevel = this.getLogLevel();
    this.isProduction = process.env.NODE_ENV === 'production';
  }

  getLogLevel() {
    const env = process.env.NODE_ENV;
    const customLevel = process.env.LOG_LEVEL;
    
    // 사용자 지정 로그 레벨이 있으면 사용
    if (customLevel && LOG_LEVELS[customLevel.toUpperCase()] !== undefined) {
      return LOG_LEVELS[customLevel.toUpperCase()];
    }
    
    // 환경별 기본 로그 레벨
    switch (env) {
      case 'production':
        return LOG_LEVELS.WARN; // 운영환경: WARN 이상만 출력
      case 'test':
        return LOG_LEVELS.ERROR; // 테스트환경: ERROR만 출력
      case 'development':
      default:
        return LOG_LEVELS.DEBUG; // 개발환경: 모든 로그 출력
    }
  }

  formatMessage(level, message, data = null) {
    const timestamp = new Date().toISOString();
    let formattedMessage = `[${timestamp}] [${level}] ${message}`;
    
    if (data !== null && data !== undefined) {
      if (typeof data === 'object') {
        formattedMessage += ` ${JSON.stringify(data)}`;
      } else {
        formattedMessage += ` ${data}`;
      }
    }
    
    return formattedMessage;
  }

  error(message, data = null) {
    if (this.currentLevel >= LOG_LEVELS.ERROR) {
      console.error(this.formatMessage('ERROR', message, data));
    }
  }

  warn(message, data = null) {
    if (this.currentLevel >= LOG_LEVELS.WARN) {
      console.warn(this.formatMessage('WARN', message, data));
    }
  }

  info(message, data = null) {
    if (this.currentLevel >= LOG_LEVELS.INFO) {
      console.info(this.formatMessage('INFO', message, data));
    }
  }

  debug(message, data = null) {
    if (this.currentLevel >= LOG_LEVELS.DEBUG) {
      console.log(this.formatMessage('DEBUG', message, data));
    }
  }

  // 기존 console.log를 대체하는 메서드
  log(message, data = null) {
    this.debug(message, data);
  }

  // 환경 정보 출력 (항상 표시)
  system(message, data = null) {
    console.log(this.formatMessage('SYSTEM', message, data));
  }
}

// 싱글톤 인스턴스 생성
const logger = new Logger();

module.exports = logger;