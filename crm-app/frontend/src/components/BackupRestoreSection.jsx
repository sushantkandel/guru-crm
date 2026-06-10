import { useRef, useState } from 'react';
import api from '../services/api';
import ConfirmDialog from './ConfirmDialog';
import {
  formSectionTitle,
  formSubtitle,
  formCard,
  formBtnPrimary,
  formBtnOutline,
  btnToolbarDanger,
  formInput,
  formLabel,
  formAlertError,
  formAlertSuccess,
} from '../utils/formStyles';

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

function fileNameFromDisposition(header) {
  if (!header) return 'sales-guru-backup.zip';
  const match = header.match(/filename="?([^"]+)"?/i);
  return match?.[1] || 'sales-guru-backup.zip';
}

export default function BackupRestoreSection() {
  const fileRef = useRef(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);
  const [validating, setValidating] = useState(false);
  const [safetyExporting, setSafetyExporting] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [preview, setPreview] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [safetyDownloaded, setSafetyDownloaded] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    setError('');
    setMessage('');
    try {
      const res = await api.get('/backup/export', { responseType: 'blob' });
      const name = fileNameFromDisposition(res.headers['content-disposition']);
      downloadBlob(res.data, name);
      setMessage('Backup downloaded successfully.');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to export backup');
    } finally {
      setExporting(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);
    setPreview(null);
    setSafetyDownloaded(false);
    setConfirmText('');
    setError('');
    setMessage('');
  };

  const handleValidate = async () => {
    if (!selectedFile) {
      setError('Choose a backup ZIP file first.');
      return;
    }
    setValidating(true);
    setError('');
    setMessage('');
    try {
      const form = new FormData();
      form.append('file', selectedFile);
      const res = await api.post('/backup/validate', form);
      setPreview(res.data);
      setMessage('Backup file is valid. Download a safety backup before restoring.');
    } catch (err) {
      setPreview(null);
      setError(err.response?.data?.error || 'Failed to validate backup');
    } finally {
      setValidating(false);
    }
  };

  const handleSafetyExport = async () => {
    setSafetyExporting(true);
    setError('');
    try {
      const res = await api.post('/backup/pre-restore-export', null, { responseType: 'blob' });
      const name = fileNameFromDisposition(res.headers['content-disposition']);
      downloadBlob(res.data, name);
      setSafetyDownloaded(true);
      setMessage('Safety backup downloaded. You can now restore.');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to download safety backup');
    } finally {
      setSafetyExporting(false);
    }
  };

  const handleRestore = async () => {
    if (!selectedFile || confirmText !== 'RESTORE') return;
    setRestoring(true);
    setError('');
    try {
      const form = new FormData();
      form.append('file', selectedFile);
      form.append('confirm', 'RESTORE');
      const res = await api.post('/backup/restore', form);
      setMessage(
        `Restore complete: ${res.data.counts.customers} customers, ${res.data.counts.orders} orders, ${res.data.counts.payments} payments.`,
      );
      setPreview(null);
      setSelectedFile(null);
      setSafetyDownloaded(false);
      setConfirmText('');
      if (fileRef.current) fileRef.current.value = '';
    } catch (err) {
      setError(err.response?.data?.error || 'Restore failed');
    } finally {
      setRestoring(false);
      setShowRestoreDialog(false);
    }
  };

  return (
    <div className={`${formCard} mt-6`}>
      <h3 className={formSectionTitle}>Backup &amp; Restore</h3>
      <p className={formSubtitle + ' mb-4'}>
        Download a ZIP backup of your company data (CSV files inside). Restore replaces all business data
        for your company. A safety backup is downloaded automatically before restore.
      </p>

      {message && <div className={formAlertSuccess + ' mb-4'}>{message}</div>}
      {error && <div className={formAlertError + ' mb-4'}>{error}</div>}

      <div className="space-y-4">
        <div>
          <button type="button" onClick={handleExport} disabled={exporting} className={formBtnPrimary}>
            {exporting ? 'Preparing backup...' : 'Download backup (ZIP)'}
          </button>
        </div>

        <hr className="border-slate-200" />

        <div>
          <label className={formLabel}>Restore from backup ZIP</label>
          <input
            ref={fileRef}
            type="file"
            accept=".zip,application/zip"
            onChange={handleFileChange}
            className="block w-full text-sm text-slate-600"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleValidate}
            disabled={!selectedFile || validating}
            className={formBtnOutline}
          >
            {validating ? 'Validating...' : 'Validate file'}
          </button>
          <button
            type="button"
            onClick={handleSafetyExport}
            disabled={!preview || safetyExporting}
            className={formBtnOutline}
          >
            {safetyExporting ? 'Downloading...' : 'Download safety backup'}
          </button>
        </div>

        {preview && (
          <div className="text-sm text-slate-600 space-y-1 bg-slate-50 rounded-lg p-4">
            <p><span className="font-medium">Company:</span> {preview.manifest.companyName}</p>
            <p><span className="font-medium">Exported:</span> {new Date(preview.manifest.exportedAt).toLocaleString()}</p>
            <p>
              <span className="font-medium">Records:</span>{' '}
              {preview.counts.customers} customers · {preview.counts.orders} orders ·{' '}
              {preview.counts.payments} payments · {preview.counts.products} products
            </p>
            {preview.warnings?.length > 0 && (
              <ul className="list-disc pl-5 text-amber-700">
                {preview.warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {preview && safetyDownloaded && (
          <div className="space-y-3">
            <div>
              <label className={formLabel}>Type RESTORE to confirm</label>
              <input
                className={formInput}
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="RESTORE"
              />
            </div>
            <button
              type="button"
              onClick={() => setShowRestoreDialog(true)}
              disabled={confirmText !== 'RESTORE' || restoring}
              className={btnToolbarDanger}
            >
              Restore backup
            </button>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={showRestoreDialog}
        title="Restore backup?"
        message="This will replace all customers, orders, payments, and products for your company. This cannot be undone except by restoring another backup."
        confirmLabel={restoring ? 'Restoring...' : 'Restore now'}
        onConfirm={handleRestore}
        onCancel={() => setShowRestoreDialog(false)}
        loading={restoring}
      />
    </div>
  );
}
