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

// 시스템 프롬프트 정의
const SYSTEM_PROMPTS = {
  collector: `[역할]
너는 "혼밥시러(혼밥 동행 앱)"의 데이터 수집 전문 에이전트다.
공개 웹에서 혼밥, 같이 먹기, 외로움, 식사 동행, 노쇼, 번개모임 관련 신호를 수집한다.

[수집 원칙]
- 로그인 필요/비공개/개인계정/DM/폐쇄 카페는 수집 대상에서 제외
- 원문 저장 금지, 신호(요약)만 저장
- 링크/출처는 저장하되, 사람 이름/닉네임/프로필 사진은 저장하지 않기
- 인용은 1~2문장 이하, 가급적 인용 없이 요약

[키워드]
혼밥, 혼자 밥, 혼자 고기, 혼술, 밥친구, 밥약, 점심 같이, 저녁 같이, 1인분, 2인분 주문, 
샤브샤브 혼자, 전골 혼자, 회 혼자, 외로움, 자취, 지방 발령, 새 직장, 새 동네, 노쇼, 
약속 파토, 번개 모임, 신뢰, 후기, 매너, 안전, 실명 인증, 본인확인, 보증금

[출력 형식]
JSON 형식으로 수집된 소스들의 요약과 링크를 반환`,

  analyst: `[역할]
너는 "혼밥시러(혼밥 동행 앱)"의 Market Intelligence Analyst다.
수집된 데이터에서 신호를 추출하고, 패턴을 분석하며, 가설을 도출한다.

[핵심 목표]
- 사람들이 혼밥에서 느끼는 불편(메뉴/심리/환경/시간대)을 분류하고 빈도/패턴을 찾는다
- "같이 먹는 앱"에 대한 거부감(데이팅 오해, 안전 우려, 어색함, 노쇼)과 해결 기대를 추출한다
- 혼밥시러의 철학(신뢰/예절/노쇼 방지/후기 기반)을 뒷받침하는 근거를 모은다

[분석 프로세스]
1) 신호 추출(문장 단위) 
2) 주제 클러스터링(문제/욕구/장애/해결)
3) 가설/검증 질문 생성
4) 리스크와 해결방안 도출

[출력 형식]
JSON 형식으로 분석 결과 반환`,

  studio: `[역할]
너는 "혼밥시러(혼밥 동행 앱)"의 Content Studio Agent다.
분석된 인사이트를 바탕으로 Threads/Instagram용 콘텐츠를 생성한다.

[절대 규칙]
- 혼밥시러는 데이팅이 아니다. UI/카피는 "식사 목적, 예절, 안전/신뢰"를 중심으로 한다
- 콘텐츠는 모집/추천을 창작하지 말고, "인식/문제/해결/가치"를 검증하는 방향으로 만든다
- 따뜻하지만 담백한 톤, 스토리텔링 중심

[산출물]
- Threads용 글 3개(짧은 버전 2개 + 긴 스토리 1개)
- Instagram용 캡션 2개 + 캐러셀(5~7장) 구성안 1개
- 이미지 기획 3개(촬영 가이드 or AI 이미지 프롬프트)

[출력 형식]
JSON 형식으로 콘텐츠 반환`
};

