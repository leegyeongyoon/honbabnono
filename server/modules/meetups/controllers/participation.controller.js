/**
 * 모임 참가 관리 컨트롤러
 */
const pool = require('../../../config/database');
const logger = require('../../../config/logger');
const { updateBabalScore } = require('../../../utils/babalScore');
const {
  validateMeetupExists,
  validateHostPermission,
  validateMeetupStatus,
} = require('../helpers/validation.helper');
const {
  notifyMeetupCancelled,
  refundDepositsForMeetup,
  recordHostCancellationAndCheckPenalty,
} = require('../helpers/notification.helper');

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

    // 성별/나이 필수 필터 검증
    const userResult = await pool.query(
      'SELECT gender, birth_date FROM users WHERE id = $1',
      [userId]
    );
    const user = userResult.rows[0];

    // 성별 제한 검증
    const openGenderValues = ['무관', '상관없음', '혼성'];
    if (meetup.gender_preference && !openGenderValues.includes(meetup.gender_preference)) {
      if (!user.gender) {
        return res.status(400).json({
          success: false,
          error: '프로필에서 성별을 설정해야 이 약속에 참가할 수 있습니다.',
        });
      }
      const genderMap = { male: '남성', female: '여성' };
      const userGenderLabel = genderMap[user.gender] || user.gender;
      const requiredGender = meetup.gender_preference.replace('만', '');
      if (requiredGender !== userGenderLabel && requiredGender !== user.gender) {
        return res.status(400).json({
          success: false,
          error: `이 약속은 ${meetup.gender_preference} 전용입니다.`,
        });
      }
    }

    // 나이 제한 검증
    const openAgeValues = ['무관', '상관없음', '전연령'];
    if (meetup.age_range && !openAgeValues.includes(meetup.age_range)) {
      if (!user.birth_date) {
        return res.status(400).json({
          success: false,
          error: '프로필에서 생년월일을 설정해야 이 약속에 참가할 수 있습니다.',
        });
      }
      const today = new Date();
      const birth = new Date(user.birth_date);
      let age = today.getFullYear() - birth.getFullYear();
      const monthDiff = today.getMonth() - birth.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
      }

      // age_range 파싱: "20대", "30대", "20-30", "20대~30대" 등
      const rangeStr = meetup.age_range;
      let minAge = 0;
      let maxAge = 99;

      const decadeMatch = rangeStr.match(/(\d+)대/);
      const rangeMatch = rangeStr.match(/(\d+)\s*[-~]\s*(\d+)/);

      if (rangeMatch) {
        minAge = parseInt(rangeMatch[1]);
        maxAge = parseInt(rangeMatch[2]) + 9; // "20-30" → 20~39
      } else if (decadeMatch) {
        minAge = parseInt(decadeMatch[1]);
        maxAge = minAge + 9; // "20대" → 20~29
      }

      if (age < minAge || age > maxAge) {
        return res.status(400).json({
          success: false,
          error: `이 약속은 ${meetup.age_range} 대상입니다. (현재 나이: ${age}세)`,
        });
      }
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

    // 트랜잭션으로 정원 재확인 + 참가자 등록 + 인원수 증가를 원자적으로 처리
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 정원 재확인 (FOR UPDATE로 race condition 방지)
      const capacityCheck = await client.query(
        'SELECT current_participants, max_participants FROM meetups WHERE id = $1 FOR UPDATE',
        [id]
      );
      if (capacityCheck.rows.length === 0 || capacityCheck.rows[0].current_participants >= capacityCheck.rows[0].max_participants) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          error: '약속 정원이 가득 찼습니다.',
        });
      }

      // 참가 신청
      await client.query(
        `INSERT INTO meetup_participants (id, meetup_id, user_id, status, joined_at, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, $2, '참가승인', NOW(), NOW(), NOW())`,
        [id, userId]
      );

      // current_participants 증가
      await client.query(
        'UPDATE meetups SET current_participants = current_participants + 1 WHERE id = $1',
        [id]
      );

      await client.query('COMMIT');
    } catch (txError) {
      await client.query('ROLLBACK');
      throw txError;
    } finally {
      client.release();
    }

    // 채팅방 확인 및 생성
    let chatRoomId;
    const existingRoom = await pool.query(
      'SELECT id FROM chat_rooms WHERE "meetupId" = $1',
      [id]
    );

    if (existingRoom.rows.length > 0) {
      chatRoomId = existingRoom.rows[0].id;
    } else {
      // 채팅방 생성
      const roomResult = await pool.query(`
        INSERT INTO chat_rooms (
          "meetupId", title, type, "createdBy", "isActive",
          "createdAt", "updatedAt"
        ) VALUES ($1, $2, 'meetup', $3, true, NOW(), NOW())
        RETURNING id
      `, [id, meetup.title, meetup.host_id]);
      chatRoomId = roomResult.rows[0].id;

      // 호스트를 채팅방에 추가
      await pool.query(`
        INSERT INTO chat_participants (
          "chatRoomId", "userId", "joinedAt"
        ) VALUES ($1, $2, NOW())
      `, [chatRoomId, meetup.host_id]);
    }

    // 참가자를 채팅방에 추가
    const alreadyInChat = await pool.query(
      'SELECT id FROM chat_participants WHERE "chatRoomId" = $1 AND "userId" = $2',
      [chatRoomId, userId]
    );
    if (alreadyInChat.rows.length === 0) {
      await pool.query(`
        INSERT INTO chat_participants (
          "chatRoomId", "userId", "joinedAt"
        ) VALUES ($1, $2, NOW())
      `, [chatRoomId, userId]);
    }

    res.json({
      success: true,
      message: '참가가 완료되었습니다.',
      chatRoomId,
    });
  } catch (error) {
    logger.error('모임 참가 오류:', error);
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

      // 참가자 전원에게 취소 알림 발송
      notifyMeetupCancelled(meetup, 'host')
        .catch(err => logger.error('모임 취소 알림 발송 오류:', err));

      // 약속금 자동 환불 (비동기)
      refundDepositsForMeetup(id)
        .catch(err => logger.error('모임 취소 약속금 환불 오류:', err));

      // 호스트 취소 이력 기록 및 반복 취소 패널티 확인
      recordHostCancellationAndCheckPenalty(userId, id)
        .catch(err => logger.error('호스트 취소 이력 기록 오류:', err));

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

    // 24시간 내 취소 시 밥알지수 패널티
    if (wasApproved && meetup.date && meetup.time) {
      const dateStr = typeof meetup.date === 'string' ? meetup.date : meetup.date.toISOString().split('T')[0];
      const meetupDateTime = new Date(`${dateStr}T${meetup.time}`);
      const hoursUntil = (meetupDateTime - new Date()) / (1000 * 60 * 60);
      if (hoursUntil >= 0 && hoursUntil <= 24) {
        await updateBabalScore(userId, 'LATE_CANCEL', { meetupId: id }).catch(
          (err) => logger.error('밥알지수 취소 패널티 오류:', err)
        );
      }
    }

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
    logger.error('모임 참가 취소 오류:', error);
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
    logger.error('참가자 목록 조회 오류:', error);
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
    logger.error('참가자 상태 변경 오류:', error);
    res.status(500).json({
      success: false,
      message: '참가자 상태 변경에 실패했습니다.',
    });
  }
};
