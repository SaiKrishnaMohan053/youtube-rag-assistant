const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/user.model');
const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/apiResponse');
const ApiError = require('../utils/apiError');
const { signToken } = require('../utils/jwt');
const env = require('../config/env');
const { sendVerificationEmail } = require('../services/email.service');

const googleClient = new OAuth2Client(env.googleClientId);

const buildUserResponse = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  authProvider: user.authProvider,
  isEmailVerified: user.isEmailVerified,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

const sendAuthResponse = (res, statusCode, message, user) => {
  const token = signToken({ id: user._id.toString(), role: user.role });

  return res.status(statusCode).json(
    new ApiResponse(statusCode, message, {
      token,
      user: buildUserResponse(user),
    })
  );
};

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

  let user = null;

  try {
    user = new User({
      name: name.trim(),
      email: normalizedEmail,
      password,
      authProvider: 'local',
      isEmailVerified: false,
    });

    const rawToken = user.createEmailVerificationToken();

    await user.save();

    const verificationUrl = `${env.clientUrl}/verify-email?token=${rawToken}`;

    await sendVerificationEmail({
      to: user.email,
      name: user.name,
      verificationUrl,
    });

    return res.status(201).json(
      new ApiResponse(201, 'Registration successful. Please verify your email before logging in.', {
        user: buildUserResponse(user),
      })
    );
  } catch (error) {
    console.error('Registration failed:', error.message);

    if (user?._id) {
      await User.findByIdAndDelete(user._id);
    }

    throw new ApiError(500, 'Failed to create account. Verification email could not be sent.');
  }
});

const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.query;

  if (!token) {
    throw new ApiError(400, 'Verification token is required');
  }

  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const user = await User.findOne({
    emailVerificationToken: hashedToken,
  }).select('+emailVerificationToken +emailVerificationExpires');

  if (!user) {
    throw new ApiError(400, 'Invalid verification link');
  }

  if (user.isEmailVerified) {
    return res.status(200).json(new ApiResponse(200, 'Email already verified. You can login.'));
  }

  if (!user.emailVerificationExpires || user.emailVerificationExpires < Date.now()) {
    throw new ApiError(400, 'Verification link expired');
  }

  user.isEmailVerified = true;

  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;

  await user.save();

  return res.status(200).json(new ApiResponse(200, 'Email verified successfully'));
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError(400, 'Email and password are required');
  }

  const normalizedEmail = email.trim().toLowerCase();

  const user = await User.findOne({ email: normalizedEmail }).select('+password');

  if (!user || user.authProvider !== 'local' || !(await user.comparePassword(password))) {
    throw new ApiError(401, 'Invalid email or password');
  }

  if (!user.isEmailVerified) {
    throw new ApiError(403, 'Please verify your email before logging in');
  }

  return sendAuthResponse(res, 200, 'Login successful', user);
});

const googleAuth = asyncHandler(async (req, res) => {
  const { credential } = req.body;

  if (!credential) {
    throw new ApiError(400, 'Google credential is required');
  }

  if (!env.googleClientId) {
    throw new ApiError(500, 'Google OAuth is not configured');
  }

  const ticket = await googleClient.verifyIdToken({
    idToken: credential,
    audience: env.googleClientId,
  });

  const payload = ticket.getPayload();

  if (!payload?.email || !payload?.sub) {
    throw new ApiError(401, 'Invalid Google account');
  }

  const normalizedEmail = payload.email.toLowerCase();

  let user = await User.findOne({ email: normalizedEmail });

  if (!user) {
    user = await User.create({
      name: payload.name || normalizedEmail.split('@')[0],
      email: normalizedEmail,
      authProvider: 'google',
      googleId: payload.sub,
      isEmailVerified: true,
    });
  } else {
    user.googleId = user.googleId || payload.sub;
    user.isEmailVerified = true;
    if (user.authProvider !== 'google' && !user.password) {
      user.authProvider = 'google';
    }
    await user.save();
  }

  return sendAuthResponse(res, 200, 'Google login successful', user);
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
  verifyEmail,
  login,
  googleAuth,
  me,
};
