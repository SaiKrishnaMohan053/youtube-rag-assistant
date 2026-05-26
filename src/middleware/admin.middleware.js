const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/apiError');

const adminOnly = asyncHandler(async (req, _res, next) => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required');
  }

  if (!req.user.isAdmin) {
    throw new ApiError(403, 'Admin access required');
  }

  next();
});

module.exports = {
  adminOnly,
};
