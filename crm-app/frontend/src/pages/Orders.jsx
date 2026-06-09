import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import ConfirmDialog from '../components/ConfirmDialog';
import RequestDeleteDialog from '../components/RequestDeleteDialog';
import PageHeader from '../components/PageHeader';
import { LastEditedBy } from '../components/EditAudit';
import {
  pageShell,
  pageCard,
  pageToolbar,
  dataTableWrap,
  dataTable,
  btnToolbarPrimary,
  btnLink,
  btnLinkDanger,
  btnLinkWarning,
  btnLinkSuccess,
  badgeAmber,
  badgeBlue,
  badgeGreen,
  badgeSlate,
  emptyState,
  formInput,
} from '../utils/formStyles';

const statusBadges = {
  pending: badgeAmber,
  confirmed: badgeBlue,
  delivered: badgeGreen,
  cancelled: badgeSlate,
};

export default function Orders() {
  const [searchParams] = useSearchParams();
  const [orders, setOrders] = useState([]);
  const [outstandingCustomerIds, setOutstandingCustomerIds] = useState(() => new Set());
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [requestDeleteTarget, setRequestDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const { canEdit, canDelete, canRequestDelete, isOwner } = useAuth();

  const load = () => {
    const params = {};
    if (statusFilter) params.status = statusFilter;
    Promise.all([
      api.get('/orders', { params }),
      api.get('/payments/outstanding'),
    ]).then(([ordersRes, outstandingRes]) => {
      setOrders(ordersRes.data);
      setOutstandingCustomerIds(new Set(outstandingRes.data.map((c) => c.id)));
    });
  };

  useEffect(() => { load(); }, [statusFilter]);

  const updateStatus = async (id, status) => {
    try {
      await api.patch(`/orders/${id}/status`, { status });
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update status');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/orders/${deleteTarget.id}`);
      setDeleteTarget(null);
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete order');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className={pageShell}>
      <PageHeader
        title="Orders"
        subtitle="Track pending, confirmed, and delivered orders"
        actions={
          canEdit ? (
            <Link to="/orders/new" className={btnToolbarPrimary}>
              + New Order
            </Link>
          ) : null
        }
      />

      <div className={pageToolbar}>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={`${formInput} w-auto min-w-[10rem]`}
        >
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <div className={`${pageCard} overflow-hidden`}>
        {orders.length === 0 ? (
          <div className={emptyState}>No orders found</div>
        ) : (
          <div className={dataTableWrap}>
            <table className={dataTable}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th>Status</th>
                  <th className="text-right">Total</th>
                  {isOwner && <th>Last edited</th>}
                  {canEdit && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td>{new Date(o.orderDate).toLocaleDateString()}</td>
                    <td>
                      <Link to={`/customers/${o.customer.id}`} className="text-blue-600 hover:underline">
                        {o.customer.shopName}
                      </Link>
                    </td>
                    <td className="text-slate-600 max-w-xs truncate">
                      {o.items?.map((i) => `${i.productName} (${i.quantity} ${i.unit})`).join(', ')}
                    </td>
                    <td>
                      <span className={statusBadges[o.status]}>{o.status}</span>
                    </td>
                    <td className="text-right font-medium">Rs {Number(o.totalAmount).toLocaleString()}</td>
                    {isOwner && (
                      <td><LastEditedBy record={o} /></td>
                    )}
                    {canEdit && (
                      <td className="whitespace-nowrap space-x-2">
                        {o.status !== 'delivered' && (
                          <Link to={`/orders/${o.id}/edit`} className={btnLink}>Edit</Link>
                        )}
                        {o.status === 'pending' && (
                          <button type="button" onClick={() => updateStatus(o.id, 'confirmed')} className={btnLink}>
                            Confirm
                          </button>
                        )}
                        {o.status === 'confirmed' && (
                          <button type="button" onClick={() => updateStatus(o.id, 'delivered')} className={btnLinkSuccess}>
                            Deliver
                          </button>
                        )}
                        {o.status !== 'cancelled' && o.status !== 'delivered' && (
                          <button type="button" onClick={() => updateStatus(o.id, 'cancelled')} className={btnLinkWarning}>
                            Cancel
                          </button>
                        )}
                        {o.status !== 'delivered' && canDelete && !outstandingCustomerIds.has(o.customerId) && (
                          <button type="button" onClick={() => setDeleteTarget(o)} className={btnLinkDanger}>
                            Delete
                          </button>
                        )}
                        {o.status !== 'delivered' && canRequestDelete && (
                          <button type="button" onClick={() => setRequestDeleteTarget(o)} className={btnLinkWarning}>
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

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Order"
        message="Delete this order? Orders with linked payments cannot be deleted."
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />

      <RequestDeleteDialog
        open={Boolean(requestDeleteTarget)}
        title="Request Delete Order"
        entityType="order"
        entityId={requestDeleteTarget?.id}
        entityLabel={`order from ${new Date(requestDeleteTarget?.orderDate || '').toLocaleDateString()}`}
        onSuccess={() => { setRequestDeleteTarget(null); alert('Delete request submitted for owner review.'); }}
        onCancel={() => setRequestDeleteTarget(null)}
      />
    </div>
  );
}
