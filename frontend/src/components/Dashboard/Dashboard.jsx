import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../shared/Toast';
import Modal from '../shared/Modal';
import Spinner from '../shared/Spinner';
import EmptyState from '../shared/EmptyState';
import './Dashboard.css';

const ASSET_TYPES = ['', 'vehicle', 'weapon', 'ammunition'];
const BASES = ['', 'Alpha Base', 'Bravo Base', 'Charlie Base'];

export default function Dashboard() {
  const { currentUser } = useAuth();
  const { pushToast } = useToast();

  const [assets, setAssets] = useState([]);
  const [summary, setSummary] = useState({ totalAssets: 0, totalPurchases: 0, pendingTransfers: 0, activeAssignments: 0 });
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterBase, setFilterBase] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  // Sort
  const [sortField, setSortField] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');

  // Movement modal
  const [movementModal, setMovementModal] = useState({ open: false, data: null, loading: false });

  const loadAssets = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterBase) params.base = filterBase;
      if (filterType) params.type = filterType;
      if (filterStartDate) params.startDate = filterStartDate;
      if (filterEndDate) params.endDate = filterEndDate;

      const response = await api.get('/assets', { params });
      setAssets(response.data.assets);
      setSummary(response.data.summary);
    } catch (err) {
      pushToast(err.response?.data?.error || 'Failed to load asset data', 'error');
    } finally {
      setLoading(false);
    }
  }, [filterBase, filterType, filterStartDate, filterEndDate, pushToast]);

  useEffect(() => {
    loadAssets();
  }, [loadAssets]);

  const openMovementBreakdown = async (assetId) => {
    setMovementModal({ open: true, data: null, loading: true });
    try {
      const response = await api.get(`/assets/${assetId}/movements`);
      setMovementModal({ open: true, data: response.data, loading: false });
    } catch (err) {
      pushToast('Could not load movement breakdown', 'error');
      setMovementModal({ open: false, data: null, loading: false });
    }
  };

  const closeMovementModal = () => {
    setMovementModal({ open: false, data: null, loading: false });
  };

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedAssets = [...assets].sort((a, b) => {
    const valA = a[sortField];
    const valB = b[sortField];
    const multiplier = sortDirection === 'asc' ? 1 : -1;

    if (typeof valA === 'string') return valA.localeCompare(valB) * multiplier;
    return (valA - valB) * multiplier;
  });

  const clearFilters = () => {
    setFilterBase('');
    setFilterType('');
    setFilterStartDate('');
    setFilterEndDate('');
  };

  const formatMovementSign = (val) => {
    if (val > 0) return `+${val}`;
    if (val < 0) return `${val}`;
    return '0';
  };

  return (
    <div className="dashboard">
      <header className="dashboard__header">
        <div>
          <h1 className="dashboard__title">Operations Dashboard</h1>
          <p className="dashboard__greeting">
            {currentUser?.assignedBase
              ? `Viewing assets for ${currentUser.assignedBase}`
              : 'Viewing all base inventories'}
          </p>
        </div>
      </header>

      {/* Summary Cards */}
      <div className="dashboard__cards">
        <div className="summary-card" id="card-total-assets">
          <span className="summary-card__icon">◉</span>
          <div className="summary-card__content">
            <span className="summary-card__value">{summary.totalAssets}</span>
            <span className="summary-card__label">Total Assets</span>
          </div>
        </div>
        <div className="summary-card" id="card-total-purchases">
          <span className="summary-card__icon">◈</span>
          <div className="summary-card__content">
            <span className="summary-card__value">{summary.totalPurchases}</span>
            <span className="summary-card__label">Purchases</span>
          </div>
        </div>
        <div className="summary-card" id="card-pending-transfers">
          <span className="summary-card__icon">⇄</span>
          <div className="summary-card__content">
            <span className="summary-card__value">{summary.pendingTransfers}</span>
            <span className="summary-card__label">Pending Transfers</span>
          </div>
        </div>
        <div className="summary-card" id="card-active-assignments">
          <span className="summary-card__icon">◎</span>
          <div className="summary-card__content">
            <span className="summary-card__value">{summary.activeAssignments}</span>
            <span className="summary-card__label">Active Assignments</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="dashboard__filters">
        <div className="filter-group">
          <label className="filter-label">Base</label>
          <select
            className="filter-select"
            value={filterBase}
            onChange={(e) => setFilterBase(e.target.value)}
            id="filter-base"
          >
            <option value="">All Bases</option>
            {BASES.filter(Boolean).map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label className="filter-label">Asset Type</label>
          <select
            className="filter-select"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            id="filter-type"
          >
            <option value="">All Types</option>
            {ASSET_TYPES.filter(Boolean).map((t) => (
              <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label className="filter-label">From</label>
          <input
            type="date"
            className="filter-date"
            value={filterStartDate}
            onChange={(e) => setFilterStartDate(e.target.value)}
            id="filter-start-date"
          />
        </div>
        <div className="filter-group">
          <label className="filter-label">To</label>
          <input
            type="date"
            className="filter-date"
            value={filterEndDate}
            onChange={(e) => setFilterEndDate(e.target.value)}
            id="filter-end-date"
          />
        </div>
        <button className="filter-clear" onClick={clearFilters}>Clear</button>
      </div>

      {/* Assets Table */}
      {loading ? (
        <Spinner label="Loading asset inventory..." />
      ) : assets.length === 0 ? (
        <EmptyState
          icon="🔍"
          heading="No assets match your filters"
          message="Adjust the base, type, or date range filters above to find assets."
        />
      ) : (
        <div className="dashboard__table-wrap">
          <table className="asset-table" id="asset-inventory-table">
            <thead>
              <tr>
                {[
                  { key: 'name', label: 'Asset Name' },
                  { key: 'type', label: 'Type' },
                  { key: 'base', label: 'Base' },
                  { key: 'openingBalance', label: 'Opening Bal.' },
                  { key: 'closingBalance', label: 'Closing Bal.' },
                  { key: 'netMovement', label: 'Net Movement' }
                ].map((col) => (
                  <th
                    key={col.key}
                    className={`asset-table__th ${sortField === col.key ? 'asset-table__th--sorted' : ''}`}
                    onClick={() => toggleSort(col.key)}
                  >
                    {col.label}
                    {sortField === col.key && (
                      <span className="sort-indicator">{sortDirection === 'asc' ? ' ↑' : ' ↓'}</span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedAssets.map((asset) => (
                <tr
                  key={asset._id}
                  className="asset-table__row"
                  onClick={() => openMovementBreakdown(asset._id)}
                  title="Click to view movement breakdown"
                >
                  <td className="asset-table__td asset-table__td--name">{asset.name}</td>
                  <td className="asset-table__td">
                    <span className={`type-badge type-badge--${asset.type}`}>
                      {asset.type}
                    </span>
                  </td>
                  <td className="asset-table__td">{asset.base}</td>
                  <td className="asset-table__td asset-table__td--num">{asset.openingBalance.toLocaleString()}</td>
                  <td className="asset-table__td asset-table__td--num">{asset.closingBalance.toLocaleString()}</td>
                  <td className={`asset-table__td asset-table__td--num ${asset.netMovement > 0 ? 'movement-positive' : asset.netMovement < 0 ? 'movement-negative' : ''}`}>
                    {formatMovementSign(asset.netMovement)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Net Movement Breakdown Modal */}
      <Modal
        isOpen={movementModal.open}
        onClose={closeMovementModal}
        title="Net Movement Breakdown"
      >
        {movementModal.loading ? (
          <Spinner size="small" label="Loading breakdown..." />
        ) : movementModal.data ? (
          <div className="movement-breakdown">
            <div className="movement-breakdown__header">
              <h4 className="movement-breakdown__asset">{movementModal.data.asset.name}</h4>
              <span className="type-badge type-badge--{movementModal.data.asset.type}">
                {movementModal.data.asset.type}
              </span>
              <span className="movement-breakdown__base">{movementModal.data.asset.base}</span>
            </div>

            <div className="movement-breakdown__summary">
              <div className="breakdown-stat">
                <span className="breakdown-stat__label">Opening</span>
                <span className="breakdown-stat__value">{movementModal.data.asset.openingBalance.toLocaleString()}</span>
              </div>
              <div className="breakdown-stat">
                <span className="breakdown-stat__label">Closing</span>
                <span className="breakdown-stat__value">{movementModal.data.asset.closingBalance.toLocaleString()}</span>
              </div>
              <div className="breakdown-stat">
                <span className="breakdown-stat__label">Net</span>
                <span className={`breakdown-stat__value ${movementModal.data.asset.netMovement >= 0 ? 'movement-positive' : 'movement-negative'}`}>
                  {formatMovementSign(movementModal.data.asset.netMovement)}
                </span>
              </div>
            </div>

            <div className="movement-section">
              <h5 className="movement-section__title">Purchases ({movementModal.data.movements.purchases.length})</h5>
              {movementModal.data.movements.purchases.length > 0 ? (
                <ul className="movement-list">
                  {movementModal.data.movements.purchases.map((p, i) => (
                    <li key={i} className="movement-item movement-item--positive">
                      +{p.quantity} - {new Date(p.date).toLocaleDateString()} {p.notes && `· ${p.notes}`}
                    </li>
                  ))}
                </ul>
              ) : <p className="movement-empty">No purchases recorded</p>}
            </div>

            <div className="movement-section">
              <h5 className="movement-section__title">Transfers In ({movementModal.data.movements.transfersIn.length})</h5>
              {movementModal.data.movements.transfersIn.length > 0 ? (
                <ul className="movement-list">
                  {movementModal.data.movements.transfersIn.map((t, i) => (
                    <li key={i} className="movement-item movement-item--positive">
                      +{t.quantity} from {t.fromBase} - {new Date(t.date).toLocaleDateString()}
                    </li>
                  ))}
                </ul>
              ) : <p className="movement-empty">No inbound transfers</p>}
            </div>

            <div className="movement-section">
              <h5 className="movement-section__title">Transfers Out ({movementModal.data.movements.transfersOut.length})</h5>
              {movementModal.data.movements.transfersOut.length > 0 ? (
                <ul className="movement-list">
                  {movementModal.data.movements.transfersOut.map((t, i) => (
                    <li key={i} className="movement-item movement-item--negative">
                      -{t.quantity} to {t.toBase} - {new Date(t.date).toLocaleDateString()}
                    </li>
                  ))}
                </ul>
              ) : <p className="movement-empty">No outbound transfers</p>}
            </div>

            <div className="movement-section">
              <h5 className="movement-section__title">Assignments ({movementModal.data.movements.assignments.length})</h5>
              {movementModal.data.movements.assignments.length > 0 ? (
                <ul className="movement-list">
                  {movementModal.data.movements.assignments.map((a, i) => (
                    <li key={i} className="movement-item movement-item--negative">
                      -{a.quantity} to {a.assignedTo} - {a.purpose}
                      {a.expendedQty > 0 && ` (${a.expendedQty} expended)`}
                    </li>
                  ))}
                </ul>
              ) : <p className="movement-empty">No assignments recorded</p>}
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
