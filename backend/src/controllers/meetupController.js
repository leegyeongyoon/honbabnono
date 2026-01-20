const { Meetup, User, MeetupParticipant, ChatRoom, ChatParticipant, sequelize } = require('../models');
const { Op } = require('sequelize');

// 하버사인 공식으로 두 지점 간 거리 계산 (미터 단위)
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371000; // 지구 반경 (미터)
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ/2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return Math.round(R * c); // 미터 단위, 정수로 반환
};

// 채팅방 생성 헬퍼 함수 (DB 직접 사용)
const createMeetupChatRoom = async (meetupId, title, hostId, hostName) => {
  try {
    // 채팅방 생성
    const chatRoom = await ChatRoom.create({
      type: 'meetup',
      meetupId,
      title: `${title} 모임 채팅`,
      description: `${title} 모임의 단체 채팅방입니다.`,
      isActive: true,
      createdBy: hostId
    });

    // 호스트를 채팅방 참가자로 추가
    await ChatParticipant.create({
      chatRoomId: chatRoom.id,
      userId: hostId,
      userName: hostName || '호스트',
      role: 'owner'
    });

    console.log(`✅ 모임 ${meetupId} 채팅방 생성 완료 (ID: ${chatRoom.id})`);
    return chatRoom;
  } catch (error) {
    console.error('채팅방 생성 실패:', error);
    // 채팅방 생성 실패해도 모임 생성은 계속 진행
  }
};

// 채팅방에 사용자 추가 헬퍼 함수 (DB 직접 사용)
const addUserToChatRoom = async (meetupId, userId, userName) => {
  try {
    // 모임 채팅방 찾기
    const chatRoom = await ChatRoom.findOne({
      where: { type: 'meetup', meetupId }
    });

    if (!chatRoom) {
      console.error('모임 채팅방을 찾을 수 없습니다:', meetupId);
      return;
    }

    // 이미 참가하고 있는지 확인
    const existingParticipant = await ChatParticipant.findOne({
      where: { chatRoomId: chatRoom.id, userId, isActive: true }
    });

    if (!existingParticipant) {
      // 사용자를 채팅방에 추가
      await ChatParticipant.create({
        chatRoomId: chatRoom.id,
        userId,
        userName: userName || '참가자',
        role: 'member'
      });

      console.log(`✅ 사용자 ${userId}를 모임 ${meetupId} 채팅방에 추가`);
    }
  } catch (error) {
    console.error('채팅방 사용자 추가 실패:', error);
    // 채팅방 사용자 추가 실패해도 참가 승인은 계속 진행
  }
};

