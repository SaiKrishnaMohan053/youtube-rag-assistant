const { Router } = require('express');
const { protect } = require('../middleware/auth.middleware');
const { adminOnly } = require('../middleware/admin.middleware');
const {
  getAdminOverview,
  getAdminUsers,
  getAdminUserVideos,
  getAdminVideoChunks,
} = require('../controllers/admin.controller');
const { adminIndexVideo } = require('../controllers/embedding.controller');

const router = Router();

router.use(protect);
router.use(adminOnly);

router.get('/overview', getAdminOverview);
router.get('/users', getAdminUsers);
router.get('/users/:userId/videos', getAdminUserVideos);
router.get('/videos/:videoId/chunks', getAdminVideoChunks);
router.post('/videos/:videoId/index', adminIndexVideo);
module.exports = router;
