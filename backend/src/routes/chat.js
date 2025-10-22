const express = require('express');
const router = express.Router();
const { ChatRoom, ChatMessage, ChatParticipant, Meetup, sequelize } = require('../models');
const { Op } = require('sequelize');

// 채팅방 목록 조회
router.get('/rooms', async (req, res) => {
  try {
    const userId = req.query.userId || 'user1';
    
    // 사용자가 참여한 채팅방 조회
    const userChatRooms = await ChatRoom.findAll({
      include: [
        {
          model: ChatParticipant,
          as: 'participants',
          where: { userId, isActive: true },
          required: true
        },
        {
          model: ChatMessage,
          as: 'messages',
          limit: 1,
          order: [['createdAt', 'DESC']],
          required: false
        },
        {
          model: Meetup,
          as: 'meetup',
          required: false,
          attributes: ['id', 'title', 'status']
        }
      ],
      order: [['lastMessageTime', 'DESC']]
    });

    // 응답 데이터 형식 변환
    const formattedRooms = await Promise.all(userChatRooms.map(async (room) => {
      const participant = room.participants[0];
      const lastMessage = room.messages[0];
      
      // 참가자 목록 조회
      const allParticipants = await ChatParticipant.findAll({
        where: { chatRoomId: room.id, isActive: true },
        attributes: ['userId', 'userName']
      });

      return {
        id: room.id,
        type: room.type,
        meetupId: room.meetupId,
        title: room.title,
        participants: allParticipants.map(p => p.userId),
        lastMessage: lastMessage ? lastMessage.message : '',
        lastTime: room.lastMessageTime || room.createdAt,
        unreadCount: participant.unreadCount,
        isActive: room.isActive,
        isOnline: room.type === 'direct' ? false : undefined // TODO: 실시간 온라인 상태
      };
    }));

    res.json({
      success: true,
      data: formattedRooms,
    });
  } catch (error) {
    console.error('Get chat rooms error:', error);
    res.status(500).json({
      success: false,
      message: '채팅방 목록을 가져오는데 실패했습니다.',
    });
  }
});

// 특정 채팅방의 메시지 조회
router.get('/rooms/:roomId/messages', async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.query.userId || 'user1';
    
    // 채팅방 존재 및 접근 권한 확인
    const chatRoom = await ChatRoom.findOne({
      where: { id: roomId },
      include: [
        {
          model: ChatParticipant,
          as: 'participants',
          where: { userId, isActive: true },
          required: true
        },
        {
          model: Meetup,
          as: 'meetup',
          required: false,
          attributes: ['id', 'title', 'status']
        }
      ]
    });

    if (!chatRoom) {
      return res.status(404).json({
        success: false,
        message: '채팅방을 찾을 수 없습니다.',
      });
    }

    // 해당 채팅방의 메시지들 조회
    const roomMessages = await ChatMessage.findAll({
      where: { 
        chatRoomId: roomId,
        isDeleted: false
      },
      include: [
        {
          model: ChatMessage,
          as: 'replyTo',
          required: false,
          attributes: ['id', 'message', 'senderName']
        }
      ],
      order: [['createdAt', 'ASC']]
    });

    // 응답 데이터 형식 변환
    const formattedMessages = roomMessages.map(msg => ({
      id: msg.id,
      chatRoomId: msg.chatRoomId,
      senderId: msg.senderId,
      senderName: msg.senderName,
      message: msg.message,
      messageType: msg.messageType,
      timestamp: msg.createdAt.toISOString(),
      isMe: msg.senderId === userId,
      isRead: true, // TODO: 실제 읽음 상태 구현
      replyTo: msg.replyTo ? {
        id: msg.replyTo.id,
        message: msg.replyTo.message,
        senderName: msg.replyTo.senderName
      } : null,
      fileUrl: msg.fileUrl,
      fileName: msg.fileName
    }));

    // 마지막 읽은 메시지 업데이트
    const participant = chatRoom.participants[0];
    const lastMessage = roomMessages[roomMessages.length - 1];
    if (lastMessage) {
      await ChatParticipant.update({
        lastReadMessageId: lastMessage.id,
        lastReadAt: new Date(),
        unreadCount: 0
      }, {
        where: { chatRoomId: roomId, userId }
      });
    }

    res.json({
      success: true,
      data: {
        chatRoom: {
          id: chatRoom.id,
          type: chatRoom.type,
          meetupId: chatRoom.meetupId,
          title: chatRoom.title,
          isActive: chatRoom.isActive
        },
        messages: formattedMessages,
      },
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({
      success: false,
      message: '메시지를 가져오는데 실패했습니다.',
    });
  }
});

