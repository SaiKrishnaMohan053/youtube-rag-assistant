import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Divider,
  Grid,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined';
import ChatBubbleOutlineOutlinedIcon from '@mui/icons-material/ChatBubbleOutlineOutlined';
import StorageOutlinedIcon from '@mui/icons-material/StorageOutlined';
import HubOutlinedIcon from '@mui/icons-material/HubOutlined';
import VerifiedOutlinedIcon from '@mui/icons-material/VerifiedOutlined';
import { Link as RouterLink } from 'react-router-dom';
import { useState } from 'react';

import LoadingButton from '../components/LoadingButton';
import MarkdownAnswer from '../components/MarkdownAnswer';
import { askGuestVideoApi, createGuestSummaryApi } from '../api/guestApi';

const featureCards = [
  {
    icon: <PlayCircleOutlineIcon />,
    title: 'Paste any YouTube URL',
    text: 'Drop a video link and let the assistant extract transcript-based context.',
  },
  {
    icon: <AutoAwesomeOutlinedIcon />,
    title: 'Instant AI summary',
    text: 'Generate a clear summary from the video transcript without watching the full video.',
  },
  {
    icon: <ChatBubbleOutlineOutlinedIcon />,
    title: 'Ask video questions',
    text: 'Ask questions and get answers grounded in the video content.',
  },
];

const pipeline = [
  'Transcript',
  'Chunks',
  'Summary',
  'Embeddings',
  'FAISS Index',
  'RAG Chat',
];

