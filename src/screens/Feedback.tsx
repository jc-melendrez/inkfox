import { useNavigate, useParams } from "react-router-dom";
import * as api from "../api";
import type { PartStatus } from "../api/types";
import { Button, Card, EmptyState, Icon, ProgressBar, Spinner, Tag, type IconName } from "../components";
import { useAsync } from "../hooks/useAsync";

const STATUS: Record<
  PartStatus,
  { label: string; tone: "success" | "warning" | "danger"; icon: IconName }
> = {
  strong: { label: "Strong", tone: "success", icon: "check" },
  needs_work: { label: "Needs work", tone: "warning", icon: "alert" },
  missing: { label: "Missing", tone: "warning", icon: "minus" },
};

export function FeedbackScreen() {
  const { materialId, questionId } = useParams();
  const navigate = useNavigate();
  const { data: question } = useAsync(
    () => api.questions.getQuestion(questionId!),
    [questionId],
  );
  const { data: feedback, loading, error, reload } = useAsync(
    () => api.feedback.getFeedback(questionId!),
    [questionId],
  );

  if (loading) return <Spinner label="Fetching your feedback…" />;
  if (error || !feedback) {
    return (
      <EmptyState
        title="No feedback yet"
        message={error ?? "Submit your essay first, then we can give you feedback."}
        icon="error"
      >
        <Button variant="primary" onClick={() => navigate(`/practice/${materialId}/q/${questionId}`)}>
          Back to the editor
        </Button>
        <Button icon="retry" onClick={reload}>Try again</Button>
      </EmptyState>
    );
  }

  function jumpTo(partKey: string) {
    const index = feedback!.parts.findIndex((p) => p.key === partKey);
    const el = document.getElementById(`part-${index}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.focus();
    }
  }

  async function nextQuestion() {
    const next = await api.questions.nextUnanswered(materialId!);
    if (next) navigate(`/practice/${materialId}/q/${next.id}`);
    else navigate(`/session/${materialId}/complete`);
  }

  return (
    <>
      <div className="page-head">
        <h1 className="page-title">{feedback.headline}</h1>
        <Tag>
          Draft {feedback.draftNumber} · {feedback.method}
        </Tag>
      </div>

      <div className="feedback-grid">
        <Card>
          <div className="feedback-essay">
            {feedback.parts.map((part, i) => {
              const status = STATUS[part.status];
              return (
                <article className="essay-part" key={`${part.key}-${i}`} id={`part-${i}`} tabIndex={-1}>
                  <div>
                    <Tag tone={status.tone}>
                      <Icon name={status.icon} size="sm" /> {part.key} · {status.label}
                    </Tag>
                  </div>
                  {part.text ? (
                    <p className="essay-part__text">{part.text}</p>
                  ) : (
                    <p className="muted">{part.note ?? "Nothing here yet."}</p>
                  )}
                </article>
              );
            })}
          </div>
        </Card>

        <div className="side-panel">
          <Card>
            <h2 className="card__heading">
              {feedback.partsLanded} of {feedback.partsTotal} {feedback.method} parts landed
            </h2>
            <ProgressBar
              value={feedback.partsLanded}
              max={feedback.partsTotal}
              label="Parts landed"
            />
          </Card>

          {feedback.strengths.length > 0 && (
            <Card>
              <h2 className="card__heading">Strengths</h2>
              <ul className="tip-list tip-list--good">
                {feedback.strengths.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </Card>
          )}

          {feedback.improvements.length > 0 && (
            <Card>
              <h2 className="card__heading">To improve</h2>
              <ul className="tip-list tip-list--warn">
                {feedback.improvements.map((imp) => (
                  <li key={imp.partKey}>
                    <span>
                      {imp.label}: {imp.message}{" "}
                      <button
                        type="button"
                        className="link-button"
                        onClick={() => jumpTo(imp.partKey)}
                      >
                        Jump to it
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Button
            variant="primary"
            size="lg"
            fullWidth
            icon="practice"
            onClick={() =>
              navigate(`/practice/${materialId}/q/${questionId}?revise=1`)
            }
          >
            Revise essay
          </Button>
          {question && (
            <Button fullWidth onClick={nextQuestion}>
              Next question
            </Button>
          )}
        </div>
      </div>
    </>
  );
}
