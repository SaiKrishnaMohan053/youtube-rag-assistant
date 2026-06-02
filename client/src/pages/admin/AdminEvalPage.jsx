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
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  TextField,
} from '@mui/material';
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined';
import CloseIcon from '@mui/icons-material/Close';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import RefreshIcon from '@mui/icons-material/Refresh';
import ReportProblemOutlinedIcon from '@mui/icons-material/ReportProblemOutlined';
import SpeedOutlinedIcon from '@mui/icons-material/SpeedOutlined';
import StarBorderOutlinedIcon from '@mui/icons-material/StarBorderOutlined';
import TimelineOutlinedIcon from '@mui/icons-material/TimelineOutlined';

import {
  getEvalReportByFileNameApi,
  getEvalReportsApi,
  getEvalStatsApi,
  runEvalApi,
} from '../../api/adminApi';

const panelSx = {
  bgcolor: 'rgba(15,23,42,0.82)',
  color: '#fff',
  border: '1px solid rgba(148,163,184,0.18)',
  boxShadow: '0 24px 70px rgba(0,0,0,0.28)',
  backdropFilter: 'blur(18px)',
};

const tableCellSx = {
  color: '#cbd5e1',
  borderColor: 'rgba(148,163,184,0.14)',
};

const headerCellSx = {
  bgcolor: '#111827',
  color: '#e5e7eb',
  fontWeight: 900,
  borderColor: 'rgba(148,163,184,0.14)',
};

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

