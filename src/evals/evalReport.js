const buildEvalConsoleReport = (report) => {
  const lines = [];

  lines.push('\n==============================');
  lines.push('YOUTUBE RAG EVAL REPORT');
  lines.push('==============================');

  lines.push(`Total: ${report.total}`);
  lines.push(`Passed: ${report.passed}`);
  lines.push(`Failed: ${report.failed}`);
  lines.push(`Pass Rate: ${report.passRate}%`);
  lines.push('');

  for (const result of report.results) {
    const icon = result.passed ? 'PASS' : 'FAIL';

    lines.push(`${icon} | ${result.id} | ${result.category}`);

    if (result.grade) {
      lines.push(
        `   Grade=${result.grade} ` +
          `Weighted=${result.weightedScore} ` +
          `Latency=${result.latencyMs}ms`
      );
    }

    if (result.intent) {
      lines.push(`   Intent=${result.intent} Mode=${result.mode}`);
    }

    if (result.supportingChunkCount !== undefined) {
      lines.push(`   Chunks=${result.supportingChunkCount}`);
    }

    if (result.hallucinationRisk) {
      lines.push(`   HallucinationRisk=${result.hallucinationRisk}`);
    }

    if (result.error) {
      lines.push(`   Error=${result.error}`);
    }

    lines.push('');
  }

  lines.push('==============================');

  return lines.join('\n');
};

module.exports = {
  buildEvalConsoleReport,
};
