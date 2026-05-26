const express = require('express');
const { getHealthStatus, getLiveStatus } = require('../controllers/health.controller');

const router = express.Router();

router.get('/status', getHealthStatus);
router.get('/live', getLiveStatus);

module.exports = router;
