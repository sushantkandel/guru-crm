import { useEffect, useState } from 'react';
import api from '../services/api';
import {
  formLabel,
  formInput,
  formBtnPrimary,
  formBtnSecondary,
  pageCardPadded,
  pageSectionTitle,
  formAlertError,
} from '../utils/formStyles';

function emptyVendor(isCurrent) {
  return {
    vendorName: '',
    vendorAddress: '',
    vendorPhone: '',
    purchasePrice: '',
    isCurrent,
  };
}

function vendorSummary(v) {
  const parts = [v.vendorName];
  if (v.purchasePrice != null) parts.push(`@ ${v.purchasePrice}`);
  if (v.vendorPhone) parts.push(v.vendorPhone);
  return parts.join(' · ');
}

export default function CustomerProductInsights({
  customerId,
  canEdit,
  autoStart = false,
  initialProductId = '',
}) {
  const [products, setProducts] = useState([]);
  const [insights, setInsights] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [knowsProduct, setKnowsProduct] = useState(null);
  const [isSelling, setIsSelling] = useState(null);
  const [discontinuedReason, setDiscontinuedReason] = useState('');
  const [notes, setNotes] = useState('');
  const [vendors, setVendors] = useState([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const [productRes, insightRes] = await Promise.all([
      api.get('/products', { params: { active: true } }),
      api.get(`/customers/${customerId}/product-insights`),
    ]);
    setProducts(productRes.data);
    setInsights(insightRes.data);
  };

  useEffect(() => {
    load().catch((err) => setError(err.response?.data?.error || 'Failed to load field intelligence'));
  }, [customerId]);

  const selectProduct = (productId) => {
    setSelectedProductId(productId);
    const insight = insights.find((i) => i.productId === productId);
    if (!insight) {
      setKnowsProduct(null);
      setIsSelling(null);
      setDiscontinuedReason('');
      setNotes('');
      setVendors([]);
      return;
    }
    setKnowsProduct(insight.knowsProduct);
    setIsSelling(insight.isSelling);
    setDiscontinuedReason(insight.discontinuedReason || '');
    setNotes(insight.notes || '');
    setVendors(
      (insight.vendorSources || []).map((v) => ({
        vendorName: v.vendorName,
        vendorAddress: v.vendorAddress || '',
        vendorPhone: v.vendorPhone || '',
        purchasePrice: v.purchasePrice ?? '',
        isCurrent: v.isCurrent,
      })),
    );
  };

  useEffect(() => {
    if (!canEdit || products.length === 0 || selectedProductId) return;
    const productId = initialProductId || (autoStart ? products[0]?.id : '');
    if (productId) selectProduct(productId);
  }, [autoStart, initialProductId, canEdit, products, selectedProductId]);

  const editingExisting = insights.some((i) => i.productId === selectedProductId);

  const save = async () => {
    if (!selectedProductId || knowsProduct === null) return;
    if (knowsProduct && isSelling === null) return;
    if (knowsProduct && isSelling === false && !discontinuedReason.trim()) return;

    setSaving(true);
    setError('');
    try {
      await api.put(`/customers/${customerId}/product-insights/${selectedProductId}`, {
        knowsProduct,
        isSelling: knowsProduct ? isSelling : null,
        discontinuedReason: discontinuedReason.trim() || null,
        notes: notes.trim() || null,
        vendorSources: vendors
          .filter((v) => v.vendorName.trim())
          .map((v, index) => ({
            vendorName: v.vendorName.trim(),
            vendorAddress: v.vendorAddress.trim() || null,
            vendorPhone: v.vendorPhone.trim() || null,
            purchasePrice: v.purchasePrice === '' ? null : Number(v.purchasePrice),
            isCurrent: knowsProduct && isSelling ? true : Boolean(v.isCurrent),
            sortOrder: index,
          })),
      });
      await load();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save survey');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={pageCardPadded}>
      <h2 className={pageSectionTitle}>Field intelligence</h2>
      {error && <div className={formAlertError}>{error}</div>}

      {insights.length > 0 && (
        <div className="mb-4 space-y-2">
          {insights.map((insight) => (
            <div key={insight.id} className="text-sm text-slate-700 border-b border-slate-100 pb-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <strong>{insight.product?.name || 'Product'}</strong>
                  {' — '}
                  {!insight.knowsProduct && 'Does not know product'}
                  {insight.knowsProduct && insight.isSelling && 'Still selling'}
                  {insight.knowsProduct && insight.isSelling === false && 'Not selling'}
                </div>
                {canEdit && (
                  <button
                    type="button"
                    className="text-sm text-blue-600 hover:underline shrink-0"
                    onClick={() => selectProduct(insight.productId)}
                  >
                    Edit
                  </button>
                )}
              </div>
              {insight.vendorSources?.length > 0 && (
                <div className="text-slate-500 mt-1 space-y-1">
                  {insight.vendorSources.map((v) => (
                    <div key={v.id || `${v.vendorName}-${v.sortOrder}`}>
                      <div>{vendorSummary(v)}</div>
                      {v.vendorAddress && (
                        <div className="text-xs text-slate-400">{v.vendorAddress}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {canEdit && products.length > 0 && (
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            {insights.length > 0
              ? 'Select a product below or tap Edit on a saved survey to update it.'
              : 'Record product awareness, selling status, and vendor details for this visit.'}
          </p>
          <div>
            <label className={formLabel}>Product</label>
            <select
              className={formInput}
              value={selectedProductId}
              onChange={(e) => selectProduct(e.target.value)}
            >
              <option value="">Select product…</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {selectedProductId && (
            <>
              <div>
                <label className={formLabel}>Knows this product?</label>
                <select
                  className={formInput}
                  value={knowsProduct === null ? '' : knowsProduct ? 'true' : 'false'}
                  onChange={(e) => {
                    const val = e.target.value === '' ? null : e.target.value === 'true';
                    setKnowsProduct(val);
                    if (val === false) {
                      setIsSelling(null);
                      setDiscontinuedReason('');
                      setVendors([]);
                    }
                  }}
                >
                  <option value="">Select…</option>
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </div>

              {knowsProduct && (
                <div>
                  <label className={formLabel}>Still selling?</label>
                  <select
                    className={formInput}
                    value={isSelling === null ? '' : isSelling ? 'true' : 'false'}
                    onChange={(e) => {
                      const val = e.target.value === '' ? null : e.target.value === 'true';
                      setIsSelling(val);
                      if (val) setDiscontinuedReason('');
                    }}
                  >
                    <option value="">Select…</option>
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                </div>
              )}

              {knowsProduct && isSelling === false && (
                <div>
                  <label className={formLabel}>Why did they stop selling?</label>
                  <textarea
                    className={formInput}
                    rows={3}
                    value={discontinuedReason}
                    onChange={(e) => setDiscontinuedReason(e.target.value)}
                  />
                </div>
              )}

              {knowsProduct && isSelling !== null && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className={formLabel}>
                      {isSelling ? 'Current vendors' : 'Past vendors'}
                      {vendors.length > 0 && (
                        <span className="ml-2 text-slate-500 font-normal">
                          ({vendors.length} recorded)
                        </span>
                      )}
                    </label>
                    <button
                      type="button"
                      className={formBtnSecondary}
                      onClick={() => setVendors((prev) => [...prev, emptyVendor(isSelling)])}
                    >
                      Add vendor
                    </button>
                  </div>
                  {vendors.length === 0 && (
                    <p className="text-sm text-slate-500">
                      Tap &quot;Add vendor&quot; to record one or more suppliers for this product.
                    </p>
                  )}
                  {vendors.map((vendor, index) => (
                    <div
                      key={index}
                      className="p-3 border border-slate-200 rounded-lg space-y-2 bg-slate-50"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-700">
                          Vendor {index + 1}
                        </span>
                        <button
                          type="button"
                          className={formBtnSecondary}
                          onClick={() => setVendors((prev) => prev.filter((_, i) => i !== index))}
                        >
                          Remove
                        </button>
                      </div>
                      <input
                        className={formInput}
                        placeholder="Vendor name *"
                        value={vendor.vendorName}
                        onChange={(e) => {
                          const next = [...vendors];
                          next[index] = { ...next[index], vendorName: e.target.value };
                          setVendors(next);
                        }}
                      />
                      <input
                        className={formInput}
                        placeholder="Vendor address"
                        value={vendor.vendorAddress}
                        onChange={(e) => {
                          const next = [...vendors];
                          next[index] = { ...next[index], vendorAddress: e.target.value };
                          setVendors(next);
                        }}
                      />
                      <input
                        className={formInput}
                        placeholder="Contact number"
                        value={vendor.vendorPhone}
                        onChange={(e) => {
                          const next = [...vendors];
                          next[index] = { ...next[index], vendorPhone: e.target.value };
                          setVendors(next);
                        }}
                      />
                      <input
                        className={formInput}
                        placeholder="Purchase price"
                        type="number"
                        value={vendor.purchasePrice}
                        onChange={(e) => {
                          const next = [...vendors];
                          next[index] = { ...next[index], purchasePrice: e.target.value };
                          setVendors(next);
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}

              <div>
                <label className={formLabel}>Notes</label>
                <textarea
                  className={formInput}
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <button type="button" className={formBtnPrimary} disabled={saving} onClick={save}>
                {saving ? 'Saving…' : editingExisting ? 'Update survey' : 'Save survey'}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
