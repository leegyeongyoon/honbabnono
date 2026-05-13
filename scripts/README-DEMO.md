# 잇테이블 데모 영상 자료

홍보 영상/투자 미팅용 데모 데이터 시딩 + Playwright 녹화 스크립트.

## 데모 계정

| 역할 | 로그인 정보 | 접속 URL (운영) |
|------|-------------|-----------------|
| 고객 | `demo.customer@eattable.kr` / `Demo1234!` | https://eattable.kr |
| 점주 (기존, verified) | `demo.merchant@eattable.kr` / `Demo1234!` | https://merchant.eattable.kr |
| 점주 (신규, 사업자 등록 전) | `demo.merchant.new@eattable.kr` / `Demo1234!` | https://merchant.eattable.kr |
| 관리자 | `admin` / `admin123` | https://admin.eattable.kr |

> 신규 점주 계정은 영상 촬영 시 **사업자 등록부터 → AI 메뉴 업로드** 풀 사이클을 재현하기 위해 따로 분리됨. `seed-demo.js` 재실행 시 merchant 레코드가 깨끗이 리셋됨(user만 유지).

## 1. 시드 데이터 생성

```bash
# 로컬 DB에 시드
node scripts/seed-demo.js

# 운영 DB에 직접 시드하려면 환경변수 셋업 후
DATABASE_URL=postgresql://... node scripts/seed-demo.js
```

생성되는 것:
- 고객/점주/관리자 계정 (멱등 — 이미 있으면 재사용)
- 데모 매장 `잇테이블 데모 샤브샤브` (강남)
- 메뉴 카테고리 2개 + 메뉴 6개 (코스 3종 + 단품 3종)
- 시간 슬롯 (월-토 11:00 / 12:00 / 18:00 / 19:00 / 20:00)
- 데모 예약 3건:
  - 오늘 19:00 / 2인 / **confirmed** ← 시연 메인
  - 내일 12:00 / 4인 / pending_payment
  - 어제 19:00 / 2인 / completed

## 2. 영상 녹화

### 사전 준비
```bash
npx playwright install chromium    # 최초 1회
```

### 실행
```bash
# 로컬 dev 서버 대상
npx tsx scripts/record-demo.ts

# 운영 환경 대상
CUSTOMER_URL=https://eattable.kr \
MERCHANT_URL=https://merchant.eattable.kr \
ADMIN_URL=https://admin.eattable.kr \
  npx tsx scripts/record-demo.ts

# 특정 시나리오만
npx tsx scripts/record-demo.ts customer
npx tsx scripts/record-demo.ts merchant
npx tsx scripts/record-demo.ts admin
```

영상 출력: `/tmp/demo-videos/{customer,merchant,admin}/*.webm`

## 3. 시연 시나리오 (영상 스토리보드 — 풀 사이클)

전체 흐름: **신규 점주 가입 → AI 메뉴판 등록 → 관리자 승인 → 고객 매장 노출 → 예약/결제**

### 🟡 ① 신규 점주 온보딩 (1분 30초) — `demo.merchant.new`
1. **로그인** — 신규 점주 계정
2. **사업자 등록** — 사업자번호/상호/대표자명 입력 → 제출 (verification_status='pending')
3. **AI 메뉴판 인식** — 메뉴판 사진 업로드 → OpenAI 분석 → 메뉴 자동 채워짐
4. **메뉴 확인 및 저장** — AI가 추출한 메뉴 검토 → 저장

**카피 포인트**: "메뉴판 사진 한 장이면 등록 끝. AI가 알아서 정리합니다."

### 🔵 ② 관리자 승인 (40초) — `admin`
1. **로그인** — admin / admin123
2. **점주 관리** — pending 필터 → 방금 등록한 점주
3. **검토 및 승인** — 사업자 정보 확인 → 승인 (verification_status='verified')

**카피 포인트**: "사업자 확인 후 1클릭 승인. 매장이 곧바로 고객에게 노출됩니다."

### 🟢 ③ 고객 예약 (1분 30초) — `demo.customer`
1. **로그인** — 고객 계정 (모바일 뷰)
2. **매장 검색** — "샤브샤브" 또는 새로 등록된 매장
3. **매장 상세** — 메뉴 둘러보기
4. **예약** — 날짜/시간/인원/메뉴 선택 → 선결제
5. **내 예약** — 도착 알림/조리 상태 안내

**카피 포인트**: "메뉴까지 미리 예약했어요. 도착하면 바로 식사가 시작돼요."

