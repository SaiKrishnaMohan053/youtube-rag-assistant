import { Alert, Card, CardContent, Container, Stack, Typography } from '@mui/material';
import { Link, useSearchParams } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import PageLoader from '../components/PageLoader';
import { verifyEmailApi } from '../api/authApi';

const VerifyEmailPage = () => { 
  const [searchParams] = useSearchParams();
  const hasVerifiedRef = useRef(false);
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('Verifying your email...');

  useEffect(() => {
    if (hasVerifiedRef.current) return;
    hasVerifiedRef.current = true;
    
    const token = searchParams.get('token');

    if (!token) {
      setStatus('error');
      setMessage('Verification token is missing.');
      return;
    }

    verifyEmailApi(token)
      .then((response) => {
        setStatus('success');
        setMessage(response.message || 'Email verified successfully. You can now login.');
      })
      .catch((error) => {
        setStatus('error');
        setMessage(error.response?.data?.message || 'Email verification failed.');
      });
  }, [searchParams]);

  if (status === 'loading') {
    return <PageLoader text='Verifying your email...' />
  }

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="h5">Email Verification</Typography>

            {status === 'success' && <Alert severity="success">{message}</Alert>}
            {status === 'error' && <Alert severity="error">{message}</Alert>}

            <Typography variant="body2">
              Go to <Link to="/login">Login</Link>
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    </Container>
  );
};

export default VerifyEmailPage;