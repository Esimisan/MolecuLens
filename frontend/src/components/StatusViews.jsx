import "../styles/StatusViews.css";

export function Loading({ label = "Loading…" }) {
  return (
    <div className="status" role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      <p>{label}</p>
    </div>
  );
}

export function EmptyState({ title, message, children }) {
  return (
    <div className="status glass-card">
      <p className="eyebrow">No results</p>
      <h2 className="status-title">{title}</h2>
      {message && <p className="status-text">{message}</p>}
      {children}
    </div>
  );
}

export function ErrorMessage({
  title = "Something went wrong",
  message,
  onRetry,
}) {
  return (
    <div className="status status-error glass-card" role="alert">
      <p className="eyebrow">Error</p>
      <h2 className="status-title">{title}</h2>
      {message && <p className="status-text">{message}</p>}
      {onRetry && (
        <button className="btn" type="button" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}
