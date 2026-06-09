import { useState } from 'react';
import api from '../services/api';
import {
  modalOverlay,
  modalPanel,
  modalActions,
  formLabel,
  formInput,
  formAlertError,
  btnToolbarOutline,
  btnToolbarWarning,
} from '../utils/formStyles';

export default function RequestDeleteDialog({
  open,
  title,
  entityType,
  entityId,
  entityLabel,
  onSuccess,
  onCancel,
}) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post('/delete-requests', {
        entityType,
        entityId,
        reason: reason || undefined,
      });
      setReason('');
      onSuccess?.();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit delete request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={modalOverlay}>
      <div className={modalPanel}>
        <h3 className="text-lg font-semibold text-slate-900">{title || 'Request Delete'}</h3>
        <p className="text-sm text-slate-600 mt-2 leading-relaxed">
          Request deletion of {entityLabel || 'this item'}. Your company owner will review and approve.
        </p>
        {error && <div className={`${formAlertError} mt-4`}>{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <label className={formLabel}>Reason (optional)</label>
            <textarea
              className={`${formInput} min-h-[88px] resize-y`}
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why should this be deleted?"
            />
          </div>
          <div className={modalActions}>
            <button type="button" onClick={onCancel} className={btnToolbarOutline}>
              Cancel
            </button>
            <button type="submit" disabled={loading} className={btnToolbarWarning}>
              {loading ? 'Submitting…' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
