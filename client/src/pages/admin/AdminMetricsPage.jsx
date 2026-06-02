import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import BugReportOutlinedIcon from '@mui/icons-material/BugReportOutlined';
import QueryStatsOutlinedIcon from '@mui/icons-material/QueryStatsOutlined';
import RefreshIcon from '@mui/icons-material/Refresh';
import RouteOutlinedIcon from '@mui/icons-material/RouteOutlined';
import SpeedOutlinedIcon from '@mui/icons-material/SpeedOutlined';
import TimelineOutlinedIcon from '@mui/icons-material/TimelineOutlined';

import { getMetricsSummaryApi } from '../../api/adminApi';

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

const InfoCard = ({ title, value, subtitle, icon, accent = '#38bdf8' }) => (
  <Card sx={{ ...panelSx, height: '100%' }}>
    <CardContent>
      <Stack spacing={2}>
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: 4,
            display: 'grid',
            placeItems: 'center',
            color: '#fff',
            bgcolor: `${accent}26`,
            border: `1px solid ${accent}55`,
          }}
        >
          {icon}
        </Box>

        <Box>
          <Typography sx={{ color: '#94a3b8' }}>{title}</Typography>
          <Typography variant="h4" fontWeight={950}>
            {value}
          </Typography>
          {subtitle && (
            <Typography variant="body2" sx={{ color: '#94a3b8' }}>
              {subtitle}
            </Typography>
          )}
        </Box>
      </Stack>
    </CardContent>
  </Card>
);

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

