import { useEffect, useState } from 'react';
import api from '../services/api';
import ConfirmDialog from '../components/ConfirmDialog';
import PageHeader from '../components/PageHeader';
import {
  pageShell,
  pageCard,
  pageToolbar,
  dataTableWrap,
  dataTable,
  btnLinkSuccess,
  btnLinkDanger,
  badgeAmber,
  badgeGreen,
  badgeRed,
  emptyState,
  formInput,
} from '../utils/formStyles';

const entityLabels = {
  customer: 'Customer',
  order: 'Order',
  payment: 'Payment',
  product: 'Product',
};

const statusBadges = {
  pending: badgeAmber,
  approved: badgeGreen,
  rejected: badgeRed,
};

export default function DeleteRequests() {
  const [requests, setRequests] = useState([]);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [reviewTarget, setReviewTarget] = useState(null);
  const [reviewAction, setReviewAction] = useState(null);
  const [reviewNote, setReviewNote] = useState('');
  const [loading, setLoading] = useState(false);

  const load = () => {
    const params = statusFilter ? { status: statusFilter } : {};
    api.get('/delete-requests', { params }).then((res) => setRequests(res.data));
  };

  useEffect(() => { load(); }, [statusFilter]);

  const handleReview = async () => {
    if (!reviewTarget || !reviewAction) return;
    setLoading(true);
    try {
      await api.patch(`/delete-requests/${reviewTarget.id}`, {
        action: reviewAction,
        reviewNote: reviewNote || undefined,
      });
      setReviewTarget(null);
      setReviewAction(null);
      setReviewNote('');
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to review request');
    } finally {
      setLoading(false);
    }
  };

  const openReview = (request, action) => {
    setReviewTarget(request);
    setReviewAction(action);
    setReviewNote('');
  };

  return (
    <div className={pageShell}>
      <PageHeader
        title="Delete Requests"
        subtitle="Review staff requests to delete records"
      />

      <div className={pageToolbar}>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={`${formInput} w-auto min-w-[10rem]`}
        >
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="">All</option>
        </select>
      </div>

      <div className={`${pageCard} overflow-hidden`}>
        {requests.length === 0 ? (
          <div className={emptyState}>No delete requests</div>
        ) : (
          <div className={dataTableWrap}>
            <table className={dataTable}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Requested By</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <tr key={r.id}>
                    <td>{new Date(r.createdAt).toLocaleDateString()}</td>
                    <td>{entityLabels[r.entityType] || r.entityType}</td>
                    <td>{r.requester?.name}</td>
                    <td className="text-slate-600 max-w-xs">{r.reason || '—'}</td>
                    <td>
                      <span className={statusBadges[r.status] || badgeAmber}>{r.status}</span>
                    </td>
                    <td className="whitespace-nowrap">
                      {r.status === 'pending' && (
                        <span className="space-x-2">
                          <button type="button" onClick={() => openReview(r, 'approve')} className={btnLinkSuccess}>
                            Approve
                          </button>
                          <button type="button" onClick={() => openReview(r, 'reject')} className={btnLinkDanger}>
                            Reject
                          </button>
                        </span>
                      )}
                      {r.reviewNote && <span className="text-xs text-slate-500 ml-2">{r.reviewNote}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(reviewTarget)}
        title={reviewAction === 'approve' ? 'Approve Delete Request' : 'Reject Delete Request'}
        message={
          reviewAction === 'approve'
            ? `Approve deletion of this ${entityLabels[reviewTarget?.entityType]?.toLowerCase() || 'item'}? This cannot be undone.`
            : 'Reject this delete request? The item will remain.'
        }
        onConfirm={handleReview}
        onCancel={() => { setReviewTarget(null); setReviewAction(null); }}
        loading={loading}
        confirmLabel={reviewAction === 'approve' ? 'Approve' : 'Reject'}
      />
    </div>
  );
}
