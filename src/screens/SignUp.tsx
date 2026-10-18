import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ApiError } from "../api/client";
import type { UserRole } from "../api/types";
import { Button, Card, Checkbox, FoxPlaceholder, Input, Select } from "../components";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { AuthLayout } from "../layouts/AuthLayout";
import { ROLE_OPTIONS } from "../lib/methods";

const BENEFITS = [
  "Practice with a structure that works",
  "Get feedback you can act on",
  "Track your progress over time",
];

export function SignUp() {
  const { signup, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const { notify } = useToast();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("High school student");
  const [agreed, setAgreed] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!agreed) {
      setError("Please agree to the Terms and Privacy Policy to continue.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await signup({ name, email, password, role });
      notify("Your account is ready. Let's set things up.", "success");
      navigate("/onboarding");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "We could not create your account.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout
      aside={
        <>
          <FoxPlaceholder state="waving" size="lg" label="Fox waving" />
          <h2>Join FoxTutor in a minute</h2>
          <ul className="auth-points">
            {BENEFITS.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        </>
      }
    >
      <Card className="stack">
        <h1 className="page-title">Create your account</h1>
        <form className="stack" onSubmit={onSubmit} noValidate>
          <Input
            label="Name"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            help="We will tidy up extra spaces for you."
          />
          <div className="stack">
            <Input
              label="Password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              help="At least 8 characters."
            />
            <button
              type="button"
              className="link-button"
              aria-pressed={showPassword}
              onClick={() => setShowPassword((v) => !v)}
            >
              {showPassword ? "Hide password" : "Show password"}
            </button>
          </div>
          <Select
            label="I am a…"
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            options={ROLE_OPTIONS}
          />
          <Checkbox
            label="I agree to the Terms and Privacy Policy"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
          />
          {error && <p className="field__error">{error}</p>}
          <Button type="submit" variant="primary" fullWidth size="lg" disabled={busy}>
            {busy ? "Creating account…" : "Create account"}
          </Button>
        </form>
        <Button
          fullWidth
          onClick={async () => {
            await loginWithGoogle();
            navigate("/onboarding");
          }}
        >
          Continue with Google
        </Button>
        <p className="text-sm">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </Card>
    </AuthLayout>
  );
}
