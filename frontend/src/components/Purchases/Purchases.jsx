import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../shared/Toast';
import Spinner from '../shared/Spinner';
import EmptyState from '../shared/EmptyState';
import './Purchases.css';

const BASES = ['', 'Alpha Base', 'Bravo Base', 'Charlie Base'];
const ASSET_TYPES = ['vehicle', 'weapon', 'ammunition'];

export default function Purchases() {
  const { hasRole } = useAuth();
  const { pushToast } = useToast();

  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assets, setAssets] = useState([]);

  // Filter state
  const [filterBase, setFilterBase] = useState('');
  const [filterType, setFilterType] = useState('');

  // Form state
  const [formVisible, setFormVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    assetId: '',
    quantity: '',
    unitCost: '',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const canRecordPurchase = hasRole('admin', 'logistics');

  const loadPurchases = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterBase) params.base = filterBase;
      if (filterType) params.type = filterType;

      const response = await api.get('/purchases', { params });
      setPurchases(response.data.purchases);
    } catch (err) {
      pushToast(err.response?.data?.error || 'Failed to load purchase records', 'error');
    } finally {
      setLoading(false);
    }
  }, [filterBase, filterType, pushToast]);

  const loadAssets = useCallback(async () => {
    try {
      const response = await api.get('/assets');
      setAssets(response.data.assets);
    } catch {
      // Assets are needed for the form dropdown; non-critical if it fails silently
    }
  }, []);

  useEffect(() => {
    loadPurchases();
    loadAssets();
  }, [loadPurchases, loadAssets]);

  const updateFormField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const recordPurchase = async (e) => {
    e.preventDefault();

    if (!formData.assetId) {
      pushToast('Select an asset to record a purchase for', 'warning');
      return;
    }
    if (!formData.quantity || parseInt(formData.quantity, 10) < 1) {
      pushToast('Quantity must be at least 1', 'warning');
      return;
    }
    if (!formData.unitCost || parseFloat(formData.unitCost) < 0) {
      pushToast('Unit cost must be a positive number', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/purchases', {
        assetId: formData.assetId,
        quantity: parseInt(formData.quantity, 10),
        unitCost: parseFloat(formData.unitCost),
        date: formData.date,
        notes: formData.notes
      });

      pushToast('Purchase recorded successfully', 'success');
      setFormVisible(false);
      setFormData({ assetId: '', quantity: '', unitCost: '', date: new Date().toISOString().split('T')[0], notes: '' });
      loadPurchases();
    } catch (err) {
      pushToast(err.response?.data?.error || 'Failed to record purchase', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
  };

  return (
    <div className="purchases-page">
      <header className="purchases-page__header">
        <div>
          <h1 className="purchases-page__title">Purchase Records</h1>
          <p className="purchases-page__subtitle">Track all asset procurement across bases</p>
        </div>
        {canRecordPurchase && (
          <button
            className="btn-primary"
            onClick={() => setFormVisible(!formVisible)}
            id="btn-record-purchase"
          >
            {formVisible ? 'Cancel' : '+ Record Purchase'}
          </button>
        )}
      </header>

      {/* Slide-in Form */}
      {formVisible && canRecordPurchase && (
        <form className="purchase-form" onSubmit={recordPurchase} id="purchase-form">
          <h3 className="purchase-form__title">New Purchase Entry</h3>
          <div className="purchase-form__grid">
            <div className="form-field">
              <label className="form-label">Asset</label>
              <select
                className="form-select"
                value={formData.assetId}
                onChange={(e) => updateFormField('assetId', e.target.value)}
                id="purchase-asset-select"
              >
                <option value="">Select an asset...</option>
                {assets.map((a) => (
                  <option key={a._id} value={a._id}>
                    {a.name} ({a.base})
                  </option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label className="form-label">Quantity</label>
              <input
                type="number"
                className="form-input"
                value={formData.quantity}
                onChange={(e) => updateFormField('quantity', e.target.value)}
                min="1"
                placeholder="0"
                id="purchase-quantity"
              />
            </div>
            <div className="form-field">
              <label className="form-label">Unit Cost ($)</label>
              <input
                type="number"
                className="form-input"
                value={formData.unitCost}
                onChange={(e) => updateFormField('unitCost', e.target.value)}
                min="0"
                step="0.01"
                placeholder="0.00"
                id="purchase-unit-cost"
              />
            </div>
            <div className="form-field">
              <label className="form-label">Date</label>
              <input
                type="date"
                className="form-input"
                value={formData.date}
                onChange={(e) => updateFormField('date', e.target.value)}
                id="purchase-date"
              />
            </div>
            <div className="form-field form-field--wide">
              <label className="form-label">Notes</label>
              <input
                type="text"
                className="form-input"
                value={formData.notes}
                onChange={(e) => updateFormField('notes', e.target.value)}
                placeholder="Procurement reference or justification"
                id="purchase-notes"
              />
            </div>
          </div>
          <button type="submit" className="btn-primary" disabled={submitting} id="btn-submit-purchase">
            {submitting ? 'Recording...' : 'Confirm Purchase'}
          </button>
        </form>
      )}

      {/* Filters */}
      <div className="purchases-page__filters">
        <select className="filter-select" value={filterBase} onChange={(e) => setFilterBase(e.target.value)}>
          <option value="">All Bases</option>
          {BASES.filter(Boolean).map((b) => <option key={b} value={b}>{b}</option>)}
        </select>
        <select className="filter-select" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
          <option value="">All Types</option>
          {ASSET_TYPES.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
        </select>
      </div>

      {/* Purchase Table */}
      {loading ? (
        <Spinner label="Loading purchase records..." />
      ) : purchases.length === 0 ? (
        <EmptyState icon="📦" heading="No purchases recorded" message="Record a new purchase to see it appear here." />
      ) : (
        <div className="purchases-table-wrap">
          <table className="purchases-table" id="purchases-table">
            <thead>
              <tr>
                <th>Asset</th>
                <th>Type</th>
                <th>Base</th>
                <th>Qty</th>
                <th>Unit Cost</th>
                <th>Total</th>
                <th>Recorded By</th>
                <th>Date</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {purchases.map((p) => (
                <tr key={p._id}>
                  <td className="td-name">{p.assetName}</td>
                  <td><span className={`type-badge type-badge--${p.assetType}`}>{p.assetType}</span></td>
                  <td>{p.base}</td>
                  <td className="td-num">{p.quantity.toLocaleString()}</td>
                  <td className="td-num">{formatCurrency(p.unitCost)}</td>
                  <td className="td-num td-total">{formatCurrency(p.totalCost)}</td>
                  <td>{p.purchasedBy?.username || '-'}</td>
                  <td>{new Date(p.date).toLocaleDateString()}</td>
                  <td className="td-notes">{p.notes || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
