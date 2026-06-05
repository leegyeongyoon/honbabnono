/**
 * 공용 이미지 업로드 유틸 — S3 (merchants/upload.js 패턴 일반화)
 *
 * 사용처: 리뷰 사진, 메뉴 이미지, 매장 이미지
 */

const multer = require('multer');
const logger = require('../config/logger');
const { initializeS3Upload } = require('../config/s3Config');

let s3Upload = null;
try {
  s3Upload = initializeS3Upload();
} catch (error) {
  logger.warn('S3 업로드 설정 초기화 실패 (imageUpload):', error.message);
}

const ALLOWED_IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/** 이미지 전용 multer (memoryStorage) */
const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_IMAGE_MIMES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('허용되지 않는 이미지 형식입니다. (jpeg, png, webp만 가능)'), false);
    }
  },
});

/**
 * S3에 이미지 업로드 → URL 반환
 * @param {Buffer} buffer - 파일 버퍼 (multer memoryStorage)
 * @param {string} mimetype
 * @param {string} keyPrefix - 예: 'review-images/{userId}'
 * @returns {Promise<string>} 업로드된 URL
 * @throws S3 미설정/업로드 실패 시 Error (호출부에서 503/500 분기)
 */
const uploadImageToS3 = async (buffer, mimetype, keyPrefix) => {
  if (!s3Upload) {
    const err = new Error('파일 업로드 서비스가 현재 사용 불가합니다.');
    err.code = 'S3_UNAVAILABLE';
    throw err;
  }

  const ext = mimetype === 'image/png' ? '.png' : mimetype === 'image/webp' ? '.webp' : '.jpg';
  const s3Key = `${keyPrefix}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;

  const result = await s3Upload.s3.upload({
    Bucket: process.env.AWS_S3_BUCKET || 'honbabnono-uploads',
    Key: s3Key,
    Body: buffer,
    ContentType: mimetype,
  }).promise();

  return result.Location;
};

module.exports = {
  imageUpload,
  uploadImageToS3,
};
