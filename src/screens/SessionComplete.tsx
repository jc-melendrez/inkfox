import { Link, useNavigate, useParams } from "react-router-dom";
import * as api from "../api";
import { Button, Card, EmptyState, FoxPlaceholder, ProgressBar, Spinner } from "../components";
import { useAsync } from "../hooks/useAsync";

export function SessionComplete() {
  const { materialId } = useParams();
  const navigate = useNavigate();
  const { data, loading, error, reload } = useAsync(
    () => api.sessions.completeSession(materialId!),
    [materialId],
  );

  if (loading) return <Spinner label="Adding up your session…" />;
  if (error || !data) {
    return (
      <EmptyState title="We could not load your session" message={error ?? undefined}>
        <Button onClick={reload}>Try again</Button>
      </EmptyState>
    );
  }

  return (
    <div className="celebrate">
      <FoxPlaceholder state="celebrating" size="lg" label="Fox celebrating" />
      <h1 className="page-title">Session complete!</h1>
      <p className="muted">
        {data.essaysCompleted} {data.essaysCompleted === 1 ? "essay" : "essays"} · average score{" "}
        {data.avgScoreDelta >= 0 ? "up" : "down"} {Math.abs(data.avgScoreDelta)}% from last time
      </p>

      <Card>
        <p className="text-sm">
          {data.method} mastery {data.masteryFrom}% to {data.masteryTo}%
        </p>
        <ProgressBar value={data.masteryTo} label={`${data.method} mastery`} />
      </Card>

      <p className="highlight-box">Your best moment: {data.bestMoment}</p>

      <div className="celebrate__actions">
        <Button variant="primary" size="lg" onClick={() => navigate("/library")}>
          Practice next material
        </Button>
        <Button onClick={() => navigate(`/practice/${materialId}`)}>Review feedback</Button>
        <Link to="/library">Back to library</Link>
      </div>
    </div>
  );
}
