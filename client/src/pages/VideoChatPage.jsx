import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  LinearProgress,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ArrowBackOutlinedIcon from '@mui/icons-material/ArrowBackOutlined';
import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined';
import ChatBubbleOutlineOutlinedIcon from '@mui/icons-material/ChatBubbleOutlineOutlined';
import CheckCircleOutlineOutlinedIcon from '@mui/icons-material/CheckCircleOutlineOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import HubOutlinedIcon from '@mui/icons-material/HubOutlined';
import SmartToyOutlinedIcon from '@mui/icons-material/SmartToyOutlined';
import SourceOutlinedIcon from '@mui/icons-material/SourceOutlined';
import VideoLibraryOutlinedIcon from '@mui/icons-material/VideoLibraryOutlined';
import { useEffect, useMemo, useState } from 'react';
import { Link as RouterLink, useParams } from 'react-router-dom';

import LoadingButton from '../components/LoadingButton';
import PageLoader from '../components/PageLoader';
import MarkdownAnswer from '../components/MarkdownAnswer';
import {
  askVideoApi,
  getChatsApi,
  getVideoApi,
  getVideoStatusApi,
} from '../api/videoApi';

const pipelineSteps = [
  'Transcript',
  'Chunks',
  'Summary',
  'Embeddings',
  'FAISS Index',
];

const getVideoThumb = (video) =>
  video?.videoId
    ? `https://img.youtube.com/vi/${video.videoId}/hqdefault.jpg`
    : '';

