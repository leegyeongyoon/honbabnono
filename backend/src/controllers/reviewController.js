const { Review, Meetup, User, MeetupParticipant } = require('../models');
const { Op } = require('sequelize');

// 리뷰 작성
const createReview = async (req, res) => {
  try {
    const { id: meetupId } = req.params;
    const { revieweeId, rating, content, tags, isAnonymous } = req.body;
    const reviewerId = req.user.userId;

    // 유효성 검사
    if (!revieweeId || !rating) {
      return res.status(400).json({ error: '리뷰 대상과 평점은 필수입니다' });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: '평점은 1~5 사이여야 합니다' });
    }

    if (reviewerId === revieweeId) {
      return res.status(400).json({ error: '자기 자신에게 리뷰를 작성할 수 없습니다' });
    }

    // 모임 조회
    const meetup = await Meetup.findByPk(meetupId);
    if (!meetup) {
      return res.status(404).json({ error: '모임을 찾을 수 없습니다' });
    }

    // 모임이 종료 상태인지 확인
    if (meetup.status !== '종료') {
      return res.status(400).json({
        error: '모임이 종료된 후에만 리뷰를 작성할 수 있습니다',
        currentStatus: meetup.status
      });
    }

    // 리뷰 작성자가 GPS 인증(출석 완료)했는지 확인
    const reviewerParticipant = await MeetupParticipant.findOne({
      where: {
        meetupId,
        userId: reviewerId,
        status: '참가승인',
        attended: true
      }
    });

    if (!reviewerParticipant) {
      return res.status(403).json({
        error: 'GPS 체크인을 완료한 참가자만 리뷰를 작성할 수 있습니다'
      });
    }

    // 리뷰 대상이 해당 모임의 참가자인지 확인
    const revieweeParticipant = await MeetupParticipant.findOne({
      where: {
        meetupId,
        userId: revieweeId,
        status: '참가승인'
      }
    });

    if (!revieweeParticipant) {
      return res.status(400).json({
        error: '해당 모임의 참가자에게만 리뷰를 작성할 수 있습니다'
      });
    }

    // 중복 리뷰 확인
    const existingReview = await Review.findOne({
      where: { meetupId, reviewerId, revieweeId }
    });

    if (existingReview) {
      return res.status(400).json({ error: '이미 이 참가자에게 리뷰를 작성했습니다' });
    }

    // 리뷰어 정보 조회 (reviewer_name 필드를 위해)
    const reviewer = await User.findByPk(reviewerId, {
      attributes: ['id', 'name']
    });

    if (!reviewer) {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다' });
    }

    // 리뷰 생성
    const review = await Review.create({
      meetupId,
      reviewerId,
      revieweeId,
      reviewerName: reviewer.name || '익명', // 기존 테이블 호환성을 위한 필드
      rating,
      content: content || null,
      tags: tags || [],
      isAnonymous: isAnonymous || false
    });

    // 리뷰 대상자의 평균 평점 업데이트
    await updateUserRating(revieweeId);

    // 리뷰어 정보 포함하여 반환
    const createdReview = await Review.findByPk(review.id, {
      include: [
        {
          model: User,
          as: 'reviewer',
          attributes: ['id', 'name', 'profileImage']
        },
        {
          model: User,
          as: 'reviewee',
          attributes: ['id', 'name', 'profileImage']
        }
      ]
    });

    res.status(201).json({
      message: '리뷰가 작성되었습니다',
      review: createdReview
    });
  } catch (error) {
    console.error('리뷰 작성 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
};

// 사용자 평균 평점 업데이트 헬퍼 함수
const updateUserRating = async (userId) => {
  try {
    const reviews = await Review.findAll({
      where: { revieweeId: userId },
      attributes: ['rating']
    });

    if (reviews.length > 0) {
      const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
      const averageRating = (totalRating / reviews.length).toFixed(1);

      await User.update(
        { rating: parseFloat(averageRating) },
        { where: { id: userId } }
      );
    }
  } catch (error) {
    console.error('사용자 평점 업데이트 오류:', error);
  }
};

// 모임 리뷰 목록 조회
const getMeetupReviews = async (req, res) => {
  try {
    const { id: meetupId } = req.params;
    const userId = req.user?.userId;

    const meetup = await Meetup.findByPk(meetupId);
    if (!meetup) {
      return res.status(404).json({ error: '모임을 찾을 수 없습니다' });
    }

    const reviews = await Review.findAll({
      where: { meetupId },
      include: [
        {
          model: User,
          as: 'reviewer',
          attributes: ['id', 'name', 'profileImage']
        },
        {
          model: User,
          as: 'reviewee',
          attributes: ['id', 'name', 'profileImage']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    // 익명 리뷰 처리
    const processedReviews = reviews.map(review => {
      const reviewData = review.toJSON();
      if (reviewData.isAnonymous && reviewData.reviewer.id !== userId) {
        reviewData.reviewer = {
          id: null,
          name: '익명',
          profileImage: null
        };
      }
      return reviewData;
    });

    // 내가 작성한 리뷰, 내가 받은 리뷰 분류
    const myWrittenReviews = processedReviews.filter(r => r.reviewerId === userId);
    const myReceivedReviews = processedReviews.filter(r => r.revieweeId === userId);

    res.json({
      meetupId,
      totalReviews: reviews.length,
      reviews: processedReviews,
      myWrittenReviews,
      myReceivedReviews
    });
  } catch (error) {
    console.error('모임 리뷰 조회 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
};

// 리뷰 작성 가능한 대상 목록 조회
const getReviewableParticipants = async (req, res) => {
  try {
    const { id: meetupId } = req.params;
    const userId = req.user.userId;

    const meetup = await Meetup.findByPk(meetupId);
    if (!meetup) {
      return res.status(404).json({ error: '모임을 찾을 수 없습니다' });
    }

    // 모임이 종료 상태인지 확인
    if (meetup.status !== '종료') {
      return res.status(400).json({
        error: '모임이 종료된 후에만 리뷰를 작성할 수 있습니다',
        currentStatus: meetup.status
      });
    }

    // 내가 GPS 인증(출석 완료)했는지 확인
    const myParticipant = await MeetupParticipant.findOne({
      where: {
        meetupId,
        userId,
        status: '참가승인',
        attended: true
      }
    });

    if (!myParticipant) {
      return res.status(403).json({
        error: 'GPS 체크인을 완료한 참가자만 리뷰를 작성할 수 있습니다'
      });
    }

    // 모임의 모든 승인된 참가자 조회 (자신 제외)
    const participants = await MeetupParticipant.findAll({
      where: {
        meetupId,
        status: '참가승인',
        userId: { [Op.ne]: userId }
      },
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'profileImage', 'rating']
      }]
    });

    // 이미 리뷰를 작성한 대상 조회
    const myWrittenReviews = await Review.findAll({
      where: { meetupId, reviewerId: userId },
      attributes: ['revieweeId']
    });
    const reviewedUserIds = myWrittenReviews.map(r => r.revieweeId);

    // 리뷰 가능 여부 표시
    const reviewableParticipants = participants.map(p => ({
      id: p.userId,
      name: p.user.name,
      profileImage: p.user.profileImage,
      rating: p.user.rating,
      isHost: p.userId === meetup.hostId,
      attended: p.attended,
      alreadyReviewed: reviewedUserIds.includes(p.userId)
    }));

    res.json({
      meetupId,
      participants: reviewableParticipants,
      canWriteReview: true,
      reviewedCount: reviewedUserIds.length,
      totalParticipants: participants.length
    });
  } catch (error) {
    console.error('리뷰 가능 대상 조회 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
};

// 사용자가 받은 리뷰 목록 조회
const getUserReviews = async (req, res) => {
  try {
    const { userId } = req.params;

    const reviews = await Review.findAll({
      where: { revieweeId: userId },
      include: [
        {
          model: User,
          as: 'reviewer',
          attributes: ['id', 'name', 'profileImage']
        },
        {
          model: Meetup,
          as: 'meetup',
          attributes: ['id', 'title', 'date', 'location']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    // 익명 리뷰 처리
    const processedReviews = reviews.map(review => {
      const reviewData = review.toJSON();
      if (reviewData.isAnonymous) {
        reviewData.reviewer = {
          id: null,
          name: '익명',
          profileImage: null
        };
      }
      return reviewData;
    });

    // 평균 평점 및 태그 통계 계산
    const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
    const averageRating = reviews.length > 0 ? (totalRating / reviews.length).toFixed(1) : 0;

    // 태그 빈도 계산
    const tagCounts = {};
    reviews.forEach(r => {
      (r.tags || []).forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });
    const topTags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([tag, count]) => ({ tag, count }));

    res.json({
      userId,
      totalReviews: reviews.length,
      averageRating: parseFloat(averageRating),
      topTags,
      reviews: processedReviews
    });
  } catch (error) {
    console.error('사용자 리뷰 조회 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
};

module.exports = {
  createReview,
  getMeetupReviews,
  getReviewableParticipants,
  getUserReviews
};
