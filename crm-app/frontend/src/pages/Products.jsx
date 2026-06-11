import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import ConfirmDialog from '../components/ConfirmDialog';
import RequestDeleteDialog from '../components/RequestDeleteDialog';
import PageHeader from '../components/PageHeader';
import {
  pageShell,
  formSectionTitle,
  formLabel,
  formInput,
  formCard,
  formBtnPrimary,
  formBtnSecondary,
  formAlertError,
  formActions,
  dataTableWrap,
  dataTableCompact,
  badgeGreen,
  badgeSlate,
  btnLink,
  btnLinkDanger,
  btnLinkWarning,
  modalOverlay,
} from '../utils/formStyles';

const emptyForm = { name: '', productCode: '', defaultUnit: 'packet', defaultPrice: 0, isActive: true };

export default function Products() {
  const { canEdit, canDelete, canRequestDelete } = useAuth();
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editProduct, setEditProduct] = useState(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [requestDeleteTarget, setRequestDeleteTarget] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const location = useLocation();

  const load = () => api.get('/products').then((res) => setProducts(res.data));

  useEffect(() => {
    load();
  }, [location.pathname]);

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === 'visible') load();
    };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await api.post('/products', {
        ...form,
        defaultPrice: Number(form.defaultPrice),
        productCode: form.productCode || null,
      });
      setForm(emptyForm);
      setSuccess('Product added to your catalog.');
      load();
    } catch (err) {
      const details = err.response?.data?.details;
      const detailText = Array.isArray(details)
        ? details.map((d) => d.message).join('; ')
        : '';
      setError(detailText || err.response?.data?.error || 'Failed to create product');
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (p) => {
    setEditProduct(p);
    setEditForm({
      name: p.name,
      productCode: p.productCode || '',
      defaultUnit: p.defaultUnit,
      defaultPrice: p.defaultPrice,
      isActive: p.isActive,
    });
    setError('');
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await api.put(`/products/${editProduct.id}`, {
        ...editForm,
        defaultPrice: Number(editForm.defaultPrice),
        productCode: editForm.productCode || null,
      });
      setEditProduct(null);
      setSuccess('Product updated.');
      load();
    } catch (err) {
      const details = err.response?.data?.details;
      const detailText = Array.isArray(details)
        ? details.map((d) => d.message).join('; ')
        : '';
      setError(detailText || err.response?.data?.error || 'Failed to update product');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/products/${deleteTarget.id}`);
      setDeleteTarget(null);
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete product');
    } finally {
      setDeleting(false);
    }
  };

  const inputClass = formInput;

  return (
    <div className={pageShell}>
      <PageHeader title="Products" subtitle="Manage your product catalog and default prices" />

      {success && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <div className={formCard}>
          <h3 className={formSectionTitle}>Catalog</h3>
          <div className={dataTableWrap}>
            <table className={dataTableCompact}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Product Code</th>
                  <th>Unit</th>
                  <th className="text-right">Price</th>
                  <th>Status</th>
                  {canEdit && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id}>
                    <td>{p.name}</td>
                    <td className="text-slate-600">{p.productCode || '—'}</td>
                    <td className="capitalize">{p.defaultUnit}</td>
                    <td className="text-right">Rs {Number(p.defaultPrice).toLocaleString()}</td>
                    <td>
                      <span className={p.isActive ? badgeGreen : badgeSlate}>
                        {p.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    {canEdit && (
                      <td className="whitespace-nowrap space-x-2">
                        <button type="button" onClick={() => openEdit(p)} className={btnLink}>Edit</button>
                        {canDelete && (
                          <button type="button" onClick={() => setDeleteTarget(p)} className={btnLinkDanger}>Delete</button>
                        )}
                        {canRequestDelete && (
                          <button type="button" onClick={() => setRequestDeleteTarget(p)} className={btnLinkWarning}>Request Delete</button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {products.length === 0 && <div className="py-6 text-center text-slate-500">No products yet</div>}
        </div>

        {canEdit && (
          <div className={formCard}>
            <h3 className={formSectionTitle}>Add Product</h3>
            {error && !editProduct && <div className={formAlertError}>{error}</div>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className={formLabel}>Product Name *</label>
                <input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div>
                <label className={formLabel}>Product Code (optional)</label>
                <input className={inputClass} placeholder="Internal product code" value={form.productCode} onChange={(e) => setForm({ ...form, productCode: e.target.value })} />
              </div>
              <div>
                <label className={formLabel}>Default Unit *</label>
                <select className={inputClass} value={form.defaultUnit} onChange={(e) => setForm({ ...form, defaultUnit: e.target.value })}>
                  <option value="packet">Packet</option>
                  <option value="bundle">Bundle</option>
                  <option value="bag">Bag</option>
                </select>
              </div>
              <div>
                <label className={formLabel}>Default Price *</label>
                <input className={inputClass} type="number" min="0" step="0.01" value={form.defaultPrice} onChange={(e) => setForm({ ...form, defaultPrice: e.target.value })} required />
              </div>
              <button type="submit" disabled={loading} className={formBtnPrimary}>
                {loading ? 'Creating...' : 'Add Product'}
              </button>
            </form>
          </div>
        )}
      </div>

      {editProduct && (
        <div className={modalOverlay}>
          <div className={`${formCard} w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto`}>
            <h3 className={formSectionTitle}>Edit Product — {editProduct.name}</h3>
            {error && <div className={formAlertError}>{error}</div>}
            <form onSubmit={handleEdit} className="space-y-4">
              <div>
                <label className={formLabel}>Product Name *</label>
                <input className={inputClass} value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} required />
              </div>
              <div>
                <label className={formLabel}>Product Code (optional)</label>
                <input className={inputClass} value={editForm.productCode} onChange={(e) => setEditForm({ ...editForm, productCode: e.target.value })} />
              </div>
              <select className={inputClass} value={editForm.defaultUnit} onChange={(e) => setEditForm({ ...editForm, defaultUnit: e.target.value })}>
                <option value="packet">Packet</option>
                <option value="bundle">Bundle</option>
                <option value="bag">Bag</option>
              </select>
              <input className={inputClass} type="number" min="0" step="0.01" value={editForm.defaultPrice} onChange={(e) => setEditForm({ ...editForm, defaultPrice: e.target.value })} required />
              <label className="flex items-center gap-2 text-sm sm:text-base">
                <input type="checkbox" checked={editForm.isActive} onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })} />
                Active (show in order dropdown)
              </label>
              <div className={formActions}>
                <button type="submit" disabled={loading} className={formBtnPrimary}>
                  {loading ? 'Saving...' : 'Save'}
                </button>
                <button type="button" onClick={() => setEditProduct(null)} className={formBtnSecondary}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Product"
        message={`Delete "${deleteTarget?.name}" from the catalog?`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />

      <RequestDeleteDialog
        open={Boolean(requestDeleteTarget)}
        title="Request Delete Product"
        entityType="product"
        entityId={requestDeleteTarget?.id}
        entityLabel={requestDeleteTarget?.name}
        onSuccess={() => { setRequestDeleteTarget(null); alert('Delete request submitted for owner review.'); }}
        onCancel={() => setRequestDeleteTarget(null)}
      />
    </div>
  );
}
