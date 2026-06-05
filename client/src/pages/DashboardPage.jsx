import {
  Alert,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  CardMedia,
  Chip,
  Divider,
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
  indexVideoApi,
  getVideoIndexStatusApi,
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

const DashboardPage = ({ view = 'dashboard' }) => {
  const [url, setUrl] = useState('');
  const [videos, setVideos] = useState([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [indexStatuses, setIndexStatuses] = useState({});
  const [reindexingId, setReindexingId] = useState(null);

  const totalVideos = videos.length;

  const recentVideo = useMemo(() => videos?.[0], [videos]);
  const isDashboardView = view === 'dashboard';
  const visibleVideos = isDashboardView ? videos.slice(0, 2) : videos;

  const loadIndexStatuses = async (videoList) => {
    const entries = await Promise.all(
      videoList.map(async (video) => {
        try {
          const response = await getVideoIndexStatusApi(video._id);

          return [
            video._id,
            response.data.indexStatus,
          ];
        } catch (_error) {
          return [
            video._id,
            {
              indexed: false,
              indexFileExists: false,
              metadataFileExists: false,
              chunkCount: 0,
            },
          ];
        }
      })
    );

    setIndexStatuses(Object.fromEntries(entries));
  };

  const loadVideos = async () => {
    const response = await getVideosApi();
    const videoList = response.data.videos || [];

    setVideos(response.data.videos || []);
    await loadIndexStatuses(videoList);
  };

  const reindexVideo = async (videoId) => {
    setReindexingId(videoId);
    setError('');
    setMessage('');

    try {
      await indexVideoApi(videoId);
      setMessage('Video re-indexed successfully');
      await loadVideos();
    } catch (apiError) {
      setError(apiError.response?.data?.message || 'Failed to re-index video');
    } finally {
      setReindexingId(null);
    }
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
    <Stack spacing={2.5} sx={{ width: '100%', }}>
      <Box>
        <Typography variant="overline" color="text.secondary">
          AI Video Workspace
        </Typography>

        <Typography variant="h3" sx={{ fontSize: { xs: '3rem', md: '3.75rem' }, lineHeight: 1, }}>
          {isDashboardView ? 'Dashboard' : 'My Videos'}
        </Typography>

        <Typography color="text.secondary" sx={{ mt: 1, maxWidth: 760 }}>
          {isDashboardView
            ? 'Process new videos, monitor your workspace, and continue from your recent AI-ready videos.'
            : 'Browse all processed videos in your private AI video library.'}
        </Typography>
      </Box>

      {isDashboardView && (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              lg: '2fr 1fr',
            },
            gap: 3,
            width: '100%',
          }}
        >
          <Box>
            <Card
              sx={{
                height: '100%',
                overflow: 'hidden',
              background:
                'linear-gradient(135deg, rgba(99,91,255,0.12), rgba(0,194,255,0.08), #ffffff)',
            }}
          >
            <CardContent sx={{ p: { xs: 3, md: 3.2 } }}>
              <Stack spacing={2.4}>
                <Stack
                  direction="row"
                  spacing={2}
                  alignItems="flex-start"
                >
                  <Box
                    sx={{
                      width: 52,
                      height: 52,
                      borderRadius: 4,
                      display: 'grid',
                      placeItems: 'center',
                      color: '#fff',
                      flexShrink: 0,
                      background:
                        'linear-gradient(135deg, #635bff 0%, #00c2ff 100%)',
                      boxShadow: '0 14px 30px rgba(99,91,255,0.28)',
                    }}
                  >
                    <AddCircleOutlineIcon />
                  </Box>

                  <Box sx={{ minWidth: 0 }}>
                    <Typography
                      variant="h5"
                      sx={{
                        lineHeight: 1.15,
                        fontSize: { md: 30 },
                      }}
                    >
                      Process a new YouTube video
                    </Typography>

                    <Typography
                      color="text.secondary"
                      sx={{
                        mt: 0.5,
                        lineHeight: 1.45,
                        maxWidth: 640,
                      }}
                    >
                      Paste a URL to create transcript chunks, summary, embeddings, and FAISS index.
                    </Typography>
                  </Box>
                </Stack>

                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
                  <TextField
                    fullWidth
                    label="YouTube URL"
                    placeholder="https://www.youtube.com/watch?v=..."
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    disabled={loading}
                  />

                  <LoadingButton loading={loading} onClick={processVideo} sx={{ width: { xs: '100%', md: 'auto' }, minWidth: { md: 160 }, height: 56, whiteSpace: 'nowrap', px: 3 }}>
                    {loading ? 'Processing...' : 'Process Video'}
                  </LoadingButton>
                </Stack>

                {(message || error) && (
                  <Stack spacing={1}>
                    {message && <Alert severity="success">{message}</Alert>}
                    {error && <Alert severity="error">{error}</Alert>}
                  </Stack>
                )}

                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                  <Chip size="small" label="Transcript extraction" />
                  <Chip size='small' label="Chunking" />
                  <Chip size="small" label="Summary" />
                  <Chip size="small" label="Embeddings" />
                  <Chip size="small" label="FAISS indexing" />
                  <Chip size="small" label="RAG chat" color="primary" />
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Box>

        <Box>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: { xs: 3, md: 4 } }}>
              <Stack spacing={3}>
                <Stack direction="row" spacing={2} alignItems="center" justifyContent="flex-start">
                  <Box
                    sx={{
                      width: 64,
                      height: 64,
                      borderRadius: 4,
                      display: 'grid',
                      placeItems: 'center',
                      color: '#fff',
                      flexShrink: 0,
                      background: 'linear-gradient(135deg, #635bff 0%, #00c2ff 100%)',
                      boxShadow: '0 16px 35px rgba(99,91,255,0.28)',
                    }}
                  >
                    <AddCircleOutlineIcon />
                  </Box>

                  <Box>
                    <Typography sx={{ fontSize: { xs: '2.5rem', md: '3rem' }, fontWeight: 900 }}>{totalVideos}</Typography>
                    <Typography color="text.secondary">
                      Saved videos
                    </Typography>
                  </Box>
                </Stack>

                <Divider />

                <Stack spacing={1.2}>
                  <Typography fontWeight={900}>
                    Workspace overview
                  </Typography>

                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ lineHeight: 1.7 }}
                  >
                    Your private video library is ready for transcript summaries,
                    embeddings, and RAG chat.
                  </Typography>
                </Stack>

                <Divider />

                <Stack spacing={1.5}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography color="text.secondary">status</Typography>
                    <Chip
                      size="small"
                      color={totalVideos > 0 ? 'success' : 'default'}
                      label={totalVideos > 0 ? 'Active' : 'Empty'}
                    />
                  </Stack>

                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography color="text.secondary">Mode</Typography>
                    <Chip size="small" label="Private library" />
                  </Stack>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Box>
      </Box>)}

      <Stack spacing={1}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          spacing={1}
        >
          {isDashboardView ? (
            <Box>
              <Typography variant="h4">
                Recent Videos
              </Typography>

              <Typography color="text.secondary">
                Your latest processed videos. Open any video to continue chatting.
              </Typography>
            </Box>
          ) : (
            <Box />
          )}

          {isDashboardView && videos.length > 2 && (
            <Button component={RouterLink} to="/my-videos" variant="outlined">
              View All Videos
            </Button>
          )}
        </Stack>

        {visibleVideos.length === 0 ? (
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
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, 1fr)',
                lg: 'repeat(3, 1fr)',
              },
              gap: 2.5,
              width: '100%',
            }}
          >
            {visibleVideos.map((video) => {
              const thumbnailUrl = getVideoThumb(video);
              const indexStatus = indexStatuses[video._id];
              const isIndexed = Boolean(indexStatus?.indexed);
              
              return (
                <Box key={video._id}>
                  <Card
                    sx={{
                      width: '100%',
                      maxWidth: {
                        xs: 420,
                        md: '100%', 
                      },
                      mx: 'auto',
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
                            minHeight: { xs: 48, md: 56 },
                            fontSize: { xs: '1.3rem', md: '1.25rem' }
                          }}
                        >
                          {video.title || video.videoId}
                        </Typography>

                        <Typography variant="body2" color="text.secondary">
                          Added {formatDate(video.createdAt)}
                        </Typography>

                        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                          <Chip size="small" label="Transcript" />
                          <Chip size="small" label="Summary" />
                          <Chip size="small" label={isIndexed ? 'Indexed' : 'Index missing'} color={isIndexed ? 'success' : 'warning'} />
                        </Stack>
                      </Stack>
                    </CardContent>

                    <CardActions sx={{ p: 2, pt: 0 }}>
                      <Stack spacing={1.2} sx={{ width: '100%' }}>
                        <Button
                          fullWidth
                          variant="contained"
                          size="medium"
                          startIcon={<ChatBubbleOutlineOutlinedIcon />}
                          component={RouterLink}
                          to={`/videos/${video._id}`}
                          sx={{
                            height: 46,
                            borderRadius: 999,
                            fontWeight: 800,
                          }}
                        >
                          Open Chat
                        </Button>

                        <Stack direction="row" spacing={1.2} sx={{ width: '100%' }}>
                          <Button
                            fullWidth
                            variant="outlined"
                            size="medium"
                            disabled={isIndexed || reindexingId === video._id}
                            onClick={() => reindexVideo(video._id)}
                            sx={{
                              height: 44,
                              borderRadius: 999,
                              fontWeight: 800,
                            }}
                          >
                            {reindexingId === video._id ? 'Indexing...' : 'Re-index'}
                          </Button>

                          <Button
                            variant="outlined"
                            color="error"
                            onClick={() => deleteVideo(video._id)}
                            disabled={deletingId === video._id}
                            sx={{
                              minWidth: 48,
                              width: 48,
                              height: 44,
                              borderRadius: 999,
                              p: 0,
                              bgcolor: 'rgba(220,38,38,0.04)',
                              borderColor: 'rgba(220,38,38,0.28)',
                            }}
                          >
                            <DeleteOutlineOutlinedIcon />
                          </Button>
                        </Stack>
                      </Stack>
                    </CardActions>
                  </Card>
                </Box>
              );
            })}
          </Box>
        )}
      </Stack>
    </Stack>
  );
};

export default DashboardPage;