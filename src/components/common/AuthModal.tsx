/**
 * LAKNES Authentication Modal
 * Complete authentication system for both User and Project accounts:
 * - Two distinct account experiences: USER ACCOUNT and PROJECT ACCOUNT
 * - Automatic & One-Click Google Sign-In with popup account selection and instant approval
 * - Standard Email/Password registration & login with salted hashing
 * - Input validation (email regex, password requirements, confirmation check)
 * - Session persistence with Bearer tokens
 * - Project Representative routing: redirects existing project owners to their dashboard,
 *   or guides new project creators to complete their project profile onboarding
 */

import React, { useState, useEffect } from 'react';
import { BrandLogo } from './BrandLogo.tsx';
import { laknesClient } from '../../client/api-client.ts';
import { triggerGoogleSignIn } from '../../client/firebase-auth.ts';

interface AuthModalProps {
  isOpen: boolean;
  initialMode?: 'login' | 'register';
  initialAccountType?: 'user' | 'project';
  onClose: () => void;
  onLogin: (email: string, password?: string) => Promise<any>;
  onRegister: (username: string, email: string, password?: string, bio?: string) => Promise<any>;
  onGoogleLogin?: (payload: { credential?: string; email?: string; name?: string; picture?: string }) => Promise<any>;
  onOpenProjectDashboard?: (projectId: string) => void;
  onNavigateToProjectOnboarding?: () => void;
  onUserSuccess?: () => void;
}

declare global {
  interface Window {
    google?: any;
  }
}

