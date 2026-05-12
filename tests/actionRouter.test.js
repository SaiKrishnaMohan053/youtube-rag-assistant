const { ACTION_TYPES, detectActionType } = require('../src/utils/actionRouter');

describe('actionRouter', () => {
  test('detects detailed notes', () => {
    expect(detectActionType('Create detailed notes from this video')).toBe(
      ACTION_TYPES.DETAILED_NOTES
    );
  });

  test('detects generic notes', () => {
    expect(detectActionType('Create notes from this video')).toBe(ACTION_TYPES.GENERIC_NOTES);
  });

  test('detects LinkedIn post', () => {
    expect(detectActionType('Create LinkedIn post from this video')).toBe(
      ACTION_TYPES.LINKEDIN_POST
    );
  });

  test('detects tweet thread', () => {
    expect(detectActionType('Create tweet thread from this video')).toBe(ACTION_TYPES.TWEET_THREAD);
  });

  test('detects blog outline', () => {
    expect(detectActionType('Create blog outline from this video')).toBe(ACTION_TYPES.BLOG_OUTLINE);
  });

  test('detects action items', () => {
    expect(detectActionType('Give me action items')).toBe(ACTION_TYPES.ACTION_ITEMS);
  });

  test('detects key takeaways', () => {
    expect(detectActionType('Give me key takeaways')).toBe(ACTION_TYPES.KEY_TAKEAWAYS);
  });

  test('defaults to generic notes', () => {
    expect(detectActionType('Prepare something useful')).toBe(ACTION_TYPES.GENERIC_NOTES);
  });
});
