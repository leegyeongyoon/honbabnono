const express = require('express');
const router = express.Router();
const controller = require('./controller');
const { authenticateToken, authenticateMerchant } = require('../../middleware/auth');
const validate = require('../../middleware/validate');
const {
  createMenuSchema,
  updateMenuSchema,
  createCategorySchema,
  updateCategorySchema,
} = require('../../middleware/schemas/menus.schemas');

// === 특수 엔드포인트 (/:id보다 먼저 정의해야 함) ===

// 레스토랑별 메뉴 목록 조회 (public)
router.get('/restaurant/:restaurantId', controller.getMenusByRestaurant);

// 레스토랑별 카테고리 목록 조회 (public)
router.get('/categories/:restaurantId', controller.getCategoriesByRestaurant);

// 카테고리 생성 (점주 전용)
router.post(
  '/categories',
  authenticateMerchant,
  validate({ body: createCategorySchema }),
  controller.createCategory
);

// 카테고리 수정 (점주 전용)
router.put(
  '/categories/:id',
  authenticateMerchant,
  validate({ body: updateCategorySchema }),
  controller.updateCategory
);

// === 일반 엔드포인트 ===

// 메뉴 상세 조회 (public)
router.get('/:id', controller.getMenuById);

// 메뉴 생성 (점주 전용)
router.post(
  '/',
  authenticateMerchant,
  validate({ body: createMenuSchema }),
  controller.createMenu
);

// 메뉴 수정 (점주 전용)
router.put(
  '/:id',
  authenticateMerchant,
  validate({ body: updateMenuSchema }),
  controller.updateMenu
);

// 메뉴 삭제 (점주 전용, 소프트 삭제)
router.delete('/:id', authenticateMerchant, controller.deleteMenu);

module.exports = router;
