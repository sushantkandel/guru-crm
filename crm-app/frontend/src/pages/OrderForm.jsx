import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import ProductSelect from '../components/ProductSelect';
import EditAudit from '../components/EditAudit';
import {
  formPage,
  formPageWide,
  formTitle,
  formLabel,
  formInput,
  formCard,
  formGrid2,
  formActions,
  formBtnPrimary,
  formBtnSecondary,
  formAlertError,
  formOrderItem,
  formOrderItemGrid,
} from '../utils/formStyles';

const emptyItem = () => ({ productId: '', productName: '', quantity: 1, unit: 'packet', unitPrice: 0 });

export default function OrderForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [form, setForm] = useState({
    customerId: searchParams.get('customer') || '',
    orderDate: new Date().toISOString().split('T')[0],
    notes: '',
    items: [emptyItem()],
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [auditRecord, setAuditRecord] = useState(null);

  useEffect(() => {
    api.get('/customers').then((res) => setCustomers(res.data));
    if (isEdit) {
      api.get(`/orders/${id}`).then((res) => {
        const o = res.data;
        setAuditRecord(o);
        setForm({
          customerId: o.customerId,
          orderDate: o.orderDate.split('T')[0],
          notes: o.notes || '',
          items: o.items.map((i) => ({
            productId: i.productId || '',
            productName: i.productName,
            quantity: i.quantity,
            unit: i.unit,
            unitPrice: i.unitPrice,
          })),
        });
      });
    }
  }, [id, isEdit]);

  const updateItem = (index, field, value) => {
    const items = [...form.items];
    items[index] = { ...items[index], [field]: value };
    setForm({ ...form, items });
  };

  const handleProductSelect = (index, productData) => {
    const items = [...form.items];
    items[index] = { ...items[index], ...productData };
    setForm({ ...form, items });
  };

  const addItem = () => setForm({ ...form, items: [...form.items, emptyItem()] });
  const removeItem = (index) => {
    if (form.items.length === 1) return;
    setForm({ ...form, items: form.items.filter((_, i) => i !== index) });
  };

  const total = form.items.reduce((sum, i) => sum + (Number(i.quantity) * Number(i.unitPrice)), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const payload = {
      ...form,
      items: form.items.map((i) => ({
        productId: i.productId || null,
        productName: i.productName,
        quantity: Number(i.quantity),
        unit: i.unit,
        unitPrice: Number(i.unitPrice),
      })),
    };
    try {
      if (isEdit) {
        await api.put(`/orders/${id}`, {
          orderDate: payload.orderDate,
          notes: payload.notes,
          items: payload.items,
        });
      } else {
        await api.post('/orders', payload);
      }
      navigate('/orders');
    } catch (err) {
      setError(err.response?.data?.error || `Failed to ${isEdit ? 'update' : 'create'} order`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`${formPage} ${formPageWide}`}>
      <h2 className={formTitle}>{isEdit ? 'Edit Order' : 'New Order'}</h2>
      {isEdit && <EditAudit record={auditRecord} className="mb-4" />}
      {error && <div className={formAlertError}>{error}</div>}

      <form onSubmit={handleSubmit} className={formCard}>
        <div className={formGrid2}>
          <div>
            <label className={formLabel}>Customer *</label>
            <select
              className={formInput}
              value={form.customerId}
              onChange={(e) => setForm({ ...form, customerId: e.target.value })}
              required
              disabled={isEdit}
            >
              <option value="">Select customer</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.shopName} — {c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={formLabel}>Order Date *</label>
            <input
              type="date"
              className={formInput}
              value={form.orderDate}
              onChange={(e) => setForm({ ...form, orderDate: e.target.value })}
              required
            />
          </div>
        </div>

        <div>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-3">
            <label className={formLabel + ' mb-0'}>Order Items</label>
            <button type="button" onClick={addItem} className="text-base sm:text-base text-blue-600 hover:underline text-left sm:text-right">
              + Add item
            </button>
          </div>
          {form.items.map((item, index) => (
            <div key={index} className={formOrderItem}>
              <div className={formOrderItemGrid}>
                <div className="lg:col-span-4">
                  <label className="form-label lg:hidden">Product</label>
                  <ProductSelect
                    className={formInput}
                    value={item}
                    onChange={(data) => handleProductSelect(index, data)}
                  />
                </div>
                <div className="lg:col-span-2">
                  <label className="form-label lg:hidden">Quantity</label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    className={formInput}
                    placeholder="Qty"
                    value={item.quantity}
                    onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                    required
                  />
                </div>
                <div className="lg:col-span-2">
                  <label className="form-label lg:hidden">Unit</label>
                  <select
                    className={formInput}
                    value={item.unit}
                    onChange={(e) => updateItem(index, 'unit', e.target.value)}
                  >
                    <option value="packet">Packet</option>
                    <option value="bundle">Bundle</option>
                    <option value="bag">Bag</option>
                  </select>
                </div>
                <div className="lg:col-span-2">
                  <label className="form-label lg:hidden">Unit price</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className={formInput}
                    placeholder="Unit price"
                    value={item.unitPrice}
                    onChange={(e) => updateItem(index, 'unitPrice', e.target.value)}
                    required
                  />
                </div>
                <div className="lg:col-span-2 flex items-center justify-between gap-2">
                  <span className="text-base sm:text-base text-slate-700 font-medium">
                    Rs {(Number(item.quantity) * Number(item.unitPrice)).toLocaleString()}
                  </span>
                  {form.items.length > 1 && (
                    <button type="button" onClick={() => removeItem(index)} className="text-red-500 text-sm sm:text-base px-2 py-1">
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div>
          <label className={formLabel}>Notes</label>
          <textarea
            className={formInput}
            rows={3}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </div>

        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 pt-2">
          <p className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-900">Total: Rs {total.toLocaleString()}</p>
          <div className={`${formActions} pt-0 sm:pt-0`}>
            <button type="submit" disabled={loading} className={formBtnPrimary}>
              {loading ? 'Saving...' : isEdit ? 'Save Order' : 'Create Order'}
            </button>
            <button type="button" onClick={() => navigate(-1)} className={formBtnSecondary}>
              Cancel
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
