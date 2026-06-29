const EvalReport = require('../models/evalReport.model');

const buildFileName = (videoId) => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `eval-${videoId}-${timestamp}.json`;
};

const saveEvalReport = async ({ report, videoId }) => {
  const generatedAt = new Date();
  const fileName = buildFileName(videoId);

  const payload = {
    videoId,
    generatedAt: generatedAt.toISOString(),
    ...report,
  };

  const saved = await EvalReport.create({
    fileName,
    videoId,
    generatedAt,
    total: report.total || 0,
    evaluated: report.evaluated || 0,
    passed: report.passed || 0,
    failed: report.failed || 0,
    skipped: report.skipped || 0,
    passRate: report.passRate || 0,
    results: report.results || [],
    report: payload,
  });

  return {
    fileName: saved.fileName,
    reportId: saved._id.toString(),
  };
};

const listEvalReports = async () => {
  const reports = await EvalReport.find({})
    .sort({ generatedAt: -1 })
    .select(
      'fileName videoId generatedAt total evaluated passed failed skipped passRate createdAt updatedAt'
    )
    .lean();

  return reports.map((item) => ({
    fileName: item.fileName,
    createdAt: item.createdAt,
    modifiedAt: item.updatedAt,
    sizeBytes: JSON.stringify(item).length,
    summary: {
      videoId: item.videoId,
      generatedAt: item.generatedAt,
      total: item.total,
      evaluated: item.evaluated,
      passed: item.passed,
      failed: item.failed,
      skipped: item.skipped,
      passRate: item.passRate,
    },
  }));
};

const getEvalReportByFileName = async (fileName) => {
  if (!fileName || fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
    return null;
  }

  const doc = await EvalReport.findOne({ fileName }).lean();

  if (!doc) return null;

  return doc.report;
};

const getEvalStats = async () => {
  const reports = await EvalReport.find({}).sort({ generatedAt: -1 }).lean();

  if (!reports.length) {
    return {
      reportCount: 0,
      avgPassRate: 0,
      avgLatencyMs: 0,
      gradeDistribution: {},
      hallucinationRiskTotals: {},
      slowestCategory: null,
      bestCategory: null,
      categories: [],
      recentReports: [],
    };
  }

  const normalizedReports = reports.map((doc) => doc.report || doc);
  const allResults = normalizedReports.flatMap((report) => report.results || []);

  const avgPassRate =
    normalizedReports.reduce((sum, report) => sum + Number(report.passRate || 0), 0) /
    normalizedReports.length;

  const latencyItems = allResults.filter((item) => typeof item.latencyMs === 'number');

  const avgLatencyMs = latencyItems.length
    ? Math.round(latencyItems.reduce((sum, item) => sum + item.latencyMs, 0) / latencyItems.length)
    : 0;

  const gradeDistribution = {};
  const hallucinationRiskTotals = {};
  const categoryStats = {};

  for (const item of allResults) {
    if (item.grade) {
      gradeDistribution[item.grade] = (gradeDistribution[item.grade] || 0) + 1;
    }

    if (item.hallucinationRisk) {
      hallucinationRiskTotals[item.hallucinationRisk] =
        (hallucinationRiskTotals[item.hallucinationRisk] || 0) + 1;
    }

    if (!categoryStats[item.category]) {
      categoryStats[item.category] = {
        category: item.category,
        count: 0,
        passed: 0,
        totalLatencyMs: 0,
        totalWeightedScore: 0,
      };
    }

    categoryStats[item.category].count += 1;
    if (item.passed) categoryStats[item.category].passed += 1;
    categoryStats[item.category].totalLatencyMs += item.latencyMs || 0;
    categoryStats[item.category].totalWeightedScore += item.weightedScore || 0;
  }

  const categories = Object.values(categoryStats).map((item) => ({
    category: item.category,
    count: item.count,
    passRate: Number(((item.passed / item.count) * 100).toFixed(2)),
    avgLatencyMs: Math.round(item.totalLatencyMs / item.count),
    avgWeightedScore: Number((item.totalWeightedScore / item.count).toFixed(2)),
  }));

  const slowestCategory =
    [...categories].sort((a, b) => b.avgLatencyMs - a.avgLatencyMs)[0] || null;
  const bestCategory =
    [...categories].sort((a, b) => b.avgWeightedScore - a.avgWeightedScore)[0] || null;

  return {
    reportCount: normalizedReports.length,
    avgPassRate: Number(avgPassRate.toFixed(2)),
    avgLatencyMs,
    gradeDistribution,
    hallucinationRiskTotals,
    slowestCategory,
    bestCategory,
    categories,
    recentReports: normalizedReports.slice(0, 10).map((report) => ({
      videoId: report.videoId,
      generatedAt: report.generatedAt,
      passRate: report.passRate,
      total: report.total,
      passed: report.passed,
      failed: report.failed,
    })),
  };
};

module.exports = {
  saveEvalReport,
  listEvalReports,
  getEvalReportByFileName,
  getEvalStats,
};