const AdminMetricsPage = () => {
  const [metrics, setMetrics] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      setError('');

      const data = await getMetricsSummaryApi();
      setMetrics(data);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          'Failed to fetch metrics summary'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();

    const interval = setInterval(() => {
      fetchMetrics();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const byEvent = metrics?.byEvent || [];
  const recentErrors = metrics?.recentErrors || [];
  const slowRoutes = metrics?.slowRoutes || [];

  const totalEvents = byEvent.reduce((sum, item) => sum + item.count, 0);

  return (
    <Stack spacing={3}>
      <Card
        sx={{
          ...panelSx,
          background:
            'linear-gradient(135deg, rgba(6,182,212,0.18), rgba(124,58,237,0.14), rgba(15,23,42,0.92))',
        }}
      >
        <CardContent sx={{ p: { xs: 3, md: 4 } }}>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            justifyContent="space-between"
            spacing={3}
          >
            <Box>
              <Typography variant="overline" sx={{ color: '#67e8f9' }}>
                Runtime telemetry
              </Typography>

              <Typography variant="h3" fontWeight={950}>
                Application Metrics
              </Typography>

              <Typography sx={{ color: '#cbd5e1', maxWidth: 820, mt: 1 }}>
                Monitor request volume, event distribution, slow routes, and backend errors.
                This page auto-refreshes every 30 seconds.
              </Typography>
            </Box>

            <Button
              variant="contained"
              startIcon={<RefreshIcon />}
              onClick={fetchMetrics}
              disabled={loading}
              sx={{ alignSelf: 'flex-start' }}
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {error && <Alert severity="error">{error}</Alert>}

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, 1fr)',
            md: 'repeat(4, 1fr)',
          },
          gap: 2.5,
          width: '100%',
          alignItems: 'stretch',
        }}
      >
        <InfoCard
          title="Window"
          value={metrics?.window || '24h'}
          subtitle="Metrics time range"
          icon={<TimelineOutlinedIcon />}
          accent="#38bdf8"
        />

        <InfoCard
          title="Total Events"
          value={totalEvents}
          subtitle="Stored metric events"
          icon={<QueryStatsOutlinedIcon />}
          accent="#7c3aed"
        />

        <InfoCard
          title="Event Types"
          value={byEvent.length}
          subtitle="Unique metric names"
          icon={<SpeedOutlinedIcon />}
          accent="#22c55e"
        />

        <InfoCard
          title="Recent Errors"
          value={recentErrors.length}
          subtitle="Latest error records"
          icon={<BugReportOutlinedIcon />}
          accent="#ef4444"
        />
      </Box>

      <DataTableCard
        title="Events by Count"
        subtitle="Grouped backend event totals"
      >
        <TableContainer
          sx={{
            maxHeight: 420,
            borderRadius: 1.5,
            border: '1px solid rgba(148,163,184,0.14)',
          }}
        >
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={headerCellSx}>Event</TableCell>
                <TableCell sx={headerCellSx} align="right">Count</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {byEvent.map((item) => (
                <TableRow key={item._id}>
                  <TableCell sx={tableCellSx}>
                    <Chip
                      label={item._id || 'unknown'}
                      size="small"
                      sx={{
                        color: '#fff',
                        bgcolor: 'rgba(56,189,248,0.16)',
                        border: '1px solid rgba(56,189,248,0.28)',
                      }}
                    />
                  </TableCell>

                  <TableCell sx={tableCellSx} align="right">
                    {item.count}
                  </TableCell>
                </TableRow>
              ))}

              {!byEvent.length && (
                <TableRow>
                  <TableCell sx={tableCellSx} colSpan={2}>
                    No metric events found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </DataTableCard>

      <DataTableCard
        title="Slow Routes"
        subtitle="Requests with higher latency"
      >
        <TableContainer
          sx={{
            maxHeight: 420,
            borderRadius: 1.5,
            border: '1px solid rgba(148,163,184,0.14)',
          }}
        >
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={headerCellSx}>Route</TableCell>
                <TableCell sx={headerCellSx}>Method</TableCell>
                <TableCell sx={headerCellSx}>Status</TableCell>
                <TableCell sx={headerCellSx} align="right">Duration</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {slowRoutes.map((item) => (
                <TableRow key={item._id}>
                  <TableCell sx={tableCellSx}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <RouteOutlinedIcon fontSize="small" sx={{ color: '#38bdf8' }} />
                      <Typography variant="body2" sx={{ color: '#cbd5e1' }}>
                        {item.meta?.route || item.meta?.path || 'N/A'}
                      </Typography>
                    </Stack>
                  </TableCell>

                  <TableCell sx={tableCellSx}>
                    <Chip size="small" label={item.meta?.method || 'N/A'} />
                  </TableCell>

                  <TableCell sx={tableCellSx}>
                    {item.meta?.statusCode || 'N/A'}
                  </TableCell>

                  <TableCell sx={tableCellSx} align="right">
                    {item.meta?.durationMs || 0} ms
                  </TableCell>
                </TableRow>
              ))}

              {!slowRoutes.length && (
                <TableRow>
                  <TableCell sx={tableCellSx} colSpan={4}>
                    No slow routes found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </DataTableCard>

      <DataTableCard
        title="Recent Errors"
        subtitle="Latest error events captured by the backend"
      >
        <TableContainer
          sx={{
            maxHeight: 420,
            borderRadius: 1.5,
            border: '1px solid rgba(148,163,184,0.14)',
          }}
        >
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={headerCellSx}>Event</TableCell>
                <TableCell sx={headerCellSx}>Message</TableCell>
                <TableCell sx={headerCellSx}>Created</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {recentErrors.map((item) => (
                <TableRow key={item._id}>
                  <TableCell sx={tableCellSx}>{item.event}</TableCell>

                  <TableCell sx={tableCellSx}>
                    {item.meta?.error || item.meta?.message || 'N/A'}
                  </TableCell>

                  <TableCell sx={tableCellSx}>
                    {item.createdAt
                      ? new Date(item.createdAt).toLocaleString()
                      : 'N/A'}
                  </TableCell>
                </TableRow>
              ))}

              {!recentErrors.length && (
                <TableRow>
                  <TableCell sx={tableCellSx} colSpan={3}>
                    No recent errors found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </DataTableCard>
    </Stack>
  );
};

export default AdminMetricsPage;