import { BrowserRouter } from 'react-router-dom';
import { CssBaseline, ThemeProvider, createTheme, Box } from '@mui/material';
import Navbar from './components/Navbar';
import AppRoutes from './routes/AppRoutes';
import PageLoader from './components/PageLoader';
import useNavigationLoader from './hooks/useNavigationLoader';
import { AuthProvider } from './context/AuthContext';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#1976d2' },
  },
});

const AppContent = () => {
  const navLoading = useNavigationLoader();

  return (
    <Box>
      {navLoading && <PageLoader text='Loading...' />}
      <Navbar />
      <AppRoutes />
    </Box>
  )
}

const App = () => (
  <ThemeProvider theme={theme}>
    <CssBaseline />
    <AuthProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </AuthProvider>
  </ThemeProvider>
);

export default App;
