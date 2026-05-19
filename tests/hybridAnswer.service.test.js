jest.mock('../src/models/transcriptChunk.model', () => ({
  find: jest.fn(),
}));

jest.mock('../src/services/summary.service', () => ({
  getOrCreateVideoSummary: jest.fn(),
}));

jest.mock('../src/services/embeddingClient.service', () => ({
  searchVideoEmbeddings: jest.fn(),
}));

const TranscriptChunk = require('../src/models/transcriptChunk.model');
const { getOrCreateVideoSummary } = require('../src/services/summary.service');
const { searchVideoEmbeddings } = require('../src/services/embeddingClient.service');

const {
  getHybridGrounding,
  getDistributedGroundingChunks,
  getSemanticGroundingChunks,
  isBroadActionQuery,
  isSpecificGroundingQuery,
} = require('../src/services/hybridAnswer.service');

const mockVideo = {
  _id: 'video-id',
  videoId: 'youtube-id',
};

const mockSummary = {
  shortSummary: 'Short summary',
  detailedSummary: 'Detailed summary',
  mainTopics: ['Topic 1'],
  keyTakeaways: ['Takeaway 1'],
  people: [],
  topics: [],
};

const mockDistributedChunks = (chunks) => {
  TranscriptChunk.find.mockReturnValue({
    sort: jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue(chunks),
    }),
  });
};

describe('hybridAnswer.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getOrCreateVideoSummary.mockResolvedValue(mockSummary);
  });

  test('detects broad action query', () => {
    expect(isBroadActionQuery('Create notes from this video')).toBe(true);
  });

  test('detects specific grounding query', () => {
    expect(isSpecificGroundingQuery('Create notes about thorium reactors')).toBe(true);
  });

  test('uses distributed grounding for broad action query', async () => {
    mockDistributedChunks([
      { chunkIndex: 0, text: 'Intro chunk', startTime: 0 },
      { chunkIndex: 1, text: 'Middle chunk', startTime: 120 },
      { chunkIndex: 2, text: 'Ending chunk', startTime: 240 },
    ]);

    const result = await getHybridGrounding({
      video: mockVideo,
      query: 'Create notes from this video',
    });

    expect(result.strategy).toBe('distributed');
    expect(result.chunks.length).toBeGreaterThan(0);
    expect(TranscriptChunk.find).toHaveBeenCalledWith({ video: mockVideo._id });
    expect(searchVideoEmbeddings).not.toHaveBeenCalled();
    expect(result.context).toContain('Full-video summary');
    expect(result.context).toContain('Detailed transcript grounding');
  });

  test('uses semantic grounding for specific query', async () => {
    searchVideoEmbeddings.mockResolvedValue({
      matches: [
        {
          text: 'Thorium reactor specific chunk',
          startTime: 300,
        },
      ],
    });

    const result = await getHybridGrounding({
      video: mockVideo,
      query: 'Create notes about thorium reactors',
      topK: 5,
    });

    expect(result.strategy).toBe('semantic');
    expect(searchVideoEmbeddings).toHaveBeenCalledWith({
      videoId: mockVideo._id,
      query: 'Create notes about thorium reactors',
      topK: 5,
    });
    expect(result.chunks).toHaveLength(1);
    expect(result.context).toContain('Thorium reactor specific chunk');
  });

  test('distributed grounding filters promotional chunks', async () => {
    mockDistributedChunks([
      { chunkIndex: 0, text: 'Subscribe to the channel and join masterclass', startTime: 0 },
      { chunkIndex: 1, text: 'Important core video content', startTime: 120 },
    ]);

    const chunks = await getDistributedGroundingChunks({
      video: mockVideo,
      maxChunks: 10,
    });

    expect(chunks).toHaveLength(1);
    expect(chunks[0].text).toBe('Important core video content');
  });

  test('semantic grounding filters promotional matches', async () => {
    searchVideoEmbeddings.mockResolvedValue({
      matches: [
        { text: 'Join my communication masterclass', startTime: 0 },
        { text: 'Important semantic result', startTime: 120 },
      ],
    });

    const chunks = await getSemanticGroundingChunks({
      video: mockVideo,
      query: 'test query',
      topK: 5,
    });

    expect(chunks).toHaveLength(1);
    expect(chunks[0].text).toBe('Important semantic result');
  });
});
