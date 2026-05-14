import './EmptyState.css';

export default function EmptyState({ icon = '📋', heading, message }) {
  return (
    <div className="empty-state">
      <span className="empty-state__icon">{icon}</span>
      <h4 className="empty-state__heading">{heading || 'No records found'}</h4>
      <p className="empty-state__message">{message || 'Try adjusting your filters or create a new record.'}</p>
    </div>
  );
}
