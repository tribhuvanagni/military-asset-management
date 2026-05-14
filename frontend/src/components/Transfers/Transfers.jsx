import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../shared/Toast';
import Spinner from '../shared/Spinner';
import EmptyState from '../shared/EmptyState';
import './Transfers.css';

const BASES = ['Alpha Base', 'Bravo Base', 'Charlie Base'];

export default function Transfers() {
  const { hasRole } = useAuth();
  const { pushToast } = useToast();

  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assets, setAssets] = useState([]);
  const [processingId, setProcessingId] = useState(null);

  // Filter
  const [filterStatus, setFilterStatus] = useState('');

  // Form
  const [formVisible, setFormVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    assetId: '',
    toBase: '',
    quantity: '',
    notes: ''
  });

  const canInitiateTransfer = hasRole('admin', 'logistics');
  const canApproveTransfer = hasRole('admin', 'commander');

  const loadTransfers = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterStatus) params.status = filterStatus;
      const response = await api.get('/transfers', { params });
      setTransfers(response.data.transfers);
    } catch (err) {
      pushToast(err.response?.data?.error || 'Failed to load transfer records', 'error');
    } finally {
      setLoading(false);
    }
  }, [filterStatus, pushToast]);

  const loadAssets = useCallback(async () => {
    try {
      const response = await api.get('/assets');
      setAssets(response.data.assets);
    } catch { /* form dropdown - non-critical */ }
  }, []);

  useEffect(() => {
    loadTransfers();
    loadAssets();
  }, [loadTransfers, loadAssets]);

  const updateFormField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const initiateTransfer = async (e) => {
    e.preventDefault();

    if (!formData.assetId) {
      pushToast('Select the asset to transfer', 'warning');
      return;
    }
    if (!formData.toBase) {
      pushToast('Select a destination base', 'warning');
      return;
    }
    if (!formData.quantity || parseInt(formData.quantity, 10) < 1) {
      pushToast('Transfer quantity must be at least 1', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/transfers', {
        assetId: formData.assetId,
        toBase: formData.toBase,
        quantity: parseInt(formData.quantity, 10),
        notes: formData.notes
      });

      pushToast('Transfer request initiated - pending approval', 'success');
      setFormVisible(false);
      setFormData({ assetId: '', toBase: '', quantity: '', notes: '' });
      loadTransfers();
    } catch (err) {
      pushToast(err.response?.data?.error || 'Failed to initiate transfer', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const approveTransfer = async (transferId) => {
    setProcessingId(transferId);
    try {
      await api.put(`/transfers/${transferId}/approve`);
      pushToast('Transfer approved - asset balances updated', 'success');
      loadTransfers();
    } catch (err) {
      pushToast(err.response?.data?.error || 'Could not approve transfer', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const rejectTransfer = async (transferId) => {
    setProcessingId(transferId);
    try {
      await api.put(`/transfers/${transferId}/reject`);
      pushToast('Transfer rejected', 'warning');
      loadTransfers();
    } catch (err) {
      pushToast(err.response?.data?.error || 'Could not reject transfer', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const statusBadgeClass = (status) => `status-badge status-badge--${status}`;

  return (
    <div className="transfers-page">
      <header className="transfers-page__header">
        <div>
          <h1 className="transfers-page__title">Transfer Requests</h1>
          <p className="transfers-page__subtitle">Inter-base asset transfers with approval workflow</p>
        </div>
        {canInitiateTransfer && (
          <button
            className="btn-primary"
            onClick={() => setFormVisible(!formVisible)}
            id="btn-initiate-transfer"
          >
            {formVisible ? 'Cancel' : '+ Initiate Transfer'}
          </button>
        )}
      </header>

      {/* Transfer Form */}
      {formVisible && canInitiateTransfer && (
        <form className="transfer-form" onSubmit={initiateTransfer} id="transfer-form">
          <h3 className="transfer-form__title">New Transfer Request</h3>
          <div className="transfer-form__grid">
            <div className="form-field">
              <label className="form-label">Asset (Source)</label>
              <select
                className="form-select"
                value={formData.assetId}
                onChange={(e) => updateFormField('assetId', e.target.value)}
                id="transfer-asset-select"
              >
                <option value="">Select asset...</option>
                {assets.map((a) => (
                  <option key={a._id} value={a._id}>
                    {a.name} - {a.base} (Bal: {a.closingBalance})
                  </option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label className="form-label">Destination Base</label>
              <select
                className="form-select"
                value={formData.toBase}
                onChange={(e) => updateFormField('toBase', e.target.value)}
                id="transfer-dest-base"
              >
                <option value="">Select base...</option>
                {BASES.map((b) => (
                  <option key={b} value={b}>{b}</option>
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
                id="transfer-quantity"
              />
            </div>
            <div className="form-field">
              <label className="form-label">Notes</label>
              <input
                type="text"
                className="form-input"
                value={formData.notes}
                onChange={(e) => updateFormField('notes', e.target.value)}
                placeholder="Transfer justification"
                id="transfer-notes"
              />
            </div>
          </div>
          <button type="submit" className="btn-primary" disabled={submitting} id="btn-submit-transfer">
            {submitting ? 'Submitting...' : 'Submit Transfer Request'}
          </button>
        </form>
      )}

      {/* Status Filter */}
      <div className="transfers-page__filters">
        <select className="filter-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} id="filter-transfer-status">
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Transfers Table */}
      {loading ? (
        <Spinner label="Loading transfer records..." />
      ) : transfers.length === 0 ? (
        <EmptyState icon="⇄" heading="No transfer records" message="Initiate a new transfer to move assets between bases." />
      ) : (
        <div className="transfers-table-wrap">
          <table className="transfers-table" id="transfers-table">
            <thead>
              <tr>
                <th>Asset</th>
                <th>From</th>
                <th>To</th>
                <th>Qty</th>
                <th>Status</th>
                <th>Initiated By</th>
                <th>Date</th>
                <th>Notes</th>
                {canApproveTransfer && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {transfers.map((t) => (
                <tr key={t._id}>
                  <td className="td-name">{t.assetName}</td>
                  <td>{t.fromBase}</td>
                  <td>{t.toBase}</td>
                  <td className="td-num">{t.quantity.toLocaleString()}</td>
                  <td>
                    <span className={statusBadgeClass(t.status)}>{t.status}</span>
                  </td>
                  <td>{t.initiatedBy?.username || '-'}</td>
                  <td>{new Date(t.date).toLocaleDateString()}</td>
                  <td className="td-notes">{t.notes || '-'}</td>
                  {canApproveTransfer && (
                    <td className="td-actions">
                      {t.status === 'pending' ? (
                        <>
                          <button
                            className="btn-approve"
                            onClick={() => approveTransfer(t._id)}
                            disabled={processingId === t._id}
                          >
                            ✓ Approve
                          </button>
                          <button
                            className="btn-reject"
                            onClick={() => rejectTransfer(t._id)}
                            disabled={processingId === t._id}
                          >
                            ✕ Reject
                          </button>
                        </>
                      ) : (
                        <span className="td-resolved">
                          {t.approvedBy?.username || '-'}
                        </span>
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
  );
}
