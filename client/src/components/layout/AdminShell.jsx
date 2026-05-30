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
import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined';
import CloseIcon from '@mui/icons-material/Close';
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import HealthAndSafetyOutlinedIcon from '@mui/icons-material/HealthAndSafetyOutlined';
import InsightsOutlinedIcon from '@mui/icons-material/InsightsOutlined';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
import MenuIcon from '@mui/icons-material/Menu';
import {
  Link as RouterLink,
  Outlet,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import { useState } from 'react';

import { useAuth } from '../../context/AuthContext';

const drawerWidth = 290;

const navItems = [
  {
    label: 'Overview',
    path: '/admin',
    icon: <DashboardOutlinedIcon />,
  },
  {
    label: 'Evals',
    path: '/admin/evals',
    icon: <FactCheckOutlinedIcon />,
  },
  {
    label: 'Metrics',
    path: '/admin/metrics',
    icon: <InsightsOutlinedIcon />,
  },
  {
    label: 'Health',
    path: '/admin/health',
    icon: <HealthAndSafetyOutlinedIcon />,
  },
];

const SidebarContent = ({ user, location, onLogout, onClose }) => (
  <Stack spacing={3} height="100%">
    <Stack direction="row" spacing={1.5} alignItems="center">
      <Box
        sx={{
          width: 46,
          height: 46,
          borderRadius: 3,
          display: 'grid',
          placeItems: 'center',
          background: 'linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%)',
          boxShadow: '0 16px 35px rgba(124,58,237,0.32)',
        }}
      >
        <AdminPanelSettingsOutlinedIcon />
      </Box>

      <Box sx={{ flexGrow: 1 }}>
        <Typography fontWeight={900}>AI Ops Center</Typography>
        <Typography variant="caption" sx={{ color: '#94a3b8' }}>
          Admin Control Panel
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
              bgcolor: active ? 'rgba(124,58,237,0.24)' : 'transparent',
              border: active
                ? '1px solid rgba(124,58,237,0.5)'
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
        <Avatar sx={{ bgcolor: '#7c3aed' }}>
          {user?.name?.[0]?.toUpperCase() || 'A'}
        </Avatar>

        <Box sx={{ minWidth: 0 }}>
          <Typography fontWeight={800} noWrap>
            {user?.name || 'Admin'}
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

const AdminShell = () => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const onLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#020617' }}>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          display: { xs: 'block', md: 'none' },
          bgcolor: 'rgba(2,6,23,0.94)',
          backdropFilter: 'blur(18px)',
          borderBottom: '1px solid rgba(148,163,184,0.18)',
        }}
      >
        <Toolbar>
          <IconButton edge="start" onClick={() => setMobileOpen(true)} sx={{ color: '#fff' }}>
            <MenuIcon />
          </IconButton>

          <Typography fontWeight={900} sx={{ ml: 1 }}>
            AI Ops Center
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
            color: '#fff',
            p: 2,
            background:
              'linear-gradient(180deg, #020617 0%, #0f172a 55%, #111827 100%)',
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
            color: '#fff',
            p: 2,
            background:
              'linear-gradient(180deg, #020617 0%, #0f172a 55%, #111827 100%)',
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
          p: { xs: 2, md: 4 },
          pt: { xs: 10, md: 4 },
          background:
            'radial-gradient(circle at top left, rgba(124,58,237,0.16), transparent 28%), radial-gradient(circle at top right, rgba(6,182,212,0.12), transparent 30%), #020617',
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
};

export default AdminShell;