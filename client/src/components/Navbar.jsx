import { AppBar, Box, Button, Toolbar, Typography } from '@mui/material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const isAdmin = user?.role === 'admin';
  const isUser = user?.role === 'user';

  const onLogout = () => {
    logout();
    navigate('/login');
  };

  const logoPath = isAdmin ? '/admin' : user ? '/dashboard' : '/guest';

  return (
    <AppBar position="sticky">
      <Toolbar>
        <Typography
          variant="h6"
          component={RouterLink}
          to={logoPath}
          sx={{
            flexGrow: 1,
            color: 'inherit',
            textDecoration: 'none',
            fontWeight: 700,
          }}
        >
          YouTube RAG Assistant
        </Typography>

        <Box sx={{ display: 'flex', gap: 1 }}>
          {!user && (
            <>
              <Button color="inherit" component={RouterLink} to="/guest">
                Try Free
              </Button>
              <Button color="inherit" component={RouterLink} to="/login">
                Login
              </Button>
              <Button color="inherit" component={RouterLink} to="/register">
                Register
              </Button>
            </>
          )}

          {isAdmin && (
            <>
              <Button color="inherit" component={RouterLink} to="/admin">
                Admin
              </Button>
              <Button color="inherit" component={RouterLink} to="/admin/evals">
                Evals
              </Button>
              <Button color="inherit" component={RouterLink} to="/admin/metrics">
                Metrics
              </Button>
              <Button color="inherit" component={RouterLink} to="/admin/health">
                Health
              </Button>
              <Button color="inherit" onClick={onLogout}>
                Logout
              </Button>
            </>
          )}

          {isUser && (
            <>
              <Button color="inherit" component={RouterLink} to="/dashboard">
                Dashboard
              </Button>
              <Button color="inherit" onClick={onLogout}>
                Logout
              </Button>
            </>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;