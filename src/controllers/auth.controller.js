const User = require('../models/user.model');
const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/apiResponse');
const ApiError = require('../utils/apiError');
const { signToken } = require('../utils/jwt');

const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    throw new ApiError(400, 'Name, email, and password are required');
  }

  const normalizedEmail = email.trim().toLowerCase();
  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    throw new ApiError(409, 'Email is already registered');
  }

  const user = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    password,
  });

  const token = signToken({ id: user._id.toString(), role: user.role });

  return res.status(201).json(
    new ApiResponse(201, 'User registered successfully', {
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    })
  );
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError(400, 'Email and password are required');
  }

  const normalizedEmail = email.trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail }).select('+password');

  if (!user || !(await user.comparePassword(password))) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const token = signToken({ id: user._id.toString(), role: user.role });

  return res.status(200).json(
    new ApiResponse(200, 'Login successful', {
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    })
  );
});

const me = asyncHandler(async (req, res) => {
  return res.status(200).json(
    new ApiResponse(200, 'Authenticated user profile fetched', {
      user: req.user,
    })
  );
});

module.exports = {
  register,
  login,
  me,
};
