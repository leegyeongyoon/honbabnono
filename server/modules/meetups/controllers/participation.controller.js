/**
 * 모임 참가 관리 컨트롤러
 */
const pool = require('../../../config/database');
const {
  validateMeetupExists,
  validateHostPermission,
  validateMeetupStatus,
} = require('../helpers/validation.helper');

/**
 * 모임 참가 신청
 */
exports.joinMeetup = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const { meetup, error } = await validateMeetupExists(id);
    if (error) {
      return res.status(404).json({ success: false, error });
    }

    if (meetup.status !== '모집중') {
      return res.status(400).json({
        success: false,
        error: '현재 참가할 수 없는 약속입니다.',
      });
    }

    if (meetup.current_participants >= meetup.max_participants) {
      return res.status(400).json({
        success: false,
        error: '약속 정원이 가득 찼습니다.',
      });
    }

    // 이미 참가 여부 확인
    const existingResult = await pool.query(
      'SELECT * FROM meetup_participants WHERE meetup_id = $1 AND user_id = $2',
      [id, userId]
    );

    if (existingResult.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: '이미 참가 신청한 약속입니다.',
      });
    }

    // 참가 신청
    await pool.query(
      `
      INSERT INTO meetup_participants (meetup_id, user_id, status, joined_at)
      VALUES ($1, $2, '참가신청', NOW())
    `,
      [id, userId]
    );

    res.json({
      success: true,
      message: '참가 신청이 완료되었습니다.',
    });
  } catch (error) {
    console.error('모임 참가 오류:', error);
    res.status(500).json({
      success: false,
      message: '약속 참가에 실패했습니다.',
    });
  }
};

/**
 * 모임 참가 취소/나가기
 */
exports.leaveMeetup = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // 호스트인 경우 모임 취소 처리
    const { meetup, error: meetupError } = await validateMeetupExists(id);
    if (meetupError) {
      return res.status(404).json({ success: false, error: meetupError });
    }

    if (meetup.host_id === userId) {
      // 호스트가 나가면 모임 취소
      await pool.query(
        `UPDATE meetups SET status = '취소', updated_at = NOW() WHERE id = $1`,
        [id]
      );
      return res.json({
        success: true,
        message: '약속이 취소되었습니다.',
        isHostCancellation: true,
      });
    }

    // 먼저 참가자 상태 확인
    const participantResult = await pool.query(
      'SELECT status FROM meetup_participants WHERE meetup_id = $1 AND user_id = $2',
      [id, userId]
    );

    if (participantResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '참가 신청을 찾을 수 없습니다.',
      });
    }

    const wasApproved = participantResult.rows[0].status === '참가승인';

    // 참가자 삭제
    const result = await pool.query(
      'DELETE FROM meetup_participants WHERE meetup_id = $1 AND user_id = $2 RETURNING *',
      [id, userId]
    );

    // 승인된 참가자였을 경우에만 참가자 수 감소
    if (wasApproved) {
      await pool.query(
        `
        UPDATE meetups
        SET current_participants = current_participants - 1,
            updated_at = NOW()
        WHERE id = $1 AND current_participants > 0
      `,
        [id]
      );
    }

    res.json({
      success: true,
      message: '참가가 취소되었습니다.',
    });
  } catch (error) {
    console.error('모임 참가 취소 오류:', error);
    res.status(500).json({
      success: false,
      message: '참가 취소에 실패했습니다.',
    });
  }
};

/**
 * 참가자 목록 조회
 */
exports.getParticipants = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      SELECT
        mp.user_id as id,
        mp.status,
        mp.joined_at,
        u.name,
        u.profile_image,
        u.rating,
        u.babal_score
      FROM meetup_participants mp
      JOIN users u ON mp.user_id = u.id
      WHERE mp.meetup_id = $1
      ORDER BY mp.joined_at
    `,
      [id]
    );

    res.json({
      success: true,
      participants: result.rows.map((row) => ({
        id: row.id,
        name: row.name,
        profileImage: row.profile_image,
        rating: row.rating,
        babAlScore: row.babal_score,
        status: row.status,
        joinedAt: row.joined_at,
      })),
    });
  } catch (error) {
    console.error('참가자 목록 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '참가자 목록 조회에 실패했습니다.',
    });
  }
};

/**
 * 참가자 상태 변경 (호스트 전용)
 */
exports.updateParticipantStatus = async (req, res) => {
  try {
    const { id, participantId } = req.params;
    const userId = req.user.userId;
    const { status } = req.body;

    const { isHost, error } = await validateHostPermission(id, userId);
    if (error) {
      const statusCode = error.includes('찾을 수 없') ? 404 : 403;
      return res.status(statusCode).json({ success: false, error });
    }

    const validStatuses = ['참가승인', '참가거절', '참가신청'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: '유효하지 않은 상태입니다.',
      });
    }

    // 이전 상태 확인
    const prevResult = await pool.query(
      'SELECT status FROM meetup_participants WHERE meetup_id = $1 AND user_id = $2',
      [id, participantId]
    );

    if (prevResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '참가자를 찾을 수 없습니다.',
      });
    }

    const prevStatus = prevResult.rows[0].status;

    // 상태 변경
    const result = await pool.query(
      `
      UPDATE meetup_participants
      SET status = $1, updated_at = NOW()
      WHERE meetup_id = $2 AND user_id = $3
      RETURNING *
    `,
      [status, id, participantId]
    );

    // 참가자 수 조정 (이전 상태와 새 상태 비교)
    const wasApproved = prevStatus === '참가승인';
    const isNowApproved = status === '참가승인';

    if (!wasApproved && isNowApproved) {
      // 승인되지 않았다가 승인됨 → 참가자 수 증가
      await pool.query(
        `
        UPDATE meetups
        SET current_participants = current_participants + 1,
            updated_at = NOW()
        WHERE id = $1
      `,
        [id]
      );
    } else if (wasApproved && !isNowApproved) {
      // 승인이었다가 거절/대기로 변경 → 참가자 수 감소
      await pool.query(
        `
        UPDATE meetups
        SET current_participants = current_participants - 1,
            updated_at = NOW()
        WHERE id = $1 AND current_participants > 0
      `,
        [id]
      );
    }

    res.json({
      success: true,
      message: '참가자 상태가 변경되었습니다.',
      participant: result.rows[0],
    });
  } catch (error) {
    console.error('참가자 상태 변경 오류:', error);
    res.status(500).json({
      success: false,
      message: '참가자 상태 변경에 실패했습니다.',
    });
  }
};
