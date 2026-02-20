/**
 * 모임 CRUD 컨트롤러
 */
const pool = require('../../../config/database');
const { validateHostPermission } = require('../helpers/validation.helper');

/**
 * 모임 상세 조회
 */
exports.getMeetupById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      SELECT m.*,
        u.id as host_id, u.name as host_name,
        u.profile_image as host_profile_image, u.rating as host_rating
      FROM meetups m
      LEFT JOIN users u ON m.host_id = u.id
      WHERE m.id = $1
    `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '약속을 찾을 수 없습니다.',
      });
    }

    const meetup = result.rows[0];

    const participantsResult = await pool.query(
      `
      SELECT mp.*, u.name, u.profile_image, u.rating
      FROM meetup_participants mp
      JOIN users u ON mp.user_id = u.id
      WHERE mp.meetup_id = $1
      ORDER BY mp.joined_at
    `,
      [id]
    );

    res.json({
      success: true,
      meetup: {
        ...meetup,
        host: {
          id: meetup.host_id,
          name: meetup.host_name,
          profileImage: meetup.host_profile_image,
          rating: meetup.host_rating,
        },
        participants: participantsResult.rows,
      },
    });
  } catch (error) {
    console.error('모임 상세 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '약속 조회에 실패했습니다.',
    });
  }
};

/**
 * 모임 생성
 */
exports.createMeetup = async (req, res) => {
  try {
    const userId = req.user.userId;
    const {
      title,
      description,
      category,
      location,
      address,
      latitude,
      longitude,
      date,
      time,
      maxParticipants,
      priceRange,
      ageRange,
      genderPreference,
      image,
    } = req.body;

    const result = await pool.query(
      `
      INSERT INTO meetups (
        host_id, title, description, category, location, address,
        latitude, longitude, date, time, max_participants,
        price_range, age_range, gender_preference, image,
        status, current_participants, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
        '모집중', 1, NOW(), NOW()
      ) RETURNING *
    `,
      [
        userId,
        title,
        description,
        category,
        location,
        address,
        latitude,
        longitude,
        date,
        time,
        maxParticipants || 4,
        priceRange,
        ageRange,
        genderPreference,
        image,
      ]
    );

    const meetup = result.rows[0];

    // 호스트를 참가자로 자동 추가
    await pool.query(
      `
      INSERT INTO meetup_participants (meetup_id, user_id, status, joined_at)
      VALUES ($1, $2, '참가승인', NOW())
    `,
      [meetup.id, userId]
    );

    res.status(201).json({
      success: true,
      message: '약속이 만들어졌습니다.',
      meetup,
    });
  } catch (error) {
    console.error('모임 생성 오류:', error);
    res.status(500).json({
      success: false,
      message: '약속 만들기에 실패했습니다.',
    });
  }
};

/**
 * 모임 수정
 */
exports.updateMeetup = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const updates = req.body;

    const { error } = await validateHostPermission(id, userId);
    if (error) {
      const status = error.includes('찾을 수 없') ? 404 : 403;
      return res.status(status).json({ success: false, error });
    }

    const updateFields = [];
    const values = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        updateFields.push(`${dbKey} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        error: '수정할 내용이 없습니다.',
      });
    }

    values.push(id);
    const result = await pool.query(
      `
      UPDATE meetups
      SET ${updateFields.join(', ')}, updated_at = NOW()
      WHERE id = $${paramIndex}
      RETURNING *
    `,
      values
    );

    res.json({
      success: true,
      message: '약속이 수정되었습니다.',
      meetup: result.rows[0],
    });
  } catch (error) {
    console.error('모임 수정 오류:', error);
    res.status(500).json({
      success: false,
      message: '약속 수정에 실패했습니다.',
    });
  }
};

/**
 * 모임 삭제
 */
exports.deleteMeetup = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const { error } = await validateHostPermission(id, userId);
    if (error) {
      const status = error.includes('찾을 수 없') ? 404 : 403;
      return res.status(status).json({ success: false, error });
    }

    await pool.query('DELETE FROM meetups WHERE id = $1', [id]);

    res.json({
      success: true,
      message: '약속이 삭제되었습니다.',
    });
  } catch (error) {
    console.error('모임 삭제 오류:', error);
    res.status(500).json({
      success: false,
      message: '약속 삭제에 실패했습니다.',
    });
  }
};

/**
 * 모임 상태 변경
 */
exports.updateMeetupStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const { status } = req.body;

    const { error } = await validateHostPermission(id, userId);
    if (error) {
      const status = error.includes('찾을 수 없') ? 404 : 403;
      return res.status(status).json({ success: false, error });
    }

    const validStatuses = ['모집중', '모집완료', '진행중', '종료', '취소'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: '유효하지 않은 상태입니다.',
      });
    }

    const result = await pool.query(
      `
      UPDATE meetups
      SET status = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `,
      [status, id]
    );

    res.json({
      success: true,
      message: '약속 상태가 변경되었습니다.',
      meetup: result.rows[0],
    });
  } catch (error) {
    console.error('모임 상태 변경 오류:', error);
    res.status(500).json({
      success: false,
      message: '약속 상태 변경에 실패했습니다.',
    });
  }
};
