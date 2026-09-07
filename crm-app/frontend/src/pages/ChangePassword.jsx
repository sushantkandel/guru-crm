import { useState, useId } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import PasswordInput from '../components/PasswordInput';
import {
  formPage,
  formPageNarrow,
  formTitle,
  formLabel,
  formCard,
  formActions,
  formBtnPrimary,
  formBtnSecondary,
  formAlertError,
  formAlertSuccess,
} from '../utils/formStyles';

export default function ChangePassword() {
  const fieldId = useId();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (form.newPassword !== form.confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/change-password', {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      setSuccess('Password changed successfully');
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => navigate('/'), 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`${formPage} ${formPageNarrow}`}>
      <h2 className={formTitle}>Change Password</h2>

      {error && <div className={formAlertError}>{error}</div>}
      {success && <div className={formAlertSuccess}>{success}</div>}

      <form onSubmit={handleSubmit} className={formCard}>
        <div>
          <label htmlFor={`${fieldId}-current-password`} className={formLabel}>Current Password</label>
          <PasswordInput id={`${fieldId}-current-password`}
            value={form.currentPassword}
            onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
            required
          />
        </div>
        <div>
          <label htmlFor={`${fieldId}-new-password`} className={formLabel}>New Password</label>
          <PasswordInput id={`${fieldId}-new-password`}
            value={form.newPassword}
            onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
            required
            minLength={6}
          />
        </div>
        <div>
          <label htmlFor={`${fieldId}-confirm-new-password`} className={formLabel}>Confirm New Password</label>
          <PasswordInput id={`${fieldId}-confirm-new-password`}
            value={form.confirmPassword}
            onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
            required
            minLength={6}
          />
        </div>
        <div className={formActions}>
          <button type="submit" disabled={loading} className={formBtnPrimary}>
            {loading ? 'Saving...' : 'Change Password'}
          </button>
          <button type="button" onClick={() => navigate(-1)} className={formBtnSecondary}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
