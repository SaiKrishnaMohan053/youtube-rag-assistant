import {
  AppBar,
  Avatar,
  Box,
  Button,
  Divider,
  Drawer,
  IconButton,
  Stack,
  Toolbar,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
import MenuIcon from '@mui/icons-material/Menu';
import SmartToyOutlinedIcon from '@mui/icons-material/SmartToyOutlined';
import VideoLibraryOutlinedIcon from '@mui/icons-material/VideoLibraryOutlined';
import {
  Link as RouterLink,
  Outlet,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import { useState } from 'react';

import { useAuth } from '../../context/AuthContext';

const drawerWidth = 280;

const navItems = [
  {
    label: 'Dashboard',
    path: '/dashboard',
    icon: <DashboardOutlinedIcon />,
  },
  {
    label: 'My Videos',
    path: '/dashboard',
    icon: <VideoLibraryOutlinedIcon />,
  },
];

const SidebarContent = ({ user, location, onLogout, onClose }) => (
  <Stack spacing={3} height="100%">
    <Stack direction="row" spacing={1.5} alignItems="center">
      <Box
        sx={{
          width: 44,
          height: 44,
          borderRadius: 3,
          display: 'grid',
          placeItems: 'center',
          background: 'linear-gradient(135deg, #635bff 0%, #00c2ff 100%)',
        }}
      >
        <SmartToyOutlinedIcon />
      </Box>

      <Box sx={{ flexGrow: 1 }}>
        <Typography fontWeight={900}>YouTube RAG</Typography>
        <Typography variant="caption" sx={{ color: '#94a3b8' }}>
          Video Workspace
        </Typography>
      </Box>

      {onClose && (
        <IconButton onClick={onClose} sx={{ color: '#fff', display: { md: 'none' } }}>
          <CloseIcon />
        </IconButton>
      )}
    </Stack>

    <Divider sx={{ borderColor: 'rgba(148,163,184,0.18)' }} />

    <Stack spacing={1}>
      {navItems.map((item) => {
        const active = location.pathname === item.path;

        return (
          <Button
            key={item.label}
            component={RouterLink}
            to={item.path}
            startIcon={item.icon}
            fullWidth
            onClick={onClose}
            sx={{
              justifyContent: 'flex-start',
              color: active ? '#fff' : '#cbd5e1',
              bgcolor: active ? 'rgba(99,91,255,0.22)' : 'transparent',
              border: active
                ? '1px solid rgba(99,91,255,0.45)'
                : '1px solid transparent',
              '&:hover': {
                bgcolor: 'rgba(255,255,255,0.08)',
              },
            }}
          >
            {item.label}
          </Button>
        );
      })}
    </Stack>

    <Box sx={{ flexGrow: 1 }} />

    <Box
      sx={{
        p: 2,
        borderRadius: 4,
        bgcolor: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(148,163,184,0.16)',
      }}
    >
      <Stack direction="row" spacing={1.5} alignItems="center">
        <Avatar sx={{ bgcolor: 'primary.main' }}>
          {user?.name?.[0]?.toUpperCase() || 'U'}
        </Avatar>

        <Box sx={{ minWidth: 0 }}>
          <Typography fontWeight={800} noWrap>
            {user?.name || 'User'}
          </Typography>
          <Typography variant="caption" sx={{ color: '#94a3b8' }} noWrap>
            {user?.email}
          </Typography>
        </Box>
      </Stack>
    </Box>

    <Button
      startIcon={<LogoutOutlinedIcon />}
      onClick={onLogout}
      sx={{
        color: '#fecaca',
        justifyContent: 'flex-start',
        '&:hover': {
          bgcolor: 'rgba(239,68,68,0.12)',
        },
      }}
    >
      Logout
    </Button>
  </Stack>
);

const UserShell = () => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const onLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#f5f7fb' }}>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          display: { xs: 'block', md: 'none' },
          bgcolor: 'rgba(15,23,42,0.92)',
          backdropFilter: 'blur(18px)',
          borderBottom: '1px solid rgba(148,163,184,0.18)',
        }}
      >
        <Toolbar>
          <IconButton edge="start" onClick={() => setMobileOpen(true)} sx={{ color: '#fff' }}>
            <MenuIcon />
          </IconButton>

          <Typography fontWeight={900} sx={{ ml: 1 }}>
            YouTube RAG
          </Typography>
        </Toolbar>
      </AppBar>

      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          display: { xs: 'none', md: 'block' },
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            border: 'none',
            bgcolor: '#0f172a',
            color: '#fff',
            p: 2,
          },
        }}
      >
        <SidebarContent user={user} location={location} onLogout={onLogout} />
      </Drawer>

      <Drawer
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            border: 'none',
            bgcolor: '#0f172a',
            color: '#fff',
            p: 2,
          },
        }}
      >
        <SidebarContent
          user={user}
          location={location}
          onLogout={onLogout}
          onClose={() => setMobileOpen(false)}
        />
      </Drawer>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minWidth: 0,
          px: { xs: 2, md: 4 },
          py: { xs: 10, md: 4 },
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
};

export default UserShell;