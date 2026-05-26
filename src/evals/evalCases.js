const EVAL_CASES = [
  {
    id: 'overview_1',
    category: 'video_overview',
    routeType: 'auth',
    question: 'What is this video about?',
    expectedIntent: 'VIDEO_OVERVIEW',
    expectedMode: 'summary',
    expectedKeywords: [],
  },

  {
    id: 'qa_1',
    category: 'specific_qa',
    routeType: 'auth',
    question: 'What did the speaker say about this topic?',
    expectedIntent: 'SPECIFIC_QA',
    expectedMode: 'qa',
    expectedKeywords: [],
  },

  {
    id: 'timestamp_1',
    category: 'timestamp_query',
    routeType: 'auth',
    question: 'When did they talk about this?',
    expectedIntent: 'TIMESTAMP_QUERY',
    expectedMode: 'timestamp_query',
    expectedKeywords: [],
  },

  {
    id: 'topic_1',
    category: 'topic_overview',
    routeType: 'auth',
    question: 'Explain AI topic',
    expectedIntent: 'TOPIC_OVERVIEW',
    expectedMode: 'topic_overview',
    expectedKeywords: [],
  },

  {
    id: 'entity_1',
    category: 'entity_overview',
    routeType: 'auth',
    question: 'What did Elon Musk talk about?',
    expectedIntent: 'ENTITY_OVERVIEW',
    expectedMode: 'entity_overview',
    expectedKeywords: [],
  },

  {
    id: 'action_1',
    category: 'action_extraction',
    routeType: 'auth',
    question: 'Create detailed notes',
    expectedIntent: 'ACTION_EXTRACTION',
    expectedMode: 'action_extraction',
    expectedKeywords: [],
  },

  {
    id: 'guest_summary_1',
    category: 'guest_summary',
    routeType: 'guest',
  },

  {
    id: 'guest_qa_1',
    category: 'guest_qa',
    routeType: 'guest',
    question: 'What is the video about?',
  },
];

module.exports = {
  EVAL_CASES,
};