const AWS = require('aws-sdk');
const multer = require('multer');
const path = require('path');
const logger = require('./logger');

// S3 설정을 위한 초기화 함수
const initializeS3Upload = () => {
  // 환경변수 확인 및 디버그 로깅
  logger.debug('S3 환경변수 확인:', {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID ? `${process.env.AWS_ACCESS_KEY_ID.substring(0, 8)}...` : 'undefined',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ? `${process.env.AWS_SECRET_ACCESS_KEY.substring(0, 8)}...` : 'undefined',
    region: process.env.AWS_REGION,
    bucket: process.env.AWS_S3_BUCKET
  });

  // AWS S3 설정
  const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION || 'ap-northeast-2'
  });

  // 메모리 스토리지로 multer 설정 (S3에 직접 업로드)
  const uploadToMemory = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 10 * 1024 * 1024 // 10MB 제한
    },
    fileFilter: (req, file, cb) => {
      // 이미지 파일만 허용
      const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('이미지 파일만 업로드 가능합니다.'), false);
      }
    }
  });

  // S3에 직접 업로드하는 함수
  const uploadToS3Direct = async (file, prefix = 'uploads') => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    let fileName;

    // prefix에 따라 폴더 구분
    if (prefix.startsWith('meetup-')) {
      fileName = `meetup-images/${prefix}-${uniqueSuffix}${path.extname(file.originalname)}`;
    } else {
      fileName = `profiles/${prefix}-${uniqueSuffix}${path.extname(file.originalname)}`;
    }

    const params = {
      Bucket: process.env.AWS_S3_BUCKET || 'honbabnono-uploads',
      Key: fileName,
      Body: file.buffer,
      ContentType: file.mimetype
      // ACL 제거 - 버킷 정책으로 퍼블릭 읽기 권한 설정됨
    };

    try {
      logger.debug('S3 업로드 시작:', { fileName, contentType: file.mimetype, size: file.buffer.length });
      const result = await s3.upload(params).promise();
      logger.info('S3 업로드 성공:', result.Location);
      return {
        success: true,
        location: result.Location,
        key: result.Key
      };
    } catch (error) {
      logger.error('S3 업로드 실패:', error);
      throw error;
    }
  };

  return { uploadToMemory, uploadToS3Direct, s3 };
};

// S3에서 파일 삭제하는 함수
const deleteFromS3 = async (fileUrl) => {
  try {
    // S3 URL에서 key 추출
    const s3Region = process.env.AWS_REGION || 'ap-northeast-2';
    const urlParts = fileUrl.split('/');
    const bucketIndex = urlParts.indexOf(process.env.AWS_S3_BUCKET + '.s3.' + s3Region + '.amazonaws.com');

    if (bucketIndex === -1) {
      logger.warn('S3 URL 형식이 잘못되었습니다:', fileUrl);
      return false;
    }

    const key = urlParts.slice(bucketIndex + 1).join('/');

    const params = {
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key
    };

    await s3.deleteObject(params).promise();
    logger.info('S3에서 파일 삭제 성공:', key);
    return true;
  } catch (error) {
    logger.error('S3 파일 삭제 실패:', error);
    return false;
  }
};

module.exports = {
  initializeS3Upload,
  deleteFromS3
};
