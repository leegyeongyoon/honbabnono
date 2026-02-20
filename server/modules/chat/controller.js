const pool = require('../../config/database');

// 1대1 채팅 권한 체크
exports.checkDirectChatPermission = async (req, res) => {
  try {
    const { currentUserId, targetUserId, meetupId } = req.query;

    if (!currentUserId || !targetUserId) {
      return res.status(400).json({
        success: false,
        message: '필수 파라미터가 누락되었습니다.',
      });
    }

    if (currentUserId === targetUserId) {
      return res.json({
        success: true,
        data: { allowed: false, reason: 'SELF_CHAT_NOT_ALLOWED' }
      });
    }

    const userQuery = `
      SELECT id, gender, direct_chat_setting
      FROM users
      WHERE id IN ($1, $2)
    `;
    const userResult = await pool.query(userQuery, [currentUserId, targetUserId]);

    if (userResult.rows.length !== 2) {
      return res.json({
        success: true,
        data: { allowed: false, reason: 'USER_NOT_FOUND' }
      });
    }

    const currentUser = userResult.rows.find(u => u.id === currentUserId);
    const targetUser = userResult.rows.find(u => u.id === targetUserId);

    if (targetUser.direct_chat_setting === 'BLOCKED') {
      return res.json({
        success: true,
        data: { allowed: false, reason: 'TARGET_BLOCKED_ALL' }
      });
    }

    const isSameGender = currentUser.gender === targetUser.gender;
    const allowOppositeGender = targetUser.direct_chat_setting === 'ALLOW_ALL';

    if (meetupId) {
      const meetupQuery = `SELECT allow_direct_chat FROM meetups WHERE id = $1`;
      const meetupResult = await pool.query(meetupQuery, [meetupId]);

      if (meetupResult.rows.length === 0) {
        return res.json({
          success: true,
          data: { allowed: false, reason: 'MEETUP_NOT_FOUND' }
        });
      }

      if (!meetupResult.rows[0].allow_direct_chat) {
        return res.json({
          success: true,
          data: { allowed: false, reason: 'MEETUP_DISABLED' }
        });
      }

      if (!isSameGender && !allowOppositeGender) {
        return res.json({
          success: true,
          data: { allowed: false, reason: 'GENDER_RESTRICTED' }
        });
      }
    } else {
      if (targetUser.direct_chat_setting === 'SAME_GENDER' && !isSameGender) {
        return res.json({
          success: true,
          data: { allowed: false, reason: 'GENDER_RESTRICTED' }
        });
      }
    }

    res.json({
      success: true,
      data: { allowed: true }
    });
  } catch (error) {
    console.error('Direct chat permission check error:', error);
    res.status(500).json({
      success: false,
      message: '권한 체크에 실패했습니다.',
    });
  }
};

// 채팅방 목록 조회
exports.getChatRooms = async (req, res) => {
  try {
    const userId = req.user.userId;
    console.log('🔍 채팅방 목록 조회 요청:', { userId });

    const result = await pool.query(`
      SELECT
        cr.id,
        cr.type,
        cr."meetupId",
        cr.title,
        cr.description,
        cr."lastMessage",
        cr."lastMessageTime",
        cr."isActive",
        cp."lastReadAt",
        cp."joinedAt",
        (
          SELECT COUNT(*)::int
          FROM chat_messages cm
          WHERE cm."chatRoomId" = cr.id
            AND cm."senderId" <> $1
            AND cm."createdAt" > COALESCE(cp."lastReadAt", cp."joinedAt", '1970-01-01'::timestamp)
        ) as "unreadCount"
      FROM chat_rooms cr
      JOIN chat_participants cp ON cr.id = cp."chatRoomId"
      WHERE cp."userId" = $1 AND cr."isActive" = true
      ORDER BY COALESCE(cr."lastMessageTime", cr."createdAt") DESC
    `, [userId]);

    const formattedRooms = result.rows.map(room => ({
      id: room.id,
      type: room.type,
      meetupId: room.meetupId,
      title: room.title,
      participants: [],
      lastMessage: room.lastMessage || '',
      lastTime: room.lastMessageTime ? new Date(room.lastMessageTime).toISOString() : new Date().toISOString(),
      unreadCount: room.unreadCount || 0,
      isActive: room.isActive,
      isOnline: true
    }));

    res.json({
      success: true,
      data: formattedRooms
    });
  } catch (error) {
    console.error('채팅방 목록 조회 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
};

// 읽지 않은 채팅 수 조회
exports.getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await pool.query(`
      SELECT COUNT(*) as total_unread
      FROM chat_messages cm
      JOIN chat_participants cp ON cm."chatRoomId" = cp."chatRoomId"
      WHERE cp."userId" = $1
        AND cp."isActive" = true
        AND cm."senderId" <> $1
        AND cm."createdAt" > COALESCE(cp."lastReadAt", cp."joinedAt", '1970-01-01'::timestamp)
    `, [userId]);

    const unreadCount = parseInt(result.rows[0].total_unread) || 0;

    res.json({
      success: true,
      unreadCount
    });

  } catch (error) {
    console.error('읽지 않은 채팅 수 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: '읽지 않은 채팅 수 조회에 실패했습니다.'
    });
  }
};

