import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import GoogleLoginButton from '../components/GoogleLoginButton';
import PasswordInput from '../components/PasswordInput';
import {
  formAuthShell,
  formAuthCard,
  formTitle,
  formSubtitle,
  formLabel,
  formInput,
  formBtnPrimary,
  formAlertError,
  formAlertSuccess,
} from '../utils/formStyles';
import { APP_NAME } from '../config/branding';

export default function Login() {
  const [email, setEmail] = useState('admin@crm.com');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
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
        <h1 className={formTitle}>{APP_NAME}</h1>
        <p className={formSubtitle}>Sign in to manage customers, orders & payments</p>

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

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
          <div>
            <label className={formLabel}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={formInput}
              required
            />
          </div>
          <div>
            <label className={formLabel}>Password</label>
            <PasswordInput
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
        <p className="mt-2 text-sm text-slate-400 text-center leading-relaxed">
          Demo: admin@crm.com / admin123 (owner) · sales@crm.com / sales123 (staff)
        </p>
      </div>
    </div>
  );
}