// 메시지 전송
router.post('/rooms/:roomId/messages', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { message, senderId, senderName, replyToId } = req.body;
    const userId = req.query.userId || senderId || 'user1';

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: '메시지 내용이 필요합니다.',
      });
    }

    // 채팅방 존재 및 접근 권한 확인
    const chatRoom = await ChatRoom.findOne({
      where: { id: roomId },
      include: [
        {
          model: ChatParticipant,
          as: 'participants',
          where: { userId, isActive: true },
          required: true
        }
      ]
    });

    if (!chatRoom) {
      return res.status(404).json({
        success: false,
        message: '채팅방을 찾을 수 없습니다.',
      });
    }

    // 새 메시지 생성
    const newMessage = await ChatMessage.create({
      chatRoomId: parseInt(roomId),
      senderId: userId,
      senderName: senderName || '사용자',
      message: message.trim(),
      messageType: 'text',
      replyToId: replyToId || null
    });

    // 채팅방의 마지막 메시지 정보 업데이트
    await ChatRoom.update({
      lastMessage: message.trim(),
      lastMessageTime: new Date()
    }, {
      where: { id: roomId }
    });

    // 다른 참가자들의 읽지 않은 메시지 수 증가
    await ChatParticipant.increment('unreadCount', {
      where: {
        chatRoomId: roomId,
        userId: { [Op.ne]: userId },
        isActive: true
      }
    });

    // 응답용 메시지 형식
    const responseMessage = {
      id: newMessage.id,
      chatRoomId: newMessage.chatRoomId,
      senderId: newMessage.senderId,
      senderName: newMessage.senderName,
      message: newMessage.message,
      messageType: newMessage.messageType,
      timestamp: newMessage.createdAt.toISOString(),
      isMe: true,
      isRead: false,
      replyTo: replyToId ? await ChatMessage.findByPk(replyToId, {
        attributes: ['id', 'message', 'senderName']
      }) : null
    };

    // WebSocket으로 다른 참여자들에게 실시간 전송
    if (req.io) {
      req.io.to(`room_${roomId}`).emit('new_message', {
        ...responseMessage,
        isMe: false,
      });
    }

    res.json({
      success: true,
      data: responseMessage,
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      success: false,
      message: '메시지 전송에 실패했습니다.',
    });
  }
});

// 채팅방 생성 (모임용)
router.post('/rooms/meetup', async (req, res) => {
  try {
    const { meetupId, title, userId, userName } = req.body;

    if (!meetupId || !title || !userId) {
      return res.status(400).json({
        success: false,
        message: '필수 정보가 누락되었습니다.',
      });
    }

    // 이미 존재하는 모임 채팅방 확인
    let existingRoom = await ChatRoom.findOne({
      where: { type: 'meetup', meetupId },
      include: [
        {
          model: ChatParticipant,
          as: 'participants',
          where: { isActive: true },
          required: false
        }
      ]
    });

    if (existingRoom) {
      // 기존 채팅방에 사용자가 이미 참여하고 있는지 확인
      const existingParticipant = await ChatParticipant.findOne({
        where: { chatRoomId: existingRoom.id, userId, isActive: true }
      });

      if (!existingParticipant) {
        // 기존 채팅방에 사용자 추가
        await ChatParticipant.create({
          chatRoomId: existingRoom.id,
          userId,
          userName: userName || '사용자',
          role: 'member'
        });
      }
      
      return res.json({
        success: true,
        data: {
          id: existingRoom.id,
          type: existingRoom.type,
          meetupId: existingRoom.meetupId,
          title: existingRoom.title,
          isActive: existingRoom.isActive
        },
      });
    }

    // 새 채팅방 생성
    const newChatRoom = await ChatRoom.create({
      type: 'meetup',
      meetupId,
      title,
      description: `${title} 모임 채팅방`,
      isActive: true,
      createdBy: userId
    });

    // 생성자를 채팅방 참가자로 추가
    await ChatParticipant.create({
      chatRoomId: newChatRoom.id,
      userId,
      userName: userName || '사용자',
      role: 'owner'
    });

    res.json({
      success: true,
      data: {
        id: newChatRoom.id,
        type: newChatRoom.type,
        meetupId: newChatRoom.meetupId,
        title: newChatRoom.title,
        isActive: newChatRoom.isActive
      },
    });
  } catch (error) {
    console.error('Create meetup chat room error:', error);
    res.status(500).json({
      success: false,
      message: '채팅방 생성에 실패했습니다.',
    });
  }
});

