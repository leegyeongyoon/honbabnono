const { z } = require('zod');

const registerDeviceTokenSchema = z.object({
  token: z.string().min(1, '디바이스 토큰이 필요합니다'),
  platform: z.enum(['ios', 'android', 'web']).optional(),
});

const updateSettingsSchema = z.object({
  pushEnabled: z.boolean().optional(),
  chatMessages: z.boolean().optional(),
  meetupReminders: z.boolean().optional(),
  systemAnnouncements: z.boolean().optional(),
  meetup_reminder: z.boolean().optional(),
  chat_message: z.boolean().optional(),
  review_received: z.boolean().optional(),
  point_change: z.boolean().optional(),
  marketing: z.boolean().optional(),
});

module.exports = { registerDeviceTokenSchema, updateSettingsSchema };
