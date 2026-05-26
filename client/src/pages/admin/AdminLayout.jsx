import { Box, Container } from '@mui/material';
import { Outlet } from 'react-router-dom';

const AdminLayout = () => {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f6f8fb', py: 4 }}>
      <Container maxWidth={false} sx={{ px: { xs: 2, md: 4 } }}>
        <Outlet />
      </Container>
    </Box>
  );
};

export default AdminLayout;