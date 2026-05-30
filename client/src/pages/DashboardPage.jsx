import {
  Alert,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  CardMedia,
  Chip,
  Grid,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined';
import ChatBubbleOutlineOutlinedIcon from '@mui/icons-material/ChatBubbleOutlineOutlined';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import VideoLibraryOutlinedIcon from '@mui/icons-material/VideoLibraryOutlined';
import { useEffect, useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';

import LoadingButton from '../components/LoadingButton';
import PageLoader from '../components/PageLoader';
import {
  createChunksApi,
  deleteVideoApi,
  getVideosApi,
  processVideoApi,
} from '../api/videoApi';

const getVideoThumb = (video) =>
  video?.videoId
    ? `https://img.youtube.com/vi/${video.videoId}/hqdefault.jpg`
    : '';

const formatDate = (value) => {
  if (!value) return 'Recently added';

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value));
};

const DashboardPage = () => {
  const [url, setUrl] = useState('');
  const [videos, setVideos] = useState([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const totalVideos = videos.length;

  const recentVideo = useMemo(() => videos?.[0], [videos]);

  const loadVideos = async () => {
    const response = await getVideosApi();
    setVideos(response.data.videos || []);
  };

  useEffect(() => {
    const initDashboard = async () => {
      try {
        await loadVideos();
      } catch (_error) {
        setError('Failed to load videos');
      } finally {
        setPageLoading(false);
      }
    };

    initDashboard();
  }, []);

  const processVideo = async () => {
    if (!url.trim()) {
      setError('Please enter a YouTube URL');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('Processing video...');

    try {
      const processResponse = await processVideoApi(url);
      const video = processResponse.data.video;

      setMessage('Creating chunks...');
      await createChunksApi(video._id);

      setUrl('');
      setMessage('Video is processing in the background. Open chat to see readiness status.');
      await loadVideos();
    } catch (apiError) {
      setError(apiError.response?.data?.message || 'Failed to process video');
      setMessage('');
    } finally {
      setLoading(false);
    }
  };

  const deleteVideo = async (videoId) => {
    const confirmed = window.confirm(
      'Are you sure you want to delete this video, its chunks, and chat history?'
    );

    if (!confirmed) return;

    setDeletingId(videoId);
    setError('');
    setMessage('');

    try {
      await deleteVideoApi(videoId);
      setMessage('Video deleted successfully');
      await loadVideos();
    } catch (apiError) {
      setError(apiError.response?.data?.message || 'Failed to delete video');
    } finally {
      setDeletingId(null);
    }
  };

  if (pageLoading) {
    return <PageLoader text="Loading your video workspace..." />;
  }

  return (
    <Stack spacing={4}>
      <Box>
        <Typography variant="overline" color="text.secondary">
          AI Video Workspace
        </Typography>

        <Typography variant="h3">
          My Videos
        </Typography>

        <Typography color="text.secondary" sx={{ mt: 1, maxWidth: 720 }}>
          Paste a YouTube URL, process the transcript, generate chunks, build embeddings,
          and chat with your video using grounded RAG answers.
        </Typography>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} lg={8}>
          <Card
            sx={{
              height: '100%',
              overflow: 'hidden',
              background:
                'linear-gradient(135deg, rgba(99,91,255,0.12), rgba(0,194,255,0.08), #ffffff)',
            }}
          >
            <CardContent sx={{ p: { xs: 3, md: 4 } }}>
              <Stack spacing={3}>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Box
                    sx={{
                      width: 58,
                      height: 58,
                      borderRadius: 4,
                      display: 'grid',
                      placeItems: 'center',
                      color: '#fff',
                      background:
                        'linear-gradient(135deg, #635bff 0%, #00c2ff 100%)',
                      boxShadow: '0 16px 35px rgba(99,91,255,0.28)',
                    }}
                  >
                    <AddCircleOutlineIcon fontSize="large" />
                  </Box>

                  <Box>
                    <Typography variant="h5">
                      Process a new YouTube video
                    </Typography>

                    <Typography color="text.secondary">
                      Start the full pipeline: transcript, chunks, summary, embeddings, FAISS.
                    </Typography>
                  </Box>
                </Stack>

                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                  <TextField
                    fullWidth
                    label="YouTube URL"
                    placeholder="https://www.youtube.com/watch?v=..."
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    disabled={loading}
                  />

                  <LoadingButton loading={loading} onClick={processVideo}>
                    {loading ? 'Processing...' : 'Process Video'}
                  </LoadingButton>
                </Stack>

                {(message || error) && (
                  <Stack spacing={1}>
                    {message && <Alert severity="success">{message}</Alert>}
                    {error && <Alert severity="error">{error}</Alert>}
                  </Stack>
                )}

                <Stack direction="row" spacing={1} flexWrap="wrap">
                  <Chip label="Transcript extraction" />
                  <Chip label="Chunking" />
                  <Chip label="Summary" />
                  <Chip label="Embeddings" />
                  <Chip label="FAISS indexing" />
                  <Chip label="RAG chat" color="primary" />
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} lg={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: { xs: 3, md: 4 } }}>
              <Stack spacing={3}>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Box
                    sx={{
                      width: 52,
                      height: 52,
                      borderRadius: 4,
                      display: 'grid',
                      placeItems: 'center',
                      bgcolor: 'rgba(99,91,255,0.1)',
                      color: 'primary.main',
                    }}
                  >
                    <VideoLibraryOutlinedIcon />
                  </Box>

                  <Box>
                    <Typography variant="h5">{totalVideos}</Typography>
                    <Typography color="text.secondary">
                      Saved videos
                    </Typography>
                  </Box>
                </Stack>

                <Box
                  sx={{
                    p: 2,
                    borderRadius: 4,
                    bgcolor: '#f8fafc',
                    border: '1px solid rgba(148,163,184,0.22)',
                  }}
                >
                  <Typography fontWeight={800}>
                    {recentVideo?.title || 'No videos yet'}
                  </Typography>

                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    {recentVideo
                      ? `Latest added: ${formatDate(recentVideo.createdAt)}`
                      : 'Process your first video to start building your AI library.'}
                  </Typography>
                </Box>

                <Stack spacing={1}>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography color="text.secondary">Workspace status</Typography>
                    <Chip
                      size="small"
                      color={totalVideos > 0 ? 'success' : 'default'}
                      label={totalVideos > 0 ? 'Active' : 'Empty'}
                    />
                  </Stack>

                  <Stack direction="row" justifyContent="space-between">
                    <Typography color="text.secondary">Mode</Typography>
                    <Chip size="small" label="Private library" />
                  </Stack>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Stack spacing={2}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          justifyContent="space-between"
          spacing={1}
        >
          <Box>
            <Typography variant="h4">
              Video Library
            </Typography>

            <Typography color="text.secondary">
              Open any indexed video and ask questions from its transcript context.
            </Typography>
          </Box>
        </Stack>

        {videos.length === 0 ? (
          <Card>
            <CardContent sx={{ p: { xs: 4, md: 6 } }}>
              <Stack spacing={2} alignItems="center" textAlign="center">
                <Box
                  sx={{
                    width: 82,
                    height: 82,
                    borderRadius: 6,
                    display: 'grid',
                    placeItems: 'center',
                    color: 'primary.main',
                    bgcolor: 'rgba(99,91,255,0.1)',
                  }}
                >
                  <PlayCircleOutlineIcon sx={{ fontSize: 42 }} />
                </Box>

                <Typography variant="h5">
                  Your AI video library is empty
                </Typography>

                <Typography color="text.secondary" sx={{ maxWidth: 560 }}>
                  Paste a YouTube URL above. Once processed, it will appear here with
                  transcript, summary, embeddings, and chat access.
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        ) : (
          <Grid container spacing={3}>
            {videos.map((video) => {
              const thumbnailUrl = getVideoThumb(video);

              return (
                <Grid item xs={12} md={6} xl={4} key={video._id}>
                  <Card
                    sx={{
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      overflow: 'hidden',
                      transition: 'transform 160ms ease, box-shadow 160ms ease',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: '0 22px 55px rgba(15,23,42,0.14)',
                      },
                    }}
                  >
                    <Box sx={{ position: 'relative' }}>
                      <CardMedia
                        component="img"
                        height="190"
                        image={thumbnailUrl}
                        alt={video.title || video.videoId}
                        sx={{
                          width: '100%',
                          aspectRatio: '16/9',
                          objectFit: 'cover',
                          bgcolor: 'grey.100',
                        }}
                      />

                      <Chip
                        size="small"
                        icon={<AutoAwesomeOutlinedIcon />}
                        label="AI Ready"
                        color="primary"
                        sx={{
                          position: 'absolute',
                          top: 14,
                          left: 14,
                          bgcolor: 'rgba(99,91,255,0.92)',
                          color: '#fff',
                          backdropFilter: 'blur(12px)',
                          '& .MuiChip-icon': {
                            color: '#fff',
                          },
                        }}
                      />
                    </Box>

                    <CardContent sx={{ flexGrow: 1 }}>
                      <Stack spacing={1.5}>
                        <Typography
                          variant="h6"
                          sx={{
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            minHeight: 56,
                          }}
                        >
                          {video.title || video.videoId}
                        </Typography>

                        <Typography variant="body2" color="text.secondary">
                          Added {formatDate(video.createdAt)}
                        </Typography>

                        <Stack direction="row" spacing={1} flexWrap="wrap">
                          <Chip size="small" label="Transcript" />
                          <Chip size="small" label="Summary" />
                          <Chip size="small" label="Indexed" color="success" />
                        </Stack>
                      </Stack>
                    </CardContent>

                    <CardActions sx={{ p: 2, pt: 0 }}>
                      <Stack direction="row" spacing={1.5} width="100%">
                        <Button
                          fullWidth
                          variant="contained"
                          size="small"
                          startIcon={<ChatBubbleOutlineOutlinedIcon />}
                          component={RouterLink}
                          to={`/videos/${video._id}`}
                        >
                          Open Chat
                        </Button>

                        <LoadingButton
                          loading={deletingId === video._id}
                          onClick={() => deleteVideo(video._id)}
                          startIcon={<DeleteOutlineOutlinedIcon />}
                        >
                          {deletingId === video._id ? 'Deleting...' : 'Delete'}
                        </LoadingButton>
                      </Stack>
                    </CardActions>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        )}
      </Stack>
    </Stack>
  );
};

export default DashboardPage;