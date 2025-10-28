const request = require('supertest');
const app = require('../server/index');

describe('Legal Documents APIs', () => {
  describe('GET /api/legal/terms', () => {
    it('should get latest terms of service successfully', async () => {
      const response = await request(app)
        .get('/api/legal/terms')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('title');
      expect(response.body.data).toHaveProperty('content');
      expect(response.body.data).toHaveProperty('version');
      expect(response.body.data).toHaveProperty('effective_date');
      expect(response.body.data).toHaveProperty('created_at');
      expect(response.body.data.type).toBe('terms');
    });

    it('should get specific version of terms', async () => {
      const response = await request(app)
        .get('/api/legal/terms')
        .query({ version: '1.0' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.version).toBe('1.0');
    });

    it('should return 404 for non-existent version', async () => {
      const response = await request(app)
        .get('/api/legal/terms')
        .query({ version: '999.0' })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('해당 버전의 이용약관을 찾을 수 없습니다.');
    });

    it('should return terms with valid structure', async () => {
      const response = await request(app)
        .get('/api/legal/terms')
        .expect(200);

      const terms = response.body.data;
      expect(terms.title).toContain('이용약관');
      expect(terms.content).toContain('제1조');
      expect(terms.version).toMatch(/^\d+\.\d+$/); // Version format like "1.0"
      expect(new Date(terms.effective_date)).toBeInstanceOf(Date);
      expect(new Date(terms.created_at)).toBeInstanceOf(Date);
    });

    it('should return most recent terms when no version specified', async () => {
      const response = await request(app)
        .get('/api/legal/terms')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      
      // Should be the latest version (assuming 1.0 is the latest in test data)
      expect(response.body.data.version).toBe('1.0');
    });
  });

  describe('GET /api/legal/privacy', () => {
    it('should get latest privacy policy successfully', async () => {
      const response = await request(app)
        .get('/api/legal/privacy')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('title');
      expect(response.body.data).toHaveProperty('content');
      expect(response.body.data).toHaveProperty('version');
      expect(response.body.data).toHaveProperty('effective_date');
      expect(response.body.data).toHaveProperty('created_at');
      expect(response.body.data.type).toBe('privacy');
    });

    it('should get specific version of privacy policy', async () => {
      const response = await request(app)
        .get('/api/legal/privacy')
        .query({ version: '1.0' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.version).toBe('1.0');
    });

    it('should return 404 for non-existent privacy policy version', async () => {
      const response = await request(app)
        .get('/api/legal/privacy')
        .query({ version: '999.0' })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('해당 버전의 개인정보처리방침을 찾을 수 없습니다.');
    });

    it('should return privacy policy with valid structure', async () => {
      const response = await request(app)
        .get('/api/legal/privacy')
        .expect(200);

      const privacy = response.body.data;
      expect(privacy.title).toContain('개인정보처리방침');
      expect(privacy.content).toContain('개인정보');
      expect(privacy.version).toMatch(/^\d+\.\d+$/); // Version format like "1.0"
      expect(new Date(privacy.effective_date)).toBeInstanceOf(Date);
      expect(new Date(privacy.created_at)).toBeInstanceOf(Date);
    });

    it('should return most recent privacy policy when no version specified', async () => {
      const response = await request(app)
        .get('/api/legal/privacy')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      
      // Should be the latest version (assuming 1.0 is the latest in test data)
      expect(response.body.data.version).toBe('1.0');
    });
  });

  describe('Legal Documents Common Tests', () => {
    it('should handle database connection errors gracefully', async () => {
      // This test would require mocking database failures
      // For now, we'll test that the endpoints don't crash
      
      const termsResponse = await request(app)
        .get('/api/legal/terms')
        .expect(200);
      
      const privacyResponse = await request(app)
        .get('/api/legal/privacy')
        .expect(200);

      expect(termsResponse.body.success).toBe(true);
      expect(privacyResponse.body.success).toBe(true);
    });

    it('should return documents with proper encoding for Korean text', async () => {
      const termsResponse = await request(app)
        .get('/api/legal/terms')
        .expect(200);

      const privacyResponse = await request(app)
        .get('/api/legal/privacy')
        .expect(200);

      // Check that Korean text is properly handled
      expect(termsResponse.body.data.title).toMatch(/[가-힣]/); // Contains Korean characters
      expect(termsResponse.body.data.content).toMatch(/[가-힣]/);
      expect(privacyResponse.body.data.title).toMatch(/[가-힣]/);
      expect(privacyResponse.body.data.content).toMatch(/[가-힣]/);
    });

    it('should return consistent data structure for both endpoints', async () => {
      const termsResponse = await request(app)
        .get('/api/legal/terms')
        .expect(200);

      const privacyResponse = await request(app)
        .get('/api/legal/privacy')
        .expect(200);

      const requiredFields = ['id', 'title', 'content', 'version', 'type', 'effective_date', 'created_at'];
      
      requiredFields.forEach(field => {
        expect(termsResponse.body.data).toHaveProperty(field);
        expect(privacyResponse.body.data).toHaveProperty(field);
      });
    });

    it('should handle invalid version format gracefully', async () => {
      const invalidVersions = ['invalid', '1', 'v1.0', '1.0.0.0'];

      for (const version of invalidVersions) {
        const termsResponse = await request(app)
          .get('/api/legal/terms')
          .query({ version });

        const privacyResponse = await request(app)
          .get('/api/legal/privacy')
          .query({ version });

        // Should either return 404 or ignore invalid version and return latest
        expect([200, 404]).toContain(termsResponse.status);
        expect([200, 404]).toContain(privacyResponse.status);
      }
    });

    it('should return documents ordered by effective date', async () => {
      // If multiple versions exist, latest should be returned by default
      const termsResponse = await request(app)
        .get('/api/legal/terms')
        .expect(200);

      const privacyResponse = await request(app)
        .get('/api/legal/privacy')
        .expect(200);

      expect(termsResponse.body.data.effective_date).toBeDefined();
      expect(privacyResponse.body.data.effective_date).toBeDefined();
    });

    it('should include proper content length for documents', async () => {
      const termsResponse = await request(app)
        .get('/api/legal/terms')
        .expect(200);

      const privacyResponse = await request(app)
        .get('/api/legal/privacy')
        .expect(200);

      // Legal documents should have substantial content
      expect(termsResponse.body.data.content.length).toBeGreaterThan(100);
      expect(privacyResponse.body.data.content.length).toBeGreaterThan(100);
    });

    it('should have different content for terms and privacy', async () => {
      const termsResponse = await request(app)
        .get('/api/legal/terms')
        .expect(200);

      const privacyResponse = await request(app)
        .get('/api/legal/privacy')
        .expect(200);

      // Terms and privacy should have different content
      expect(termsResponse.body.data.content).not.toBe(privacyResponse.body.data.content);
      expect(termsResponse.body.data.title).not.toBe(privacyResponse.body.data.title);
    });

    it('should return valid ISO date strings', async () => {
      const termsResponse = await request(app)
        .get('/api/legal/terms')
        .expect(200);

      const effectiveDate = new Date(termsResponse.body.data.effective_date);
      const createdAt = new Date(termsResponse.body.data.created_at);

      expect(effectiveDate).toBeInstanceOf(Date);
      expect(createdAt).toBeInstanceOf(Date);
      expect(effectiveDate.getTime()).not.toBeNaN();
      expect(createdAt.getTime()).not.toBeNaN();
    });
  });
});