import { Link } from "react-router-dom";
import { Tag } from "../components";
import { useAuth } from "../context/AuthContext";
import { METHOD_PARTS, METHODS } from "../lib/methods";

const STEPS = [
  { num: "1. Upload", text: "Drop in your learning material." },
  { num: "2. Write", text: "Answer questions using a method." },
  { num: "3. Revise", text: "Improve with specific feedback." },
];

const METHOD_CARDS = METHODS.map((m) => ({
  key: m.key,
  name: m.name,
  parts: METHOD_PARTS[m.key].map((p) => p.name).join(", "),
  blurb:
    m.key === "PEEL"
      ? "A friendly, four-step structure for your very first essays."
      : "Open each paragraph with a full topic sentence instead of a point.",
  beginner: m.key === "PEEL",
}));

export function Landing() {
  const { user } = useAuth();

  return (
    <div className="site">
      <header className="topbar">
        <div className="topbar__inner">
          <Link to="/" className="brand">
            <span className="wordmark">Redraft</span>
          </Link>
          <nav className="topbar__nav" aria-label="Primary">
            <a href="#how-it-works">How it works</a>
            <a href="#methods">Methods</a>
            {user ? (
              <Link className="btn btn--secondary" to="/home">
                Go to dashboard
              </Link>
            ) : (
              <>
                <Link className="btn btn--secondary" to="/login">
                  Log in
                </Link>
                <Link className="btn btn--secondary" to="/signup">
                  Sign up free
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main id="main" tabIndex={-1}>
        <section className="hero">
          <div className="hero__copy">
            <h1 className="hero__title">Write better essays, one revision at a time.</h1>
            <p className="hero__lead">
              Upload your notes, practice with a proven structure like PEEL, and get
              friendly, specific feedback you can act on.
            </p>
            <div className="hero__actions">
              <Link className="btn btn--primary btn--lg" to={user ? "/library" : "/signup"}>
                Start free
              </Link>
              <a className="btn btn--secondary btn--lg" href="#how-it-works">
                See how it works
              </a>
            </div>
            <p className="muted text-sm">PDF, DOCX and TXT accepted. No card needed.</p>
          </div>
        </section>

        <section className="steps" id="how-it-works" aria-label="How it works">
          {STEPS.map((step) => (
            <div className="step-card" key={step.num}>
              <span className="step-card__num">{step.num}</span>
              <span className="muted">{step.text}</span>
            </div>
          ))}
        </section>

        <section className="methods-section" id="methods" aria-label="Methods">
          <h2 className="section-title">Two structures that work</h2>
          <div className="method-cards">
            {METHOD_CARDS.map((m) => (
              <div className="method-card" key={m.key}>
                <div className="method-card__head">
                  <h3 className="method-card__name">{m.name}</h3>
                  {m.beginner && <Tag tone="accent">Great for beginners</Tag>}
                </div>
                <p className="muted text-sm">{m.parts}</p>
                <p>{m.blurb}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <span>© Redraft</span>
        <nav aria-label="Footer" className="footer-placeholders">
          {["Privacy", "Terms", "Contact"].map((label) => (
            <span key={label} className="footer-placeholder" title="Placeholder link">
              {label}
              <span className="visually-hidden"> (placeholder)</span>
            </span>
          ))}
        </nav>
      </footer>
    </div>
  );
}
