import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';

import RegisterPage from '../../src/pages/RegisterPage';
import appTheme from '../../src/theme/appTheme';
import { registerApi, googleAuthApi } from '../../src/api/authApi';

const mockLogin = vi.fn();
const mockNavigate = vi.fn();

vi.mock('../../src/api/authApi', () => ({
  registerApi: vi.fn(),
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
      Google Signup
    </button>
  ),
}));

const renderRegisterPage = () => {
  return render(
    <ThemeProvider theme={appTheme}>
      <CssBaseline />
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>
    </ThemeProvider>
  );
};

describe('RegisterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders register form', () => {
    renderRegisterPage();

    expect(
      screen.getByRole('heading', { name: /create account/i })
    ).toBeInTheDocument();

    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();

    expect(
      screen.getByRole('button', { name: /create account/i })
    ).toBeInTheDocument();
  });

  it('submits register form and shows success message', async () => {
    const user = userEvent.setup();

    registerApi.mockResolvedValue({
      message: 'Registration successful. Please verify your email.',
    });

    renderRegisterPage();

    await user.type(screen.getByLabelText(/name/i), 'Mohan');
    await user.type(screen.getByLabelText(/email/i), 'mohan@test.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');

    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(registerApi).toHaveBeenCalledWith({
        name: 'Mohan',
        email: 'mohan@test.com',
        password: 'password123',
      });
    });

    expect(
      await screen.findByText('Registration successful. Please verify your email.')
    ).toBeInTheDocument();
  });

  it('shows error when registration fails', async () => {
    const user = userEvent.setup();

    registerApi.mockRejectedValue({
      response: {
        data: {
          message: 'Email already exists',
        },
      },
    });

    renderRegisterPage();

    await user.type(screen.getByLabelText(/name/i), 'Mohan');
    await user.type(screen.getByLabelText(/email/i), 'existing@test.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');

    await user.click(screen.getByRole('button', { name: /create account/i }));

    expect(await screen.findByText('Email already exists')).toBeInTheDocument();
  });

  it('supports Google signup and redirects to dashboard', async () => {
    const user = userEvent.setup();

    googleAuthApi.mockResolvedValue({
      data: {
        token: 'google-token',
        user: {
          name: 'Google User',
          role: 'user',
        },
      },
    });

    renderRegisterPage();

    await user.click(screen.getByRole('button', { name: /google signup/i }));

    await waitFor(() => {
      expect(googleAuthApi).toHaveBeenCalledWith('google-token');
    });

    expect(mockLogin).toHaveBeenCalledWith('google-token', {
      name: 'Google User',
      role: 'user',
    });

    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
  });
});