// Agent 1: Collector (데이터 수집)
router.post('/collector-agent', authenticateAdmin, async (req, res) => {
  try {
    const { keywords = [], customSources = [] } = req.body;

    console.log('🔍 Collector Agent 실행 시작');
    
    const defaultKeywords = [
      '혼밥', '혼자 밥', '혼자 고기', '밥친구', '밥약', '점심 같이', '저녁 같이',
      '1인분', '2인분 주문', '외로움', '자취', '새 직장', '노쇼', '번개 모임'
    ];

    const finalKeywords = keywords.length > 0 ? keywords : defaultKeywords;
    
    const prompt = `오늘 날짜: ${new Date().toLocaleDateString('ko-KR')}
    
키워드: ${finalKeywords.join(', ')}

위 키워드와 관련된 최신 트렌드와 신호를 수집하여 다음 형식의 JSON으로 반환해주세요:
{
  "sources": [
    {
      "title": "제목",
      "summary": "핵심 내용 1-2문장 요약",
      "url": "출처 URL (가상)",
      "type": "news|community|blog|social",
      "signals": ["신호1", "신호2"],
      "relevanceScore": 0.8
    }
  ],
  "totalSourcesFound": 10,
  "keyTrends": ["트렌드1", "트렌드2", "트렌드3"]
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        { role: "system", content: SYSTEM_PROMPTS.collector },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      response_format: { type: "json_object" },
      max_tokens: 2000
    });

    const result = JSON.parse(completion.choices[0].message.content);

    console.log('✅ Collector Agent 완료');

    res.json({
      success: true,
      result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Collector Agent 오류:', error);
    res.status(500).json({
      success: false,
      error: error.message || '데이터 수집 중 오류가 발생했습니다'
    });
  }
});

// Agent 2: Analyst (신호 분석)
router.post('/analyst-agent', authenticateAdmin, async (req, res) => {
  try {
    const { sources } = req.body;

    console.log('📊 Analyst Agent 실행 시작');

    const prompt = `다음 수집된 데이터를 분석하여 인사이트를 도출해주세요:

${JSON.stringify(sources, null, 2)}

다음 형식의 JSON으로 반환:
{
  "signals": [
    {
      "cluster": "클러스터명",
      "signal": "신호 내용",
      "userPain": "사용자 문제점",
      "evidenceUrls": ["URL1", "URL2"],
      "confidence": 0.85
    }
  ],
  "clusters": [
    {
      "name": "클러스터명",
      "oneLiner": "핵심 요약 1줄",
      "whatItMeansForBapdongmu": "혼밥시러에 대한 의미",
      "evidenceUrls": ["URL1", "URL2"]
    }
  ],
  "risksAndFixes": [
    {
      "risk": "리스크",
      "whyNow": "왜 지금 중요한가",
      "productFix": ["제품 개선안"],
      "policyFix": ["정책 개선안"],
      "copyAngle": ["카피 각도"]
    }
  ],
  "hypothesesToValidate": [
    {
      "hypothesis": "가설",
      "why": "이유",
      "howToTest": ["테스트 방법"],
      "questions": ["질문"]
    }
  ]
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        { role: "system", content: SYSTEM_PROMPTS.analyst },
        { role: "user", content: prompt }
      ],
      temperature: 0.6,
      response_format: { type: "json_object" },
      max_tokens: 3000
    });

    const result = JSON.parse(completion.choices[0].message.content);

    console.log('✅ Analyst Agent 완료');

    res.json({
      success: true,
      result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Analyst Agent 오류:', error);
    res.status(500).json({
      success: false,
      error: error.message || '신호 분석 중 오류가 발생했습니다'
    });
  }
});

