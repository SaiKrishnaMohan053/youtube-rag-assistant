describe('llm provider selection', () => {
  afterEach(() => {
    jest.resetModules();
    delete process.env.LLM_PROVIDER;
    delete process.env.OPENAI_API_KEY;
  });

  it('uses ollama provider by default', async () => {
    process.env.LLM_PROVIDER = 'ollama';

    jest.doMock('axios', () => ({
      create: () => ({
        post: jest.fn().mockResolvedValue({ data: { response: 'ollama answer' } }),
      }),
    }));

    jest.doMock('openai', () => jest.fn());

    const { generateAnswer } = require('../src/services/llm.service');
    const result = await generateAnswer('hello');
    expect(result).toBe('ollama answer');
  });

  it('uses openai provider when configured', async () => {
    process.env.LLM_PROVIDER = 'openai';
    process.env.OPENAI_API_KEY = 'test-key';

    jest.doMock('axios', () => ({
      create: () => ({ post: jest.fn() }),
    }));

    const create = jest.fn().mockResolvedValue({ output_text: 'openai answer' });
    jest.doMock('openai', () => {
      return jest.fn().mockImplementation(() => ({
        responses: { create },
      }));
    });

    const { generateAnswer } = require('../src/services/llm.service');
    const result = await generateAnswer('hello');
    expect(result).toBe('openai answer');
    expect(create).toHaveBeenCalled();
  });
});
