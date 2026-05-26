const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/apiResponse');
const ApiError = require('../utils/apiError');
const { runEvalSuite } = require('../evals/evalRunner');
const { logMetric, logError } = require('../utils/logger');
const { buildEvalConsoleReport } = require('../evals/evalReport');
const {
  saveEvalReport,
  listEvalReports,
  getEvalReportByFileName,
  getEvalStats,
} = require('../evals/evalReporterStore');

const runEvals = asyncHandler(async (req, res) => {
  const { videoId, guestUrl } = req.body;
  const authToken = req.headers.authorization?.replace('Bearer ', '');

  if (!videoId) {
    throw new ApiError(400, 'videoId is required');
  }

  try {
    const report = await runEvalSuite({
      videoId,
      token: authToken,
      guestUrl,
    });

    console.log(buildEvalConsoleReport(report));
    const savedReport = saveEvalReport({
      report,
      videoId,
    });

    logMetric('eval.run.completed', {
      videoId,
      total: report.total,
      passed: report.passed,
      failed: report.failed,
      passRate: report.passRate,
      reportFile: savedReport.fileName,
      status: 'success',
    });

    return res.status(200).json(
      new ApiResponse(200, 'Eval suite completed', {
        ...report,
        reportFile: savedReport.fileName,
      })
    );
  } catch (error) {
    logError('eval.run.failed', {
      videoId,
      error: error.message,
    });

    throw error;
  }
});

const getEvalReport = asyncHandler(async (req, res) => {
  const report = getEvalReportByFileName(req.params.fileName);

  if (!report) {
    throw new ApiError(404, 'Eval report not found');
  }

  return res.status(200).json(
    new ApiResponse(200, 'Eval report fetched successfully', {
      report,
    })
  );
});

const getEvalStatsSummary = asyncHandler(async (_req, res) => {
  const stats = getEvalStats();

  return res.status(200).json(
    new ApiResponse(200, 'Eval stats fetched successfully', {
      stats,
    })
  );
});

const getEvalReports = asyncHandler(async (_req, res) => {
  const reports = listEvalReports();

  return res.status(200).json(
    new ApiResponse(200, 'Eval reports fetched successfully', {
      reports,
    })
  );
});

module.exports = {
  runEvals,
  getEvalReports,
  getEvalReport,
  getEvalStatsSummary,
};
