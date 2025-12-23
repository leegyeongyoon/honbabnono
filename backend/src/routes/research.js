const { Router } = require('express');
const OpenAI = require('openai');
const jwt = require('jsonwebtoken');

const router = Router();

// OpenAI 클라이언트 초기화
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Sequelize 연결
let sequelize;
try {
  const models = require('../models');
  sequelize = models.sequelize;
} catch (error) {
  const { Sequelize } = require('sequelize');
  sequelize = new Sequelize(
    process.env.DATABASE_URL || 
    'postgresql://postgres:honbabnono@honbabnono.c3iokeig2kd8.ap-northeast-2.rds.amazonaws.com:5432/honbabnono'
  );
}

// 인증 미들웨어
const authenticateAdmin = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: '인증이 필요합니다' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'honbabnono_jwt_secret_key_2024');
    
    // 관리자 권한 확인
    const result = await sequelize.query(
      'SELECT id, username, role FROM admins WHERE id = :id AND is_active = true',
      {
        replacements: { id: decoded.id },
        type: sequelize.QueryTypes.SELECT
      }
    );

    if (result.length === 0) {
      return res.status(403).json({ error: '권한이 없습니다' });
    }

    req.admin = result[0];
    next();
  } catch (error) {
    console.error('인증 오류:', error);
    res.status(401).json({ error: '인증 실패' });
  }
};

// 리서치 에이전트 실행 엔드포인트
router.post('/research-agent', authenticateAdmin, async (req, res) => {
  try {
    const { systemPrompt, dailyPrompt, sources = [], customKeywords = [] } = req.body;

    console.log('🤖 리서치 에이전트 실행 시작');
    console.log('📋 소스:', sources.length);
    console.log('🏷️ 커스텀 키워드:', customKeywords.length);

    // 소스 URL에서 데이터 수집 (실제 구현시 필요)
    // 여기서는 프롬프트에 URL만 전달
    const sourcesText = sources.length > 0 
      ? `수집된 소스:\n${sources.join('\n')}` 
      : '(자동 수집 예정 - 혼밥 관련 최신 뉴스, 커뮤니티 글, SNS 포스트)';

    // 키워드 추가
    const keywordsAddition = customKeywords.length > 0
      ? `\n추가 키워드: ${customKeywords.join(', ')}`
      : '';

    // 최종 프롬프트 구성
    const finalPrompt = dailyPrompt + sourcesText + keywordsAddition;

    // OpenAI API 호출
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: finalPrompt }
      ],
      temperature: 0.7,
      response_format: { type: "json_object" }
    });

    let result;
    try {
      result = JSON.parse(completion.choices[0].message.content);
    } catch (parseError) {
      console.error('JSON 파싱 오류:', parseError);
      // JSON 파싱 실패 시 원본 텍스트 반환
      result = {
        rawResponse: completion.choices[0].message.content,
        error: 'JSON 파싱 실패'
      };
    }

    console.log('✅ 리서치 완료');

    // 결과를 DB에 저장 (선택사항)
    try {
      await sequelize.query(
        `INSERT INTO research_reports (admin_id, report_data, created_at) 
         VALUES (:adminId, :reportData, NOW())`,
        {
          replacements: {
            adminId: req.admin.id,
            reportData: JSON.stringify(result)
          },
          type: sequelize.QueryTypes.INSERT
        }
      );
      console.log('💾 리포트 DB 저장 완료');
    } catch (dbError) {
      console.log('⚠️ DB 저장 실패 (테이블이 없을 수 있음):', dbError.message);
    }

    res.json({
      success: true,
      result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('리서치 에이전트 오류:', error);
    res.status(500).json({
      success: false,
      error: error.message || '리서치 실행 중 오류가 발생했습니다'
    });
  }
});

// 저장된 리포트 목록 조회
router.get('/research-reports', authenticateAdmin, async (req, res) => {
  try {
    // 테이블이 없을 수 있으므로 try-catch 처리
    try {
      const reports = await sequelize.query(
        `SELECT id, report_data as report, created_at as date 
         FROM research_reports 
         WHERE admin_id = :adminId 
         ORDER BY created_at DESC 
         LIMIT 20`,
        {
          replacements: { adminId: req.admin.id },
          type: sequelize.QueryTypes.SELECT
        }
      );

      // JSON 문자열을 객체로 변환
      const parsedReports = reports.map(report => ({
        ...report,
        report: typeof report.report === 'string' 
          ? JSON.parse(report.report) 
          : report.report
      }));

      res.json({
        success: true,
        reports: parsedReports
      });
    } catch (dbError) {
      console.log('⚠️ 리포트 조회 실패 (테이블이 없을 수 있음):', dbError.message);
      res.json({
        success: true,
        reports: []
      });
    }
  } catch (error) {
    console.error('리포트 목록 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: '리포트 조회 중 오류가 발생했습니다'
    });
  }
});

// 리포트 저장
router.post('/research-reports', authenticateAdmin, async (req, res) => {
  try {
    const { report, date } = req.body;

    // 먼저 테이블 생성 시도
    try {
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS research_reports (
          id SERIAL PRIMARY KEY,
          admin_id INTEGER NOT NULL,
          report_data JSONB NOT NULL,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);
      console.log('✅ research_reports 테이블 확인/생성 완료');
    } catch (createError) {
      console.log('테이블 생성 시도:', createError.message);
    }

    // 리포트 저장
    await sequelize.query(
      `INSERT INTO research_reports (admin_id, report_data, created_at) 
       VALUES (:adminId, :reportData, :createdAt)`,
      {
        replacements: {
          adminId: req.admin.id,
          reportData: JSON.stringify(report),
          createdAt: date || new Date()
        },
        type: sequelize.QueryTypes.INSERT
      }
    );

    console.log('✅ 리포트 저장 완료');

    res.json({
      success: true,
      message: '리포트가 저장되었습니다'
    });

  } catch (error) {
    console.error('리포트 저장 오류:', error);
    res.status(500).json({
      success: false,
      error: '리포트 저장 중 오류가 발생했습니다'
    });
  }
});

module.exports = router;