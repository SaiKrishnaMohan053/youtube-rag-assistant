const crypto = require('crypto');

const sessions = new Map();

const DEFAULT_TTL_MS = 60 * 60 * 1000; // 1 hour

const createGuestSession = ({ videoId, url, transcriptText, duration, summary }) => {
  const sessionId = crypto.randomUUID();

  sessions.set(sessionId, {
    sessionId,
    videoId,
    url,
    transcriptText,
    duration,
    summary,
    createdAt: Date.now(),
    expiresAt: Date.now() + DEFAULT_TTL_MS,
  });

  return sessions.get(sessionId);
};

const getGuestSession = (sessionId) => {
  const session = sessions.get(sessionId);

  if (!session) return null;

  if (Date.now() > session.expiresAt) {
    sessions.delete(sessionId);
    return null;
  }

  return session;
};

const cleanupExpiredGuestSessions = () => {
  const now = Date.now();

  for (const [sessionId, session] of sessions.entries()) {
    if (now > session.expiresAt) {
      sessions.delete(sessionId);
    }
  }
};

setInterval(cleanupExpiredGuestSessions, 10 * 60 * 1000).unref();

module.exports = {
  createGuestSession,
  getGuestSession,
};
