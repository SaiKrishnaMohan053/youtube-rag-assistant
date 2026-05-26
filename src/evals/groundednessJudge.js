const { generateAnswer } = require('../services/llm.service');

const truncate = (text = '', max = 4000) => {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  return clean.length > max ? `${clean.slice(0, max)}...` : clean;
};

const safeJsonParse = (value = '') => {
  try {
    const start = value.indexOf('{');
    const end = value.lastIndexOf('}');
    if (start === -1 || end === -1) return null;
    return JSON.parse(value.slice(start, end + 1));
  } catch {
    return null;
  }
};

const buildJudgePrompt = ({ answer, supportingChunks }) => {
  const context = supportingChunks
    .map((chunk, index) => `[${index + 1}] ${truncate(chunk.text || '', 800)}`)
    .join('\n\n');

  return `
You are evaluating whether an answer is grounded in provided transcript chunks.

Return ONLY valid JSON:
{
  "score": 0.0,
  "label": "grounded | partially_grounded | ungrounded",
  "reason": "short reason"
}

Scoring:
- 1.0 = all important claims are supported
- 0.7 = mostly supported with minor unsupported wording
- 0.4 = partially supported
- 0.0 = mostly unsupported or invented

Transcript chunks:
${context}

Answer:
${truncate(answer, 4000)}
`.trim();
};

const judgeGroundedness = async ({ answer, supportingChunks }) => {
  if (process.env.EVAL_USE_LLM_JUDGE !== 'true') {
    return null;
  }

  if (!supportingChunks?.length) {
    return null;
  }

  const prompt = buildJudgePrompt({ answer, supportingChunks });

  const raw = await generateAnswer(prompt, {
    source: 'eval_groundedness_judge',
    mode: 'eval',
  });

  const parsed = safeJsonParse(raw);

  if (!parsed || typeof parsed.score !== 'number') {
    return null;
  }

  return {
    score: Math.max(0, Math.min(1, parsed.score)),
    label: parsed.label || 'unknown',
    reason: parsed.reason || '',
  };
};

module.exports = {
  judgeGroundedness,
};