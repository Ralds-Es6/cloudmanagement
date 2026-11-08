import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AuthLayout from '../components/AuthLayout';

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const { login, isAuthenticated, user, logout } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState('');
  const turnstileRef = useRef(null);

  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY || '0x4AAAAAAF2jj5EmeD7B7TMc';

  // If already authenticated as admin, redirect to master user directories
  useEffect(() => {
    if (isAuthenticated) {
      if (user?.role === 'admin') {
        navigate('/all-files', { replace: true });
      } else {
        setError('Signed in with standard account. Administrator credentials required below.');
      }
    }
  }, [isAuthenticated, user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password) {
      setError('Please provide your administrator email and password.');
      return;
    }

    if (siteKey && !turnstileToken) {
      setError('Please complete the Cloudflare security verification.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await login(email.trim(), password, turnstileToken);

      // Enforce admin privilege guard
      if (res.user?.role !== 'admin') {
        logout();
        setError('Access Denied: This console requires Administrator privileges.');
        return;
      }

      navigate('/all-files', { replace: true });
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          'Authentication failed. Invalid administrator credentials.'
      );
      // Reset turnstile challenge on error
      turnstileRef.current?.reset();
      setTurnstileToken('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout
      portalType="admin"
      title="Admin Console"
      subtitle="Restricted master management portal"
      email={email}
      setEmail={setEmail}
      password={password}
      setPassword={setPassword}
      error={error}
      isSubmitting={isSubmitting}
      onSubmit={handleSubmit}
      buttonText="Access Console"
      demoCredentials={{
        email: import.meta.env.VITE_DEMO_ADMIN_EMAIL || 'admin@cloud.local',
        password: import.meta.env.VITE_DEMO_ADMIN_PASSWORD || 'admin123',
        label: 'Demo Admin',
      }}
      turnstileSiteKey={siteKey}
      turnstileRef={turnstileRef}
      onTurnstileSuccess={(token) => {
        setTurnstileToken(token);
        setError('');
      }}
      onTurnstileExpire={() => setTurnstileToken('')}
    />
  );
}
