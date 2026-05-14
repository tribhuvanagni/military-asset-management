import './Spinner.css';

export default function Spinner({ size = 'medium', label = 'Loading...' }) {
  return (
    <div className={`spinner-container spinner-container--${size}`}>
      <div className="spinner-ring" />
      {label && <p className="spinner-label">{label}</p>}
    </div>
  );
}
