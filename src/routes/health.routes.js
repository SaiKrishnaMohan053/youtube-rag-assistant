const express = require('express');
const {
  getHealthStatus,
  getLiveStatus,
  getDeepHealthStatus,
} = require('../controllers/health.controller');

const router = express.Router();

router.get('/status', getHealthStatus);
router.get('/live', getLiveStatus);
router.get('/deep', getDeepHealthStatus);

module.exports = router;
