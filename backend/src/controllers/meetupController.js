const { Meetup, User, MeetupParticipant } = require('../models');
const { Op } = require('sequelize');

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
      tags
    } = req.body;

    const hostId = req.user.userId;

    if (!title || !location || !date || !time || !maxParticipants || !category) {
      return res.status(400).json({ error: '필수 필드를 모두 입력해주세요' });
    }

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
      image,
      hostId,
      requirements,
      tags: tags || []
    });

    // 호스트를 자동으로 참가자로 추가
    await MeetupParticipant.create({
      meetupId: meetup.id,
      userId: hostId,
      status: '참가승인'
    });

    // 호스트의 주최 모임 수 증가
    await User.increment('meetupsHosted', { where: { id: hostId } });

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
            where: { status: '참가승인' },
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