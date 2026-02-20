/**
 * 기타 모임 관련 기능 컨트롤러
 */
const pool = require('../../../config/database');
const { validateMeetupExists, validateHostPermission } = require('../helpers/validation.helper');

/**
 * 최근 본 글 추가 (조회수 기록)
 */
exports.addView = async (req, res) => {
  try {
    const { id: meetupId } = req.params;
    const userId = req.user.userId;

    // 모임 존재 확인
    const { error } = await validateMeetupExists(meetupId);
    if (error) {
      return res.status(404).json({ success: false, message: error });
    }

    // 최근 본 글에 추가 (중복 시 시간만 업데이트)
    await pool.query(
      'INSERT INTO user_recent_views (user_id, meetup_id) VALUES ($1, $2) ON CONFLICT (user_id, meetup_id) DO UPDATE SET viewed_at = NOW()',
      [userId, meetupId]
    );

    res.json({
      success: true,
      message: '최근 본 글에 추가되었습니다.',
    });
  } catch (error) {
    console.error('최근 본 글 추가 오류:', error);
    res.status(500).json({
      success: false,
      message: '최근 본 글 추가 중 오류가 발생했습니다.',
    });
  }
};

/**
 * 찜 상태 확인
 */
exports.checkWishlist = async (req, res) => {
  try {
    const { id: meetupId } = req.params;
    const userId = req.user.userId;

    const result = await pool.query(
      'SELECT id FROM meetup_wishlists WHERE user_id = $1 AND meetup_id = $2',
      [userId, meetupId]
    );

    res.json({
      success: true,
      data: {
        isWishlisted: result.rows.length > 0,
      },
    });
  } catch (error) {
    console.error('찜 상태 확인 오류:', error);
    res.status(500).json({
      success: false,
      message: '찜 상태 확인 중 오류가 발생했습니다.',
    });
  }
};

/**
 * 찜하기 추가
 */
exports.addWishlist = async (req, res) => {
  try {
    const { id: meetupId } = req.params;
    const userId = req.user.userId;

    // 모임 존재 확인
    const { error } = await validateMeetupExists(meetupId);
    if (error) {
      return res.status(404).json({ success: false, message: error });
    }

    // 이미 찜했는지 확인
    const existingResult = await pool.query(
      'SELECT id FROM meetup_wishlists WHERE user_id = $1 AND meetup_id = $2',
      [userId, meetupId]
    );

    if (existingResult.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: '이미 찜한 약속입니다.',
      });
    }

    await pool.query('INSERT INTO meetup_wishlists (user_id, meetup_id) VALUES ($1, $2)', [
      userId,
      meetupId,
    ]);

    res.json({
      success: true,
      message: '찜하기가 완료되었습니다.',
    });
  } catch (error) {
    console.error('찜하기 추가 오류:', error);
    res.status(500).json({
      success: false,
      message: '찜하기 추가 중 오류가 발생했습니다.',
    });
  }
};

/**
 * 찜하기 취소
 */
exports.removeWishlist = async (req, res) => {
  try {
    const { id: meetupId } = req.params;
    const userId = req.user.userId;

    await pool.query('DELETE FROM meetup_wishlists WHERE user_id = $1 AND meetup_id = $2', [
      userId,
      meetupId,
    ]);

    res.json({
      success: true,
      message: '찜하기가 취소되었습니다.',
    });
  } catch (error) {
    console.error('찜하기 취소 오류:', error);
    res.status(500).json({
      success: false,
      message: '찜하기 취소 중 오류가 발생했습니다.',
    });
  }
};

/**
 * 모임 확정
 */
exports.confirmMeetup = async (req, res) => {
  try {
    const { id: meetupId } = req.params;
    const userId = req.user.userId;

    const { meetup, error } = await validateHostPermission(meetupId, userId);
    if (error) {
      const status = error.includes('찾을 수 없') ? 404 : 403;
      return res.status(status).json({ success: false, error });
    }

    if (meetup.status !== '모집중' && meetup.status !== '모집완료') {
      return res.status(400).json({
        success: false,
        error: '모집중 또는 모집완료 상태에서만 확정할 수 있습니다.',
      });
    }

    // 모임 확정 처리
    await pool.query(
      `UPDATE meetups SET status = '진행중', updated_at = NOW() WHERE id = $1`,
      [meetupId]
    );

    res.json({
      success: true,
      message: '약속이 확정되었습니다.',
    });
  } catch (error) {
    console.error('모임 확정 오류:', error);
    res.status(500).json({
      success: false,
      message: '약속 확정에 실패했습니다.',
    });
  }
};

/**
 * 노쇼 패널티 적용
 */
