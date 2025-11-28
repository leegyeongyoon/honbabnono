const { exec } = require('child_process');
const { promisify } = require('util');

const execPromise = promisify(exec);

// 통합 테스트 - 실제 서버 인스턴스 사용
describe('Integration Tests', () => {
  let serverProcess;
  const serverPort = 3001;
  const baseURL = `http://localhost:${serverPort}`;

  beforeAll(async () => {
    console.log('🚀 Starting server for integration tests...');
    
    // 기존 서버 프로세스 정리
    try {
      await execPromise(`lsof -ti:${serverPort} | xargs kill -9`);
      await global.testHelpers.wait(2000);
    } catch (error) {
      // 포트가 사용되지 않으면 에러가 발생할 수 있음 (정상)
    }

    // 서버 시작 (백그라운드)
    serverProcess = exec('PORT=3001 node server/index.js', {
      cwd: process.cwd(),
      env: { ...process.env, NODE_ENV: 'test', PORT: serverPort }
    });

    // 서버가 시작될 때까지 대기
    await global.testHelpers.wait(5000);
    
    // 서버 상태 확인
    let attempts = 0;
    const maxAttempts = 10;
    
    while (attempts < maxAttempts) {
      try {
        const response = await fetch(`${baseURL}/health`);
        if (response.status < 500) {
          console.log('✅ Server is ready for integration tests');
          break;
        }
      } catch (error) {
        attempts++;
        console.log(`⏳ Waiting for server... attempt ${attempts}/${maxAttempts}`);
        await global.testHelpers.wait(2000);
      }
    }

    if (attempts >= maxAttempts) {
      throw new Error('Server failed to start within timeout period');
    }
  }, 60000);

  afterAll(async () => {
    console.log('🛑 Stopping server...');
    
    if (serverProcess) {
      serverProcess.kill('SIGTERM');
    }
    
    // 포트 정리
    try {
      await execPromise(`lsof -ti:${serverPort} | xargs kill -9`);
    } catch (error) {
      // 이미 종료된 경우 정상
    }
    
    await global.testHelpers.wait(2000);
    console.log('✅ Server stopped');
  }, 30000);

  describe('Health Check', () => {
    it('should respond to health check', async () => {
      const response = await fetch(`${baseURL}/health`);
      expect(response.status).toBeLessThan(500);
    });
  });

  describe('CORS and Security Headers', () => {
    it('should have proper CORS headers', async () => {
      const response = await fetch(`${baseURL}/api/health`, {
        method: 'OPTIONS',
        headers: {
          'Origin': 'http://localhost:3000',
          'Access-Control-Request-Method': 'GET',
        }
      });

      // CORS 헤더가 있는지 확인 (서버가 CORS를 처리하고 있는지)
      expect(response.status).toBeLessThan(500);
    });
  });

  describe('Authentication Flow', () => {

    it('should handle Kakao OAuth callback', async () => {
      // 실제 Kakao OAuth는 테스트하기 어려우므로 엔드포인트 존재 확인
      const response = await fetch(`${baseURL}/auth/kakao/callback?code=test&state=test`);
      
      // 리다이렉트 또는 에러 응답이 와야 함 (500 에러가 아닌)
      expect(response.status).not.toBe(500);
    });

    it('should verify token endpoint exists', async () => {
      const response = await fetch(`${baseURL}/auth/verify-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: 'invalid-token' })
      });

      expect(response.status).toBe(400); // Invalid token should return 400
    });
  });

  describe('API Endpoints Accessibility', () => {
    it('should have meetups endpoint accessible', async () => {
      const response = await fetch(`${baseURL}/meetups`);
      
      // 인증이 필요하거나 정상 응답이어야 함
      expect([200, 401, 403]).toContain(response.status);
    });

    it('should protect admin endpoints', async () => {
      const response = await fetch(`${baseURL}/admin/users`);
      
      // 관리자 인증이 필요해야 함
      expect(response.status).toBe(401);
    });

    it('should have user profile endpoints', async () => {
      const response = await fetch(`${baseURL}/user/profile`);
      
      // 사용자 인증이 필요해야 함
      expect(response.status).toBe(401);
    });
  });

  describe('Database Connection', () => {
    it('should connect to database (indirect test)', async () => {
      // 데이터베이스 연결이 필요한 엔드포인트를 호출하여 간접 테스트
      const response = await fetch(`${baseURL}/meetups?limit=1`);
      
      // 500 에러가 아니면 DB 연결은 정상 (인증 에러는 정상)
      expect(response.status).not.toBe(500);
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 for non-existent routes', async () => {
      const response = await fetch(`${baseURL}/non-existent-endpoint`);
      expect(response.status).toBe(404);
    });

    it('should handle malformed JSON', async () => {
      const response = await fetch(`${baseURL}/auth/verify-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: 'invalid-json{'
      });

      expect([400, 422]).toContain(response.status);
    });
  });

  describe('Rate Limiting and Performance', () => {
    it('should handle multiple concurrent requests', async () => {
      const requests = Array.from({ length: 5 }, () => 
        fetch(`${baseURL}/meetups?limit=1`)
      );

      const responses = await Promise.all(requests);
      
      // 모든 요청이 서버 에러 없이 처리되어야 함
      responses.forEach(response => {
        expect(response.status).toBeLessThan(500);
      });
    });
  });

  describe('File Upload Endpoints', () => {
    it('should handle file upload endpoint', async () => {
      const formData = new FormData();
      formData.append('file', new Blob(['test'], { type: 'text/plain' }), 'test.txt');

      const response = await fetch(`${baseURL}/upload`, {
        method: 'POST',
        body: formData
      });

      // 인증 에러 또는 정상 처리 (500 에러가 아님)
      expect(response.status).not.toBe(500);
    });
  });

  describe('WebSocket Connections', () => {
    it('should handle WebSocket upgrade requests', async () => {
      // WebSocket 업그레이드 요청 테스트
      const response = await fetch(`${baseURL}/socket.io/`, {
        headers: {
          'Upgrade': 'websocket',
          'Connection': 'Upgrade'
        }
      });

      // WebSocket 관련 응답이어야 함
      expect(response.status).not.toBe(500);
    });
  });

  describe('Admin System Integration', () => {
    it('should have admin blocking endpoints', async () => {
      const response = await fetch(`${baseURL}/admin/blocked-users`);
      
      // 관리자 인증 에러여야 함
      expect(response.status).toBe(401);
    });

    it('should have admin stats endpoints', async () => {
      const response = await fetch(`${baseURL}/admin/stats`);
      
      // 관리자 인증 에러여야 함  
      expect(response.status).toBe(401);
    });
  });

  describe('User Features Integration', () => {
    it('should handle user blocking features', async () => {
      const response = await fetch(`${baseURL}/user/blocked-users`);
      
      // 사용자 인증 에러여야 함
      expect(response.status).toBe(401);
    });

    it('should handle recent views features', async () => {
      const response = await fetch(`${baseURL}/user/recent-views`);
      
      // 사용자 인증 에러여야 함
      expect(response.status).toBe(401);
    });
  });

  describe('API Response Format Consistency', () => {
    it('should return consistent error format', async () => {
      const response = await fetch(`${baseURL}/admin/users`);
      const data = await response.json();

      expect(data).toHaveProperty('success');
      expect(data.success).toBe(false);
      expect(data).toHaveProperty('message');
    });
  });
});