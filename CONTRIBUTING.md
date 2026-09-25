# Working on EasyHand

For anyone joining the project (people or AI assistants). Read `README.md` first for what EasyHand is
and how to run it.

## How the pieces fit

```
Browser / phone ──► frontend/ (Expo Router, React Native + web) ──HTTP+JSON──► backend/ (FastAPI) ──► MongoDB
                                                                                   └──► Resend (email), Cloudinary (photos), Sentry (errors)
```

- The frontend never talks to the database. Every screen goes through the typed client in
  `frontend/src/lib/api.ts`, which calls the FastAPI routes in `backend/app/routers/`.
- Auth is a bearer token (JWT) from `/auth/login` or `/auth/register`, stored on the device by
  `frontend/src/lib/auth.tsx`. Backend routes get the signed-in person through the `CurrentUser`,
  `OptionalUser` or `AdminUser` dependencies in `backend/app/deps.py`.
- API request and response shapes live in `backend/app/models.py`. Keep the matching TypeScript types
  in `api.ts` in sync by hand when you change them.

## Everyday workflow

1. Start from an up-to-date `main` and create a branch: `git checkout -b short-description`.
2. Make the change. Add or update tests alongside it.
3. Run the checks (below). CI runs the same ones on every push.
4. Push and open a pull request into `main`. Describe *what* changed and *how you tested it*.
5. Merge once CI is green and someone has looked at it.

Keep pull requests small and about one thing; they're much easier to review and undo.

## Checks to run before pushing

```bash
cd backend && pytest -q                                   # API tests (in-memory database, no setup)
cd frontend && npm run typecheck && npm run build:web     # types + the website builds
```

For changes to screens or flows, also run the browser test (see README → Testing) and look at the
screenshots at phone width.

## Rules of thumb

**Design for everyone.** Many members are older or new to smartphones (see README → *Design for everyone*):
large text, big buttons (`TAP_TARGET`), plain words, AA contrast, no hidden gestures, labels on
icon-only buttons. If you're unsure, ask someone non-technical to try it.

**Safety and privacy.**
- Never return `hashed_password`, or anyone's email address to other members. Use `PublicUser` for
  other people and `PrivateUser` only for the signed-in person.
- Anything listing posts or people must respect `hidden`, `author_banned`, `banned` and `blocked_ids`
  (see `VISIBLE` in `routers/posts.py`).
- New actions that could be abused (sign-up-like, sending things to other people) get a rate limit
  (`app/ratelimit.py`).
- Secrets (API keys, `SECRET_KEY`, `MONGO_URL`) only ever go in environment variables, never in code
  or commits. `.env` is git-ignored.

**Backend conventions.**
- Routes are `async` and use Motor. Convert ids with `parse_object_id` (bad ids give a clean 404).
- Timestamps are UTC (`utcnow()`); wrap values read back from Mongo in `as_utc()`.
- Error messages in `HTTPException` are shown to members as-is, so write them in plain, friendly English.
- New collections that are queried often get an index in `app/db.py`.
- Email goes through `app/email.py` (`send_email`) from a `BackgroundTasks` task, so a slow email
  service never slows the member down.

**Frontend conventions.**
- Every file in `frontend/src/app/` is a screen (Expo Router). Shared pieces go in `src/components/`,
  logic in `src/lib/`.
- Reuse the building blocks in `src/components/ui.tsx` (`Button`, `Field`, `Checkbox`, `Card`, `Tag`,
  `RefreshButton`…) and colors and sizes from `src/theme.ts` rather than new one-off styles.
- Screens that load data use `useFocusedQuery` (`src/lib/useApi.ts`) so they refresh when revisited.
- Use `npx expo install <package>` (not `npm install`) so versions match the Expo SDK. See
  `frontend/AGENTS.md`.

## Adding a feature: where things go

| You want to… | Touch |
| --- | --- |
| Add an API endpoint | `backend/app/models.py` (shapes), a router in `backend/app/routers/` (register new routers in `app/main.py`), a test in `backend/tests/` |
| Call it from the app | `frontend/src/lib/api.ts` |
| Add a screen | a new file under `frontend/src/app/`; protected screens also get a `Stack.Screen` in `app/_layout.tsx` |
| Add a setting / secret | `backend/app/config.py`, `backend/.env.example`, `render.yaml`, and `docs/LAUNCH_CHECKLIST.md` if it needs setting up |
| Change a word members see | search `frontend/src/` for the text; keep it plain |

## Operations

- **Moderation:** people in `ADMIN_EMAILS` see a Moderation screen on their Profile tab.
- **Logs:** Render → the API service → *Logs*. Crashes also go to Sentry if `SENTRY_DSN` is set.
- **Is it up?** `cd e2e && WEB_URL=… API_URL=… npm run smoke` (read-only).
- **Deploys:** pushing to `main` redeploys both Render and Vercel automatically once they're connected
  (see `docs/LAUNCH_CHECKLIST.md`).