const InfoCard = ({ title, value, subtitle, icon, accent = '#38bdf8', valueFontSize }) => {
  const valueText = String(value ?? '');
  const isLongValue = valueText.length > 10;

  return (
    <Card sx={{ ...panelSx, height: 185, overflow: 'hidden' }}>
      <CardContent sx={{ p: 2.2, height: '100%' }}>
        <Stack spacing={1.4} sx={{ height: '100%' }}>
          {icon && (
            <Box
              sx={{
                width: 42,
                height: 42,
                borderRadius: 3,
                display: 'grid',
                placeItems: 'center',
                color: '#fff',
                bgcolor: `${accent}26`,
                border: `1px solid ${accent}55`,
                flexShrink: 0,
              }}
            >
              {icon}
            </Box>
          )}

          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" sx={{ color: '#94a3b8' }}>
              {title}
            </Typography>

            <Typography
              fontWeight={900}
              title={valueText}
              sx={{
                mt: 0.3,
                lineHeight: 1.15,
                fontSize: valueFontSize || isLongValue ? '1.05rem' : '1.9rem',
                wordBreak: 'break-word',
                overflowWrap: 'anywhere',
                whiteSpace: 'normal',
              }}
            >
              {valueText}
            </Typography>

            {subtitle && (
              <Typography
                variant="caption"
                sx={{
                  color: '#94a3b8',
                  display: 'block',
                  mt: 0.5,
                  lineHeight: 1.25,
                }}
              >
                {subtitle}
              </Typography>
            )}
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
};

const DataTableCard = ({ title, subtitle, children }) => (
  <Card sx={panelSx}>
    <CardContent>
      <Stack spacing={0.5} sx={{ mb: 2 }}>
        <Typography variant="h5" fontWeight={900}>
          {title}
        </Typography>
        {subtitle && (
          <Typography sx={{ color: '#94a3b8' }}>
            {subtitle}
          </Typography>
        )}
      </Stack>

      {children}
    </CardContent>
  </Card>
);

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
      <Card
        sx={{
          ...panelSx,
          background:
            'linear-gradient(135deg, rgba(245,158,11,0.16), rgba(124,58,237,0.14), rgba(15,23,42,0.92))',
        }}
      >
        <CardContent sx={{ p: { xs: 3, md: 4 } }}>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            justifyContent="space-between"
            spacing={3}
          >
            <Box>
              <Typography variant="overline" sx={{ color: '#fde68a' }}>
                RAG Quality Lab
              </Typography>

              <Typography variant="h3" fontWeight={950}>
                RAG Evaluations
              </Typography>

              <Typography sx={{ color: '#cbd5e1', maxWidth: 850, mt: 1 }}>
                Track answer quality, pass rate, latency, hallucination risk, category
                performance, and historical eval reports.
              </Typography>
            </Box>

            <Button
              variant="contained"
              startIcon={<RefreshIcon />}
              onClick={fetchEvalData}
              disabled={loading}
              sx={{ alignSelf: 'flex-start' }}
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {error && <Alert severity="error">{error}</Alert>}
      {success && <Alert severity="success">{success}</Alert>}

      <Card sx={panelSx}>
        <CardContent>
          <Stack spacing={2}>
            <Box>
              <Typography variant="h5" fontWeight={900}>
                Run Evaluation
              </Typography>

              <Typography sx={{ color: '#94a3b8' }}>
                Run the eval suite against an indexed auth video and optional guest URL.
              </Typography>
            </Box>

            <Divider sx={{ borderColor: 'rgba(148,163,184,0.16)' }} />

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  md: '1fr 1fr 180px',
                },
                gap: 2,
                alignItems: 'center',
              }}
            >
              <TextField
                fullWidth
                label="Mongo Video ID"
                value={videoId}
                onChange={(e) => setVideoId(e.target.value)}
                placeholder="Example: 686f2d9e7abf4c3a91e12345"
              />

              <TextField
                fullWidth
                label="Guest YouTube URL"
                value={guestUrl}
                onChange={(e) => setGuestUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
              />

              <Button
                fullWidth
                size="large"
                variant="contained"
                onClick={handleRunEval}
                disabled={runLoading}
                sx={{
                  height: 56,
                  whiteSpace: 'nowrap',
                }}
              >
                {runLoading ? 'Running...' : 'Run Eval'}
              </Button>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2,1fr)',
            lg: 'repeat(5,1fr)',
          },
          gap: 2.5,
          width: '100%',
          alignItems: 'stretch',
        }}
      >
        <InfoCard
          title="Reports"
          value={stats?.reportCount || 0}
          subtitle="Stored eval runs"
          icon={<AssessmentOutlinedIcon />}
          accent="#38bdf8"
        />

        <InfoCard
          title="Avg Pass Rate"
          value={`${stats?.avgPassRate || 0}%`}
          subtitle="Across reports"
          icon={<FactCheckOutlinedIcon />}
          accent="#22c55e"
        />

        <InfoCard
          title="Avg Latency"
          value={`${stats?.avgLatencyMs || 0} ms`}
          subtitle="Across eval cases"
          icon={<SpeedOutlinedIcon />}
          accent="#f59e0b"
          valueFontSize="1.9rem"
        />

        <InfoCard
          title="Best Category"
          value={stats?.bestCategory?.category || 'N/A'}
          subtitle={
            stats?.bestCategory
              ? `Score ${stats.bestCategory.avgWeightedScore}`
              : 'No data'
          }
          icon={<StarBorderOutlinedIcon />}
          accent="#a855f7"
        />

        <InfoCard
          title="Slowest Category"
          value={stats?.slowestCategory?.category || 'N/A'}
          subtitle={
            stats?.slowestCategory
              ? `${stats.slowestCategory.avgLatencyMs} ms`
              : 'No data'
            }
            icon={<TimelineOutlinedIcon />}
            accent="#ef4444"
        />
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            md: '1fr 1fr',
          },
          gap: 3,
          width: '100%',
          alignItems: 'stretch',
        }}
      >
        <Card sx={{ ...panelSx, height: 120 }}>
          <CardContent sx={{ p: 2.5 }}>
            <Typography variant="h6" fontWeight={900} gutterBottom>
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
                <Typography sx={{ color: '#94a3b8' }}>No grades yet.</Typography>
              )}
            </Stack>
          </CardContent>
        </Card>

        <Card sx={{ ...panelSx, height: 120 }}>
          <CardContent sx={{ p: 2.5 }}>
            <Typography variant="h6" fontWeight={900} gutterBottom>
              Hallucination Risk
            </Typography>

            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" alignItems="center">
              {Object.entries(hallucinationRiskTotals).map(([risk, count]) => (
                <Chip
                  key={risk}
                  label={`${risk}: ${count}`}
                  color={riskColor(risk)}
                  sx={{ mb: 1 }}
                />
              ))}

              {!Object.keys(hallucinationRiskTotals).length && (
                <Typography sx={{ color: '#94a3b8' }}>No risk data yet.</Typography>
              )}
            </Stack>
          </CardContent>
        </Card>
      </Box>

      <DataTableCard
        title="Category Performance"
        subtitle="Pass rate, weighted score, latency, and run count by eval category"
      >
        <TableContainer
          sx={{
            maxHeight: 480,
            borderRadius: 1.5,
            border: '1px solid rgba(148,163,184,0.14)',
          }}
        >
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={headerCellSx}>Category</TableCell>
                <TableCell sx={headerCellSx} align="right">Pass Rate</TableCell>
                <TableCell sx={headerCellSx} align="right">Avg Score</TableCell>
                <TableCell sx={headerCellSx} align="right">Avg Latency</TableCell>
                <TableCell sx={headerCellSx} align="right">Runs</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {categories.map((item) => (
                <TableRow key={item.category}>
                  <TableCell sx={tableCellSx}>
                    <Typography color="#fff" fontWeight={800}>
                      {item.category}
                    </Typography>
                  </TableCell>
                  <TableCell sx={tableCellSx} align="right">{item.passRate}%</TableCell>
                  <TableCell sx={tableCellSx} align="right">{item.avgWeightedScore}</TableCell>
                  <TableCell sx={tableCellSx} align="right">{item.avgLatencyMs} ms</TableCell>
                  <TableCell sx={tableCellSx} align="right">{item.count}</TableCell>
                </TableRow>
              ))}

              {!categories.length && (
                <TableRow>
                  <TableCell sx={tableCellSx} colSpan={5}>
                    No category data found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </DataTableCard>

      <DataTableCard
        title="Eval Report History"
        subtitle="Stored report snapshots from previous eval runs"
      >
        <TableContainer
          sx={{
            maxHeight: 520,
            borderRadius: 2,
            border: '1px solid rgba(148,163,184,0.14)',
          }}
        >
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={headerCellSx}>Report File</TableCell>
                <TableCell sx={headerCellSx}>Generated</TableCell>
                <TableCell sx={headerCellSx} align="right">Pass Rate</TableCell>
                <TableCell sx={headerCellSx} align="right">Passed</TableCell>
                <TableCell sx={headerCellSx} align="right">Failed</TableCell>
                <TableCell sx={headerCellSx} align="right">View</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {reports.map((report) => (
                <TableRow key={report.fileName}>
                  <TableCell sx={{ ...tableCellSx, maxWidth: 420, wordBreak: 'break-all' }}>
                    {report.fileName}
                  </TableCell>

                  <TableCell sx={tableCellSx}>
                    {report.summary?.generatedAt
                      ? new Date(report.summary.generatedAt).toLocaleString()
                      : 'N/A'}
                  </TableCell>

                  <TableCell sx={tableCellSx} align="right">
                    {report.summary?.passRate ?? 0}%
                  </TableCell>

                  <TableCell sx={tableCellSx} align="right">
                    {report.summary?.passed ?? 0}
                  </TableCell>

                  <TableCell sx={tableCellSx} align="right">
                    {report.summary?.failed ?? 0}
                  </TableCell>

                  <TableCell sx={tableCellSx} align="right">
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
                  <TableCell sx={tableCellSx} colSpan={6}>
                    No eval reports found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </DataTableCard>

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="xl"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: '#0f172a',
            color: '#fff',
            border: '1px solid rgba(148,163,184,0.18)',
          },
        }}
      >
        <DialogTitle>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="h5" fontWeight={900}>
                Eval Report Details
              </Typography>

              <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                Case-level grades, latency, risk, chunk usage, and pass/fail results
              </Typography>
            </Box>

            <IconButton onClick={() => setDialogOpen(false)} sx={{ color: '#fff' }}>
              <CloseIcon />
            </IconButton>
          </Stack>
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
                    icon={<FactCheckOutlinedIcon />}
                    accent="#22c55e"
                  />
                </Grid>

                <Grid item xs={12} md={3}>
                  <InfoCard
                    title="Video ID"
                    value={selectedReport.videoId}
                    subtitle="Evaluated video"
                    icon={<AssessmentOutlinedIcon />}
                    accent="#38bdf8"
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
                    icon={<TimelineOutlinedIcon />}
                    accent="#a855f7"
                  />
                </Grid>

                <Grid item xs={12} md={3}>
                  <InfoCard
                    title="Failed"
                    value={selectedReport.failed}
                    subtitle="Failed eval cases"
                    icon={<ReportProblemOutlinedIcon />}
                    accent="#ef4444"
                  />
                </Grid>
              </Grid>

              <TableContainer
                sx={{
                  maxHeight: 620,
                  borderRadius: 2,
                  border: '1px solid rgba(148,163,184,0.14)',
                }}
              >
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      {[
                        'Case',
                        'Category',
                        'Grade',
                        'Score',
                        'Latency',
                        'Risk',
                        'Chunks',
                        'Error',
                        'Status',
                      ].map((head) => (
                        <TableCell key={head} sx={headerCellSx}>
                          {head}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    {(selectedReport.results || []).map((item) => (
                      <TableRow key={item.id}>
                        <TableCell sx={tableCellSx}>{item.id}</TableCell>
                        <TableCell sx={tableCellSx}>{item.category}</TableCell>

                        <TableCell sx={tableCellSx}>
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

                        <TableCell sx={tableCellSx}>{item.weightedScore ?? 'N/A'}</TableCell>
                        <TableCell sx={tableCellSx}>{item.latencyMs ?? 0} ms</TableCell>

                        <TableCell sx={tableCellSx}>
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

                        <TableCell sx={tableCellSx}>
                          {item.supportingChunkCount ?? 'N/A'}
                        </TableCell>

                        <TableCell
                          sx={{
                            ...tableCellSx,
                            maxWidth: 340,
                            whiteSpace: 'normal',
                            wordBreak: 'break-word',
                            color: item.error ? '#fecaca' : '#94a3b8',
                            fontSize: 13,
                          }}
                        >
                          {item.error || '-'}
                        </TableCell>

                        <TableCell sx={tableCellSx}>
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
              </TableContainer>
            </Stack>
          )}
        </DialogContent>
      </Dialog>
    </Stack>
  );
};

export default AdminEvalPage;