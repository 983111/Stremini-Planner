import { useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import { loginWithGoogle } from '../lib/firebase';
import { Navigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { LogIn } from 'lucide-react';
import type { AuthError } from 'firebase/auth';

const FRIENDLY_AUTH_ERRORS: Record<string, string> = {
  'auth/unauthorized-domain': 'This domain is not authorized in Firebase. Add it under Authentication → Settings → Authorized domains.',
  'auth/operation-not-allowed': 'Google sign-in is currently disabled for this Firebase project. Enable Google as a sign-in provider.',
};

export function LoginPage() {
  const { user, loading } = useAuth();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  if (loading) return null;
  if (user) return <Navigate to="/" replace />;

  const handleGoogleLogin = async () => {
    setAuthError(null);
    setIsSigningIn(true);

    try {
      await loginWithGoogle();
    } catch (error) {
      const code = (error as AuthError).code;
      setAuthError(FRIENDLY_AUTH_ERRORS[code] ?? 'Sign-in failed. Please try again.');
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50">
      <div className="w-full max-w-sm rounded-xl border bg-white p-8 shadow-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-zinc-900 text-white">
            <span className="text-xl font-bold">TF</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Welcome to TaskFlow</h1>
          <p className="mt-2 text-sm text-zinc-600">The flexible, Notion-like task tracker.</p>
        </div>
        <Button onClick={handleGoogleLogin} className="w-full" size="lg" disabled={isSigningIn}>
          <LogIn className="mr-2 h-4 w-4" />
          {isSigningIn ? 'Signing in...' : 'Continue with Google'}
        </Button>
        {authError ? <p className="mt-3 text-sm text-red-600">{authError}</p> : null}
      </div>
    </div>
  );
}
