import React, { useState, useEffect } from 'react';
import { Lock, ArrowRight, Loader2, CheckCircle, AlertCircle, ShieldCheck } from 'lucide-react';
import { updatePassword } from '../services/authService';
import { supabase } from '../services/supabaseClient';

interface ResetPasswordProps {
  onComplete: () => void;
}

export const ResetPassword: React.FC<ResetPasswordProps> = ({ onComplete }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isValidSession, setIsValidSession] = useState<boolean | null>(null);

  useEffect(() => {
    // Check if we have a valid recovery session
    const checkSession = async () => {
      try {
        // Supabase automatically handles the recovery token from the URL hash
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Session error:', error);
          setIsValidSession(false);
          setError('Invalid or expired reset link. Please request a new one.');
          return;
        }

        if (session) {
          setIsValidSession(true);
        } else {
          // Try to exchange the token from URL
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          const accessToken = hashParams.get('access_token');
          const type = hashParams.get('type');
          
          if (type === 'recovery' && accessToken) {
            // Supabase should auto-handle this, but let's verify
            const { data, error: sessionError } = await supabase.auth.getSession();
            if (sessionError || !data.session) {
              setIsValidSession(false);
              setError('Invalid or expired reset link. Please request a new one.');
            } else {
              setIsValidSession(true);
            }
          } else {
            setIsValidSession(false);
            setError('Invalid reset link. Please use the link from your email.');
          }
        }
      } catch (err) {
        console.error('Error checking session:', err);
        setIsValidSession(false);
        setError('An error occurred. Please try again.');
      }
    };

    checkSession();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      await updatePassword(password);
      setSuccess(true);
      
      // Clear URL hash
      window.history.replaceState(null, '', window.location.pathname);
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        onComplete();
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToLogin = () => {
    window.history.replaceState(null, '', '/');
    onComplete();
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#020617] font-sans text-slate-200 p-4">
      {/* Background Effects */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-indigo-600/20 rounded-full blur-[150px]"></div>
        <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-violet-600/20 rounded-full blur-[150px]"></div>
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl shadow-xl shadow-indigo-500/30 mb-4">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Reset Password</h1>
          <p className="text-slate-400 mt-2">
            {success ? 'Your password has been updated' : 'Enter your new password below'}
          </p>
        </div>

        {/* Card */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 shadow-2xl">
          {/* Loading State */}
          {isValidSession === null && (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mx-auto mb-4" />
              <p className="text-slate-400">Verifying reset link...</p>
            </div>
          )}

          {/* Invalid Link State */}
          {isValidSession === false && (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              <h2 className="text-lg font-semibold text-white mb-2">Invalid Reset Link</h2>
              <p className="text-slate-400 text-sm mb-6">{error}</p>
              <button
                onClick={handleBackToLogin}
                className="w-full bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-xl font-semibold transition-all"
              >
                Back to Login
              </button>
            </div>
          )}

          {/* Success State */}
          {success && (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-emerald-500" />
              </div>
              <h2 className="text-lg font-semibold text-white mb-2">Password Updated!</h2>
              <p className="text-slate-400 text-sm mb-6">
                Your password has been successfully reset. Redirecting to login...
              </p>
              <div className="flex justify-center">
                <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
              </div>
            </div>
          )}

          {/* Password Form */}
          {isValidSession === true && !success && (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                  New Password
                </label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-3.5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={18} />
                  <input
                    type="password"
                    className="w-full bg-slate-900/50 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl pl-11 pr-4 py-3 text-white placeholder-slate-600 outline-none transition-all"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
                <p className="text-xs text-slate-500">Minimum 6 characters</p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                  Confirm Password
                </label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-3.5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={18} />
                  <input
                    type="password"
                    className="w-full bg-slate-900/50 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl pl-11 pr-4 py-3 text-white placeholder-slate-600 outline-none transition-all"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white py-3.5 rounded-xl font-bold uppercase tracking-wider text-sm shadow-lg shadow-indigo-500/20 transition-all transform hover:scale-[1.01] flex items-center justify-center gap-2 mt-4"
              >
                {isLoading ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <>
                    Reset Password
                    <ArrowRight size={18} />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleBackToLogin}
                className="w-full text-slate-400 hover:text-white text-sm font-medium py-2 transition-colors"
              >
                Cancel and return to login
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-slate-600 text-xs mt-6">
          &copy; 2026 Dreambox Advertising
        </p>
      </div>
    </div>
  );
};

export default ResetPassword;
