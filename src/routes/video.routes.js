const { Router } = require('express');
const { protect } = require('../middleware/auth.middleware');
const { processVideo, getMyVideos, getVideoById } = require('../controllers/video.controller');
const { createVideoChunks, getVideoChunks } = require('../controllers/chunk.controller');

const router = Router();

router.use(protect);
router.post('/process', processVideo);
router.get('/', getMyVideos);
router.get('/:id', getVideoById);
router.post('/:id/chunks', createVideoChunks);
router.get('/:id/chunks', getVideoChunks);

module.exports = router;
