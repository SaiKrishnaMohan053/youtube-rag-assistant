import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';

import DashboardPage from '../../src/pages/DashboardPage';
import appTheme from '../../src/theme/appTheme';
import {
  createChunksApi,
  deleteVideoApi,
  getVideosApi,
  processVideoApi,
  indexVideoApi,
  getVideoIndexStatusApi,
} from '../../src/api/videoApi';

vi.mock('../../src/api/videoApi', () => ({
  createChunksApi: vi.fn(),
  deleteVideoApi: vi.fn(),
  getVideosApi: vi.fn(),
  processVideoApi: vi.fn(),
  indexVideoApi: vi.fn(),
  getVideoIndexStatusApi: vi.fn(),
}));

const mockVideos = [
  {
    _id: 'video-1',
    videoId: 'abc123',
    title: 'React RAG Tutorial',
    createdAt: '2026-06-01T10:00:00.000Z',
  },
  {
    _id: 'video-2',
    videoId: 'xyz789',
    title: 'Node Backend Guide',
    createdAt: '2026-06-02T10:00:00.000Z',
  },
];

const renderDashboardPage = (props = {}) => {
  return render(
    <ThemeProvider theme={appTheme}>
      <CssBaseline />
      <MemoryRouter>
        <DashboardPage {...props} />
      </MemoryRouter>
    </ThemeProvider>
  );
};

const mockVideosApiSuccess = (videos = mockVideos) => {
  getVideosApi.mockResolvedValue({
    data: {
      videos,
    },
  });

  getVideoIndexStatusApi.mockResolvedValue({
    data: {
      indexStatus: {
        indexed: true,
        indexFileExists: true,
        metadataFileExists: true,
        chunkCount: 10,
      },
    },
  });
};

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  it('loads and displays recent videos', async () => {
    mockVideosApiSuccess();

    renderDashboardPage();

    expect(
      screen.getByText(/loading your video workspace/i)
    ).toBeInTheDocument();

    expect(await screen.findByText('React RAG Tutorial')).toBeInTheDocument();
    expect(screen.getByText('Node Backend Guide')).toBeInTheDocument();

    expect(getVideosApi).toHaveBeenCalledTimes(1);
    expect(getVideoIndexStatusApi).toHaveBeenCalledTimes(2);
  });

  it('shows empty state when no videos exist', async () => {
    mockVideosApiSuccess([]);

    renderDashboardPage();

    expect(
      await screen.findByText(/your ai video library is empty/i)
    ).toBeInTheDocument();
  });

  it('processes a new video', async () => {
    const user = userEvent.setup();

    mockVideosApiSuccess([]);

    processVideoApi.mockResolvedValue({
      data: {
        video: {
          _id: 'new-video-1',
        },
      },
    });

    createChunksApi.mockResolvedValue({});

    renderDashboardPage();

    await screen.findByText(/dashboard/i);

    await user.type(
      screen.getByLabelText(/youtube url/i),
      'https://www.youtube.com/watch?v=new123'
    );

    await user.click(screen.getByRole('button', { name: /process video/i }));

    await waitFor(() => {
      expect(processVideoApi).toHaveBeenCalledWith(
        'https://www.youtube.com/watch?v=new123'
      );
    });

    expect(createChunksApi).toHaveBeenCalledWith('new-video-1');

    expect(
      await screen.findByText(/video is processing in the background/i)
    ).toBeInTheDocument();
  });

  it('shows error when processing without URL', async () => {
    const user = userEvent.setup();

    mockVideosApiSuccess([]);

    renderDashboardPage();

    await screen.findByText(/dashboard/i);

    await user.click(screen.getByRole('button', { name: /process video/i }));

    expect(await screen.findByText('Please enter a YouTube URL')).toBeInTheDocument();

    expect(processVideoApi).not.toHaveBeenCalled();
  });

  it('deletes a video after confirmation', async () => {
    const user = userEvent.setup();

    mockVideosApiSuccess();

    deleteVideoApi.mockResolvedValue({});

    renderDashboardPage();

    await screen.findByText('React RAG Tutorial');

    const cards = screen.getAllByRole('img');
    expect(cards.length).toBeGreaterThan(0);

    const deleteButtons = screen.getAllByTestId('DeleteOutlineOutlinedIcon');

    await user.click(deleteButtons[0].closest('button'));

    await waitFor(() => {
      expect(deleteVideoApi).toHaveBeenCalledWith('video-1');
    });

    expect(await screen.findByText('Video deleted successfully')).toBeInTheDocument();
  });

  it('does not delete when user cancels confirmation', async () => {
    const user = userEvent.setup();

    window.confirm.mockReturnValue(false);

    mockVideosApiSuccess();

    renderDashboardPage();

    await screen.findByText('React RAG Tutorial');

    const deleteButtons = screen.getAllByTestId('DeleteOutlineOutlinedIcon');

    await user.click(deleteButtons[0].closest('button'));

    expect(deleteVideoApi).not.toHaveBeenCalled();
  });

  it('reindexes video when index is missing', async () => {
    const user = userEvent.setup();

    getVideosApi.mockResolvedValue({
      data: {
        videos: [mockVideos[0]],
      },
    });

    getVideoIndexStatusApi.mockResolvedValue({
      data: {
        indexStatus: {
          indexed: false,
          indexFileExists: false,
          metadataFileExists: false,
          chunkCount: 0,
        },
      },
    });

    indexVideoApi.mockResolvedValue({});

    renderDashboardPage();

    expect(await screen.findByText('Index missing')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /re-index/i }));

    await waitFor(() => {
      expect(indexVideoApi).toHaveBeenCalledWith('video-1');
    });

    expect(await screen.findByText('Video re-indexed successfully')).toBeInTheDocument();
  });

  it('disables reindex button when index exists', async () => {
    mockVideosApiSuccess([mockVideos[0]]);

    renderDashboardPage();

    expect(await screen.findByText('Indexed')).toBeInTheDocument();

    expect(screen.getByRole('button', { name: /re-index/i })).toBeDisabled();
  });

  it('renders my videos view heading', async () => {
    mockVideosApiSuccess();

    renderDashboardPage({ view: 'videos' });

    expect(await screen.findByText('My Videos')).toBeInTheDocument();
    expect(screen.queryByText('Recent Videos')).not.toBeInTheDocument();
  });
});