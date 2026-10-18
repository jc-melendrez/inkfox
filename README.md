# FoxTutor — Phase 1 (frontend on mock data)

AI essay-tutoring platform. Users upload learning material, answer AI-generated
questions using a structure (PEEL / TEEL), get friendly specific feedback, revise,
and track progress toward mastery.

**Phase 1 scope:** all 12 screens, navigable end-to-end against a typed mock API.
No backend yet. Every choice is made so Phase 2 (Django REST + PostgreSQL) is a
drop-in replacement of the `src/api/` layer.

## Stack

- React 18 + TypeScript (strict) + Vite
- React Router v6
- No UI, CSS, state or chart libraries (kept deliberately lean; the later redesign
  is a token swap plus light component restyle)
- Design tokens in `src/styles/tokens.css` (one accent, neutral grays)

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build
npm run typecheck  # tsc --noEmit
npm run lint       # eslint .
npm run selfcheck  # assert-based check of the api/ logic (Node + esbuild)
```

First run starts logged out. Go through **Sign up → onboarding → app**, or **Log in**
with any email/password (mock auth accepts anything). State is saved to
`localStorage` (`foxtutor.db.v1`), so drafts, uploads and resume survive a reload.
Profile → Delete account resets it.

### Dev-only state switcher

A small "Dev state" pill (bottom-left, dev builds only) forces every API call to
**Loading / Empty / Error** so those states are easy to review. Set it back to
**Auto** when done.

## Folder structure

```
src/
  api/            typed mock API — the ONLY place mock data lives
    types.ts      User, Material, Question, Essay, Feedback, Progress, Settings…
    client.ts     delay + loading/empty/error simulation (Phase 2: real fetch)
    mockData.ts   seeded, localStorage-persisted store (imported only by api/*)
    auth|materials|questions|essays|feedback|progress|sessions|settings|profile.ts
    index.ts      namespaced barrel (api.materials.listMaterials(), …)
  components/     reusable set: Button, Input, Select, Textarea, Checkbox,
                  RadioCard, Card, ProgressBar, Tag, Modal, Toast, Sidebar,
                  FoxPlaceholder, DropZone, EmptyState, Spinner, ScoreTrendChart,
                  ConfirmDialog, DevStateSwitcher
  context/        AuthContext, SettingsContext, ToastContext
  hooks/          useAsync, useAutosave, useTimer
  layouts/        AppShell (sidebar), AuthLayout, OnboardingLayout
  lib/            methods.ts (domain metadata), format.ts (dates/words)
  screens/        one file per screen (12)
  styles/         tokens.css, base.css, components.css, layouts.css, screens.css
  routes.tsx      routes + auth/onboarding guards
  App.tsx         providers + router
```

**Rule:** components never import `mockData.ts`; they only call `api/` functions.

## Screens / routes

| Route | Screen |
|---|---|
| `/` | Landing |
| `/signup`, `/login` | Sign up / Log in |
| `/onboarding`, `/onboarding/method`, `/onboarding/upload` | Onboarding (3 steps) |
| `/home` | Home dashboard |
| `/library` | Material library + upload |
| `/practice` → `/practice/:materialId[/q/:questionId]` | Question + essay composer |
| `/practice/:materialId/q/:questionId/feedback` | Feedback + revision |
| `/session/:materialId/complete` | Session complete |
| `/progress` | Progress |
| `/settings` | Settings |
| `/profile` | Profile |

## API contract for the Django backend

Each `src/api/<module>.ts` function maps to one endpoint. Request/response bodies
are the TypeScript types in `src/api/types.ts`. Replace the body of `respond()`
in `client.ts` with `fetch` and keep the signatures.

| Function | Method + path | Request | Response |
|---|---|---|---|
| `auth.getCurrentUser` | `GET /api/auth/me` | — | `User \| null` |
| `auth.login` | `POST /api/auth/login` | `{email,password}` | `User` |
| `auth.signup` | `POST /api/auth/signup` | `{name,email,password,role}` | `User` |
| `auth.loginWithGoogle` | `POST /api/auth/google` | — | `User` |
| `auth.logout` | `POST /api/auth/logout` | — | `204` |
| `auth.completeOnboarding` | `POST /api/onboarding/complete` | `{role?,method?}` | `User` |
| `auth.requestPasswordReset` | `POST /api/auth/password/reset` | `{email}` | `204` |
| `auth.deleteAccount` | `DELETE /api/account` | — | `204` |
| `materials.listMaterials` | `GET /api/materials` | — | `Material[]` |
| `materials.getMaterial` | `GET /api/materials/:id` | — | `Material` |
| `materials.uploadMaterial` | `POST /api/materials` | `multipart/form-data` (file) | `Material` (status `processing`) |
| `materials.advanceProcessing` | `GET /api/materials/:id/processing` | — | `Material` |
| `materials.cancelProcessing` | `POST /api/materials/:id/cancel` | — | `204` |
| `materials.createSampleMaterial` | `POST /api/materials/sample` | — | `Material` |
| `materials.deleteMaterial` | `DELETE /api/materials/:id` | — | `204` |
| `questions.listQuestions` | `GET /api/materials/:id/questions` | — | `Question[]` |
| `questions.getQuestion` | `GET /api/questions/:id` | — | `Question` |
| `questions.nextUnanswered` | `GET /api/materials/:id/questions/next` | — | `Question \| null` |
| `questions.generateQuestions` | `POST /api/materials/:id/questions` | — | `Question[]` |
| `essays.getDraft` | `GET /api/questions/:id/draft` | — | `EssayDraft \| null` |
| `essays.saveDraft` | `PUT /api/questions/:id/draft` | `{content}` | `EssayDraft` |
| `essays.submitEssay` | `POST /api/questions/:id/essays` | `{content}` | `Feedback` |
| `feedback.getFeedback` | `GET /api/questions/:id/feedback` | — | `Feedback \| null` |
| `feedback.listFeedback` | `GET /api/questions/:id/feedback/history` | — | `Feedback[]` |
| `progress.getProgress` | `GET /api/progress` | — | `Progress` |
| `progress.getResume` | `GET /api/progress/resume` | — | `ResumeInfo \| null` |
| `sessions.completeSession` | `POST /api/materials/:id/session/complete` | — | `SessionSummary` |
| `settings.getSettings` | `GET /api/settings` | — | `Settings` |
| `settings.updateSettings` | `PUT /api/settings` | `Partial<Settings>` | `Settings` |
| `profile.getProfile` | `GET /api/profile` | — | `Profile` |
| `profile.updateProfile` | `PUT /api/profile` | `{name?,role?}` | `User` |
| `profile.changePassword` | `POST /api/profile/password` | `{current,new}` | `204` |
| `profile.downloadMyData` | `GET /api/profile/export` | — | file |

## Accessibility notes (WCAG AA)

- Real `<button>`/`<a>`/`<label>`; native `<dialog>` (focus trap + Esc), native
  `<details>` for the source passage, native `<input type="file">`.
- Every control has a screen-reader label; errors/help are wired via `aria-describedby`.
- Visible focus ring token; status is shown with icon **and** text (✓ / ⚠), not colour alone.
- Text size is adjustable from Settings (`data-text-size` on `<html>`; everything is rem-based).
- Skip link, `aria-current` on the active nav item, `role="progressbar"` with values.

## Wireframe ambiguities (guessed — please confirm)

1. **"Home"** nav item had no wireframe; built from the supplied `12 Home dashboard@2x.png`.
2. **"How it works" / "Methods"** landing nav links: "How it works" scrolls to the
   3-step section; "Methods" opens a Modal (no dedicated screens existed).
3. **"I am a…"** options: High school student / University student / Lifelong learner / Teacher.
4. **Milestone badges**: a small text-labelled set (First essay, 3-day streak, …).
5. **Score-trend chart**: hand-rolled accessible SVG (last 8 essays, 0–100).
6. **Session complete** trigger: reached via "Next question" after the last question,
   or by finishing a material; the summary is computed on arrival.
7. **Timer**: off by default, optional, counts down from the Settings length,
   quietly stops at zero (no colour/sound alarm).
8. **Settings** is shown inside the app shell (sidebar) for standard navigation,
   though the wireframe drew it as a standalone card.
9. **Library action buttons**: `Start` (not started), `Practice` + `Resume` (in progress),
   `New questions` + `Review` (complete).
10. **Review / Practice** both open the composer; for a completed material the composer
    jumps to the feedback view.
