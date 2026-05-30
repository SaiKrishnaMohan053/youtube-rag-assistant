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
    <Container maxWidth="xl" sx={{ py: { xs: 5, md: 8 } }}>
      <Grid container spacing={4} alignItems="center" justifyContent="center">
        <Grid item xs={12} md={6}>
          <Stack spacing={3}>
            <Chip
              icon={<LockOutlinedIcon />}
              label="Secure workspace login"
              color="primary"
              sx={{ alignSelf: 'flex-start' }}
            />

            <Typography
              variant="h2"
              sx={{
                fontSize: { xs: 40, md: 58 },
                lineHeight: 0.98,
                maxWidth: 650,
              }}
            >
              Continue your AI video workspace.
            </Typography>

            <Typography
              variant="h6"
              color="text.secondary"
              sx={{ maxWidth: 620, lineHeight: 1.7 }}
            >
              Sign in to access saved videos, summaries, chat history, FAISS indexes,
              and transcript-grounded AI answers.
            </Typography>

            <Grid container spacing={2}>
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
                <Grid item xs={12} sm={4} key={item.title}>
                  <Card sx={{ height: '100%' }}>
                    <CardContent>
                      <Stack spacing={1.2}>
                        <Box
                          sx={{
                            width: 44,
                            height: 44,
                            borderRadius: 3,
                            display: 'grid',
                            placeItems: 'center',
                            color: 'primary.main',
                            bgcolor: 'rgba(99,91,255,0.1)',
                          }}
                        >
                          {item.icon}
                        </Box>

                        <Typography fontWeight={900}>{item.title}</Typography>

                        <Typography variant="body2" color="text.secondary">
                          {item.text}
                        </Typography>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
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
            <CardContent sx={{ p: { xs: 3, md: 4 } }}>
              <Stack spacing={2.5}>
                <Box>
                  <Typography variant="h4">
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