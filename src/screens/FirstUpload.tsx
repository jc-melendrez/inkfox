import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { MethodKey } from "../api/types";
import * as api from "../api";
import { ApiError } from "../api/client";
import { Button, DropZone } from "../components";
import { useAuth } from "../context/AuthContext";
import { OnboardingLayout } from "../layouts/OnboardingLayout";

export function FirstUpload() {
  const navigate = useNavigate();
  const location = useLocation();
  const { completeOnboarding } = useAuth();
  const method = (location.state as { method?: MethodKey } | null)?.method;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function finish() {
    setBusy(true);
    setError(null);
    try {
      await completeOnboarding({ method });
      navigate("/library");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "We could not finish setup.");
      setBusy(false);
    }
  }

  async function upload(file: File) {
    setBusy(true);
    try {
      await api.materials.uploadMaterial({
        name: file.name,
        size: file.size,
        type: file.type,
        file,
      });
    } catch {
      /* the library shows processing progress; errors are non-blocking here */
    }
    await finish();
  }

  async function useSample() {
    setBusy(true);
    try {
      await api.materials.createSampleMaterial();
    } catch {
      /* ignore */
    }
    await finish();
  }

  return (
    <OnboardingLayout
      step={3}
      total={3}
      breadcrumb={["Welcome", "Method", "First upload"]}
      footer={
        <>
          <Button onClick={() => navigate("/onboarding/method")}>Back</Button>
          <Button variant="primary" onClick={finish} disabled={busy}>
            {busy ? "Setting up…" : "Finish setup"}
          </Button>
        </>
      }
    >
      <h1 className="page-title">Upload your first material</h1>
      <p className="muted">PDF, DOCX or TXT. We will do our best with any file.</p>
      <DropZone
        title="Drop a file here, or browse files"
        onFiles={(files) => {
          const f = files[0];
          if (f) upload(f);
        }}
      />
      <p className="text-sm muted">
        No file handy? Try a sample passage and explore first.
      </p>
      <Button fullWidth onClick={useSample} disabled={busy}>
        Use a sample passage
      </Button>
      {error && <p className="field__error">{error}</p>}
    </OnboardingLayout>
  );
}
