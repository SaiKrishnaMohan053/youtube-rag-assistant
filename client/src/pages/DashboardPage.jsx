import {
  Alert,
  Button,
  Card,
  CardActions,
  CardContent,
  CardMedia,
  Container,
  Grid,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import LoadingButton from '../components/LoadingButton';
import {
  createChunksApi,
  deleteVideoApi,
  getVideosApi,
  indexVideoApi,
  processVideoApi,
} from '../api/videoApi';

const DashboardPage = () => {
  const [url, setUrl] = useState('');
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadVideos = async () => {
    const response = await getVideosApi();
    setVideos(response.data.videos || []);
  };

  useEffect(() => {
    loadVideos().catch(() => setError('Failed to load videos'));
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

      setMessage('Indexing video...');
      await indexVideoApi(video._id);

      setUrl('');
      setMessage('Video is ready. You can open chat now.');
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

  return (
    <Container sx={{ py: 4 }}>
      <Stack spacing={3}>
        <Typography variant="h4">Dashboard</Typography>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            fullWidth
            label="YouTube URL"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={loading}
          />

          <LoadingButton loading={loading} onClick={processVideo}>
            Process Video
          </LoadingButton>
        </Stack>

        {message && <Alert severity="success">{message}</Alert>}
        {error && <Alert severity="error">{error}</Alert>}

        <Grid container spacing={2}>
          {videos.map((video) => {
            const thumbnailUrl = `https://img.youtube.com/vi/${video.videoId}/hqdefault.jpg`;

            return (
              <Grid item xs={12} md={6} lg={4} key={video._id}>
                <Card
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <CardMedia
                    component="img"
                    height="180"
                    image={thumbnailUrl}
                    alt={video.title || video.videoId}
                    sx={{
                      width: '100%',
                      aspectRatio: '16/9',
                      objectFit: 'cover',
                      bgcolor: 'grey.100',
                    }}
                  />

                  <CardContent sx={{ flexGrow: 1 }}>
                    <Typography variant="h6" noWrap>
                      {video.title || video.videoId}
                    </Typography>

                    <Typography variant="body2" color="text.secondary" noWrap>
                      {video.url}
                    </Typography>
                  </CardContent>

                  <CardActions sx={{ p: 2 }}>
                    <Stack direction="row" spacing={2} width="100%">
                      <Button
                        fullWidth
                        variant="outlined"
                        size="small"
                        component={RouterLink}
                        to={`/videos/${video._id}`}
                      >
                        Open Chat
                      </Button>

                      <LoadingButton
                        fullWidth
                        loading={deletingId === video._id}
                        onClick={() => deleteVideo(video._id)}
                      >
                        Delete Video
                      </LoadingButton>
                    </Stack>
                  </CardActions>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      </Stack>
    </Container>
  );
};

export default DashboardPage;