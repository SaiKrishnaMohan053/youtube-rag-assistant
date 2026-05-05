const logInfo = (event, meta = {}) => {
  console.log(
    JSON.stringify({
      level: 'info',
      event,
      timestamp: new Date().toISOString(),
      ...meta,
    })
  );
};

const logError = (event, meta = {}) => {
  console.error(
    JSON.stringify({
      level: 'error',
      event,
      timestamp: new Date().toISOString(),
      ...meta,
    })
  );
};

module.exports = {
  logInfo,
  logError,
};
