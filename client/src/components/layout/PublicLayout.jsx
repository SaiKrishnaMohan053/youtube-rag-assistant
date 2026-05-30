import { Box } from '@mui/material';
import { Outlet } from 'react-router-dom';
import PublicNavbar from './PublicNavbar';

const PublicLayout = () => {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        background:
          'radial-gradient(circle at 15% 10%, rgba(99,91,255,0.16), transparent 28%), radial-gradient(circle at 85% 15%, rgba(0,194,255,0.14), transparent 30%), #f5f7fb',
      }}
    >
      <PublicNavbar />
      <Outlet />
    </Box>
  );
};

export default PublicLayout;