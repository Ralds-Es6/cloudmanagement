import React, { useState } from 'react';
import {
  Cloud,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  Loader2,
  KeyRound,
  ShieldCheck,
} from 'lucide-react';
import { Turnstile } from '@marsidev/react-turnstile';
import { GoogleLogin } from '@react-oauth/google';

/**
 * Modular Standalone Authentication Card Layout
 * Adheres to enterprise security standards:
 * - Strict portal isolation (zero cross-linking between user and admin routes)
 * - Zero technology stack disclosure
 * - Clean, elevated, distraction-free card architecture
 */
export default function AuthLayout({
  portalType = 'user', // 'user' | 'admin'
  title = 'Sign In',
  subtitle = 'Enter your credentials to continue',
  email,
  setEmail,
  password,
  setPassword,
  error,
  isSubmitting,
  onSubmit,
  buttonText = 'Sign In',
  demoCredentials,
  turnstileSiteKey,
  turnstileRef,
  onTurnstileSuccess,
  onTurnstileExpire,
  showGoogleLogin = false,
  onGoogleSuccess,
  onGoogleError,
}) {
  const [showPassword, setShowPassword] = useState(false);
  const isAdmin = portalType === 'admin';

  const handleAutofill = () => {
    if (demoCredentials) {
      setEmail(demoCredentials.email);
      setPassword(demoCredentials.password);
    }
  };

  return (
    <div
      className={`min-h-screen flex flex-col items-center justify-center py-4 px-4 sm:px-6 selection:bg-[#3b5bef]/15 selection:text-[#3b5bef] ${
        isAdmin
          ? 'bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-100 via-[#f8fafc] to-[#e2e8f0]'
          : 'bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-50/60 via-[#f8fafc] to-[#eef2ff]'
      }`}
    >
      <div className="w-full max-w-[350px] sm:max-w-[360px] flex flex-col items-center my-auto">
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-3 sm:mb-4 text-center select-none">
          <div
            className={`w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center mb-2 shadow-md transition-transform hover:scale-105 ${
              isAdmin
                ? 'bg-[#0f172a] text-[#60a5fa] border border-slate-700/50 shadow-slate-900/10'
                : 'bg-[#3b5bef] text-white shadow-[#3b5bef]/25'
            }`}
          >
            <Cloud className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.3]" />
          </div>
          <div className="flex items-center space-x-0.5">
            <span className="font-extrabold text-xl sm:text-2xl tracking-tight text-slate-900">
              Cloud
            </span>
            <span
              className={`font-black text-xl sm:text-2xl tracking-tight ${
                isAdmin ? 'text-[#3b5bef]' : 'text-[#3b5bef]'
              }`}
            >
              Xen
            </span>
          </div>
        </div>

        {/* Elevated Standalone Auth Card */}
        <div className="w-full bg-white rounded-2xl border border-slate-200/80 shadow-[0_12px_36px_-8px_rgba(15,23,42,0.07)] p-5 sm:p-6">
          {/* Header - Centered title and subtitle */}
          <div className="mb-4 text-center">
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
              {title}
            </h1>
            <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mb-4 p-2.5 sm:p-3 rounded-xl bg-rose-50 border border-rose-200/80 text-rose-700 text-xs flex items-start space-x-2 animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
              <span className="leading-relaxed font-medium">{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={onSubmit} className="space-y-3 sm:space-y-3.5">
            {/* Email Field */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Email address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={isAdmin ? 'admin@cloud.local' : 'name@domain.com'}
                  autoComplete="email"
                  required
                  className="w-full h-9.5 sm:h-10 pl-10 pr-3.5 bg-slate-50/60 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#3b5bef]/20 focus:border-[#3b5bef] focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  className="w-full h-9.5 sm:h-10 pl-10 pr-10 bg-slate-50/60 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#3b5bef]/20 focus:border-[#3b5bef] focus:bg-white transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Cloudflare Turnstile Verification */}
            {turnstileSiteKey && (
              <div className="py-0.5 flex flex-col items-center justify-center min-h-[64px]">
                <Turnstile
                  ref={turnstileRef}
                  siteKey={turnstileSiteKey}
                  onSuccess={onTurnstileSuccess}
                  onExpire={onTurnstileExpire}
                  onError={(err) => console.warn('[Turnstile Error]:', err)}
                  options={{
                    theme: 'light',
                    size: 'normal',
                  }}
                />
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full h-9.5 sm:h-10 mt-1 sm:mt-1.5 rounded-xl text-xs sm:text-sm font-semibold text-white flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-sm active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed ${
                isAdmin
                  ? 'bg-[#0f172a] hover:bg-[#1e293b] focus:ring-2 focus:ring-slate-900/20'
                  : 'bg-[#3b5bef] hover:bg-[#324ecc] focus:ring-2 focus:ring-[#3b5bef]/25'
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>{buttonText}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Google OAuth Login (User Portal Only) */}
            {showGoogleLogin && (
              <div className="pt-1.5 space-y-2.5">
                <div className="relative flex items-center justify-center">
                  <div className="w-full border-t border-slate-200"></div>
                  <span className="bg-white px-3 text-[10px] sm:text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    or continue with
                  </span>
                </div>

                <div className="flex justify-center items-center w-full min-h-[44px]">
                  <GoogleLogin
                    onSuccess={onGoogleSuccess}
                    onError={onGoogleError}
                    theme="outline"
                    size="large"
                    shape="rectangular"
                    width="300"
                  />
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Discreet External Quick-Fill (Keeps Card Clutter-Free) */}
        {demoCredentials && (
          <div className="mt-2.5 sm:mt-3 flex items-center">
            <button
              type="button"
              onClick={handleAutofill}
              className="inline-flex items-center space-x-1.5 text-[11px] text-slate-400 hover:text-slate-700 bg-white/70 hover:bg-white border border-slate-200/80 rounded-full px-3 py-0.5 sm:py-1 transition-all shadow-xs cursor-pointer"
              title={`Autofill ${demoCredentials.email}`}
            >
              <KeyRound className="w-3 h-3 text-slate-400" />
              <span>Fill {demoCredentials.label}</span>
            </button>
          </div>
        )}

        {/* Minimal Copyright & Security Footer */}
        <p className="mt-3 sm:mt-4 text-[11px] text-slate-400 text-center select-none">
          © CloudXen · Document Management & Cloud Storage
        </p>
      </div>
    </div>
  );
}