export function AuthModal({
  isOpen,
  initialMode = 'login',
  initialAccountType = 'user',
  onClose,
  onLogin,
  onRegister,
  onGoogleLogin,
  onOpenProjectDashboard,
  onNavigateToProjectOnboarding,
  onUserSuccess,
}: AuthModalProps) {
  const [accountType, setAccountType] = useState<'user' | 'project'>(initialAccountType);
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);

  // Form Fields
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [bio, setBio] = useState('');

  // Status & Feedback
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync state on open
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setAccountType(initialAccountType);
      setError(null);
      setSuccessMsg(null);
      setPassword('');
      setConfirmPassword('');
    }
  }, [isOpen, initialMode, initialAccountType]);

  // Load Google Client configuration for GSI button if available
  useEffect(() => {
    if (!isOpen) return;

    laknesClient
      .getGoogleConfig()
      .then((cfg) => {
        if (cfg.clientId && typeof window !== 'undefined' && window.google?.accounts?.id) {
          try {
            window.google.accounts.id.initialize({
              client_id: cfg.clientId,
              callback: handleGoogleCredentialResponse,
              auto_select: false,
              cancel_on_tap_outside: true,
            });
          } catch (err) {
            console.warn('GSI init note:', err);
          }
        }
      })
      .catch(() => {
        // Handled via Firebase Auth popup
      });
  }, [isOpen, mode, accountType]);

  const handlePostAuthRouting = async (authenticatedUser: any) => {
    if (!authenticatedUser?.id) {
      setTimeout(() => onClose(), 600);
      return;
    }

    if (accountType === 'project') {
      try {
        const userProjects = await laknesClient.getUserProjects(authenticatedUser.id);
        if (userProjects && userProjects.length > 0) {
          setSuccessMsg(`Welcome, Representative! Opening ${userProjects[0].name} dashboard...`);
          setTimeout(() => {
            onClose();
            if (onOpenProjectDashboard) {
              onOpenProjectDashboard(userProjects[0].id);
            }
          }, 800);
          return;
        } else {
          setSuccessMsg('Identity verified! Redirecting to complete your Project Profile...');
          setTimeout(() => {
            onClose();
            if (onNavigateToProjectOnboarding) {
              onNavigateToProjectOnboarding();
            }
          }, 800);
          return;
        }
      } catch (err) {
        console.warn('Error fetching project memberships for post-auth routing', err);
        setSuccessMsg('Authenticated! Opening Project Registration...');
        setTimeout(() => {
          onClose();
          if (onNavigateToProjectOnboarding) {
            onNavigateToProjectOnboarding();
          }
        }, 800);
        return;
      }
    } else {
      // User account flow
      setSuccessMsg('Signed in successfully! Welcome to LAKNES.');
      setTimeout(() => {
        onClose();
        if (onUserSuccess) {
          onUserSuccess();
        }
      }, 700);
    }
  };

  const handleGoogleCredentialResponse = async (response: any) => {
    if (!response?.credential) return;
    setIsSubmitting(true);
    setError(null);
    try {
      let authResult: any;
      if (onGoogleLogin) {
        authResult = await onGoogleLogin({ credential: response.credential });
      } else {
        authResult = await laknesClient.authenticateWithGoogle({ credential: response.credential });
      }
      await handlePostAuthRouting(authResult?.user);
    } catch (err: any) {
      setError(err?.message || 'Google authentication failed.');
      setIsSubmitting(false);
    }
  };

  /**
   * One-click Google Sign-In with real Google Account selection
   * Opens the standard Google popup where the user selects their Gmail and approves.
   */
  const handleTriggerGoogleAuth = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const googleRes = await triggerGoogleSignIn();

      const payload = {
        credential: googleRes.idToken,
        email: googleRes.email,
        name: googleRes.name,
        picture: googleRes.picture,
      };

      let authResult: any;
      if (onGoogleLogin) {
        authResult = await onGoogleLogin(payload);
      } else {
        authResult = await laknesClient.authenticateWithGoogle(payload);
      }

      await handlePostAuthRouting(authResult?.user);
    } catch (err: any) {
      if (
        err?.code === 'auth/popup-closed-by-user' ||
        err?.code === 'auth/cancelled-popup-request' ||
        err?.message?.includes('closed-by-user')
      ) {
        // User closed the popup window without completing
        setIsSubmitting(false);
        return;
      }

      // If popup was blocked or failed, try GSI prompt fallback if available
      if (window.google?.accounts?.id) {
        try {
          window.google.accounts.id.prompt();
          return;
        } catch {
          // ignore
        }
      }

      console.error('Google Sign-In error:', err);
      setError(err?.message || 'Google Sign-In failed. Please try again.');
      setIsSubmitting(false);
    }
  };

  const validateForm = (): boolean => {
    setError(null);

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email.trim())) {
      setError('Please provide a valid email address (e.g. name@domain.com).');
      return false;
    }

    // Password validation
    if (!password) {
      setError('Password is required.');
      return false;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return false;
    }

    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    if (!hasLetter || !hasNumber) {
      setError('Password must contain both letters and numbers for account security.');
      return false;
    }

    if (mode === 'register') {
      if (!displayName.trim() || displayName.trim().length < 3) {
        setError('Display name / username must be at least 3 characters long.');
        return false;
      }

      if (password !== confirmPassword) {
        setError('Passwords do not match. Please verify your confirmation password.');
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setError(null);
    setIsSubmitting(true);
    try {
      let authResult: any;
      if (mode === 'login') {
        authResult = await onLogin(email.trim(), password);
      } else {
        const registrationBio =
          bio.trim() ||
          (accountType === 'project'
            ? 'Authorized Project Representative on Elysium'
            : 'Community member exploring the Elysium ecosystem');
        authResult = await onRegister(displayName.trim(), email.trim().toLowerCase(), password, registrationBio);
      }
      await handlePostAuthRouting(authResult?.user);
    } catch (err: any) {
      setError(err?.message || 'Authentication failed. Please check your credentials.');
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-surface-container-low border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 relative overflow-hidden text-left"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isSubmitting}
          className="absolute top-4 right-4 text-on-surface-variant hover:text-on-surface p-1 rounded-full transition-colors disabled:opacity-50"
          aria-label="Close authentication modal"
        >
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>

        {/* Brand Header */}
        <div className="flex flex-col items-center mb-6 text-center">
          <BrandLogo size="md" showText={false} className="mb-2" />
          <h2 className="text-xl font-headline-md font-bold text-on-surface">
            {mode === 'login' ? 'Sign in to LAKNES' : 'Join LAKNES'}
          </h2>
          <p className="text-xs text-on-surface-variant mt-1">
            {accountType === 'user'
              ? 'Discover projects, participate in quests, and track the Elysium ecosystem.'
              : 'Register and manage your project profile, publish quests, and track verification.'}
          </p>
        </div>

        {/* Account Type Selector (User Account vs Project Account) */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-surface-container-lowest rounded-xl mb-5 border border-slate-800">
          <button
            type="button"
            onClick={() => setAccountType('user')}
            className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
              accountType === 'user'
                ? 'bg-primary-container text-on-primary-container shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">person</span>
            <span>User Account</span>
          </button>
          <button
            type="button"
            onClick={() => setAccountType('project')}
            className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
              accountType === 'project'
                ? 'bg-primary-container text-on-primary-container shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">domain</span>
            <span>Project Account</span>
          </button>
        </div>

        {/* Mode Selector (Login vs Register) */}
        <div className="flex border-b border-slate-800 mb-5">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError(null);
            }}
            className={`flex-1 pb-2 text-xs font-semibold border-b-2 transition-all ${
              mode === 'login'
                ? 'border-primary-container text-primary font-bold'
                : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setError(null);
            }}
            className={`flex-1 pb-2 text-xs font-semibold border-b-2 transition-all ${
              mode === 'register'
                ? 'border-primary-container text-primary font-bold'
                : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Automatic Google Sign-In Primary Action */}
        <div className="mb-5">
          <button
            type="button"
            onClick={handleTriggerGoogleAuth}
            disabled={isSubmitting}
            className="w-full py-2.5 px-4 rounded-full bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-headline-sm text-xs font-semibold flex items-center justify-center gap-3 border border-slate-700/80 shadow-md transition-all active:scale-[0.98] disabled:opacity-50 hover:border-primary/50 group"
          >
            {isSubmitting ? (
              <span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <svg className="w-4 h-4 shrink-0 transition-transform group-hover:scale-105" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            )}
            <span>
              {mode === 'login' ? 'Continue with Google' : 'Sign up with Google'}
              {accountType === 'project' ? ' (Project Rep)' : ''}
            </span>
          </button>
        </div>

        {/* Divider */}
        <div className="relative flex items-center justify-center mb-5">
          <div className="border-t border-slate-800 w-full"></div>
          <span className="bg-surface-container-low px-3 text-[11px] font-label-mono text-outline uppercase tracking-wider">
            or with email
          </span>
          <div className="border-t border-slate-800 w-full"></div>
        </div>

        {/* Feedback Alerts */}
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-error-container/20 border border-error/40 text-error text-xs flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px] shrink-0">error</span>
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/50 text-emerald-400 text-xs flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px] shrink-0">check_circle</span>
            <span>{successMsg}</span>
          </div>
        )}

        {/* Main Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div>
              <label className="block text-[11px] font-label-caps uppercase text-on-surface-variant mb-1">
                Display Name / Handle <span className="text-primary">*</span>
              </label>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={accountType === 'project' ? 'e.g. SatoshiElysium' : 'e.g. HorizonSeeker'}
                className="w-full bg-surface-container-lowest text-on-surface px-3 py-2 rounded-lg border border-slate-800 focus:outline-none focus:border-primary-container text-xs"
              />
            </div>
          )}

          <div>
            <label className="block text-[11px] font-label-caps uppercase text-on-surface-variant mb-1">
              Email Address <span className="text-primary">*</span>
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={accountType === 'project' ? 'rep@project.org' : 'user@domain.com'}
              className="w-full bg-surface-container-lowest text-on-surface px-3 py-2 rounded-lg border border-slate-800 focus:outline-none focus:border-primary-container text-xs"
            />
          </div>

          <div>
            <label className="block text-[11px] font-label-caps uppercase text-on-surface-variant mb-1">
              Password <span className="text-primary">*</span>
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full bg-surface-container-lowest text-on-surface px-3 py-2 rounded-lg border border-slate-800 focus:outline-none focus:border-primary-container text-xs"
            />
            {mode === 'register' && (
              <p className="text-[10px] text-on-surface-variant mt-1 font-label-mono">
                Must be at least 8 characters with letters and numbers.
              </p>
            )}
          </div>

          {mode === 'register' && (
            <div>
              <label className="block text-[11px] font-label-caps uppercase text-on-surface-variant mb-1">
                Confirm Password <span className="text-primary">*</span>
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-surface-container-lowest text-on-surface px-3 py-2 rounded-lg border border-slate-800 focus:outline-none focus:border-primary-container text-xs"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 rounded-full bg-primary-container text-on-primary-container font-headline-sm text-xs font-semibold shadow-[0_0_20px_rgba(0,210,255,0.3)] hover:bg-primary-fixed-dim hover:text-on-primary-fixed transition-all active:scale-[0.98] disabled:opacity-50 mt-2 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-on-primary-container border-t-transparent rounded-full animate-spin"></span>
                <span>Authenticating...</span>
              </>
            ) : mode === 'login' ? (
              <span>Sign In as {accountType === 'project' ? 'Representative' : 'User'}</span>
            ) : (
              <span>Create {accountType === 'project' ? 'Project' : 'User'} Account</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
