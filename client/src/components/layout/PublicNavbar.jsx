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
        <Toolbar disableGutters sx={{ minHeight: 72 }}>
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
                width: 42,
                height: 42,
                borderRadius: 3,
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
              <Typography fontWeight={900} lineHeight={1}>
                YouTube RAG
              </Typography>
              <Typography variant="caption" color="text.secondary">
                AI Video Intelligence
              </Typography>
            </Box>
          </Stack>

          <Stack direction="row" spacing={1}>
            <Button component={RouterLink} to="/login">
              Login
            </Button>

            <Button variant="contained" component={RouterLink} to="/register">
              Get Started
            </Button>
          </Stack>
        </Toolbar>
      </Container>
    </AppBar>
  );
};

export default PublicNavbar;