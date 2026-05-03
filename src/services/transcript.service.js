const { YoutubeTranscript } = require('youtube-transcript');
const ApiError = require('../utils/apiError');

const toTimestamp = (seconds) => {
  const totalSeconds = Math.max(0, Math.floor(Number(seconds) || 0));
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  if (hrs > 0) {
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

const buildTranscriptText = (segments) =>
  segments
    .map(
      (segment) =>
        `[${toTimestamp(segment.offset / 1000)}] ${String(segment.text || '')
          .replace(/\s+/g, ' ')
          .trim()}`
    )
    .filter((line) => !line.endsWith(']'))
    .join('\n');

const fetchTranscriptByVideoId = async (videoId) => {
  try {
    const transcript = await YoutubeTranscript.fetchTranscript(videoId);
    if (!Array.isArray(transcript) || transcript.length === 0) {
      throw new ApiError(422, 'Transcript is unavailable for this video');
    }

    const transcriptText = buildTranscriptText(transcript);
    if (!transcriptText) {
      throw new ApiError(422, 'Transcript text is empty for this video');
    }

    const duration = transcript.reduce((max, segment) => {
      const startSeconds = Number(segment.offset || 0) / 1000;
      const segDuration = Number(segment.duration || 0);
      return Math.max(max, startSeconds + segDuration);
    }, 0);

    return {
      transcript,
      transcriptText,
      duration,
    };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(422, `Failed to fetch transcript: ${error.message}`);
  }
};

module.exports = {
  fetchTranscriptByVideoId,
};
