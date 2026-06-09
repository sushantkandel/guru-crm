import { useEffect, useState } from 'react';
import api from '../services/api';
import { formLabel, formInput } from '../utils/formStyles';

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
  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [municipalities, setMunicipalities] = useState([]);
  const [wards, setWards] = useState([]);

  useEffect(() => {
    api.get('/locations/nepal').then((res) => setProvinces(res.data.provinces || []));
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
      <div>
        <label className={formLabel}>Province *</label>
        <select
          className={formInput}
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
        <label className={formLabel}>District *</label>
        <select
          className={formInput}
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
        <label className={formLabel}>Municipality *</label>
        <select
          className={formInput}
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
          <label className={formLabel}>Ward *</label>
          <select
            className={formInput}
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
