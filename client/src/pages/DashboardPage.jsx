import {
  Alert,
  Box,
  Card,
  CardActions,
  CardContent,
  Container,
  Grid,
  Stack,
  TextField,
  Typography,
  Button,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import LoadingButton from '../components/LoadingButton';
import { createChunksApi, getVideosApi, indexVideoApi, processVideoApi } from '../api/videoApi';

const DashboardPage = () => {
  const [url, setUrl] = useState('');
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(false);
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
    setLoading(true);
    setError('');
    setMessage('');
    try {
      await processVideoApi(url);
      setUrl('');
      setMessage('Video processed successfully');
      await loadVideos();
    } catch (apiError) {
      setError(apiError.response?.data?.message || 'Failed to process video');
    } finally {
      setLoading(false);
    }
  };

  const createChunks = async (videoId) => {
    try {
      await createChunksApi(videoId);
      setMessage('Chunks created successfully');
    } catch (apiError) {
      setError(apiError.response?.data?.message || 'Failed to create chunks');
    }
  };

  const indexVideo = async (videoId) => {
    try {
      await indexVideoApi(videoId);
      setMessage('Video indexed successfully');
    } catch (apiError) {
      setError(apiError.response?.data?.message || 'Failed to index video');
    }
  };

  return (
    <Container sx={{ py: 4 }}>
      <Stack spacing={3}>
        <Typography variant="h4">Dashboard</Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField fullWidth label="YouTube URL" value={url} onChange={(e) => setUrl(e.target.value)} />
          <LoadingButton loading={loading} onClick={processVideo}>Process Video</LoadingButton>
        </Stack>
        {message && <Alert severity="success">{message}</Alert>}
        {error && <Alert severity="error">{error}</Alert>}

        <Grid container spacing={2}>
          {videos.map((video) => (
            <Grid item xs={12} md={6} lg={4} key={video._id}>
              <Card>
                <CardContent>
                  <Typography variant="h6" noWrap>{video.title || video.videoId}</Typography>
                  <Typography variant="body2" color="text.secondary" noWrap>{video.url}</Typography>
                </CardContent>
                <CardActions sx={{ flexWrap: 'wrap', gap: 1 }}>
                  <Button size="small" onClick={() => createChunks(video._id)}>Create Chunks</Button>
                  <Button size="small" onClick={() => indexVideo(video._id)}>Index</Button>
                  <Button size="small" component={RouterLink} to={`/videos/${video._id}`}>Open Chat</Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Stack>
    </Container>
  );
};

export default DashboardPage;
