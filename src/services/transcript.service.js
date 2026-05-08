const axios = require('axios');
const ApiError = require('../utils/apiError');

const SUPADATA_TRANSCRIPT_URL = 'https://api.supadata.ai/v1/youtube/transcript';

const toTimestamp = (seconds) => {
  const totalSeconds = Math.max(0, Math.floor(Number(seconds) || 0));
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  if (hrs > 0) {
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(
      secs
    ).padStart(2, '0')}`;
  }

  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

const buildTranscriptText = (segments) =>
  segments
    .map((segment) => {
      const offsetMs = Number(segment.offset || 0);
      const text = String(segment.text || '')
        .replace(/\s+/g, ' ')
        .trim();

      if (!text) return '';

      return `[${toTimestamp(offsetMs / 1000)}] ${text}`;
    })
    .filter(Boolean)
    .join('\n');

const fetchTranscriptFromSupadata = async (videoId) => {
  const apiKey = process.env.SUPADATA_API_KEY;

  if (!apiKey) {
    throw new ApiError(500, 'SUPADATA_API_KEY is missing');
  }

  const response = await axios.get(SUPADATA_TRANSCRIPT_URL, {
    params: { videoId },
    headers: {
      'x-api-key': apiKey,
    },
    timeout: 30000,
  });

  const content = response.data?.content;

  if (!Array.isArray(content) || content.length === 0) {
    throw new ApiError(422, 'Transcript is unavailable for this video');
  }

  return content;
};

const fetchTranscriptByVideoId = async (videoId) => {
  try {
    const transcript = await fetchTranscriptFromSupadata(videoId);

    const transcriptText = buildTranscriptText(transcript);

    if (!transcriptText) {
      throw new ApiError(422, 'Transcript text is empty for this video');
    }

    const duration = transcript.reduce((max, segment) => {
      const startSeconds = Number(segment.offset || 0) / 1000;
      const segDuration = Number(segment.duration || 0) / 1000;

      return Math.max(max, startSeconds + segDuration);
    }, 0);

    return {
      transcript,
      transcriptText,
      duration,
    };
  } catch (error) {
    if (error instanceof ApiError) throw error;

    const providerMessage =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.response?.data?.detail ||
      error.message;

    throw new ApiError(422, `Failed to fetch transcript: ${providerMessage}`);
  }
};

module.exports = {
  fetchTranscriptByVideoId,
};
