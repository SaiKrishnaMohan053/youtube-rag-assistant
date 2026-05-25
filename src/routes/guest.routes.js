const { Router } = require('express');
const { createGuestSummary, askGuestVideo } = require('../controllers/guest.controller');

const router = Router();

router.post('/summary', createGuestSummary);
router.post('/ask', askGuestVideo);

module.exports = router;
