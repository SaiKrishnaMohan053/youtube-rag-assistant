jest.mock('../src/models/transcriptChunk.model', () => ({
  find: jest.fn(),
}));

jest.mock('../src/services/llm.service', () => ({
  generateAnswer: jest.fn(),
}));

const TranscriptChunk = require('../src/models/transcriptChunk.model');
const { generateAnswer } = require('../src/services/llm.service');

const {
  getOrCreateVideoSummary,
  generateAndSaveVideoSummary,
  answerFromVideoSummary,
  answerFromEntitySummary,
  answerFromTopicSummary,
} = require('../src/services/summary.service');

const createMockVideo = (overrides = {}) => ({
  _id: 'video-mongo-id-1',
  title: 'Test Video',
  summaryStatus: 'pending',
  summaryError: null,
  summary: {},
  save: jest.fn().mockResolvedValue(true),
  ...overrides,
});

const mockFindChunks = (chunks) => {
  TranscriptChunk.find.mockReturnValue({
    sort: jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue(chunks),
    }),
  });
};

describe('summary.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns existing completed summary without regenerating', async () => {
    const existingSummary = {
      shortSummary: 'Short summary',
      detailedSummary: 'Detailed summary',
      mainTopics: ['Topic 1'],
      keyTakeaways: ['Takeaway 1'],
      people: [],
      topics: [],
    };

    const video = createMockVideo({
      summaryStatus: 'completed',
      summary: existingSummary,
    });

    const result = await getOrCreateVideoSummary(video);

    expect(result).toBe(existingSummary);
    expect(TranscriptChunk.find).not.toHaveBeenCalled();
    expect(generateAnswer).not.toHaveBeenCalled();
    expect(video.save).not.toHaveBeenCalled();
  });

  test('generates and saves summary when summary is missing', async () => {
    const video = createMockVideo();

    mockFindChunks([
      {
        chunkIndex: 0,
        text: 'The speaker introduces the main topic.',
        startTime: 0,
      },
      {
        chunkIndex: 1,
        text: 'The discussion covers AI and future technology.',
        startTime: 30,
      },
    ]);

    generateAnswer
      .mockResolvedValueOnce('- Section summary about AI and technology')
      .mockResolvedValueOnce(
        JSON.stringify({
          shortSummary: 'Short generated summary',
          detailedSummary: 'Detailed generated summary',
          mainTopics: ['AI', 'Technology'],
          keyTakeaways: ['AI is important'],
          people: [
            {
              name: 'Main speaker',
              summary: 'Discusses AI',
              talkedAbout: ['AI', 'Technology'],
            },
          ],
          topics: [
            {
              name: 'AI',
              summary: 'AI topic summary',
              keyPoints: ['AI point'],
            },
          ],
        })
      );

    const result = await generateAndSaveVideoSummary(video);

    expect(TranscriptChunk.find).toHaveBeenCalledWith({ video: video._id });
    expect(generateAnswer).toHaveBeenCalledTimes(2);
    expect(video.summaryStatus).toBe('completed');
    expect(video.summaryError).toBeNull();
    expect(video.summary.shortSummary).toBe('Short generated summary');
    expect(video.summary.detailedSummary).toBe('Detailed generated summary');
    expect(video.summary.mainTopics).toEqual(['AI', 'Technology']);
    expect(video.summary.people[0].name).toBe('Main speaker');
    expect(video.summary.topics[0].name).toBe('AI');
    expect(video.save).toHaveBeenCalled();
    expect(result.shortSummary).toBe('Short generated summary');
  });

  test('falls back safely when final LLM response is not JSON', async () => {
    const video = createMockVideo();

    mockFindChunks([
      {
        chunkIndex: 0,
        text: 'This is a meaningful transcript section.',
        startTime: 0,
      },
    ]);

    generateAnswer
      .mockResolvedValueOnce('- Section summary')
      .mockResolvedValueOnce('Plain text summary, not JSON');

    const result = await generateAndSaveVideoSummary(video);

    expect(video.summaryStatus).toBe('completed');
    expect(video.summary.shortSummary).toBe('Plain text summary, not JSON');
    expect(video.summary.detailedSummary).toBe('Plain text summary, not JSON');
    expect(video.summary.mainTopics).toEqual([]);
    expect(video.summary.people).toEqual([]);
    expect(video.summary.topics).toEqual([]);
    expect(result.detailedSummary).toBe('Plain text summary, not JSON');
  });

  test('throws error when transcript chunks do not exist', async () => {
    const video = createMockVideo();

    mockFindChunks([]);

    await expect(generateAndSaveVideoSummary(video)).rejects.toThrow(
      'No transcript chunks found for this video'
    );

    expect(generateAnswer).not.toHaveBeenCalled();
  });

  test('answerFromVideoSummary uses saved summary context', async () => {
    const video = createMockVideo({
      summaryStatus: 'completed',
      summary: {
        shortSummary: 'Short summary',
        detailedSummary: 'This video explains AI and robotics.',
        mainTopics: ['AI', 'Robotics'],
        keyTakeaways: ['AI is changing work'],
        people: [],
        topics: [],
      },
    });

    generateAnswer.mockResolvedValueOnce('Final user-facing video summary answer');

    const answer = await answerFromVideoSummary({
      video,
      query: 'What is this video about?',
    });

    expect(generateAnswer).toHaveBeenCalledTimes(1);
    expect(generateAnswer.mock.calls[0][0]).toContain('This video explains AI and robotics.');
    expect(answer).toBe('Final user-facing video summary answer');
  });

  test('answerFromEntitySummary uses matching person summary', async () => {
    const video = createMockVideo({
      summaryStatus: 'completed',
      summary: {
        shortSummary: 'Short summary',
        detailedSummary: 'Detailed summary',
        mainTopics: [],
        keyTakeaways: [],
        people: [
          {
            name: 'Vijay',
            summary: 'Vijay discusses governance and public trust.',
            talkedAbout: ['governance', 'public trust'],
          },
        ],
        topics: [],
      },
    });

    generateAnswer.mockResolvedValueOnce('Vijay mainly talks about governance.');

    const answer = await answerFromEntitySummary({
      video,
      query: 'What is Vijay talking about?',
      entity: 'Vijay',
    });

    expect(generateAnswer).toHaveBeenCalledTimes(1);
    expect(generateAnswer.mock.calls[0][0]).toContain('Vijay discusses governance');
    expect(answer).toBe('Vijay mainly talks about governance.');
  });

  test('answerFromEntitySummary falls back to full summary when person is not found', async () => {
    const video = createMockVideo({
      summaryStatus: 'completed',
      summary: {
        shortSummary: 'Short summary',
        detailedSummary: 'The full video is about politics and governance.',
        mainTopics: [],
        keyTakeaways: [],
        people: [
          {
            name: 'Speaker',
            summary: 'General speaker summary',
            talkedAbout: [],
          },
        ],
        topics: [],
      },
    });

    generateAnswer.mockResolvedValueOnce('Answer from available full-video summary.');

    const answer = await answerFromEntitySummary({
      video,
      query: 'What is Arjun talking about?',
      entity: 'Arjun',
    });

    expect(generateAnswer).toHaveBeenCalledTimes(1);
    expect(generateAnswer.mock.calls[0][0]).toContain(
      'The full video is about politics and governance.'
    );
    expect(answer).toBe('Answer from available full-video summary.');
  });

  test('answerFromTopicSummary uses matching topic summary', async () => {
    const video = createMockVideo({
      summaryStatus: 'completed',
      summary: {
        shortSummary: 'Short summary',
        detailedSummary: 'Detailed summary',
        mainTopics: ['AI'],
        keyTakeaways: [],
        people: [],
        topics: [
          {
            name: 'AI',
            summary: 'The AI section explains risks and opportunities.',
            keyPoints: ['AI risk', 'AI opportunity'],
          },
        ],
      },
    });

    generateAnswer.mockResolvedValueOnce('The video talks about AI risks and opportunities.');

    const answer = await answerFromTopicSummary({
      video,
      query: 'AI gurinchi main points enti?',
      topic: 'AI',
    });

    expect(generateAnswer).toHaveBeenCalledTimes(1);
    expect(generateAnswer.mock.calls[0][0]).toContain(
      'The AI section explains risks and opportunities.'
    );
    expect(answer).toBe('The video talks about AI risks and opportunities.');
  });

  test('answerFromTopicSummary falls back to full summary when topic is not found', async () => {
    const video = createMockVideo({
      summaryStatus: 'completed',
      summary: {
        shortSummary: 'Short summary',
        detailedSummary: 'The full video discusses leadership and public service.',
        mainTopics: ['Leadership'],
        keyTakeaways: [],
        people: [],
        topics: [
          {
            name: 'Leadership',
            summary: 'Leadership topic summary',
            keyPoints: [],
          },
        ],
      },
    });

    generateAnswer.mockResolvedValueOnce('Answer from available full-video topic context.');

    const answer = await answerFromTopicSummary({
      video,
      query: 'Education gurinchi main points enti?',
      topic: 'Education',
    });

    expect(generateAnswer).toHaveBeenCalledTimes(1);
    expect(generateAnswer.mock.calls[0][0]).toContain(
      'The full video discusses leadership and public service.'
    );
    expect(answer).toBe('Answer from available full-video topic context.');
  });
});
