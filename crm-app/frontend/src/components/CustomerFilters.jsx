import { useEffect, useState } from 'react';
import api from '../services/api';
import NepalLocationSelect from './NepalLocationSelect';
import { CUSTOMER_TYPES } from '../constants/customerTypes';
import { formLabel, formInput, pageCardPadded } from '../utils/formStyles';

export default function CustomerFilters({ filters, onChange }) {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    api.get('/products', { params: { active: true } }).then((res) => setProducts(res.data));
  }, []);

  const toggleCustomerType = (value) => {
    const selected = filters.customer_type.includes(value);
    onChange({
      ...filters,
      customer_type: selected
        ? filters.customer_type.filter((t) => t !== value)
        : [...filters.customer_type, value],
    });
  };

  return (
    <div className={`${pageCardPadded} space-y-4`}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="lg:col-span-2">
          <label className={formLabel}>Search</label>
          <input
            className={formInput}
            placeholder="Name, shop, phone, PAN/VAT..."
            value={filters.q}
            onChange={(e) => onChange({ ...filters, q: e.target.value })}
          />
        </div>
        <div>
          <label className={formLabel}>Conversion status</label>
          <select
            className={formInput}
            value={filters.business_status}
            onChange={(e) => onChange({ ...filters, business_status: e.target.value })}
          >
            <option value="">All</option>
            <option value="converted">Converted</option>
            <option value="not_converted">Not Converted</option>
            <option value="just_visited">Just Visited</option>
          </select>
        </div>
        <div>
          <label className={formLabel}>Product</label>
          <select
            className={formInput}
            value={filters.product_id}
            onChange={(e) => onChange({ ...filters, product_id: e.target.value })}
          >
            <option value="">All products</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={formLabel}>Knows product</label>
          <select
            className={formInput}
            value={filters.knows_product}
            onChange={(e) => onChange({ ...filters, knows_product: e.target.value })}
            disabled={!filters.product_id}
          >
            <option value="">Any</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        </div>
        <div>
          <label className={formLabel}>Still selling</label>
          <select
            className={formInput}
            value={filters.is_selling}
            onChange={(e) => onChange({ ...filters, is_selling: e.target.value })}
            disabled={!filters.product_id}
          >
            <option value="">Any</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        </div>
        <div>
          <label className={formLabel}>Vendor name</label>
          <input
            className={formInput}
            placeholder="Competitor / distributor"
            value={filters.vendor}
            onChange={(e) => onChange({ ...filters, vendor: e.target.value })}
          />
        </div>
        <div>
          <label className={formLabel}>Not ordered from</label>
          <input
            type="date"
            className={formInput}
            value={filters.not_ordered_from}
            onChange={(e) => onChange({ ...filters, not_ordered_from: e.target.value })}
          />
        </div>
        <div>
          <label className={formLabel}>Not ordered to</label>
          <input
            type="date"
            className={formInput}
            value={filters.not_ordered_to}
            onChange={(e) => onChange({ ...filters, not_ordered_to: e.target.value })}
          />
        </div>
      </div>

      <div>
        <label className={formLabel}>Shop type</label>
        <div className="flex flex-wrap gap-2 mt-1">
          {CUSTOMER_TYPES.map((type) => {
            const selected = filters.customer_type.includes(type.value);
            return (
              <button
                key={type.value}
                type="button"
                onClick={() => toggleCustomerType(type.value)}
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
      </div>

      <NepalLocationSelect
        includeWard
        province={filters.province}
        district={filters.district}
        municipality={filters.municipality}
        ward={filters.ward}
        onChange={(loc) => onChange({ ...filters, ...loc })}
      />

      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm sm:text-base text-slate-700 cursor-pointer">
          <input
            type="checkbox"
            checked={filters.has_remaining_payment}
            onChange={(e) => onChange({ ...filters, has_remaining_payment: e.target.checked })}
            className="rounded"
          />
          Has remaining payment
        </label>
        <label className="flex items-center gap-2 text-sm sm:text-base text-slate-700 cursor-pointer">
          <input
            type="checkbox"
            checked={filters.has_pending_orders}
            onChange={(e) => onChange({ ...filters, has_pending_orders: e.target.checked })}
            className="rounded"
          />
          Has pending orders
        </label>
        <label className="flex items-center gap-2 text-sm sm:text-base text-slate-700 cursor-pointer">
          <input
            type="checkbox"
            checked={filters.vendor_current_only}
            onChange={(e) => onChange({ ...filters, vendor_current_only: e.target.checked })}
            className="rounded"
            disabled={!filters.vendor}
          />
          Current vendors only
        </label>
        <button
          type="button"
          onClick={() =>
            onChange({
              q: '',
              province: '',
              district: '',
              municipality: '',
              ward: '',
              business_status: '',
              customer_type: [],
              product_id: '',
              knows_product: '',
              is_selling: '',
              vendor: '',
              vendor_current_only: false,
              has_remaining_payment: false,
              has_pending_orders: false,
              not_ordered_from: '',
              not_ordered_to: '',
            })
          }
          className="text-sm text-slate-500 hover:text-slate-700"
        >
          Clear filters
        </button>
      </div>
    </div>
  );
}
