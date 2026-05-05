const { Router } = require('express');
const { register, verifyEmail, login, googleAuth, me } = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');

const router = Router();

router.post('/register', register);
router.get('/verify-email', verifyEmail);
router.post('/login', login);
router.post('/google', googleAuth);
router.get('/me', protect, me);

module.exports = router;