// 모임 ID로 채팅방 조회
exports.getChatRoomByMeetup = async (req, res) => {
  try {
    const { meetupId } = req.params;

    const chatRoomResult = await pool.query(`
      SELECT
        cr.id,
        cr.type,
        cr."meetupId",
        cr.title,
        cr.description,
        cr."lastMessage",
        cr."lastMessageTime",
        cr."isActive"
      FROM chat_rooms cr
      WHERE cr."meetupId" = $1 AND cr.type = 'meetup' AND cr."isActive" = true
      LIMIT 1
    `, [meetupId]);

    if (chatRoomResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '해당 약속의 채팅방을 찾을 수 없습니다'
      });
    }

    const chatRoom = chatRoomResult.rows[0];

    res.json({
      success: true,
      data: {
        chatRoomId: chatRoom.id,
        meetupId: chatRoom.meetupId,
        title: chatRoom.title
      }
    });
  } catch (error) {
    console.error('모임 채팅방 조회 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
};

// 채팅 메시지 조회
exports.getMessages = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    const currentUserId = req.user.userId;

    // 채팅방 정보 조회
    const chatRoomResult = await pool.query(`
      SELECT id, title, type, "meetupId", description
      FROM chat_rooms
      WHERE id = $1
    `, [id]);

    if (chatRoomResult.rows.length === 0) {
      return res.status(404).json({ error: '채팅방을 찾을 수 없습니다' });
    }

    const chatRoom = chatRoomResult.rows[0];

    // 채팅 메시지 조회 (차단된 사용자 제외)
    const messagesResult = await pool.query(`
      SELECT
        cm.id,
        cm."chatRoomId",
        cm."senderId",
        cm."senderName",
        cm.message,
        cm."messageType",
        cm."isEdited",
        cm."editedAt",
        cm."isDeleted",
        cm."replyToId",
        cm."fileUrl",
        cm."fileName",
        cm."fileSize",
        cm."createdAt",
        cm."updatedAt",
        u.profile_image as "profileImage"
      FROM chat_messages cm
      LEFT JOIN users u ON cm."senderId" = u.id
      WHERE cm."chatRoomId" = $1
        AND cm."isDeleted" = false
        AND cm."senderId" NOT IN (
          SELECT blocked_user_id
          FROM user_blocked_users
          WHERE user_id = $4
        )
      ORDER BY cm."createdAt" DESC
      LIMIT $2 OFFSET $3
    `, [id, parseInt(limit), parseInt(offset), currentUserId]);

    const messages = messagesResult.rows.reverse().map(msg => ({
      id: msg.id,
      chatRoomId: msg.chatRoomId,
      senderId: msg.senderId,
      senderName: msg.senderName,
      profileImage: msg.profileImage || null,
      message: msg.message,
      messageType: msg.messageType || 'text',
      timestamp: msg.createdAt,
      isMe: msg.senderId === currentUserId,
      isRead: true,
      isEdited: msg.isEdited,
      editedAt: msg.editedAt,
      replyToId: msg.replyToId,
      fileUrl: msg.fileUrl,
      fileName: msg.fileName,
      fileSize: msg.fileSize
    }));

    res.json({
      success: true,
      chatRoom,
      messages,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        hasMore: messagesResult.rows.length === parseInt(limit)
      }
    });

  } catch (error) {
    console.error('채팅 메시지 조회 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
};

// 메시지 전송
exports.sendMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { message, messageType = 'text' } = req.body;
    const userId = req.user.userId;
    const userName = req.user.name;

    const result = await pool.query(`
      INSERT INTO chat_messages (
        id, "chatRoomId", "senderId", "senderName", message,
        "messageType", "createdAt", "updatedAt"
      )
      VALUES (
        gen_random_uuid(), $1, $2, $3, $4, $5, NOW(), NOW()
      )
      RETURNING *
    `, [id, userId, userName, message, messageType]);

    // 채팅방 마지막 메시지 업데이트
    await pool.query(`
      UPDATE chat_rooms
      SET "lastMessage" = $1, "lastMessageTime" = NOW(), "updatedAt" = NOW()
      WHERE id = $2
    `, [message, id]);

    const savedMessage = result.rows[0];

    // Socket.IO 실시간 메시지 브로드캐스트
    const io = req.app.get('io');
    if (io) {
      const newMessagePayload = {
        id: savedMessage.id,
        chatRoomId: savedMessage.chatRoomId,
        senderId: savedMessage.senderId,
        senderName: savedMessage.senderName,
        message: savedMessage.message,
        messageType: savedMessage.messageType || 'text',
        timestamp: savedMessage.createdAt,
        createdAt: savedMessage.createdAt
      };

      // 채팅방의 모든 참가자에게 실시간 전송
      io.to(`room:${id}`).emit('new_message', newMessagePayload);

      // 채팅방 참가자들에게 읽지 않은 수 업데이트 알림
      io.to(`room:${id}`).emit('chat_room_updated', {
        roomId: id,
        lastMessage: message,
        lastMessageTime: savedMessage.createdAt
      });
    }

    res.json({
      success: true,
      message: savedMessage
    });

  } catch (error) {
    console.error('메시지 전송 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
};

// 메시지 읽음 처리
exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const readAt = new Date().toISOString();

    await pool.query(`
      UPDATE chat_participants
      SET "lastReadAt" = NOW()
      WHERE "chatRoomId" = $1 AND "userId" = $2
    `, [id, userId]);

    // Socket.IO 실시간 읽음 상태 브로드캐스트
    const io = req.app.get('io');
    if (io) {
      io.to(`room:${id}`).emit('messages_read', {
        userId,
        roomId: id,
        readAt
      });
    }

    res.json({
      success: true,
      message: '읽음 처리 완료'
    });

  } catch (error) {
    console.error('읽음 처리 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
};

// 채팅방 나가기
exports.leaveChatRoom = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    await pool.query(`
      DELETE FROM chat_participants
      WHERE "chatRoomId" = $1 AND "userId" = $2
    `, [id, userId]);

    // Socket.IO 실시간 퇴장 알림
    const io = req.app.get('io');
    if (io) {
      io.to(`room:${id}`).emit('participant_left', {
        userId,
        roomId: id,
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      message: '채팅방에서 나갔습니다.'
    });

  } catch (error) {
    console.error('채팅방 나가기 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
};

// 모든 채팅 읽음 처리
exports.markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.userId;

    const now = new Date();
    const updateResult = await pool.query(`
      UPDATE chat_participants
      SET "lastReadAt" = $1
      WHERE "userId" = $2
      RETURNING "chatRoomId"
    `, [now, userId]);

    // Socket.IO 실시간 읽음 상태 브로드캐스트 (모든 채팅방)
    const io = req.app.get('io');
    if (io && updateResult.rows.length > 0) {
      const readAt = now.toISOString();
      updateResult.rows.forEach(row => {
        io.to(`room:${row.chatRoomId}`).emit('messages_read', {
          userId,
          roomId: row.chatRoomId,
          readAt
        });
      });
    }

    res.json({
      success: true,
      message: '모든 채팅방을 읽음으로 처리했습니다',
      updatedCount: updateResult.rowCount
    });

  } catch (error) {
    console.error('모든 채팅방 읽음 처리 오류:', error);
    res.status(500).json({
      success: false,
      error: '모든 채팅방 읽음 처리에 실패했습니다'
    });
  }
};
