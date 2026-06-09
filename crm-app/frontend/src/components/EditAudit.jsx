import { useAuth } from '../context/AuthContext';

export function formatAuditDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export function lastEditedLabel(record) {
  if (!record) return null;
  const name = record.updater?.name || record.creator?.name;
  const date = record.updatedAt || record.createdAt;
  if (!name) return null;
  const prefix = record.updater?.name ? 'Edited by' : 'Created by';
  return `${prefix} ${name}${date ? ` · ${formatAuditDate(date)}` : ''}`;
}

export default function EditAudit({ record, className = '' }) {
  const { isOwner } = useAuth();
  if (!isOwner || !record) return null;

  const createdName = record.creator?.name;
  const updatedName = record.updater?.name;

  if (!createdName && !updatedName) return null;

  return (
    <div className={`text-sm text-slate-500 space-y-1 ${className}`}>
      {createdName && record.createdAt && (
        <p>
          Created by <span className="font-medium text-slate-700">{createdName}</span>
          {' · '}
          {formatAuditDate(record.createdAt)}
        </p>
      )}
      {updatedName && record.updatedAt && (
        <p>
          Last edited by <span className="font-medium text-slate-700">{updatedName}</span>
          {' · '}
          {formatAuditDate(record.updatedAt)}
        </p>
      )}
    </div>
  );
}

export function LastEditedBy({ record }) {
  const { isOwner } = useAuth();
  if (!isOwner) return null;
  const label = lastEditedLabel(record);
  if (!label) return <span className="text-slate-400">—</span>;
  return <span className="text-xs text-slate-500">{label}</span>;
}
