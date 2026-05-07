import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import PageLoader from './PageLoader';

const ProtectedRoute = () => {
  const { token, loading } = useAuth();

  if (loading) {
    return <PageLoader text='Checking your session...' />;
  }

  if (!token) return <Navigate to="/login" replace />;
  return <Outlet />;
};

export default ProtectedRoute;
