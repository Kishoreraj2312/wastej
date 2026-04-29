import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ErrorBoundary    from './components/ErrorBoundary';
import { ToastProvider } from './components/Toast';
import LandingPage      from './pages/LandingPage';
import LoginPage        from './pages/LoginPage';
import DashboardPage    from './pages/DashboardPage';
import RoutePage        from './pages/RoutePage';
import WasteStreamPage  from './pages/WasteStreamPage';
import AnalyticsPage    from './pages/AnalyticsPage';
import SettingsPage     from './pages/SettingsPage';
import NavigationPage   from './pages/NavigationPage';

function RequireAuth({ children }) {
  const token = localStorage.getItem('stitch_token');
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/"             element={<ErrorBoundary><LandingPage /></ErrorBoundary>} />
            <Route path="/login"        element={<ErrorBoundary><LoginPage /></ErrorBoundary>} />
            <Route path="/dashboard"    element={<RequireAuth><ErrorBoundary><DashboardPage /></ErrorBoundary></RequireAuth>} />
            <Route path="/route"        element={<RequireAuth><ErrorBoundary><RoutePage /></ErrorBoundary></RequireAuth>} />
            <Route path="/waste_stream" element={<RequireAuth><ErrorBoundary><WasteStreamPage /></ErrorBoundary></RequireAuth>} />
            <Route path="/analytics"    element={<RequireAuth><ErrorBoundary><AnalyticsPage /></ErrorBoundary></RequireAuth>} />
            <Route path="/settings"     element={<RequireAuth><ErrorBoundary><SettingsPage /></ErrorBoundary></RequireAuth>} />
            <Route path="/navigate"     element={<RequireAuth><ErrorBoundary><NavigationPage /></ErrorBoundary></RequireAuth>} />
            <Route path="*"             element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </ErrorBoundary>
  );
}
