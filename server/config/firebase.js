const logger = require('./logger');

let messaging = null;
let firebaseInitialized = false;

/**
 * Firebase Admin SDK 초기화
 * 환경변수에서 서비스 계정 정보를 읽어 초기화한다.
 * Firebase 설정이 없으면 경고만 출력하고 앱은 정상 작동한다.
 */
const initializeFirebase = () => {
  if (firebaseInitialized) {
    return messaging;
  }

  try {
    const admin = require('firebase-admin');

    let credential;

    // 방법 1: FIREBASE_SERVICE_ACCOUNT (JSON 문자열)
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        credential = admin.credential.cert(serviceAccount);
        logger.info('Firebase: 서비스 계정 JSON으로 초기화');
      } catch (parseError) {
        logger.error('Firebase: FIREBASE_SERVICE_ACCOUNT JSON 파싱 실패', parseError.message);
        return null;
      }
    }
    // 방법 2: 개별 환경변수
    else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      credential = admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        // 환경변수에서 \n이 문자열로 들어올 수 있으므로 실제 개행문자로 변환
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      });
      logger.info('Firebase: 개별 환경변수로 초기화');
    }
    // Firebase 설정 없음
    else {
      logger.warn('Firebase: 환경변수가 설정되지 않았습니다. 푸시 알림이 비활성화됩니다.');
      logger.warn('Firebase: FIREBASE_SERVICE_ACCOUNT 또는 FIREBASE_PROJECT_ID/FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY를 설정하세요.');
      firebaseInitialized = true;
      return null;
    }

    admin.initializeApp({ credential });
    messaging = admin.messaging();
    firebaseInitialized = true;
    logger.info('Firebase Admin SDK 초기화 완료');

    return messaging;
  } catch (error) {
    logger.error('Firebase Admin SDK 초기화 실패:', error.message);
    firebaseInitialized = true;
    return null;
  }
};

/**
 * Firebase Messaging 인스턴스 반환
 * 초기화되지 않았으면 초기화 후 반환
 */
const getMessaging = () => {
  if (!firebaseInitialized) {
    initializeFirebase();
  }
  return messaging;
};

module.exports = {
  initializeFirebase,
  getMessaging,
};