const GuestPage = () => {
  const [url, setUrl] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [summary, setSummary] = useState('');
  const [query, setQuery] = useState('');
  const [answers, setAnswers] = useState([]);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [loadingAnswer, setLoadingAnswer] = useState(false);
  const [error, setError] = useState('');

  const generateSummary = async () => {
    if (!url.trim()) {
      setError('Please enter a YouTube URL');
      return;
    }

    setLoadingSummary(true);
    setError('');
    setSummary('');
    setAnswers([]);

    try {
      const response = await createGuestSummaryApi(url.trim());

      setSessionId(response.data.sessionId);
      setSummary(response.data.summary);
    } catch (apiError) {
      setError(apiError.response?.data?.message || 'Failed to generate guest summary');
    } finally {
      setLoadingSummary(false);
    }
  };

  const askQuestion = async () => {
    if (!query.trim()) return;

    if (!sessionId) {
      setError('Please generate a summary first');
      return;
    }

    setLoadingAnswer(true);
    setError('');

    try {
      const currentQuery = query.trim();

      const response = await askGuestVideoApi({
        sessionId,
        query: currentQuery,
      });

      setAnswers((prev) => [
        ...prev,
        {
          id: `${Date.now()}`,
          question: currentQuery,
          answer: response.data.answer,
        },
      ]);

      setQuery('');
    } catch (apiError) {
      setError(apiError.response?.data?.message || 'Failed to ask guest question');
    } finally {
      setLoadingAnswer(false);
    }
  };

  return (
    <Box>
      <Container maxWidth="xl" sx={{ py: { xs: 3, md: 4 } }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} lg={6}>
            <Stack spacing={2.2}>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                <Chip
                  icon={<VerifiedOutlinedIcon />}
                  label="Transcript-grounded AI"
                  color="primary"
                />
                <Chip label="No login required" variant="outlined" />
                <Chip label="Temporary guest demo" variant="outlined" />
              </Stack>

              <Typography
                variant="h2"
                sx={{
                  maxWidth: 760,
                  fontSize: { xs: 42, md: 64 },
                  lineHeight: 0.95,
                }}
              >
                Turn YouTube videos into searchable AI knowledge.
              </Typography>

              <Typography
                variant="h6"
                color="text.secondary"
                sx={{ maxWidth: 680, lineHeight: 1.7 }}
              >
                Paste a YouTube URL, generate a transcript-based summary, then ask
                questions using a RAG workflow powered by chunks, embeddings, FAISS,
                and grounded AI answers.
              </Typography>

              <Card
                sx={{
                  maxWidth: 760,
                  background: 'rgba(255,255,255,0.76)',
                  backdropFilter: 'blur(20px)',
                }}
              >
                <CardContent>
                  <Stack spacing={2}>
                    <Typography variant="h6">
                      Try the guest demo
                    </Typography>

                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                      <TextField
                        fullWidth
                        label="Paste YouTube URL"
                        placeholder="https://www.youtube.com/watch?v=..."
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        disabled={loadingSummary}
                      />

                      <LoadingButton
                        loading={loadingSummary}
                        onClick={generateSummary}
                      >
                        {loadingSummary ? 'Generating...' : 'Generate Summary'}
                      </LoadingButton>
                    </Stack>

                    {error && <Alert severity="error">{error}</Alert>}
                  </Stack>
                </CardContent>
              </Card>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <Button variant="contained" component={RouterLink} to="/register">
                  Create Free Account
                </Button>

                <Button variant="outlined" component={RouterLink} to="/login">
                  Login
                </Button>
              </Stack>
            </Stack>
          </Grid>

          <Grid item xs={12} lg={6}>
            <Card
              sx={{
                minHeight: 460,
                background:
                  'linear-gradient(145deg, rgba(15,23,42,0.96), rgba(30,41,59,0.94))',
                color: '#fff',
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  background:
                    'radial-gradient(circle at top right, rgba(99,91,255,0.35), transparent 35%), radial-gradient(circle at bottom left, rgba(0,194,255,0.22), transparent 32%)',
                }}
              />

              <CardContent sx={{ position: 'relative', p: { xs: 3, md: 4 } }}>
                <Stack spacing={2.2}>
                  <Box>
                    <Typography variant="overline" sx={{ color: '#93c5fd' }}>
                      AI Workflow
                    </Typography>
                    <Typography variant="h4">
                      From video to RAG chat
                    </Typography>
                  </Box>

                  <Stack spacing={1.5}>
                    {pipeline.map((step, index) => (
                      <Box
                        key={step}
                        sx={{
                          p: 1.5,
                          borderRadius: 4,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          bgcolor: 'rgba(255,255,255,0.07)',
                          border: '1px solid rgba(255,255,255,0.12)',
                        }}
                      >
                        <Stack direction="row" spacing={1.5} alignItems="center">
                          <Box
                            sx={{
                              width: 34,
                              height: 34,
                              borderRadius: '50%',
                              display: 'grid',
                              placeItems: 'center',
                              bgcolor: 'rgba(99,91,255,0.28)',
                              color: '#fff',
                              fontWeight: 900,
                            }}
                          >
                            {index + 1}
                          </Box>

                          <Typography fontWeight={800}>{step}</Typography>
                        </Stack>

                        <Chip
                          size="small"
                          label={index < 5 ? 'Ready' : 'Ask'}
                          sx={{
                            color: '#fff',
                            bgcolor:
                              index < 5
                                ? 'rgba(34,197,94,0.22)'
                                : 'rgba(0,194,255,0.22)',
                            border: '1px solid rgba(255,255,255,0.16)',
                          }}
                        />
                      </Box>
                    ))}
                  </Stack>

                  <Divider sx={{ borderColor: 'rgba(255,255,255,0.14)' }} />

                  <Grid container spacing={2}>
                    <Grid item xs={4}>
                      <Stack spacing={0.5}>
                        <StorageOutlinedIcon sx={{ color: '#67e8f9' }} />
                        <Typography variant="h5">FAISS</Typography>
                        <Typography variant="caption" sx={{ color: '#cbd5e1' }}>
                          Vector index
                        </Typography>
                      </Stack>
                    </Grid>

                    <Grid item xs={4}>
                      <Stack spacing={0.5}>
                        <HubOutlinedIcon sx={{ color: '#c4b5fd' }} />
                        <Typography variant="h5">RAG</Typography>
                        <Typography variant="caption" sx={{ color: '#cbd5e1' }}>
                          Context retrieval
                        </Typography>
                      </Stack>
                    </Grid>

                    <Grid item xs={4}>
                      <Stack spacing={0.5}>
                        <AutoAwesomeOutlinedIcon sx={{ color: '#fde68a' }} />
                        <Typography variant="h5">AI</Typography>
                        <Typography variant="caption" sx={{ color: '#cbd5e1' }}>
                          Grounded answers
                        </Typography>
                      </Stack>
                    </Grid>
                  </Grid>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Grid container spacing={2.5} sx={{ mt: { xs: 1.5, md: 2.5 } }}>
          {featureCards.map((feature) => (
            <Grid item xs={12} md={4} key={feature.title}>
              <Card sx={{ height: '100%' }}>
                <CardContent sx={{ p: 3 }}>
                  <Stack spacing={2}>
                    <Box
                      sx={{
                        width: 52,
                        height: 52,
                        borderRadius: 4,
                        display: 'grid',
                        placeItems: 'center',
                        color: 'primary.main',
                        bgcolor: 'rgba(99,91,255,0.1)',
                      }}
                    >
                      {feature.icon}
                    </Box>

                    <Typography variant="h6">{feature.title}</Typography>

                    <Typography color="text.secondary" lineHeight={1.7}>
                      {feature.text}
                    </Typography>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {summary && (
          <Grid container spacing={3} sx={{ mt: 4 }}>
            <Grid item xs={12} lg={7}>
              <Card>
                <CardContent>
                  <Stack spacing={2}>
                    <Stack
                      direction={{ xs: 'column', sm: 'row' }}
                      justifyContent="space-between"
                      spacing={1}
                    >
                      <Box>
                        <Typography variant="h5">
                          Guest Summary
                        </Typography>
                        <Typography color="text.secondary">
                          Temporary transcript-based summary
                        </Typography>
                      </Box>

                      <Chip label="Generated" color="success" />
                    </Stack>

                    <Divider />

                    <MarkdownAnswer text={summary} />

                    <Alert severity="info">
                      Guest sessions are temporary. Create an account to save videos,
                      chats, summaries, and indexes.
                    </Alert>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} lg={5}>
              <Card>
                <CardContent>
                  <Stack spacing={2}>
                    <Box>
                      <Typography variant="h5">
                        Ask this video
                      </Typography>
                      <Typography color="text.secondary">
                        Ask questions using the temporary guest context.
                      </Typography>
                    </Box>

                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                      <TextField
                        fullWidth
                        label="Ask a question"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        disabled={loadingAnswer}
                      />

                      <LoadingButton
                        loading={loadingAnswer}
                        onClick={askQuestion}
                        disabled={!query.trim()}
                      >
                        {loadingAnswer ? 'Thinking...' : 'Ask'}
                      </LoadingButton>
                    </Stack>

                    <Stack spacing={2}>
                      {answers.map((item) => (
                        <Box
                          key={item.id}
                          sx={{
                            p: 2,
                            borderRadius: 2,
                            bgcolor: '#f8fafc',
                            border: '1px solid rgba(148,163,184,0.24)',
                          }}
                        >
                          <Typography fontWeight={800}>
                            Q: {item.question}
                          </Typography>

                          <Box sx={{ mt: 1 }}>
                            <MarkdownAnswer text={item.answer} />
                          </Box>
                        </Box>
                      ))}
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}
      </Container>
    </Box>
  );
};

export default GuestPage;