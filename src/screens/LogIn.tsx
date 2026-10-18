import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import * as api from "../api";
import { ApiError } from "../api/client";
import { Button, Card, Input, Modal } from "../components";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { AuthLayout } from "../layouts/AuthLayout";

export function LogIn() {
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const { notify } = useToast();
  const googleEnabled = import.meta.env.VITE_ENABLE_GOOGLE_AUTH === "true";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const user = await login({ email, password });
      notify("Welcome back!", "success");
      navigate(user.onboarded ? "/home" : "/onboarding");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "We could not log you in.");
    } finally {
      setBusy(false);
    }
  }

  async function onGoogle() {
    try {
      const user = await loginWithGoogle();
      navigate(user.onboarded ? "/home" : "/onboarding");
    } catch (err) {
      notify(
        err instanceof ApiError ? err.message : "Google sign-in is not available right now.",
        "error",
      );
    }
  }

  return (
    <AuthLayout>
      <Card className="stack">
        <div>
          <h1 className="page-title">Welcome back</h1>
          <p className="muted">Pick up where you left off.</p>
        </div>
        <form className="stack" onSubmit={onSubmit} noValidate>
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            label="Password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={error ?? undefined}
          />
          <Button type="submit" variant="primary" fullWidth size="lg" disabled={busy}>
            {busy ? "Logging in…" : "Log in"}
          </Button>
        </form>
        <button type="button" className="link-button" onClick={() => setResetOpen(true)}>
          Forgot password?
        </button>
        {googleEnabled && (
          <Button fullWidth onClick={onGoogle}>
            Continue with Google
          </Button>
        )}
        <p className="text-sm">
          New here? <Link to="/signup">Create a free account</Link>
        </p>
      </Card>

      <Modal
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        title="Reset your password"
      >
        <div className="stack">
          <Input
            label="Email"
            type="email"
            value={resetEmail}
            onChange={(e) => setResetEmail(e.target.value)}
            help="We will email you a link to choose a new password."
          />
          <div className="modal__actions">
            <Button onClick={() => setResetOpen(false)}>Cancel</Button>
            <Button
              variant="primary"
              onClick={async () => {
                try {
                  await api.auth.requestPasswordReset(resetEmail);
                  setResetOpen(false);
                  notify("If that email is on file, a reset link is on its way.", "success");
                } catch {
                  notify("Enter the email you signed up with.", "error");
                }
              }}
            >
              Send reset link
            </Button>
          </div>
        </div>
      </Modal>
    </AuthLayout>
  );
}
