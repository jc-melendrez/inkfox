import { Link } from "react-router-dom";

export function NotFound() {
  return (
    <div id="main" tabIndex={-1} className="empty-state">
      <h1 className="page-title">We could not find that page</h1>
      <p className="muted">The link may be out of date.</p>
      <Link className="btn btn--primary" to="/home">
        Back to your dashboard
      </Link>
    </div>
  );
}
