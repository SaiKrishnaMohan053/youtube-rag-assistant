import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  LinearProgress,
  Stack,
  Typography,
} from '@mui/material';
import DataObjectOutlinedIcon from '@mui/icons-material/DataObjectOutlined';
import HealthAndSafetyOutlinedIcon from '@mui/icons-material/HealthAndSafetyOutlined';
import MemoryOutlinedIcon from '@mui/icons-material/MemoryOutlined';
import RefreshIcon from '@mui/icons-material/Refresh';
import StorageOutlinedIcon from '@mui/icons-material/StorageOutlined';
import SmartToyOutlinedIcon from '@mui/icons-material/SmartToyOutlined';
import SpeedOutlinedIcon from '@mui/icons-material/SpeedOutlined';

import { getHealthLiveApi, getHealthStatusApi } from '../../api/adminApi';

const panelSx = {
  bgcolor: 'rgba(15,23,42,0.82)',
  color: '#fff',
  border: '1px solid rgba(148,163,184,0.18)',
  boxShadow: '0 24px 70px rgba(0,0,0,0.28)',
  backdropFilter: 'blur(18px)',
};

const StatusChip = ({ healthy, label }) => (
  <Chip
    label={label}
    color={healthy ? 'success' : 'error'}
    variant="filled"
  />
);

const InfoCard = ({ title, value, subtitle, icon, accent = '#38bdf8' }) => (
  <Card sx={{ ...panelSx, height: '100%' }}>
    <CardContent>
      <Stack spacing={2}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
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

          <Chip
            size="small"
            label="check"
            sx={{
              color: '#cbd5e1',
              bgcolor: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(148,163,184,0.18)',
            }}
          />
        </Stack>

        <Box>
          <Typography sx={{ color: '#94a3b8' }}>
            {title}
          </Typography>

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

  const heapUsed = status?.memory?.heapUsedMb || 0;
  const heapTotal = status?.memory?.heapTotalMb || 0;
  const heapPercent = heapTotal ? Math.round((heapUsed / heapTotal) * 100) : 0;

  return (
    <Stack spacing={3}>
      <Card
        sx={{
          ...panelSx,
          background:
            'linear-gradient(135deg, rgba(34,197,94,0.16), rgba(6,182,212,0.13), rgba(15,23,42,0.92))',
        }}
      >
        <CardContent sx={{ p: { xs: 3, md: 4 } }}>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            justifyContent="space-between"
            spacing={3}
          >
            <Box>
              <Typography variant="overline" sx={{ color: '#86efac' }}>
                Backend readiness
              </Typography>

              <Typography variant="h3" fontWeight={950}>
                System Health
              </Typography>

              <Typography sx={{ color: '#cbd5e1', maxWidth: 820, mt: 1 }}>
                Track backend liveness, database status, embedding service, LLM provider,
                uptime, and memory usage. This page auto-refreshes every 30 seconds.
              </Typography>
            </Box>

            <Stack spacing={1} alignItems={{ xs: 'flex-start', md: 'flex-end' }}>
              <Button
                variant="contained"
                startIcon={<RefreshIcon />}
                onClick={fetchHealth}
                disabled={loading}
              >
                {loading ? 'Refreshing...' : 'Refresh'}
              </Button>

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
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {error && <Alert severity="error">{error}</Alert>}

      <Grid container spacing={2.5}>
        <Grid item xs={12} md={3}>
          <InfoCard
            title="Environment"
            value={status?.environment || 'N/A'}
            subtitle={`Node ${status?.nodeVersion || 'N/A'}`}
            icon={<DataObjectOutlinedIcon />}
            accent="#38bdf8"
          />
        </Grid>

        <Grid item xs={12} md={3}>
          <InfoCard
            title="MongoDB"
            value={status?.database?.mongo || 'N/A'}
            subtitle="Database connection"
            icon={<StorageOutlinedIcon />}
            accent="#22c55e"
          />
        </Grid>

        <Grid item xs={12} md={3}>
          <InfoCard
            title="Embedding Service"
            value={status?.embedding?.status || 'N/A'}
            subtitle={status?.embedding?.healthy ? 'Healthy' : 'Not healthy'}
            icon={<HealthAndSafetyOutlinedIcon />}
            accent="#7c3aed"
          />
        </Grid>

        <Grid item xs={12} md={3}>
          <InfoCard
            title="LLM Provider"
            value={status?.llm?.provider || 'N/A'}
            subtitle={status?.llm?.model || 'N/A'}
            icon={<SmartToyOutlinedIcon />}
            accent="#f59e0b"
          />
        </Grid>

        <Grid item xs={12} md={3}>
          <InfoCard
            title="Uptime"
            value={`${status?.uptimeSeconds || live?.uptimeSeconds || 0}s`}
            subtitle="Backend process uptime"
            icon={<SpeedOutlinedIcon />}
            accent="#06b6d4"
          />
        </Grid>

        <Grid item xs={12} md={3}>
          <InfoCard
            title="RSS Memory"
            value={`${status?.memory?.rssMb || 0} MB`}
            subtitle="Resident set size"
            icon={<MemoryOutlinedIcon />}
            accent="#ef4444"
          />
        </Grid>

        <Grid item xs={12} md={3}>
          <InfoCard
            title="External Memory"
            value={`${status?.memory?.externalMb || 0} MB`}
            subtitle="Native/external allocations"
            icon={<MemoryOutlinedIcon />}
            accent="#a855f7"
          />
        </Grid>

        <Grid item xs={12} md={3}>
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
                    bgcolor: 'rgba(34,197,94,0.16)',
                    border: '1px solid rgba(34,197,94,0.32)',
                  }}
                >
                  <MemoryOutlinedIcon />
                </Box>

                <Box>
                  <Typography sx={{ color: '#94a3b8' }}>
                    Heap Used
                  </Typography>

                  <Typography variant="h4" fontWeight={950}>
                    {heapUsed} MB
                  </Typography>

                  <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                    Heap total {heapTotal} MB
                  </Typography>
                </Box>

                <Box>
                  <LinearProgress
                    variant="determinate"
                    value={heapPercent}
                    sx={{
                      height: 9,
                      borderRadius: 99,
                      bgcolor: 'rgba(255,255,255,0.08)',
                    }}
                  />

                  <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                    {heapPercent}% used
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Stack>
  );
};

export default AdminHealthPage;