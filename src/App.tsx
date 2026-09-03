import { RouterProvider, useRouter, Link, Navigate, matchRoute } from '@/lib/router';
import { AuthProvider, useAuth } from '@/lib/auth';
import type { ReactNode } from 'react';
import Navbar from '@/components/Navbar';
import Landing from '@/pages/Landing';
import Login from '@/pages/Login';
import Signup from '@/pages/Signup';
import Dashboard from '@/pages/Dashboard';
import CreateInterview from '@/pages/CreateInterview';
import QuickMock from '@/pages/QuickMock';
import InterviewSession from '@/pages/InterviewSession';
import InterviewSummary from '@/pages/InterviewSummary';
import Settings from '@/pages/Settings';
import EmotionTest from '@/pages/EmotionTest';
import VoiceTest from '@/pages/VoiceTest';
import FusionTest from '@/pages/FusionTest';

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-primary-600" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function Routes() {
  const { path } = useRouter();

  if (path === '/' || path === '') return <Landing />;
  if (path === '/login') return <Login />;
  if (path === '/signup') return <Signup />;
  if (matchRoute('/dashboard', path)) return <ProtectedRoute><Dashboard /></ProtectedRoute>;
  if (matchRoute('/create', path)) return <ProtectedRoute><CreateInterview /></ProtectedRoute>;
  if (matchRoute('/quick', path)) return <ProtectedRoute><QuickMock /></ProtectedRoute>;
  if (matchRoute('/interview/:id', path)) return <ProtectedRoute><InterviewSession /></ProtectedRoute>;
  if (matchRoute('/summary/:id', path)) return <ProtectedRoute><InterviewSummary /></ProtectedRoute>;
  if (matchRoute('/settings', path)) return <ProtectedRoute><Settings /></ProtectedRoute>;
  if (path === '/emotion-test') return <ProtectedRoute><EmotionTest /></ProtectedRoute>;
  if (path === '/voice-test') return <ProtectedRoute><VoiceTest /></ProtectedRoute>;
  if (path === '/fusion-test') return <ProtectedRoute><FusionTest /></ProtectedRoute>;

  return <Landing />;
}

function App() {
  return (
    <AuthProvider>
      <RouterProvider>
        <div className="min-h-screen bg-gray-50">
          <Navbar />
          <Routes />
        </div>
      </RouterProvider>
    </AuthProvider>
  );
}

export default App;
