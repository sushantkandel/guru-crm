import { useEffect, useState, useId } from 'react';
import api from '../services/api';
import NepalLocationSelect from '../components/NepalLocationSelect';
import PageHeader from '../components/PageHeader';
import BackupRestoreSection from '../components/BackupRestoreSection';
import {
  pageShell,
  formSubtitle,
  formSectionTitle,
  formLabel,
  formInput,
  formCard,
  formActions,
  formBtnPrimary,
  formBtnOutline,
  formAlertError,
  formAlertSuccess,
} from '../utils/formStyles';

export default function Settings() {
  const fieldId = useId();
  const [form, setForm] = useState({
    name: '',
    phone: '',
    address: { country: 'Nepal', province: '', district: '', municipality: '', street: '' },
  });
  const [locationMeta, setLocationMeta] = useState(null);
  const [boundaryMeta, setBoundaryMeta] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [syncingLocations, setSyncingLocations] = useState(false);
  const [syncingBoundaries, setSyncingBoundaries] = useState(false);

  const loadLocationMeta = () => {
    api.get('/locations/nepal/meta').then((res) => setLocationMeta(res.data)).catch(() => {});
  };

  const loadBoundaryMeta = () => {
    api.get('/locations/nepal/boundaries/meta').then((res) => setBoundaryMeta(res.data)).catch(() => {});
  };

  useEffect(() => {
    api.get('/company').then((res) => {
      setForm({
        name: res.data.name,
        phone: res.data.phone || '',
        address: {
          country: res.data.country || 'Nepal',
          province: res.data.province || '',
          district: res.data.district || '',
          municipality: res.data.municipality || '',
          street: res.data.street || '',
        },
      });
    });
    loadLocationMeta();
    loadBoundaryMeta();
  }, []);

  const handleSaveCompany = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const res = await api.put('/company', form);
      setForm({
        name: res.data.name,
        phone: res.data.phone || '',
        address: {
          country: res.data.country || 'Nepal',
          province: res.data.province,
          district: res.data.district,
          municipality: res.data.municipality,
          street: res.data.street,
        },
      });
      setMessage('Company settings saved.');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  const handleSyncLocations = async () => {
    setSyncingLocations(true);
    setError('');
    setMessage('');
    try {
      const res = await api.post('/locations/nepal/sync');
      setLocationMeta({ syncedAt: res.data.syncedAt, source: res.data.source, stats: res.data.stats });
      setMessage(
        `Location data updated: ${res.data.stats.provinces} provinces, ${res.data.stats.districts} districts, ${res.data.stats.municipalities} municipalities, ${res.data.stats.wards} wards.`
      );
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to sync location data');
    } finally {
      setSyncingLocations(false);
    }
  };

  const handleSyncBoundaries = async () => {
    setSyncingBoundaries(true);
    setError('');
    setMessage('');
    try {
      const res = await api.post('/locations/nepal/boundaries/sync');
      setBoundaryMeta({
        syncedAt: res.data.syncedAt,
        source: res.data.source,
        sourceType: res.data.sourceType,
        stats: res.data.stats,
      });
      setMessage(
        `Ward boundaries updated: ${res.data.stats.wardsIndexed} wards indexed across ${res.data.stats.municipalitiesMatched} municipalities (${res.data.stats.municipalitiesUnmatched} unmatched).`
      );
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to sync ward boundaries');
    } finally {
      setSyncingBoundaries(false);
    }
  };

  return (
    <div className={pageShell}>
      <PageHeader title="Company Settings" subtitle="As owner (admin), manage your company profile and location data." />

      {message && <div className={formAlertSuccess}>{message}</div>}
      {error && <div className={formAlertError}>{error}</div>}

      <div className={formCard}>
        <h3 className={formSectionTitle}>Company Info</h3>
        <form onSubmit={handleSaveCompany} className="space-y-4 sm:space-y-5">
          <div>
            <label htmlFor={`${fieldId}-company-name`} className={formLabel}>Company Name</label>
            <input id={`${fieldId}-company-name`} className={formInput} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div>
            <label htmlFor={`${fieldId}-phone`} className={formLabel}>Phone</label>
            <input id={`${fieldId}-phone`} className={formInput} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
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
              setForm({ ...form, address: { ...form.address, ...loc, country: 'Nepal' } })
            }
          />
          <div>
            <label htmlFor={`${fieldId}-street-name`} className={formLabel}>Street Name *</label>
            <input id={`${fieldId}-street-name`}
              className={formInput}
              value={form.address.street}
              onChange={(e) => setForm({ ...form, address: { ...form.address, street: e.target.value } })}
              required
            />
          </div>
          <div className={formActions}>
            <button type="submit" disabled={loading} className={formBtnPrimary}>
              {loading ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>

      <div className={`${formCard} mt-6`}>
        <h3 className={formSectionTitle}>Nepal Location Data</h3>
        <p className={formSubtitle + ' mb-4 sm:mb-4'}>
          Province, district, municipality, and ward dropdowns use data from{' '}
          <a
            href="https://github.com/sagautam5/local-states-nepal"
            target="_blank"
            rel="noreferrer"
            className="text-blue-600 hover:underline"
          >
            local-states-nepal
          </a>
          . Sync when you want the latest administrative divisions.
        </p>

        {locationMeta && (
          <div className="text-sm sm:text-base text-slate-600 mb-4 space-y-1 leading-relaxed">
            <p>
              <span className="font-medium text-slate-700">Last synced:</span>{' '}
              {new Date(locationMeta.syncedAt).toLocaleString()}
            </p>
            <p>
              <span className="font-medium text-slate-700">Coverage:</span>{' '}
              {locationMeta.stats.provinces} provinces · {locationMeta.stats.districts} districts ·{' '}
              {locationMeta.stats.municipalities} municipalities · {locationMeta.stats.wards} wards
            </p>
          </div>
        )}

        <button
          type="button"
          onClick={handleSyncLocations}
          disabled={syncingLocations}
          className={formBtnOutline}
        >
          {syncingLocations ? 'Fetching latest data...' : 'Sync Location Data'}
        </button>
      </div>

      <div className={`${formCard} mt-6`}>
        <h3 className={formSectionTitle}>Ward Boundary Data</h3>
        <p className={formSubtitle + ' mb-4 sm:mb-4'}>
          Map ward polygons are sourced from{' '}
          <a
            href="https://github.com/SaugatPdl/nepal-administrative-boundary-shapefiles"
            target="_blank"
            rel="noreferrer"
            className="text-blue-600 hover:underline"
          >
            SaugatPdl ward shapefiles
          </a>
          {' '}(with mesaugat GeoJSON detection as fallback). Sync to refresh municipality ward chunks used on the map.
        </p>

        {boundaryMeta && (
          <div className="text-sm sm:text-base text-slate-600 mb-4 space-y-1 leading-relaxed">
            <p>
              <span className="font-medium text-slate-700">Last synced:</span>{' '}
              {new Date(boundaryMeta.syncedAt).toLocaleString()}
            </p>
            <p>
              <span className="font-medium text-slate-700">Coverage:</span>{' '}
              {boundaryMeta.stats.wardsIndexed} wards indexed ·{' '}
              {boundaryMeta.stats.municipalitiesMatched} municipalities matched ·{' '}
              {boundaryMeta.stats.municipalitiesUnmatched} unmatched
            </p>
            <p>
              <span className="font-medium text-slate-700">Source:</span>{' '}
              {boundaryMeta.sourceType || 'ward shapefile'}
            </p>
          </div>
        )}

        <button
          type="button"
          onClick={handleSyncBoundaries}
          disabled={syncingBoundaries}
          className={formBtnOutline}
        >
          {syncingBoundaries ? 'Building ward chunks...' : 'Sync Ward Boundaries'}
        </button>
      </div>

      <BackupRestoreSection />
    </div>
  );
}
