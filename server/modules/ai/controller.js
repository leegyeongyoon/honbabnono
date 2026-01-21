const { OpenAI } = require('openai');
const pool = require('../../config/database');
const aiSearchConfig = require('../../config/aiSearchConfig');

// OpenAI 클라이언트 초기화
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// AI 검색
exports.aiSearch = async (req, res) => {
  try {
    const { query, filters = {} } = req.body;

    if (!query || query.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: '검색어를 입력해주세요.'
      });
    }

    console.log('🤖 AI 검색 요청:', { query, filters });

    // AI를 사용해 검색어 의도 파악
    const intentPrompt = `
      사용자가 음식 모임 검색 앱에서 다음과 같이 검색했습니다: "${query}"

      다음 정보를 JSON 형식으로 추출해주세요:
      - category: 음식 카테고리 (한식, 중식, 일식, 양식, 동남아, 카페/디저트, 술집, 기타 중 하나 또는 null)
      - location: 위치/지역 (있으면 추출, 없으면 null)
      - time: 시간대 선호 (점심, 저녁, 아침 등 또는 null)
      - priceRange: 가격대 (저렴, 보통, 비싼 또는 null)
      - keywords: 핵심 키워드 배열

      JSON만 반환해주세요.
    `;

    let parsedIntent = {
      category: null,
      location: null,
      keywords: [query]
    };

    try {
      const intentResponse = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: intentPrompt }],
        max_tokens: 200,
        temperature: 0.3
      });

      const intentText = intentResponse.choices[0].message.content;
      parsedIntent = JSON.parse(intentText);
    } catch (aiError) {
      console.log('AI 의도 파싱 실패, 기본 검색 진행:', aiError.message);
    }

    // 데이터베이스에서 모임 검색
    let whereConditions = ["m.status IN ('모집중', '모집완료')"];
    let params = [];
    let paramIndex = 1;

    // 카테고리 필터
    if (parsedIntent.category) {
      whereConditions.push(`m.category = $${paramIndex}`);
      params.push(parsedIntent.category);
      paramIndex++;
    }

    // 위치 필터
    if (parsedIntent.location) {
      whereConditions.push(`(m.location ILIKE $${paramIndex} OR m.address ILIKE $${paramIndex})`);
      params.push(`%${parsedIntent.location}%`);
      paramIndex++;
    }

    // 제목/설명 키워드 검색
    if (parsedIntent.keywords && parsedIntent.keywords.length > 0) {
      const keywordConditions = parsedIntent.keywords.map((kw, idx) => {
        params.push(`%${kw}%`);
        return `(m.title ILIKE $${paramIndex + idx} OR m.description ILIKE $${paramIndex + idx})`;
      });
      whereConditions.push(`(${keywordConditions.join(' OR ')})`);
      paramIndex += parsedIntent.keywords.length;
    }

    const meetupsResult = await pool.query(`
      SELECT
        m.*,
        u.name as host_name,
        u.profile_image as host_profile_image,
        u.rating as host_rating
      FROM meetups m
      LEFT JOIN users u ON m.host_id = u.id
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY m.date ASC, m.time ASC
      LIMIT 20
    `, params);

    console.log(`✅ AI 검색 완료: ${meetupsResult.rows.length}개 결과`);

    res.json({
      success: true,
      query,
      intent: parsedIntent,
      meetups: meetupsResult.rows,
      total: meetupsResult.rows.length
    });

  } catch (error) {
    console.error('AI 검색 오류:', error);
    res.status(500).json({
      success: false,
      error: 'AI 검색 중 오류가 발생했습니다.'
    });
  }
};

// 챗봇
exports.chatbot = async (req, res) => {
  try {
    const { message, context = [] } = req.body;
    const userId = req.user.userId;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: '메시지를 입력해주세요.'
      });
    }

    console.log('🤖 챗봇 요청:', { userId, message });

    const systemPrompt = `
      당신은 '혼밥시러' 앱의 친절한 AI 어시스턴트입니다.
      사용자들이 음식 모임을 찾고 만드는 것을 도와줍니다.

      주요 기능:
      - 모임 검색 도움
      - 앱 사용법 안내
      - 맛집 추천
      - 모임 참여 관련 질문 답변

      응답은 친근하고 도움이 되는 톤으로, 한국어로 해주세요.
      응답은 간결하게 2-3문장으로 해주세요.
    `;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...context.slice(-5), // 최근 5개 대화 컨텍스트
      { role: 'user', content: message }
    ];

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages,
      max_tokens: 300,
      temperature: 0.7
    });

    const reply = response.choices[0].message.content;

    res.json({
      success: true,
      reply,
      usage: response.usage
    });

  } catch (error) {
    console.error('챗봇 오류:', error);
    res.status(500).json({
      success: false,
      error: '챗봇 응답 생성 중 오류가 발생했습니다.'
    });
  }
};

// 모임 추천
exports.recommendMeetups = async (req, res) => {
  try {
    const userId = req.user.userId;

    // 사용자의 참여 이력 조회
    const historyResult = await pool.query(`
      SELECT DISTINCT m.category
      FROM meetup_participants mp
      JOIN meetups m ON mp.meetup_id = m.id
      WHERE mp.user_id = $1
      ORDER BY COUNT(*) DESC
      LIMIT 3
    `, [userId]);

    const preferredCategories = historyResult.rows.map(r => r.category);

    // 추천 모임 조회
    let whereConditions = ["m.status = '모집중'", "m.host_id != $1"];
    let params = [userId];
    let paramIndex = 2;

    if (preferredCategories.length > 0) {
      whereConditions.push(`m.category = ANY($${paramIndex})`);
      params.push(preferredCategories);
      paramIndex++;
    }

    // 이미 참여한 모임 제외
    whereConditions.push(`
      m.id NOT IN (
        SELECT meetup_id FROM meetup_participants WHERE user_id = $1
      )
    `);

    const recommendResult = await pool.query(`
      SELECT
        m.*,
        u.name as host_name,
        u.profile_image as host_profile_image,
        u.rating as host_rating
      FROM meetups m
      LEFT JOIN users u ON m.host_id = u.id
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY m.date ASC
      LIMIT 10
    `, params);

    res.json({
      success: true,
      recommendations: recommendResult.rows,
      basedOn: preferredCategories.length > 0 ? preferredCategories : ['새로운 모임']
    });

  } catch (error) {
    console.error('모임 추천 오류:', error);
    res.status(500).json({
      success: false,
      error: '모임 추천 중 오류가 발생했습니다.'
    });
  }
};
