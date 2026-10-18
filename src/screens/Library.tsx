import { useEffect, useRef, type ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import * as api from "../api";
import { ApiError } from "../api/client";
import type { Material } from "../api/types";
import {
  Button,
  Card,
  DropZone,
  EmptyState,
  Icon,
  ProgressBar,
  Spinner,
  Tag,
} from "../components";
import { useToast } from "../context/ToastContext";
import { useAsync } from "../hooks/useAsync";
import { formatDate } from "../lib/format";

export function Library() {
  const { data, loading, error, reload, setData } = useAsync(
    () => api.materials.listMaterials(),
    [],
  );
  const { notify } = useToast();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  // Advance any in-flight uploads until each is ready.
  useEffect(() => {
    if (!data) return;
    const pending = data.filter((m) => m.status === "processing");
    if (pending.length === 0) return;
    const timer = setTimeout(async () => {
      const results = await Promise.all(
        pending.map((m) => api.materials.advanceProcessing(m.id).catch(() => null)),
      );
      setData(
        data.map((m) => results.find((r) => r && r.id === m.id) ?? m),
      );
      for (const r of results) {
        if (r && r.status === "ready") notify(`${r.title} is ready to practice.`, "success");
      }
    }, 900);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  async function handleFiles(files: File[]) {
    const added: Material[] = [];
    for (const f of files) {
      try {
        added.push(
          await api.materials.uploadMaterial({
            name: f.name,
            size: f.size,
            type: f.type,
            file: f,
          }),
        );
        notify(`Reading ${f.name}…`, "info");
      } catch (err) {
        notify(err instanceof ApiError ? err.message : "That upload did not start.", "error");
      }
    }
    if (added.length) setData([...added, ...(data ?? [])]);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function cancel(id: string) {
    await api.materials.cancelProcessing(id);
    setData((data ?? []).filter((m) => m.id !== id));
  }

  async function remove(id: string) {
    await api.materials.deleteMaterial(id);
    setData((data ?? []).filter((m) => m.id !== id));
  }

  async function newQuestions(material: Material) {
    const created = await api.questions.generateQuestions(material.id);
    setData(
      (data ?? []).map((m) =>
        m.id === material.id ? { ...m, questionCount: m.questionCount + created.length } : m,
      ),
    );
    notify(`${created.length} new questions ready.`, "success");
    navigate(`/practice/${material.id}`);
  }

  return (
    <>
      <div className="page-head">
        <h1 className="page-title">Your materials</h1>
        <Button variant="primary" icon="upload" onClick={() => fileRef.current?.click()}>
          Upload material
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.doc,.docx,.txt,.md,.rtf"
          multiple
          className="visually-hidden"
          aria-label="Choose a file to upload"
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            e.target.files && handleFiles(Array.from(e.target.files))
          }
        />
      </div>

      <div className="stack">
        <DropZone
          title="Drop PDF, DOCX or TXT here, or browse files."
          hint="We will do our best with messy files."
          onFiles={handleFiles}
        />

        {loading && <Spinner label="Loading your materials…" />}

        {error && (
          <EmptyState title="We hit a snag" message={error} icon="error">
            <Button icon="retry" onClick={reload}>Try again</Button>
          </EmptyState>
        )}

        {data && data.length === 0 && !loading && (
          <EmptyState
            title="No materials yet"
            message="Upload a file above and we will create practice questions for you."
          />
        )}

        {data
          ?.filter((m) => m.status === "processing")
          .map((m) => (
            <div className="processing-row" key={m.id}>
              <div className="row">
                <Spinner label="" />
                <div>
                  <p className="filename">{m.title}</p>
                  <p className="muted text-sm">
                    <Icon name="clock" size="sm" /> Reading your material…{" "}
                    {m.processingProgress ?? 0}%
                  </p>
                </div>
              </div>
              <div className="grow">
                <ProgressBar
                  value={m.processingProgress ?? 0}
                  label={`Reading ${m.title}`}
                />
              </div>
              <Button onClick={() => cancel(m.id)}>Cancel</Button>
            </div>
          ))}

        {data
          ?.filter((m) => m.status === "failed")
          .map((m) => (
            <div className="processing-row" key={m.id}>
              <div className="processing-row__info">
                <p className="filename">{m.title}</p>
                <p className="muted text-sm">
                  <Icon name="alert" size="sm" />{" "}
                  {m.failureReason ??
                    "We could not read this file. Try exporting it again, or use a different format."}
                </p>
              </div>
              <div className="row">
                <Button onClick={() => fileRef.current?.click()}>Try another file</Button>
                <Button icon="trash" onClick={() => remove(m.id)}>Remove</Button>
              </div>
            </div>
          ))}

        <div className="grid-cards">
          {data
            ?.filter((m) => m.status === "ready")
            .map((m) => {
              const complete = m.questionCount > 0 && m.questionsDone >= m.questionCount;
              return (
                <Card className="material-card" key={m.id}>
                  <h2 className="material-card__title">{m.title}</h2>
                  <div>
                    <Tag>
                      <Icon name="file" size="sm" /> {m.fileType}
                    </Tag>
                  </div>
                  <p className="muted text-sm">
                    {m.pages} pages · uploaded {formatDate(m.uploadedAt)}
                  </p>
                  <p className="text-sm">
                    {m.questionsDone === 0
                      ? "Not started"
                      : `${m.questionsDone} of ${m.questionCount} questions done`}
                  </p>
                  <ProgressBar
                    value={m.questionsDone}
                    max={m.questionCount || 1}
                    label={`${m.title} progress`}
                  />
                  <div className="material-card__actions">
                    {complete ? (
                      <>
                        <Button onClick={() => newQuestions(m)}>New questions</Button>
                        <Button onClick={() => navigate(`/practice/${m.id}`)}>Review</Button>
                      </>
                    ) : (
                      <>
                        <Button onClick={() => navigate(`/practice/${m.id}`)}>
                          {m.questionsDone === 0 ? "Start" : "Practice"}
                        </Button>
                        {m.questionsDone > 0 && (
                          <Button onClick={() => navigate(`/practice/${m.id}`)}>Resume</Button>
                        )}
                      </>
                    )}
                  </div>
                </Card>
              );
            })}
        </div>
      </div>
    </>
  );
}
