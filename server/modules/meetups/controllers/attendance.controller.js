/**
 * 출석 관리 컨트롤러
 */
const pool = require('../../../config/database');
const { calculateDistance } = require('../../../utils/helpers');
const { validateMeetupExists, validateHostPermission, validateParticipant } = require('../helpers/validation.helper');

const MAX_CHECKIN_DISTANCE = 100; // 체크인 가능 최대 거리 (미터)

/**
 * GPS 체크인
 */
exports.gpsCheckin = async (req, res) => {
  try {
    const { id: meetupId } = req.params;
    const { latitude, longitude } = req.body;
    const userId = req.user.userId;

    if (!latitude || !longitude) {
      return res.status(400).json({ error: '위치 정보가 필요합니다' });
    }

    const meetupResult = await pool.query(
      'SELECT id, title, latitude, longitude, date, time, status FROM meetups WHERE id = $1',
      [meetupId]
    );

    if (meetupResult.rows.length === 0) {
      return res.status(404).json({ error: '약속을 찾을 수 없습니다' });
    }

    const meetup = meetupResult.rows[0];

    // 참가자 확인
    const { isParticipant, error: participantError } = await validateParticipant(meetupId, userId, '참가승인');
    if (!isParticipant) {
      return res.status(403).json({ error: '약속 참가자만 체크인할 수 있습니다' });
    }

    // 거리 계산
    const distance = calculateDistance(
      parseFloat(latitude),
      parseFloat(longitude),
      parseFloat(meetup.latitude),
      parseFloat(meetup.longitude)
    );

    if (distance > MAX_CHECKIN_DISTANCE) {
      return res.status(400).json({
        error: `약속 장소에서 ${MAX_CHECKIN_DISTANCE}m 이내에서만 체크인할 수 있습니다`,
        distance: Math.round(distance),
        maxDistance: MAX_CHECKIN_DISTANCE,
      });
    }

    // 출석 기록 (upsert)
    await pool.query(
      `
      INSERT INTO attendances (meetup_id, user_id, attendance_type, location_latitude, location_longitude, status, confirmed_at)
      VALUES ($1, $2, 'gps', $3, $4, 'confirmed', NOW())
      ON CONFLICT (meetup_id, user_id) DO UPDATE SET
        attendance_type = 'gps', location_latitude = $3, location_longitude = $4,
        status = 'confirmed', confirmed_at = NOW(), updated_at = NOW()
    `,
      [meetupId, userId, latitude, longitude]
    );

    // meetup_participants에 attended 업데이트
    await pool.query(
      'UPDATE meetup_participants SET attended = true, attended_at = NOW() WHERE meetup_id = $1 AND user_id = $2',
      [meetupId, userId]
    );

    res.json({
      success: true,
      message: '체크인이 완료되었습니다!',
      data: {
        distance: Math.round(distance),
        checkedInAt: new Date(),
      },
    });
  } catch (error) {
    console.error('GPS 체크인 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
};

/**
 * QR 코드 생성 (호스트용)
 */
exports.generateQRCode = async (req, res) => {
  try {
    const { id: meetupId } = req.params;
    const userId = req.user.userId;

    const { isHost, meetup, error } = await validateHostPermission(meetupId, userId);
    if (error) {
      const status = error.includes('찾을 수 없') ? 404 : 403;
      return res.status(status).json({ error });
    }

    const qrData = {
      meetupId,
      hostId: userId,
      timestamp: Date.now(),
      expiresAt: Date.now() + 10 * 60 * 1000, // 10분 후 만료
      type: 'checkin',
    };

    const qrCodeData = Buffer.from(JSON.stringify(qrData)).toString('base64');

    res.json({
      success: true,
      data: {
        qrCodeData,
        expiresAt: qrData.expiresAt,
        meetupTitle: meetup.title,
      },
    });
  } catch (error) {
    console.error('QR 코드 생성 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
};

/**
 * QR 코드 조회 (호스트용)
 */
exports.getQRCode = async (req, res) => {
  try {
    const { id: meetupId } = req.params;
    const userId = req.user.userId;

    const { isHost, meetup, error } = await validateHostPermission(meetupId, userId);
    if (error) {
      const status = error.includes('찾을 수 없') ? 404 : 403;
      return res.status(status).json({ error });
    }

    const qrData = {
      meetupId,
      hostId: userId,
      timestamp: Date.now(),
      expiresAt: Date.now() + 10 * 60 * 1000,
      type: 'checkin',
    };

    const qrCodeData = Buffer.from(JSON.stringify(qrData)).toString('base64');

    res.json({
      success: true,
      data: {
        qrCodeData,
        expiresAt: qrData.expiresAt,
        meetupTitle: meetup.title,
      },
    });
  } catch (error) {
    console.error('QR 코드 조회 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
};

/**
 * QR 코드 스캔 체크인
 */
exports.qrCheckin = async (req, res) => {
  try {
    const { id: meetupId } = req.params;
    const { qrCodeData } = req.body;
    const userId = req.user.userId;

    if (!qrCodeData) {
      return res.status(400).json({ error: 'QR 코드 데이터가 필요합니다' });
    }

    let qrData;
    try {
      qrData = JSON.parse(Buffer.from(qrCodeData, 'base64').toString());
    } catch {
      return res.status(400).json({ error: '잘못된 QR 코드 형식입니다' });
    }

    if (qrData.meetupId !== meetupId) {
      return res.status(400).json({ error: '잘못된 QR 코드입니다' });
    }

    if (Date.now() > qrData.expiresAt) {
      return res.status(400).json({ error: 'QR 코드가 만료되었습니다' });
    }

    // 참가자 확인
    const { isParticipant, error: participantError } = await validateParticipant(meetupId, userId, '참가승인');
    if (!isParticipant) {
      return res.status(403).json({ error: '약속 참가자만 체크인할 수 있습니다' });
    }

    // 출석 기록 (upsert)
    await pool.query(
      `
      INSERT INTO attendances (meetup_id, user_id, attendance_type, qr_code_data, status, confirmed_at)
      VALUES ($1, $2, 'qr', $3, 'confirmed', NOW())
      ON CONFLICT (meetup_id, user_id) DO UPDATE SET
        attendance_type = 'qr', qr_code_data = $3, status = 'confirmed',
        confirmed_at = NOW(), updated_at = NOW()
    `,
      [meetupId, userId, qrCodeData]
    );

    // meetup_participants에 attended 업데이트
    await pool.query(
      'UPDATE meetup_participants SET attended = true, attended_at = NOW() WHERE meetup_id = $1 AND user_id = $2',
      [meetupId, userId]
    );

    res.json({
      success: true,
      message: 'QR 코드 체크인이 완료되었습니다!',
    });
  } catch (error) {
    console.error('QR 체크인 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
};

/**
 * 호스트 출석 확인
 */
exports.hostConfirmAttendance = async (req, res) => {
  try {
    const { id: meetupId, participantId } = req.params;
    const userId = req.user.userId;

    const { isHost, error } = await validateHostPermission(meetupId, userId);
    if (error) {
      const status = error.includes('찾을 수 없') ? 404 : 403;
      return res.status(status).json({ success: false, error });
    }

    // 출석 기록 (upsert)
    await pool.query(
      `
      INSERT INTO attendances (meetup_id, user_id, attendance_type, status, confirmed_at, confirmed_by)
      VALUES ($1, $2, 'host_confirm', 'confirmed', NOW(), $3)
      ON CONFLICT (meetup_id, user_id) DO UPDATE SET
        attendance_type = 'host_confirm', status = 'confirmed',
        confirmed_at = NOW(), confirmed_by = $3, updated_at = NOW()
    `,
      [meetupId, participantId, userId]
    );

    // meetup_participants에 attended 업데이트
    await pool.query(
      'UPDATE meetup_participants SET attended = true, attended_at = NOW() WHERE meetup_id = $1 AND user_id = $2',
      [meetupId, participantId]
    );

    res.json({
      success: true,
      message: '출석이 확인되었습니다.',
    });
  } catch (error) {
    console.error('호스트 출석 확인 오류:', error);
    res.status(500).json({
      success: false,
      message: '출석 확인에 실패했습니다.',
    });
  }
};

/**
 * 출석 참가자 목록 조회
 */
exports.getAttendanceParticipants = async (req, res) => {
  try {
    const { id: meetupId } = req.params;

    const result = await pool.query(
      `
      SELECT
        mp.user_id as id,
        u.name,
        u.profile_image,
        u.babal_score,
        mp.attended,
        mp.attended_at,
        a.attendance_type,
        a.confirmed_at
      FROM meetup_participants mp
      JOIN users u ON mp.user_id = u.id
      LEFT JOIN attendances a ON mp.meetup_id = a.meetup_id AND mp.user_id = a.user_id
      WHERE mp.meetup_id = $1 AND mp.status = '참가승인'
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
        babAlScore: p.babal_score,
        attended: p.attended,
        attendedAt: p.attended_at,
        attendanceType: p.attendance_type,
        confirmedAt: p.confirmed_at,
      })),
    });
  } catch (error) {
    console.error('출석 참가자 목록 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '참가자 목록 조회에 실패했습니다.',
    });
  }
};

/**
 * 상호 출석 확인
 */
exports.mutualConfirmAttendance = async (req, res) => {
  try {
    const { id: meetupId, participantId } = req.params;
    const userId = req.user.userId;

    // 참가자 확인
    const { isParticipant, error: participantError } = await validateParticipant(meetupId, userId, '참가승인');
    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        error: '약속 참가자만 출석 확인을 할 수 있습니다.',
      });
    }

    // 상호 확인 기록
    await pool.query(
      `
      INSERT INTO mutual_confirmations (meetup_id, confirmer_id, confirmed_id, created_at)
      VALUES ($1, $2, $3, NOW())
      ON CONFLICT (meetup_id, confirmer_id, confirmed_id) DO NOTHING
    `,
      [meetupId, userId, participantId]
    );

    res.json({
      success: true,
      message: '출석 확인이 완료되었습니다.',
    });
  } catch (error) {
    console.error('상호 출석 확인 오류:', error);
    res.status(500).json({
      success: false,
      message: '출석 확인에 실패했습니다.',
    });
  }
};

/**
 * 출석 현황 조회 (CheckInButton.tsx에서 사용)
 * GET /meetups/:id/attendance
 */
exports.getAttendance = async (req, res) => {
  try {
    const { id: meetupId } = req.params;
    const userId = req.user.userId;

    // 단일 쿼리로 전체 통계 + 내 출석 정보 조회
    const result = await pool.query(
      `SELECT
        COUNT(*) FILTER (WHERE status = '참가승인') as total,
        COUNT(*) FILTER (WHERE status = '참가승인' AND attended = true) as attended,
        MAX(CASE WHEN user_id = $2 AND attended = true THEN 'true' END) as my_attended,
        MAX(CASE WHEN user_id = $2 THEN attended_at::text END) as my_attended_at
      FROM meetup_participants
      WHERE meetup_id = $1`,
      [meetupId, userId]
    );

    const row = result.rows[0];
    const totalParticipants = parseInt(row.total) || 0;
    const attendedCount = parseInt(row.attended) || 0;

    let myAttendance = null;
    if (row.my_attended === 'true') {
      // 출석 방법 조회 (별도 쿼리 - 필요할 때만)
      const attendanceResult = await pool.query(
        'SELECT attendance_type FROM attendances WHERE meetup_id = $1 AND user_id = $2',
        [meetupId, userId]
      );
      myAttendance = {
        attended: true,
        attendedAt: row.my_attended_at,
        attendanceType: attendanceResult.rows[0]?.attendance_type || 'gps',
      };
    }

    res.json({
      success: true,
      totalParticipants,
      attendedCount,
      myAttendance,
    });
  } catch (error) {
    console.error('출석 현황 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: '출석 현황 조회에 실패했습니다.',
    });
  }
};

/**
 * 위치 검증
 */
exports.verifyLocation = async (req, res) => {
  try {
    const { id: meetupId } = req.params;
    const { latitude, longitude } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        error: '위치 정보가 필요합니다.',
      });
    }

    const meetupResult = await pool.query(
      'SELECT latitude, longitude FROM meetups WHERE id = $1',
      [meetupId]
    );

    if (meetupResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '약속을 찾을 수 없습니다.',
      });
    }

    const meetup = meetupResult.rows[0];

    const distance = calculateDistance(
      parseFloat(latitude),
      parseFloat(longitude),
      parseFloat(meetup.latitude),
      parseFloat(meetup.longitude)
    );

    const isWithinRange = distance <= MAX_CHECKIN_DISTANCE;

    res.json({
      success: true,
      data: {
        distance: Math.round(distance),
        maxDistance: MAX_CHECKIN_DISTANCE,
        isWithinRange,
      },
    });
  } catch (error) {
    console.error('위치 검증 오류:', error);
    res.status(500).json({
      success: false,
      message: '위치 검증에 실패했습니다.',
    });
  }
};
