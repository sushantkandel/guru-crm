import { useEffect, useState, useId } from 'react';
import api from '../services/api';
import NepalLocationSelect from './NepalLocationSelect';
import { formLabel, formInput, pageCardPadded } from '../utils/formStyles';

export const defaultPaymentFilters = {
  shop_name: '',
  customer_name: '',
  phone: '',
  province: '',
  district: '',
  municipality: '',
  ward: '',
  product_id: '',
};

export default function PaymentFilters({ filters, onChange }) {
  const fieldId = useId();
  const [products, setProducts] = useState([]);

  useEffect(() => {
    api.get('/products').then((res) => setProducts(res.data));
  }, []);

  return (
    <div className={`${pageCardPadded} space-y-4`}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <div>
          <label htmlFor={`${fieldId}-shop-company-name`} className={formLabel}>Shop / company name</label>
          <input id={`${fieldId}-shop-company-name`}
            className={formInput}
            placeholder="e.g. Sundar Shop"
            value={filters.shop_name}
            onChange={(e) => onChange({ ...filters, shop_name: e.target.value })}
          />
        </div>
        <div>
          <label htmlFor={`${fieldId}-customer-name`} className={formLabel}>Customer name</label>
          <input id={`${fieldId}-customer-name`}
            className={formInput}
            placeholder="Contact person name"
            value={filters.customer_name}
            onChange={(e) => onChange({ ...filters, customer_name: e.target.value })}
          />
        </div>
        <div>
          <label htmlFor={`${fieldId}-mobile-number`} className={formLabel}>Mobile number</label>
          <input id={`${fieldId}-mobile-number`}
            type="tel"
            className={formInput}
            placeholder="Phone number"
            value={filters.phone}
            onChange={(e) => onChange({ ...filters, phone: e.target.value })}
          />
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <div>
          <label htmlFor={`${fieldId}-product-item`} className={formLabel}>Product item</label>
          <select id={`${fieldId}-product-item`}
            className={formInput}
            value={filters.product_id}
            onChange={(e) => onChange({ ...filters, product_id: e.target.value })}
          >
            <option value="">All products</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}{p.productCode ? ` (${p.productCode})` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap gap-4">
        <button
          type="button"
          onClick={() => onChange({ ...defaultPaymentFilters })}
          className="text-sm text-slate-500 hover:text-slate-700"
        >
          Clear filters
        </button>
      </div>
    </div>
  );
}
