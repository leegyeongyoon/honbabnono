/**
 * Merchants Controller Unit Tests
 * 점주 등록 컨트롤러 단위 테스트 — NTS(국세청) 연동 분기 포함
 */

const {
  createMockPool,
  resetMockQuery,
} = require('../../mocks/database.mock');

const mockPool = createMockPool();

jest.mock('../../../server/config/database', () => mockPool);
jest.mock('../../../server/config/logger', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));
jest.mock('../../../server/config/nts', () => ({
  config: {},
  isEnabled: jest.fn(() => false),
  normalizeBusinessNumber: jest.fn((v) => String(v || '').replace(/-/g, '')),
  checkStatus: jest.fn(),
  validateBusiness: jest.fn(),
}));

const nts = require('../../../server/config/nts');
const merchantsController = require('../../../server/modules/merchants/controller');
const {
  createMockResponse,
  createMockRequest,
} = require('../../helpers/response.helper');

describe('MerchantsController', () => {
  let mockReq;
  let mockRes;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRes = createMockResponse();
    resetMockQuery(mockPool);
  });

  describe('registerMerchant', () => {
    const baseBody = {
      business_number: '1234567890',
      business_name: '테스트식당',
      representative_name: '김테스트',
      start_dt: '20230115',
    };

    it('NTS 비활성 시 pending으로 등록하고 nts 필드는 null로 남긴다', async () => {
      nts.isEnabled.mockReturnValue(false);
      mockReq = createMockRequest({ body: baseBody, user: { userId: 'u-1' } });

      mockPool.query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // 기존 점주 없음
        .mockResolvedValueOnce({
          rows: [{ id: 'm-1', verification_status: 'pending', nts_status: null }],
          rowCount: 1,
        }); // INSERT

      await merchantsController.registerMerchant(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(nts.checkStatus).not.toHaveBeenCalled();

      // INSERT 파라미터에서 nts_status(인덱스 9)가 null인지 확인
      const insertParams = mockPool.query.mock.calls[1][1];
      expect(insertParams[9]).toBeNull(); // nts_status
      expect(insertParams[8]).toBe('2023-01-15'); // business_start_date 변환
    });

    it('NTS 활성 + 계속사업자 + 진위 일치 → nts_passed 기록 (게이트는 여전히 pending)', async () => {
      nts.isEnabled.mockReturnValue(true);
      nts.checkStatus.mockResolvedValue({ b_stt: '계속사업자', b_stt_cd: '01' });
      nts.validateBusiness.mockResolvedValue({ valid: true, raw: { valid: '01' } });

      mockReq = createMockRequest({ body: baseBody, user: { userId: 'u-1' } });

      mockPool.query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })
        .mockResolvedValueOnce({
          rows: [{ id: 'm-1', verification_status: 'pending', nts_status: 'nts_passed' }],
          rowCount: 1,
        });

      await merchantsController.registerMerchant(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(nts.checkStatus).toHaveBeenCalledWith('1234567890');
      expect(nts.validateBusiness).toHaveBeenCalledWith({
        b_no: '1234567890', start_dt: '20230115', p_nm: '김테스트',
      });

      const insertParams = mockPool.query.mock.calls[1][1];
      expect(insertParams[9]).toBe('nts_passed'); // nts_status
      expect(insertParams[11]).toBe(true);        // nts_valid
      // verification_status는 SQL 리터럴 'pending' — 파라미터에 없음 (수동 승인 게이트 유지)
      const insertSql = mockPool.query.mock.calls[1][0];
      expect(insertSql).toContain("'pending'");
    });

    it('NTS 활성 + 폐업자 → nts_failed 기록', async () => {
      nts.isEnabled.mockReturnValue(true);
      nts.checkStatus.mockResolvedValue({ b_stt: '폐업자', b_stt_cd: '03' });
      nts.validateBusiness.mockResolvedValue({ valid: true, raw: {} });

      mockReq = createMockRequest({ body: baseBody, user: { userId: 'u-1' } });

      mockPool.query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })
        .mockResolvedValueOnce({ rows: [{ id: 'm-1' }], rowCount: 1 });

      await merchantsController.registerMerchant(mockReq, mockRes);

      const insertParams = mockPool.query.mock.calls[1][1];
      expect(insertParams[9]).toBe('nts_failed');
      expect(insertParams[10]).toBe('폐업자'); // nts_b_stt
    });

    it('NTS 호출 실패 시에도 등록은 성공한다 (수동 승인 폴백)', async () => {
      nts.isEnabled.mockReturnValue(true);
      nts.checkStatus.mockRejectedValue(new Error('NTS 장애'));

      mockReq = createMockRequest({ body: baseBody, user: { userId: 'u-1' } });

      mockPool.query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })
        .mockResolvedValueOnce({ rows: [{ id: 'm-1', verification_status: 'pending' }], rowCount: 1 });

      await merchantsController.registerMerchant(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      const insertParams = mockPool.query.mock.calls[1][1];
      expect(insertParams[9]).toBeNull(); // nts_status 미기록
    });

    it('이미 등록된 점주면 400을 반환한다', async () => {
      mockReq = createMockRequest({ body: baseBody, user: { userId: 'u-1' } });

      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 'm-1', verification_status: 'pending' }],
        rowCount: 1,
      });

      await merchantsController.registerMerchant(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });
});
