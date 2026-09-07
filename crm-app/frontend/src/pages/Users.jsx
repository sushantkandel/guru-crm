import { useEffect, useState, useId } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import ConfirmDialog from '../components/ConfirmDialog';
import PasswordInput from '../components/PasswordInput';
import PageHeader from '../components/PageHeader';
import {
  pageShell,
  pageCardPadded,
  dataTableWrap,
  dataTableCompact,
  formLabel,
  formInput,
  formBtnPrimary,
  formBtnSecondary,
  formAlertError,
  formActions,
  formSectionTitle,
  btnLink,
  btnLinkDanger,
  modalOverlay,
  modalPanel,
} from '../utils/formStyles';

export default function Users() {
  const fieldId = useId();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'staff' });
  const [editUser, setEditUser] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', role: 'staff', password: '' });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = () => api.get('/auth/users').then((res) => setUsers(res.data));

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/register', form);
      setForm({ name: '', email: '', password: '', role: 'staff' });
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (u) => {
    setEditUser(u);
    setEditForm({ name: u.name, email: u.email, role: u.role, password: '' });
    setError('');
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload = { name: editForm.name, email: editForm.email, role: editForm.role };
      if (editForm.password) payload.password = editForm.password;
      await api.put(`/auth/users/${editUser.id}`, payload);
      setEditUser(null);
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update user');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/auth/users/${deleteTarget.id}`);
      setDeleteTarget(null);
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete user');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className={pageShell}>
      <PageHeader
        title="Team & Permissions"
        subtitle="Create staff accounts and set their role. Staff can create and edit data; viewers are read-only."
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <div className={pageCardPadded}>
          <h3 className={formSectionTitle}>Team Members</h3>
          <div className={dataTableWrap}>
            <table className={dataTableCompact}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>{u.name}</td>
                    <td className="text-slate-600">{u.email}</td>
                    <td className="capitalize">{u.role}</td>
                    <td className="whitespace-nowrap space-x-2">
                      <button type="button" onClick={() => openEdit(u)} className={btnLink}>Edit</button>
                      {u.id !== currentUser?.id && u.role !== 'owner' && (
                        <button type="button" onClick={() => setDeleteTarget(u)} className={btnLinkDanger}>Delete</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className={pageCardPadded}>
          <h3 className={formSectionTitle}>Add Staff</h3>
          {error && !editUser && <div className={formAlertError}>{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor={`${fieldId}-name`} className={formLabel}>Name</label>
              <input id={`${fieldId}-name`} className={formInput} placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div>
              <label htmlFor={`${fieldId}-email`} className={formLabel}>Email</label>
              <input id={`${fieldId}-email`} className={formInput} type="email" placeholder="email@company.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div>
              <label htmlFor={`${fieldId}-password`} className={formLabel}>Password</label>
              <PasswordInput id={`${fieldId}-password`} placeholder="Min 6 characters" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} />
            </div>
            <div>
              <label htmlFor={`${fieldId}-role`} className={formLabel}>Role</label>
              <select id={`${fieldId}-role`} className={formInput} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option value="staff">Staff — create & edit (no direct delete)</option>
                <option value="viewer">Viewer — read-only</option>
              </select>
            </div>
            <button type="submit" disabled={loading} className={formBtnPrimary}>
              {loading ? 'Creating…' : 'Create User'}
            </button>
          </form>
        </div>
      </div>

      {editUser && (
        <div className={modalOverlay}>
          <div className={modalPanel}>
            <h3 className={formSectionTitle}>Edit User — {editUser.name}</h3>
            {error && <div className={formAlertError}>{error}</div>}
            <form onSubmit={handleEdit} className="space-y-4 mt-4">
              <div>
                <label htmlFor={`${fieldId}-name-2`} className={formLabel}>Name</label>
                <input id={`${fieldId}-name-2`} className={formInput} value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} required />
              </div>
              <div>
                <label htmlFor={`${fieldId}-email-2`} className={formLabel}>Email</label>
                <input id={`${fieldId}-email-2`} className={formInput} type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} required />
              </div>
              {editUser.role !== 'owner' && (
                <div>
                  <label htmlFor={`${fieldId}-role-2`} className={formLabel}>Role</label>
                  <select id={`${fieldId}-role-2`} className={formInput} value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}>
                    <option value="staff">Staff — create & edit</option>
                    <option value="viewer">Viewer — read-only</option>
                  </select>
                </div>
              )}
              <div>
                <label htmlFor={`${fieldId}-new-password`} className={formLabel}>New password</label>
                <PasswordInput id={`${fieldId}-new-password`} placeholder="Leave blank to keep current" value={editForm.password} onChange={(e) => setEditForm({ ...editForm, password: e.target.value })} minLength={6} />
              </div>
              <div className={formActions}>
                <button type="submit" disabled={loading} className={formBtnPrimary}>
                  {loading ? 'Saving…' : 'Save'}
                </button>
                <button type="button" onClick={() => setEditUser(null)} className={formBtnSecondary}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete User"
        message={`Delete user "${deleteTarget?.name}"? Their assigned customers will be unassigned.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
    </div>
  );
}