### 🟡 ④ 기존 점주 POS (옵션, 45초) — `demo.merchant`
1. **로그인** — 기존 점주
2. **예약 보드** — 오늘 예약들 시간순 정렬
3. **조리 상태 변경** — pending → cooking → ready
4. **정산 내역** — 매출 추이

**카피 포인트**: "고객 도착 전에 메뉴가 확정되니, 조리 타이밍을 정확히 맞춥니다."

## 4. 후반 작업 (AI 영상화)

### 추천 도구
- **나레이션**: ElevenLabs (한국어 자연스러움) — `~25,000자 무료`
- **자막/컷 편집**: Descript or CapCut (자동 자막)
- **오프닝/엔딩 카드**: Canva or Figma → 동영상으로 export
- **배경음악**: Epidemic Sound, Artlist (라이선스 안전)

### 영상 → 마케팅 자산 전환
- YouTube 풀버전 (3시점 + 나레이션 + 자막)
- 인스타/틱톡 숏폼 (각 시점 30초 컷)
- 투자자용 deck 임베드 (Notion/Keynote)

## 5. 테스트 케이스 (시드 검증)

시드 후 다음 SQL로 데이터 확인:

```sql
-- 1) 계정 확인
SELECT email, name, provider FROM users WHERE email LIKE 'demo.%@eattable.kr';
SELECT username, role FROM admins WHERE username = 'admin';

-- 2) 매장 확인
SELECT id, name, category, seat_count, is_active FROM restaurants
WHERE name = '잇테이블 데모 샤브샤브';

-- 3) 점주-매장 연결 확인
SELECT m.business_name, m.verification_status, r.name AS restaurant_name
FROM merchants m JOIN restaurants r ON m.restaurant_id = r.id
WHERE m.business_name = '잇테이블 데모';

-- 4) 메뉴 확인 (6개 나와야 함)
SELECT m.name, m.price, m.is_set_menu, c.name AS category
FROM menus m LEFT JOIN menu_categories c ON m.category_id = c.id
JOIN restaurants r ON m.restaurant_id = r.id
WHERE r.name = '잇테이블 데모 샤브샤브'
ORDER BY c.sort_order, m.sort_order;

-- 5) 시간 슬롯 확인 (30개 나와야 함: 6일 x 5슬롯)
SELECT day_of_week, slot_time, max_reservations
FROM restaurant_time_slots ts
JOIN restaurants r ON ts.restaurant_id = r.id
WHERE r.name = '잇테이블 데모 샤브샤브'
ORDER BY day_of_week, slot_time;

-- 6) 데모 예약 확인 (3건)
SELECT reservation_date, reservation_time, party_size, status
FROM reservations res
JOIN users u ON res.user_id = u.id
WHERE u.email = 'demo.customer@eattable.kr'
ORDER BY reservation_date;
```

## 6. 시드 데이터 삭제 (cleanup)

영상 촬영 끝나고 운영 환경에서 깨끗이 지우려면:

```sql
BEGIN;
DELETE FROM order_items WHERE order_id IN (
  SELECT o.id FROM orders o JOIN restaurants r ON o.restaurant_id = r.id
  WHERE r.name = '잇테이블 데모 샤브샤브'
);
DELETE FROM orders WHERE restaurant_id IN (SELECT id FROM restaurants WHERE name = '잇테이블 데모 샤브샤브');
DELETE FROM payments WHERE reservation_id IN (
  SELECT res.id FROM reservations res JOIN restaurants r ON res.restaurant_id = r.id
  WHERE r.name = '잇테이블 데모 샤브샤브'
);
DELETE FROM reservations WHERE restaurant_id IN (SELECT id FROM restaurants WHERE name = '잇테이블 데모 샤브샤브');
DELETE FROM restaurant_time_slots WHERE restaurant_id IN (SELECT id FROM restaurants WHERE name = '잇테이블 데모 샤브샤브');
DELETE FROM menus WHERE restaurant_id IN (SELECT id FROM restaurants WHERE name = '잇테이블 데모 샤브샤브');
DELETE FROM menu_categories WHERE restaurant_id IN (SELECT id FROM restaurants WHERE name = '잇테이블 데모 샤브샤브');
DELETE FROM merchants WHERE business_name = '잇테이블 데모';
DELETE FROM restaurants WHERE name = '잇테이블 데모 샤브샤브';
DELETE FROM users WHERE email IN ('demo.customer@eattable.kr', 'demo.merchant@eattable.kr');
-- admin 계정은 보존 권장 (운영용)
COMMIT;
```
