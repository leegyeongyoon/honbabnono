/**
 * Meetups Attendance Controller Unit Tests
 */

const {
  createMockPool,
  mockQueryOnce,
  mockQueryError,
  resetMockQuery,
} = require('../../mocks/database.mock');

const {
  createMockResponse,
  createMockRequest,
  createAuthenticatedRequest,
} = require('../../helpers/response.helper');

const mockPool = createMockPool();
jest.mock('../../../server/config/database', () => mockPool);

// Mock helpers
jest.mock('../../../server/utils/helpers', () => ({
  calculateDistance: jest.fn().mockReturnValue(50),
  processImageUrl: jest.fn(),
}));

jest.mock('../../../server/modules/meetups/helpers/validation.helper', () => ({
  validateMeetupExists: jest.fn(),
  validateHostPermission: jest.fn(),
  validateParticipant: jest.fn(),
}));

const { calculateDistance } = require('../../../server/utils/helpers');
const { validateHostPermission, validateParticipant } = require('../../../server/modules/meetups/helpers/validation.helper');
const attendanceController = require('../../../server/modules/meetups/controllers/attendance.controller');

describe('Meetups Attendance Controller', () => {
  let req, res;
  const mockUser = { id: 1, userId: 1, name: 'testuser' };

  beforeEach(() => {
    res = createMockResponse();
    resetMockQuery(mockPool);
    jest.clearAllMocks();
  });

  // gpsCheckin
  describe('gpsCheckin', () => {
    it('should check in with GPS successfully', async () => {
      req = createAuthenticatedRequest(mockUser, {
        params: { id: '1' },
        body: { latitude: 37.5, longitude: 127.0 },
      });
      mockQueryOnce(mockPool, {
        rows: [{ id: 1, latitude: 37.5, longitude: 127.0 }],
        rowCount: 1,
      });
      validateParticipant.mockResolvedValueOnce({ isParticipant: true });
      calculateDistance.mockReturnValueOnce(50);
      mockQueryOnce(mockPool, { rows: [], rowCount: 1 }); // insert attendance
      mockQueryOnce(mockPool, { rows: [], rowCount: 1 }); // update participant
      await attendanceController.gpsCheckin(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should return 400 if location missing', async () => {
      req = createAuthenticatedRequest(mockUser, {
        params: { id: '1' },
        body: {},
      });
      await attendanceController.gpsCheckin(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 404 if meetup not found', async () => {
      req = createAuthenticatedRequest(mockUser, {
        params: { id: '999' },
        body: { latitude: 37.5, longitude: 127.0 },
      });
      mockQueryOnce(mockPool, { rows: [], rowCount: 0 });
      await attendanceController.gpsCheckin(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 403 if not participant', async () => {
      req = createAuthenticatedRequest(mockUser, {
        params: { id: '1' },
        body: { latitude: 37.5, longitude: 127.0 },
      });
      mockQueryOnce(mockPool, {
        rows: [{ id: 1, latitude: 37.5, longitude: 127.0 }],
        rowCount: 1,
      });
      validateParticipant.mockResolvedValueOnce({ isParticipant: false });
      await attendanceController.gpsCheckin(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should return 400 if too far', async () => {
      req = createAuthenticatedRequest(mockUser, {
        params: { id: '1' },
        body: { latitude: 37.5, longitude: 127.0 },
      });
      mockQueryOnce(mockPool, {
        rows: [{ id: 1, latitude: 37.5, longitude: 127.0 }],
        rowCount: 1,
      });
      validateParticipant.mockResolvedValueOnce({ isParticipant: true });
      calculateDistance.mockReturnValueOnce(200);
      await attendanceController.gpsCheckin(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 500 on error', async () => {
      const originalError = console.error;
      console.error = () => console.log('[에러 핸들링 테스트]');

      req = createAuthenticatedRequest(mockUser, {
        params: { id: '1' },
        body: { latitude: 37.5, longitude: 127.0 },
      });
      mockQueryError(mockPool, new Error('DB Error'));
      await attendanceController.gpsCheckin(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      console.error = originalError;
    });
  });

  // generateQRCode
  describe('generateQRCode', () => {
    it('should generate QR code for host', async () => {
      req = createAuthenticatedRequest(mockUser, { params: { id: '1' } });
      validateHostPermission.mockResolvedValueOnce({
        isHost: true,
        meetup: { title: 'Test Meetup' },
      });
      await attendanceController.generateQRCode(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should return 403 if not host', async () => {
      req = createAuthenticatedRequest(mockUser, { params: { id: '1' } });
      validateHostPermission.mockResolvedValueOnce({ error: '권한이 없습니다' });
      await attendanceController.generateQRCode(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should return 500 on error', async () => {
      const originalError = console.error;
      console.error = () => console.log('[에러 핸들링 테스트]');

      req = createAuthenticatedRequest(mockUser, { params: { id: '1' } });
      validateHostPermission.mockRejectedValueOnce(new Error('Error'));
      await attendanceController.generateQRCode(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      console.error = originalError;
    });
  });

  // getQRCode
  describe('getQRCode', () => {
    it('should get QR code for host', async () => {
      req = createAuthenticatedRequest(mockUser, { params: { id: '1' } });
      validateHostPermission.mockResolvedValueOnce({
        isHost: true,
        meetup: { title: 'Test Meetup' },
      });
      await attendanceController.getQRCode(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should return 500 on error', async () => {
      const originalError = console.error;
      console.error = () => console.log('[에러 핸들링 테스트]');

      req = createAuthenticatedRequest(mockUser, { params: { id: '1' } });
      validateHostPermission.mockRejectedValueOnce(new Error('Error'));
      await attendanceController.getQRCode(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      console.error = originalError;
    });
  });

  // qrCheckin
  describe('qrCheckin', () => {
    it('should check in with QR code successfully', async () => {
      const qrData = { meetupId: '1', expiresAt: Date.now() + 600000, type: 'checkin' };
      const qrCodeData = Buffer.from(JSON.stringify(qrData)).toString('base64');
      req = createAuthenticatedRequest(mockUser, {
        params: { id: '1' },
        body: { qrCodeData },
      });
      validateParticipant.mockResolvedValueOnce({ isParticipant: true });
      mockQueryOnce(mockPool, { rows: [], rowCount: 1 }); // insert
      mockQueryOnce(mockPool, { rows: [], rowCount: 1 }); // update
      await attendanceController.qrCheckin(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should return 400 if QR data missing', async () => {
      req = createAuthenticatedRequest(mockUser, {
        params: { id: '1' },
        body: {},
      });
      await attendanceController.qrCheckin(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 if invalid QR format', async () => {
      req = createAuthenticatedRequest(mockUser, {
        params: { id: '1' },
        body: { qrCodeData: 'invalid' },
      });
      await attendanceController.qrCheckin(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 if QR expired', async () => {
      const qrData = { meetupId: '1', expiresAt: Date.now() - 1000 };
      const qrCodeData = Buffer.from(JSON.stringify(qrData)).toString('base64');
      req = createAuthenticatedRequest(mockUser, {
        params: { id: '1' },
        body: { qrCodeData },
      });
      await attendanceController.qrCheckin(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 500 on error', async () => {
      const originalError = console.error;
      console.error = () => console.log('[에러 핸들링 테스트]');

      const qrData = { meetupId: '1', expiresAt: Date.now() + 600000 };
      const qrCodeData = Buffer.from(JSON.stringify(qrData)).toString('base64');
      req = createAuthenticatedRequest(mockUser, {
        params: { id: '1' },
        body: { qrCodeData },
      });
      validateParticipant.mockRejectedValueOnce(new Error('Error'));
      await attendanceController.qrCheckin(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      console.error = originalError;
    });
  });

  // hostConfirmAttendance
  describe('hostConfirmAttendance', () => {
    it('should confirm attendance by host', async () => {
      req = createAuthenticatedRequest(mockUser, {
        params: { id: '1', participantId: '2' },
      });
      validateHostPermission.mockResolvedValueOnce({ isHost: true });
      mockQueryOnce(mockPool, { rows: [], rowCount: 1 }); // insert
      mockQueryOnce(mockPool, { rows: [], rowCount: 1 }); // update
      await attendanceController.hostConfirmAttendance(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should return 403 if not host', async () => {
      req = createAuthenticatedRequest(mockUser, {
        params: { id: '1', participantId: '2' },
      });
      validateHostPermission.mockResolvedValueOnce({ error: '권한이 없습니다' });
      await attendanceController.hostConfirmAttendance(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should return 500 on error', async () => {
      const originalError = console.error;
      console.error = () => console.log('[에러 핸들링 테스트]');

      req = createAuthenticatedRequest(mockUser, {
        params: { id: '1', participantId: '2' },
      });
      validateHostPermission.mockRejectedValueOnce(new Error('Error'));
      await attendanceController.hostConfirmAttendance(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      console.error = originalError;
    });
  });

  // getAttendanceParticipants
  describe('getAttendanceParticipants', () => {
    it('should return attendance list', async () => {
      req = createMockRequest({ params: { id: '1' } });
      mockQueryOnce(mockPool, {
        rows: [{ id: 1, name: 'User', attended: true }],
        rowCount: 1,
      });
      await attendanceController.getAttendanceParticipants(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should return 500 on error', async () => {
      const originalError = console.error;
      console.error = () => console.log('[에러 핸들링 테스트]');

      req = createMockRequest({ params: { id: '1' } });
      mockQueryError(mockPool, new Error('DB Error'));
      await attendanceController.getAttendanceParticipants(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      console.error = originalError;
    });
  });

  // mutualConfirmAttendance
  describe('mutualConfirmAttendance', () => {
    it('should confirm attendance mutually', async () => {
      req = createAuthenticatedRequest(mockUser, {
        params: { id: '1', participantId: '2' },
      });
      validateParticipant.mockResolvedValueOnce({ isParticipant: true });
      mockQueryOnce(mockPool, { rows: [], rowCount: 1 });
      await attendanceController.mutualConfirmAttendance(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should return 403 if not participant', async () => {
      req = createAuthenticatedRequest(mockUser, {
        params: { id: '1', participantId: '2' },
      });
      validateParticipant.mockResolvedValueOnce({ isParticipant: false });
      await attendanceController.mutualConfirmAttendance(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should return 500 on error', async () => {
      const originalError = console.error;
      console.error = () => console.log('[에러 핸들링 테스트]');

      req = createAuthenticatedRequest(mockUser, {
        params: { id: '1', participantId: '2' },
      });
      validateParticipant.mockRejectedValueOnce(new Error('Error'));
      await attendanceController.mutualConfirmAttendance(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      console.error = originalError;
    });
  });

  // verifyLocation
  describe('verifyLocation', () => {
    it('should verify location successfully', async () => {
      req = createMockRequest({
        params: { id: '1' },
        body: { latitude: 37.5, longitude: 127.0 },
      });
      mockQueryOnce(mockPool, {
        rows: [{ latitude: 37.5, longitude: 127.0 }],
        rowCount: 1,
      });
      calculateDistance.mockReturnValueOnce(50);
      await attendanceController.verifyLocation(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should return 400 if location missing', async () => {
      req = createMockRequest({
        params: { id: '1' },
        body: {},
      });
      await attendanceController.verifyLocation(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 404 if meetup not found', async () => {
      req = createMockRequest({
        params: { id: '999' },
        body: { latitude: 37.5, longitude: 127.0 },
      });
      mockQueryOnce(mockPool, { rows: [], rowCount: 0 });
      await attendanceController.verifyLocation(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 500 on error', async () => {
      const originalError = console.error;
      console.error = () => console.log('[에러 핸들링 테스트]');

      req = createMockRequest({
        params: { id: '1' },
        body: { latitude: 37.5, longitude: 127.0 },
      });
      mockQueryError(mockPool, new Error('DB Error'));
      await attendanceController.verifyLocation(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      console.error = originalError;
    });
  });
});
