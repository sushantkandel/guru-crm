import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
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

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    try {
      const res = await api.post('/auth/forgot-password', { email });
      setMessage(res.data.message);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={formAuthShell}>
      <div className={formAuthCard}>
        <h1 className={formTitle}>Forgot Password</h1>
        <p className={formSubtitle}>Enter your email to receive a reset link</p>

        {error && <div className={formAlertError}>{error}</div>}
        {message && <div className={formAlertSuccess}>{message}</div>}

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
          <button type="submit" disabled={loading} className={`${formBtnPrimary} w-full`}>
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm sm:text-base">
          <Link to="/login" className="text-blue-600 hover:underline">Back to login</Link>
        </p>
      </div>
    </div>
  );
}
