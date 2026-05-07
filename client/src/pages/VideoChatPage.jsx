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
import { askVideoApi, getChatsApi, getVideoApi } from '../api/videoApi';

const VideoChatPage = () => {
  const { id } = useParams();

  const [video, setVideo] = useState(null);
  const [chats, setChats] = useState([]);
  const [query, setQuery] = useState('');
  const [pageLoading, setPageLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadData = async () => {
    const [videoResponse, chatResponse] = await Promise.all([getVideoApi(id), getChatsApi(id)]);
    setVideo(videoResponse.data.video);
    setChats(chatResponse.data.chats || []);
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

  const askQuestion = async () => {
    if (!query.trim()) return;

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
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField fullWidth label="Ask a question" value={query} onChange={(e) => setQuery(e.target.value)} disabled={loading} />
          <LoadingButton loading={loading} onClick={askQuestion} disabled={!query.trim()}>{loading ? "Thinking..." : "Ask"}</LoadingButton>
        </Stack>
        <Stack spacing={2}>
          {chats.map((chat) => (
            <Box key={chat._id} sx={{ border: '1px solid #e0e0e0', borderRadius: 2, p: 2 }}>
              <Typography variant="subtitle2">Q: {chat.question}</Typography>
              <Typography variant="body1" sx={{ mt: 1 }}>A: {chat.answer}</Typography>
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
