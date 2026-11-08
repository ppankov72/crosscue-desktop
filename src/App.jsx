import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import CrossCue from '@/pages/CrossCue';
import AnalysisTest from '@/pages/AnalysisTest';
import Landing from '@/pages/Landing';
import Admin from '@/pages/Admin';
import AdminTrial from '@/pages/AdminTrial';
import DjProfilePage from '@/pages/DjProfile';
import AdminUsers from '@/pages/AdminUsers';
import AdminInvitations from '@/pages/AdminInvitations';
import AdminCommerce from '@/pages/AdminCommerce';
import AdminVouchers from '@/pages/AdminVouchers';
import AdminIntegrations from '@/pages/AdminIntegrations';
import AcceptInvitation from '@/pages/AcceptInvitation';
import AdminFeedback from '@/pages/AdminFeedback';
import AdminContent from '@/pages/AdminContent';
import AdminLanding from '@/pages/AdminLanding';
import AdminCms from '@/pages/AdminCms';
import AdminMarketing from '@/pages/AdminMarketing';
import CmsInstructions from '@/pages/CmsInstructions';
import CmsInstructionsMd from '@/pages/CmsInstructionsMd';
import Impressum from '@/pages/Impressum';
import PrivacyPolicy from '@/pages/PrivacyPolicy';
import Terms from '@/pages/Terms';
import Contact from '@/pages/Contact';
import Portal from '@/pages/Portal';
import Onboarding from '@/pages/Onboarding';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import OAuthConsent from '@/pages/OAuthConsent';
import RequireAuth from '@/components/RequireAuth';
import { usePageViewTracking } from '@/hooks/useAnalytics';
import MidiGuide from '@/pages/MidiGuide';
// Add page imports here

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError } = useAuth();
  usePageViewTracking();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-stone-50">
        <div className="w-8 h-8 border-4 border-stone-200 border-t-amber-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  // User-not-registered is a terminal state (authenticated but not in the app's user list)
  if (authError?.type === 'user_not_registered') {
    return <UserNotRegisteredError />;
  }

  // For auth_required or no error: render routes.
  // Public routes are accessible to everyone.
  // Protected routes use RequireAuth which redirects to /login.
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<CrossCue />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/oauth-consent" element={<OAuthConsent />} />
      <Route path="/landing" element={<CrossCue />} />
      <Route path="/dj/:slug" element={<DjProfilePage />} />

      {/* Protected routes */}
      <Route path="/studio" element={<CrossCue />} />
      <Route path="/onboarding" element={<RequireAuth><Onboarding /></RequireAuth>} />
      <Route path="/portal" element={<RequireAuth><Portal /></RequireAuth>} />
      <Route path="/analysis-test" element={<RequireAuth><AnalysisTest /></RequireAuth>} />
      <Route path="/admin" element={<RequireAuth><Admin /></RequireAuth>} />
      <Route path="/admin/trial" element={<RequireAuth><AdminTrial /></RequireAuth>} />
      <Route path="/admin/users" element={<RequireAuth><AdminUsers /></RequireAuth>} />
      <Route path="/admin/invitations" element={<RequireAuth><AdminInvitations /></RequireAuth>} />
      <Route path="/admin/commerce" element={<RequireAuth><AdminCommerce /></RequireAuth>} />
      <Route path="/admin/vouchers" element={<RequireAuth><AdminVouchers /></RequireAuth>} />
      <Route path="/admin/integrations" element={<RequireAuth><AdminIntegrations /></RequireAuth>} />
      <Route path="/admin/feedback" element={<RequireAuth><AdminFeedback /></RequireAuth>} />
      <Route path="/admin/content" element={<RequireAuth><AdminContent /></RequireAuth>} />
      <Route path="/admin/landing" element={<RequireAuth><AdminLanding /></RequireAuth>} />
      <Route path="/admin/cms" element={<RequireAuth><AdminCms /></RequireAuth>} />
      <Route path="/admin/marketing" element={<RequireAuth><AdminMarketing /></RequireAuth>} />
      <Route path="/cms-instructions" element={<CmsInstructions />} />
      <Route path="/cms-doc" element={<CmsInstructionsMd />} />
      <Route path="/midi-guide" element={<MidiGuide />} />
      <Route path="/impressum" element={<Impressum />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/invite" element={<RequireAuth><AcceptInvitation /></RequireAuth>} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App