exports.applyNoShowPenalties = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id: meetupId } = req.params;
    const userId = req.user.userId;

    const { error } = await validateHostPermission(meetupId, userId);
    if (error) {
      const status = error.includes('찾을 수 없') ? 404 : 403;
      return res.status(status).json({ success: false, error });
    }

    await client.query('BEGIN');

    // 출석하지 않은 참가자 조회
    const noShowsResult = await client.query(
      `
      SELECT mp.user_id, u.name, u.bab_al_score
      FROM meetup_participants mp
      JOIN users u ON mp.user_id = u.id
      WHERE mp.meetup_id = $1
        AND mp.status = '참가승인'
        AND mp.attended IS NOT TRUE
        AND mp.user_id != $2
    `,
      [meetupId, userId]
    );

    const penalties = [];
    for (const noShow of noShowsResult.rows) {
      // 밥알 점수 차감
      const newScore = Math.max(0, (noShow.bab_al_score || 50) - 10);
      await client.query('UPDATE users SET bab_al_score = $1, updated_at = NOW() WHERE id = $2', [
        newScore,
        noShow.user_id,
      ]);

      // 노쇼 기록
      await client.query(
        `
        INSERT INTO user_penalties (user_id, meetup_id, penalty_type, penalty_amount, reason, created_at)
        VALUES ($1, $2, 'no_show', 10, '약속 노쇼', NOW())
      `,
        [noShow.user_id, meetupId]
      );

      penalties.push({
        userId: noShow.user_id,
        name: noShow.name,
        previousScore: noShow.bab_al_score,
        newScore,
      });
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      message: `${penalties.length}명에게 노쇼 패널티가 적용되었습니다.`,
      penalties,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('노쇼 패널티 적용 오류:', error);
    res.status(500).json({
      success: false,
      message: '노쇼 패널티 적용에 실패했습니다.',
    });
  } finally {
    client.release();
  }
};

/**
 * 진행 상황 확인
 */
exports.progressCheck = async (req, res) => {
  try {
    const { id: meetupId } = req.params;
    const userId = req.user.userId;

    const meetupResult = await pool.query(
      `
      SELECT
        m.id, m.status, m.date, m.time,
        mp.attended,
        EXISTS(SELECT 1 FROM reviews WHERE meetup_id = m.id AND reviewer_id = $2) as has_reviewed
      FROM meetups m
      LEFT JOIN meetup_participants mp ON m.id = mp.meetup_id AND mp.user_id = $2
      WHERE m.id = $1
    `,
      [meetupId, userId]
    );

    if (meetupResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '약속을 찾을 수 없습니다.',
      });
    }

    const meetup = meetupResult.rows[0];

    res.json({
      success: true,
      data: {
        meetupId: meetup.id,
        status: meetup.status,
        attended: meetup.attended,
        hasReviewed: meetup.has_reviewed,
        canReview: meetup.attended && !meetup.has_reviewed,
      },
    });
  } catch (error) {
    console.error('진행 상황 확인 오류:', error);
    res.status(500).json({
      success: false,
      message: '진행 상황 확인에 실패했습니다.',
    });
  }
};

/**
 * 진행 상황 응답
 */
exports.progressResponse = async (req, res) => {
  try {
    const { id: meetupId } = req.params;
    const userId = req.user.userId;
    const { response } = req.body;

    await pool.query(
      `
      UPDATE meetup_participants
      SET progress_response = $1, progress_responded_at = NOW()
      WHERE meetup_id = $2 AND user_id = $3
    `,
      [response, meetupId, userId]
    );

    res.json({
      success: true,
      message: '응답이 기록되었습니다.',
    });
  } catch (error) {
    console.error('진행 상황 응답 오류:', error);
    res.status(500).json({
      success: false,
      message: '응답 기록에 실패했습니다.',
    });
  }
};

/**
 * 확정 가능한 참가자 목록 조회
 */
exports.getConfirmableParticipants = async (req, res) => {
  try {
    const { id: meetupId } = req.params;
    const userId = req.user.userId;

    const { isHost, error } = await validateHostPermission(meetupId, userId);
    if (error) {
      const status = error.includes('찾을 수 없') ? 404 : 403;
      return res.status(status).json({ success: false, error });
    }

    const result = await pool.query(
      `
      SELECT
        mp.user_id as id,
        u.name,
        u.profile_image,
        u.bab_al_score,
        mp.status,
        mp.joined_at
      FROM meetup_participants mp
      JOIN users u ON mp.user_id = u.id
      WHERE mp.meetup_id = $1 AND mp.status = '참가대기'
      ORDER BY mp.joined_at
    `,
      [meetupId]
    );

    res.json({
      success: true,
      participants: result.rows.map((p) => ({
        id: p.id,
        name: p.name,
        profileImage: p.profile_image,
        babAlScore: p.bab_al_score,
        status: p.status,
        joinedAt: p.joined_at,
      })),
    });
  } catch (error) {
    console.error('확정 가능한 참가자 목록 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '참가자 목록 조회에 실패했습니다.',
    });
  }
};
