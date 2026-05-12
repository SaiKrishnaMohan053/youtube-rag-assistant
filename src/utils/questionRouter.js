const QUESTION_INTENTS = Object.freeze({
  VIDEO_OVERVIEW: 'VIDEO_OVERVIEW',
  ENTITY_OVERVIEW: 'ENTITY_OVERVIEW',
  TOPIC_OVERVIEW: 'TOPIC_OVERVIEW',
  SPECIFIC_QA: 'SPECIFIC_QA',
  ACTION_EXTRACTION: 'ACTION_EXTRACTION',
  TIMESTAMP_QUERY: 'TIMESTAMP_QUERY',
});

const normalizeQuestion = (question = '') =>
  String(question).toLowerCase().replace(/\s+/g, ' ').trim();

const matchAny = (question, patterns) => patterns.some((pattern) => pattern.test(question));

const extractMatch = (question, patterns) => {
  for (const pattern of patterns) {
    const match = question.match(pattern);
    const value = match?.[1]?.trim();

    if (value) {
      return value.replace(/[?.!,]+$/g, '').trim();
    }
  }

  return null;
};

const TIMESTAMP_PATTERNS = [
  /timestamp/i,
  /timestamps/i,
  /when did/i,
  /where did/i,
  /at what time/i,
  /which part/i,
];

const ACTION_EXTRACTION_PATTERNS = [
  /create notes/i,
  /make notes/i,
  /study notes/i,
  /action items/i,
  /steps/i,
  /checklist/i,
  /blog outline/i,
  /linkedin post/i,
  /tweet/i,
];

const TOPIC_OVERVIEW_PATTERNS = [
  /^([a-z0-9][a-z0-9\s.'-]{1,80}) gurinchi main points/i,
  /^([a-z0-9][a-z0-9\s.'-]{1,80}) gurinchi em chepp/i,
  /main points.*about ([a-z0-9][a-z0-9\s.'-]{1,80})/i,
  /overview.*about ([a-z0-9][a-z0-9\s.'-]{1,80})/i,
  /summari[sz]e.*about ([a-z0-9][a-z0-9\s.'-]{1,80})/i,
  /explain ([a-z0-9][a-z0-9\s.'-]{1,80}) topic/i,
  /([a-z0-9][a-z0-9\s.'-]{1,80}) topic/i,
];

const VIDEO_OVERVIEW_PATTERNS = [
  /what is this video about/i,
  /what is this video/i,
  /summari[sz]e/i,
  /summary/i,
  /overview/i,
  /main points/i,
  /key points/i,
  /key takeaways/i,
  /takeaways/i,
  /explain this video/i,
];

const ENTITY_OVERVIEW_PATTERNS = [
  /what did ([a-z][a-z\s.'-]{1,80}) talk about/i,
  /what is ([a-z][a-z\s.'-]{1,80}) talking about/i,
  /what ([a-z][a-z\s.'-]{1,80}) said in this video/i,
  /what does ([a-z][a-z\s.'-]{1,80}) discuss/i,
  /^([a-z][a-z\s.'-]{1,80}) em matlad/i,
];

const SPECIFIC_MARKERS = [
  /why/i,
  /how/i,
  /what reason/i,
  /exact/i,
  /example/i,
  /difference/i,
  /compare/i,
  /did .* mention/i,
  /what did .* say about/i,
  /what does .* say about/i,
  /say about/i,
];

const STOP_ENTITIES = new Set([
  'this video',
  'the video',
  'video',
  'he',
  'she',
  'they',
  'give me the',
  'give me',
]);

const looksSpecific = (question) => matchAny(question, SPECIFIC_MARKERS);

const routeQuestion = (question = '') => {
  const originalQuestion = String(question || '').trim();
  const normalizedQuestion = normalizeQuestion(originalQuestion);

  if (!normalizedQuestion) {
    return {
      intent: QUESTION_INTENTS.SPECIFIC_QA,
      confidence: 0,
      entity: null,
      topic: null,
      source: 'rules',
    };
  }

  if (matchAny(normalizedQuestion, TIMESTAMP_PATTERNS)) {
    return {
      intent: QUESTION_INTENTS.TIMESTAMP_QUERY,
      confidence: 0.9,
      entity: null,
      topic: null,
      source: 'rules',
    };
  }

  if (matchAny(normalizedQuestion, ACTION_EXTRACTION_PATTERNS)) {
    return {
      intent: QUESTION_INTENTS.ACTION_EXTRACTION,
      confidence: 0.9,
      entity: null,
      topic: null,
      source: 'rules',
    };
  }

  const topic = extractMatch(originalQuestion, TOPIC_OVERVIEW_PATTERNS);
  if (topic && !looksSpecific(normalizedQuestion)) {
    return {
      intent: QUESTION_INTENTS.TOPIC_OVERVIEW,
      confidence: 0.78,
      entity: null,
      topic,
      source: 'rules',
    };
  }

  if (matchAny(normalizedQuestion, VIDEO_OVERVIEW_PATTERNS)) {
    return {
      intent: QUESTION_INTENTS.VIDEO_OVERVIEW,
      confidence: 0.9,
      entity: null,
      topic: null,
      source: 'rules',
    };
  }

  const entity = extractMatch(originalQuestion, ENTITY_OVERVIEW_PATTERNS);
  if (entity && !STOP_ENTITIES.has(entity.toLowerCase()) && !looksSpecific(normalizedQuestion)) {
    return {
      intent: QUESTION_INTENTS.ENTITY_OVERVIEW,
      confidence: 0.85,
      entity,
      topic: null,
      source: 'rules',
    };
  }

  return {
    intent: QUESTION_INTENTS.SPECIFIC_QA,
    confidence: 0.65,
    entity: null,
    topic: null,
    source: 'rules',
  };
};

module.exports = {
  QUESTION_INTENTS,
  routeQuestion,
  normalizeQuestion,
};
