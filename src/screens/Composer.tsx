import { useEffect, useRef, useState } from "react";
import { Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import * as api from "../api";
import { ApiError } from "../api/client";
import {
  Button,
  Card,
  Checkbox,
  EmptyState,
  Icon,
  Spinner,
  Tag,
  Textarea,
} from "../components";
import { useSettings } from "../context/SettingsContext";
import { useToast } from "../context/ToastContext";
import { useAsync } from "../hooks/useAsync";
import { useAutosave } from "../hooks/useAutosave";
import { useTimer } from "../hooks/useTimer";
import { formatClock, wordCount } from "../lib/format";
import { METHOD_PARTS } from "../lib/methods";

const MAX_INSTRUCTIONS = 400;
const INSTRUCTION_SUGGESTIONS = [
  "Focus on my linking sentences",
  "Explain grammar simply",
  "Be more detailed",
  "Be more direct",
];

export function Composer() {
  const { materialId, questionId } = useParams();
  if (questionId) {
    return <ComposerEditor materialId={materialId!} questionId={questionId} />;
  }
  return <ResolveCurrent materialId={materialId!} />;
}

/** /practice/:materialId → jumps to the next unanswered question, else review. */
function ResolveCurrent({ materialId }: { materialId: string }) {
  const { data, loading, error, reload } = useAsync(
    () => api.questions.nextUnanswered(materialId),
    [materialId],
  );
  if (loading) return <Spinner label="Finding your next question…" />;
  if (error) {
    return (
      <EmptyState title="We hit a snag" message={error} icon="error">
        <Button icon="retry" onClick={reload}>Try again</Button>
      </EmptyState>
    );
  }
  if (data) return <Navigate to={`/practice/${materialId}/q/${data.id}`} replace />;
  return <AllDone materialId={materialId} />;
}

function AllDone({ materialId }: { materialId: string }) {
  const navigate = useNavigate();
  const { data } = useAsync(() => api.questions.listQuestions(materialId), [materialId]);
  if (data) {
    if (data.length) {
      return <Navigate to={`/practice/${materialId}/q/${data[0].id}/feedback`} replace />;
    }
    return (
      <EmptyState
        title="No questions yet"
        message="This material does not have any practice questions yet."
      >
        <Button onClick={() => navigate("/library")}>Back to library</Button>
      </EmptyState>
    );
  }
  return <Spinner label="Opening your review…" />;
}

function ComposerEditor({
  materialId,
  questionId,
}: {
  materialId: string;
  questionId: string;
}) {
  const navigate = useNavigate();
  const { notify } = useToast();
  const { settings, ready } = useSettings();
  const [searchParams] = useSearchParams();
  const revising = searchParams.get("revise") === "1";

  const { data: material } = useAsync(
    () => api.materials.getMaterial(materialId),
    [materialId],
  );
  const { data: question, loading, error, reload } = useAsync(
    () => api.questions.getQuestion(questionId),
    [questionId],
  );
  const { data: draft } = useAsync(() => api.essays.getDraft(questionId), [questionId]);
  const { data: priorFeedback, loading: priorFeedbackLoading } = useAsync(
    () => api.feedback.getFeedback(questionId),
    [questionId],
  );

  const [content, setContent] = useState("");
  const [seeded, setSeeded] = useState(false);
  const [checks, setChecks] = useState<boolean[]>([false, false, false, false]);
  const [submitting, setSubmitting] = useState(false);
  const [tipDismissed, setTipDismissed] = useState(false);
  const [instructions, setInstructions] = useState("");
  const [instructionsSource, setInstructionsSource] = useState<"revision" | "default" | null>(null);
  const [instructionsSeeded, setInstructionsSeeded] = useState(false);
  const instructionsDetailsRef = useRef<HTMLDetailsElement>(null);
  const timer = useTimer(settings.timerMinutes, settings.pressureTimer);

  useEffect(() => {
    if (draft && !seeded) {
      setContent(draft.content);
      setSeeded(true);
    }
  }, [draft, seeded]);

  // Prefill once the editor is mounted and settings (and, when revising, the
  // previous feedback) have loaded, so the field never flashes empty and collapsed.
  useEffect(() => {
    if (loading || instructionsSeeded || !ready) return;
    if (revising && priorFeedbackLoading) return;
    const fromRevision = revising ? (priorFeedback?.instructions ?? "").trim() : "";
    const fromDefault = settings.defaultInstructions.trim();
    const value = fromRevision || fromDefault;
    setInstructions(value);
    if (instructionsDetailsRef.current) {
      instructionsDetailsRef.current.open = value.length > 0;
    }
    setInstructionsSource(fromRevision ? "revision" : fromDefault ? "default" : null);
    setInstructionsSeeded(true);
  }, [
    loading,
    instructionsSeeded,
    ready,
    revising,
    priorFeedbackLoading,
    priorFeedback,
    settings.defaultInstructions,
  ]);

  const saveStatus = useAutosave(content, (v) => api.essays.saveDraft(questionId, v));

  if (loading) return <Spinner label="Opening your question…" />;
  if (error || !question) {
    return (
      <EmptyState title="We could not open that question" message={error ?? undefined} icon="error">
        <Button icon="retry" onClick={reload}>Try again</Button>
      </EmptyState>
    );
  }

  const parts = METHOD_PARTS[question.method];
  const savedText =
    saveStatus === "saving"
      ? "Saving…"
      : saveStatus === "saved"
        ? "Saved just now"
        : saveStatus === "error"
          ? "Not saved yet — we will retry"
          : "Draft will save automatically";

  async function submit() {
    setSubmitting(true);
    try {
      await api.essays.submitEssay(questionId, content, instructions.trim());
      navigate(`/practice/${materialId}/q/${questionId}/feedback`);
    } catch (err) {
      notify(err instanceof ApiError ? err.message : "We could not read that draft.", "error");
      setSubmitting(false);
    }
  }

  async function pauseAndSave() {
    await api.essays.saveDraft(questionId, content);
    notify("Draft saved. Pick it up anytime from your library.", "success");
    navigate("/library");
  }

  function toggleTimer() {
    if (timer.running) timer.pause();
    else timer.start();
  }

  return (
    <>
      <div className="composer-top">
        <div className="composer-top__meta">
          <span className="muted text-sm">
            {material?.title ?? "Practice"} · Question {question.index} of {question.total}
          </span>
          <Tag>Method: {question.method}</Tag>
        </div>
        <div className="composer-top__actions">
          <Button onClick={toggleTimer} aria-pressed={timer.running}>
            <Icon name="timer" size="sm" />
            {timer.running ? (
              <>
                <span className="timer">{formatClock(timer.secondsLeft)}</span>
                <span className="visually-hidden"> timer running, press to pause</span>
              </>
            ) : (
              "Timer: Off"
            )}
          </Button>
          <Button icon="pause" onClick={pauseAndSave}>
            Pause and save
          </Button>
        </div>
      </div>

      <Card className="question-card">
        <p className="question-card__text">{question.text}</p>
        <div className="row row--wrap">
          <details>
            <summary className="btn btn--secondary">
              <Icon name="chevron" size="sm" /> Show source passage
            </summary>
            <p className="source-passage">{question.sourcePassage}</p>
          </details>
          <span className="muted text-sm">
            Timer is optional. Turn it on for exam practice.
          </span>
        </div>
      </Card>

      <div className="composer-grid">
        <Card className="editor">
          <Textarea
            label="Your answer"
            hideLabel
            className="editor__textarea"
            placeholder="Start with your Point…"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />

          <details className="instructions" ref={instructionsDetailsRef}>
            <summary className="btn btn--secondary">
              <Icon name="chevron" size="sm" /> Add instructions (optional)
            </summary>
            <div className="instructions__body stack">
              <Textarea
                label="Your instructions"
                help={`These tips shape the feedback, but the ${question.method} criteria still apply.`}
                maxLength={MAX_INSTRUCTIONS}
                placeholder="e.g. Focus on my linking sentences, and explain grammar simply."
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
              />
              <div className="row row--between">
                <span className="muted text-sm" aria-live="polite">
                  {instructions.length}/{MAX_INSTRUCTIONS}
                </span>
                {instructionsSource && (
                  <span className="muted text-sm">
                    {instructionsSource === "revision"
                      ? "From your last revision"
                      : "From your default instructions"}
                  </span>
                )}
              </div>
              <div className="row row--wrap">
                {INSTRUCTION_SUGGESTIONS.map((suggestion) => (
                  <Button
                    key={suggestion}
                    variant="secondary"
                    onClick={() => setInstructions(suggestion)}
                  >
                    {suggestion}
                  </Button>
                ))}
                {instructions && (
                  <button
                    type="button"
                    className="link-button"
                    onClick={() => setInstructions("")}
                  >
                    <Icon name="close" size="sm" /> Clear
                  </button>
                )}
              </div>
            </div>
          </details>

          <div className="editor__meta">
            <span className="muted text-sm">
              {wordCount(content)} words · {savedText}
            </span>
            <Button
              variant="primary"
              size="lg"
              onClick={submit}
              disabled={submitting || !content.trim()}
              aria-describedby={content.trim() ? undefined : "submit-hint"}
            >
              {submitting ? "Reading your essay…" : "Submit for feedback"}
            </Button>
          </div>
          {!content.trim() && (
            <p id="submit-hint" className="muted text-sm">
              Write your first sentence and the submit button will switch on.
            </p>
          )}
        </Card>

        <div className="side-panel">
          <Card>
            <h2 className="card__heading">{question.method} checklist</h2>
            <ul className="checklist">
              {parts.map((part, i) => (
                <li key={`${part.key}-${i}`}>
                  <Checkbox
                    label={`${part.short}: ${part.instruction}`}
                    checked={checks[i] ?? false}
                    onChange={(e) =>
                      setChecks((prev) => prev.map((c, idx) => (idx === i ? e.target.checked : c)))
                    }
                  />
                </li>
              ))}
            </ul>
          </Card>
          {!tipDismissed && (
            <div className="tip-box">
              <div className="row row--between">
                <strong>
                  <Icon name="tip" size="sm" /> Tip
                </strong>
                <button
                  type="button"
                  className="link-button"
                  onClick={() => setTipDismissed(true)}
                >
                  <Icon name="close" size="sm" /> Dismiss
                </button>
              </div>
              <p className="muted">
                Try to answer the question in your first sentence, then back it up with evidence.
              </p>
            </div>
          )}
          {revising && priorFeedback && (
            <Card>
              <h2 className="card__heading">Previous feedback</h2>
              <p className="muted text-sm">{priorFeedback.headline}</p>
              <ul className="tip-list tip-list--warn">
                {priorFeedback.improvements.map((imp, i) => (
                  <li key={`${imp.partKey}-${i}`}>
                    {imp.label}: {imp.message}
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