// 모임 채팅방에 사용자 추가
router.post('/rooms/meetup/:meetupId/add-user', async (req, res) => {
  try {
    const { meetupId } = req.params;
    const { userId, userName } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: '사용자 ID가 필요합니다.',
      });
    }

    // 모임 채팅방 찾기
    const chatRoom = await ChatRoom.findOne({
      where: { type: 'meetup', meetupId: parseInt(meetupId) }
    });

    if (!chatRoom) {
      return res.status(404).json({
        success: false,
        message: '채팅방을 찾을 수 없습니다.',
      });
    }

    // 사용자가 이미 참여하고 있는지 확인
    const existingParticipant = await ChatParticipant.findOne({
      where: { chatRoomId: chatRoom.id, userId, isActive: true }
    });

    if (!existingParticipant) {
      // 사용자를 채팅방에 추가
      await ChatParticipant.create({
        chatRoomId: chatRoom.id,
        userId,
        userName: userName || '사용자',
        role: 'member'
      });

      // 시스템 메시지 추가 (선택사항)
      await ChatMessage.create({
        chatRoomId: chatRoom.id,
        senderId: 'system',
        senderName: '시스템',
        message: `${userName || '사용자'}님이 참가했습니다.`,
        messageType: 'system'
      });
    }

    res.json({
      success: true,
      data: {
        id: chatRoom.id,
        type: chatRoom.type,
        meetupId: chatRoom.meetupId,
        title: chatRoom.title,
        isActive: chatRoom.isActive
      },
    });
  } catch (error) {
    console.error('Add user to chat room error:', error);
    res.status(500).json({
      success: false,
      message: '사용자 추가에 실패했습니다.',
    });
  }
});

// 1:1 채팅방 생성
router.post('/rooms/direct', async (req, res) => {
  try {
    const { participantId, participantName, userId, userName } = req.body;

    if (!participantId || !userId) {
      return res.status(400).json({
        success: false,
        message: '필수 정보가 누락되었습니다.',
      });
    }

    // 이미 존재하는 1:1 채팅방 확인
    const existingRoom = await ChatRoom.findOne({
      where: { type: 'direct' },
      include: [
        {
          model: ChatParticipant,
          as: 'participants',
          where: { 
            userId: { [Op.in]: [userId, participantId] },
            isActive: true 
          },
          required: true
        }
      ],
      having: sequelize.literal('COUNT(participants.id) = 2')
    });

    if (existingRoom) {
      return res.json({
        success: true,
        data: {
          id: existingRoom.id,
          type: existingRoom.type,
          title: existingRoom.title,
          isActive: existingRoom.isActive
        },
      });
    }

    // 새 1:1 채팅방 생성
    const newChatRoom = await ChatRoom.create({
      type: 'direct',
      title: participantName || '1:1 채팅',
      description: `${userName || '사용자'}와 ${participantName || '사용자'}의 1:1 채팅`,
      isActive: true,
      createdBy: userId
    });

    // 두 사용자를 채팅방에 추가
    await ChatParticipant.bulkCreate([
      {
        chatRoomId: newChatRoom.id,
        userId,
        userName: userName || '사용자',
        role: 'member'
      },
      {
        chatRoomId: newChatRoom.id,
        userId: participantId,
        userName: participantName || '사용자',
        role: 'member'
      }
    ]);

    res.json({
      success: true,
      data: {
        id: newChatRoom.id,
        type: newChatRoom.type,
        title: newChatRoom.title,
        isActive: newChatRoom.isActive
      },
    });
  } catch (error) {
    console.error('Create direct chat room error:', error);
    res.status(500).json({
      success: false,
      message: '채팅방 생성에 실패했습니다.',
    });
  }
});

module.exports = router;