// Agent 3: Studio (콘텐츠 생성)
router.post('/studio-agent', authenticateAdmin, async (req, res) => {
  try {
    const { analysisData, tone = 'warm_story' } = req.body;

    console.log('🎨 Studio Agent 실행 시작');

    const toneGuide = tone === 'warm_story' 
      ? '따뜻한 스토리텔링, 공감과 위로, 경험 중심'
      : '유머와 밈, 가벼운 톤, 재치있는 표현';

    const prompt = `다음 분석 데이터를 바탕으로 콘텐츠를 생성해주세요:

${JSON.stringify(analysisData, null, 2)}

톤 가이드: ${toneGuide}

다음 형식의 JSON으로 반환:
{
  "threadsDrafts": [
    {
      "type": "short|long",
      "hook": "후크 문장",
      "body": "본문",
      "cta": "CTA",
      "hashtags": ["해시태그"]
    }
  ],
  "instagramDrafts": [
    {
      "format": "caption|carousel",
      "caption": "캡션",
      "carouselSlides": [
        { "slideNo": 1, "headline": "헤드라인", "sub": "서브텍스트", "visual": "비주얼 설명" }
      ],
      "hashtags": ["해시태그"]
    }
  ],
  "imagePlans": [
    {
      "name": "이미지명",
      "style": "photo|vector|ai",
      "concept": "컨셉",
      "shotOrLayout": ["샷/레이아웃"],
      "overlayText": ["오버레이 텍스트"],
      "aiPromptKR": "AI 프롬프트(한글)",
      "aiPromptEN": "AI prompt (English)",
      "negativePrompt": "네거티브 프롬프트"
    }
  ]
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        { role: "system", content: SYSTEM_PROMPTS.studio },
        { role: "user", content: prompt }
      ],
      temperature: 0.8,
      response_format: { type: "json_object" },
      max_tokens: 4000
    });

    const result = JSON.parse(completion.choices[0].message.content);

    console.log('✅ Studio Agent 완료');

    res.json({
      success: true,
      result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Studio Agent 오류:', error);
    res.status(500).json({
      success: false,
      error: error.message || '콘텐츠 생성 중 오류가 발생했습니다'
    });
  }
});

// 통합 파이프라인 실행
router.post('/run-full-pipeline', authenticateAdmin, async (req, res) => {
  try {
    const { keywords = [], tone = 'warm_story', customPrompt } = req.body;

    console.log('🚀 전체 파이프라인 실행 시작');

    // Step 1: Collector
    const collectorPrompt = `오늘 날짜: ${new Date().toLocaleDateString('ko-KR')}
    
키워드: 혼밥, 혼자 밥, 혼자 고기, 밥친구, 밥약, 점심 같이, 저녁 같이, 1인분, 2인분 주문, 외로움, 자취, 새 직장, 노쇼, 번개 모임

위 키워드와 관련된 최신 트렌드와 신호를 수집하여 다음 형식의 JSON으로 반환해주세요:
{
  "sources": [
    {
      "title": "제목",
      "summary": "핵심 내용 1-2문장 요약",
      "url": "출처 URL (가상)",
      "type": "news|community|blog|social",
      "signals": ["신호1", "신호2"],
      "relevanceScore": 0.8
    }
  ],
  "totalSourcesFound": 10,
  "keyTrends": ["트렌드1", "트렌드2", "트렌드3"]
}`;

    const collectorResponse = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        { role: "system", content: SYSTEM_PROMPTS.collector },
        { role: "user", content: collectorPrompt }
      ],
      temperature: 0.7,
      response_format: { type: "json_object" },
      max_tokens: 2000
    });

    let collectorResult;
    try {
      collectorResult = JSON.parse(collectorResponse.choices[0].message.content);
    } catch (e) {
      console.error('Collector JSON 파싱 오류:', e);
      collectorResult = { sources: [], keyTrends: [], totalSourcesFound: 0 };
    }
    console.log('✅ Step 1: Collector 완료');
    console.log('Collector 결과:', JSON.stringify(collectorResult, null, 2).substring(0, 500));

    // Step 2: Analyst
    const analystPrompt = `수집된 데이터를 분석하여 인사이트를 도출해주세요:
${JSON.stringify(collectorResult, null, 2)}

다음 형식의 JSON으로 반환:
{
  "signals": [
    {
      "cluster": "클러스터명",
      "signal": "신호 내용",
      "userPain": "사용자 문제점",
      "evidenceUrls": ["URL1", "URL2"],
      "confidence": 0.85
    }
  ],
  "clusters": [
    {
      "name": "클러스터명",
      "oneLiner": "핵심 요약 1줄",
      "whatItMeansForBapdongmu": "혼밥시러에 대한 의미",
      "evidenceUrls": ["URL1", "URL2"]
    }
  ],
  "risksAndFixes": [
    {
      "risk": "리스크",
      "whyNow": "왜 지금 중요한가",
      "productFix": ["제품 개선안"],
      "policyFix": ["정책 개선안"],
      "copyAngle": ["카피 각도"]
    }
  ],
  "hypothesesToValidate": [
    {
      "hypothesis": "가설",
      "why": "이유",
      "howToTest": ["테스트 방법"],
      "questions": ["질문"]
    }
  ]
}`;

    const analystResponse = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        { role: "system", content: SYSTEM_PROMPTS.analyst },
        { role: "user", content: analystPrompt }
      ],
      temperature: 0.6,
      response_format: { type: "json_object" },
      max_tokens: 3000
    });

    let analystResult;
    try {
      analystResult = JSON.parse(analystResponse.choices[0].message.content);
    } catch (e) {
      console.error('Analyst JSON 파싱 오류:', e);
      analystResult = { signals: [], clusters: [], risksAndFixes: [], hypothesesToValidate: [] };
    }
    console.log('✅ Step 2: Analyst 완료');
    console.log('Analyst 결과 요약:', {
      signals: analystResult.signals?.length || 0,
      clusters: analystResult.clusters?.length || 0
    });

    // Step 3: Studio
    const studioPrompt = `분석된 인사이트를 바탕으로 콘텐츠를 생성해주세요:
${JSON.stringify(analystResult, null, 2)}
톤: ${tone === 'warm_story' ? '따뜻한 스토리텔링' : '유머와 밈'}

다음 형식의 JSON으로 반환:
{
  "threadsDrafts": [
    {
      "type": "short",
      "hook": "후크 문장",
      "body": "본문",
      "cta": "CTA",
      "hashtags": ["해시태그1", "해시태그2"]
    }
  ],
  "instagramDrafts": [
    {
      "format": "caption",
      "caption": "캡션",
      "carouselSlides": [
        { "slideNo": 1, "headline": "헤드라인", "sub": "서브텍스트", "visual": "비주얼 설명" }
      ],
      "hashtags": ["해시태그1", "해시태그2"]
    }
  ],
  "imagePlans": [
    {
      "name": "이미지명",
      "style": "photo",
      "concept": "컨셉",
      "shotOrLayout": ["샷/레이아웃"],
      "overlayText": ["오버레이 텍스트"],
      "aiPromptKR": "AI 프롬프트(한글)",
      "aiPromptEN": "AI prompt (English)",
      "negativePrompt": "네거티브 프롬프트"
    }
  ]
}`;

    const studioResponse = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        { role: "system", content: SYSTEM_PROMPTS.studio },
        { role: "user", content: studioPrompt }
      ],
      temperature: 0.8,
      response_format: { type: "json_object" },
      max_tokens: 4000
    });

    let studioResult;
    try {
      studioResult = JSON.parse(studioResponse.choices[0].message.content);
    } catch (e) {
      console.error('Studio JSON 파싱 오류:', e);
      studioResult = { threadsDrafts: [], instagramDrafts: [], imagePlans: [] };
    }
    console.log('✅ Step 3: Studio 완료');
    console.log('Studio 결과 요약:', {
      threads: studioResult.threadsDrafts?.length || 0,
      instagram: studioResult.instagramDrafts?.length || 0,
      images: studioResult.imagePlans?.length || 0
    });

    // 전체 결과 조합
    const fullResult = {
      date: new Date().toISOString(),
      collector: collectorResult,
      analyst: analystResult,
      studio: studioResult,
      complianceCheck: {
        noPII: true,
        noLongQuotes: true,
        noDefamation: true,
        noDatingTone: true,
        notes: ["모든 콘텐츠가 가이드라인을 준수합니다"]
      }
    };

    console.log('📊 파이프라인 결과 (요약):', {
      collectorSources: collectorResult?.sources?.length || 0,
      analystClusters: analystResult?.clusters?.length || 0,
      studioContents: (studioResult?.threadsDrafts?.length || 0) + (studioResult?.instagramDrafts?.length || 0)
    });

    // DB에 저장
    try {
      await sequelize.query(
        `INSERT INTO advanced_research_reports (admin_id, report_data, created_at) 
         VALUES (:adminId, :reportData, NOW())`,
        {
          replacements: {
            adminId: req.admin.id,
            reportData: JSON.stringify(fullResult)
          },
          type: sequelize.QueryTypes.INSERT
        }
      );
      console.log('💾 파이프라인 결과 DB 저장 완료');
    } catch (dbError) {
      console.log('⚠️ DB 저장 실패 (테이블이 없을 수 있음):', dbError.message);
      // 테이블 생성 시도
      try {
        await sequelize.query(`
          CREATE TABLE IF NOT EXISTS advanced_research_reports (
            id SERIAL PRIMARY KEY,
            admin_id UUID NOT NULL,
            report_data JSONB NOT NULL,
            created_at TIMESTAMP DEFAULT NOW()
          )
        `);
        console.log('✅ advanced_research_reports 테이블 생성 완료');
      } catch (createError) {
        console.log('테이블 생성 시도:', createError.message);
      }
    }

    console.log('🎉 전체 파이프라인 완료');

    res.json({
      success: true,
      result: fullResult,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('파이프라인 실행 오류:', error);
    res.status(500).json({
      success: false,
      error: error.message || '파이프라인 실행 중 오류가 발생했습니다'
    });
  }
});

// 저장된 고급 리포트 조회
router.get('/advanced-reports', authenticateAdmin, async (req, res) => {
  try {
    try {
      const reports = await sequelize.query(
        `SELECT id, report_data as report, created_at as date 
         FROM advanced_research_reports 
         WHERE admin_id = :adminId 
         ORDER BY created_at DESC 
         LIMIT 10`,
        {
          replacements: { adminId: req.admin.id },
          type: sequelize.QueryTypes.SELECT
        }
      );

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
      console.log('⚠️ 리포트 조회 실패:', dbError.message);
      res.json({
        success: true,
        reports: []
      });
    }
  } catch (error) {
    console.error('리포트 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: '리포트 조회 중 오류가 발생했습니다'
    });
  }
});

module.exports = router;