const express = require('express');
const router = express.Router();
const controller = require('./controller');
const { authenticateToken, authenticateMerchant } = require('../../middleware/auth');
const validate = require('../../middleware/validate');
const {
  createRestaurantSchema,
  updateRestaurantSchema,
  nearbyQuerySchema,
  searchQuerySchema,
} = require('../../middleware/schemas/restaurants.schemas');

// ============================================
// Public 조회 API (특수 경로 우선)
// ============================================

// 주변 식당 검색 (위치 기반)
router.get('/nearby', validate({ query: nearbyQuerySchema }), controller.getNearbyRestaurants);

// 식당 검색 (키워드/카테고리)
router.get('/search', validate({ query: searchQuerySchema }), controller.searchRestaurants);

// ============================================
// 인증 필요 API (특수 경로)
// ============================================

// 즐겨찾기 목록 조회
router.get('/favorites', authenticateToken, controller.getFavorites);

// 최근 본 식당 목록 조회
router.get('/recent-views', authenticateToken, controller.getRecentViews);

// ============================================
// Public 조회 API (파라미터 경로)
// ============================================

// 식당 목록 조회
router.get('/', controller.getRestaurants);

// 식당 상세 조회
router.get('/:id', controller.getRestaurantById);

// 식당 타임슬롯 조회
router.get('/:id/time-slots', controller.getTimeSlots);

// 타임슬롯 생성 (점주)
router.post('/:id/time-slots', authenticateMerchant, controller.createTimeSlot);

// 타임슬롯 삭제 (점주)
router.delete('/:id/time-slots/:slotId', authenticateMerchant, controller.deleteTimeSlot);

// ============================================
// 점주 전용 API
// ============================================

// 식당 등록
router.post('/', authenticateMerchant, validate({ body: createRestaurantSchema }), controller.createRestaurant);

// 식당 정보 수정
router.put('/:id', authenticateMerchant, validate({ body: updateRestaurantSchema }), controller.updateRestaurant);

// ============================================
// 인증 필요 API (파라미터 경로)
// ============================================

// 즐겨찾기 토글
router.post('/:id/favorite', authenticateToken, controller.toggleFavorite);

// 조회 기록
router.post('/:id/view', authenticateToken, controller.recordView);

module.exports = router;
