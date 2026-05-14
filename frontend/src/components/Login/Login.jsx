import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../shared/Toast';
import './Login.css';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [fieldError, setFieldError] = useState('');

  const { signIn, isAuthenticated } = useAuth();
  const { pushToast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Show session expired message if redirected
  useEffect(() => {
    if (searchParams.get('expired') === '1') {
      pushToast('Your session has expired - please sign in again', 'warning');
    }
  }, [searchParams, pushToast]);

  const attemptSignIn = async (e) => {
    e.preventDefault();
    setFieldError('');

    if (!username.trim()) {
      setFieldError('Username is required');
      return;
    }
    if (!password) {
      setFieldError('Password is required');
      return;
    }

    setSubmitting(true);
    try {
      await signIn(username.trim(), password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const message = err.response?.data?.error || 'Authentication failed - check your credentials';
      setFieldError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-backdrop" />
      <div className="login-container">
        <div className="login-brand">
          <div className="login-logo">KB</div>
          <h1 className="login-title">KristalBall</h1>
          <p className="login-tagline">Military Asset Management System</p>
        </div>

        <form className="login-form" onSubmit={attemptSignIn} id="login-form">
          <div className="login-field">
            <label htmlFor="login-username" className="login-label">Username</label>
            <input
              id="login-username"
              type="text"
              className="login-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              autoComplete="username"
              autoFocus
              disabled={submitting}
            />
          </div>

          <div className="login-field">
            <label htmlFor="login-password" className="login-label">Password</label>
            <input
              id="login-password"
              type="password"
              className="login-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
              disabled={submitting}
            />
          </div>

          {fieldError && (
            <div className="login-error" id="login-error">
              <span className="login-error__icon">✕</span>
              {fieldError}
            </div>
          )}

          <button
            type="submit"
            className="login-submit"
            disabled={submitting}
            id="btn-sign-in"
          >
            {submitting ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <p className="login-footer">Authorized personnel only - all access is monitored and logged</p>
      </div>
    </div>
  );
}
