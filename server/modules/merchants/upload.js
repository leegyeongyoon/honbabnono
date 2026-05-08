const multer = require('multer');
const pool = require('../../config/database');
const logger = require('../../config/logger');
const { initializeS3Upload } = require('../../config/s3Config');

// S3 설정 초기화
let s3Upload = null;
try {
  s3Upload = initializeS3Upload();
} catch (error) {
  logger.warn('S3 업로드 설정 초기화 실패 (merchants/upload):', error.message);
}

// 점주 서류 전용 multer 설정 (image/jpeg, image/png, application/pdf)
const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'application/pdf'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const documentUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIMES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('허용되지 않는 파일 형식입니다. (jpeg, png, pdf만 가능)'), false);
    }
  },
});

// 유효한 서류 타입
const VALID_DOC_TYPES = ['business_license', 'business_permit', 'bank_account_copy'];

/**
 * 점주 서류 업로드
 * POST /merchants/upload-doc
 *
 * multipart/form-data:
 *   - document: 파일 (image/jpeg, image/png, application/pdf, 최대 10MB)
 *   - doc_type: 'business_license' | 'business_permit' | 'bank_account_copy'
 */
const uploadDocument = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { doc_type } = req.body;

    // doc_type 검증
    if (!doc_type || !VALID_DOC_TYPES.includes(doc_type)) {
      return res.status(400).json({
        success: false,
        error: `doc_type은 ${VALID_DOC_TYPES.join(', ')} 중 하나여야 합니다.`,
      });
    }

    // 파일 존재 확인
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: '서류 파일이 필요합니다.',
      });
    }

    // 점주 조회
    const merchantResult = await pool.query(
      'SELECT id, verification_docs FROM merchants WHERE user_id = $1',
      [userId]
    );

    if (merchantResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '점주 등록 정보를 찾을 수 없습니다. 점주 등록을 먼저 진행해주세요.',
      });
    }

    const merchant = merchantResult.rows[0];
    const merchantId = merchant.id;

    // S3 업로드
    let documentUrl;

    if (s3Upload) {
      const timestamp = Date.now();
      const ext = req.file.mimetype === 'application/pdf' ? '.pdf' : '.jpg';
      const s3Key = `merchant-docs/${merchantId}/${doc_type}-${timestamp}${ext}`;

      const s3Params = {
        Bucket: process.env.AWS_S3_BUCKET || 'honbabnono-uploads',
        Key: s3Key,
        Body: req.file.buffer,
        ContentType: req.file.mimetype,
      };

      try {
        const s3Result = await s3Upload.s3.upload(s3Params).promise();
        documentUrl = s3Result.Location;
        logger.info('점주 서류 S3 업로드 성공:', { merchantId, doc_type, url: documentUrl });
      } catch (s3Error) {
        logger.error('점주 서류 S3 업로드 실패:', s3Error);
        return res.status(500).json({
          success: false,
          error: '서류 업로드 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
        });
      }
    } else {
      // S3 사용 불가: 로컬 업로드는 지원하지 않음
      return res.status(503).json({
        success: false,
        error: '파일 업로드 서비스가 현재 사용 불가합니다. 잠시 후 다시 시도해주세요.',
      });
    }

    // verification_docs JSONB 업데이트
    const existingDocs = merchant.verification_docs || {};
    const updatedDocs = {
      ...existingDocs,
      [doc_type]: documentUrl,
    };

    await pool.query(
      'UPDATE merchants SET verification_docs = $1, updated_at = NOW() WHERE id = $2',
      [JSON.stringify(updatedDocs), merchantId]
    );

    logger.info('점주 서류 업로드 완료:', { merchantId, doc_type });

    res.json({
      success: true,
      data: {
        doc_type,
        url: documentUrl,
        verification_docs: updatedDocs,
      },
    });
  } catch (error) {
    logger.error('점주 서류 업로드 오류:', error);
    res.status(500).json({
      success: false,
      error: '서류 업로드 중 오류가 발생했습니다.',
    });
  }
};

module.exports = {
  documentUpload,
  uploadDocument,
  VALID_DOC_TYPES,
};
