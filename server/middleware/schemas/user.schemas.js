const { z } = require('zod');

const updateProfileSchema = z.object({
  name: z.string().min(2).max(20).optional(),
  nickname: z.string().min(2).max(20).optional(),
  bio: z.string().max(200).optional(),
  phone: z.string().regex(/^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/).optional(),
  profileImage: z.string().url().optional(),
  profile_image: z.string().url().optional(),
  gender: z.enum(['남성', '여성', '기타', 'male', 'female', 'other']).optional(),
  birth_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  birthYear: z.number().int().min(1950).max(2010).optional(),
  preferredFood: z.array(z.string()).max(10).optional(),
  interests: z.array(z.string()).max(10).optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, '비밀번호는 최소 8자 이상이어야 합니다'),
});

const privacySettingsSchema = z.object({
  showProfile: z.boolean().optional(),
  showActivity: z.boolean().optional(),
  showBabalScore: z.boolean().optional(),
  allowDirectChat: z.boolean().optional(),
});

const notificationSettingsSchema = z.object({
  pushEnabled: z.boolean().optional(),
  chatMessages: z.boolean().optional(),
  meetupReminders: z.boolean().optional(),
  systemAnnouncements: z.boolean().optional(),
});

module.exports = { updateProfileSchema, changePasswordSchema, privacySettingsSchema, notificationSettingsSchema };
