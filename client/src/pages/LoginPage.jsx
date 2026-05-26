import { Alert, Box, Card, CardContent, Container, Divider, Stack, TextField, Typography } from '@mui/material';
import { GoogleLogin } from '@react-oauth/google';
import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
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

  if (loading) return <PageLoader text='Signing you in...' />;

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="h5">Login</Typography>

            {error && <Alert severity="error">{error}</Alert>}

            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => setError('Google login failed')}
            />

            <Divider>or</Divider>

            <Box component="form" onSubmit={handleSubmit}>
              <Stack spacing={2}>
                <TextField
                  label="Email"
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />

                <TextField
                  label="Password"
                  type="password"
                  required
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />

                <LoadingButton type="submit" loading={loading}>
                  Login
                </LoadingButton>

                <Typography variant="body2">
                  No account? <Link to="/register">Register</Link>
                </Typography>
              </Stack>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </Container>
  );
};

export default LoginPage;