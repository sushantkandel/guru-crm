import { useEffect, useState, useId } from 'react';
import api from '../services/api';
import { formLabel, formSelect } from '../utils/formStyles';

const emptyLoc = { province: '', district: '', municipality: '', ward: '' };

export default function NepalLocationSelect({
  province = '',
  district = '',
  municipality = '',
  ward = '',
  onChange,
  includeWard = true,
  className = '',
}) {
  const fieldId = useId();
  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [municipalities, setMunicipalities] = useState([]);
  const [wards, setWards] = useState([]);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    api
      .get('/locations/nepal')
      .then((res) => {
        setProvinces(res.data.provinces || []);
        setLoadError('');
      })
      .catch(() => setLoadError('Could not load Nepal locations. Refresh the page or try again later.'));
  }, []);

  useEffect(() => {
    if (province) {
      api.get('/locations/nepal', { params: { province } }).then((res) => setDistricts(res.data.districts || []));
    } else {
      setDistricts([]);
    }
  }, [province]);

  useEffect(() => {
    if (province && district) {
      api.get('/locations/nepal', { params: { province, district } }).then((res) =>
        setMunicipalities(res.data.municipalities || [])
      );
    } else {
      setMunicipalities([]);
    }
  }, [province, district]);

  useEffect(() => {
    if (includeWard && province && district && municipality) {
      api.get('/locations/nepal', { params: { province, district, municipality } }).then((res) =>
        setWards(res.data.wards || [])
      );
    } else {
      setWards([]);
    }
  }, [province, district, municipality, includeWard]);

  const gridClass = includeWard ? 'form-location-grid' : 'form-location-grid-3';

  return (
    <div className={`${gridClass} ${className}`}>
      {loadError && <p className="col-span-full text-sm text-red-600">{loadError}</p>}
      <div>
        <label htmlFor={`${fieldId}-province`} className={formLabel}>Province *</label>
        <select id={`${fieldId}-province`}
          className={formSelect}
          value={province}
          onChange={(e) => onChange({ ...emptyLoc, province: e.target.value })}
          required
        >
          <option value="">Select province</option>
          {provinces.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor={`${fieldId}-district`} className={formLabel}>District *</label>
        <select id={`${fieldId}-district`}
          className={formSelect}
          value={district}
          disabled={!province}
          onChange={(e) => onChange({ province, district: e.target.value, municipality: '', ward: '' })}
          required
        >
          <option value="">Select district</option>
          {districts.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor={`${fieldId}-municipality`} className={formLabel}>Municipality *</label>
        <select id={`${fieldId}-municipality`}
          className={formSelect}
          value={municipality}
          disabled={!district}
          onChange={(e) => onChange({ province, district, municipality: e.target.value, ward: '' })}
          required
        >
          <option value="">Select municipality</option>
          {municipalities.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>
      {includeWard && (
        <div>
          <label htmlFor={`${fieldId}-ward`} className={formLabel}>Ward *</label>
          <select id={`${fieldId}-ward`}
            className={formSelect}
            value={ward}
            disabled={!municipality}
            onChange={(e) => onChange({ province, district, municipality, ward: e.target.value })}
            required
          >
            <option value="">Select ward</option>
            {wards.map((w) => (
              <option key={w} value={w}>Ward {w}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
