import { useNavigate } from "react-router-dom";
import * as api from "../api";
import { Button, Card, EmptyState, FoxPlaceholder, ProgressBar, Spinner } from "../components";
import { useAuth } from "../context/AuthContext";
import { useAsync } from "../hooks/useAsync";
import { relativeDay } from "../lib/format";

export function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const progress = useAsync(() => api.progress.getProgress(), []);
  const profile = useAsync(() => api.profile.getProfile(), []);
  const materials = useAsync(() => api.materials.listMaterials(), []);

  const loading = progress.loading || profile.loading || materials.loading;
  const error = progress.error || profile.error || materials.error;

  if (loading) return <Spinner label="Loading your dashboard…" />;
  if (error || !progress.data || !profile.data || !materials.data) {
    return (
      <EmptyState title="We could not load your dashboard" message={error ?? undefined}>
        <Button
          onClick={() => {
            progress.reload();
            profile.reload();
            materials.reload();
          }}
        >
          Try again
        </Button>
      </EmptyState>
    );
  }

  const resume = progress.data.resume;
  const methods = progress.data.methods.filter((m) => m.method !== "Other");
  const recent = materials.data.filter((m) => m.status === "ready").slice(0, 3);

  return (
    <>
      <div className="home-head">
        <FoxPlaceholder state="waving" size="md" label="Fox waving" />
        <div className="grow">
          <h1 className="page-title">Welcome back{user ? `, ${user.name.split(" ")[0]}` : ""}!</h1>
          <p className="muted">{profile.data.stats.dayStreak}-day streak. Keep it going.</p>
        </div>
        <Button onClick={() => navigate("/library")}>Upload material</Button>
      </div>

      <div className="stack">
        {resume && (
          <Card accent className="continue-card">
            <span className="muted text-sm">Continue where you left off</span>
            <p className="continue-card__title">{resume.questionText}</p>
            <p className="muted text-sm">
              {resume.materialTitle} · Question {resume.questionIndex} of {resume.total} ·
              draft saved {relativeDay(resume.savedAt)}
            </p>
            <div>
              <Button
                variant="primary"
                size="lg"
                onClick={() =>
                  navigate(`/practice/${resume.materialId}/q/${resume.questionId}`)
                }
              >
                Resume essay
              </Button>
            </div>
          </Card>
        )}

        <div className="home-grid">
          <Card>
            <h2 className="card__heading">Method mastery</h2>
            <div className="bar-list">
              {methods.map((m) => (
                <div key={m.method}>
                  <span className="bar-list__label">
                    <span>
                      {m.label} · Level {m.level}
                    </span>
                    <span>{m.percent}%</span>
                  </span>
                  <ProgressBar value={m.percent} label={`${m.label} mastery`} />
                </div>
              ))}
            </div>
            <button
              type="button"
              className="link-button"
              onClick={() => navigate("/progress")}
            >
              See all progress
            </button>
          </Card>

          <Card>
            <h2 className="card__heading">Recent materials</h2>
            <ul className="plain-list">
              {recent.map((m) => (
                <li className="plain-list__row" key={m.id}>
                  <span>
                    {m.title} ·{" "}
                    {m.questionsDone === 0
                      ? "Not started"
                      : `${m.questionsDone} of ${m.questionCount}`}
                  </span>
                  <Button onClick={() => navigate(`/practice/${m.id}`)}>
                    {m.questionsDone === 0 ? "Start" : "Practice"}
                  </Button>
                </li>
              ))}
            </ul>
            <button
              type="button"
              className="link-button"
              onClick={() => navigate("/library")}
            >
              Open library
            </button>
          </Card>
        </div>
      </div>
    </>
  );
}
