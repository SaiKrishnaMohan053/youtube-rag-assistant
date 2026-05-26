const { Router } = require('express');
const { protect } = require('../middleware/auth.middleware');
const { getMetricsSummary } = require('../controllers/metrics.controller');
const { adminOnly } = require('../middleware/admin.middleware');

const router = Router();

router.use(protect);
router.use(adminOnly);

router.get('/summary', getMetricsSummary);

module.exports = router;
