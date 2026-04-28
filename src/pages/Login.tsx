import { useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import { loginWithGoogle } from '../lib/firebase';
import { Navigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { LogIn, Sparkles, Layout, Database, CheckCircle2 } from 'lucide-react';
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
    <div className="flex min-h-screen bg-white">
      {/* Left Side: Login Form */}
      <div className="flex flex-1 flex-col justify-center px-10 py-12 md:px-24 lg:px-32">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-10">
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-200">
               <Sparkles className="h-6 w-6" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Welcome to Stremini</h1>
            <p className="mt-3 text-zinc-500 leading-relaxed">
              The AI-powered workspace for modern teams. Organize documents, track tasks, and automate your workflow in one place.
            </p>
          </div>

          <div className="space-y-4">
            <Button 
              onClick={handleGoogleLogin} 
              className="w-full h-12 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl shadow-md transition-all font-semibold"
              disabled={isSigningIn}
            >
              {isSigningIn ? (
                <div className="flex items-center gap-2">
                   <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                   <span>Signing in...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                   <LogIn className="h-4 w-4" />
                   <span>Continue with Google</span>
                </div>
              )}
            </Button>
            
            {authError && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600 leading-relaxed">
                {authError}
              </div>
            )}
            
            <p className="text-center text-[11px] text-zinc-400 mt-6 uppercase tracking-wider font-medium">
              Secure authentication via Google Cloud
            </p>
          </div>
        </div>

        <div className="mt-auto pt-10 border-t border-zinc-100 max-w-sm mx-auto w-full">
           <p className="text-xs text-zinc-400 text-center">
             &copy; 2026 Stremini AI. All rights reserved.
           </p>
        </div>
      </div>

      {/* Right Side: Visual/Branding */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden bg-zinc-50 border-l border-zinc-100">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,#f5f3ff_0%,transparent_70%)]"></div>
        
        <div className="relative z-10 m-auto max-w-lg p-10">
           <div className="grid grid-cols-1 gap-8">
              <div className="space-y-4 p-8 bg-white/60 backdrop-blur-md rounded-3xl border border-white shadow-xl shadow-purple-500/5 translate-x-[-20px]">
                 <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                       <Layout className="w-4 h-4 text-purple-600" />
                    </div>
                    <span className="font-bold text-zinc-900">Document AI</span>
                 </div>
                 <div className="h-2 w-full bg-zinc-100 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-400 w-3/4 animate-pulse"></div>
                 </div>
                 <div className="h-2 w-1/2 bg-zinc-100 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-300 w-full"></div>
                 </div>
              </div>

              <div className="space-y-4 p-8 bg-white rounded-3xl border border-zinc-100 shadow-2xl shadow-blue-500/5 translate-x-[20px]">
                 <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                       <Database className="w-4 h-4 text-blue-600" />
                    </div>
                    <span className="font-bold text-zinc-900">Smart Databases</span>
                 </div>
                 <div className="space-y-2">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        <div className="h-2 bg-zinc-100 rounded-full flex-1"></div>
                      </div>
                    ))}
                 </div>
              </div>
           </div>
        </div>

        {/* Decorative Blobs */}
        <div className="absolute top-1/4 right-[-10%] w-[400px] h-[400px] bg-purple-500/5 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-1/4 left-[-10%] w-[300px] h-[300px] bg-blue-500/5 rounded-full blur-[80px]"></div>
      </div>
    </div>
  );
}
