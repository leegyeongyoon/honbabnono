const { Meetup, User, MeetupParticipant, ChatRoom, ChatParticipant } = require('../models');
const { Op } = require('sequelize');

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

// 모임 상세 조회
const getMeetupById = async (req, res) => {
  try {
    const { id } = req.params;

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

module.exports = {
  createMeetup,
  getMeetups,
  getMeetupById,
  joinMeetup,
  updateParticipantStatus,
  getMyMeetups
};