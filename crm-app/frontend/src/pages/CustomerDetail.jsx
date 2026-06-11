import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import ConfirmDialog from '../components/ConfirmDialog';
import RequestDeleteDialog from '../components/RequestDeleteDialog';
import EditAudit, { LastEditedBy } from '../components/EditAudit';
import GoogleMapsDirectionsButton from '../components/GoogleMapsDirectionsButton';
import ShopRouteMap from '../components/ShopRouteMap';
import PageHeader from '../components/PageHeader';
import CustomerProductInsights from '../components/CustomerProductInsights';
import { customerTypeLabel } from '../constants/customerTypes';
import { resolveShopCoords } from '../utils/mapLinks';
import {
  pageShell,
  pageCardPadded,
  pageSectionTitle,
  pageSectionSubtitle,
  pageActions,
  dataTableWrap,
  dataTableCompact,
  detailGrid,
  btnToolbarPrimary,
  btnToolbarSuccess,
  btnToolbarOutline,
  btnToolbarDanger,
  btnToolbarWarning,
  btnLink,
  btnLinkDanger,
  btnLinkWarning,
  badgeGreen,
  badgeAmber,
  badgeBlue,
  badgeSlate,
  loadingState,
  formInput,
} from '../utils/formStyles';

const statusBadges = {
  converted: badgeGreen,
  not_converted: badgeAmber,
  just_visited: badgeBlue,
};

const orderStatusBadges = {
  pending: badgeAmber,
  confirmed: badgeBlue,
  delivered: badgeGreen,
  cancelled: badgeSlate,
};

const statusLabels = {
  converted: 'Converted',
  not_converted: 'Not Converted',
  just_visited: 'Just Visited',
};

