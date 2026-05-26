import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  TextField
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import {
  getEvalReportByFileNameApi,
  getEvalReportsApi,
  getEvalStatsApi,
  runEvalApi
} from '../../api/adminApi';

const InfoCard = ({ title, value, subtitle }) => (
  <Card sx={{ borderRadius: 4, height: '100%' }}>
    <CardContent>
      <Typography color="text.secondary" fontSize={14}>
        {title}
      </Typography>
      <Typography variant="h5" fontWeight={800} sx={{ mt: 1 }}>
        {value}
      </Typography>
      {subtitle && (
        <Typography color="text.secondary" sx={{ mt: 1 }}>
          {subtitle}
        </Typography>
      )}
    </CardContent>
  </Card>
);

const gradeColor = (grade) => {
  if (grade === 'A') return 'success';
  if (grade === 'B') return 'primary';
  if (grade === 'C') return 'warning';
  return 'error';
};

const riskColor = (risk) => {
  if (risk === 'low') return 'success';
  if (risk === 'medium') return 'warning';
  return 'error';
};

const AdminEvalPage = () => {
  const [stats, setStats] = useState(null);
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [videoId, setVideoId] = useState('');
  const [guestUrl, setGuestUrl] = useState('');
  const [runLoading, setRunLoading] = useState(false);
  const [success, setSuccess] = useState('');

  const fetchEvalData = async () => {
    try {
      setLoading(true);
      setError('');

      const [statsData, reportsData] = await Promise.all([
        getEvalStatsApi(),
        getEvalReportsApi(),
      ]);

      setStats(statsData);
      setReports(reportsData || []);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          'Failed to fetch eval dashboard data'
      );
    } finally {
      setLoading(false);
    }
  };

  const openReport = async (fileName) => {
    try {
      setError('');
      const report = await getEvalReportByFileNameApi(fileName);
      setSelectedReport(report);
      setDialogOpen(true);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          'Failed to fetch eval report'
      );
    }
  };

  const handleRunEval = async () => {
    try {
      setRunLoading(true);
      setError('');
      setSuccess('');

      if (!videoId.trim()) {
        setError('Video ID is required');
        return;
      }

      const report = await runEvalApi({
        videoId: videoId.trim(),
        guestUrl: guestUrl.trim(),
      });

      setSuccess(
        `Eval completed. Pass rate: ${report.passRate}% (${report.passed}/${report.total})`
      );

      await fetchEvalData();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          'Failed to run eval suite'
      );
    } finally {
      setRunLoading(false);
    }
  };

  useEffect(() => {
    fetchEvalData();
  }, []);

  const gradeDistribution = stats?.gradeDistribution || {};
  const hallucinationRiskTotals = stats?.hallucinationRiskTotals || {};
  const categories = stats?.categories || [];

  return (
    <Stack spacing={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Box>
          <Typography variant="h4" fontWeight={800}>
            RAG Evaluations
          </Typography>
          <Typography color="text.secondary">
            Track answer quality, latency, hallucination risk, and eval history.
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={<RefreshIcon />}
          onClick={fetchEvalData}
          disabled={loading}
        >
          Refresh
        </Button>
      </Box>

      {error && <Alert severity="error">{error}</Alert>}

      {success && <Alert severity="success">{success}</Alert>}

      <Card sx={{ borderRadius: 4 }}>
        <CardContent>
          <Stack spacing={2}>
            <Box>
              <Typography variant="h6" fontWeight={800}>
                Run Evaluation
              </Typography>
              <Typography color="text.secondary">
                Run the eval suite against an indexed auth video and optional guest URL.
              </Typography>
            </Box>

            <Divider />

            <Grid container spacing={2}>
              <Grid item xs={12} md={5}>
                <TextField
                  fullWidth
                  label="Mongo Video ID"
                  value={videoId}
                  onChange={(e) => setVideoId(e.target.value)}
                  placeholder="Example: 686f2d9e7abf4c3a91e12345"
                />
              </Grid>

              <Grid item xs={12} md={5}>
                <TextField
                  fullWidth
                  label="Guest YouTube URL"
                  value={guestUrl}
                  onChange={(e) => setGuestUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                />
              </Grid>

              <Grid item xs={12} md={2}>
                <Button
                  fullWidth
                  size="large"
                  variant="contained"
                  onClick={handleRunEval}
                  disabled={runLoading}
                  sx={{ height: '100%' }}
                >
                  {runLoading ? 'Running...' : 'Run Eval'}
                </Button>
              </Grid>
            </Grid>
          </Stack>
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        <Grid item xs={12} md={2.4}>
          <InfoCard
            title="Reports"
            value={stats?.reportCount || 0}
            subtitle="Stored eval runs"
          />
        </Grid>

        <Grid item xs={12} md={2.4}>
          <InfoCard
            title="Avg Pass Rate"
            value={`${stats?.avgPassRate || 0}%`}
            subtitle="Across reports"
          />
        </Grid>

        <Grid item xs={12} md={2.4}>
          <InfoCard
            title="Avg Latency"
            value={`${stats?.avgLatencyMs || 0} ms`}
            subtitle="Across eval cases"
          />
        </Grid>

        <Grid item xs={12} md={2.4}>
          <InfoCard
            title="Best Category"
            value={stats?.bestCategory?.category || 'N/A'}
            subtitle={
              stats?.bestCategory
                ? `Score ${stats.bestCategory.avgWeightedScore}`
                : 'No data'
            }
          />
        </Grid>

        <Grid item xs={12} md={2.4}>
          <InfoCard
            title="Slowest Category"
            value={stats?.slowestCategory?.category || 'N/A'}
            subtitle={
              stats?.slowestCategory
                ? `${stats.slowestCategory.avgLatencyMs} ms`
                : 'No data'
            }
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 4 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={800} gutterBottom>
                Grade Distribution
              </Typography>

              <Stack direction="row" spacing={1} flexWrap="wrap">
                {Object.entries(gradeDistribution).map(([grade, count]) => (
                  <Chip
                    key={grade}
                    label={`${grade}: ${count}`}
                    color={gradeColor(grade)}
                    sx={{ mb: 1 }}
                  />
                ))}

                {!Object.keys(gradeDistribution).length && (
                  <Typography color="text.secondary">No grades yet.</Typography>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 4 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={800} gutterBottom>
                Hallucination Risk
              </Typography>

              <Stack direction="row" spacing={1} flexWrap="wrap">
                {Object.entries(hallucinationRiskTotals).map(([risk, count]) => (
                  <Chip
                    key={risk}
                    label={`${risk}: ${count}`}
                    color={riskColor(risk)}
                    sx={{ mb: 1 }}
                  />
                ))}

                {!Object.keys(hallucinationRiskTotals).length && (
                  <Typography color="text.secondary">No risk data yet.</Typography>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card sx={{ borderRadius: 4 }}>
        <CardContent>
          <Typography variant="h6" fontWeight={800} gutterBottom>
            Category Performance
          </Typography>

          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Category</TableCell>
                <TableCell align="right">Pass Rate</TableCell>
                <TableCell align="right">Avg Score</TableCell>
                <TableCell align="right">Avg Latency</TableCell>
                <TableCell align="right">Runs</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {categories.map((item) => (
                <TableRow key={item.category}>
                  <TableCell>{item.category}</TableCell>
                  <TableCell align="right">{item.passRate}%</TableCell>
                  <TableCell align="right">{item.avgWeightedScore}</TableCell>
                  <TableCell align="right">{item.avgLatencyMs} ms</TableCell>
                  <TableCell align="right">{item.count}</TableCell>
                </TableRow>
              ))}

              {!categories.length && (
                <TableRow>
                  <TableCell colSpan={5}>No category data found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card sx={{ borderRadius: 4 }}>
        <CardContent>
          <Typography variant="h6" fontWeight={800} gutterBottom>
            Eval Report History
          </Typography>

          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Report File</TableCell>
                <TableCell>Generated</TableCell>
                <TableCell align="right">Pass Rate</TableCell>
                <TableCell align="right">Passed</TableCell>
                <TableCell align="right">Failed</TableCell>
                <TableCell align="right">View</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {reports.map((report) => (
                <TableRow key={report.fileName}>
                  <TableCell sx={{ maxWidth: 380, wordBreak: 'break-all' }}>
                    {report.fileName}
                  </TableCell>
                  <TableCell>
                    {report.summary?.generatedAt
                      ? new Date(report.summary.generatedAt).toLocaleString()
                      : 'N/A'}
                  </TableCell>
                  <TableCell align="right">
                    {report.summary?.passRate ?? 0}%
                  </TableCell>
                  <TableCell align="right">
                    {report.summary?.passed ?? 0}
                  </TableCell>
                  <TableCell align="right">
                    {report.summary?.failed ?? 0}
                  </TableCell>
                  <TableCell align="right">
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => openReport(report.fileName)}
                    >
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}

              {!reports.length && (
                <TableRow>
                  <TableCell colSpan={6}>No eval reports found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle fontWeight={800}>
          Eval Report Details
        </DialogTitle>

        <DialogContent>
          {selectedReport && (
            <Stack spacing={3}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={3}>
                  <InfoCard
                    title="Pass Rate"
                    value={`${selectedReport.passRate}%`}
                    subtitle={`${selectedReport.passed}/${selectedReport.total} passed`}
                  />
                </Grid>

                <Grid item xs={12} md={3}>
                  <InfoCard
                    title="Video ID"
                    value={selectedReport.videoId}
                    subtitle="Evaluated video"
                  />
                </Grid>

                <Grid item xs={12} md={3}>
                  <InfoCard
                    title="Generated"
                    value={
                      selectedReport.generatedAt
                        ? new Date(selectedReport.generatedAt).toLocaleDateString()
                        : 'N/A'
                    }
                    subtitle={
                      selectedReport.generatedAt
                        ? new Date(selectedReport.generatedAt).toLocaleTimeString()
                        : ''
                    }
                  />
                </Grid>

                <Grid item xs={12} md={3}>
                  <InfoCard
                    title="Failed"
                    value={selectedReport.failed}
                    subtitle="Failed eval cases"
                  />
                </Grid>
              </Grid>

              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Case</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell>Grade</TableCell>
                    <TableCell>Score</TableCell>
                    <TableCell>Latency</TableCell>
                    <TableCell>Risk</TableCell>
                    <TableCell>Chunks</TableCell>
                    <TableCell>Error</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(selectedReport.results || []).map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.id}</TableCell>
                      <TableCell>{item.category}</TableCell>
                      <TableCell>
                        {item.grade ? (
                          <Chip
                            size="small"
                            label={item.grade}
                            color={gradeColor(item.grade)}
                          />
                        ) : (
                          'N/A'
                        )}
                      </TableCell>
                      <TableCell>{item.weightedScore ?? 'N/A'}</TableCell>
                      <TableCell>{item.latencyMs ?? 0} ms</TableCell>
                      <TableCell>
                        {item.hallucinationRisk ? (
                          <Chip
                            size="small"
                            label={item.hallucinationRisk}
                            color={riskColor(item.hallucinationRisk)}
                          />
                        ) : (
                          'N/A'
                        )}
                      </TableCell>
                      <TableCell>{item.supportingChunkCount ?? 'N/A'}</TableCell>
                      <TableCell
                        sx={{
                          maxWidth: 280,
                          whiteSpace: 'normal',
                          wordBreak: 'break-word',
                          color: item.error ? 'error.main' : 'text.secondary',
                          fontSize: 13,
                        }}
                      >
                        {item.error || '-'}
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={item.passed ? 'PASS' : 'FAIL'}
                          color={item.passed ? 'success' : 'error'}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Stack>
          )}
        </DialogContent>
      </Dialog>
    </Stack>
  );
};

export default AdminEvalPage;