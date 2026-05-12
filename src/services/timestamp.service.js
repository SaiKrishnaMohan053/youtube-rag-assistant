const formatTimestamp = (seconds = 0) => {
  const totalSeconds = Math.max(0, Math.floor(seconds));

  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  if (hrs > 0) {
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

const buildTimestampContext = (chunks = []) => {
  return chunks
    .filter((chunk) => chunk?.text)
    .map((chunk, index) => {
      const timestamp = formatTimestamp(chunk.startTime || 0);

      return `[${index + 1}] ${timestamp}\n${chunk.text}`;
    })
    .join('\n\n');
};

const buildTimestampPrompt = ({ query, chunks }) => {
  const context = buildTimestampContext(chunks);

  return `
You are helping users navigate a YouTube video.

Use the transcript timestamp context below.

Rules:
- Return relevant timestamps.
- Mention what happens at each timestamp.
- Keep answers concise and structured.
- If multiple timestamps are relevant, include all major ones.
- Use bullet points.

Transcript timestamp context:
${context}

Question:
${query}

Format:

## Relevant timestamps

- MM:SS → explanation
- MM:SS → explanation
`.trim();
};

module.exports = {
  formatTimestamp,
  buildTimestampContext,
  buildTimestampPrompt,
};