// 모임 생성
const createMeetup = async (req, res) => {
  try {
    const {
      title,
      description,
      location,
      address,
      latitude,
      longitude,
      date,
      time,
      maxParticipants,
      category,
      priceRange,
      image,
      requirements,
      tags,
      depositId,
      // 필수 필터
      genderFilter,
      ageFilterMin,
      ageFilterMax,
      // 선택 필터  
      eatingSpeed,
      conversationDuringMeal,
      talkativeness,
      mealPurpose,
      specificRestaurant,
      interests,
      isRequired,
      allowDirectChat
    } = req.body;

    const hostId = req.user.userId;

    if (!title || !location || !date || !time || !maxParticipants || !category) {
      return res.status(400).json({ error: '필수 필드를 모두 입력해주세요' });
    }

    // 필터 데이터 처리
    const ageRange = ageFilterMin && ageFilterMax ? `${ageFilterMin}-${ageFilterMax}세` : null;
    const genderPreference = genderFilter === 'anyone' ? '상관없음' : 
                           genderFilter === 'male' ? '남성만' : 
                           genderFilter === 'female' ? '여성만' : '상관없음';
                           
    const diningPreferences = {
      eatingSpeed: eatingSpeed || null,
      conversationDuringMeal: conversationDuringMeal || null,
      talkativeness: talkativeness || null,
      mealPurpose: mealPurpose || null,
      specificRestaurant: specificRestaurant || null,
      interests: interests ? JSON.parse(interests) : [],
      isRequired: isRequired === 'true'
    };

    const meetup = await Meetup.create({
      title,
      description,
      location,
      address,
      latitude,
      longitude,
      date,
      time,
      maxParticipants,
      category,
      priceRange,
      ageRange,
      genderPreference,
      image,
      hostId,
      requirements,
      tags: tags || [],
      diningPreferences,
      promiseDepositAmount: depositId ? 5000 : 0, // 기본 약속금 5000원
      promiseDepositRequired: !!depositId,
      allowDirectChat: allowDirectChat || false
    });

    // 호스트를 자동으로 참가자로 추가
    await MeetupParticipant.create({
      meetupId: meetup.id,
      userId: hostId,
      status: '참가승인'
    });

    // 호스트의 주최 모임 수 증가
    await User.increment('meetupsHosted', { where: { id: hostId } });

    // 호스트 정보 조회
    const host = await User.findByPk(hostId, {
      attributes: ['name']
    });

    // 모임 채팅방 자동 생성
    await createMeetupChatRoom(meetup.id, title, hostId, host?.name);

    const createdMeetup = await Meetup.findByPk(meetup.id, {
      include: [
        {
          model: User,
          as: 'host',
          attributes: ['id', 'name', 'profileImage', 'rating']
        }
      ]
    });

    res.status(201).json({
      message: '모임이 생성되었습니다',
      meetup: createdMeetup
    });
  } catch (error) {
    console.error('모임 생성 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
};

// 모임 목록 조회
const getMeetups = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      category, 
      location, 
      date,
      status = '모집중',
      search 
    } = req.query;

    const offset = (page - 1) * limit;
    const where = { status };

    // 필터 조건 추가
    if (category) where.category = category;
    if (location) where.location = { [Op.iLike]: `%${location}%` };
    if (date) where.date = date;
    if (search) {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const { count, rows: meetups } = await Meetup.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'host',
          attributes: ['id', 'name', 'profileImage', 'rating']
        }
      ],
      offset: parseInt(offset),
      limit: parseInt(limit),
      order: [['createdAt', 'DESC']]
    });

    res.json({
      meetups,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('모임 목록 조회 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
};

// 홈 화면 모임 목록 조회 (모집중인 모임만)
const getHomeMeetups = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const { count, rows: meetups } = await Meetup.findAndCountAll({
      where: { status: '모집중' },
      include: [
        {
          model: User,
          as: 'host',
          attributes: ['id', 'name', 'profileImage', 'rating']
        }
      ],
      offset: parseInt(offset),
      limit: parseInt(limit),
      order: [['createdAt', 'DESC']]
    });

    res.json({
      meetups,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('홈 모임 목록 조회 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
};

// 모임 상세 조회
const getMeetupById = async (req, res) => {
  try {
    let { id } = req.params;

    // id가 객체인 경우 처리 (잘못된 요청 방어)
    if (typeof id === 'object') {
      console.error('❌ getMeetupById: id가 객체로 전달됨:', id);
      return res.status(400).json({ error: '잘못된 모임 ID 형식입니다' });
    }

    // UUID 형식 검증
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      console.error('❌ getMeetupById: 유효하지 않은 UUID:', id);
      return res.status(400).json({ error: '유효하지 않은 모임 ID입니다' });
    }

    const meetup = await Meetup.findByPk(id, {
      include: [
        {
          model: User,
          as: 'host',
          attributes: ['id', 'name', 'profileImage', 'rating', 'meetupsHosted']
        },
        {
          model: User,
          as: 'participants',
          through: {
            where: { status: ['참가신청', '참가승인'] },
            attributes: ['status', 'joinedAt']
          },
          attributes: ['id', 'name', 'profileImage', 'rating']
        }
      ]
    });

    if (!meetup) {
      return res.status(404).json({ error: '모임을 찾을 수 없습니다' });
    }

    res.json({ meetup });
  } catch (error) {
    console.error('모임 상세 조회 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
};

// 모임 참가 신청
const joinMeetup = async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;
    const userId = req.user.userId;

    const meetup = await Meetup.findByPk(id);
    if (!meetup) {
      return res.status(404).json({ error: '모임을 찾을 수 없습니다' });
    }

    if (meetup.status !== '모집중') {
      return res.status(400).json({ error: '모집이 마감된 모임입니다' });
    }

    if (meetup.currentParticipants >= meetup.maxParticipants) {
      return res.status(400).json({ error: '모임 정원이 가득찼습니다' });
    }

    if (meetup.hostId === userId) {
      return res.status(400).json({ error: '본인이 주최한 모임에는 참가 신청할 수 없습니다' });
    }

    // 이미 참가 신청했는지 확인
    const existingParticipant = await MeetupParticipant.findOne({
      where: { meetupId: id, userId }
    });

    if (existingParticipant) {
      return res.status(400).json({ error: '이미 참가 신청한 모임입니다' });
    }

    // 참가 신청 생성
    const participant = await MeetupParticipant.create({
      meetupId: id,
      userId,
      message: message || null,
      status: '참가신청'
    });

    // 모임 채팅방에 자동으로 참가자 추가
    try {
      const chatRoom = await ChatRoom.findOne({
        where: { 
          meetupId: id,
          type: 'meetup' 
        }
      });

      if (chatRoom) {
        const user = await User.findByPk(userId);
        
        // 이미 채팅방에 참가했는지 확인
        const existingChatParticipant = await ChatParticipant.findOne({
          where: {
            chatRoomId: chatRoom.id,
            userId: userId
          }
        });

        if (!existingChatParticipant) {
          await ChatParticipant.create({
            chatRoomId: chatRoom.id,
            userId: userId,
            userName: user.name,
            role: 'member',
            joinedAt: new Date(),
            isActive: true
          });
          console.log(`✅ 사용자 ${user.name}이 모임 채팅방 ${chatRoom.id}에 추가됨`);
        }
      }
    } catch (chatError) {
      console.error('채팅방 참가 중 오류:', chatError);
      // 채팅방 추가 실패해도 모임 참가는 성공으로 처리
    }

    res.status(201).json({
      message: '모임 참가 신청이 완료되었습니다',
      participant
    });
  } catch (error) {
    console.error('모임 참가 신청 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
};

// 참가 신청 승인/거절
const updateParticipantStatus = async (req, res) => {
  try {
    const { id, participantId } = req.params;
    const { status } = req.body; // '참가승인' 또는 '참가거절'
    const hostId = req.user.userId;

    if (!['참가승인', '참가거절'].includes(status)) {
      return res.status(400).json({ error: '잘못된 상태값입니다' });
    }

    const meetup = await Meetup.findByPk(id);
    if (!meetup) {
      return res.status(404).json({ error: '모임을 찾을 수 없습니다' });
    }

    if (meetup.hostId !== hostId) {
      return res.status(403).json({ error: '모임 호스트만 참가 신청을 처리할 수 있습니다' });
    }

    const participant = await MeetupParticipant.findOne({
      where: { id: participantId, meetupId: id }
    });

    if (!participant) {
      return res.status(404).json({ error: '참가 신청을 찾을 수 없습니다' });
    }

    await participant.update({ status });

    // 참가 승인시 현재 참가자 수 증가 및 사용자 참가 모임 수 증가
    if (status === '참가승인') {
      await meetup.increment('currentParticipants');
      await User.increment('meetupsJoined', { where: { id: participant.userId } });

      // 참가자 정보 조회
      const participantUser = await User.findByPk(participant.userId, {
        attributes: ['name']
      });

      // 모임 채팅방에 사용자 추가
      await addUserToChatRoom(meetup.id, participant.userId, participantUser?.name);

      // 정원이 가득 찬 경우 모집 완료로 변경
      if (meetup.currentParticipants + 1 >= meetup.maxParticipants) {
        await meetup.update({ status: '모집완료' });
      }
    }

    res.json({
      message: `참가 신청이 ${status === '참가승인' ? '승인' : '거절'}되었습니다`,
      participant
    });
  } catch (error) {
    console.error('참가 신청 처리 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
};

// 내가 참가한 모임 목록
const getMyMeetups = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { type = 'joined' } = req.query; // 'joined' 또는 'hosted'

    let meetups;

    if (type === 'hosted') {
      // 내가 주최한 모임
      meetups = await Meetup.findAll({
        where: { hostId: userId },
        include: [
          {
            model: User,
            as: 'participants',
            through: {
              where: { status: '참가승인' },
              attributes: ['status', 'joinedAt']
            },
            attributes: ['id', 'name', 'profileImage']
          }
        ],
        order: [['date', 'DESC']]
      });
    } else {
      // 내가 참가한 모임
      const participantRecords = await MeetupParticipant.findAll({
        where: { 
          userId,
          status: '참가승인'
        },
        include: [
          {
            model: Meetup,
            as: 'meetup',
            include: [
              {
                model: User,
                as: 'host',
                attributes: ['id', 'name', 'profileImage', 'rating']
              }
            ]
          }
        ],
        order: [['joinedAt', 'DESC']]
      });

      meetups = participantRecords.map(record => record.meetup);
    }

    res.json({ meetups });
  } catch (error) {
    console.error('내 모임 목록 조회 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
};

// GPS 체크인 (출석 인증)
const checkInMeetup = async (req, res) => {
  try {
    const { id } = req.params;
    const { latitude, longitude } = req.body;
    const userId = req.user.userId;

    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'GPS 좌표가 필요합니다' });
    }

    const meetup = await Meetup.findByPk(id);
    if (!meetup) {
      return res.status(404).json({ error: '모임을 찾을 수 없습니다' });
    }

    // 모임 상태 확인 (진행중일 때만 체크인 가능)
    if (meetup.status !== '진행중') {
      return res.status(400).json({
        error: '체크인은 모임이 진행중일 때만 가능합니다',
        currentStatus: meetup.status
      });
    }

    // 참가 승인된 사용자인지 확인
    const participant = await MeetupParticipant.findOne({
      where: {
        meetupId: id,
        userId,
        status: '참가승인'
      }
    });

    if (!participant) {
      return res.status(403).json({ error: '참가 승인된 사용자만 체크인할 수 있습니다' });
    }

    // 이미 체크인했는지 확인
    if (participant.attended) {
      return res.status(400).json({
        error: '이미 체크인을 완료했습니다',
        attendedAt: participant.attendedAt
      });
    }

    // 체크인 시간 범위 확인 (모임 시작 30분 전 ~ 1시간 후)
    // meetup.date는 DATEONLY 타입으로 "YYYY-MM-DD" 문자열로 반환됨
    // meetup.time은 TIME 타입으로 "HH:mm:ss" 문자열로 반환됨
    const dateStr = typeof meetup.date === 'string' ? meetup.date : meetup.date.toISOString().split('T')[0];
    const timeStr = typeof meetup.time === 'string' ? meetup.time.split('.')[0] : meetup.time; // 밀리초 제거
    const meetupDateTimeStr = `${dateStr}T${timeStr}+09:00`; // 한국 시간대 적용
    const meetupDateTime = new Date(meetupDateTimeStr);

    console.log('🕐 체크인 시간 디버깅:', {
      dateStr,
      timeStr,
      meetupDateTimeStr,
      meetupDateTime: meetupDateTime.toISOString()
    });

    const checkInStart = new Date(meetupDateTime.getTime() - 20 * 60 * 1000); // 20분 전
    const checkInEnd = new Date(meetupDateTime.getTime() + 10 * 60 * 1000); // 10분 후
    const now = new Date();

    console.log('🕐 체크인 시간 범위:', {
      now: now.toISOString(),
      checkInStart: checkInStart.toISOString(),
      checkInEnd: checkInEnd.toISOString()
    });

    if (now < checkInStart) {
      return res.status(400).json({
        error: '아직 체크인 시간이 아닙니다',
        checkInStart: checkInStart.toISOString()
      });
    }

    if (now > checkInEnd) {
      return res.status(400).json({
        error: '체크인 시간이 지났습니다',
        checkInEnd: checkInEnd.toISOString()
      });
    }

    // 거리 계산
    if (!meetup.latitude || !meetup.longitude) {
      return res.status(400).json({ error: '모임 장소의 좌표 정보가 없습니다' });
    }

    const distance = calculateDistance(
      parseFloat(latitude),
      parseFloat(longitude),
      parseFloat(meetup.latitude),
      parseFloat(meetup.longitude)
    );

    const checkInRadius = meetup.checkInRadius || 300; // 기본 300m

    if (distance > checkInRadius) {
      return res.status(400).json({
        error: `모임 장소에서 너무 멀리 있습니다 (${distance}m)`,
        distance,
        maxDistance: checkInRadius
      });
    }

    // 체크인 성공 - 출석 기록 업데이트
    await participant.update({
      attended: true,
      attendedAt: now,
      attendanceLatitude: latitude,
      attendanceLongitude: longitude,
      attendanceDistance: distance
    });

    res.json({
      message: '체크인이 완료되었습니다',
      attended: true,
      distance,
      attendedAt: now
    });
  } catch (error) {
    console.error('체크인 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
};

// 출석 현황 조회
const getAttendance = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const meetup = await Meetup.findByPk(id);
    if (!meetup) {
      return res.status(404).json({ error: '모임을 찾을 수 없습니다' });
    }

    // 참가자 목록 조회 (승인된 참가자만)
    const participants = await MeetupParticipant.findAll({
      where: {
        meetupId: id,
        status: '참가승인'
      },
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'profileImage']
      }],
      order: [['joinedAt', 'ASC']]
    });

    // 본인의 체크인 상태
    const myParticipant = participants.find(p => p.userId === userId);

    const attendanceList = participants.map(p => ({
      id: p.id,
      userId: p.user.id,
      name: p.user.name,
      profileImage: p.user.profileImage,
      attended: p.attended,
      attendedAt: p.attendedAt,
      distance: p.attendanceDistance,
      isHost: p.userId === meetup.hostId,
      isMe: p.userId === userId
    }));

    res.json({
      meetupId: id,
      status: meetup.status,
      checkInRadius: meetup.checkInRadius || 300,
      totalParticipants: participants.length,
      attendedCount: participants.filter(p => p.attended).length,
      participants: attendanceList,
      myAttendance: myParticipant ? {
        attended: myParticipant.attended,
        attendedAt: myParticipant.attendedAt
      } : null
    });
  } catch (error) {
    console.error('출석 현황 조회 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
};

// 모임 상태 변경 (호스트 전용)
const updateMeetupStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user.userId;

    if (!['진행중', '종료'].includes(status)) {
      return res.status(400).json({ error: '잘못된 상태값입니다 (진행중 또는 종료만 가능)' });
    }

    const meetup = await Meetup.findByPk(id);
    if (!meetup) {
      return res.status(404).json({ error: '모임을 찾을 수 없습니다' });
    }

    // 호스트 권한 확인
    if (meetup.hostId !== userId) {
      return res.status(403).json({ error: '모임 호스트만 상태를 변경할 수 있습니다' });
    }

    // 상태 전환 규칙 확인
    if (status === '진행중' && !['모집중', '모집완료'].includes(meetup.status)) {
      return res.status(400).json({
        error: '모집중 또는 모집완료 상태에서만 진행중으로 변경할 수 있습니다',
        currentStatus: meetup.status
      });
    }

    if (status === '종료' && meetup.status !== '진행중') {
      return res.status(400).json({
        error: '진행중 상태에서만 종료로 변경할 수 있습니다',
        currentStatus: meetup.status
      });
    }

    const updateData = { status };
    if (status === '종료') {
      updateData.endedAt = new Date();
    }

    await meetup.update(updateData);

    res.json({
      message: `모임 상태가 '${status}'(으)로 변경되었습니다`,
      status,
      endedAt: updateData.endedAt || null
    });
  } catch (error) {
    console.error('모임 상태 변경 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
};

// ==================== 찜(Wishlist) 관련 함수 ====================

// 찜 상태 확인
const getWishlistStatus = async (req, res) => {
  try {
    const { id: meetupId } = req.params;
    const userId = req.user.userId;

    const [result] = await sequelize.query(
      'SELECT id FROM meetup_wishlists WHERE user_id = :userId AND meetup_id = :meetupId',
      {
        replacements: { userId, meetupId },
        type: sequelize.QueryTypes.SELECT
      }
    );

    res.json({
      success: true,
      data: {
        isWishlisted: !!result
      }
    });
  } catch (error) {
    console.error('찜 상태 확인 오류:', error);
    res.status(500).json({
      success: false,
      message: '찜 상태 확인 중 오류가 발생했습니다.'
    });
  }
};

// 찜 추가
const addToWishlist = async (req, res) => {
  try {
    const { id: meetupId } = req.params;
    const userId = req.user.userId;

    console.log('🤍 찜 추가 요청:', { meetupId, userId });

    // 모임이 존재하는지 확인
    const meetup = await Meetup.findByPk(meetupId);
    if (!meetup) {
      return res.status(404).json({
        success: false,
        message: '모임을 찾을 수 없습니다.'
      });
    }

    // 이미 찜한 모임인지 확인
    const [existingWishlist] = await sequelize.query(
      'SELECT id FROM meetup_wishlists WHERE user_id = :userId AND meetup_id = :meetupId',
      {
        replacements: { userId, meetupId },
        type: sequelize.QueryTypes.SELECT
      }
    );

    if (existingWishlist) {
      return res.status(400).json({
        success: false,
        message: '이미 찜한 모임입니다.'
      });
    }

    // 찜 추가
    const [insertResult] = await sequelize.query(
      'INSERT INTO meetup_wishlists (user_id, meetup_id) VALUES (:userId, :meetupId) RETURNING id, created_at',
      {
        replacements: { userId, meetupId },
        type: sequelize.QueryTypes.INSERT
      }
    );

    console.log('✅ 찜 추가 성공');

    res.json({
      success: true,
      data: {
        id: insertResult?.[0]?.id,
        createdAt: insertResult?.[0]?.created_at
      },
      message: '찜 목록에 추가되었습니다.'
    });
  } catch (error) {
    console.error('찜 추가 오류:', error);
    res.status(500).json({
      success: false,
      message: '찜 추가 중 오류가 발생했습니다.'
    });
  }
};

// 찜 제거
const removeFromWishlist = async (req, res) => {
  try {
    const { id: meetupId } = req.params;
    const userId = req.user.userId;

    console.log('💔 찜 제거 요청:', { meetupId, userId });

    // 찜 제거
    const [, metadata] = await sequelize.query(
      'DELETE FROM meetup_wishlists WHERE user_id = :userId AND meetup_id = :meetupId',
      {
        replacements: { userId, meetupId }
      }
    );

    if (metadata?.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: '찜한 모임을 찾을 수 없습니다.'
      });
    }

    console.log('✅ 찜 제거 성공');

    res.json({
      success: true,
      message: '찜 목록에서 제거되었습니다.'
    });
  } catch (error) {
    console.error('찜 제거 오류:', error);
    res.status(500).json({
      success: false,
      message: '찜 제거 중 오류가 발생했습니다.'
    });
  }
};

module.exports = {
  createMeetup,
  getMeetups,
  getHomeMeetups,
  getMeetupById,
  joinMeetup,
  updateParticipantStatus,
  getMyMeetups,
  checkInMeetup,
  getAttendance,
  updateMeetupStatus,
  getWishlistStatus,
  addToWishlist,
  removeFromWishlist
};