const VideoChatPage = () => {
  const { id } = useParams();

  const [video, setVideo] = useState(null);
  const [chats, setChats] = useState([]);
  const [query, setQuery] = useState('');
  const [pageLoading, setPageLoading] = useState(true);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const latestChunks = useMemo(() => {
    const lastChat = chats?.[chats.length - 1];
    return lastChat?.supportingChunks || [];
  }, [chats]);

  const readyCount = status?.ready ? pipelineSteps.length : Math.max(1, pipelineSteps.length - 2);
  const progressValue = Math.round((readyCount / pipelineSteps.length) * 100);

  const loadData = async () => {
    const [videoResponse, chatResponse, statusResponse] = await Promise.all([
      getVideoApi(id),
      getChatsApi(id),
      getVideoStatusApi(id),
    ]);

    setVideo(videoResponse.data.video);
    setChats(chatResponse.data.chats || []);
    setStatus(statusResponse.data);
  };

  const refreshStatus = async () => {
    try {
      const statusResponse = await getVideoStatusApi(id);
      setStatus(statusResponse.data);
    } catch (_error) {
      setError('Failed to refresh processing status');
    }
  };

  useEffect(() => {
    const initChat = async () => {
      try {
        await loadData();
      } catch (_error) {
        setError('Failed to load video or chats');
      } finally {
        setPageLoading(false);
      }
    };

    initChat();
  }, [id]);

  useEffect(() => {
    if (!status || status.ready) return undefined;

    const intervalId = setInterval(() => {
      refreshStatus();
    }, 5000);

    return () => clearInterval(intervalId);
  }, [id, status?.ready]);

  const askQuestion = async () => {
    if (!query.trim()) return;

    if (!status?.ready) {
      setError(status?.message || 'Video is still processing. Please wait.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const currentQuery = query.trim();

      const response = await askVideoApi(id, currentQuery, 2);

      setChats((prev) => [
        ...prev,
        {
          _id: response.data.chatMessageId,
          question: currentQuery,
          answer: response.data.answer,
          supportingChunks: response.data.supportingChunks,
        },
      ]);

      setQuery('');
    } catch (apiError) {
      setError(apiError.response?.data?.message || 'Failed to ask question');
    } finally {
      setLoading(false);
    }
  };

  if (pageLoading) {
    return <PageLoader text="Loading AI video workspace..." />;
  }

  return (
    <Stack spacing={3}>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        justifyContent="space-between"
        spacing={2}
      >
        <Stack spacing={1}>
          <Button
            component={RouterLink}
            to="/dashboard"
            startIcon={<ArrowBackOutlinedIcon />}
            sx={{ alignSelf: 'flex-start' }}
          >
            Back to videos
          </Button>

          <Box>
            <Typography variant="overline" color="text.secondary">
              AI Command Center
            </Typography>

            <Typography
              variant="h3"
              sx={{
                maxWidth: 900,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {video?.title || 'Video Chat'}
            </Typography>
          </Box>
        </Stack>

        <Stack direction="row" spacing={1} alignItems="flex-start">
          <Chip
            color={status?.ready ? 'success' : 'warning'}
            label={status?.ready ? 'Ready to chat' : 'Processing'}
          />
          <Chip label="RAG enabled" color="primary" />
        </Stack>
      </Stack>

      {error && <Alert severity="error">{error}</Alert>}

      {status && !status.ready && (
        <Alert severity="info">
          {status.message} This page will update automatically.
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} lg={3.2}>
          <Stack spacing={3}>
            <Card>
              <Box
                component="img"
                src={getVideoThumb(video)}
                alt={video?.title || video?.videoId}
                sx={{
                  width: '100%',
                  aspectRatio: '16 / 9',
                  objectFit: 'cover',
                  display: 'block',
                  bgcolor: '#e5e7eb',
                }}
              />

              <CardContent>
                <Stack spacing={2}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <VideoLibraryOutlinedIcon color="primary" />
                    <Typography variant="h6">
                      Video Context
                    </Typography>
                  </Stack>

                  <Typography
                    color="text.secondary"
                    sx={{
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {video?.url}
                  </Typography>

                  <Divider />

                  <Stack spacing={1}>
                    <Typography fontWeight={800}>
                      Processing Pipeline
                    </Typography>

                    <LinearProgress
                      variant="determinate"
                      value={progressValue}
                      sx={{
                        height: 9,
                        borderRadius: 99,
                        bgcolor: 'rgba(99,91,255,0.12)',
                      }}
                    />

                    <Typography variant="caption" color="text.secondary">
                      {progressValue}% completed
                    </Typography>
                  </Stack>

                  <Stack spacing={1}>
                    {pipelineSteps.map((step, index) => {
                      const completed = status?.ready || index < readyCount;

                      return (
                        <Box
                          key={step}
                          sx={{
                            p: 1.3,
                            borderRadius: 3,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            bgcolor: completed ? '#f0fdf4' : '#f8fafc',
                            border: completed
                              ? '1px solid rgba(34,197,94,0.22)'
                              : '1px solid rgba(148,163,184,0.2)',
                          }}
                        >
                          <Typography fontWeight={700}>
                            {step}
                          </Typography>

                          {completed ? (
                            <CheckCircleOutlineOutlinedIcon color="success" fontSize="small" />
                          ) : (
                            <Chip size="small" label="Pending" />
                          )}
                        </Box>
                      );
                    })}
                  </Stack>
                </Stack>
              </CardContent>
            </Card>

            <Card
              sx={{
                background:
                  'linear-gradient(145deg, rgba(15,23,42,0.96), rgba(30,41,59,0.94))',
                color: '#fff',
              }}
            >
              <CardContent>
                <Stack spacing={2}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <HubOutlinedIcon sx={{ color: '#67e8f9' }} />
                    <Typography variant="h6">
                      Retrieval Mode
                    </Typography>
                  </Stack>

                  <Typography variant="body2" sx={{ color: '#cbd5e1' }}>
                    Answers are generated from retrieved transcript chunks instead of generic memory.
                  </Typography>

                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    <Chip
                      size="small"
                      label="topK: 2"
                      sx={{ color: '#fff', bgcolor: 'rgba(255,255,255,0.1)' }}
                    />
                    <Chip
                      size="small"
                      label="Grounded"
                      sx={{ color: '#fff', bgcolor: 'rgba(34,197,94,0.18)' }}
                    />
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </Grid>

        <Grid item xs={12} lg={5.4}>
          <Card
            sx={{
              minHeight: { xs: 'auto', lg: 'calc(100vh - 180px)' },
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <CardContent
              sx={{
                p: 0,
                display: 'flex',
                flexDirection: 'column',
                minHeight: { xs: 620, lg: 'calc(100vh - 180px)' },
              }}
            >
              <Box
                sx={{
                  p: 3,
                  borderBottom: '1px solid rgba(148,163,184,0.22)',
                  background:
                    'linear-gradient(135deg, rgba(99,91,255,0.08), rgba(0,194,255,0.04))',
                }}
              >
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Box
                    sx={{
                      width: 46,
                      height: 46,
                      borderRadius: 4,
                      display: 'grid',
                      placeItems: 'center',
                      color: '#fff',
                      background:
                        'linear-gradient(135deg, #635bff 0%, #00c2ff 100%)',
                    }}
                  >
                    <SmartToyOutlinedIcon />
                  </Box>

                  <Box>
                    <Typography variant="h5">
                      Ask this video
                    </Typography>
                    <Typography color="text.secondary">
                      Chat with transcript-grounded context
                    </Typography>
                  </Box>
                </Stack>
              </Box>

              <Stack
                spacing={2}
                sx={{
                  p: 3,
                  flexGrow: 1,
                  overflowY: 'auto',
                  bgcolor: '#f8fafc',
                }}
              >
                {chats.length === 0 ? (
                  <Stack
                    spacing={2}
                    alignItems="center"
                    justifyContent="center"
                    textAlign="center"
                    sx={{ minHeight: 360 }}
                  >
                    <Box
                      sx={{
                        width: 76,
                        height: 76,
                        borderRadius: 6,
                        display: 'grid',
                        placeItems: 'center',
                        color: 'primary.main',
                        bgcolor: 'rgba(99,91,255,0.1)',
                      }}
                    >
                      <ChatBubbleOutlineOutlinedIcon sx={{ fontSize: 38 }} />
                    </Box>

                    <Typography variant="h5">
                      Start asking questions
                    </Typography>

                    <Typography color="text.secondary" sx={{ maxWidth: 420 }}>
                      Once the video is ready, ask for explanations, summaries,
                      key ideas, action items, or specific details.
                    </Typography>
                  </Stack>
                ) : (
                  chats.map((chat) => (
                    <Stack key={chat._id} spacing={1.5}>
                      <Box
                        sx={{
                          alignSelf: 'flex-end',
                          maxWidth: '88%',
                          p: 2,
                          borderRadius: '22px 22px 6px 22px',
                          bgcolor: 'primary.main',
                          color: '#fff',
                          boxShadow: '0 12px 28px rgba(99,91,255,0.25)',
                        }}
                      >
                        <Typography fontWeight={800}>
                          {chat.question}
                        </Typography>
                      </Box>

                      <Box
                        sx={{
                          alignSelf: 'flex-start',
                          maxWidth: '92%',
                          p: 2,
                          borderRadius: '22px 22px 22px 6px',
                          bgcolor: '#fff',
                          border: '1px solid rgba(148,163,184,0.22)',
                        }}
                      >
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                          <AutoAwesomeOutlinedIcon color="primary" fontSize="small" />
                          <Typography fontWeight={900}>
                            Answer
                          </Typography>
                        </Stack>

                        <MarkdownAnswer text={chat.answer} />

                        <Accordion sx={{ mt: 2, boxShadow: 'none' }}>
                          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Typography variant="body2" fontWeight={800}>
                              Supporting Chunks
                            </Typography>
                          </AccordionSummary>

                          <AccordionDetails>
                            <Stack spacing={1}>
                              {(chat.supportingChunks || []).map((chunk, idx) => (
                                <Box
                                  key={`${chat._id}-${idx}`}
                                  sx={{
                                    p: 1.5,
                                    borderRadius: 3,
                                    bgcolor: '#f8fafc',
                                    border: '1px solid rgba(148,163,184,0.2)',
                                  }}
                                >
                                  <Typography variant="body2">
                                    {chunk.text}
                                  </Typography>
                                </Box>
                              ))}
                            </Stack>
                          </AccordionDetails>
                        </Accordion>
                      </Box>
                    </Stack>
                  ))
                )}
              </Stack>

              <Box
                sx={{
                  p: 2.5,
                  borderTop: '1px solid rgba(148,163,184,0.22)',
                  bgcolor: '#fff',
                }}
              >
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                  <TextField
                    fullWidth
                    label="Ask a question"
                    placeholder="Example: What are the key ideas in this video?"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    disabled={loading}
                  />

                  <LoadingButton
                    loading={loading}
                    onClick={askQuestion}
                    disabled={!query.trim() || !status?.ready}
                    startIcon={<ChatBubbleOutlineOutlinedIcon />}
                  >
                    {loading ? 'Thinking...' : status?.ready ? 'Ask' : 'Processing...'}
                  </LoadingButton>
                </Stack>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} lg={3.4}>
          <Stack spacing={3}>
            <Card>
              <CardContent>
                <Stack spacing={2}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <SourceOutlinedIcon color="primary" />
                    <Typography variant="h6">
                      Retrieved Context
                    </Typography>
                  </Stack>

                  <Typography color="text.secondary">
                    Latest supporting chunks used by the assistant.
                  </Typography>

                  <Divider />

                  {latestChunks.length === 0 ? (
                    <Box
                      sx={{
                        p: 3,
                        borderRadius: 4,
                        bgcolor: '#f8fafc',
                        border: '1px dashed rgba(148,163,184,0.5)',
                        textAlign: 'center',
                      }}
                    >
                      <Typography fontWeight={800}>
                        No chunks yet
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        Ask a question to see retrieved sources here.
                      </Typography>
                    </Box>
                  ) : (
                    <Stack spacing={1.5}>
                      {latestChunks.map((chunk, index) => (
                        <Box
                          key={`${chunk.text}-${index}`}
                          sx={{
                            p: 2,
                            borderRadius: 4,
                            bgcolor: '#f8fafc',
                            border: '1px solid rgba(148,163,184,0.24)',
                          }}
                        >
                          <Stack
                            direction="row"
                            justifyContent="space-between"
                            spacing={1}
                            sx={{ mb: 1 }}
                          >
                            <Typography fontWeight={900}>
                              Source {index + 1}
                            </Typography>

                            {chunk.score !== undefined && (
                              <Chip
                                size="small"
                                label={`Score ${Number(chunk.score).toFixed(2)}`}
                              />
                            )}
                          </Stack>

                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{
                              display: '-webkit-box',
                              WebkitLineClamp: 5,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                            }}
                          >
                            {chunk.text}
                          </Typography>
                        </Box>
                      ))}
                    </Stack>
                  )}
                </Stack>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Stack spacing={2}>
                  <Typography variant="h6">
                    Prompt ideas
                  </Typography>

                  {[
                    'Summarize this video in bullet points',
                    'What are the most important concepts?',
                    'Explain this like I am a beginner',
                    'Give me action items from this video',
                  ].map((item) => (
                    <Button
                      key={item}
                      variant="outlined"
                      fullWidth
                      onClick={() => setQuery(item)}
                      sx={{ justifyContent: 'flex-start' }}
                    >
                      {item}
                    </Button>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </Grid>
      </Grid>
    </Stack>
  );
};

export default VideoChatPage;