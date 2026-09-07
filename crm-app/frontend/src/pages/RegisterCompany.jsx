import { useState, useId } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NepalLocationSelect from '../components/NepalLocationSelect';
import PasswordInput from '../components/PasswordInput';
import AppLogo from '../components/AppLogo';
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
  formAlertSuccess,
} from '../utils/formStyles';

const emptyAddress = {
  country: 'Nepal',
  province: '',
  district: '',
  municipality: '',
  street: '',
};

export default function RegisterCompany() {
  const fieldId = useId();
  const location = useLocation();
  const registerState = location.state || {};

  const [form, setForm] = useState({
    companyName: '',
    ownerName: registerState.ownerName || '',
    email: registerState.email || '',
    password: '',
    phone: '',
    address: { ...emptyAddress },
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { registerCompany } = useAuth();
  const navigate = useNavigate();
  const fromAuth = Boolean(registerState.fromAuth);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await registerCompany(form);
      navigate('/');
    } catch (err) {
      const details = err.response?.data?.details;
      const detailMsg = Array.isArray(details)
        ? details.map((d) => d.message).filter(Boolean).join('. ')
        : '';
      setError(detailMsg || err.response?.data?.error || err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={formAuthShell}>
      <div className={`${formAuthCard} max-w-lg`}>
        <AppLogo size={128} />
        <h1 className={formTitle}>Register</h1>
        <p className={formSubtitle}>
          Register as company owner (admin). You will manage staff, customers, products, and permissions.
        </p>

        {fromAuth && (
          <div className={formAlertSuccess}>
            No account found — complete registration to continue.
          </div>
        )}
        {error && <div className={formAlertError}>{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
          <div>
            <label htmlFor={`${fieldId}-company-name`} className={formLabel}>Company Name *</label>
            <input id={`${fieldId}-company-name`}
              className={formInput}
              value={form.companyName}
              onChange={(e) => setForm({ ...form, companyName: e.target.value })}
              required
            />
          </div>

          <fieldset className={formFieldset}>
            <legend className={formLegend}>Company Address (Nepal) *</legend>
            <div>
              <label htmlFor={`${fieldId}-country`} className={formLabel}>Country</label>
              <input id={`${fieldId}-country`} className={formInput} value="Nepal" readOnly />
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
              <label htmlFor={`${fieldId}-street-name`} className={formLabel}>Street Name *</label>
              <input id={`${fieldId}-street-name`}
                className={formInput}
                value={form.address.street}
                onChange={(e) => setForm({ ...form, address: { ...form.address, street: e.target.value } })}
                placeholder="Street or tole name"
                required
              />
            </div>
          </fieldset>

          <div>
            <label htmlFor={`${fieldId}-your-name-owner`} className={formLabel}>Your Name (Owner) *</label>
            <input id={`${fieldId}-your-name-owner`}
              className={formInput}
              value={form.ownerName}
              onChange={(e) => setForm({ ...form, ownerName: e.target.value })}
              required
            />
          </div>
          <div>
            <label htmlFor={`${fieldId}-email`} className={formLabel}>Email *</label>
            <input id={`${fieldId}-email`}
              type="email"
              className={formInput}
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>
          <div>
            <label htmlFor={`${fieldId}-password`} className={formLabel}>Password *</label>
            <PasswordInput id={`${fieldId}-password`}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              minLength={6}
              required
            />
          </div>
          <div>
            <label htmlFor={`${fieldId}-company-phone`} className={formLabel}>Company Phone *</label>
            <input id={`${fieldId}-company-phone`}
              className={formInput}
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              required
            />
          </div>
          <button type="submit" disabled={loading} className={`${formBtnPrimary} w-full`}>
            {loading ? 'Registering...' : 'Register & sign in'}
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
