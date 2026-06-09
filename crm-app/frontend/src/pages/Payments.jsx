import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import ConfirmDialog from '../components/ConfirmDialog';
import RequestDeleteDialog from '../components/RequestDeleteDialog';
import PageHeader from '../components/PageHeader';
import PaymentFilters, { defaultPaymentFilters } from '../components/PaymentFilters';
import { LastEditedBy } from '../components/EditAudit';
import {
  pageShell,
  pageCard,
  pageToolbar,
  dataTableWrap,
  dataTable,
  btnToolbarSuccess,
  btnLink,
  btnLinkDanger,
  btnLinkWarning,
  btnLinkSuccess,
  tabGroup,
  tabBtn,
  tabBtnActive,
  emptyState,
  loadingState,
} from '../utils/formStyles';

function buildFilterParams(filters) {
  const params = {};
  if (filters.shop_name) params.shop_name = filters.shop_name;
  if (filters.customer_name) params.customer_name = filters.customer_name;
  if (filters.phone) params.phone = filters.phone;
  if (filters.province) params.province = filters.province;
  if (filters.district) params.district = filters.district;
  if (filters.municipality) params.municipality = filters.municipality;
  if (filters.ward) params.ward = filters.ward;
  if (filters.product_id) params.product_id = filters.product_id;
  return params;
}

function formatCustomerLocation(addresses) {
  const addr = addresses?.[0];
  if (!addr) return '—';
  return `${addr.municipality}, W${addr.ward}, ${addr.district}`;
}

export default function Payments() {
  const [outstanding, setOutstanding] = useState([]);
  const [payments, setPayments] = useState([]);
  const [filters, setFilters] = useState(defaultPaymentFilters);
  const [tab, setTab] = useState('outstanding');
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [requestDeleteTarget, setRequestDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const { canEdit, canDelete, canRequestDelete, isOwner } = useAuth();

  const load = () => {
    setLoading(true);
    const params = buildFilterParams(filters);
    Promise.all([
      api.get('/payments/outstanding', { params }),
      api.get('/payments', { params }),
    ])
      .then(([outRes, payRes]) => {
        setOutstanding(outRes.data);
        setPayments(payRes.data);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const timer = setTimeout(load, 300);
    return () => clearTimeout(timer);
  }, [filters]);

  const markCompleted = async (id) => {
    try {
      await api.patch(`/payments/${id}/status`, { status: 'completed' });
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update');
    }
  };

  const outstandingCustomerIds = new Set(outstanding.map((c) => c.id));

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/payments/${deleteTarget.id}`);
      setDeleteTarget(null);
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete payment');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className={pageShell}>
      <PageHeader
        title="Payments"
        subtitle="Outstanding balances and payment history"
        actions={
          canEdit ? (
            <Link to="/payments/new" className={btnToolbarSuccess}>
              + Record Payment
            </Link>
          ) : null
        }
      />

      <div className={pageToolbar}>
        <div className={tabGroup}>
          <button
            type="button"
            onClick={() => setTab('outstanding')}
            className={tab === 'outstanding' ? tabBtnActive : tabBtn}
          >
            Outstanding ({outstanding.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('history')}
            className={tab === 'history' ? tabBtnActive : tabBtn}
          >
            Payment History
          </button>
        </div>
      </div>

      <PaymentFilters filters={filters} onChange={setFilters} />

      {tab === 'outstanding' ? (
        <div className={`${pageCard} mt-4 overflow-hidden`}>
          {loading ? (
            <div className={loadingState}>Loading…</div>
          ) : outstanding.length === 0 ? (
            <div className={emptyState}>All payments cleared</div>
          ) : (
            <div className={dataTableWrap}>
              <table className={dataTable}>
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Shop</th>
                    <th>Phone</th>
                    <th className="text-right">Total Orders</th>
                    <th className="text-right">Paid</th>
                    <th className="text-right">Remaining</th>
                    {canEdit && <th></th>}
                  </tr>
                </thead>
                <tbody>
                  {outstanding.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <Link to={`/customers/${c.id}`} className="text-blue-600 hover:underline">{c.name}</Link>
                      </td>
                      <td>{c.shopName}</td>
                      <td className="text-slate-600">{c.phone}</td>
                      <td className="text-right">Rs {c.balance.totalOrders.toLocaleString()}</td>
                      <td className="text-right">Rs {c.balance.totalPaid.toLocaleString()}</td>
                      <td className="text-right font-bold text-red-600">Rs {c.balance.remaining.toLocaleString()}</td>
                      {canEdit && (
                        <td>
                          <Link to={`/payments/new?customer=${c.id}`} className={btnLinkSuccess}>
                            Record
                          </Link>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className={`${pageCard} mt-4 overflow-hidden`}>
          {loading ? (
            <div className={loadingState}>Loading…</div>
          ) : payments.length === 0 ? (
            <div className={emptyState}>No payments recorded yet</div>
          ) : (
            <div className={dataTableWrap}>
              <table className={dataTable}>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Shop</th>
                    <th>Customer</th>
                    <th>Location</th>
                    <th>Phone</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th className="text-right">Amount</th>
                    {isOwner && <th>Last edited</th>}
                    {canEdit && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id}>
                      <td>{new Date(p.paymentDate).toLocaleDateString()}</td>
                      <td>
                        <Link to={`/customers/${p.customer.id}`} className="text-blue-600 hover:underline">
                          {p.customer.shopName}
                        </Link>
                      </td>
                      <td className="text-slate-600">{p.customer.name}</td>
                      <td className="text-slate-600">{formatCustomerLocation(p.customer.addresses)}</td>
                      <td className="text-slate-600">{p.customer.phone || '—'}</td>
                      <td className="capitalize">{p.paymentType}</td>
                      <td className="capitalize">{p.status}</td>
                      <td className="text-right font-medium">Rs {Number(p.amount).toLocaleString()}</td>
                      {isOwner && (
                        <td><LastEditedBy record={p} /></td>
                      )}
                      {canEdit && (
                        <td className="whitespace-nowrap space-x-2">
                          <Link to={`/payments/${p.id}/edit`} className={btnLink}>Edit</Link>
                          {p.status === 'pending' && (
                            <button type="button" onClick={() => markCompleted(p.id)} className={btnLinkSuccess}>
                              Complete
                            </button>
                          )}
                          {canDelete && !outstandingCustomerIds.has(p.customer.id) && (
                            <button type="button" onClick={() => setDeleteTarget(p)} className={btnLinkDanger}>
                              Delete
                            </button>
                          )}
                          {canRequestDelete && (
                            <button type="button" onClick={() => setRequestDeleteTarget(p)} className={btnLinkWarning}>
                              Request Delete
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Payment"
        message={`Delete payment of Rs ${Number(deleteTarget?.amount || 0).toLocaleString()}? Customer balance will be recalculated.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />

      <RequestDeleteDialog
        open={Boolean(requestDeleteTarget)}
        title="Request Delete Payment"
        entityType="payment"
        entityId={requestDeleteTarget?.id}
        entityLabel={`payment of Rs ${Number(requestDeleteTarget?.amount || 0).toLocaleString()}`}
        onSuccess={() => { setRequestDeleteTarget(null); alert('Delete request submitted for owner review.'); }}
        onCancel={() => setRequestDeleteTarget(null)}
      />
    </div>
  );
}
