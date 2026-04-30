const { Router } = require('express');
const { protect } = require('../middleware/auth.middleware');
const { processVideo, getMyVideos, getVideoById } = require('../controllers/video.controller');

const router = Router();

router.use(protect);
router.post('/process', processVideo);
router.get('/', getMyVideos);
router.get('/:id', getVideoById);

module.exports = router;
