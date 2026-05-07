import { Alert, Box, Card, CardContent, Container, Divider, Stack, TextField, Typography } from '@mui/material';
import { GoogleLogin } from '@react-oauth/google';
import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
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

  if (loading) return <PageLoader text='Creating account...' />;

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="h5">Create account</Typography>

            {message && <Alert severity="success">{message}</Alert>}
            {error && <Alert severity="error">{error}</Alert>}

            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => setError('Google signup failed')}
            />

            <Divider>or</Divider>

            <Box component="form" onSubmit={handleSubmit}>
              <Stack spacing={2}>
                <TextField
                  label="Name"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />

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
                  Register
                </LoadingButton>

                <Typography variant="body2">
                  Already have an account? <Link to="/login">Login</Link>
                </Typography>
              </Stack>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </Container>
  );
};

export default RegisterPage;