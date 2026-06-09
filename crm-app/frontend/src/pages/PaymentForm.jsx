import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import EditAudit from '../components/EditAudit';
import {
  formPage,
  formPageNarrow,
  formTitle,
  formLabel,
  formInput,
  formHint,
  formCard,
  formGrid2,
  formActions,
  formBtnSuccess,
  formBtnSecondary,
  formAlertError,
} from '../utils/formStyles';

export default function PaymentForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [form, setForm] = useState({
    customerId: searchParams.get('customer') || '',
    orderId: '',
    paymentType: 'cash',
    amount: '',
    paymentDate: new Date().toISOString().split('T')[0],
    status: 'completed',
    chequeNumber: '',
    bankName: '',
    qrReference: '',
    qrProvider: '',
    creditDueDate: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [auditRecord, setAuditRecord] = useState(null);

  useEffect(() => {
    api.get('/customers').then((res) => setCustomers(res.data));
    if (isEdit) {
      api.get(`/payments/${id}`).then((res) => {
        const p = res.data;
        setAuditRecord(p);
        setForm({
          customerId: p.customerId,
          orderId: p.orderId || '',
          paymentType: p.paymentType,
          amount: String(p.amount),
          paymentDate: p.paymentDate.split('T')[0],
          status: p.status,
          chequeNumber: p.chequeNumber || '',
          bankName: p.bankName || '',
          qrReference: p.qrReference || '',
          qrProvider: p.qrProvider || '',
          creditDueDate: p.creditDueDate ? p.creditDueDate.split('T')[0] : '',
        });
      });
    }
  }, [id, isEdit]);

  useEffect(() => {
    if (form.customerId) {
      api.get('/orders', { params: { customer_id: form.customerId } }).then((res) => {
        setOrders(res.data.filter((o) => o.status !== 'cancelled'));
      });
    } else {
      setOrders([]);
    }
  }, [form.customerId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const payload = {
      ...form,
      amount: Number(form.amount),
      orderId: form.orderId || null,
      chequeNumber: form.chequeNumber || null,
      bankName: form.bankName || null,
      qrReference: form.qrReference || null,
      qrProvider: form.qrProvider || null,
      creditDueDate: form.creditDueDate || null,
      status: form.paymentType === 'credit' && !isEdit ? 'pending' : form.status,
    };
    try {
      if (isEdit) {
        await api.put(`/payments/${id}`, payload);
      } else {
        await api.post('/payments', payload);
      }
      navigate('/payments');
    } catch (err) {
      setError(err.response?.data?.error || `Failed to ${isEdit ? 'update' : 'record'} payment`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`${formPage} ${formPageNarrow}`}>
      <h2 className={formTitle}>{isEdit ? 'Edit Payment' : 'Record Payment'}</h2>
      {isEdit && <EditAudit record={auditRecord} className="mb-4" />}
      {error && <div className={formAlertError}>{error}</div>}

      <form onSubmit={handleSubmit} className={formCard}>
        <div>
          <label className={formLabel}>Customer *</label>
          <select
            className={formInput}
            value={form.customerId}
            onChange={(e) => setForm({ ...form, customerId: e.target.value, orderId: '' })}
            required
            disabled={isEdit}
          >
            <option value="">Select customer</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.shopName} — Remaining: Rs {c.balance?.remaining?.toLocaleString() || 0}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={formLabel}>Link to Order (optional)</label>
          <select
            className={formInput}
            value={form.orderId}
            onChange={(e) => setForm({ ...form, orderId: e.target.value })}
          >
            <option value="">General payment</option>
            {orders.map((o) => (
              <option key={o.id} value={o.id}>
                {new Date(o.orderDate).toLocaleDateString()} — Rs {Number(o.totalAmount).toLocaleString()} ({o.status})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={formLabel}>Payment Type *</label>
          <select
            className={formInput}
            value={form.paymentType}
            onChange={(e) => setForm({ ...form, paymentType: e.target.value })}
          >
            <option value="cash">Cash</option>
            <option value="credit">Credit</option>
            <option value="cheque">Cheque</option>
            <option value="qr">QR Payment</option>
          </select>
        </div>

        <div className={formGrid2}>
          <div>
            <label className={formLabel}>Amount (Rs) *</label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              className={formInput}
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              required
            />
          </div>
          <div>
            <label className={formLabel}>Payment Date *</label>
            <input
              type="date"
              className={formInput}
              value={form.paymentDate}
              onChange={(e) => setForm({ ...form, paymentDate: e.target.value })}
              required
            />
          </div>
        </div>

        {isEdit && (
          <div>
            <label className={formLabel}>Status</label>
            <select
              className={formInput}
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="bounced">Bounced</option>
            </select>
          </div>
        )}

        {form.paymentType === 'cheque' && (
          <div className={formGrid2}>
            <div>
              <label className={formLabel}>Cheque Number</label>
              <input className={formInput} value={form.chequeNumber} onChange={(e) => setForm({ ...form, chequeNumber: e.target.value })} />
            </div>
            <div>
              <label className={formLabel}>Bank Name</label>
              <input className={formInput} value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} />
            </div>
          </div>
        )}

        {form.paymentType === 'qr' && (
          <div className={formGrid2}>
            <div>
              <label className={formLabel}>QR Reference / Txn ID</label>
              <input className={formInput} value={form.qrReference} onChange={(e) => setForm({ ...form, qrReference: e.target.value })} />
            </div>
            <div>
              <label className={formLabel}>Provider</label>
              <select className={formInput} value={form.qrProvider} onChange={(e) => setForm({ ...form, qrProvider: e.target.value })}>
                <option value="">Select</option>
                <option value="esewa">eSewa</option>
                <option value="khalti">Khalti</option>
                <option value="fonepay">Fonepay</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
        )}

        {form.paymentType === 'credit' && (
          <div>
            <label className={formLabel}>Credit Due Date</label>
            <input
              type="date"
              className={formInput}
              value={form.creditDueDate}
              onChange={(e) => setForm({ ...form, creditDueDate: e.target.value })}
            />
            {!isEdit && (
              <p className={formHint}>Credit payments are saved as pending until marked completed.</p>
            )}
          </div>
        )}

        <div className={formActions}>
          <button type="submit" disabled={loading} className={formBtnSuccess}>
            {loading ? 'Saving...' : isEdit ? 'Save Payment' : 'Record Payment'}
          </button>
          <button type="button" onClick={() => navigate(-1)} className={formBtnSecondary}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
