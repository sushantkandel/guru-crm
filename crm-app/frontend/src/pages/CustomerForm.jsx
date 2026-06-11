import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import NepalLocationSelect from '../components/NepalLocationSelect';
import EditAudit from '../components/EditAudit';
import MapPicker from '../components/MapPicker';
import { CUSTOMER_TYPES } from '../constants/customerTypes';
import {
  formPage,
  formPageWide,
  formTitle,
  formSubtitle,
  formLabel,
  formInput,
  formHint,
  formCard,
  formGrid2,
  formActions,
  formBtnPrimary,
  formBtnSecondary,
  formAlertError,
} from '../utils/formStyles';

export default function CustomerForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { isOwner } = useAuth();

  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    shopName: '',
    panVatNumber: '',
    businessStatus: 'just_visited',
    customerTypes: [],
    assignedTo: '',
    address: {
      province: '',
      district: '',
      municipality: '',
      ward: '',
      street: '',
      latitude: null,
      longitude: null,
    },
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [auditRecord, setAuditRecord] = useState(null);

  useEffect(() => {
    if (isOwner) {
      api.get('/auth/users').then((res) => setUsers(res.data));
    }
    if (isEdit) {
      api.get(`/customers/${id}`).then((res) => {
        const c = res.data;
        setAuditRecord(c);
        const addr = c.addresses?.find((a) => a.isPrimary) || c.addresses?.[0] || {};
        setForm({
          name: c.name,
          phone: c.phone,
          email: c.email || '',
          shopName: c.shopName,
          panVatNumber: c.panVatNumber || '',
          businessStatus: c.businessStatus || 'just_visited',
          customerTypes: c.customerTypes || [],
          assignedTo: c.assignedTo || '',
          address: {
            province: addr.province || '',
            district: addr.district || '',
            municipality: addr.municipality || '',
            ward: addr.ward || '',
            street: addr.street || '',
            latitude: addr.latitude,
            longitude: addr.longitude,
          },
        });
      });
    }
  }, [id, isEdit, isOwner]);

  const addressText = [
    form.address.street,
    `Ward ${form.address.ward}`,
    form.address.municipality,
    form.address.district,
    form.address.province,
    'Nepal',
  ]
    .filter(Boolean)
    .join(', ');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload = {
        ...form,
        email: form.email?.trim() || null,
        panVatNumber: form.panVatNumber?.trim() || null,
        assignedTo: form.assignedTo || null,
        address: {
          ...form.address,
          street: form.address.street?.trim() || undefined,
          latitude:
            form.address.latitude != null ? Number(form.address.latitude) : null,
          longitude:
            form.address.longitude != null ? Number(form.address.longitude) : null,
        },
      };
      if (isEdit) {
        await api.put(`/customers/${id}`, payload);
        navigate(`/customers/${id}?survey=1`);
      } else {
        const res = await api.post('/customers', payload);
        navigate(`/customers/${res.data.id}?survey=1`);
      }
    } catch (err) {
      const details = err.response?.data?.details;
      const detailText = Array.isArray(details)
        ? details.map((d) => d.message).join('; ')
        : '';
      setError(
        detailText || err.response?.data?.error || 'Failed to save customer'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`${formPage} ${formPageWide}`}>
      <h2 className={formTitle}>
        {isEdit ? 'Edit Shop / Customer' : 'Add Shop / Customer'}
      </h2>
      <p className={formSubtitle}>
        Each customer is a shop. Location uses Nepal province → district → municipality → ward.
        {' After saving, you can add or update the field survey for product and vendor details.'}
      </p>
      {isEdit && <EditAudit record={auditRecord} className="mb-4" />}

      {error && <div className={formAlertError}>{error}</div>}

      <form onSubmit={handleSubmit} className={formCard}>
        <div className={formGrid2}>
          <div>
            <label className={formLabel}>Contact Name *</label>
            <input className={formInput} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div>
            <label className={formLabel}>Company / Shop Name *</label>
            <input className={formInput} value={form.shopName} onChange={(e) => setForm({ ...form, shopName: e.target.value })} required />
          </div>
          <div>
            <label className={formLabel}>Phone *</label>
            <input className={formInput} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
          </div>
          <div>
            <label className={formLabel}>Email</label>
            <input type="email" className={formInput} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <label className={formLabel}>PAN / VAT Number</label>
            <input
              className={formInput}
              value={form.panVatNumber}
              onChange={(e) => setForm({ ...form, panVatNumber: e.target.value })}
              placeholder="Optional — 9-digit PAN or VAT number"
            />
          </div>
        </div>

        <div>
          <label className={formLabel}>Conversion Status *</label>
          <select
            className={formInput}
            value={form.businessStatus}
            onChange={(e) => setForm({ ...form, businessStatus: e.target.value })}
          >
            <option value="converted">Converted — shop buys from you</option>
            <option value="not_converted">Not Converted — visited but no sale yet</option>
            <option value="just_visited">Just Visited — first visit / lead only</option>
          </select>
          <p className={formHint}>Track whether a visited shop has become a paying customer.</p>
        </div>

        <div>
          <label className={formLabel}>Shop type</label>
          <div className="flex flex-wrap gap-2 mt-1">
            {CUSTOMER_TYPES.map((type) => {
              const selected = form.customerTypes.includes(type.value);
              return (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => {
                    setForm((prev) => ({
                      ...prev,
                      customerTypes: selected
                        ? prev.customerTypes.filter((t) => t !== type.value)
                        : [...prev.customerTypes, type.value],
                    }));
                  }}
                  className={`px-3 py-1.5 rounded-full text-sm border ${
                    selected
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-slate-700 border-slate-300 hover:border-slate-400'
                  }`}
                >
                  {type.label}
                </button>
              );
            })}
          </div>
          <p className={formHint}>Select all that apply — retailer, wholesaler, etc.</p>
        </div>

        {isOwner && (
          <div>
            <label className={formLabel}>Assigned Staff</label>
            <select
              className={formInput}
              value={form.assignedTo}
              onChange={(e) => setForm({ ...form, assignedTo: e.target.value })}
            >
              <option value="">Select staff</option>
              {users.filter((u) => u.role === 'staff' || u.role === 'owner').map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className={formLabel}>Shop Address (Nepal) *</label>
          <NepalLocationSelect
            includeWard
            province={form.address.province}
            district={form.address.district}
            municipality={form.address.municipality}
            ward={form.address.ward}
            onChange={(loc) =>
              setForm((prev) => ({
                ...prev,
                address: { ...prev.address, ...loc },
              }))
            }
            className="mb-3"
          />
          <input
            className={formInput}
            placeholder="Street / tole name (optional)"
            value={form.address.street}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                address: { ...prev.address, street: e.target.value },
              }))
            }
          />
        </div>

        <div>
          <label className={formLabel}>Shop Location on Map</label>
          <p className={formHint}>
            Blue dot = your live GPS. Red pin shows the company name label — tap the map or drag the pin to mark the shop entrance.
          </p>
          <MapPicker
            latitude={form.address.latitude}
            longitude={form.address.longitude}
            shopLabel={form.shopName}
            addressText={addressText}
            locationFilters={{
              province: form.address.province,
              district: form.address.district,
              municipality: form.address.municipality,
              ward: form.address.ward,
            }}
            onLocationChange={(lat, lng) =>
              setForm((prev) => ({
                ...prev,
                address: {
                  ...prev.address,
                  latitude: lat != null ? Number(lat) : null,
                  longitude: lng != null ? Number(lng) : null,
                },
              }))
            }
          />
        </div>

        <div className={formActions}>
          <button type="submit" disabled={loading} className={formBtnPrimary}>
            {loading ? 'Saving...' : 'Save Shop'}
          </button>
          <button type="button" onClick={() => navigate(-1)} className={formBtnSecondary}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
