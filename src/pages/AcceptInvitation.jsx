import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Loader2, Mail, CheckCircle, XCircle, Crown, Music } from 'lucide-react';

// Invitation acceptance page — /invite?token=xxx
// Handles both unauthenticated (show invitation details) and authenticated (accept) flows.
export default function AcceptInvitation() {
  const navigate = useNavigate();
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [invitation, setInvitation] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get('token') || '';
    setToken(t);
    if (!t) {
      setError('no_token');
      setLoading(false);
      return;
    }
    // Check if user is authenticated first
    base44.auth.isAuthenticated().then(authenticated => {
      if (!authenticated) {
        // Not authenticated — redirect to login with return URL
        base44.auth.redirectToLogin(window.location.pathname + window.location.search);
        return;
      }
      // Authenticated — fetch invitation details
      base44.functions.invoke('acceptInvitation', { token: t })
        .then(res => {
          if (res.data?.requiresAuth) {
            setInvitation(res.data.invitation);
          } else if (res.data?.ok) {
            setResult(res.data);
          } else if (res.data?.error) {
            setError(res.data.error);
          }
        })
        .catch(() => setError('fetch_failed'))
        .finally(() => setLoading(false));
    });
  }, []);

  const handleAccept = async () => {
    setAccepting(true);
    try {
      const res = await base44.functions.invoke('acceptInvitation', { token });
      if (res.data?.ok) {
        setResult(res.data);
      } else if (res.data?.error) {
        setError(res.data.error);
      }
    } catch (e) {
      setError(e.message);
    }
    setAccepting(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-950">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  if (error) {
    const errorMessages = {
      no_token: 'No invitation token provided.',
      invalid_token: 'This invitation link is invalid.',
      invitation_expired: 'This invitation has expired.',
      invitation_revoked: 'This invitation has been revoked.',
      invitation_accepted: 'This invitation has already been used.',
      email_mismatch: 'This invitation was sent to a different email address.',
      fetch_failed: 'Could not verify invitation. Please try again.'
    };
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-stone-950 px-6 text-center">
        <XCircle className="h-12 w-12 text-red-500" />
        <h1 className="text-2xl font-bold text-stone-200">Invitation Invalid</h1>
        <p className="text-stone-500">{errorMessages[error] || error}</p>
        <Link to="/" className="rounded-lg bg-amber-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-amber-700">
          Back to CROSSCUE
        </Link>
      </div>
    );
  }

  if (result?.ok) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-stone-950 px-6 text-center">
        <CheckCircle className="h-12 w-12 text-green-500" />
        <h1 className="text-2xl font-bold text-stone-200">Welcome to CROSSCUE!</h1>
        <p className="text-stone-500">
          Your invitation has been accepted.
          {result.roleAssigned && <span> You are now a <strong className="text-amber-400">{result.roleAssigned}</strong>.</span>}
          {result.entitlementGranted && result.entitlementGranted !== 'none' && (
            <span> You have been granted <strong className="text-amber-400">{result.entitlementGranted}</strong> access.</span>
          )}
        </p>
        <button onClick={() => navigate('/')} className="rounded-lg bg-amber-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-amber-700">
          Launch CROSSCUE
        </button>
      </div>
    );
  }

  if (invitation) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-950 px-6">
        <div className="w-full max-w-md rounded-2xl border border-stone-800 bg-stone-900 p-8">
          <div className="mb-6 text-center">
            <Music className="mx-auto h-12 w-12 text-amber-500" />
            <h1 className="mt-3 text-2xl font-bold text-stone-200">CROSSCUE Invitation</h1>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2 text-stone-400">
              <Mail size={16} className="text-amber-500" />
              <span>Sent to: <strong className="text-stone-200">{invitation.email}</strong></span>
            </div>
            <div className="flex items-center gap-2 text-stone-400">
              <Crown size={16} className="text-amber-500" />
              <span>Role: <strong className="text-stone-200 capitalize">{invitation.role_to_assign}</strong></span>
            </div>
            {invitation.entitlement_to_grant && invitation.entitlement_to_grant !== 'none' && (
              <div className="flex items-center gap-2 text-stone-400">
                <span>Access: <strong className="text-stone-200 capitalize">{invitation.entitlement_to_grant}</strong></span>
              </div>
            )}
            {invitation.campaign && (
              <div className="text-stone-500">Campaign: {invitation.campaign}</div>
            )}
          </div>

          <button
            onClick={handleAccept}
            disabled={accepting}
            className="mt-6 w-full rounded-xl bg-amber-600 py-3 text-center font-bold text-white hover:bg-amber-700 disabled:opacity-50"
          >
            {accepting ? <Loader2 size={18} className="mx-auto animate-spin" /> : 'Accept Invitation'}
          </button>
        </div>
      </div>
    );
  }

  return null;
}