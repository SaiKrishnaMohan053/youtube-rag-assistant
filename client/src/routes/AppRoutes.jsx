import { Navigate, Route, Routes } from 'react-router-dom';
import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';
import DashboardPage from '../pages/DashboardPage';
import VideoChatPage from '../pages/VideoChatPage';
import VerifyEmailPage from '../pages/VerifyEmailPage';
import GuestPage from '../pages/GuestPage';
import ProtectedRoute from '../components/ProtectedRoute';
import { useAuth } from '../context/AuthContext';
import AdminHomePage from '../pages/admin/AdminHomePage';
import AdminEvalPage from '../pages/admin/AdminEvalPage';
import AdminMetricsPage from '../pages/admin/AdminMetricsPage';
import AdminHealthPage from '../pages/admin/AdminHealthPage';
import AdminRoute from './AdminRoute';
import PublicLayout from '../components/layout/PublicLayout';
import UserShell from '../components/layout/UserShell';
import AdminShell from '../components/layout/AdminShell';

const getDashboardRedirect = (user) => {
  if (!user) return <Navigate to="/login" replace />;

  return user.role === 'admin' ? (
    <Navigate to="/admin" replace />
  ) : (
    <Navigate to="/dashboard" replace />
  );
};

const getPublicLanding = (user) => {
  if (user) return getDashboardRedirect(user);
  return <GuestPage />;
};

const AppRoutes = () => {
  const { user } = useAuth();

  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path='/' element={getPublicLanding(user)} />
        <Route path="/guest" element={getPublicLanding(user)} />

        <Route
          path="/login"
          element={
            user ? (
              getDashboardRedirect(user)
            ) : (
              <LoginPage />
            )
          }
        />

        <Route
          path="/register"
          element={user ? getDashboardRedirect(user) : <RegisterPage />}
        />

        <Route path="/verify-email" element={<VerifyEmailPage />} />
      </Route>

      <Route element={<AdminRoute />}>
        <Route path="/admin" element={<AdminShell />}>
          <Route index element={<AdminHomePage />} />
          <Route path="evals" element={<AdminEvalPage />} />
          <Route path="metrics" element={<AdminMetricsPage />} />
          <Route path="health" element={<AdminHealthPage />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<UserShell />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/my-videos" element={<DashboardPage view="videos" />} />
        </Route>
        <Route path="/videos/:id" element={<VideoChatPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;