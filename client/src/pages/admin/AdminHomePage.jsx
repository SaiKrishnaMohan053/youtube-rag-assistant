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
  Divider,
  Grid,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import RefreshIcon from '@mui/icons-material/Refresh';
import StorageOutlinedIcon from '@mui/icons-material/StorageOutlined';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import VideoLibraryOutlinedIcon from '@mui/icons-material/VideoLibraryOutlined';
import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined';
import HealthAndSafetyOutlinedIcon from '@mui/icons-material/HealthAndSafetyOutlined';
import HubOutlinedIcon from '@mui/icons-material/HubOutlined';
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
  reindexAdminVideoApi,
} from '../../api/adminApi';

const GRADE_COLORS = ['#22c55e', '#38bdf8', '#f59e0b', '#ef4444'];
const RISK_COLORS = ['#22c55e', '#f59e0b', '#ef4444'];

const statusColor = (status) => {
  if (status === 'completed') return 'success';
  if (status === 'failed') return 'error';
  return 'warning';
};

const panelSx = {
  bgcolor: 'rgba(15,23,42,0.82)',
  color: '#fff',
  border: '1px solid rgba(148,163,184,0.18)',
  boxShadow: '0 24px 70px rgba(0,0,0,0.28)',
  backdropFilter: 'blur(18px)',
};

const glassTableCellSx = {
  color: '#cbd5e1',
  borderColor: 'rgba(148,163,184,0.14)',
};

