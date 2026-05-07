import { Box, CircularProgress, Stack, Typography } from '@mui/material';

const PageLoader = ({ text = 'Loading...' }) => {
  return (
    <Box
      sx={{
        minHeight: '70vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Stack spacing={2} alignItems="center">
        <CircularProgress />
        <Typography color="text.secondary">{text}</Typography>
      </Stack>
    </Box>
  );
};

export default PageLoader;