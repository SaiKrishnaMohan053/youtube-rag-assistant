import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Container,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import LoadingButton from '../components/LoadingButton';
import PageLoader from '../components/PageLoader';
import { askVideoApi, getChatsApi, getVideoApi, getVideoStatusApi } from '../api/videoApi';
import MarkdownAnswer from '../components/MarkdownAnswer';

const VideoChatPage = () => {
  const { id } = useParams();

  const [video, setVideo] = useState(null);
  const [chats, setChats] = useState([]);
  const [query, setQuery] = useState('');
  const [pageLoading, setPageLoading] = useState(true);
  const [status, setStatus] = useState(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadData = async () => {
    const [videoResponse, chatResponse, statusResponse] = await Promise.all([getVideoApi(id), getChatsApi(id), getVideoStatusApi(id)]);
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
    return <PageLoader text='Loading chat...' />;
  }

  return (
    <Container sx={{ py: 4 }}>
      <Stack spacing={3}>
        <Typography variant="h4">{video?.title || 'Video Chat'}</Typography>
        {error && <Alert severity="error">{error}</Alert>}
        {status && !status.ready && (
          <Alert severity="info">
            {status.message} This page will update automatically.
          </Alert>
        )}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField fullWidth label="Ask a question" value={query} onChange={(e) => setQuery(e.target.value)} disabled={loading} />
          <LoadingButton loading={loading} onClick={askQuestion} disabled={!query.trim() || !status?.ready}>
            {loading ? "Thinking..." : status?.ready ? "Ask" : "Processing..."}
          </LoadingButton>
        </Stack>
        <Stack spacing={2}>
          {chats.map((chat) => (
            <Box key={chat._id} sx={{ border: '1px solid #e0e0e0', borderRadius: 2, p: 2 }}>
              <Typography variant="subtitle2">Q: {chat.question}</Typography>
              <Box sx={{ mt: 1 }}>
                <Typography variant="body2" fontWeight={700} sx={{ mb: 0.5 }}>
                  A:
                </Typography>
                <MarkdownAnswer text={chat.answer} />
              </Box>
              <Accordion sx={{ mt: 2 }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="body2">Supporting Chunks</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Stack spacing={1}>
                    {(chat.supportingChunks || []).map((chunk, idx) => (
                      <Typography key={`${chat._id}-${idx}`} variant="body2">
                        {chunk.text}
                      </Typography>
                    ))}
                  </Stack>
                </AccordionDetails>
              </Accordion>
            </Box>
          ))}
        </Stack>
      </Stack>
    </Container>
  );
};

export default VideoChatPage;