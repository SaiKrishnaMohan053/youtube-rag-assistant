import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Divider,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { useState } from 'react';
import LoadingButton from '../components/LoadingButton';
import MarkdownAnswer from '../components/MarkdownAnswer';
import { askGuestVideoApi, createGuestSummaryApi } from '../api/guestApi';

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
    <Container sx={{ py: { xs: 4, md: 6 } }}>
      <Stack spacing={4}>
        <Box
          sx={{
            p: { xs: 3, md: 5 },
            borderRadius: 4,
            background: 'linear-gradient(135deg, #e3f2fd 0%, #ffffff 55%, #f3e5f5 100%)',
            border: '1px solid #e0e0e0',
          }}
        >
          <Stack spacing={2}>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              <Chip label="No login required" color="primary" />
              <Chip label="Temporary session" variant="outlined" />
              <Chip label="Quick summary + Q&A" variant="outlined" />
            </Stack>

            <Typography variant="h3" fontWeight={800}>
              Try YouTube RAG Assistant for free
            </Typography>

            <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 850 }}>
              Paste a YouTube video URL and get a quick transcript-based summary. Guest mode does
              not save videos, chats, or indexes.
            </Typography>

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField
                fullWidth
                label="YouTube URL"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={loadingSummary}
              />

              <LoadingButton loading={loadingSummary} onClick={generateSummary}>
                {loadingSummary ? 'Generating...' : 'Generate Summary'}
              </LoadingButton>
            </Stack>

            {error && <Alert severity="error">{error}</Alert>}
          </Stack>
        </Box>

        {summary && (
          <Card>
            <CardContent>
              <Stack spacing={2}>
                <Typography variant="h5" fontWeight={700}>
                  Guest Summary
                </Typography>

                <MarkdownAnswer text={summary} />

                <Divider />

                <Alert severity="info">
                  Guest sessions are temporary. Login to save videos, unlock detailed notes,
                  LinkedIn posts, blog outlines, timestamps, and chat history.
                </Alert>

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <Button variant="contained" component={RouterLink} to="/register">
                    Create Free Account
                  </Button>

                  <Button variant="outlined" component={RouterLink} to="/login">
                    Login
                  </Button>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        )}

        {summary && (
          <Card>
            <CardContent>
              <Stack spacing={2}>
                <Typography variant="h5" fontWeight={700}>
                  Ask a guest question
                </Typography>

                <Typography variant="body2" color="text.secondary">
                  Guest Q&A uses the temporary transcript context only. Advanced exports and saved
                  history are available after login.
                </Typography>

                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                  <TextField
                    fullWidth
                    label="Ask a question about this video"
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
                        border: '1px solid #e0e0e0',
                      }}
                    >
                      <Typography variant="subtitle2">Q: {item.question}</Typography>

                      <Box sx={{ mt: 1 }}>
                        <Typography variant="body2" fontWeight={700} sx={{ mb: 0.5 }}>
                          A:
                        </Typography>
                        <MarkdownAnswer text={item.answer} />
                      </Box>
                    </Box>
                  ))}
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        )}

        <Card variant="outlined">
          <CardContent>
            <Stack spacing={2}>
              <Typography variant="h5" fontWeight={700}>
                What login unlocks
              </Typography>

              <Stack direction="row" spacing={1} flexWrap="wrap">
                <Chip label="Saved videos" />
                <Chip label="Chat history" />
                <Chip label="Detailed notes" />
                <Chip label="LinkedIn posts" />
                <Chip label="Blog outlines" />
                <Chip label="Tweet threads" />
                <Chip label="Timestamp search" />
                <Chip label="Future Chrome extension support" />
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      </Stack>
    </Container>
  );
};

export default GuestPage;