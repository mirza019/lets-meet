import { Link } from "react-router-dom";

export function RecoveryError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
  return (
    <section className="card recovery-error" role="alert">
      <p className="eyebrow">A plot twist</p>
      <h1 className="title">The plan took a tiny detour. 🗿</h1>
      <p className="error">{message}</p>
      <div className="recovery-help">
        <strong>Try this:</strong>
        <ul>
          <li>Check that you opened the complete private link.</li>
          <li>Refresh once—the free server may be waking up.</li>
          <li>If the link is old, ask the sender for a fresh invitation.</li>
          {isLocal && <li>Local mode: make sure both frontend and backend servers are running.</li>}
        </ul>
      </div>
      <div className="row">
        <button className="btn primary" onClick={onRetry}>TRY AGAIN ✨</button>
        <Link className="btn secondary" to="/">BACK TO HOMEPAGE</Link>
      </div>
    </section>
  );
}
