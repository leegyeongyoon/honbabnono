const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models');

// 사용자 프로필 조회
const getProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.userId, {
      attributes: { exclude: ['password'] }
    });

    if (!user) {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다' });
    }

    res.json({ user });
  } catch (error) {
    console.error('프로필 조회 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
};

// 사용자 프로필 업데이트
const updateProfile = async (req, res) => {
  try {
    const { name, phone, preferences, gender, directChatSetting } = req.body;
    const userId = req.user.userId;

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다' });
    }

    // directChatSetting 유효성 검사
    if (directChatSetting && !['ALLOW_ALL', 'SAME_GENDER', 'BLOCKED'].includes(directChatSetting)) {
      return res.status(400).json({ error: '유효하지 않은 1대1 채팅 설정입니다' });
    }

    await user.update({
      name: name || user.name,
      phone: phone || user.phone,
      preferences: preferences || user.preferences,
      gender: gender || user.gender,
      directChatSetting: directChatSetting || user.directChatSetting
    });

    const updatedUser = await User.findByPk(userId, {
      attributes: { exclude: ['password'] }
    });

    res.json({ 
      message: '프로필이 업데이트되었습니다',
      user: updatedUser 
    });
  } catch (error) {
    console.error('프로필 업데이트 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
};

// 카카오 로그인 전용 앱이므로 기본 회원가입/로그인 제거
// register와 login은 카카오 OAuth를 통해서만 가능

// 카카오 로그인은 main server(index.js)에서 처리됨

// 사용자 목록 조회 (관리자용)
const getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const { count, rows: users } = await User.findAndCountAll({
      attributes: { exclude: ['password'] },
      offset: parseInt(offset),
      limit: parseInt(limit),
      order: [['createdAt', 'DESC']]
    });

    res.json({
      users,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('사용자 목록 조회 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  getUsers
  // register, login 제거됨 - 카카오 OAuth만 사용
};