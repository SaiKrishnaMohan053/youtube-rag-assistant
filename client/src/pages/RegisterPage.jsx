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
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import HubOutlinedIcon from '@mui/icons-material/HubOutlined';
import PersonAddAltOutlinedIcon from '@mui/icons-material/PersonAddAltOutlined';

import LoadingButton from '../components/LoadingButton';
import PageLoader from '../components/PageLoader';
import { googleAuthApi, registerApi } from '../api/authApi';
import { useAuth } from '../context/AuthContext';

const RegisterPage = () => {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const completeLogin = (response) => {
    login(response.data.token, response.data.user);
    navigate('/dashboard');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await registerApi(form);
      setForm({ name: '', email: '', password: '' });
      setMessage(response.message || 'Registration successful. Please verify your email before logging in.');
    } catch (apiError) {
      setError(apiError.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await googleAuthApi(credentialResponse.credential);
      completeLogin(response);
    } catch (apiError) {
      setError(apiError.response?.data?.message || 'Google signup failed');
      setLoading(false);
    }
  };

  if (loading) return <PageLoader text="Creating account..." />;

  return (
    <Container maxWidth={false} sx={{ minHeight: { xs: 'auto', md: 'calc(100vh - 72px)' }, display: 'flex', alignItems: 'center', px: { xs: 2, md: 4 }, py: { xs: 4, md: 3 } }}>
      <Grid container spacing={{ xs: 4, md: 6 }} alignItems="center" justifyContent="space-between" sx={{ height: '100%' }}>
        <Grid item xs={12} md={6.6}>
          <Stack spacing={2.3}>
            <Chip
              icon={<PersonAddAltOutlinedIcon />}
              label="Create your AI video library"
              color="primary"
              sx={{ alignSelf: 'flex-start' }}
            />

            <Typography
              variant="h2"
              sx={{
                fontSize: { xs: 40, md: 58, lg: 66 },
                lineHeight: 0.95,
                maxWidth: 860,
              }}
            >
              Build a searchable knowledge base from YouTube.
            </Typography>

            <Typography
              variant="h6"
              color="text.secondary"
              sx={{ maxWidth: 760, lineHeight: 1.55 }}
            >
              Create an account to save processed videos, generate summaries,
              store chat history, and use transcript-grounded RAG answers.
            </Typography>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  sm: 'repeat(3, 220px)',
                },
                gap: 2.5,
                width: '100%',
                justifyContent: 'flex-start',
                alignItems: 'stretch',
              }}
            >
              {[
                {
                  icon: <FactCheckOutlinedIcon />,
                  title: 'Grounded answers',
                  text: 'Ask questions from retrieved transcript chunks.',
                },
                {
                  icon: <HubOutlinedIcon />,
                  title: 'FAISS indexing',
                  text: 'Persist vector indexes for saved videos.',
                },
                {
                  icon: <AutoAwesomeOutlinedIcon />,
                  title: 'Reusable insights',
                  text: 'Save summaries and chats for later review.',
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
                        sx={{
                          lineHeight: 1.45,
                        }}
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
              maxWidth: 540,
              mx: 'auto',
              background: 'rgba(255,255,255,0.82)',
              backdropFilter: 'blur(20px)',
            }}
          >
            <CardContent sx={{ p: { xs: 3, md: 3.5 } }}>
              <Stack spacing={2.5}>
                <Box>
                  <Typography variant="h4">
                    Create account
                  </Typography>

                  <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                    Start with Google or use your email.
                  </Typography>
                </Box>

                {message && <Alert severity="success">{message}</Alert>}
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
                    onError={() => setError('Google signup failed')}
                  />
                </Box>

                <Divider>or create with email</Divider>

                <Box component="form" onSubmit={handleSubmit}>
                  <Stack spacing={2}>
                    <TextField
                      label="Name"
                      required
                      fullWidth
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                    />

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
                      Create Account
                    </LoadingButton>

                    <Typography variant="body2" color="text.secondary">
                      Already have an account? <Link to="/login">Login</Link>
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

export default RegisterPage;