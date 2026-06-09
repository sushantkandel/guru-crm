import NepalLocationSelect from './NepalLocationSelect';
import { formLabel, formInput, pageCardPadded } from '../utils/formStyles';

export default function CustomerFilters({ filters, onChange }) {
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
