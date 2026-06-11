import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import CustomerFilters from '../components/CustomerFilters';
import ConfirmDialog from '../components/ConfirmDialog';
import RequestDeleteDialog from '../components/RequestDeleteDialog';
import PageHeader from '../components/PageHeader';
import { LastEditedBy } from '../components/EditAudit';
import {
  pageShell,
  pageCard,
  dataTableWrap,
  dataTable,
  btnToolbarPrimary,
  btnLink,
  btnLinkDanger,
  btnLinkWarning,
  badgeGreen,
  badgeAmber,
  badgeBlue,
  emptyState,
  loadingState,
  formAlertError,
} from '../utils/formStyles';

const defaultFilters = {
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
};

function conversionStatusLabel(status) {
  if (status === 'converted') return 'Converted';
  if (status === 'not_converted') return 'Not Converted';
  return 'Just Visited';
}

function ConversionStatusBadge({ status }) {
  const styles = {
    converted: badgeGreen,
    not_converted: badgeAmber,
    just_visited: badgeBlue,
  };
  return (
    <span className={styles[status] || styles.just_visited}>
      {conversionStatusLabel(status)}
    </span>
  );
}

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [filters, setFilters] = useState(defaultFilters);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [requestDeleteTarget, setRequestDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const { canEdit, canDelete, canRequestDelete, isOwner } = useAuth();

  const loadCustomers = () => {
    setLoading(true);
    setLoadError('');
    const params = {};
    if (filters.q) params.q = filters.q;
    if (filters.province) params.province = filters.province;
    if (filters.district) params.district = filters.district;
    if (filters.municipality) params.municipality = filters.municipality;
    if (filters.ward) params.ward = filters.ward;
    if (filters.business_status) params.business_status = filters.business_status;
    if (filters.customer_type.length) {
      params.customer_type = filters.customer_type.join(',');
    }
    if (filters.product_id) params.product_id = filters.product_id;
    if (filters.knows_product) params.knows_product = filters.knows_product;
    if (filters.is_selling) params.is_selling = filters.is_selling;
    if (filters.vendor) params.vendor = filters.vendor;
    if (filters.vendor_current_only) params.vendor_current_only = 'true';
    if (filters.has_remaining_payment) params.has_remaining_payment = 'true';
    if (filters.has_pending_orders) params.has_pending_orders = 'true';
    if (filters.not_ordered_from) params.not_ordered_from = filters.not_ordered_from;
    if (filters.not_ordered_to) params.not_ordered_to = filters.not_ordered_to;

    api
      .get('/customers', { params })
      .then((res) => setCustomers(res.data))
      .catch((err) => {
        setCustomers([]);
        setLoadError(err.response?.data?.error || 'Failed to load customers');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const timer = setTimeout(loadCustomers, 300);
    return () => clearTimeout(timer);
  }, [filters]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/customers/${deleteTarget.id}`);
      setDeleteTarget(null);
      loadCustomers();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete customer');
    } finally {
      setDeleting(false);
    }
  };

  const showActions = canDelete || canRequestDelete;

  return (
    <div className={pageShell}>
      <PageHeader
        title="Customers"
        subtitle="Search, filter, and manage your shop contacts"
        actions={
          canEdit ? (
            <Link to="/customers/new" className={btnToolbarPrimary}>
              + Add Customer
            </Link>
          ) : null
        }
      />

      <CustomerFilters filters={filters} onChange={setFilters} />

      {loadError && <div className={`${formAlertError} mt-4`}>{loadError}</div>}

      <div className={`${pageCard} mt-4 overflow-hidden`}>
        {loading ? (
          <div className={loadingState}>Loading…</div>
        ) : customers.length === 0 ? (
          <div className={emptyState}>No customers found</div>
        ) : (
          <div className={dataTableWrap}>
            <table className={dataTable}>
              <thead>
                <tr>
                  <th>Name / Shop</th>
                  <th>Conversion</th>
                  <th>Phone</th>
                  <th>Location</th>
                  <th>Pending</th>
                  <th className="text-right">Remaining</th>
                  <th>Last Order</th>
                  {isOwner && <th>Last edited</th>}
                  {showActions && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <Link to={`/customers/${c.id}`} className="font-medium text-blue-600 hover:underline">
                        {c.name}
                      </Link>
                      <p className="text-xs text-slate-500 mt-0.5">{c.shopName}</p>
                    </td>
                    <td>
                      <ConversionStatusBadge status={c.businessStatus} />
                    </td>
                    <td className="text-slate-600">{c.phone}</td>
                    <td className="text-slate-600">
                      {c.address
                        ? `${c.address.municipality}, W${c.address.ward}, ${c.address.district}`
                        : '—'}
                    </td>
                    <td>
                      {c.pendingOrderCount > 0 ? (
                        <span className={badgeAmber}>{c.pendingOrderCount} pending</span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="text-right">
                      {c.balance.remaining > 0 ? (
                        <span className="text-red-600 font-medium">Rs {c.balance.remaining.toLocaleString()}</span>
                      ) : (
                        <span className="text-green-600">Paid</span>
                      )}
                    </td>
                    <td className="text-slate-500">
                      {c.lastOrderDate ? new Date(c.lastOrderDate).toLocaleDateString() : 'Never'}
                    </td>
                    {isOwner && (
                      <td><LastEditedBy record={c} /></td>
                    )}
                    {showActions && (
                      <td className="whitespace-nowrap space-x-2">
                        {canDelete && c.balance.remaining <= 0 && (
                          <button type="button" onClick={() => setDeleteTarget(c)} className={btnLinkDanger}>
                            Delete
                          </button>
                        )}
                        {canRequestDelete && (
                          <button type="button" onClick={() => setRequestDeleteTarget(c)} className={btnLinkWarning}>
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
        title="Delete Customer"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This will also delete all their orders and payments.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />

      <RequestDeleteDialog
        open={Boolean(requestDeleteTarget)}
        title="Request Delete Customer"
        entityType="customer"
        entityId={requestDeleteTarget?.id}
        entityLabel={requestDeleteTarget?.name}
        onSuccess={() => { setRequestDeleteTarget(null); alert('Delete request submitted for owner review.'); }}
        onCancel={() => setRequestDeleteTarget(null)}
      />
    </div>
  );
}