const InfoCard = ({ title, value, subtitle, icon, accent = '#7c3aed' }) => (
  <Card sx={{ ...panelSx, height: '100%' }}>
    <CardContent>
      <Stack spacing={2}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box
            sx={{
              width: 46,
              height: 46,
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
            label="Live"
            sx={{
              color: '#bbf7d0',
              bgcolor: 'rgba(34,197,94,0.12)',
              border: '1px solid rgba(34,197,94,0.22)',
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

const ChartCard = ({ title, subtitle, children }) => (
  <Card sx={{ ...panelSx, height: 400 }}>
    <CardContent sx={{ height: '100%' }}>
      <Stack spacing={0.5} sx={{ mb: 2 }}>
        <Typography variant="h6" fontWeight={900}>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="body2" sx={{ color: '#94a3b8' }}>
            {subtitle}
          </Typography>
        )}
      </Stack>

      <Box sx={{ height: 305 }}>
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

  const [reindexingVideoId, setReindexingVideoId] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

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

  const handleReindexVideo = async (video) => {
    try {
      setError('');
      setSuccessMessage('');
      setReindexingVideoId(video._id);

      await reindexAdminVideoApi(video._id);

      setSuccessMessage(`Re-index completed for ${video.title || video.videoId}`);

      if (selectedUser?._id) {
        const data = await getAdminUserVideosApi(selectedUser._id);
        setUserVideos(data.videos);
      }

      await fetchDashboard();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          'Failed to re-index video'
      );
    } finally {
      setReindexingVideoId(null);
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
    setSelectedVideo({
      ...data.video,
      faissIndexStatus: data.faissIndexStatus,
    });
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
      <Card
        sx={{
          ...panelSx,
          background:
            'linear-gradient(135deg, rgba(124,58,237,0.22), rgba(6,182,212,0.1), rgba(15,23,42,0.92))',
        }}
      >
        <CardContent sx={{ p: { xs: 3, md: 4 } }}>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            justifyContent="space-between"
            spacing={3}
          >
            <Box>
              <Typography variant="overline" sx={{ color: '#93c5fd' }}>
                AI Operations Center
              </Typography>

              <Typography variant="h3" fontWeight={950}>
                Admin Dashboard
              </Typography>

              <Typography sx={{ color: '#cbd5e1', maxWidth: 820, mt: 1 }}>
                Monitor users, videos, chunks, summaries, embeddings, FAISS indexing,
                eval quality, and system health from one control panel.
              </Typography>
            </Box>

            <Stack direction="row" spacing={1} alignItems="flex-start">
              <Chip
                label={health?.status || 'System'}
                color={health?.status === 'ok' ? 'success' : 'warning'}
              />

              <Button
                startIcon={<RefreshIcon />}
                variant="contained"
                onClick={fetchDashboard}
                disabled={loading}
              >
                {loading ? 'Refreshing...' : 'Refresh'}
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {error && <Alert severity="error">{error}</Alert>}
      {successMessage && <Alert severity="success">{successMessage}</Alert>}

      <Grid container spacing={2.5}>
        <Grid item xs={12} sm={6} lg={2}>
          <InfoCard
            title="Users"
            value={overview?.totalUsers || 0}
            icon={<PeopleAltOutlinedIcon />}
            accent="#38bdf8"
          />
        </Grid>

        <Grid item xs={12} sm={6} lg={2}>
          <InfoCard
            title="Videos"
            value={overview?.totalVideos || 0}
            icon={<VideoLibraryOutlinedIcon />}
            accent="#7c3aed"
          />
        </Grid>

        <Grid item xs={12} sm={6} lg={2}>
          <InfoCard
            title="Chunks"
            value={overview?.totalChunks || 0}
            icon={<StorageOutlinedIcon />}
            accent="#06b6d4"
          />
        </Grid>

        <Grid item xs={12} sm={6} lg={2}>
          <InfoCard
            title="Summaries"
            value={overview?.summaries?.completed || 0}
            subtitle="completed"
            icon={<AutoAwesomeOutlinedIcon />}
            accent="#f59e0b"
          />
        </Grid>

        <Grid item xs={12} sm={6} lg={2}>
          <InfoCard
            title="Embeddings"
            value={overview?.embeddings?.completed || 0}
            subtitle="completed"
            icon={<HubOutlinedIcon />}
            accent="#22c55e"
          />
        </Grid>

        <Grid item xs={12} sm={6} lg={2}>
          <InfoCard
            title="System"
            value={health?.status || 'N/A'}
            icon={<HealthAndSafetyOutlinedIcon />}
            accent="#ef4444"
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} lg={6}>
          <ChartCard
            title="Category Performance"
            subtitle="Average weighted score by eval category"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.18)" />
                <XAxis dataKey="category" stroke="#94a3b8" />
                <YAxis domain={[0, 1]} stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{
                    background: '#0f172a',
                    border: '1px solid rgba(148,163,184,0.24)',
                    borderRadius: 12,
                    color: '#fff',
                  }}
                />
                <Bar dataKey="avgWeightedScore" fill="#38bdf8" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid>

        <Grid item xs={12} lg={3}>
          <ChartCard title="Grades" subtitle="Eval grade distribution">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={gradeData} dataKey="value" outerRadius={105}>
                  {gradeData.map((e, i) => (
                    <Cell
                      key={e.name}
                      fill={GRADE_COLORS[i % GRADE_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: '#0f172a',
                    border: '1px solid rgba(148,163,184,0.24)',
                    borderRadius: 12,
                    color: '#fff',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid>

        <Grid item xs={12} lg={3}>
          <ChartCard title="Hallucination Risk" subtitle="Risk totals">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={riskData} dataKey="value" outerRadius={105}>
                  {riskData.map((e, i) => (
                    <Cell
                      key={e.name}
                      fill={RISK_COLORS[i % RISK_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: '#0f172a',
                    border: '1px solid rgba(148,163,184,0.24)',
                    borderRadius: 12,
                    color: '#fff',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid>
      </Grid>

      <Card sx={panelSx}>
        <CardContent>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            justifyContent="space-between"
            spacing={1}
            sx={{ mb: 2 }}
          >
            <Box>
              <Typography variant="h5" fontWeight={900}>
                Users
              </Typography>
              <Typography sx={{ color: '#94a3b8' }}>
                Inspect user libraries, video processing state, and chunk/FAISS status.
              </Typography>
            </Box>

            <Chip
              label={`${users.length} users`}
              sx={{
                color: '#fff',
                bgcolor: 'rgba(56,189,248,0.16)',
                border: '1px solid rgba(56,189,248,0.28)',
              }}
            />
          </Stack>

          <TableContainer
            sx={{
              maxHeight: 480,
              borderRadius: 4,
              border: '1px solid rgba(148,163,184,0.14)',
            }}
          >
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  {['Name', 'Email', 'Role', 'Videos', 'Chunks', 'Actions'].map((head) => (
                    <TableCell
                      key={head}
                      sx={{
                        bgcolor: '#111827',
                        color: '#e5e7eb',
                        fontWeight: 900,
                        borderColor: 'rgba(148,163,184,0.14)',
                      }}
                    >
                      {head}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>

              <TableBody>
                {users.map((user) => (
                  <TableRow
                    key={user._id}
                    hover
                    sx={{
                      '&:hover td': {
                        bgcolor: 'rgba(255,255,255,0.035)',
                      },
                    }}
                  >
                    <TableCell sx={glassTableCellSx}>
                      <Typography color="#fff" fontWeight={800}>
                        {user.name}
                      </Typography>
                    </TableCell>

                    <TableCell sx={glassTableCellSx}>{user.email}</TableCell>

                    <TableCell sx={glassTableCellSx}>
                      <Chip
                        size="small"
                        label={user.role}
                        color={user.role === 'admin' ? 'secondary' : 'default'}
                      />
                    </TableCell>

                    <TableCell sx={glassTableCellSx}>{user.videoCount}</TableCell>
                    <TableCell sx={glassTableCellSx}>{user.chunkCount}</TableCell>

                    <TableCell sx={glassTableCellSx}>
                      <Button variant="outlined" onClick={() => openUserVideos(user)}>
                        View Videos
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {users.length === 0 && (
            <Box sx={{ py: 5, textAlign: 'center' }}>
              <Typography color="#fff" fontWeight={900}>
                No users found
              </Typography>
              <Typography sx={{ color: '#94a3b8' }}>
                Users will appear here after registration.
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={Boolean(selectedUser)}
        maxWidth="lg"
        fullWidth
        onClose={() => setSelectedUser(null)}
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
                {selectedUser?.name} Videos
              </Typography>
              <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                Processing, embedding, and re-index controls
              </Typography>
            </Box>

            <IconButton onClick={() => setSelectedUser(null)} sx={{ color: '#fff' }}>
              <CloseIcon />
            </IconButton>
          </Stack>
        </DialogTitle>

        <DialogContent>
          <TableContainer
            sx={{
              maxHeight: 560,
              borderRadius: 4,
              border: '1px solid rgba(148,163,184,0.14)',
            }}
          >
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  {['Title', 'Transcript', 'Summary', 'Chunks', 'Embeddings', 'Actions'].map(
                    (head) => (
                      <TableCell
                        key={head}
                        sx={{
                          bgcolor: '#111827',
                          color: '#e5e7eb',
                          fontWeight: 900,
                          borderColor: 'rgba(148,163,184,0.14)',
                        }}
                      >
                        {head}
                      </TableCell>
                    )
                  )}
                </TableRow>
              </TableHead>

              <TableBody>
                {userVideos.map((video) => (
                  <TableRow key={video._id}>
                    <TableCell sx={{ ...glassTableCellSx, minWidth: 260 }}>
                      <Typography
                        color="#fff"
                        fontWeight={800}
                        sx={{
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {video.title || video.videoId}
                      </Typography>
                    </TableCell>

                    <TableCell sx={glassTableCellSx}>
                      <Chip
                        size="small"
                        label={video.transcriptStatus}
                        color={statusColor(video.transcriptStatus)}
                      />
                    </TableCell>

                    <TableCell sx={glassTableCellSx}>
                      <Chip
                        size="small"
                        label={video.summaryStatus}
                        color={statusColor(video.summaryStatus)}
                      />
                    </TableCell>

                    <TableCell sx={glassTableCellSx}>{video.chunkCount}</TableCell>

                    <TableCell sx={glassTableCellSx}>
                      {video.embeddingCompleted}/{video.chunkCount}
                    </TableCell>

                    <TableCell sx={glassTableCellSx}>
                      <Stack direction="row" spacing={1}>
                        <Button variant="outlined" onClick={() => openChunks(video)}>
                          Chunks
                        </Button>

                        <Button
                          variant="contained"
                          color="warning"
                          disabled={reindexingVideoId === video._id || video.chunkCount === 0}
                          onClick={() => handleReindexVideo(video)}
                        >
                          {reindexingVideoId === video._id ? 'Re-indexing...' : 'Re-index'}
                        </Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {userVideos.length === 0 && (
            <Box sx={{ py: 5, textAlign: 'center' }}>
              <Typography fontWeight={900}>No videos found</Typography>
              <Typography sx={{ color: '#94a3b8' }}>
                This user has not processed any videos yet.
              </Typography>
            </Box>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(selectedVideo)}
        maxWidth="xl"
        fullWidth
        onClose={() => setSelectedVideo(null)}
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
                Chunk Explorer
              </Typography>
              <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                Inspect embedding status and FAISS index health
              </Typography>
            </Box>

            <IconButton onClick={() => setSelectedVideo(null)} sx={{ color: '#fff' }}>
              <CloseIcon />
            </IconButton>
          </Stack>
        </DialogTitle>

        <DialogContent>
          <Stack direction="row" spacing={1} sx={{ mb: 2 }} flexWrap="wrap">
            <Chip
              label={
                selectedVideo?.faissIndexStatus?.indexed
                  ? 'FAISS Indexed'
                  : 'FAISS Missing'
              }
              color={selectedVideo?.faissIndexStatus?.indexed ? 'success' : 'error'}
            />

            <Chip
              label={`FAISS chunks: ${selectedVideo?.faissIndexStatus?.chunkCount || 0}`}
            />

            <Chip label={`Mongo chunks: ${videoChunks.length}`} />
          </Stack>

          <TableContainer
            sx={{
              maxHeight: 620,
              borderRadius: 4,
              border: '1px solid rgba(148,163,184,0.14)',
            }}
          >
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  {['#', 'Chunk Text', 'Embedding Status'].map((head) => (
                    <TableCell
                      key={head}
                      sx={{
                        bgcolor: '#111827',
                        color: '#e5e7eb',
                        fontWeight: 900,
                        borderColor: 'rgba(148,163,184,0.14)',
                      }}
                    >
                      {head}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>

              <TableBody>
                {videoChunks.map((chunk) => (
                  <TableRow key={chunk._id}>
                    <TableCell sx={glassTableCellSx}>
                      <Typography color="#fff" fontWeight={900}>
                        {chunk.chunkIndex}
                      </Typography>
                    </TableCell>

                    <TableCell sx={{ ...glassTableCellSx, minWidth: 720 }}>
                      <Typography
                        variant="body2"
                        sx={{
                          color: '#cbd5e1',
                          lineHeight: 1.7,
                        }}
                      >
                        {chunk.text}
                      </Typography>
                    </TableCell>

                    <TableCell sx={glassTableCellSx}>
                      <Chip
                        size="small"
                        label={chunk.embeddingStatus}
                        color={statusColor(chunk.embeddingStatus)}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
      </Dialog>
    </Stack>
  );
};

export default AdminHomePage;