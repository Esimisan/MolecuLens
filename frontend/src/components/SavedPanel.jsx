import "../styles/SavedPanel.css";

function SavedPanel({ open, onClose }) {
  return (
    <>
      <div
        className={`overlay ${open ? "overlay-open" : ""}`}
        onClick={onClose}
      />
      <aside
        className={`saved-panel glass-card ${open ? "saved-panel-open" : ""}`}
      >
        <div className="saved-header">
          <h2>Saved compounds</h2>
          <button className="icon-button" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <p className="muted">
          Nothing saved yet. Search a compound and save it.
        </p>
        <p className="eyebrow saved-footer">Saved to your account.</p>
      </aside>
    </>
  );
}

export default SavedPanel;
