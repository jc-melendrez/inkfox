import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as api from "../api";
import { ApiError } from "../api/client";
import type { UserRole } from "../api/types";
import {
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  FoxPlaceholder,
  Input,
  Modal,
  Select,
  Spinner,
} from "../components";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useAsync } from "../hooks/useAsync";
import { ROLE_OPTIONS } from "../lib/methods";

export function ProfileScreen() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { notify } = useToast();
  const { data, loading, error, reload } = useAsync(() => api.profile.getProfile(), []);
  const photoRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("High school student");
  const [photo, setPhoto] = useState<string | null>(null);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (data) {
      setName(data.user.name);
      setEmail(data.user.email);
      setRole(data.user.role);
    }
  }, [data]);

  // Release the object URL when the photo changes or the screen unmounts.
  useEffect(() => {
    if (!photo) return;
    return () => URL.revokeObjectURL(photo);
  }, [photo]);

  if (loading) return <Spinner label="Loading your profile…" />;
  if (error || !data) {
    return (
      <EmptyState title="We could not load your profile" message={error ?? undefined}>
        <Button onClick={reload}>Try again</Button>
      </EmptyState>
    );
  }

  async function save() {
    setFormError(null);
    try {
      await api.profile.updateProfile({ name, email, role });
      notify("Profile updated.", "success");
    } catch (err) {
      setFormError(
        err instanceof ApiError ? err.message : "We could not save your profile. Try again.",
      );
    }
  }

  return (
    <>
      <div className="page-head">
        <h1 className="page-title">Your profile</h1>
      </div>

      <div className="profile-grid">
        <Card className="stack">
          <div className="row">
            {photo ? (
              <img className="fox fox--md" src={photo} alt="Your profile photo" />
            ) : (
              <FoxPlaceholder size="md" label="Photo" />
            )}
            <Button onClick={() => photoRef.current?.click()}>Change photo</Button>
            <input
              ref={photoRef}
              type="file"
              accept="image/*"
              className="visually-hidden"
              aria-label="Choose a profile photo"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) setPhoto(URL.createObjectURL(f));
                e.target.value = "";
              }}
            />
          </div>
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Select
            label="I am a…"
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            options={ROLE_OPTIONS}
          />
          {formError && <p className="field__error">{formError}</p>}
          <Button variant="primary" onClick={save}>
            Save changes
          </Button>
        </Card>

        <div className="stack">
          <div className="stat-grid">
            <Card className="stat">
              <span className="stat__value">{data.stats.dayStreak}</span>
              <span className="stat__label">Day streak</span>
            </Card>
            <Card className="stat">
              <span className="stat__value">{data.stats.essaysWritten}</span>
              <span className="stat__label">Essays written</span>
            </Card>
            <Card className="stat">
              <span className="stat__value">{data.stats.methodsTried}</span>
              <span className="stat__label">Methods tried</span>
            </Card>
          </div>
          <Card>
            <h2 className="card__heading">Milestones</h2>
            <div className="milestone-grid">
              {data.milestones.map((m) => (
                <span
                  className={`milestone${m.earned ? "" : " milestone--locked"}`}
                  key={m.id}
                >
                  <span aria-hidden="true">{m.earned ? "★" : "☆"}</span>
                  <span>
                    {m.label}
                    {!m.earned && <span className="visually-hidden"> (locked)</span>}
                  </span>
                </span>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <Card>
        <h2 className="card__heading">Account</h2>
        <div className="account-actions">
          <Button onClick={() => setPasswordOpen(true)}>Change password</Button>
          <Button
            onClick={async () => {
              await api.profile.downloadMyData();
              notify("We will email your data export shortly.", "success");
            }}
          >
            Download my data
          </Button>
          <Button
            onClick={async () => {
              await logout();
              navigate("/");
            }}
          >
            Log out
          </Button>
          <Button variant="danger" onClick={() => setDeleteOpen(true)}>
            Delete account
          </Button>
        </div>
      </Card>

      <Modal open={passwordOpen} onClose={() => setPasswordOpen(false)} title="Change password">
        <div className="stack">
          <Input
            label="Current password"
            type="password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
          />
          <Input
            label="New password"
            type="password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            help="At least 8 characters."
          />
          <div className="modal__actions">
            <Button onClick={() => setPasswordOpen(false)}>Cancel</Button>
            <Button
              variant="primary"
              onClick={async () => {
                try {
                  await api.profile.changePassword(current, next);
                  setPasswordOpen(false);
                  setCurrent("");
                  setNext("");
                  notify("Password updated.", "success");
                } catch {
                  notify("Your new password needs at least 8 characters.", "error");
                }
              }}
            >
              Save password
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete account"
        message="This erases your materials, drafts and progress. This cannot be undone."
        confirmLabel="Delete account"
        danger
        onConfirm={async () => {
          setDeleteOpen(false);
          await api.auth.deleteAccount();
          await logout();
          navigate("/");
        }}
      />
    </>
  );
}
