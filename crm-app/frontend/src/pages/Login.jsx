import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import GoogleLoginButton from '../components/GoogleLoginButton';
import PasswordInput from '../components/PasswordInput';
import {
  formAuthShell,
  formAuthCard,
  formSubtitle,
  formLabel,
  formInput,
  formBtnPrimary,
  formAlertError,
  formAlertSuccess,
} from '../utils/formStyles';
import AppLogo from '../components/AppLogo';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldsReady, setFieldsReady] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setFieldsReady(true);
  }, []);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const successMessage = location.state?.message;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={formAuthShell}>
      <div className={formAuthCard}>
        <AppLogo size={220} crop />
        <p className={`${formSubtitle} mt-4`}>Sign in to manage customers, orders & payments</p>

        {successMessage && <div className={formAlertSuccess}>{successMessage}</div>}
        {error && <div className={formAlertError}>{error}</div>}

        <div className="mb-4">
          <GoogleLoginButton
            onSuccess={() => navigate('/')}
            onError={(msg) => setError(msg)}
          />
        </div>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200" />
          </div>
          <div className="relative flex justify-center text-sm sm:text-base uppercase">
            <span className="bg-white px-2 text-slate-400">Or continue with email</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5" autoComplete="off">
          {/* Decoy fields — browsers autofill these instead of the real inputs */}
          <input
            type="text"
            name="prevent_autofill_username"
            tabIndex={-1}
            autoComplete="username"
            className="absolute -left-[9999px] h-px w-px opacity-0"
            aria-hidden="true"
          />
          <input
            type="password"
            name="prevent_autofill_password"
            tabIndex={-1}
            autoComplete="current-password"
            className="absolute -left-[9999px] h-px w-px opacity-0"
            aria-hidden="true"
          />
          <div>
            <label className={formLabel} htmlFor="guru-login-email">Email</label>
            <input
              id="guru-login-email"
              type="email"
              name="guru-login-email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={formInput}
              autoComplete="off"
              readOnly={!fieldsReady}
              onFocus={(e) => e.target.removeAttribute('readonly')}
              required
            />
          </div>
          <div>
            <label className={formLabel} htmlFor="guru-login-password">Password</label>
            <PasswordInput
              id="guru-login-password"
              name="guru-login-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              readOnly={!fieldsReady}
              onFocus={(e) => e.target.removeAttribute('readonly')}
              required
            />
          </div>
          <button type="submit" disabled={loading} className={`${formBtnPrimary} w-full`}>
            {loading ? 'Signing in...' : 'Sign in with Email'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm sm:text-base">
          <Link to="/forgot-password" className="text-blue-600 hover:underline">Forgot password?</Link>
        </p>
        <p className="mt-2 text-center text-sm sm:text-base">
          <Link to="/register-company" className="text-blue-600 hover:underline">Create your company</Link>
        </p>
      </div>
    </div>
  );
}
