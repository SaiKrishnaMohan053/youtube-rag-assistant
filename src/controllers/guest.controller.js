const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/apiResponse');
const ApiError = require('../utils/apiError');
const { getYouTubeVideoId } = require('../utils/youtube');
const { fetchTranscriptByVideoId } = require('../services/transcript.service');
const { generateAnswer } = require('../services/llm.service');
const { createGuestSession, getGuestSession } = require('../services/guestSession.service');
const { logMetric, logError, getDurationMs } = require('../utils/logger');

const truncate = (text = '', max = 12000) => {
  const clean = String(text || '')
    .replace(/\s+/g, ' ')
    .trim();
  return clean.length > max ? `${clean.slice(0, max)}...` : clean;
};

const buildGuestSummaryPrompt = ({ transcriptText }) =>
  `
You are summarizing a YouTube video for a guest user.

Rules:
- Use only the transcript.
- Do not invent details.
- Ignore subscribe/follow/promotional parts.
- Keep the summary useful but concise.

Transcript:
${truncate(transcriptText, 12000)}

Format:
## What this video is about

...

## Main Points

- ...
- ...
- ...

## Key Takeaways

- ...
- ...
- ...
`.trim();

const buildGuestAskPrompt = ({ transcriptText, query }) =>
  `
Answer the user's question using only this YouTube transcript.

Rules:
- If the transcript does not support the answer, say: "I don't have enough transcript context to answer that."
- Be concise.
- Do not invent details.

Transcript:
${truncate(transcriptText, 12000)}

Question:
${query}
`.trim();

const createGuestSummary = asyncHandler(async (req, res) => {
  const startedAt = Date.now();
  const { url } = req.body;

  try {
    if (!url || typeof url !== 'string' || !url.trim()) {
      throw new ApiError(400, 'Video URL is required');
    }

    const normalizedUrl = url.trim();
    const videoId = getYouTubeVideoId(normalizedUrl);

    const { transcriptText, duration } = await fetchTranscriptByVideoId(videoId);

    if (!transcriptText || !transcriptText.trim()) {
      throw new ApiError(422, 'Transcript not available for this video');
    }

    const prompt = buildGuestSummaryPrompt({ transcriptText });
    const summary = await generateAnswer(prompt, {
      source: 'guest_summary',
      videoId,
    });

    const session = createGuestSession({
      videoId,
      url: normalizedUrl,
      transcriptText,
      duration,
      summary,
    });

    logMetric('guest.summary.completed', {
      videoId,
      durationMs: getDurationMs(startedAt),
      transcriptChars: transcriptText.length,
      answerChars: summary.length,
      mode: 'guest_summary',
      status: 'success',
    });

    return res.status(201).json(
      new ApiResponse(201, 'Guest summary generated successfully', {
        sessionId: session.sessionId,
        videoId,
        duration,
        summary,
        expiresAt: session.expiresAt,
        limits: {
          mode: 'guest',
          saved: false,
          advancedExports: false,
          history: false,
        },
      })
    );
  } catch (error) {
    logError('guest.summary.failed', {
      durationMs: getDurationMs(startedAt),
      status: 'failed',
      error: error.message,
    });

    throw error;
  }
});

const askGuestVideo = asyncHandler(async (req, res) => {
  const startedAt = Date.now();
  const { sessionId, query } = req.body;

  try {
    if (!sessionId) {
      throw new ApiError(400, 'Guest session id is required');
    }

    if (!query || typeof query !== 'string' || !query.trim()) {
      throw new ApiError(400, 'Query is required');
    }

    const session = getGuestSession(sessionId);

    if (!session) {
      throw new ApiError(404, 'Guest session expired. Please process the video again.');
    }

    const prompt = buildGuestAskPrompt({
      transcriptText: session.transcriptText,
      query: query.trim(),
    });

    const answer = await generateAnswer(prompt, {
      source: 'guest_qa',
      sessionId,
    });

    return res.status(200).json(
      new ApiResponse(200, 'Guest answer generated successfully', {
        answer,
        sessionId,
        saved: false,
      })
    );
  } catch (error) {
    logError('guest.qa.failed', {
      sessionId: sessionId || null,
      durationMs: getDurationMs(startedAt),
      status: 'failed',
      error: error.message,
    });

    throw error;
  }
});

module.exports = {
  createGuestSummary,
  askGuestVideo,
};
