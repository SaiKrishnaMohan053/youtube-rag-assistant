import { BrowserRouter } from 'react-router-dom';
import { CssBaseline, ThemeProvider, Box } from '@mui/material';
import AppRoutes from './routes/AppRoutes';
import PageLoader from './components/PageLoader';
import useNavigationLoader from './hooks/useNavigationLoader';
import { AuthProvider } from './context/AuthContext';
import appTheme from './theme/appTheme';

const AppContent = () => {
  const navLoading = useNavigationLoader();

  return (
    <Box sx={{ minHeight: '100vh' }}>
      {navLoading ? <PageLoader text="Loading..." /> : <AppRoutes />}
    </Box>
  );
};

const App = () => (
  <ThemeProvider theme={appTheme}>
    <CssBaseline />
    <AuthProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </AuthProvider>
  </ThemeProvider>
);

export default App;