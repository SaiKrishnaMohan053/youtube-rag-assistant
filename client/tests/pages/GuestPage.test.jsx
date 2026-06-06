import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';

import GuestPage from '../../src/pages/GuestPage';
import appTheme from '../../src/theme/appTheme';
import { askGuestVideoApi, createGuestSummaryApi } from '../../src/api/guestApi';

vi.mock('../../src/api/guestApi', () => ({
  createGuestSummaryApi: vi.fn(),
  askGuestVideoApi: vi.fn(),
}));

vi.mock('../../src/components/MarkdownAnswer', () => ({
  default: ({ text }) => <div>{text}</div>,
}));

const renderGuestPage = () => {
  return render(
    <ThemeProvider theme={appTheme}>
      <CssBaseline />
      <MemoryRouter>
        <GuestPage />
      </MemoryRouter>
    </ThemeProvider>
  );
};

describe('GuestPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    window.HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  it('renders guest page form', () => {
    renderGuestPage();

    expect(
      screen.getByRole('heading', {
        name: /turn youtube videos into searchable ai knowledge/i,
      })
    ).toBeInTheDocument();

    expect(screen.getByLabelText(/paste youtube url/i)).toBeInTheDocument();

    expect(
      screen.getByRole('button', { name: /generate summary/i })
    ).toBeInTheDocument();
  });

  it('shows error when generating summary without URL', async () => {
    const user = userEvent.setup();

    renderGuestPage();

    await user.click(screen.getByRole('button', { name: /generate summary/i }));

    expect(await screen.findByText('Please enter a YouTube URL')).toBeInTheDocument();
  });

  it('generates guest summary and displays it', async () => {
    const user = userEvent.setup();

    createGuestSummaryApi.mockResolvedValue({
      data: {
        sessionId: 'guest-session-1',
        summary: 'This is a generated video summary.',
      },
    });

    renderGuestPage();

    await user.type(
      screen.getByLabelText(/paste youtube url/i),
      'https://www.youtube.com/watch?v=test123'
    );

    await user.click(screen.getByRole('button', { name: /generate summary/i }));

    await waitFor(() => {
      expect(createGuestSummaryApi).toHaveBeenCalledWith(
        'https://www.youtube.com/watch?v=test123'
      );
    });

    expect(
      await screen.findByText('This is a generated video summary.')
    ).toBeInTheDocument();

    expect(window.HTMLElement.prototype.scrollIntoView).toHaveBeenCalled();
  });

  it('shows API error when summary generation fails', async () => {
    const user = userEvent.setup();

    createGuestSummaryApi.mockRejectedValue({
      response: {
        data: {
          message: 'Transcript not available',
        },
      },
    });

    renderGuestPage();

    await user.type(
      screen.getByLabelText(/paste youtube url/i),
      'https://www.youtube.com/watch?v=badvideo'
    );

    await user.click(screen.getByRole('button', { name: /generate summary/i }));

    expect(await screen.findByText('Transcript not available')).toBeInTheDocument();
  });

  it('asks a guest question after summary is generated', async () => {
    const user = userEvent.setup();

    createGuestSummaryApi.mockResolvedValue({
      data: {
        sessionId: 'guest-session-1',
        summary: 'Summary ready.',
      },
    });

    askGuestVideoApi.mockResolvedValue({
      data: {
        answer: 'This is the grounded guest answer.',
      },
    });

    renderGuestPage();

    await user.type(
      screen.getByLabelText(/paste youtube url/i),
      'https://www.youtube.com/watch?v=test123'
    );

    await user.click(screen.getByRole('button', { name: /generate summary/i }));

    expect(await screen.findByText('Summary ready.')).toBeInTheDocument();

    await user.type(screen.getByLabelText(/ask a question/i), 'What is this video about?');

    await user.click(screen.getByRole('button', { name: /^ask$/i }));

    await waitFor(() => {
      expect(askGuestVideoApi).toHaveBeenCalledWith({
        sessionId: 'guest-session-1',
        query: 'What is this video about?',
      });
    });

    expect(await screen.findByText('This is the grounded guest answer.')).toBeInTheDocument();
  });
});