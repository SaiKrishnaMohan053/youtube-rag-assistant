import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';

import AppRoutes from '../../src/routes/AppRoutes';
import appTheme from '../../src/theme/appTheme';

const mockUseAuth = vi.fn();

vi.mock('../../src/context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('../../src/pages/GuestPage', () => ({
  default: () => <div>Guest Page</div>,
}));

vi.mock('../../src/pages/LoginPage', () => ({
  default: () => <div>Login Page</div>,
}));

vi.mock('../../src/pages/RegisterPage', () => ({
  default: () => <div>Register Page</div>,
}));

vi.mock('../../src/pages/VerifyEmailPage', () => ({
  default: () => <div>Verify Email Page</div>,
}));

vi.mock('../../src/pages/DashboardPage', () => ({
  default: ({ view }) => <div>{view === 'videos' ? 'My Videos Page' : 'Dashboard Page'}</div>,
}));

vi.mock('../../src/pages/VideoChatPage', () => ({
  default: () => <div>Video Chat Page</div>,
}));

vi.mock('../../src/pages/admin/AdminHomePage', () => ({
  default: () => <div>Admin Home Page</div>,
}));

vi.mock('../../src/pages/admin/AdminEvalPage', () => ({
  default: () => <div>Admin Eval Page</div>,
}));

vi.mock('../../src/pages/admin/AdminMetricsPage', () => ({
  default: () => <div>Admin Metrics Page</div>,
}));

vi.mock('../../src/pages/admin/AdminHealthPage', () => ({
  default: () => <div>Admin Health Page</div>,
}));

const renderRoutes = (initialPath = '/') => {
  return render(
    <ThemeProvider theme={appTheme}>
      <CssBaseline />
      <MemoryRouter initialEntries={[initialPath]}>
        <AppRoutes />
      </MemoryRouter>
    </ThemeProvider>
  );
};

describe('AppRoutes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders guest page at root', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      token: null,
      loading: false,
    });

    renderRoutes('/');

    expect(screen.getByText('Guest Page')).toBeInTheDocument();
  });

  it('renders guest page at /guest', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      token: null,
      loading: false,
    });

    renderRoutes('/guest');

    expect(screen.getByText('Guest Page')).toBeInTheDocument();
  });

  it('renders login page for unauthenticated user', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      token: null,
      loading: false,
    });

    renderRoutes('/login');

    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });

  it('renders register page for unauthenticated user', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      token: null,
      loading: false,
    });

    renderRoutes('/register');

    expect(screen.getByText('Register Page')).toBeInTheDocument();
  });

  it('redirects logged-in user from login to dashboard', () => {
    mockUseAuth.mockReturnValue({
      user: {
        role: 'user',
      },
      token: 'user-token',
      loading: false,
    });

    renderRoutes('/login');

    expect(screen.getByText('Dashboard Page')).toBeInTheDocument();
  });

  it('redirects admin from login to admin page', () => {
    mockUseAuth.mockReturnValue({
      user: {
        role: 'admin',
      },
      token: 'admin-token',
      loading: false,
    });

    renderRoutes('/login');

    expect(screen.getByText('Admin Home Page')).toBeInTheDocument();
  });

  it('renders dashboard for authenticated user', () => {
    mockUseAuth.mockReturnValue({
      user: {
        role: 'user',
      },
      token: 'user-token',
      loading: false,
    });

    renderRoutes('/dashboard');

    expect(screen.getByText('Dashboard Page')).toBeInTheDocument();
  });

  it('renders my videos page for authenticated user', () => {
    mockUseAuth.mockReturnValue({
      user: {
        role: 'user',
      },
      token: 'user-token',
      loading: false,
    });

    renderRoutes('/my-videos');

    expect(screen.getByText('My Videos Page')).toBeInTheDocument();
  });

  it('redirects unauthenticated dashboard access to login', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      token: null,
      loading: false,
    });

    renderRoutes('/dashboard');

    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });

  it('renders video chat page for authenticated user', () => {
    mockUseAuth.mockReturnValue({
      user: {
        role: 'user',
      },
      token: 'user-token',
      loading: false,
    });

    renderRoutes('/videos/video-1');

    expect(screen.getByText('Video Chat Page')).toBeInTheDocument();
  });

  it('renders admin eval route for admin', () => {
    mockUseAuth.mockReturnValue({
      user: {
        role: 'admin',
      },
      token: 'admin-token',
      loading: false,
    });

    renderRoutes('/admin/evals');

    expect(screen.getByText('Admin Eval Page')).toBeInTheDocument();
  });

  it('redirects unknown path to guest page', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      token: null,
      loading: false,
    });

    renderRoutes('/unknown-route');

    expect(screen.getByText('Guest Page')).toBeInTheDocument();
  });
});