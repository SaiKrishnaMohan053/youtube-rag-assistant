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
import { askVideoApi, getChatsApi, getVideoApi } from '../api/videoApi';

const VideoChatPage = () => {
  const { id } = useParams();
  const [video, setVideo] = useState(null);
  const [chats, setChats] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadData = async () => {
    const [videoResponse, chatResponse] = await Promise.all([getVideoApi(id), getChatsApi(id)]);
    setVideo(videoResponse.data.video);
    setChats(chatResponse.data.chats || []);
  };

  useEffect(() => {
    loadData().catch(() => setError('Failed to load video chat data'));
  }, [id]);

  const askQuestion = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await askVideoApi(id, query);
      setChats((prev) => [
        ...prev,
        {
          _id: response.data.chatMessageId,
          question: query,
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

  return (
    <Container sx={{ py: 4 }}>
      <Stack spacing={3}>
        <Typography variant="h4">{video?.title || 'Video Chat'}</Typography>
        {error && <Alert severity="error">{error}</Alert>}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField fullWidth label="Ask a question" value={query} onChange={(e) => setQuery(e.target.value)} />
          <LoadingButton loading={loading} onClick={askQuestion}>Ask</LoadingButton>
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
