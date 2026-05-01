const { getYouTubeVideoId } = require('../src/utils/youtube');

describe('getYouTubeVideoId', () => {
  it('extracts from watch URL', () => {
    expect(getYouTubeVideoId('https://www.youtube.com/watch?v=abc123XYZ_9')).toBe('abc123XYZ_9');
  });

  it('extracts from youtu.be URL', () => {
    expect(getYouTubeVideoId('https://youtu.be/abc123XYZ_9')).toBe('abc123XYZ_9');
  });

  it('extracts from shorts URL', () => {
    expect(getYouTubeVideoId('https://youtube.com/shorts/abc123XYZ_9')).toBe('abc123XYZ_9');
  });

  it('extracts from embed URL', () => {
    expect(getYouTubeVideoId('https://youtube.com/embed/abc123XYZ_9')).toBe('abc123XYZ_9');
  });
});
