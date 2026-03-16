/**
 * 모임 CRUD 컨트롤러
 */
const pool = require('../../../config/database');
const logger = require('../../../config/logger');
const { validateHostPermission } = require('../helpers/validation.helper');
const {
  notifyMeetupCancelled,
  notifyMeetupUpdated,
  refundDepositsForMeetup,
  recordHostCancellationAndCheckPenalty,
} = require('../helpers/notification.helper');

/**
 * 모임 상세 조회
 */
exports.getMeetupById = async (req, res) => {
  try {
    const { id } = req.params;
    const { processImageUrl } = require('../../../utils/helpers');

    const result = await pool.query(
      `
      SELECT m.id, m.title, m.description, m.location, m.address,
        m.latitude, m.longitude, m.date, m.time,
        m.max_participants, m.current_participants,
        m.category, m.price_range, m.image, m.status,
        m.age_range, m.gender_preference, m.host_id,
        m.dining_preferences, m.promise_deposit_amount, m.promise_deposit_required,
        m.requirements, m.tags, m.view_count, m.created_at, m.updated_at,
        u.id as host_user_id, u.name as host_name,
        u.profile_image as host_profile_image,
        u.rating as host_rating,
        u.babal_score as host_babal_score
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

    const row = result.rows[0];

    // 참가자 조회
    const participantsResult = await pool.query(
      `
      SELECT mp.user_id, mp.status, mp.joined_at,
        u.name, u.profile_image, u.rating, u.babal_score
      FROM meetup_participants mp
      JOIN users u ON mp.user_id = u.id
      WHERE mp.meetup_id = $1
      ORDER BY mp.joined_at
    `,
      [id]
    );

    // 선택 성향 필터 조회
    const prefsResult = await pool.query(
      `SELECT * FROM meetup_preference_filters WHERE meetup_id = $1 LIMIT 1`,
      [id]
    );
    const preferenceFilters = prefsResult.rows[0] || null;

    // 조회수 증가
    await pool.query(
      `UPDATE meetups SET view_count = COALESCE(view_count, 0) + 1 WHERE id = $1`,
      [id]
    ).catch(() => {});

    res.json({
      success: true,
      meetup: {
        id: row.id,
        title: row.title,
        description: row.description,
        location: row.location,
        address: row.address,
        latitude: row.latitude ? parseFloat(row.latitude) : null,
        longitude: row.longitude ? parseFloat(row.longitude) : null,
        date: row.date,
        time: row.time,
        maxParticipants: row.max_participants,
        currentParticipants: row.current_participants,
        category: row.category,
        priceRange: row.price_range,
        ageRange: row.age_range,
        genderPreference: row.gender_preference,
        image: processImageUrl(row.image, row.category),
        status: row.status,
        hostId: row.host_id,
        requirements: row.requirements,
        tags: row.tags,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        diningPreferences: row.dining_preferences || {},
        promiseDepositAmount: row.promise_deposit_amount || 0,
        promiseDepositRequired: row.promise_deposit_required || false,
        viewCount: row.view_count || 0,
        host: {
          id: row.host_user_id,
          name: row.host_name,
          profileImage: row.host_profile_image,
          rating: row.host_rating,
          babAlScore: parseFloat(row.host_babal_score) || 36.5,
        },
        preferenceFilters: preferenceFilters ? {
          eatingSpeed: preferenceFilters.eating_speed !== 'no_preference' ? preferenceFilters.eating_speed : null,
          conversationDuringMeal: preferenceFilters.conversation_during_meal !== 'no_preference' ? preferenceFilters.conversation_during_meal : null,
          talkativeness: preferenceFilters.talkativeness !== 'no_preference' ? preferenceFilters.talkativeness : null,
          mealPurpose: preferenceFilters.meal_purpose !== 'no_preference' ? preferenceFilters.meal_purpose : null,
          specificRestaurant: preferenceFilters.specific_restaurant || null,
          interests: (preferenceFilters.interests || []).filter(i => i),
        } : null,
        participants: participantsResult.rows.map(p => ({
          id: p.user_id,
          name: p.name,
          profileImage: p.profile_image,
          rating: p.rating,
          status: p.status,
          joinedAt: p.joined_at,
          babAlScore: parseFloat(p.babal_score) || 36.5,
        })),
      },
    });
  } catch (error) {
    logger.error('모임 상세 조회 오류:', error);
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
        id, host_id, title, description, category, location, address,
        latitude, longitude, date, time, max_participants,
        price_range, age_range, gender_preference, image,
        status, current_participants, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
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
      INSERT INTO meetup_participants (id, meetup_id, user_id, status, joined_at, created_at, updated_at)
      VALUES (gen_random_uuid(), $1, $2, '참가승인', NOW(), NOW(), NOW())
    `,
      [meetup.id, userId]
    );

    res.status(201).json({
      success: true,
      message: '약속이 만들어졌습니다.',
      meetup,
    });
  } catch (error) {
    logger.error('모임 생성 오류:', error);
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

    const { meetup: existingMeetup, error } = await validateHostPermission(id, userId);
    if (error) {
      const status = error.includes('찾을 수 없') ? 404 : 403;
      return res.status(status).json({ success: false, error });
    }

    const updateFields = [];
    const values = [];
    let paramIndex = 1;

    // 허용된 수정 가능 필드 목록 (SQL injection 방지)
    const allowedFields = ['title', 'description', 'location', 'address', 'latitude', 'longitude', 'date', 'time', 'maxParticipants', 'priceRange', 'category', 'image', 'ageRange', 'genderPreference', 'diningPreferences', 'tags'];

    // 알림이 필요한 중요 변경 사항 추적
    const notifiableFields = ['date', 'time', 'location', 'address', 'max_participants', 'maxParticipants'];
    const importantChanges = {};

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined && allowedFields.includes(key)) {
        const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        updateFields.push(`${dbKey} = $${paramIndex}`);
        values.push(value);
        paramIndex++;

        // 중요 변경 사항 감지
        if (notifiableFields.includes(key) || notifiableFields.includes(dbKey)) {
          const oldValue = existingMeetup[dbKey];
          if (String(oldValue) !== String(value)) {
            importantChanges[dbKey] = { from: oldValue, to: value };
          }
        }
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

    // 중요 변경 사항이 있으면 참가자에게 알림 발송
    if (Object.keys(importantChanges).length > 0) {
      notifyMeetupUpdated(
        { id, title: existingMeetup.title, host_id: userId },
        importantChanges
      ).catch(err => logger.error('모임 변경 알림 발송 오류:', err));
    }

    res.json({
      success: true,
      message: '약속이 수정되었습니다.',
      meetup: result.rows[0],
    });
  } catch (error) {
    logger.error('모임 수정 오류:', error);
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
    logger.error('모임 삭제 오류:', error);
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
    const { status: newStatus } = req.body;

    const { meetup, error } = await validateHostPermission(id, userId);
    if (error) {
      const statusCode = error.includes('찾을 수 없') ? 404 : 403;
      return res.status(statusCode).json({ success: false, error });
    }

    const validStatuses = ['모집중', '모집완료', '진행중', '종료', '취소'];
    if (!validStatuses.includes(newStatus)) {
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
      [newStatus, id]
    );

    // 취소 상태로 변경 시 참가자 알림 + 약속금 환불 + 호스트 취소 이력
    if (newStatus === '취소' && meetup.status !== '취소') {
      notifyMeetupCancelled(meetup, 'host')
        .catch(err => logger.error('모임 취소 알림 발송 오류:', err));

      refundDepositsForMeetup(id)
        .catch(err => logger.error('모임 취소 약속금 환불 오류:', err));

      recordHostCancellationAndCheckPenalty(userId, id)
        .catch(err => logger.error('호스트 취소 이력 기록 오류:', err));
    }

    res.json({
      success: true,
      message: '약속 상태가 변경되었습니다.',
      meetup: result.rows[0],
    });
  } catch (error) {
    logger.error('모임 상태 변경 오류:', error);
    res.status(500).json({
      success: false,
      message: '약속 상태 변경에 실패했습니다.',
    });
  }
};
