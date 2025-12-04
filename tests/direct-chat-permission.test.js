const request = require('supertest');
const { sequelize } = require('../backend/src/config/database');

const API_URL = 'http://localhost:3001';

describe('1-on-1 Chat Permission System Tests', () => {
  // Test user IDs (using actual IDs from database)
  const USER_1 = '896b40eb-41ab-466d-86a8-73ca2aab2a17'; // 이경윤 - male, ALLOW_ALL
  const USER_2 = '44444444-4444-4444-4444-444444444444'; // 테스트유저4 - female, SAME_GENDER  
  const USER_3 = '3ad0d44a-6493-4bf2-ba6c-2a4592669ef2'; // 오혜영 - male, BLOCKED
  
  const MEETUP_ENABLED = '616624e2-9458-4572-afc1-eb7aa440021e'; // allow_direct_chat: true
  const MEETUP_DISABLED = '6187d1e6-1426-445a-8cfd-d0494e2a402c'; // allow_direct_chat: false

  describe('Permission Check API', () => {
    test('should return MEETUP_DISABLED when meetup disallows direct chat', async () => {
      const response = await request(API_URL)
        .get('/api/chat/check-direct-chat-permission')
        .query({
          currentUserId: USER_1,
          targetUserId: USER_2,
          meetupId: MEETUP_DISABLED
        })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          allowed: false,
          reason: 'MEETUP_DISABLED'
        }
      });
    });

    test('should return GENDER_RESTRICTED when gender mismatch for SAME_GENDER user', async () => {
      const response = await request(API_URL)
        .get('/api/chat/check-direct-chat-permission')
        .query({
          currentUserId: USER_1, // male, ALLOW_ALL
          targetUserId: USER_2,  // female, SAME_GENDER
          meetupId: MEETUP_ENABLED
        })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          allowed: false,
          reason: 'GENDER_RESTRICTED'
        }
      });
    });

    test('should return TARGET_BLOCKED_ALL when target user blocks all chats', async () => {
      const response = await request(API_URL)
        .get('/api/chat/check-direct-chat-permission')
        .query({
          currentUserId: USER_1, // male, ALLOW_ALL
          targetUserId: USER_3,  // male, BLOCKED
          meetupId: MEETUP_ENABLED
        })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          allowed: false,
          reason: 'TARGET_BLOCKED_ALL'
        }
      });
    });

    test('should allow chat when all conditions are met', async () => {
      const response = await request(API_URL)
        .get('/api/chat/check-direct-chat-permission')
        .query({
          currentUserId: USER_2, // female, SAME_GENDER
          targetUserId: USER_1,  // male, ALLOW_ALL (target allows all)
          meetupId: MEETUP_ENABLED
        })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          allowed: true
        }
      });
    });

    test('should return USER_NOT_FOUND for invalid user IDs', async () => {
      const response = await request(API_URL)
        .get('/api/chat/check-direct-chat-permission')
        .query({
          currentUserId: '00000000-0000-0000-0000-000000000000',
          targetUserId: '11111111-1111-1111-1111-111111111111',
          meetupId: MEETUP_ENABLED
        })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          allowed: false,
          reason: 'USER_NOT_FOUND'
        }
      });
    });

    test('should return MEETUP_NOT_FOUND for invalid meetup ID', async () => {
      const response = await request(API_URL)
        .get('/api/chat/check-direct-chat-permission')
        .query({
          currentUserId: USER_1,
          targetUserId: USER_2,
          meetupId: '00000000-0000-0000-0000-000000000000'
        })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          allowed: false,
          reason: 'MEETUP_NOT_FOUND'
        }
      });
    });

    test('should handle missing query parameters', async () => {
      const response = await request(API_URL)
        .get('/api/chat/check-direct-chat-permission')
        .expect(200);

      expect(response.body).toEqual({
        success: false,
        message: '권한 체크에 실패했습니다.'
      });
    });

    test('should handle invalid UUID format', async () => {
      const response = await request(API_URL)
        .get('/api/chat/check-direct-chat-permission')
        .query({
          currentUserId: 'invalid-uuid',
          targetUserId: USER_2,
          meetupId: MEETUP_ENABLED
        })
        .expect(200);

      expect(response.body).toEqual({
        success: false,
        message: '권한 체크에 실패했습니다.'
      });
    });
  });

  describe('Permission Logic Matrix', () => {
    const permissionTests = [
      {
        description: 'Male ALLOW_ALL → Female SAME_GENDER (meetup enabled)',
        from: { gender: 'male', setting: 'ALLOW_ALL' },
        to: { gender: 'female', setting: 'SAME_GENDER' },
        meetupEnabled: true,
        expected: { allowed: false, reason: 'GENDER_RESTRICTED' }
      },
      {
        description: 'Female SAME_GENDER → Male ALLOW_ALL (meetup enabled)',
        from: { gender: 'female', setting: 'SAME_GENDER' },
        to: { gender: 'male', setting: 'ALLOW_ALL' },
        meetupEnabled: true,
        expected: { allowed: true }
      },
      {
        description: 'Male ALLOW_ALL → Male BLOCKED (meetup enabled)',
        from: { gender: 'male', setting: 'ALLOW_ALL' },
        to: { gender: 'male', setting: 'BLOCKED' },
        meetupEnabled: true,
        expected: { allowed: false, reason: 'TARGET_BLOCKED_ALL' }
      },
      {
        description: 'Any user → Any user (meetup disabled)',
        from: { gender: 'male', setting: 'ALLOW_ALL' },
        to: { gender: 'female', setting: 'ALLOW_ALL' },
        meetupEnabled: false,
        expected: { allowed: false, reason: 'MEETUP_DISABLED' }
      }
    ];

    permissionTests.forEach(test => {
      it(test.description, async () => {
        const meetupId = test.meetupEnabled ? MEETUP_ENABLED : MEETUP_DISABLED;
        let fromUserId, toUserId;

        // Map test scenarios to actual user IDs
        if (test.from.gender === 'male' && test.from.setting === 'ALLOW_ALL') {
          fromUserId = USER_1;
        } else if (test.from.gender === 'female' && test.from.setting === 'SAME_GENDER') {
          fromUserId = USER_2;
        }

        if (test.to.gender === 'male' && test.to.setting === 'ALLOW_ALL') {
          toUserId = USER_1;
        } else if (test.to.gender === 'female' && test.to.setting === 'SAME_GENDER') {
          toUserId = USER_2;
        } else if (test.to.gender === 'male' && test.to.setting === 'BLOCKED') {
          toUserId = USER_3;
        }

        const response = await request(API_URL)
          .get('/api/chat/check-direct-chat-permission')
          .query({
            currentUserId: fromUserId,
            targetUserId: toUserId,
            meetupId
          })
          .expect(200);

        expect(response.body).toEqual({
          success: true,
          data: test.expected
        });
      });
    });
  });

  describe('Database Integration', () => {
    test('should read user settings from database correctly', async () => {
      const [users] = await sequelize.query(`
        SELECT id, name, gender, direct_chat_setting 
        FROM users 
        WHERE id IN ($1, $2, $3)
        ORDER BY created_at
      `, {
        bind: [USER_1, USER_2, USER_3]
      });

      expect(users).toHaveLength(3);
      
      const user1 = users.find(u => u.id === USER_1);
      const user2 = users.find(u => u.id === USER_2);
      const user3 = users.find(u => u.id === USER_3);

      expect(user1).toMatchObject({
        gender: 'male',
        direct_chat_setting: 'ALLOW_ALL'
      });

      expect(user2).toMatchObject({
        gender: 'female', 
        direct_chat_setting: 'SAME_GENDER'
      });

      expect(user3).toMatchObject({
        gender: 'male',
        direct_chat_setting: 'BLOCKED'
      });
    });

    test('should read meetup settings from database correctly', async () => {
      const [meetups] = await sequelize.query(`
        SELECT id, title, allow_direct_chat
        FROM meetups
        WHERE id IN ($1, $2)
      `, {
        bind: [MEETUP_ENABLED, MEETUP_DISABLED]
      });

      expect(meetups).toHaveLength(2);
      
      const enabledMeetup = meetups.find(m => m.id === MEETUP_ENABLED);
      const disabledMeetup = meetups.find(m => m.id === MEETUP_DISABLED);

      expect(enabledMeetup.allow_direct_chat).toBe(true);
      expect(disabledMeetup.allow_direct_chat).toBe(false);
    });
  });

  describe('Security Tests', () => {
    test('should require all parameters', async () => {
      const testCases = [
        { currentUserId: USER_1, targetUserId: USER_2 }, // missing meetupId
        { currentUserId: USER_1, meetupId: MEETUP_ENABLED }, // missing targetUserId
        { targetUserId: USER_2, meetupId: MEETUP_ENABLED } // missing currentUserId
      ];

      for (const params of testCases) {
        const response = await request(API_URL)
          .get('/api/chat/check-direct-chat-permission')
          .query(params)
          .expect(200);

        expect(response.body).toEqual({
          success: false,
          message: '권한 체크에 실패했습니다.'
        });
      }
    });

    test('should prevent self-chat permission check', async () => {
      const response = await request(API_URL)
        .get('/api/chat/check-direct-chat-permission')
        .query({
          currentUserId: USER_1,
          targetUserId: USER_1, // same user
          meetupId: MEETUP_ENABLED
        })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          allowed: false,
          reason: 'SELF_CHAT_NOT_ALLOWED'
        }
      });
    });
  });
});