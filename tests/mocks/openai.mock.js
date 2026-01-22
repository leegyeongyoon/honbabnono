/**
 * OpenAI API Mock
 * AI 기능 테스트를 위한 OpenAI 목킹
 */

const mockChatCompletion = {
  id: 'chatcmpl-mock-12345',
  object: 'chat.completion',
  created: Date.now(),
  model: 'gpt-4',
  choices: [
    {
      index: 0,
      message: {
        role: 'assistant',
        content: '안녕하세요! 무엇을 도와드릴까요?',
      },
      finish_reason: 'stop',
    },
  ],
  usage: {
    prompt_tokens: 10,
    completion_tokens: 20,
    total_tokens: 30,
  },
};

const mockEmbedding = {
  object: 'list',
  data: [
    {
      object: 'embedding',
      index: 0,
      embedding: new Array(1536).fill(0).map(() => Math.random()),
    },
  ],
  model: 'text-embedding-ada-002',
  usage: {
    prompt_tokens: 5,
    total_tokens: 5,
  },
};

/**
 * OpenAI Mock 클래스
 */
class MockOpenAI {
  constructor() {
    this.chat = {
      completions: {
        create: jest.fn().mockResolvedValue(mockChatCompletion),
      },
    };
    this.embeddings = {
      create: jest.fn().mockResolvedValue(mockEmbedding),
    };
  }
}

/**
 * OpenAI 모듈 Mock 설정
 */
const setupOpenAIMock = () => {
  jest.doMock('openai', () => ({
    OpenAI: MockOpenAI,
    default: MockOpenAI,
  }));
};

/**
 * 커스텀 AI 응답 생성
 * @param {string} content - AI 응답 내용
 */
const createMockCompletion = (content) => ({
  ...mockChatCompletion,
  choices: [
    {
      ...mockChatCompletion.choices[0],
      message: {
        role: 'assistant',
        content,
      },
    },
  ],
});

module.exports = {
  MockOpenAI,
  mockChatCompletion,
  mockEmbedding,
  setupOpenAIMock,
  createMockCompletion,
};
