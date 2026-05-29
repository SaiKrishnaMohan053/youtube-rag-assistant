import { useEffect, useMemo, useState } from 'react';
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
  getAdminOverviewApi,
  getAdminUsersApi,
  getAdminUserVideosApi,
  getAdminVideoChunksApi,
} from '../../api/adminApi';

const GRADE_COLORS = ['#4caf50', '#2196f3', '#ff9800', '#f44336'];
const RISK_COLORS = ['#4caf50', '#ff9800', '#f44336'];

const statusColor = (status) => {
  if (status === 'completed') return 'success';
  if (status === 'failed') return 'error';
  return 'warning';
};

const InfoCard = ({ title, value, subtitle }) => (
  <Card sx={{ borderRadius: 4 }}>
    <CardContent>
      <Typography color="text.secondary">{title}</Typography>
      <Typography variant="h5" fontWeight={800}>
        {value}
      </Typography>
      {subtitle && (
        <Typography color="text.secondary">
          {subtitle}
        </Typography>
      )}
    </CardContent>
  </Card>
);

const ChartCard = ({ title, children }) => (
  <Card sx={{ borderRadius: 4, height: 380 }}>
    <CardContent sx={{ height: '100%' }}>
      <Typography variant="h6" fontWeight={800}>
        {title}
      </Typography>
      <Box sx={{ height: 300 }}>
        {children}
      </Box>
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
  const [overview, setOverview] = useState(null);
  const [users, setUsers] = useState([]);

  const [selectedUser, setSelectedUser] = useState(null);
  const [userVideos, setUserVideos] = useState([]);

  const [selectedVideo, setSelectedVideo] = useState(null);
  const [videoChunks, setVideoChunks] = useState([]);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError('');

      const [
        healthData,
        evalData,
        metricsData,
        overviewData,
        usersData,
      ] = await Promise.all([
        getHealthStatusApi(),
        getEvalStatsApi(),
        getMetricsSummaryApi(),
        getAdminOverviewApi(),
        getAdminUsersApi(),
      ]);

      setHealth(healthData);
      setEvalStats(evalData);
      setMetrics(metricsData);
      setOverview(overviewData);
      setUsers(usersData);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          'Failed to load dashboard'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const openUserVideos = async (user) => {
    const data = await getAdminUserVideosApi(user._id);
    setSelectedUser(data.user);
    setUserVideos(data.videos);
  };

  const openChunks = async (video) => {
    const data = await getAdminVideoChunksApi(video._id);
    setSelectedVideo(data.video);
    setVideoChunks(data.chunks);
  };

  const categoryData = evalStats?.categories || [];

  const gradeData = useMemo(
    () => toPieData(evalStats?.gradeDistribution),
    [evalStats]
  );

  const riskData = useMemo(
    () => toPieData(evalStats?.hallucinationRiskTotals),
    [evalStats]
  );

  return (
    <Stack spacing={3}>
      <Box display="flex" justifyContent="space-between">
        <Typography variant="h4" fontWeight={800}>
          Admin Dashboard
        </Typography>

        <Button
          startIcon={<RefreshIcon />}
          variant="contained"
          onClick={fetchDashboard}
          disabled={loading}
        >
          Refresh
        </Button>
      </Box>

      {error && <Alert severity="error">{error}</Alert>}

      <Grid container spacing={2}>
        <Grid item xs={12} md={2}>
          <InfoCard title="Users" value={overview?.totalUsers || 0} />
        </Grid>

        <Grid item xs={12} md={2}>
          <InfoCard title="Videos" value={overview?.totalVideos || 0} />
        </Grid>

        <Grid item xs={12} md={2}>
          <InfoCard title="Chunks" value={overview?.totalChunks || 0} />
        </Grid>

        <Grid item xs={12} md={2}>
          <InfoCard
            title="Summaries"
            value={overview?.summaries?.completed || 0}
            subtitle="completed"
          />
        </Grid>

        <Grid item xs={12} md={2}>
          <InfoCard
            title="Embeddings"
            value={overview?.embeddings?.completed || 0}
            subtitle="completed"
          />
        </Grid>

        <Grid item xs={12} md={2}>
          <InfoCard
            title="System"
            value={health?.status || 'N/A'}
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} lg={6}>
          <ChartCard title="Category Performance">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" />
                <YAxis domain={[0, 1]} />
                <Tooltip />
                <Bar dataKey="avgWeightedScore" fill="#1976d2" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid>

        <Grid item xs={12} lg={3}>
          <ChartCard title="Grades">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={gradeData} dataKey="value">
                  {gradeData.map((e, i) => (
                    <Cell
                      key={e.name}
                      fill={GRADE_COLORS[i % GRADE_COLORS.length]}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid>

        <Grid item xs={12} lg={3}>
          <ChartCard title="Hallucination Risk">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={riskData} dataKey="value">
                  {riskData.map((e, i) => (
                    <Cell
                      key={e.name}
                      fill={RISK_COLORS[i % RISK_COLORS.length]}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid>
      </Grid>

      <Card sx={{ borderRadius: 4 }}>
        <CardContent>
          <Typography variant="h6" fontWeight={800} gutterBottom>
            Users
          </Typography>

          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Videos</TableCell>
                <TableCell>Chunks</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>

            <TableBody>
              {users.map((user) => (
                <TableRow key={user._id}>
                  <TableCell>{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Chip label={user.role} />
                  </TableCell>
                  <TableCell>{user.videoCount}</TableCell>
                  <TableCell>{user.chunkCount}</TableCell>
                  <TableCell>
                    <Button onClick={() => openUserVideos(user)}>
                      View Videos
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog
        open={Boolean(selectedUser)}
        maxWidth="lg"
        fullWidth
        onClose={() => setSelectedUser(null)}
      >
        <DialogTitle>
          {selectedUser?.name} Videos
        </DialogTitle>

        <DialogContent>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Title</TableCell>
                <TableCell>Transcript</TableCell>
                <TableCell>Summary</TableCell>
                <TableCell>Chunks</TableCell>
                <TableCell>Embeddings</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>

            <TableBody>
              {userVideos.map((video) => (
                <TableRow key={video._id}>
                  <TableCell>{video.title || video.videoId}</TableCell>

                  <TableCell>
                    <Chip
                      label={video.transcriptStatus}
                      color={statusColor(video.transcriptStatus)}
                    />
                  </TableCell>

                  <TableCell>
                    <Chip
                      label={video.summaryStatus}
                      color={statusColor(video.summaryStatus)}
                    />
                  </TableCell>

                  <TableCell>{video.chunkCount}</TableCell>

                  <TableCell>
                    {video.embeddingCompleted}/{video.chunkCount}
                  </TableCell>

                  <TableCell>
                    <Button onClick={() => openChunks(video)}>
                      Chunks
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(selectedVideo)}
        maxWidth="xl"
        fullWidth
        onClose={() => setSelectedVideo(null)}
      >
        <DialogTitle>
          Chunks
        </DialogTitle>

        <DialogContent>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>#</TableCell>
                <TableCell>Text</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {videoChunks.map((chunk) => (
                <TableRow key={chunk._id}>
                  <TableCell>{chunk.chunkIndex}</TableCell>
                  <TableCell>
                    {chunk.text.slice(0, 150)}...
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={chunk.embeddingStatus}
                      color={statusColor(chunk.embeddingStatus)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>
    </Stack>
  );
};

export default AdminHomePage;