export default function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [showSurveyPrompt, setShowSurveyPrompt] = useState(() => searchParams.get('survey') === '1');
  const [surveyProductId, setSurveyProductId] = useState(() => searchParams.get('product') || '');
  const [customer, setCustomer] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState(null);
  const [requestDelete, setRequestDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const { canEdit, canDelete, canRequestDelete, isOwner } = useAuth();

  const load = () => api.get(`/customers/${id}`).then((res) => setCustomer(res.data));

  useEffect(() => { load(); }, [id]);

  useEffect(() => {
    if (searchParams.get('survey') !== '1') return;
    setShowSurveyPrompt(true);
    const product = searchParams.get('product');
    if (product) setSurveyProductId(product);
    navigate(product ? `/customers/${id}?product=${product}` : `/customers/${id}`, { replace: true });
  }, [searchParams, id, navigate]);

  useEffect(() => {
    if (!showSurveyPrompt || !customer) return;
    document.getElementById('field-intelligence')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [showSurveyPrompt, customer]);

  const handleDeleteCustomer = async () => {
    setDeleting(true);
    try {
      await api.delete(`/customers/${id}`);
      navigate('/customers');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete customer');
    } finally {
      setDeleting(false);
      setDeleteDialog(null);
    }
  };

  const handleDeleteOrder = async (orderId) => {
    try {
      await api.delete(`/orders/${orderId}`);
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete order');
    }
    setDeleteDialog(null);
  };

  const handleDeletePayment = async (paymentId) => {
    try {
      await api.delete(`/payments/${paymentId}`);
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete payment');
    }
    setDeleteDialog(null);
  };

  const updateConversionStatus = async (businessStatus) => {
    try {
      await api.patch(`/customers/${id}/business-status`, { businessStatus });
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update status');
    }
  };

  if (!customer) {
    return <div className={pageShell}><div className={loadingState}>Loading…</div></div>;
  }

  const status = customer.businessStatus || 'just_visited';
  const hasOutstandingBalance = customer.balance.remaining > 0;

  const addr = customer.addresses?.find((a) => a.isPrimary) || customer.addresses?.[0];
  const locationArgs = addr
    ? {
        latitude: addr.latitude,
        longitude: addr.longitude,
        shopName: customer.shopName,
        street: addr.street,
        ward: addr.ward,
        municipality: addr.municipality,
        district: addr.district,
        province: addr.province,
      }
    : null;
  const pinCoords = locationArgs ? resolveShopCoords(locationArgs) : null;

  return (
    <div className={pageShell}>
      <PageHeader
        title={customer.name}
        subtitle={customer.shopName}
        actions={
          <div className={pageActions}>
            {canEdit && (
              <select
                value={status}
                onChange={(e) => updateConversionStatus(e.target.value)}
                className={`${formInput} w-auto min-w-[9rem] py-2 min-h-[40px] text-sm`}
              >
                <option value="converted">Converted</option>
                <option value="not_converted">Not Converted</option>
                <option value="just_visited">Just Visited</option>
              </select>
            )}
            {locationArgs && (
              <GoogleMapsDirectionsButton
                shop={locationArgs}
                label="Get Directions"
                className={btnToolbarOutline}
                showCoords={false}
              />
            )}
            {canEdit && (
              <>
                <Link to={`/customers/${id}/edit`} className={btnToolbarOutline}>Edit</Link>
                <Link to={`/orders/new?customer=${id}`} className={btnToolbarPrimary}>New Order</Link>
                <Link to={`/payments/new?customer=${id}`} className={btnToolbarSuccess}>Record Payment</Link>
              </>
            )}
            {canDelete && !hasOutstandingBalance && (
              <button type="button" onClick={() => setDeleteDialog({ type: 'customer' })} className={btnToolbarDanger}>
                Delete
              </button>
            )}
            {canRequestDelete && (
              <button type="button" onClick={() => setRequestDelete({ type: 'customer' })} className={btnToolbarWarning}>
                Request Delete
              </button>
            )}
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-2 mb-6 -mt-2">
        <span className={statusBadges[status] || statusBadges.just_visited}>
          {statusLabels[status] || 'Just Visited'}
        </span>
        {customer.panVatNumber && (
          <span className="text-xs text-slate-500">PAN/VAT: {customer.panVatNumber}</span>
        )}
        {(customer.customerTypes || []).map((type) => (
          <span key={type} className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
            {customerTypeLabel(type)}
          </span>
        ))}
        <EditAudit record={customer} />
      </div>

      {pinCoords && (
        <div className={`${pageCardPadded} mb-6`}>
          <h3 className={pageSectionTitle}>Route to shop</h3>
          <p className={`${pageSectionSubtitle} mb-3`}>
            Saved pin: {pinCoords.lat.toFixed(7)}, {pinCoords.lng.toFixed(7)}
          </p>
          <ShopRouteMap shop={locationArgs} height={340} />
        </div>
      )}

      <div className={detailGrid}>
        <div className={pageCardPadded}>
          <h3 className={pageSectionTitle}>Contact</h3>
          <p className="text-sm mt-2">{customer.phone}</p>
          <p className="text-sm text-slate-500">{customer.email || '—'}</p>
        </div>
        <div className={pageCardPadded}>
          <h3 className={pageSectionTitle}>Address</h3>
          {addr ? (
            <p className="text-sm mt-2 leading-relaxed">
              {addr.street && `${addr.street}, `}
              Ward {addr.ward}, {addr.municipality}, {addr.district}, {addr.province}
            </p>
          ) : (
            <p className="text-sm text-slate-400 mt-2">No address</p>
          )}
        </div>
        <div className={pageCardPadded}>
          <h3 className={pageSectionTitle}>Balance</h3>
          <p className="text-sm mt-2">Orders: Rs {customer.balance.totalOrders.toLocaleString()}</p>
          <p className="text-sm">Paid: Rs {customer.balance.totalPaid.toLocaleString()}</p>
          <p className={`text-lg font-bold mt-2 ${customer.balance.remaining > 0 ? 'text-red-600' : 'text-green-600'}`}>
            Remaining: Rs {customer.balance.remaining.toLocaleString()}
          </p>
        </div>
      </div>

      {showSurveyPrompt && canEdit && (
        <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
          Shop saved. Add or update the field survey below — product awareness, vendors, and prices.
        </div>
      )}

      <div id="field-intelligence">
        <CustomerProductInsights
          customerId={id}
          canEdit={canEdit}
          autoStart={showSurveyPrompt}
          initialProductId={surveyProductId}
        />
      </div>

      <div className={`${pageCardPadded} mb-4`}>
        <h3 className={`${pageSectionTitle} mb-4`}>Orders</h3>
        {customer.orders?.length === 0 ? (
          <p className="text-sm text-slate-500">No orders yet</p>
        ) : (
          <div className={dataTableWrap}>
            <table className={dataTableCompact}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Items</th>
                  <th>Status</th>
                  <th className="text-right">Amount</th>
                  {isOwner && <th>Last edited</th>}
                  {canEdit && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {customer.orders?.map((o) => (
                  <tr key={o.id}>
                    <td>{new Date(o.orderDate).toLocaleDateString()}</td>
                    <td className="text-slate-600 max-w-xs">
                      {o.items?.map((i) => `${i.productName} (${i.quantity} ${i.unit})`).join(', ')}
                    </td>
                    <td>
                      <span className={orderStatusBadges[o.status]}>{o.status}</span>
                    </td>
                    <td className="text-right font-medium">Rs {Number(o.totalAmount).toLocaleString()}</td>
                    {isOwner && (
                      <td><LastEditedBy record={o} /></td>
                    )}
                    {canEdit && (
                      <td className="whitespace-nowrap space-x-2">
                        {o.status !== 'delivered' && (
                          <>
                            <Link to={`/orders/${o.id}/edit`} className={btnLink}>Edit</Link>
                            {canDelete && !hasOutstandingBalance && (
                              <button type="button" onClick={() => setDeleteDialog({ type: 'order', id: o.id })} className={btnLinkDanger}>
                                Delete
                              </button>
                            )}
                            {canRequestDelete && (
                              <button
                                type="button"
                                onClick={() => setRequestDelete({ type: 'order', id: o.id, label: `order from ${new Date(o.orderDate).toLocaleDateString()}` })}
                                className={btnLinkWarning}
                              >
                                Request Delete
                              </button>
                            )}
                          </>
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

      <div className={pageCardPadded}>
        <h3 className={`${pageSectionTitle} mb-4`}>Payments</h3>
        {customer.payments?.length === 0 ? (
          <p className="text-sm text-slate-500">No payments yet</p>
        ) : (
          <div className={dataTableWrap}>
            <table className={dataTableCompact}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th className="text-right">Amount</th>
                  {isOwner && <th>Last edited</th>}
                  {canEdit && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {customer.payments?.map((p) => (
                  <tr key={p.id}>
                    <td>{new Date(p.paymentDate).toLocaleDateString()}</td>
                    <td className="capitalize">{p.paymentType}</td>
                    <td className="capitalize text-slate-600">{p.status}</td>
                    <td className="text-right font-medium">Rs {Number(p.amount).toLocaleString()}</td>
                    {isOwner && (
                      <td><LastEditedBy record={p} /></td>
                    )}
                    {canEdit && (
                      <td className="whitespace-nowrap space-x-2">
                        <Link to={`/payments/${p.id}/edit`} className={btnLink}>Edit</Link>
                        {canDelete && !hasOutstandingBalance && (
                          <button type="button" onClick={() => setDeleteDialog({ type: 'payment', id: p.id })} className={btnLinkDanger}>
                            Delete
                          </button>
                        )}
                        {canRequestDelete && (
                          <button
                            type="button"
                            onClick={() => setRequestDelete({ type: 'payment', id: p.id, label: `payment of Rs ${Number(p.amount).toLocaleString()}` })}
                            className={btnLinkWarning}
                          >
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
        open={Boolean(deleteDialog)}
        title={
          deleteDialog?.type === 'customer' ? 'Delete Customer'
            : deleteDialog?.type === 'order' ? 'Delete Order'
            : 'Delete Payment'
        }
        message={
          deleteDialog?.type === 'customer'
            ? `Delete "${customer.name}" and all related data?`
            : deleteDialog?.type === 'order'
            ? 'Delete this order? Orders with linked payments cannot be deleted.'
            : 'Delete this payment record?'
        }
        onConfirm={() => {
          if (deleteDialog?.type === 'customer') handleDeleteCustomer();
          else if (deleteDialog?.type === 'order') handleDeleteOrder(deleteDialog.id);
          else if (deleteDialog?.type === 'payment') handleDeletePayment(deleteDialog.id);
        }}
        onCancel={() => setDeleteDialog(null)}
        loading={deleting}
      />

      <RequestDeleteDialog
        open={Boolean(requestDelete)}
        title={
          requestDelete?.type === 'customer' ? 'Request Delete Customer'
            : requestDelete?.type === 'order' ? 'Request Delete Order'
            : 'Request Delete Payment'
        }
        entityType={requestDelete?.type}
        entityId={requestDelete?.type === 'customer' ? id : requestDelete?.id}
        entityLabel={requestDelete?.type === 'customer' ? customer.name : requestDelete?.label}
        onSuccess={() => { setRequestDelete(null); alert('Delete request submitted for owner review.'); }}
        onCancel={() => setRequestDelete(null)}
      />
    </div>
  );
}
