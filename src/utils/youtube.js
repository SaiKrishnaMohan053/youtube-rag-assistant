const ApiError = require('./apiError');

const getYouTubeVideoId = (inputUrl) => {
  if (!inputUrl || typeof inputUrl !== 'string') {
    throw new ApiError(400, 'A valid YouTube URL is required');
  }

  let url;
  try {
    url = new URL(inputUrl.trim());
  } catch (_error) {
    throw new ApiError(400, 'Invalid URL format');
  }

  const host = url.hostname.replace(/^www\./, '').toLowerCase();

  if (host === 'youtube.com' || host === 'm.youtube.com') {
    if (url.pathname === '/watch') {
      const videoId = url.searchParams.get('v');
      if (videoId) return videoId;
    }

    const shortsMatch = url.pathname.match(/^\/shorts\/([a-zA-Z0-9_-]{6,})/);
    if (shortsMatch) return shortsMatch[1];

    const embedMatch = url.pathname.match(/^\/embed\/([a-zA-Z0-9_-]{6,})/);
    if (embedMatch) return embedMatch[1];
  }

  if (host === 'youtu.be') {
    const pathMatch = url.pathname.match(/^\/([a-zA-Z0-9_-]{6,})/);
    if (pathMatch) return pathMatch[1];
  }

  throw new ApiError(400, 'Unsupported YouTube URL format');
};

module.exports = {
  getYouTubeVideoId,
};
