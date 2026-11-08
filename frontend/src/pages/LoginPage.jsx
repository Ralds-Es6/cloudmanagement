import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AuthLayout from '../components/AuthLayout';
import { toast } from 'sonner';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, googleLogin, isAuthenticated, user } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState('');
  const turnstileRef = useRef(null);

  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY || '0x4AAAAAAF2jj5EmeD7B7TMc';

  // If already authenticated, redirect
  const from =
    location.state?.from?.pathname || (user?.role === 'admin' ? '/all-files' : '/my-files');

  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }

    if (siteKey && !turnstileToken) {
      setError('Please complete the Cloudflare security verification.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await login(email.trim(), password, turnstileToken);
      const targetPath =
        location.state?.from?.pathname && location.state.from.pathname !== '/login'
          ? location.state.from.pathname
          : res.user?.role === 'admin'
          ? '/all-files'
          : '/my-files';
      navigate(targetPath, { replace: true });
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          'Invalid credentials. Please verify your email and password.'
      );
      // Reset turnstile challenge on submission error
      turnstileRef.current?.reset();
      setTurnstileToken('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      setIsSubmitting(true);
      setError('');
      if (!credentialResponse?.credential) {
        throw new Error('No credential received from Google');
      }
      const res = await googleLogin(credentialResponse.credential);
      toast.success(`Welcome back, ${res.user?.name || 'User'}!`);
      const targetPath =
        location.state?.from?.pathname && location.state.from.pathname !== '/login'
          ? location.state.from.pathname
          : res.user?.role === 'admin'
          ? '/all-files'
          : '/my-files';
      navigate(targetPath, { replace: true });
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          'Google authentication failed. Please try again.'
      );
      toast.error('Google sign-in failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleError = () => {
    setError('Google authentication was cancelled or encountered an error.');
    toast.error('Google sign-in was cancelled');
  };

  return (
    <AuthLayout
      portalType="user"
      title="Sign In"
      subtitle="Access your personal cloud documents"
      email={email}
      setEmail={setEmail}
      password={password}
      setPassword={setPassword}
      error={error}
      isSubmitting={isSubmitting}
      onSubmit={handleSubmit}
      buttonText="Sign In"
      demoCredentials={{
        email: import.meta.env.VITE_DEMO_USER_EMAIL || 'user@cloud.local',
        password: import.meta.env.VITE_DEMO_USER_PASSWORD || 'user123',
        label: 'Demo User',
      }}
      turnstileSiteKey={siteKey}
      turnstileRef={turnstileRef}
      onTurnstileSuccess={(token) => {
        setTurnstileToken(token);
        setError('');
      }}
      onTurnstileExpire={() => setTurnstileToken('')}
      showGoogleLogin={true}
      onGoogleSuccess={handleGoogleSuccess}
      onGoogleError={handleGoogleError}
    />
  );
}
