const { Router } = require('express');
const { protect } = require('../middleware/auth.middleware');
const {
  processVideo,
  getMyVideos,
  getVideoById,
  deleteVideo,
} = require('../controllers/video.controller');
const { createVideoChunks, getVideoChunks } = require('../controllers/chunk.controller');
const { embeddingHealth, indexVideo, searchVideo } = require('../controllers/embedding.controller');
const { askVideo, getVideoChats } = require('../controllers/qa.controller');

const router = Router();

router.use(protect);

router.get('/embedding-health', embeddingHealth);
router.post('/process', processVideo);
router.get('/', getMyVideos);

router.post('/:id/chunks', createVideoChunks);
router.get('/:id/chunks', getVideoChunks);
router.post('/:id/index', indexVideo);
router.post('/:id/search', searchVideo);
router.post('/:id/ask', askVideo);
router.get('/:id/chats', getVideoChats);

router.delete('/:id', deleteVideo);
router.get('/:id', getVideoById);

module.exports = router;
