const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/apiResponse');

const getHealth = asyncHandler(async (_req, res) => {
  return res.status(200).json(
    new ApiResponse(200, 'Service is healthy', {
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    })
  );
});

module.exports = {
  getHealth,
};
