import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Lock, Mail, AlertTriangle, ShieldCheck, Loader2 } from 'lucide-react';
import { useAdminAuth } from '../contexts/AdminAuthContext';
import { useToast } from '../components/ui/Toast';

export const AdminLogin: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, forgotPassword, status, error, session, clearError } = useAdminAuth();
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);

  useEffect(() => {
    if (session) {
      navigate('/', { replace: true });
    }
  }, [session, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      showToast('Welcome to SATHI Admin Console', 'success');
      navigate('/', { replace: true });
    } catch (err: any) {
      showToast(err.message || 'Authentication failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      showToast('Please enter your email address', 'error');
      return;
    }
    setLoading(true);
    try {
      await forgotPassword(email);
      showToast('Password reset email sent. Please check your inbox.', 'success');
      setShowForgot(false);
    } catch (err: any) {
      showToast(err.message || 'Failed to send reset email', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 text-primary-action animate-spin mx-auto" />
          <p className="text-sm text-text-secondary">Verifying session...</p>
        </div>
      </div>
    );
  }

  if (status === 'access_restricted') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-sm w-full bg-surface border border-border-token rounded-2xl p-8 text-center">
          <ShieldCheck className="w-12 h-12 text-warning-token mx-auto mb-4" />
          <h2 className="text-xl font-bold text-text-primary mb-2">Access Restricted</h2>
          <p className="text-sm text-text-secondary mb-6">
            You don't have permission to access the SATHI Admin Console.
          </p>
          <a
            href="/"
            className="inline-flex items-center justify-center px-6 py-3 bg-primary-action text-background rounded-xl font-bold hover:bg-primary-action-hover transition-colors"
          >
            Return to SATHI
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-sm w-full">
        {/* Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary-action/10 text-primary-action mb-4">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">SATHI</h1>
          <p className="text-sm text-text-secondary mt-1">ADMIN CONSOLE</p>
          <p className="text-xs text-text-muted mt-2">Secure access for SATHI operations</p>
        </div>

        {/* Login Card */}
        <div className="bg-surface border border-border-token rounded-2xl p-6 space-y-6">
          {!showForgot ? (
            <>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1.5">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@sathi.com"
                      required
                      className="w-full bg-surface-elevated border border-border-token rounded-xl pl-10 pr-4 py-2.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-primary-action transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1.5">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="w-full bg-surface-elevated border border-border-token rounded-xl pl-10 pr-4 py-2.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-primary-action transition-colors"
                    />
                  </div>
                </div>

                {error && (
                  <div className="flex items-start gap-2 p-3 bg-danger-token/10 border border-danger-token/30 rounded-xl">
                    <AlertTriangle className="w-4 h-4 text-danger-token shrink-0 mt-0.5" />
                    <p className="text-xs text-danger-token">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-primary-action text-background rounded-xl font-bold text-sm hover:bg-primary-action-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Sign In
                </button>
              </form>

              <div className="text-center">
                <button
                  onClick={() => setShowForgot(true)}
                  className="text-xs text-text-secondary hover:text-primary-action transition-colors"
                >
                  Forgot password?
                </button>
              </div>
            </>
          ) : (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@sathi.com"
                    required
                    className="w-full bg-surface-elevated border border-border-token rounded-xl pl-10 pr-4 py-2.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-primary-action transition-colors"
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2 p-3 bg-danger-token/10 border border-danger-token/30 rounded-xl">
                  <AlertTriangle className="w-4 h-4 text-danger-token shrink-0 mt-0.5" />
                  <p className="text-xs text-danger-token">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-primary-action text-background rounded-xl font-bold text-sm hover:bg-primary-action-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Send Reset Link
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => { setShowForgot(false); clearError(); }}
                  className="text-xs text-text-secondary hover:text-primary-action transition-colors"
                >
                  Back to login
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Security Notice */}
        <div className="mt-6 text-center">
          <div className="flex items-center justify-center gap-1.5 text-text-muted">
            <Lock className="w-3 h-3" />
            <p className="text-[10px] font-medium">Authorized personnel only.</p>
          </div>
          <p className="text-[10px] text-text-muted mt-1">
            All access is monitored and audited.
          </p>
        </div>
      </div>
    </div>
  );
};
