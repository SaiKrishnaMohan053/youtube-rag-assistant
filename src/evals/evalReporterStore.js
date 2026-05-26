const fs = require('fs');
const path = require('path');

const REPORT_DIR = path.join(__dirname, 'reports');

const ensureReportDir = () => {
  if (!fs.existsSync(REPORT_DIR)) {
    fs.mkdirSync(REPORT_DIR, { recursive: true });
  }
};

const sanitizeFileName = (fileName = '') => {
  if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
    return null;
  }

  if (!fileName.endsWith('.json')) return null;

  return fileName;
};

const saveEvalReport = ({ report, videoId }) => {
  ensureReportDir();

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = `eval-${videoId}-${timestamp}.json`;
  const filePath = path.join(REPORT_DIR, fileName);

  fs.writeFileSync(
    filePath,
    JSON.stringify(
      {
        videoId,
        generatedAt: new Date().toISOString(),
        ...report,
      },
      null,
      2
    )
  );

  return { fileName, filePath };
};

const listEvalReports = () => {
  ensureReportDir();

  return fs
    .readdirSync(REPORT_DIR)
    .filter((fileName) => fileName.endsWith('.json'))
    .map((fileName) => {
      const filePath = path.join(REPORT_DIR, fileName);
      const stats = fs.statSync(filePath);

      let summary = null;

      try {
        const parsed = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

        summary = {
          videoId: parsed.videoId,
          generatedAt: parsed.generatedAt,
          total: parsed.total,
          passed: parsed.passed,
          failed: parsed.failed,
          passRate: parsed.passRate,
        };
      } catch {
        summary = { parseError: true };
      }

      return {
        fileName,
        createdAt: stats.birthtime,
        modifiedAt: stats.mtime,
        sizeBytes: stats.size,
        summary,
      };
    })
    .sort((a, b) => new Date(b.modifiedAt) - new Date(a.modifiedAt));
};

const getEvalReportByFileName = (fileName) => {
  ensureReportDir();

  const safeName = sanitizeFileName(fileName);
  if (!safeName) return null;

  const filePath = path.join(REPORT_DIR, safeName);

  if (!fs.existsSync(filePath)) return null;

  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
};

const getEvalStats = () => {
  const reports = listEvalReports()
    .map((report) => getEvalReportByFileName(report.fileName))
    .filter(Boolean);

  if (!reports.length) {
    return {
      reportCount: 0,
      avgPassRate: 0,
      avgLatencyMs: 0,
      gradeDistribution: {},
      hallucinationRiskTotals: {},
      slowestCategory: null,
      bestCategory: null,
    };
  }

  const allResults = reports.flatMap((report) => report.results || []);

  const avgPassRate =
    reports.reduce((sum, report) => sum + Number(report.passRate || 0), 0) / reports.length;

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

  const slowestCategory = [...categories].sort((a, b) => b.avgLatencyMs - a.avgLatencyMs)[0];
  const bestCategory = [...categories].sort((a, b) => b.avgWeightedScore - a.avgWeightedScore)[0];

  return {
    reportCount: reports.length,
    avgPassRate: Number(avgPassRate.toFixed(2)),
    avgLatencyMs,
    gradeDistribution,
    hallucinationRiskTotals,
    slowestCategory,
    bestCategory,
    categories,
    recentReports: reports.slice(0, 10).map((report) => ({
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