import React, { useState } from 'react';
import { Mail, Lock, User, MapPin, DollarSign, Upload, ShieldCheck, Briefcase } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { authService } from '../services/auth';
import { firestore } from '../services/firestore';
import { useToast } from './ui/Toast';
import { DocumentModal } from './modals/DocumentModal';

interface AuthModalProps {
  initialMode: 'login' | 'signup' | 'guide';
  onClose: () => void;
  onSuccess?: (mode: 'login' | 'signup' | 'guide') => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ initialMode, onClose, onSuccess }) => {
  const { setCurrentUser } = useAppContext();
  const { showToast } = useToast();
  const [mode, setMode] = useState<'login' | 'signup' | 'guide'>(initialMode);
  const [agreed, setAgreed] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [location, setLocation] = useState('');
  const [rate, setRate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showDocType, setShowDocType] = useState<'terms' | 'privacy' | null>(null);

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Please enter your email address first.');
      showToast('Please enter your email address in the email field first.', 'error');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await authService.resetPassword(email);
      showToast('Password reset email sent successfully! Please check your inbox.', 'success');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to send password reset email.';
      setError(message);
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const authUser = await authService.loginWithGoogle();
      const profile = await firestore.getDocument<any>(`users/${authUser.uid}`);
      if (!profile) {
        await firestore.setDocument(`users/${authUser.uid}`, {
          name: authUser.displayName || authUser.email?.split('@')[0] || 'User',
          email: authUser.email || '',
          avatar: authUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(authUser.displayName || 'User')}&background=random`,
          role: 'customer',
          favorites: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
      setCurrentUser({
        id: authUser.uid,
        name: authUser.displayName || authUser.email?.split('@')[0] || 'User',
        email: authUser.email || '',
        avatar: authUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(authUser.displayName || 'User')}&background=random`,
        role: profile?.role || 'customer',
        favorites: profile?.favorites || [],
      });
      showToast('Welcome to SATHI!', 'success');
      if (onSuccess) onSuccess(mode);
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Google login failed.';
      setError(message);
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'login') {
        const authUser = await authService.login(email, password);
        const profile = await firestore.getDocument<any>(`users/${authUser.uid}`);
        setCurrentUser({
          id: authUser.uid,
          name: authUser.displayName || email.split('@')[0],
          email: authUser.email || email,
          avatar: authUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(authUser.displayName || email)}&background=random`,
          role: profile?.role || 'customer',
          favorites: profile?.favorites || [],
        });
        showToast('Welcome back!', 'success');
      } else if (mode === 'signup') {
        if (!agreed) {
          throw new Error('You must agree to the Terms of Service and Privacy Policy to register.');
        }
        const authUser = await authService.signup(email, password, name);
        await firestore.setDocument(`users/${authUser.uid}`, {
          name,
          email,
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
          role: 'customer',
          favorites: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        setCurrentUser({
          id: authUser.uid,
          name,
          email,
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
          role: 'customer',
          favorites: [],
        });
        showToast('Account created successfully!', 'success');
      } else if (mode === 'guide') {
        if (!agreed) {
          throw new Error('You must agree to the Terms of Service and Privacy Policy to submit your guide application.');
        }
        const authUser = await authService.signup(email, password, name);
        const companionId = `companion-${authUser.uid}`;
        await firestore.setDocument(`users/${authUser.uid}`, {
          name,
          email,
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
          role: 'customer',
          favorites: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        await firestore.setDocument(`guideApplications/${companionId}`, {
          id: companionId,
          name,
          email,
          location,
          hourlyRate: Number(rate) || 0,
          bio: '',
          gender: '',
          languages: [],
          interests: [],
          status: 'pending',
          companionId,
          appliedDate: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        setCurrentUser({
          id: authUser.uid,
          name,
          email,
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
          role: 'customer',
          favorites: [],
        });
        showToast('Guide application submitted! An admin will review your profile shortly.', 'success');
      }

      if (onSuccess) onSuccess(mode);
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setError(message);
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="auth-modal-title">
        <div className="bg-[#17191C] border border-[#2A2D31] rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
          <div className="p-6 border-b border-[#2A2D31] flex justify-between items-center bg-[#0F1113]">
            <h2 id="auth-modal-title" className="text-xl font-bold text-white flex items-center gap-2">
              {mode === 'login' ? 'Welcome Back' : mode === 'signup' ? 'Create Account' : 'Join as a Guide'}
            </h2>
            <button onClick={onClose} className="text-[#8E9299] hover:text-white transition-colors p-2 rounded-full hover:bg-white/5">
              ✕
            </button>
          </div>

          <div className="p-6 overflow-y-auto hide-scrollbar">
            <form onSubmit={handleSubmit} className="space-y-4">
              {(mode === 'signup' || mode === 'guide') && (
                <div>
                  <label htmlFor="auth-name" className="text-[10px] uppercase tracking-[0.2em] text-[#8E9299] font-bold block mb-2">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
                    <input id="auth-name" type="text" required value={name} onChange={e => setName(e.target.value)} className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#2A2D31] bg-[#1E2124] text-white focus:ring-1 focus:ring-[#C8A25E] outline-none text-sm" placeholder="John Doe" />
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="auth-email" className="text-[10px] uppercase tracking-[0.2em] text-[#8E9299] font-bold block mb-2">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
                  <input id="auth-email" type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#2A2D31] bg-[#1E2124] text-white focus:ring-1 focus:ring-[#C8A25E] outline-none text-sm" placeholder="hello@example.com" />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label htmlFor="auth-password" className="text-[10px] uppercase tracking-[0.2em] text-[#8E9299] font-bold">Password</label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      className="text-[10px] text-[#C8A25E] font-bold hover:underline uppercase tracking-wider bg-transparent border-none cursor-pointer"
                    >
                      Forgot?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
                  <input id="auth-password" type="password" required value={password} onChange={e => setPassword(e.target.value)} className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#2A2D31] bg-[#1E2124] text-white focus:ring-1 focus:ring-[#C8A25E] outline-none text-sm" placeholder="••••••••" />
                </div>
              </div>

              {error && (
                <p className="text-red-400 text-xs">{error}</p>
              )}

              {mode === 'signup' && (
                <div className="mt-4 p-4 bg-[#1E2124] border border-[#2A2D31] rounded-xl flex items-start gap-3">
                  <input type="checkbox" id="terms-signup" required checked={agreed} onChange={e => setAgreed(e.target.checked)} className="mt-1 accent-[#C8A25E] cursor-pointer" />
                  <label htmlFor="terms-signup" className="text-xs text-[#8E9299] leading-relaxed cursor-pointer">
                    I agree to the{' '}
                    <button type="button" onClick={() => setShowDocType('terms')} className="text-[#C8A25E] font-medium hover:underline inline bg-transparent border-none">Terms of Service</button>
                    {' '}and{' '}
                    <button type="button" onClick={() => setShowDocType('privacy')} className="text-[#C8A25E] font-medium hover:underline inline bg-transparent border-none">Privacy Policy</button>
                    .
                  </label>
                </div>
              )}

              {mode === 'guide' && (
                <>
                  <div>
                    <label htmlFor="auth-location" className="text-[10px] uppercase tracking-[0.2em] text-[#8E9299] font-bold block mb-2">Location / City</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
                      <input id="auth-location" type="text" required value={location} onChange={e => setLocation(e.target.value)} className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#2A2D31] bg-[#1E2124] text-white focus:ring-1 focus:ring-[#C8A25E] outline-none text-sm" placeholder="Kathmandu" />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="auth-rate" className="text-[10px] uppercase tracking-[0.2em] text-[#8E9299] font-bold block mb-2">Hourly Rate (NPR)</label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
                      <input id="auth-rate" type="number" required min="500" value={rate} onChange={e => setRate(e.target.value)} className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#2A2D31] bg-[#1E2124] text-white focus:ring-1 focus:ring-[#C8A25E] outline-none text-sm" placeholder="1500" />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase tracking-[0.2em] text-[#8E9299] font-bold block mb-2" id="auth-upload-label">Identity Verification</label>
                    <div className="w-full py-6 rounded-xl border-2 border-dashed border-[#2A2D31] bg-[#1E2124] text-[#8E9299] hover:border-[#C8A25E] hover:text-[#C8A25E] transition-colors flex flex-col items-center justify-center gap-2 cursor-pointer" role="button" tabIndex={0} aria-labelledby="auth-upload-label" onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); } }}>
                      <Upload className="w-6 h-6" />
                      <span className="text-xs">Upload Citizenship / Passport Document</span>
                    </div>
                  </div>

                  <div className="mt-4 p-4 bg-[#1E2124] border border-[#2A2D31] rounded-xl flex items-start gap-3">
                    <input type="checkbox" id="terms" required checked={agreed} onChange={e => setAgreed(e.target.checked)} className="mt-1 accent-[#C8A25E] cursor-pointer" />
                    <label htmlFor="terms" className="text-xs text-[#8E9299] leading-relaxed cursor-pointer">
                      I agree to the{' '}
                      <button type="button" onClick={() => setShowDocType('terms')} className="text-[#C8A25E] font-medium hover:underline inline bg-transparent border-none">Terms of Service</button>
                      {' '}and{' '}
                      <button type="button" onClick={() => setShowDocType('privacy')} className="text-[#C8A25E] font-medium hover:underline inline bg-transparent border-none">Privacy Policy</button>
                      , and confirm that I have undergone a mandatory background check. I understand that any violation of safety protocols will result in immediate termination.
                    </label>
                  </div>
                </>
              )}

              <button 
                type="submit"
                disabled={loading || ((mode === 'guide' || mode === 'signup') && !agreed)}
                className="w-full py-3 bg-[#C8A25E] text-[#0F1113] rounded-xl font-bold hover:bg-[#B69150] transition-colors mt-6 uppercase tracking-wider text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : mode === 'signup' ? 'Create Account' : 'Submit Application'}
              </button>
            </form>

            <div className="relative my-6 flex items-center justify-center">
              <div className="border-t border-[#2A2D31] w-full"></div>
              <span className="bg-[#17191C] px-3 text-[#8E9299] text-xs absolute">or continue with</span>
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full py-2.5 bg-white hover:bg-gray-100 text-[#17191C] rounded-xl font-bold flex items-center justify-center gap-2.5 transition-colors text-sm border border-gray-200 disabled:opacity-50"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Google
            </button>

            <div className="mt-6 text-center text-sm text-[#8E9299]">
              {mode === 'login' ? (
                <p>Don't have an account? <button onClick={() => { setMode('signup'); setAgreed(false); }} className="text-[#C8A25E] font-medium hover:underline bg-transparent border-none cursor-pointer">Sign up</button></p>
              ) : mode === 'signup' ? (
                <p>Already have an account? <button onClick={() => setMode('login')} className="text-[#C8A25E] font-medium hover:underline bg-transparent border-none cursor-pointer">Log in</button></p>
              ) : (
                <p>Just want to browse? <button onClick={() => { setMode('signup'); setAgreed(false); }} className="text-[#C8A25E] font-medium hover:underline bg-transparent border-none cursor-pointer">Create a user account</button></p>
              )}
            </div>
          </div>
        </div>
      </div>

      {showDocType && (
        <DocumentModal
          documentType={showDocType}
          onClose={() => setShowDocType(null)}
        />
      )}
    </>
  );
};
