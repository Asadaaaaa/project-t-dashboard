import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { AlertCircle, Sparkles } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [identity, setIdentity] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identity || !password) {
      setError('Please fill in both fields.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await login(identity, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="h-12 w-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-xl shadow-blue-500/25 mb-3">
            <Sparkles className="h-6 w-6" />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">ProjectT</h1>
        </div>

        <Card className="border-slate-700/60 bg-slate-900/90 backdrop-blur-xl shadow-2xl text-slate-100">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl text-white">Sign In</CardTitle>
          </CardHeader>

          <CardContent>
            {error && (
              <div className="mb-4 p-3 bg-red-950/50 border border-red-800/80 rounded-lg flex items-center gap-2 text-sm text-red-200">
                <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Username</label>
                <Input
                  type="text"
                  placeholder="johndoe"
                  value={identity}
                  onChange={(e) => setIdentity(e.target.value)}
                  className="bg-slate-800/80 border-slate-700 text-white placeholder:text-slate-500 focus-visible:ring-blue-500"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Password</label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-slate-800/80 border-slate-700 text-white placeholder:text-slate-500 focus-visible:ring-blue-500"
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium h-10 shadow-lg shadow-blue-600/30"
                disabled={loading}
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
