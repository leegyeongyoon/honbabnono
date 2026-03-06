const { z } = require('zod');

const updateProfileSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  bio: z.string().max(500).optional(),
  phone: z.string().regex(/^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/).optional(),
  profileImage: z.string().url().optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  birthYear: z.number().int().min(1950).max(2010).optional(),
  preferredFood: z.array(z.string()).max(10).optional(),
  interests: z.array(z.string()).max(10).optional(),
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

module.exports = { updateProfileSchema, privacySettingsSchema, notificationSettingsSchema };
