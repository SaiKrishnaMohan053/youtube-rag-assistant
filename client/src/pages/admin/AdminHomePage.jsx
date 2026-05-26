import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  Stack,
  Typography,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  getEvalStatsApi,
  getHealthStatusApi,
  getMetricsSummaryApi,
} from '../../api/adminApi';

const GRADE_COLORS = ['#4caf50', '#2196f3', '#ff9800', '#f44336'];
const RISK_COLORS = ['#4caf50', '#ff9800', '#f44336'];

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

const ChartCard = ({ title, children }) => (
  <Card sx={{ borderRadius: 4, height: 380 }}>
    <CardContent sx={{ height: '100%' }}>
      <Typography variant="h6" fontWeight={800} gutterBottom>
        {title}
      </Typography>
      <Box sx={{ height: 300 }}>{children}</Box>
    </CardContent>
  </Card>
);

const toPieData = (object = {}) =>
  Object.entries(object).map(([name, value]) => ({
    name,
    value,
  }));

const AdminHomePage = () => {
  const [health, setHealth] = useState(null);
  const [evalStats, setEvalStats] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError('');

      const [healthData, evalData, metricsData] = await Promise.all([
        getHealthStatusApi(),
        getEvalStatsApi(),
        getMetricsSummaryApi(),
      ]);

      setHealth(healthData);
      setEvalStats(evalData);
      setMetrics(metricsData);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          'Failed to fetch dashboard data'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();

    const interval = setInterval(() => {
      fetchDashboard();
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const categoryData = evalStats?.categories || [];

  const gradeData = useMemo(
    () => toPieData(evalStats?.gradeDistribution),
    [evalStats]
  );

  const riskData = useMemo(
    () => toPieData(evalStats?.hallucinationRiskTotals),
    [evalStats]
  );

  const recentErrors = metrics?.recentErrors || [];

  return (
    <Stack spacing={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Box>
          <Typography variant="h4" fontWeight={800}>
            Admin Dashboard
          </Typography>
          <Typography color="text.secondary">
            Monitoring, RAG evaluation, and backend observability.
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={<RefreshIcon />}
          onClick={fetchDashboard}
          disabled={loading}
        >
          Refresh
        </Button>
      </Box>

      {error && <Alert severity="error">{error}</Alert>}

      <Grid container spacing={3}>
        <Grid item xs={12} md={2}>
          <InfoCard
            title="System Status"
            value={health?.status || 'N/A'}
            subtitle={`Mongo: ${health?.database?.mongo || 'N/A'}`}
          />
        </Grid>

        <Grid item xs={12} md={2}>
          <InfoCard
            title="Eval Reports"
            value={evalStats?.reportCount || 0}
            subtitle="Stored reports"
          />
        </Grid>

        <Grid item xs={12} md={2}>
          <InfoCard
            title="Avg Pass Rate"
            value={`${evalStats?.avgPassRate || 0}%`}
            subtitle="Across eval runs"
          />
        </Grid>

        <Grid item xs={12} md={2}>
          <InfoCard
            title="Avg Latency"
            value={`${evalStats?.avgLatencyMs || 0} ms`}
            subtitle="Eval case latency"
          />
        </Grid>

        <Grid item xs={12} md={2}>
          <InfoCard
            title="Recent Errors"
            value={recentErrors.length}
            subtitle="Last 24h"
          />
        </Grid>

        <Grid item xs={12} md={2}>
          <InfoCard
            title="Slowest Category"
            value={evalStats?.slowestCategory?.category || 'N/A'}
            subtitle={
              evalStats?.slowestCategory
                ? `${evalStats.slowestCategory.avgLatencyMs} ms`
                : 'No data'
            }
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} lg={6}>
          <ChartCard title="Category Performance">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="category"
                  angle={-20}
                  textAnchor="end"
                  interval={0}
                  height={75}
                />
                <YAxis domain={[0, 1]} />
                <Tooltip />
                <Bar dataKey="avgWeightedScore" fill="#1976d2" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid>

        <Grid item xs={12} lg={3}>
          <ChartCard title="Grade Distribution">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={gradeData}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={90}
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {gradeData.map((entry, index) => (
                    <Cell
                      key={entry.name}
                      fill={GRADE_COLORS[index % GRADE_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid>

        <Grid item xs={12} lg={3}>
          <ChartCard title="Hallucination Risk">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={riskData}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={90}
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {riskData.map((entry, index) => (
                    <Cell
                      key={entry.name}
                      fill={RISK_COLORS[index % RISK_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid>
      </Grid>
    </Stack>
  );
};

export default AdminHomePage;