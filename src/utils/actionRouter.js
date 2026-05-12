const ACTION_TYPES = Object.freeze({
  DETAILED_NOTES: 'DETAILED_NOTES',
  STUDY_NOTES: 'STUDY_NOTES',
  LINKEDIN_POST: 'LINKEDIN_POST',
  TWEET_THREAD: 'TWEET_THREAD',
  BLOG_OUTLINE: 'BLOG_OUTLINE',
  ACTION_ITEMS: 'ACTION_ITEMS',
  KEY_TAKEAWAYS: 'KEY_TAKEAWAYS',
  GENERIC_NOTES: 'GENERIC_NOTES',
});

const ACTION_PATTERNS = [
  {
    type: ACTION_TYPES.DETAILED_NOTES,
    patterns: [/detailed notes/i, /create detailed notes/i, /make detailed notes/i, /deep notes/i],
  },
  {
    type: ACTION_TYPES.STUDY_NOTES,
    patterns: [/study notes/i, /exam notes/i, /revision notes/i, /class notes/i],
  },
  {
    type: ACTION_TYPES.LINKEDIN_POST,
    patterns: [/linkedin post/i, /linkedin content/i],
  },
  {
    type: ACTION_TYPES.TWEET_THREAD,
    patterns: [/tweet thread/i, /twitter thread/i, /tweets/i],
  },
  {
    type: ACTION_TYPES.BLOG_OUTLINE,
    patterns: [/blog outline/i, /blog post/i, /article outline/i],
  },
  {
    type: ACTION_TYPES.ACTION_ITEMS,
    patterns: [/action items/i, /todo/i, /tasks/i, /steps/i, /action plan/i],
  },
  {
    type: ACTION_TYPES.KEY_TAKEAWAYS,
    patterns: [/key takeaways/i, /important takeaways/i],
  },
  {
    type: ACTION_TYPES.GENERIC_NOTES,
    patterns: [/create notes/i, /make notes/i, /notes from this video/i],
  },
];

const detectActionType = (query = '') => {
  for (const item of ACTION_PATTERNS) {
    const matched = item.patterns.some((pattern) => pattern.test(query));

    if (matched) {
      return item.type;
    }
  }

  return ACTION_TYPES.GENERIC_NOTES;
};

module.exports = {
  ACTION_TYPES,
  detectActionType,
};
