import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';

import VideoChatPage from '../../src/pages/VideoChatPage';
import appTheme from '../../src/theme/appTheme';
import {
  askVideoApi,
  getChatsApi,
  getVideoApi,
  getVideoStatusApi,
} from '../../src/api/videoApi';

vi.mock('../../src/api/videoApi', () => ({
  askVideoApi: vi.fn(),
  getChatsApi: vi.fn(),
  getVideoApi: vi.fn(),
  getVideoStatusApi: vi.fn(),
}));

vi.mock('../../src/components/MarkdownAnswer', () => ({
  default: ({ text }) => <div>{text}</div>,
}));

const mockVideo = {
  _id: 'video-1',
  videoId: 'abc123',
  title: 'React RAG Tutorial',
  url: 'https://www.youtube.com/watch?v=abc123',
};

const mockChats = [
  {
    _id: 'chat-1',
    question: 'What is this video about?',
    answer: 'This video explains RAG basics.',
    supportingChunks: [
      {
        text: 'RAG means retrieval augmented generation.',
      },
    ],
  },
];

const readyStatus = {
  ready: true,
  message: 'Video is ready for chat.',
  summaryStatus: 'completed',
  embeddingStatus: 'completed',
  totalChunks: 5,
  completedEmbeddings: 5,
  failedEmbeddings: 0,
};

const processingStatus = {
  ready: false,
  message: 'Indexing transcript chunks for search. Please wait.',
  summaryStatus: 'completed',
  embeddingStatus: 'processing',
  totalChunks: 5,
  completedEmbeddings: 3,
  failedEmbeddings: 0,
};

const renderVideoChatPage = () => {
  return render(
    <ThemeProvider theme={appTheme}>
      <CssBaseline />
      <MemoryRouter initialEntries={['/videos/video-1']}>
        <Routes>
          <Route path="/videos/:id" element={<VideoChatPage />} />
          <Route path="/dashboard" element={<div>Dashboard Page</div>} />
        </Routes>
      </MemoryRouter>
    </ThemeProvider>
  );
};

const mockPageLoad = ({ chats = mockChats, status = readyStatus } = {}) => {
  getVideoApi.mockResolvedValue({
    data: {
      video: mockVideo,
    },
  });

  getChatsApi.mockResolvedValue({
    data: {
      chats,
    },
  });

  getVideoStatusApi.mockResolvedValue({
    data: status,
  });
};

describe('VideoChatPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  });

  it('loads video details and chat history', async () => {
    mockPageLoad();

    renderVideoChatPage();

    expect(
      screen.getByText(/loading ai video workspace/i)
    ).toBeInTheDocument();

    expect(await screen.findByText('React RAG Tutorial')).toBeInTheDocument();
    expect(screen.getByText('What is this video about?')).toBeInTheDocument();
    expect(screen.getByText('This video explains RAG basics.')).toBeInTheDocument();
    expect(screen.getByText(/ready to chat/i)).toBeInTheDocument();

    expect(getVideoApi).toHaveBeenCalledWith('video-1');
    expect(getChatsApi).toHaveBeenCalledWith('video-1');
    expect(getVideoStatusApi).toHaveBeenCalledWith('video-1');
  });

  it('shows empty chat state when there are no chats', async () => {
    mockPageLoad({ chats: [] });

    renderVideoChatPage();

    expect(await screen.findByText(/start asking questions/i)).toBeInTheDocument();
  });

  it('sends a question and renders returned answer', async () => {
    const user = userEvent.setup();

    mockPageLoad({ chats: [] });

    askVideoApi.mockResolvedValue({
      data: {
        chatMessageId: 'chat-2',
        answer: 'New grounded AI answer.',
        supportingChunks: [
          {
            text: 'Supporting chunk text.',
          },
        ],
      },
    });

    renderVideoChatPage();

    await screen.findByText(/start asking questions/i);

    await user.type(
      screen.getByLabelText(/ask a question/i),
      'Summarize this video'
    );

    await user.click(screen.getByRole('button', { name: /^ask$/i }));

    await waitFor(() => {
      expect(askVideoApi).toHaveBeenCalledWith(
        'video-1',
        'Summarize this video',
        2
      );
    });

    expect(await screen.findByText('Summarize this video')).toBeInTheDocument();
    expect(await screen.findByText('New grounded AI answer.')).toBeInTheDocument();
    expect(window.scrollTo).toHaveBeenCalled();
  });

  it('disables ask button when video is processing', async () => {
    mockPageLoad({
      chats: [],
      status: processingStatus,
    });

    renderVideoChatPage();

    expect(
      await screen.findByText(/this page will update automatically/i)
    ).toBeInTheDocument();

    expect(
      screen.getByRole('button', { name: /processing/i })
    ).toBeDisabled();
  });

  it('shows error when page load fails', async () => {
    getVideoApi.mockRejectedValue(new Error('Failed'));
    getChatsApi.mockRejectedValue(new Error('Failed'));
    getVideoStatusApi.mockRejectedValue(new Error('Failed'));

    renderVideoChatPage();

    expect(await screen.findByText('Failed to load video or chats')).toBeInTheDocument();
  });

  it('shows API error when asking fails', async () => {
    const user = userEvent.setup();

    mockPageLoad({ chats: [] });

    askVideoApi.mockRejectedValue({
      response: {
        data: {
          message: 'LLM failed',
        },
      },
    });

    renderVideoChatPage();

    await screen.findByText(/start asking questions/i);

    await user.type(screen.getByLabelText(/ask a question/i), 'Explain this');
    await user.click(screen.getByRole('button', { name: /^ask$/i }));

    expect(await screen.findByText('LLM failed')).toBeInTheDocument();
  });

  it('sets prompt idea into question input', async () => {
    const user = userEvent.setup();

    mockPageLoad({ chats: [] });

    renderVideoChatPage();

    await screen.findByText(/prompt ideas/i);

    await user.click(
      screen.getByRole('button', {
        name: /summarize this video in bullet points/i,
      })
    );

    expect(screen.getByLabelText(/ask a question/i)).toHaveValue(
      'Summarize this video in bullet points'
    );
  });
});