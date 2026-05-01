const DEFAULT_CHUNK_SIZE = 1000;
const DEFAULT_CHUNK_OVERLAP = 150;

const TIMESTAMP_LINE_REGEX = /^\[(\d{2}):(\d{2})(?::(\d{2}))?\]\s*(.*)$/;

const parseTimestampToSeconds = (line) => {
  const match = line.match(TIMESTAMP_LINE_REGEX);
  if (!match) return null;

  const [, mmOrHh, ssOrMm, maybeSs, text] = match;
  if (maybeSs) {
    const hh = Number(mmOrHh);
    const mm = Number(ssOrMm);
    const ss = Number(maybeSs);
    return { seconds: hh * 3600 + mm * 60 + ss, text: text || '' };
  }

  const mm = Number(mmOrHh);
  const ss = Number(ssOrMm);
  return { seconds: mm * 60 + ss, text: text || '' };
};

const estimateTokens = (text) => Math.ceil((text || '').length / 4);

const chunkTranscriptText = (transcriptText, options = {}) => {
  const chunkSize = options.chunkSize || DEFAULT_CHUNK_SIZE;
  const overlap = options.overlap || DEFAULT_CHUNK_OVERLAP;

  if (!transcriptText || typeof transcriptText !== 'string' || !transcriptText.trim()) {
    return [];
  }

  const lines = transcriptText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parsed = parseTimestampToSeconds(line);
      return {
        raw: line,
        time: parsed ? parsed.seconds : null,
      };
    });

  const fullText = lines.map((l) => l.raw).join('\n');
  if (!fullText) return [];

  const chunks = [];
  let start = 0;
  let chunkIndex = 0;

  while (start < fullText.length) {
    const end = Math.min(start + chunkSize, fullText.length);
    const text = fullText.slice(start, end).trim();

    if (text) {
      const startLine = lines.find((l) => l.raw && fullText.indexOf(l.raw) >= start);
      const endLine = [...lines].reverse().find((l) => l.raw && fullText.indexOf(l.raw) < end);

      chunks.push({
        chunkIndex,
        text,
        startTime: startLine ? startLine.time : null,
        endTime: endLine ? endLine.time : null,
        tokenEstimate: estimateTokens(text),
      });
      chunkIndex += 1;
    }

    if (end >= fullText.length) break;
    start = Math.max(0, end - overlap);
  }

  return chunks;
};

module.exports = {
  chunkTranscriptText,
  DEFAULT_CHUNK_SIZE,
  DEFAULT_CHUNK_OVERLAP,
};
