import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';

import LoginPage from '../../src/pages/LoginPage';
import appTheme from '../../src/theme/appTheme';
import { loginApi, googleAuthApi } from '../../src/api/authApi';

const mockLogin = vi.fn();
const mockNavigate = vi.fn();

vi.mock('../../src/api/authApi', () => ({
  loginApi: vi.fn(),
  googleAuthApi: vi.fn(),
}));

vi.mock('../../src/context/AuthContext', () => ({
  useAuth: () => ({
    login: mockLogin,
  }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');

  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@react-oauth/google', () => ({
  GoogleLogin: ({ onSuccess }) => (
    <button
      type="button"
      onClick={() => onSuccess({ credential: 'google-token' })}
    >
      Google Login
    </button>
  ),
}));

const renderLoginPage = () => {
  return render(
    <ThemeProvider theme={appTheme}>
      <CssBaseline />
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    </ThemeProvider>
  );
};

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders login form', () => {
    renderLoginPage();

    expect(screen.getByRole('heading', { name: /login/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^login$/i })).toBeInTheDocument();
  });

  it('submits email login and redirects user to dashboard', async () => {
    const user = userEvent.setup();

    loginApi.mockResolvedValue({
      data: {
        token: 'auth-token',
        user: {
          name: 'Mohan',
          role: 'user',
        },
      },
    });

    renderLoginPage();

    await user.type(screen.getByLabelText(/email/i), 'mohan@test.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /^login$/i }));

    await waitFor(() => {
      expect(loginApi).toHaveBeenCalledWith({
        email: 'mohan@test.com',
        password: 'password123',
      });
    });

    expect(mockLogin).toHaveBeenCalledWith('auth-token', {
      name: 'Mohan',
      role: 'user',
    });

    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
  });

  it('redirects admin user to admin dashboard after login', async () => {
    const user = userEvent.setup();

    loginApi.mockResolvedValue({
      data: {
        token: 'admin-token',
        user: {
          name: 'Admin',
          role: 'admin',
        },
      },
    });

    renderLoginPage();

    await user.type(screen.getByLabelText(/email/i), 'admin@test.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /^login$/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/admin');
    });
  });

  it('shows error when email login fails', async () => {
    const user = userEvent.setup();

    loginApi.mockRejectedValue({
      response: {
        data: {
          message: 'Invalid credentials',
        },
      },
    });

    renderLoginPage();

    await user.type(screen.getByLabelText(/email/i), 'wrong@test.com');
    await user.type(screen.getByLabelText(/password/i), 'wrongpass');
    await user.click(screen.getByRole('button', { name: /^login$/i }));

    expect(await screen.findByText('Invalid credentials')).toBeInTheDocument();
  });

  it('supports Google login', async () => {
    const user = userEvent.setup();

    googleAuthApi.mockResolvedValue({
      data: {
        token: 'google-auth-token',
        user: {
          name: 'Google User',
          role: 'user',
        },
      },
    });

    renderLoginPage();

    await user.click(screen.getByRole('button', { name: /google login/i }));

    await waitFor(() => {
      expect(googleAuthApi).toHaveBeenCalledWith('google-token');
    });

    expect(mockLogin).toHaveBeenCalledWith('google-auth-token', {
      name: 'Google User',
      role: 'user',
    });

    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
  });
});