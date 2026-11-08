import { Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

// Auth guard for protected routes. Redirects to /login if unauthenticated.
// Preserves the current path in returnTo so login can redirect back.
export default function RequireAuth({ children }) {
  const { isAuthenticated, authError, isLoadingAuth, isLoadingPublicSettings } = useAuth();

  if (isLoadingPublicSettings || (isLoadingAuth && !authError)) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  if (authError?.type === 'user_not_registered') {
    return <UserNotRegisteredError />;
  }

  if (!isAuthenticated) {
    const returnTo = window.location.pathname + window.location.search;
    return <Navigate to={`/login?returnTo=${encodeURIComponent(returnTo)}`} replace />;
  }

  return children;
}