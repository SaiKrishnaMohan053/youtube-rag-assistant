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
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import ArrowBackOutlinedIcon from '@mui/icons-material/ArrowBackOutlined';
import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined';
import ChatBubbleOutlineOutlinedIcon from '@mui/icons-material/ChatBubbleOutlineOutlined';
import CheckCircleOutlineOutlinedIcon from '@mui/icons-material/CheckCircleOutlineOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import HubOutlinedIcon from '@mui/icons-material/HubOutlined';
import SmartToyOutlinedIcon from '@mui/icons-material/SmartToyOutlined';
import SourceOutlinedIcon from '@mui/icons-material/SourceOutlined';
import VideoLibraryOutlinedIcon from '@mui/icons-material/VideoLibraryOutlined';
import { useEffect, useMemo, useState, useRef } from 'react';
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

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [video, setVideo] = useState(null);
  const [chats, setChats] = useState([]);
  const [query, setQuery] = useState('');
  const [pageLoading, setPageLoading] = useState(true);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const chatContainerRef = useRef(null);

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

      const response = await askVideoApi(id, currentQuery, 4);

      setChats((prev) => [
        ...prev,
        {
          _id: response.data.chatMessageId,
          question: currentQuery,
          answer: response.data.answer,
          supportingChunks: response.data.supportingChunks,
        },
      ]);

      if (isMobile && chatContainerRef.current) {
        setTimeout(() => {
          chatContainerRef.current.scrollTo({
            top: chatContainerRef.current.scrollHeight,
            behavior: 'smooth',
          });
        }, 100);
      }

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
    <Box 
      sx={{
        minHeight: '100vh',
        bgcolor: '#f5f7fb',
        px: { xs: 2, md: 4 },
        py: { xs: 2.5, md: 3 }
      }}
    >
      <Stack spacing={2}>
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
          </Stack>

          <Stack direction="row" spacing={1} alignItems="flex-start" sx={{ pr: { xs: 0, md: 1 } }}>
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

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              lg: '320px 1fr',
            },
            gap: 2.5,
            width: '100%',
          }}
        >
          <Box
            sx={{
              order: { xs: 2, lg: 1 },
              minWidth: 0,
            }}
          >
            <Stack spacing={2}>
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

                <CardContent sx={{ p: 2 }}>
                  <Stack spacing={1}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <VideoLibraryOutlinedIcon color="primary" fontSize="small" />

                      <Typography fontWeight={900}>
                        Current Video
                      </Typography>
                    </Stack>

                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {video?.title || video?.url || video?.videoId}
                    </Typography>

                    <Stack direction="row" spacing={1} flexWrap="wrap">
                      <Chip
                        size="small"
                        color={status?.ready ? 'success' : 'warning'}
                        label={status?.ready ? 'Ready' : 'Processing'}
                      />

                      <Chip size="small" color="primary" label="RAG" />
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>

              <Card>
                <CardContent sx={{ p: 2 }}>
                  <Stack spacing={1.5}>
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
                        sx={{
                          justifyContent: 'flex-start',
                          textAlign: 'left',
                          borderRadius: 3,
                          fontSize: {
                            xs: '0.8rem',
                            md: '0.875rem',
                          }
                        }}
                      >
                        {item}
                      </Button>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            </Stack>
          </Box>

          <Box
            sx={{
              order: { xs: 1, lg: 2 },
              minWidth: 0,
            }}
          >
            <Card
              sx={{
                minHeight: { xs: 'auto', lg: 'calc(100vh - 150px)' },
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
                    p: { xs: 2, md: 2.5 },
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
                  ref={chatContainerRef}
                  sx={{
                    p: {
                      xs: 1.5,
                      md: 3,
                    },
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
                            maxWidth: {
                              xs: '100%',
                              md: 680,
                            },
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
                            maxWidth: {
                              xs: '100%',
                              md: 860
                            },
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
                                    <Stack spacing={0.75}>
                                      <Stack direction="row" spacing={1} alignItems="center">
                                        <Chip
                                          size="small"
                                          color="primary"
                                          label={chunk.timestamp ? `[${chunk.timestamp}]` : `Source ${idx + 1}`}
                                        />

                                        {typeof chunk.score === 'number' && (
                                          <Chip
                                            size="small"
                                            label={`Score ${chunk.score.toFixed(2)}`}
                                          />
                                        )}
                                      </Stack>

                                      <Typography variant="body2">
                                        {chunk.text}
                                      </Typography>
                                    </Stack>
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
                    p: {
                      xs: 1.5,
                      md: 2.5,
                    },
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
          </Box>
        </Box>
      </Stack>
    </Box>
  );
};

export default VideoChatPage;