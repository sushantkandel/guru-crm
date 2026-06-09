import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NepalLocationSelect from '../components/NepalLocationSelect';
import PasswordInput from '../components/PasswordInput';
import {
  formAuthShell,
  formAuthCard,
  formTitle,
  formSubtitle,
  formLabel,
  formInput,
  formFieldset,
  formLegend,
  formBtnPrimary,
  formAlertError,
} from '../utils/formStyles';

const emptyAddress = {
  country: 'Nepal',
  province: '',
  district: '',
  municipality: '',
  street: '',
};

export default function RegisterCompany() {
  const [form, setForm] = useState({
    companyName: '',
    ownerName: '',
    email: '',
    password: '',
    phone: '',
    address: { ...emptyAddress },
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { registerCompany } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await registerCompany(form);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={formAuthShell}>
      <div className={`${formAuthCard} max-w-lg`}>
        <h1 className={formTitle}>Create Your Company</h1>
        <p className={formSubtitle}>
          Sign up as company owner (admin). You will manage staff, customers, products, and permissions.
        </p>

        {error && <div className={formAlertError}>{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
          <div>
            <label className={formLabel}>Company Name *</label>
            <input
              className={formInput}
              value={form.companyName}
              onChange={(e) => setForm({ ...form, companyName: e.target.value })}
              required
            />
          </div>

          <fieldset className={formFieldset}>
            <legend className={formLegend}>Company Address (Nepal) *</legend>
            <div>
              <label className={formLabel}>Country</label>
              <input className={formInput} value="Nepal" readOnly />
            </div>
            <NepalLocationSelect
              includeWard={false}
              province={form.address.province}
              district={form.address.district}
              municipality={form.address.municipality}
              onChange={(loc) =>
                setForm({
                  ...form,
                  address: { ...form.address, ...loc, country: 'Nepal' },
                })
              }
            />
            <div>
              <label className={formLabel}>Street Name *</label>
              <input
                className={formInput}
                value={form.address.street}
                onChange={(e) => setForm({ ...form, address: { ...form.address, street: e.target.value } })}
                placeholder="Street or tole name"
                required
              />
            </div>
          </fieldset>

          <div>
            <label className={formLabel}>Your Name (Owner) *</label>
            <input
              className={formInput}
              value={form.ownerName}
              onChange={(e) => setForm({ ...form, ownerName: e.target.value })}
              required
            />
          </div>
          <div>
            <label className={formLabel}>Email *</label>
            <input
              type="email"
              className={formInput}
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>
          <div>
            <label className={formLabel}>Password *</label>
            <PasswordInput
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              minLength={6}
              required
            />
          </div>
          <div>
            <label className={formLabel}>Company Phone</label>
            <input
              className={formInput}
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
          <button type="submit" disabled={loading} className={`${formBtnPrimary} w-full`}>
            {loading ? 'Creating...' : 'Create Company & Sign In'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm sm:text-base">
          Already have an account?{' '}
          <Link to="/login" className="text-blue-600 hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
