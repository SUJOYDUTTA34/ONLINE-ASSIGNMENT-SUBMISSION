import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { LandingPage } from './components/public/LandingPage';
import { AuthModal } from './components/public/AuthModal';
import { ForgotPasswordModal } from './components/public/ForgotPasswordModal';
import { Layout } from './components/layout/Layout';
import { GraduationCap, ArrowRight, Eye } from 'lucide-react';

const AppContent: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();

  // Background sync with Cloudflare D1 database
  React.useEffect(() => {
    fetch('/api/sync-d1', { method: 'POST' }).catch(() => {});
  }, []);

  // Auth Modals
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);

  // Allow authenticated users to view the marketing landing page if they wish
  const [viewLandingWhenAuth, setViewLandingWhenAuth] = useState(false);

  const handleOpenLogin = () => {
    setAuthModalMode('login');
    setAuthModalOpen(true);
  };

  const handleOpenRegister = () => {
    setAuthModalMode('register');
    setAuthModalOpen(true);
  };

  // If user is authenticated and hasn't chosen to view landing page
  if (isAuthenticated && user && !viewLandingWhenAuth) {
    return (
      <div className="relative min-h-screen">
        <Layout
          onLogoutToLanding={() => {
            logout();
            setViewLandingWhenAuth(false);
          }}
        />

        {/* Floating preview button to view public university landing page */}
        <div className="fixed bottom-4 left-4 z-40">
          <button
            onClick={() => setViewLandingWhenAuth(true)}
            className="px-3 py-1.5 rounded-full bg-slate-900/90 hover:bg-slate-800 text-white dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold shadow-lg border border-slate-700 flex items-center gap-1.5 backdrop-blur-xs transition-all hover:scale-105"
            title="Preview public university landing page"
          >
            <Eye className="w-3.5 h-3.5 text-blue-400" />
            View University Portal Home
          </button>
        </div>
      </div>
    );
  }

  // Public Landing Page View (Unauthenticated OR user chose to view landing page)
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors">
      {/* Return to Dashboard Banner if user is logged in */}
      {isAuthenticated && user && (
        <div className="sticky top-0 z-50 bg-blue-600 text-white text-xs font-semibold py-2 px-4 shadow-md flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-4 h-4" />
            <span>
              Signed in as <strong>{user.name}</strong> ({user.role.toUpperCase()})
            </span>
          </div>
          <button
            onClick={() => setViewLandingWhenAuth(false)}
            className="px-3 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-white flex items-center gap-1 transition-all"
          >
            <span>Return to Workspace</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Landing Page */}
      <LandingPage
        onOpenLogin={handleOpenLogin}
        onOpenRegister={handleOpenRegister}
      />

      {/* Authentication Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authModalMode}
        onOpenForgotPassword={() => {
          setAuthModalOpen(false);
          setForgotPasswordOpen(true);
        }}
      />

      {/* Password Reset Modal */}
      <ForgotPasswordModal
        isOpen={forgotPasswordOpen}
        onClose={() => setForgotPasswordOpen(false)}
        onBackToLogin={() => {
          setForgotPasswordOpen(false);
          setAuthModalMode('login');
          setAuthModalOpen(true);
        }}
      />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <AppContent />
      </NotificationProvider>
    </AuthProvider>
  );
}
