import { useNavigate } from "react-router-dom";
import * as api from "../api";
import {
  Button,
  Card,
  EmptyState,
  Icon,
  ProgressBar,
  ScoreTrendChart,
  Spinner,
} from "../components";
import { useAsync } from "../hooks/useAsync";
import { relativeDay } from "../lib/format";

export function ProgressScreen() {
  const navigate = useNavigate();
  const { data, loading, error, reload } = useAsync(() => api.progress.getProgress(), []);

  if (loading) return <Spinner label="Loading your progress…" />;
  if (error || !data) {
    return (
      <EmptyState title="We could not load your progress" message={error ?? undefined} icon="error">
        <Button icon="retry" onClick={reload}>Try again</Button>
      </EmptyState>
    );
  }

  return (
    <>
      <div className="page-head">
        <h1 className="page-title">Your progress</h1>
      </div>

      <div className="method-grid">
        {data.methods.map((m) => (
          <Card key={m.method}>
            <h2 className="card__heading">{m.label}</h2>
            <p className="muted text-sm">
              {m.started
                ? `Level ${m.level} · ${m.levelLabel} · ${m.percent}%`
                : "Not started"}
            </p>
            <ProgressBar value={m.percent} label={`${m.label} mastery`} />
          </Card>
        ))}
      </div>

      <div className="progress-split">
        <div className="chart-box">
          <ScoreTrendChart points={data.trend} />
        </div>
        {data.resume && (
          <Card className="stack">
            <h2 className="card__heading">
              <Icon name="clock" size="sm" /> Continue where you left off
            </h2>
            <p className="muted text-sm">
              {data.resume.materialTitle} · Question {data.resume.questionIndex} ·{" "}
              {data.resume.savedAt && relativeDay(data.resume.savedAt)}
            </p>
            <p>{data.resume.questionText}</p>
            <Button
              variant="primary"
              size="lg"
              onClick={() =>
                navigate(`/practice/${data.resume!.materialId}/q/${data.resume!.questionId}`)
              }
            >
              Resume
            </Button>
          </Card>
        )}
      </div>

      <h2 className="card__heading">By material</h2>
      <ul className="plain-list">
        {data.byMaterial.map((row) => (
          <li className="plain-list__row" key={row.materialId}>
            <span>
              {row.title} · {row.done} of {row.total}
            </span>
            <Button onClick={() => navigate(`/practice/${row.materialId}`)}>
              View questions
            </Button>
          </li>
        ))}
      </ul>
    </>
  );
}
