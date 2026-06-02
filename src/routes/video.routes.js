const { Router } = require('express');
const { protect } = require('../middleware/auth.middleware');
const {
  processVideo,
  getMyVideos,
  getVideoById,
  getVideoProcessingStatus,
  deleteVideo,
} = require('../controllers/video.controller');
const { createVideoChunks, getVideoChunks } = require('../controllers/chunk.controller');
const {
  embeddingHealth,
  indexVideo,
  searchVideo,
  getOwnedVideoIndexStatus,
} = require('../controllers/embedding.controller');
const { askVideo, getVideoChats } = require('../controllers/qa.controller');

const router = Router();

router.use(protect);

router.get('/embedding-health', embeddingHealth);
router.post('/process', processVideo);
router.get('/', getMyVideos);

router.post('/:id/chunks', createVideoChunks);
router.get('/:id/chunks', getVideoChunks);
router.post('/:id/index', indexVideo);
router.get('/:id/index/status', getOwnedVideoIndexStatus);
router.post('/:id/search', searchVideo);
router.post('/:id/ask', askVideo);
router.get('/:id/chats', getVideoChats);

router.delete('/:id', deleteVideo);
router.get('/:id/status', getVideoProcessingStatus);
router.get('/:id', getVideoById);

module.exports = router;
