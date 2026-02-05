import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Spin } from 'antd';
import BasicLayout from './layouts/BasicLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Jobs from './pages/Jobs';
import Candidates from './pages/Candidates';
import Tasks from './pages/Tasks';
import Team from './pages/Team';
import SparkAnimation from './components/SparkAnimation';
import { useAuthStore } from './stores/authStore';

// Protected Route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();
  const checkAuth = useAuthStore((state) => state.checkAuth);
  const [showAnimation, setShowAnimation] = useState(false);
  const [animationComplete, setAnimationComplete] = useState(false);

  useEffect(() => {
    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Check if we should show the login animation
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      const shouldAnimate = sessionStorage.getItem('showLoginAnimation');
      if (shouldAnimate === 'true') {
        setShowAnimation(true);
        sessionStorage.removeItem('showLoginAnimation');
      } else {
        setAnimationComplete(true);
      }
    }
  }, [isAuthenticated, isLoading]);

  // Handle animation completion
  const handleAnimationComplete = () => {
    setShowAnimation(false);
    setAnimationComplete(true);
  };

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: '#0f0f1a'
      }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Show animation after login
  if (showAnimation && !animationComplete) {
    return (
      <SparkAnimation
        onComplete={handleAnimationComplete}
        showTagline={true}
        tagline="Welcome to your AI-Powered Dashboard"
        duration={3500}
      />
    );
  }

  return <>{children}</>;
}

// Manager-only Route wrapper
function ManagerRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();

  if (user?.role !== 'manager' && user?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<Login />} />

      {/* Protected routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <BasicLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="jobs" element={<Jobs />} />
        <Route path="candidates" element={<Candidates />} />
        <Route path="tasks" element={<Tasks />} />
        <Route
          path="team"
          element={
            <ManagerRoute>
              <Team />
            </ManagerRoute>
          }
        />
      </Route>

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
