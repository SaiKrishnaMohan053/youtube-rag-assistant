import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../../src/context/AuthContext';
import userEvent from '@testing-library/user-event';

vi.mock('../../src/api/authApi', () => ({
  meApi: vi.fn(),
}));

import { meApi } from '../../src/api/authApi';

const TestConsumer = () => {
  const { token, user, loading, login, logout } = useAuth();

  return (
    <div>
      <p data-testid="loading">{String(loading)}</p>
      <p data-testid="token">{token || ''}</p>
      <p data-testid="user">{user?.name || ''}</p>

      <button onClick={() => login('new-token', { name: 'Mohan', role: 'user' })}>
        Login
      </button>

      <button onClick={logout}>Logout</button>
    </div>
  );
};

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('loads user when token exists', async () => {
    localStorage.setItem('token', 'saved-token');

    meApi.mockResolvedValue({
      data: {
        user: {
          name: 'Sai',
          role: 'user',
        },
      },
    });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('Sai');
    });

    expect(screen.getByTestId('token')).toHaveTextContent('saved-token');
    expect(meApi).toHaveBeenCalledTimes(1);
  });

  it('removes invalid token when meApi fails', async () => {
    localStorage.setItem('token', 'bad-token');

    meApi.mockRejectedValue(new Error('Unauthorized'));

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    expect(localStorage.getItem('token')).toBeNull();
    expect(screen.getByTestId('token')).toHaveTextContent('');
  });

  it('login stores token and user', async () => {
    const user = userEvent.setup();

    meApi.mockResolvedValue({
        data: {
        user: {
            name: 'Mohan',
            role: 'user',
        },
        },
    });
    
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await user.click(screen.getByRole('button', { name: 'Login' }));

    await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('Mohan');
    });

    expect(localStorage.getItem('token')).toBe('new-token');
  });

  it('logout clears token and user', async () => {
    const user = userEvent.setup();

    meApi.mockResolvedValue({
        data: {
        user: {
            name: 'Mohan',
            role: 'user',
        },
        },
    });
    
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await user.click(screen.getByRole('button', { name: 'Login' }));

    await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('Mohan');
    });

    await user.click(screen.getByRole('button', { name: 'Logout' }));

    await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('');
    });

    expect(localStorage.getItem('token')).toBeNull();
  });
});