import { modalOverlay, modalPanel, modalActions, btnToolbarOutline, btnToolbarDanger } from '../utils/formStyles';

export default function ConfirmDialog({ open, title, message, confirmLabel = 'Delete', onConfirm, onCancel, loading }) {
  if (!open) return null;

  return (
    <div className={modalOverlay}>
      <div className={modalPanel}>
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        <p className="mt-2 text-sm text-slate-600 leading-relaxed">{message}</p>
        <div className={modalActions}>
          <button type="button" onClick={onCancel} disabled={loading} className={btnToolbarOutline}>
            Cancel
          </button>
          <button type="button" onClick={onConfirm} disabled={loading} className={btnToolbarDanger}>
            {loading ? 'Please wait…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
