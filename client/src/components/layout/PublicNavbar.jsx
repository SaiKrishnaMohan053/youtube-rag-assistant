import {
  AppBar,
  Box,
  Button,
  Container,
  Stack,
  Toolbar,
  Typography,
} from '@mui/material';
import SmartToyOutlinedIcon from '@mui/icons-material/SmartToyOutlined';
import { Link as RouterLink } from 'react-router-dom';

const PublicNavbar = () => {
  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        bgcolor: 'rgba(255,255,255,0.78)',
        color: 'text.primary',
        backdropFilter: 'blur(18px)',
        borderBottom: '1px solid rgba(148,163,184,0.22)',
      }}
    >
      <Container maxWidth="xl">
        <Toolbar disableGutters sx={{ minHeight: { xs: 64, sm: 72 } }}>
          <Stack
            direction="row"
            spacing={1.2}
            alignItems="center"
            component={RouterLink}
            to="/guest"
            sx={{
              color: 'inherit',
              textDecoration: 'none',
              flexGrow: 1,
            }}
          >
            <Box
              sx={{
                width: { xs: 40, sm: 42 },
                height: { xs: 40, sm: 42 },
                borderRadius: { xs: 2.5, sm: 3 },
                flexShrink: 0,
                display: 'grid',
                placeItems: 'center',
                color: '#fff',
                background:
                  'linear-gradient(135deg, #635bff 0%, #00c2ff 100%)',
                boxShadow: '0 12px 28px rgba(99,91,255,0.3)',
              }}
            >
              <SmartToyOutlinedIcon />
            </Box>

            <Box>
              <Typography fontWeight={900} lineHeight={1} sx={{ fontSize: { xs: '1rem', sm: '1.05rem' }, whiteSpace: 'nowrap' }}>
                YouTube RAG
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>
                AI Video Intelligence
              </Typography>
            </Box>
          </Stack>

          <Stack direction="row" spacing={{ xs: 0.5, sm: 1 }} alignItems="center">
            <Button component={RouterLink} to="/login" sx={{ minWidth: { xs: 52, sm: 64 }, px: { xs: 1, sm: 2 }, fontSize: { xs: '0.85rem', sm: '0.95rem' } }}>
              Login
            </Button>

            <Button variant="contained" component={RouterLink} to="/register" sx={{ minWidth: { xs: 104, sm: 132 }, px: { xs: 1.5, sm: 2.5 }, fontSize: { xs: '0.85rem', sm: '0.95rem' }, borderRadius: 999, whiteSpace: 'nowrap' }}>
              Get Started
            </Button>
          </Stack>
        </Toolbar>
      </Container>
    </AppBar>
  );
};

export default PublicNavbar;