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
  Typography,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { getHealthLiveApi, getHealthStatusApi } from '../../api/adminApi';

const StatusChip = ({ healthy, label }) => (
  <Chip
    label={label}
    color={healthy ? 'success' : 'error'}
    variant="filled"
  />
);

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

const AdminHealthPage = () => {
  const [live, setLive] = useState(null);
  const [status, setStatus] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchHealth = async () => {
    try {
      setLoading(true);
      setError('');

      const [liveData, statusData] = await Promise.all([
        getHealthLiveApi(),
        getHealthStatusApi(),
      ]);

      setLive(liveData);
      setStatus(statusData);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          'Failed to fetch health status'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();

    const interval = setInterval(() => {
      fetchHealth();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  return (
    <Stack spacing={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Box>
          <Typography variant="h4" fontWeight={800}>
            System Health
          </Typography>
          <Typography color="text.secondary">
            Backend readiness, database, embeddings, LLM, and memory.
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={<RefreshIcon />}
          onClick={fetchHealth}
          disabled={loading}
        >
          Refresh
        </Button>
      </Box>

      {error && <Alert severity="error">{error}</Alert>}

      <Stack direction="row" spacing={1}>
        <StatusChip
          healthy={live?.status === 'live'}
          label={`Live: ${live?.status || 'unknown'}`}
        />
        <StatusChip
          healthy={status?.status === 'ready'}
          label={`Status: ${status?.status || 'unknown'}`}
        />
      </Stack>

      <Grid container spacing={3}>
        <Grid item xs={12} md={3}>
          <InfoCard
            title="Environment"
            value={status?.environment || 'N/A'}
            subtitle={`Node ${status?.nodeVersion || 'N/A'}`}
          />
        </Grid>

        <Grid item xs={12} md={3}>
          <InfoCard
            title="MongoDB"
            value={status?.database?.mongo || 'N/A'}
            subtitle="Database connection"
          />
        </Grid>

        <Grid item xs={12} md={3}>
          <InfoCard
            title="Embedding Service"
            value={status?.embedding?.status || 'N/A'}
            subtitle={status?.embedding?.healthy ? 'Healthy' : 'Not healthy'}
          />
        </Grid>

        <Grid item xs={12} md={3}>
          <InfoCard
            title="LLM Provider"
            value={status?.llm?.provider || 'N/A'}
            subtitle={status?.llm?.model || 'N/A'}
          />
        </Grid>

        <Grid item xs={12} md={3}>
          <InfoCard
            title="Uptime"
            value={`${status?.uptimeSeconds || live?.uptimeSeconds || 0}s`}
            subtitle="Backend process uptime"
          />
        </Grid>

        <Grid item xs={12} md={3}>
          <InfoCard
            title="Heap Used"
            value={`${status?.memory?.heapUsedMb || 0} MB`}
            subtitle={`Heap total ${status?.memory?.heapTotalMb || 0} MB`}
          />
        </Grid>

        <Grid item xs={12} md={3}>
          <InfoCard
            title="RSS Memory"
            value={`${status?.memory?.rssMb || 0} MB`}
            subtitle="Resident set size"
          />
        </Grid>

        <Grid item xs={12} md={3}>
          <InfoCard
            title="External Memory"
            value={`${status?.memory?.externalMb || 0} MB`}
            subtitle="Native/external allocations"
          />
        </Grid>
      </Grid>
    </Stack>
  );
};

export default AdminHealthPage;