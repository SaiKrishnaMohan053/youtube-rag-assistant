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
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { getMetricsSummaryApi } from '../../api/adminApi';

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
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Box>
          <Typography variant="h4" fontWeight={800}>
            Application Metrics
          </Typography>
          <Typography color="text.secondary">
            Request volume, error logs, and slow route monitoring.
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={<RefreshIcon />}
          onClick={fetchMetrics}
          disabled={loading}
        >
          Refresh
        </Button>
      </Box>

      {error && <Alert severity="error">{error}</Alert>}

      <Grid container spacing={3}>
        <Grid item xs={12} md={3}>
          <InfoCard
            title="Window"
            value={metrics?.window || '24h'}
            subtitle="Metrics time range"
          />
        </Grid>

        <Grid item xs={12} md={3}>
          <InfoCard
            title="Total Events"
            value={totalEvents}
            subtitle="Stored metric events"
          />
        </Grid>

        <Grid item xs={12} md={3}>
          <InfoCard
            title="Event Types"
            value={byEvent.length}
            subtitle="Unique metric events"
          />
        </Grid>

        <Grid item xs={12} md={3}>
          <InfoCard
            title="Recent Errors"
            value={recentErrors.length}
            subtitle="Latest error records"
          />
        </Grid>
      </Grid>

      <Card sx={{ borderRadius: 4 }}>
        <CardContent>
          <Typography variant="h6" fontWeight={800} gutterBottom>
            Events by Count
          </Typography>

          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Event</TableCell>
                <TableCell align="right">Count</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {byEvent.map((item) => (
                <TableRow key={item._id}>
                  <TableCell>
                    <Chip label={item._id || 'unknown'} size="small" />
                  </TableCell>
                  <TableCell align="right">{item.count}</TableCell>
                </TableRow>
              ))}

              {!byEvent.length && (
                <TableRow>
                  <TableCell colSpan={2}>No metric events found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card sx={{ borderRadius: 4 }}>
        <CardContent>
          <Typography variant="h6" fontWeight={800} gutterBottom>
            Slow Routes
          </Typography>

          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Route</TableCell>
                <TableCell>Method</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Duration</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {slowRoutes.map((item) => (
                <TableRow key={item._id}>
                  <TableCell>{item.meta?.route || item.meta?.path || 'N/A'}</TableCell>
                  <TableCell>{item.meta?.method || 'N/A'}</TableCell>
                  <TableCell>{item.meta?.statusCode || 'N/A'}</TableCell>
                  <TableCell align="right">
                    {item.meta?.durationMs || 0} ms
                  </TableCell>
                </TableRow>
              ))}

              {!slowRoutes.length && (
                <TableRow>
                  <TableCell colSpan={4}>No slow routes found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card sx={{ borderRadius: 4 }}>
        <CardContent>
          <Typography variant="h6" fontWeight={800} gutterBottom>
            Recent Errors
          </Typography>

          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Event</TableCell>
                <TableCell>Message</TableCell>
                <TableCell>Created</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {recentErrors.map((item) => (
                <TableRow key={item._id}>
                  <TableCell>{item.event}</TableCell>
                  <TableCell>{item.meta?.error || item.meta?.message || 'N/A'}</TableCell>
                  <TableCell>
                    {item.createdAt
                      ? new Date(item.createdAt).toLocaleString()
                      : 'N/A'}
                  </TableCell>
                </TableRow>
              ))}

              {!recentErrors.length && (
                <TableRow>
                  <TableCell colSpan={3}>No recent errors found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </Stack>
  );
};

export default AdminMetricsPage;