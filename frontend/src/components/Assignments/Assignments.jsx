import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../shared/Toast';
import Spinner from '../shared/Spinner';
import EmptyState from '../shared/EmptyState';
import './Assignments.css';

export default function Assignments() {
  const { hasRole } = useAuth();
  const { pushToast } = useToast();

  const [assignments, setAssignments] = useState([]);
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
    assignedTo: '',
    quantity: '',
    purpose: ''
  });

  // Expenditure inline form
  const [expendForm, setExpendForm] = useState({ id: null, qty: '' });

  const canManageAssignments = hasRole('admin', 'commander');

  const loadAssignments = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterStatus) params.status = filterStatus;
      const response = await api.get('/assignments', { params });
      setAssignments(response.data.assignments);
    } catch (err) {
      pushToast(err.response?.data?.error || 'Failed to load assignment records', 'error');
    } finally {
      setLoading(false);
    }
  }, [filterStatus, pushToast]);

  const loadAssets = useCallback(async () => {
    try {
      const response = await api.get('/assets');
      setAssets(response.data.assets);
    } catch { /* non-critical */ }
  }, []);

  useEffect(() => {
    loadAssignments();
    loadAssets();
  }, [loadAssignments, loadAssets]);

  const updateFormField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const recordAssignment = async (e) => {
    e.preventDefault();

    if (!formData.assetId) {
      pushToast('Select the asset to assign', 'warning');
      return;
    }
    if (!formData.assignedTo.trim()) {
      pushToast('Enter the personnel name', 'warning');
      return;
    }
    if (!formData.quantity || parseInt(formData.quantity, 10) < 1) {
      pushToast('Assignment quantity must be at least 1', 'warning');
      return;
    }
    if (!formData.purpose.trim()) {
      pushToast('Specify the assignment purpose', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/assignments', {
        assetId: formData.assetId,
        assignedTo: formData.assignedTo.trim(),
        quantity: parseInt(formData.quantity, 10),
        purpose: formData.purpose.trim()
      });

      pushToast('Assignment recorded - asset balance updated', 'success');
      setFormVisible(false);
      setFormData({ assetId: '', assignedTo: '', quantity: '', purpose: '' });
      loadAssignments();
      loadAssets();
    } catch (err) {
      pushToast(err.response?.data?.error || 'Failed to record assignment', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const submitExpenditure = async (assignmentId) => {
    const qty = parseInt(expendForm.qty, 10);
    if (!qty || qty < 1) {
      pushToast('Enter a valid expenditure quantity', 'warning');
      return;
    }

    setProcessingId(assignmentId);
    try {
      await api.put(`/assignments/${assignmentId}/expend`, { expendedQty: qty });
      pushToast('Expenditure recorded', 'success');
      setExpendForm({ id: null, qty: '' });
      loadAssignments();
    } catch (err) {
      pushToast(err.response?.data?.error || 'Failed to record expenditure', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const returnAssignment = async (assignmentId) => {
    setProcessingId(assignmentId);
    try {
      await api.put(`/assignments/${assignmentId}/return`);
      pushToast('Assignment marked as returned - balance restored', 'success');
      loadAssignments();
    } catch (err) {
      pushToast(err.response?.data?.error || 'Failed to process return', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const statusClass = (status) => `status-badge status-badge--${status === 'active' ? 'pending' : status === 'returned' ? 'approved' : 'rejected'}`;

  return (
    <div className="assignments-page">
      <header className="assignments-page__header">
        <div>
          <h1 className="assignments-page__title">Assignments & Expenditures</h1>
          <p className="assignments-page__subtitle">Personnel asset assignments and consumption tracking</p>
        </div>
        {canManageAssignments && (
          <button
            className="btn-primary"
            onClick={() => setFormVisible(!formVisible)}
            id="btn-record-assignment"
          >
            {formVisible ? 'Cancel' : '+ Record Assignment'}
          </button>
        )}
      </header>

      {/* Assignment Form */}
      {formVisible && canManageAssignments && (
        <form className="assignment-form" onSubmit={recordAssignment} id="assignment-form">
          <h3 className="assignment-form__title">New Assignment</h3>
          <div className="assignment-form__grid">
            <div className="form-field">
              <label className="form-label">Asset</label>
              <select
                className="form-select"
                value={formData.assetId}
                onChange={(e) => updateFormField('assetId', e.target.value)}
                id="assignment-asset-select"
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
              <label className="form-label">Assigned To</label>
              <input
                type="text"
                className="form-input"
                value={formData.assignedTo}
                onChange={(e) => updateFormField('assignedTo', e.target.value)}
                placeholder="e.g. Sgt. Marcus Rivera"
                id="assignment-personnel"
              />
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
                id="assignment-quantity"
              />
            </div>
            <div className="form-field">
              <label className="form-label">Purpose</label>
              <input
                type="text"
                className="form-input"
                value={formData.purpose}
                onChange={(e) => updateFormField('purpose', e.target.value)}
                placeholder="Operational purpose"
                id="assignment-purpose"
              />
            </div>
          </div>
          <button type="submit" className="btn-primary" disabled={submitting} id="btn-submit-assignment">
            {submitting ? 'Recording...' : 'Confirm Assignment'}
          </button>
        </form>
      )}

      {/* Filter */}
      <div className="assignments-page__filters">
        <select className="filter-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} id="filter-assignment-status">
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="returned">Returned</option>
          <option value="expended">Expended</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <Spinner label="Loading assignment records..." />
      ) : assignments.length === 0 ? (
        <EmptyState icon="◎" heading="No assignments recorded" message="Create a new assignment to track asset distribution to personnel." />
      ) : (
        <div className="assignments-table-wrap">
          <table className="assignments-table" id="assignments-table">
            <thead>
              <tr>
                <th>Asset</th>
                <th>Base</th>
                <th>Assigned To</th>
                <th>Qty</th>
                <th>Expended</th>
                <th>Purpose</th>
                <th>Status</th>
                <th>Date</th>
                {canManageAssignments && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {assignments.map((a) => (
                <tr key={a._id}>
                  <td className="td-name">{a.assetName}</td>
                  <td>{a.base}</td>
                  <td>{a.assignedTo}</td>
                  <td className="td-num">{a.quantity.toLocaleString()}</td>
                  <td className="td-num">{a.expendedQty > 0 ? a.expendedQty.toLocaleString() : '-'}</td>
                  <td className="td-notes">{a.purpose}</td>
                  <td><span className={statusClass(a.status)}>{a.status}</span></td>
                  <td>{new Date(a.date).toLocaleDateString()}</td>
                  {canManageAssignments && (
                    <td className="td-actions">
                      {a.status === 'active' && (
                        <>
                          {expendForm.id === a._id ? (
                            <div className="inline-expend">
                              <input
                                type="number"
                                className="expend-input"
                                value={expendForm.qty}
                                onChange={(e) => setExpendForm({ ...expendForm, qty: e.target.value })}
                                min="1"
                                max={a.quantity - a.expendedQty}
                                placeholder="Qty"
                              />
                              <button
                                className="btn-approve"
                                onClick={() => submitExpenditure(a._id)}
                                disabled={processingId === a._id}
                              >
                                ✓
                              </button>
                              <button
                                className="btn-reject"
                                onClick={() => setExpendForm({ id: null, qty: '' })}
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <>
                              <button
                                className="btn-action"
                                onClick={() => setExpendForm({ id: a._id, qty: '' })}
                                title="Record expenditure"
                              >
                                Expend
                              </button>
                              <button
                                className="btn-action btn-action--return"
                                onClick={() => returnAssignment(a._id)}
                                disabled={processingId === a._id}
                                title="Mark as returned"
                              >
                                Return
                              </button>
                            </>
                          )}
                        </>
                      )}
                      {a.status !== 'active' && (
                        <span className="td-resolved">
                          {a.status === 'returned' ? `Returned ${a.returnDate ? new Date(a.returnDate).toLocaleDateString() : ''}` : 'Fully expended'}
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
