const { routeQuestion, QUESTION_INTENTS } = require('../src/utils/questionRouter');

describe('questionRouter', () => {
  test('detects video overview questions', () => {
    const result = routeQuestion('What is this video about?');

    expect(result.intent).toBe(QUESTION_INTENTS.VIDEO_OVERVIEW);
    expect(result.confidence).toBeGreaterThanOrEqual(0.8);
    expect(result.entity).toBeNull();
    expect(result.topic).toBeNull();
  });

  test('detects summarize questions as video overview', () => {
    const result = routeQuestion('Summarize this video');

    expect(result.intent).toBe(QUESTION_INTENTS.VIDEO_OVERVIEW);
  });

  test('detects main points questions as video overview', () => {
    const result = routeQuestion('Give me the main points');

    expect(result.intent).toBe(QUESTION_INTENTS.VIDEO_OVERVIEW);
  });

  test('detects entity overview questions', () => {
    const result = routeQuestion('What is Vijay talking about in this video?');

    expect(result.intent).toBe(QUESTION_INTENTS.ENTITY_OVERVIEW);
    expect(result.entity).toBe('Vijay');
    expect(result.topic).toBeNull();
  });

  test('detects Telugu-style entity overview questions', () => {
    const result = routeQuestion('Vijay em matladadu?');

    expect(result.intent).toBe(QUESTION_INTENTS.ENTITY_OVERVIEW);
    expect(result.entity).toBe('Vijay');
  });

  test('does not classify specific entity-topic question as entity overview', () => {
    const result = routeQuestion('What did Vijay say about governance?');

    expect(result.intent).toBe(QUESTION_INTENTS.SPECIFIC_QA);
  });

  test('detects topic overview questions', () => {
    const result = routeQuestion('AI gurinchi main points enti?');

    expect(result.intent).toBe(QUESTION_INTENTS.TOPIC_OVERVIEW);
    expect(result.topic).toBe('AI');
    expect(result.entity).toBeNull();
  });

  test('detects action extraction questions', () => {
    const result = routeQuestion('Create notes from this video');

    expect(result.intent).toBe(QUESTION_INTENTS.ACTION_EXTRACTION);
  });

  test('detects key takeaways as video overview', () => {
    const result = routeQuestion('Give me key takeaways');

    expect(result.intent).toBe(QUESTION_INTENTS.VIDEO_OVERVIEW);
  });

  test('detects timestamp questions', () => {
    const result = routeQuestion('When did they talk about Tesla?');

    expect(result.intent).toBe(QUESTION_INTENTS.TIMESTAMP_QUERY);
  });

  test('defaults normal questions to specific QA', () => {
    const result = routeQuestion('What did he say about education?');

    expect(result.intent).toBe(QUESTION_INTENTS.SPECIFIC_QA);
  });

  test('handles empty question safely', () => {
    const result = routeQuestion('');

    expect(result.intent).toBe(QUESTION_INTENTS.SPECIFIC_QA);
    expect(result.confidence).toBe(0);
  });
});
