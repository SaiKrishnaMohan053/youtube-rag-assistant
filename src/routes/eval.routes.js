const { Router } = require('express');
const { protect } = require('../middleware/auth.middleware');
const {
  runEvals,
  getEvalReports,
  getEvalReport,
  getEvalStatsSummary,
} = require('../controllers/eval.controller');
const { adminOnly } = require('../middleware/admin.middleware');

const router = Router();

router.use(protect);
router.use(adminOnly);

router.get('/stats', getEvalStatsSummary);
router.get('/reports', getEvalReports);
router.get('/reports/:fileName', getEvalReport);
router.post('/run', runEvals);

module.exports = router;
