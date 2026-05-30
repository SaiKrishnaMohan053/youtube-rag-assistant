import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Stack,
  Typography,
} from '@mui/material';
import CheckCircleOutlineOutlinedIcon from '@mui/icons-material/CheckCircleOutlineOutlined';
import ErrorOutlineOutlinedIcon from '@mui/icons-material/ErrorOutlineOutlined';
import MarkEmailReadOutlinedIcon from '@mui/icons-material/MarkEmailReadOutlined';
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
    return <PageLoader text="Verifying your email..." />;
  }

  const isSuccess = status === 'success';

  return (
    <Container maxWidth="md" sx={{ py: { xs: 6, md: 10 } }}>
      <Card
        sx={{
          maxWidth: 680,
          mx: 'auto',
          textAlign: 'center',
          background: 'rgba(255,255,255,0.84)',
          backdropFilter: 'blur(20px)',
        }}
      >
        <CardContent sx={{ p: { xs: 4, md: 6 } }}>
          <Stack spacing={3} alignItems="center">
            <Box
              sx={{
                width: 92,
                height: 92,
                borderRadius: 7,
                display: 'grid',
                placeItems: 'center',
                color: '#fff',
                background: isSuccess
                  ? 'linear-gradient(135deg, #16a34a 0%, #22c55e 100%)'
                  : 'linear-gradient(135deg, #dc2626 0%, #f97316 100%)',
                boxShadow: isSuccess
                  ? '0 18px 45px rgba(34,197,94,0.28)'
                  : '0 18px 45px rgba(239,68,68,0.25)',
              }}
            >
              {isSuccess ? (
                <CheckCircleOutlineOutlinedIcon sx={{ fontSize: 48 }} />
              ) : (
                <ErrorOutlineOutlinedIcon sx={{ fontSize: 48 }} />
              )}
            </Box>

            <Chip
              icon={<MarkEmailReadOutlinedIcon />}
              label={isSuccess ? 'Email verified' : 'Verification issue'}
              color={isSuccess ? 'success' : 'error'}
            />

            <Box>
              <Typography variant="h3">
                {isSuccess ? 'You are verified' : 'Verification failed'}
              </Typography>

              <Typography color="text.secondary" sx={{ mt: 1.5, maxWidth: 520 }}>
                {isSuccess
                  ? 'Your account is ready. Login and start building your AI video library.'
                  : 'We could not verify your email with this link. The token may be missing, expired, or invalid.'}
              </Typography>
            </Box>

            <Alert
              severity={isSuccess ? 'success' : 'error'}
              sx={{ width: '100%', textAlign: 'left' }}
            >
              {message}
            </Alert>

            <Button variant="contained" component={Link} to="/login">
              Go to Login
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Container>
  );
};

export default VerifyEmailPage;