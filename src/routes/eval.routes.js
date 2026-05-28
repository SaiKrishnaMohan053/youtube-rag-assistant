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

router.use((_req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.set('Surrogate-Control', 'no-store');
  next();
});

router.get('/stats', getEvalStatsSummary);
router.get('/reports', getEvalReports);
router.get('/reports/:fileName', getEvalReport);
router.post('/run', runEvals);

module.exports = router;