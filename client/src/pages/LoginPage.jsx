import { Alert, Box, Card, CardContent, Container, Stack, TextField, Typography } from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import LoadingButton from '../components/LoadingButton';
import { loginApi } from '../api/authApi';
import { useAuth } from '../context/AuthContext';

const LoginPage = () => {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await loginApi(form);
      login(response.data.token, response.data.user);
      navigate('/dashboard');
    } catch (apiError) {
      setError(apiError.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Card>
        <CardContent>
          <Typography variant="h5" gutterBottom>Login</Typography>
          <Box component="form" onSubmit={handleSubmit}>
            <Stack spacing={2}>
              {error && <Alert severity="error">{error}</Alert>}
              <TextField label="Email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              <TextField label="Password" type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              <LoadingButton type="submit" loading={loading}>Login</LoadingButton>
              <Typography variant="body2">No account? <Link to="/register">Register</Link></Typography>
            </Stack>
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
};

export default LoginPage;
