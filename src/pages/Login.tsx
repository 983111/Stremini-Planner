import { useAuth } from '../lib/AuthContext';
import { loginWithGoogle } from '../lib/firebase';
import { Navigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { LogIn } from 'lucide-react';

export function LoginPage() {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (user) return <Navigate to="/" replace />;

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
        <Button onClick={loginWithGoogle} className="w-full" size="lg">
          <LogIn className="mr-2 h-4 w-4" />
          Continue with Google
        </Button>
      </div>
    </div>
  );
}
