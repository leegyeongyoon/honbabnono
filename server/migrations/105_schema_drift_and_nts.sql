-- 105: 스키마 drift 정리 + 국세청(NTS) 사업자 진위확인 컬럼 추가
--
-- [정본 스키마 메모]
-- * menu_option_groups / menu_option_items 의 정본은 103의 UUID PK 스키마다.
--   104의 SERIAL PK 정의는 CREATE TABLE IF NOT EXISTS 라서 어떤 환경에서도 실행되지 않는
--   죽은 코드(no-op)이며, 코드(server/modules/menus)는 UUID 스키마에 의존한다.
-- * settlements 의 금액 컬럼(platform_fee/payment_fee/total_sales/settlement_amount)의
--   정본은 INTEGER(원 단위)다. 104가 payment_fee를 DECIMAL로 정의하지만 103이 먼저
--   INTEGER로 추가하므로 실제 타입은 INTEGER. 코드도 Math.round() 정수 기준.
--   기존 데이터 보존을 위해 타입 강제 변경은 하지 않는다.
-- * 모든 문장은 idempotent (IF NOT EXISTS) — 기존 테이블 DROP 금지 원칙 준수.

-- =============================================
-- 1. merchants: 국세청 사업자등록 진위확인/상태조회 결과 기록
--    (공공데이터포털 api.odcloud.kr/api/nts-businessman/v1)
-- =============================================
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS business_start_date DATE;          -- 개업일자 (진위확인 입력값 start_dt)
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS nts_status VARCHAR(20);            -- nts_passed | nts_failed | NULL(미조회)
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS nts_b_stt VARCHAR(20);             -- 국세청 사업 상태 (계속사업자/휴업자/폐업자)
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS nts_valid BOOLEAN;                 -- 진위확인 결과 (true=일치)
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS nts_checked_at TIMESTAMPTZ;        -- 조회 시각
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS nts_raw JSONB;                     -- API 응답 원문 (감사용)

COMMENT ON COLUMN merchants.nts_status IS '국세청 진위확인 종합 결과 — 관리자 승인 판단 참고용 (최종 게이트는 verification_status)';

-- =============================================
-- 2. 코드 의존 컬럼 존재 보장 (방어적 — 구버전 스키마로 생성된 DB 대비)
-- =============================================
ALTER TABLE menu_option_groups ADD COLUMN IF NOT EXISTS min_select INTEGER DEFAULT 0;
ALTER TABLE menu_option_groups ADD COLUMN IF NOT EXISTS max_select INTEGER DEFAULT 1;
ALTER TABLE menu_option_items  ADD COLUMN IF NOT EXISTS additional_price INTEGER DEFAULT 0;
