const { z } = require('zod');

/**
 * Schema for menu creation (POST /menus)
 */
const createMenuSchema = z.object({
  restaurant_id: z
    .string({ required_error: '레스토랑 ID를 입력해주세요.' })
    .uuid('유효한 레스토랑 ID가 아닙니다.'),

  category_id: z
    .string()
    .uuid('유효한 카테고리 ID가 아닙니다.')
    .optional()
    .nullable(),

  name: z
    .string({ required_error: '메뉴 이름을 입력해주세요.' })
    .min(1, '메뉴 이름을 입력해주세요.')
    .max(100, '메뉴 이름은 100자 이하여야 합니다.')
    .transform((val) => val.trim()),

  description: z
    .string()
    .max(1000, '설명은 1000자 이하여야 합니다.')
    .optional()
    .nullable()
    .transform((val) => val?.trim()),

  price: z
    .number({ required_error: '가격을 입력해주세요.' })
    .int('가격은 정수여야 합니다.')
    .min(100, '가격은 100원 이상이어야 합니다.'),

  image_url: z
    .string()
    .url('유효한 이미지 URL이 아닙니다.')
    .optional()
    .nullable(),

  prep_time_min: z
    .number()
    .int('조리 시간은 정수여야 합니다.')
    .min(0, '조리 시간은 0분 이상이어야 합니다.')
    .default(15),

  min_order_qty: z
    .number()
    .int('최소 주문 수량은 정수여야 합니다.')
    .min(1, '최소 주문 수량은 1 이상이어야 합니다.')
    .optional()
    .nullable(),

  max_order_qty: z
    .number()
    .int('최대 주문 수량은 정수여야 합니다.')
    .min(1, '최대 주문 수량은 1 이상이어야 합니다.')
    .optional()
    .nullable(),

  is_set_menu: z
    .boolean()
    .default(false),

  serves: z
    .number()
    .int('인분 수는 정수여야 합니다.')
    .min(1, '인분 수는 1 이상이어야 합니다.')
    .optional()
    .nullable(),

  options: z
    .array(z.any())
    .optional()
    .nullable()
    .default([]),

  sort_order: z
    .number()
    .int('정렬 순서는 정수여야 합니다.')
    .min(0)
    .optional()
    .default(0),
});

/**
 * Schema for menu update (PUT /menus/:id)
 * restaurant_id 제외한 partial
 */
const updateMenuSchema = createMenuSchema
  .omit({ restaurant_id: true })
  .partial();

/**
 * Schema for menu category creation (POST /menus/categories)
 */
const createCategorySchema = z.object({
  restaurant_id: z
    .string({ required_error: '레스토랑 ID를 입력해주세요.' })
    .uuid('유효한 레스토랑 ID가 아닙니다.'),

  name: z
    .string({ required_error: '카테고리 이름을 입력해주세요.' })
    .min(1, '카테고리 이름을 입력해주세요.')
    .max(50, '카테고리 이름은 50자 이하여야 합니다.')
    .transform((val) => val.trim()),

  sort_order: z
    .number()
    .int('정렬 순서는 정수여야 합니다.')
    .min(0)
    .optional()
    .default(0),
});

/**
 * Schema for menu category update (PUT /menus/categories/:id)
 */
const updateCategorySchema = z.object({
  name: z
    .string()
    .min(1, '카테고리 이름을 입력해주세요.')
    .max(50, '카테고리 이름은 50자 이하여야 합니다.')
    .transform((val) => val.trim())
    .optional(),

  sort_order: z
    .number()
    .int('정렬 순서는 정수여야 합니다.')
    .min(0)
    .optional(),
});

module.exports = {
  createMenuSchema,
  updateMenuSchema,
  createCategorySchema,
  updateCategorySchema,
};
