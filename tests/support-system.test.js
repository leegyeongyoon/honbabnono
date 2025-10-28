const request = require('supertest');
const app = require('../server/index');

describe('Support System APIs', () => {
  let authToken;
  
  const testUser = {
    email: 'support-test@example.com',
    password: 'testpassword123',
    name: '지원테스트유저'
  };

  beforeAll(async () => {
    // Register and login test user
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send(testUser);
    
    authToken = registerResponse.body.token;
  });

  describe('GET /api/support/faq', () => {
    it('should get FAQ list successfully', async () => {
      const response = await request(app)
        .get('/api/support/faq')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
      
      // Check FAQ structure
      const faq = response.body.data[0];
      expect(faq).toHaveProperty('id');
      expect(faq).toHaveProperty('question');
      expect(faq).toHaveProperty('answer');
      expect(faq).toHaveProperty('category');
      expect(faq).toHaveProperty('order_index');
    });

    it('should filter FAQ by category', async () => {
      const response = await request(app)
        .get('/api/support/faq')
        .query({ category: '계정' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      
      // All returned FAQs should be in the requested category
      response.body.data.forEach(faq => {
        expect(faq.category).toBe('계정');
      });
    });

    it('should search FAQ by keyword', async () => {
      const response = await request(app)
        .get('/api/support/faq')
        .query({ search: '비밀번호' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      
      // At least one FAQ should contain the search term
      const hasSearchTerm = response.body.data.some(faq => 
        faq.question.includes('비밀번호') || faq.answer.includes('비밀번호')
      );
      expect(hasSearchTerm).toBe(true);
    });

    it('should return ordered FAQ list', async () => {
      const response = await request(app)
        .get('/api/support/faq')
        .expect(200);

      expect(response.body.success).toBe(true);
      
      // Check if FAQs are ordered by order_index
      for (let i = 1; i < response.body.data.length; i++) {
        expect(response.body.data[i].order_index).toBeGreaterThanOrEqual(
          response.body.data[i - 1].order_index
        );
      }
    });

    it('should handle empty search results', async () => {
      const response = await request(app)
        .get('/api/support/faq')
        .query({ search: 'nonexistentkeyword12345' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
    });

    it('should handle invalid category filter', async () => {
      const response = await request(app)
        .get('/api/support/faq')
        .query({ category: 'nonexistentcategory' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
    });
  });

  describe('POST /api/support/inquiry', () => {
    it('should create support inquiry successfully', async () => {
      const inquiryData = {
        subject: '테스트 문의',
        message: '이것은 테스트 문의입니다.',
        category: '기술지원'
      };

      const response = await request(app)
        .post('/api/support/inquiry')
        .set('Authorization', `Bearer ${authToken}`)
        .send(inquiryData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('문의가 접수되었습니다.');
      expect(response.body.inquiry).toBeDefined();
      expect(response.body.inquiry.subject).toBe(inquiryData.subject);
      expect(response.body.inquiry.message).toBe(inquiryData.message);
      expect(response.body.inquiry.category).toBe(inquiryData.category);
      expect(response.body.inquiry.status).toBe('open');
    });

    it('should reject inquiry without authentication', async () => {
      const inquiryData = {
        subject: '테스트 문의',
        message: '이것은 테스트 문의입니다.',
        category: '기술지원'
      };

      const response = await request(app)
        .post('/api/support/inquiry')
        .send(inquiryData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('인증 토큰이 필요합니다.');
    });

    it('should reject inquiry with missing subject', async () => {
      const inquiryData = {
        message: '이것은 테스트 문의입니다.',
        category: '기술지원'
      };

      const response = await request(app)
        .post('/api/support/inquiry')
        .set('Authorization', `Bearer ${authToken}`)
        .send(inquiryData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('제목과 메시지는 필수입니다.');
    });

    it('should reject inquiry with missing message', async () => {
      const inquiryData = {
        subject: '테스트 문의',
        category: '기술지원'
      };

      const response = await request(app)
        .post('/api/support/inquiry')
        .set('Authorization', `Bearer ${authToken}`)
        .send(inquiryData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('제목과 메시지는 필수입니다.');
    });

    it('should handle inquiry with default category', async () => {
      const inquiryData = {
        subject: '카테고리 없는 문의',
        message: '카테고리를 지정하지 않은 문의입니다.'
      };

      const response = await request(app)
        .post('/api/support/inquiry')
        .set('Authorization', `Bearer ${authToken}`)
        .send(inquiryData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.inquiry.category).toBe('일반');
    });

    it('should trim whitespace from subject and message', async () => {
      const inquiryData = {
        subject: '   공백이 있는 제목   ',
        message: '   공백이 있는 메시지   ',
        category: '기술지원'
      };

      const response = await request(app)
        .post('/api/support/inquiry')
        .set('Authorization', `Bearer ${authToken}`)
        .send(inquiryData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.inquiry.subject).toBe('공백이 있는 제목');
      expect(response.body.inquiry.message).toBe('공백이 있는 메시지');
    });

    it('should reject inquiry with empty subject after trimming', async () => {
      const inquiryData = {
        subject: '   ',
        message: '유효한 메시지',
        category: '기술지원'
      };

      const response = await request(app)
        .post('/api/support/inquiry')
        .set('Authorization', `Bearer ${authToken}`)
        .send(inquiryData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('제목과 메시지는 필수입니다.');
    });

    it('should reject inquiry with empty message after trimming', async () => {
      const inquiryData = {
        subject: '유효한 제목',
        message: '   ',
        category: '기술지원'
      };

      const response = await request(app)
        .post('/api/support/inquiry')
        .set('Authorization', `Bearer ${authToken}`)
        .send(inquiryData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('제목과 메시지는 필수입니다.');
    });

    it('should create inquiry with valid categories', async () => {
      const validCategories = ['일반', '계정', '결제', '기술지원', '신고'];
      
      for (const category of validCategories) {
        const inquiryData = {
          subject: `${category} 문의`,
          message: `${category} 카테고리 테스트 문의입니다.`,
          category: category
        };

        const response = await request(app)
          .post('/api/support/inquiry')
          .set('Authorization', `Bearer ${authToken}`)
          .send(inquiryData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.inquiry.category).toBe(category);
      }
    });

    it('should include timestamps in inquiry response', async () => {
      const inquiryData = {
        subject: '타임스탬프 테스트',
        message: '타임스탬프 확인을 위한 테스트 문의입니다.',
        category: '기술지원'
      };

      const response = await request(app)
        .post('/api/support/inquiry')
        .set('Authorization', `Bearer ${authToken}`)
        .send(inquiryData)
        .expect(201);

      expect(response.body.inquiry.created_at).toBeDefined();
      expect(response.body.inquiry.updated_at).toBeDefined();
      
      const createdAt = new Date(response.body.inquiry.created_at);
      expect(createdAt).toBeInstanceOf(Date);
      expect(createdAt.getTime()).toBeLessThanOrEqual(Date.now());
    });
  });

  afterAll(async () => {
    // Clean up test user
    try {
      await request(app)
        .delete('/api/user/account')
        .set('Authorization', `Bearer ${authToken}`);
    } catch (error) {
      // Ignore cleanup errors
    }
  });
});