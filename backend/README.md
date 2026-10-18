# Redraft backend

Django 6 + Django REST Framework API for Redraft. Implements the endpoint contract
documented in the root `README.md` so the frontend can run against real data by
setting `VITE_API_MODE=real`.

- Database: SQLite by default (`backend/db.sqlite3`); set `DATABASE_URL` to a Postgres
  URL to switch engines — no code change (no Postgres-only features are used).
- Auth: DRF token, one active token per user, 7-day TTL.
- Wire format: camelCase JSON, string IDs (`djangorestframework-camel-case`).
- AI: provider-agnostic (`ai/`); works fully offline when no provider is configured.

Deployment (single EC2 instance, Nginx + Gunicorn + SQLite): see `../deploy/README.md`.

## Setup

```powershell
cd backend
python -m venv .venv
.venv\Scripts\python.exe -m pip install -r requirements.txt
Copy-Item .env.example .env         # then set DEBUG=True for local dev (or set a SECRET_KEY)
.venv\Scripts\python.exe manage.py migrate
.venv\Scripts\python.exe manage.py seed_demo   # optional demo account
.venv\Scripts\python.exe manage.py runserver   # http://localhost:8000
```

`DEBUG` defaults to **off** and the server refuses to start with DEBUG off unless a
real `SECRET_KEY` is set. For local development set `DEBUG=True` in `.env` (a dev-only
secret is then used); production must set `DEBUG=False` and a generated `SECRET_KEY`.

Versions in `requirements.txt` are pinned and were verified together on Python 3.14.0
(Windows).

### Demo account

`seed_demo` creates `sam.rivera@university.edu` / `DemoPass123` with sample materials,
questions, essays, feedback and progress — matching the frontend's mock data.

### Tests

```powershell
.venv\Scripts\python.exe manage.py test
```

The suite (97 tests) uses a mocked AI client, so it never makes network calls. The
runner injects a throwaway `DEBUG`/`SECRET_KEY` so tests need no `.env`.

## Configuration

All settings are env-driven (see `.env.example`). Key variables:

| Variable | Default | Notes |
|---|---|---|
| `DEBUG` | `False` | Set `True` only for local dev |
| `SECRET_KEY` | — | **Required** (and not the dev placeholder) when `DEBUG=False` |
| `DATABASE_URL` | `sqlite:///db.sqlite3` | e.g. `postgres://user:pass@host:5432/foxtutor` |
| `ALLOWED_HOSTS` | `localhost,127.0.0.1` | Comma-separated |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:5173` | The frontend origin |
| `TOKEN_TTL_DAYS` | `7` | Access-token lifetime |
| `THROTTLE_LOGIN` / `THROTTLE_SIGNUP` / `THROTTLE_AI` | `10/min` / `10/hour` / `30/day` | Per-scope rate limits |
| `AI_PROVIDER` | `none` | `none` \| `anthropic` \| `openai_compatible` |
| `AI_MODEL` / `AI_API_KEY` / `AI_BASE_URL` | — | Provider credentials |
| `AI_TIMEOUT` / `AI_MAX_RETRIES` | `30` / `2` | HTTP behaviour |

### AI providers

`ai/provider.py` exposes two functions used by the views:
`generate_questions(material_text, method, existing_questions)` and
`evaluate_essay(essay_text, method, question_text)`.

- `none` (default) or a missing key: sample material and the seeded demo still work;
  the AI endpoints return a friendly, retryable `503`.
- `anthropic`: set `AI_PROVIDER=anthropic`, `AI_MODEL`, `AI_API_KEY`.
- `openai_compatible`: for Groq/OpenRouter etc. Also set `AI_BASE_URL`
  (e.g. `https://api.groq.com/openai/v1`).

Essay text and API keys are never logged.

## Endpoints

Grouped by app (`accounts`, `materials`, `questions`, `essays`, `feedback`, `progress`);
the full method/path/response table is in the root `README.md`.

## Database files (SQLite)

- Reset: delete `backend/db.sqlite3*` then `migrate` (and `seed_demo` if wanted).
- Backup: copy `backend/db.sqlite3` while the server is stopped (WAL is enabled).

Uploaded files live under `backend/media/private/` and are only read by the server,
never served directly.

## Security notes

- Tokens expire after `TOKEN_TTL_DAYS`; logout and password change delete tokens
  (password change issues a fresh one).
- Scoped rate limits on login, signup and AI endpoints.
- Content-Security-Policy, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
  and a same-origin referrer policy are set on every response.
- Uploads are validated by extension **and** magic bytes and capped at 10 MB.
- CORS allows only the configured origins.
