import { useEffect, useMemo, useState, useId } from 'react';
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

const emptyBalance = { totalOrders: 0, totalPaid: 0, remaining: 0, pendingSettlement: 0 };

export default function PaymentForm() {
  const fieldId = useId();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [customerBalance, setCustomerBalance] = useState(emptyBalance);
  const [orderBalance, setOrderBalance] = useState(null);
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
    if (!form.customerId) {
      setCustomerBalance(emptyBalance);
      setOrders([]);
      return;
    }
    api.get(`/customers/${form.customerId}/balance`).then((res) => setCustomerBalance(res.data));
    api.get('/orders', { params: { customer_id: form.customerId } }).then((res) => {
      setOrders(res.data.filter((o) => o.status !== 'cancelled'));
    });
  }, [form.customerId]);

  useEffect(() => {
    if (!form.orderId) {
      setOrderBalance(null);
      return;
    }
    api.get(`/orders/${form.orderId}/balance`).then((res) => setOrderBalance(res.data)).catch(() => {
      setOrderBalance(null);
    });
  }, [form.orderId]);

  const effectiveStatus = useMemo(() => {
    if (isEdit) return form.status;
    if (form.paymentType === 'credit' || form.paymentType === 'cheque') return 'pending';
    return 'completed';
  }, [form.paymentType, form.status, isEdit]);

  const amountNum = Number(form.amount) || 0;

  // When editing an already-completed payment its amount is baked into the balance the
  // API returned, so add it back before capping — otherwise re-saving the same payment
  // is blocked by the `max` on the amount field even though the server would accept it.
  const editedCompletedAmount =
    isEdit && auditRecord?.status === 'completed' ? Number(auditRecord.amount) || 0 : 0;
  const availableRemaining = customerBalance.remaining + editedCompletedAmount;

  const remainingAfterPayment = effectiveStatus === 'completed'
    ? Math.max(0, availableRemaining - amountNum)
    : customerBalance.remaining;

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
      status: effectiveStatus,
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

  const fillRemaining = () => {
    const target = orderBalance?.remainingOnOrder ?? availableRemaining;
    if (target > 0) {
      setForm((prev) => ({ ...prev, amount: String(target) }));
    }
  };

  return (
    <div className={`${formPage} ${formPageNarrow}`}>
      <h2 className={formTitle}>{isEdit ? 'Edit Payment' : 'Record Payment'}</h2>
      {isEdit && <EditAudit record={auditRecord} className="mb-4" />}
      {error && <div className={formAlertError}>{error}</div>}

      <form onSubmit={handleSubmit} className={formCard}>
        <div>
          <label htmlFor={`${fieldId}-customer`} className={formLabel}>Customer *</label>
          <select id={`${fieldId}-customer`}
            className={formInput}
            value={form.customerId}
            onChange={(e) => setForm({ ...form, customerId: e.target.value, orderId: '' })}
            required
            disabled={isEdit}
          >
            <option value="">Select customer</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.shopName} — Due: Rs {c.balance?.remaining?.toLocaleString() || 0}
              </option>
            ))}
          </select>
        </div>

        {form.customerId && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 space-y-1">
            <p><strong>Ordered:</strong> Rs {customerBalance.totalOrders.toLocaleString()}</p>
            <p><strong>Paid:</strong> Rs {customerBalance.totalPaid.toLocaleString()}</p>
            <p><strong>Balance due:</strong> Rs {customerBalance.remaining.toLocaleString()}</p>
            {(customerBalance.pendingSettlement || 0) > 0 && (
              <p><strong>Pending credit/cheque:</strong> Rs {customerBalance.pendingSettlement.toLocaleString()}</p>
            )}
          </div>
        )}

        <div>
          <label htmlFor={`${fieldId}-link-to-order-optional`} className={formLabel}>Link to Order (optional)</label>
          <select id={`${fieldId}-link-to-order-optional`}
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
          {orderBalance && (
            <p className={formHint}>
              Order total Rs {orderBalance.orderTotal.toLocaleString()} · Paid Rs {orderBalance.paidOnOrder.toLocaleString()} · Remaining Rs {orderBalance.remainingOnOrder.toLocaleString()}
            </p>
          )}
        </div>

        <div>
          <label htmlFor={`${fieldId}-payment-type`} className={formLabel}>Payment Type *</label>
          <select id={`${fieldId}-payment-type`}
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
            <label htmlFor={`${fieldId}-amount-rs`} className={formLabel}>Amount (Rs) *</label>
            <input id={`${fieldId}-amount-rs`}
              type="number"
              min="0.01"
              step="0.01"
              max={effectiveStatus === 'completed' ? availableRemaining || undefined : undefined}
              className={formInput}
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              required
            />
            {form.customerId && availableRemaining > 0 && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button type="button" onClick={fillRemaining} className="text-sm text-blue-600 hover:underline">
                  Pay full remaining
                </button>
                {amountNum > 0 && effectiveStatus === 'completed' && (
                  <span className={formHint}>
                    Rs {remainingAfterPayment.toLocaleString()} will remain due after this payment
                  </span>
                )}
              </div>
            )}
          </div>
          <div>
            <label htmlFor={`${fieldId}-payment-date`} className={formLabel}>Payment Date *</label>
            <input id={`${fieldId}-payment-date`}
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
            <label htmlFor={`${fieldId}-status`} className={formLabel}>Status</label>
            <select id={`${fieldId}-status`}
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
              <label htmlFor={`${fieldId}-cheque-number`} className={formLabel}>Cheque Number</label>
              <input id={`${fieldId}-cheque-number`} className={formInput} value={form.chequeNumber} onChange={(e) => setForm({ ...form, chequeNumber: e.target.value })} />
            </div>
            <div>
              <label htmlFor={`${fieldId}-bank-name`} className={formLabel}>Bank Name</label>
              <input id={`${fieldId}-bank-name`} className={formInput} value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} />
            </div>
            {!isEdit && (
              <p className={`${formHint} lg:col-span-2`}>Cheque payments are saved as pending until marked completed.</p>
            )}
          </div>
        )}

        {form.paymentType === 'qr' && (
          <div className={formGrid2}>
            <div>
              <label htmlFor={`${fieldId}-qr-reference-txn-id`} className={formLabel}>QR Reference / Txn ID</label>
              <input id={`${fieldId}-qr-reference-txn-id`} className={formInput} value={form.qrReference} onChange={(e) => setForm({ ...form, qrReference: e.target.value })} />
            </div>
            <div>
              <label htmlFor={`${fieldId}-provider`} className={formLabel}>Provider</label>
              <select id={`${fieldId}-provider`} className={formInput} value={form.qrProvider} onChange={(e) => setForm({ ...form, qrProvider: e.target.value })}>
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
            <label htmlFor={`${fieldId}-credit-due-date`} className={formLabel}>Credit Due Date</label>
            <input id={`${fieldId}-credit-due-date`}
              type="date"
              className={formInput}
              value={form.creditDueDate}
              onChange={(e) => setForm({ ...form, creditDueDate: e.target.value })}
            />
            {!isEdit && (
              <p className={formHint}>Credit payments are saved as pending until marked completed. Balance due is unchanged until then.</p>
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
