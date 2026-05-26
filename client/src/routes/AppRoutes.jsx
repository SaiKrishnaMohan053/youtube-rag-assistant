import { Navigate, Route, Routes } from 'react-router-dom';
import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';
import DashboardPage from '../pages/DashboardPage';
import VideoChatPage from '../pages/VideoChatPage';
import VerifyEmailPage from '../pages/VerifyEmailPage';
import GuestPage from '../pages/GuestPage';
import ProtectedRoute from '../components/ProtectedRoute';
import { useAuth } from '../context/AuthContext';
import AdminLayout from '../pages/admin/AdminLayout';
import AdminHomePage from '../pages/admin/AdminHomePage';
import AdminEvalPage from '../pages/admin/AdminEvalPage';
import AdminMetricsPage from '../pages/admin/AdminMetricsPage';
import AdminHealthPage from '../pages/admin/AdminHealthPage';
import AdminRoute from './AdminRoute';

const getHomeRedirect = (user) => {
  if (!user) return <GuestPage />;
  return user.role === 'admin'
    ? <Navigate to="/admin" replace />
    : <Navigate to="/dashboard" replace />;
};

const AppRoutes = () => {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/" element={getHomeRedirect(user)} />
      <Route path="/guest" element={getHomeRedirect(user)} />

      <Route
        path="/login"
        element={
          user ? (
            user.role === 'admin' ? (
              <Navigate to="/admin" replace />
            ) : (
              <Navigate to="/dashboard" replace />
            )
          ) : (
            <LoginPage />
          )
        }
      />

      <Route
        path="/register"
        element={user ? <Navigate to="/" replace /> : <RegisterPage />}
      />

      <Route path="/verify-email" element={<VerifyEmailPage />} />

      <Route element={<AdminRoute />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminHomePage />} />
          <Route path="evals" element={<AdminEvalPage />} />
          <Route path="metrics" element={<AdminMetricsPage />} />
          <Route path="health" element={<AdminHealthPage />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/videos/:id" element={<VideoChatPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;