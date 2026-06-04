import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  Container,
  Divider,
  Grid,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { GoogleLogin } from '@react-oauth/google';
import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import SmartToyOutlinedIcon from '@mui/icons-material/SmartToyOutlined';
import VideoLibraryOutlinedIcon from '@mui/icons-material/VideoLibraryOutlined';

import LoadingButton from '../components/LoadingButton';
import PageLoader from '../components/PageLoader';
import { googleAuthApi, loginApi } from '../api/authApi';
import { useAuth } from '../context/AuthContext';

const LoginPage = () => {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const completeLogin = (response) => {
    const authUser = response.data.user;

    login(response.data.token, authUser);

    if (authUser.role === 'admin') {
      navigate('/admin');
    } else {
      navigate('/dashboard');
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await loginApi(form);
      completeLogin(response);
    } catch (apiError) {
      setError(apiError.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setLoading(true);
    setError('');

    try {
      const response = await googleAuthApi(credentialResponse.credential);
      completeLogin(response);
    } catch (apiError) {
      setError(apiError.response?.data?.message || 'Google login failed');
      setLoading(false);
    }
  };

  if (loading) return <PageLoader text="Signing you in..." />;

  return (
    <Container maxWidth={false} disableGutters sx={{ minHeight: { xs: 'auto', md: 'calc(100vh - 72px)' }, display: 'flex', alignItems: 'center', px: { xs: 2, md: 4 }, py: { xs: 3, md: 3 } }}>
      <Grid container spacing={{ xs: 3, md: 6 }} alignItems="center" justifyContent="space-between" sx={{ height: '100%' }}>
        <Grid item xs={12} md={6.6}>
          <Stack spacing={2.3}>
            <Chip
              icon={<LockOutlinedIcon />}
              label="Secure workspace login"
              color="primary"
              sx={{ alignSelf: 'flex-start' }}
            />

            <Typography
              variant="h2"
              sx={{
                fontSize: { xs: 38, sm: 44, md: 58, lg: 66 },
                lineHeight: { xs: 1.02, md: 0.95 },
                maxWidth: 860,
              }}
            >
              Continue your AI video workspace.
            </Typography>

            <Typography
              variant="h6"
              color="text.secondary"
              sx={{ maxWidth: 760, lineHeight: { xs: 1.5, md: 1.55 }, fontSize: { xs: '1.05rem', md: '1.25rem' } }}
            >
              Sign in to access saved videos, summaries, chat history, FAISS indexes,
              and transcript-grounded AI answers.
            </Typography>

            <Box
              sx={{
                display: { xs: 'none', md: 'grid' },
                gridTemplateColumns: {
                  xs: '1fr',
                  md: 'repeat(3, 220px)',
                },
                gap: 2.5,
                width: '100%',
                justifyContent: 'flex-start',
                alignItems: 'stretch',
              }}
            >
              {[
                {
                  icon: <VideoLibraryOutlinedIcon />,
                  title: 'Saved videos',
                  text: 'Keep your processed YouTube library organized.',
                },
                {
                  icon: <SmartToyOutlinedIcon />,
                  title: 'RAG chat',
                  text: 'Ask questions using retrieved video chunks.',
                },
                {
                  icon: <AutoAwesomeOutlinedIcon />,
                  title: 'AI summaries',
                  text: 'Review transcript-based summaries anytime.',
                },
              ].map((item) => (
                <Card
                  key={item.title}
                  sx={{
                    width: '220px',
                    height: '210px',
                    borderRadius: '24px',
                    overflow: 'hidden',
                    border: '1px solid rgba(148,163,184,0.12)',
                    boxShadow: '0 18px 40px rgba(15,23,42,0.06)',
                    transition: 'all 0.25s ease',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: '0 24px 50px rgba(99,91,255,0.12)',
                    },
                  }}
                >
                  <CardContent sx={{ p: 2.3 }}>
                    <Stack spacing={1.4}>
                      <Box
                        sx={{
                          width: 42,
                          height: 42,
                          borderRadius: 4,
                          display: 'grid',
                          placeItems: 'center',
                          color: 'primary.main',
                          bgcolor: 'rgba(99,91,255,0.08)',
                        }}
                      >
                        {item.icon}
                      </Box>

                      <Typography fontWeight={900} variant="h6">
                        {item.title}
                      </Typography>

                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ lineHeight: 1.45 }}
                      >
                        {item.text}
                      </Typography>
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </Box>
          </Stack>
        </Grid>

        <Grid item xs={12} md={5}>
          <Card
            sx={{
              maxWidth: 520,
              mx: 'auto',
              background: 'rgba(255,255,255,0.82)',
              backdropFilter: 'blur(20px)',
            }}
          >
            <CardContent sx={{ p: { xs: 2.5, md: 3.5 } }}>
              <Stack spacing={2}>
                <Box>
                  <Typography variant="h4" sx={{ fontSize: { xs: '2.25rem', md: '2.5rem' } }}>
                    Login
                  </Typography>

                  <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                    Welcome back. Enter your details below.
                  </Typography>
                </Box>

                {error && <Alert severity="error">{error}</Alert>}

                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: 4,
                    bgcolor: '#f8fafc',
                    border: '1px solid rgba(148,163,184,0.24)',
                  }}
                >
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={() => setError('Google login failed')}
                  />
                </Box>

                <Divider>or continue with email</Divider>

                <Box component="form" onSubmit={handleSubmit}>
                  <Stack spacing={2}>
                    <TextField
                      label="Email"
                      type="email"
                      required
                      fullWidth
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                    />

                    <TextField
                      label="Password"
                      type="password"
                      required
                      fullWidth
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                    />

                    <LoadingButton type="submit" loading={loading}>
                      Login
                    </LoadingButton>

                    <Typography variant="body2" color="text.secondary">
                      No account? <Link to="/register">Create one</Link>
                    </Typography>
                  </Stack>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};

export default LoginPage;