# EasyHand

A neighborhood micro-gig and skills marketplace — launching first in Memphis, TN. Neighbors post
"I need help with X" or "I can help with Y" listings across **Tech Support**, **Cleaning**,
**Lawncare**, and **Odd Jobs**, then coordinate over direct messages.

| Part | Stack | Hosting |
| --- | --- | --- |
| `backend/` | FastAPI · Motor (async MongoDB) · JWT auth · Argon2 password hashing | Render (`render.yaml`) |
| `frontend/` | Expo SDK 57 · Expo Router · React Native (iOS / Android / web) | Vercel (`frontend/vercel.json`) |
| Database | MongoDB Atlas | |
| Media | Cloudinary signed direct uploads (optional) | |

## Quick start

### Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
cp .env.example .env          # set MONGO_URL and SECRET_KEY
uvicorn app.main:app --reload --port 8000
```

No MongoDB handy? `MONGO_URL=mongomock:// uvicorn app.main:app --reload` runs against an in-memory
database (dev dependency only; data is lost on restart). Interactive API docs: http://localhost:8000/docs

### Frontend

```bash
cd frontend
npm install
cp .env.example .env          # EXPO_PUBLIC_API_URL, defaults to http://localhost:8000
npx expo start                # press w for web, i/a for simulators, or scan the QR code with Expo Go
```

On a physical device, set `EXPO_PUBLIC_API_URL` to your machine's LAN IP (e.g. `http://192.168.1.20:8000`).
The Android emulator reaches the host at `http://10.0.2.2:8000` (used by default on Android).

## API

All authenticated routes take `Authorization: Bearer <token>` (returned by register/login).

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| POST | `/auth/register` | | Create account (requires `accepted_terms: true`) → `{access_token, user}` |
| POST | `/auth/login` | | Log in → `{access_token, user}` |
| GET | `/auth/me` | ✓ | Current user (includes email) |
| POST | `/auth/forgot-password` | | `{email}`: emails a 1-hour reset link (same answer whether or not the account exists) |
| POST | `/auth/reset-password` | | `{token, password}` → `{access_token, user}`; signs out older sessions |
| GET | `/users/{id}` | | Public profile |
| PUT | `/users/profile` | ✓ | Update name, neighborhood, bio, skills, `email_notifications` |
| POST / DELETE | `/users/{id}/block` | ✓ | Block / unblock a person |
| GET | `/posts` | | Feed. Filters: `category`, `kind`, `status`, `neighborhood`, `author_id`, `q`, `limit`, `skip` |
| POST | `/posts` | ✓ | Create listing |
| GET | `/posts/{id}` | | Listing detail |
| PATCH | `/posts/{id}/status` | ✓ author | `active` / `claimed` / `completed` |
| DELETE | `/posts/{id}` | ✓ author | Delete listing |
| POST | `/messages` | ✓ | Send `{recipient_id, content, post_id?}`; emails the recipient (at most once per 30 min per sender) |
| GET | `/messages` | ✓ | Inbox: latest message per conversation |
| GET | `/messages/{user_id}` | ✓ | Thread with a user, oldest first (optional `post_id`) |
| POST | `/reports` | ✓ | Report a listing or person `{target_type, target_id, reason, details?}` |
| GET | `/admin/reports` | admin | Reports to review (`status=open\|resolved`) |
| POST | `/admin/reports/{id}/resolve` | admin | Mark a report handled |
| POST | `/admin/posts/{id}/hidden` | admin | `{hidden}`: hide or show a listing |
| POST | `/admin/users/{id}/banned` | admin | `{banned}`: ban or unban (also hides their listings) |
| POST | `/uploads/signature` | ✓ | Cloudinary upload signature (503 if not configured) |
| GET | `/health` | | Health check |

### Data model

- **users** — `email` (unique, lowercased), `hashed_password`, `name`, `neighborhood`, `bio`, `skills[]`,
  `blocked_ids[]`, `banned?`, `email_notifications`, `password_changed_at?`, `accepted_terms_at`, `created_at`
- **posts** — `author_id`, `kind` (`request`/`offer`), `title`, `description`, `category`
  (`tech`/`cleaning`/`lawncare`/`other`), `compensation`, `neighborhood`, `image_url?`,
  `status` (`active`/`claimed`/`completed`), `hidden?`, `author_banned?`, `created_at`
- **messages** — `post_id?`, `sender_id`, `recipient_id`, `content`, `timestamp`
- **password_resets** — `user_id`, `token_hash` (SHA-256; the raw token is only in the email), `expires_at`, `used`
- **message_notifications** — `sender_id`, `recipient_id`, `sent_at` (throttles new-message emails)
- **reports** — `reporter_id`, `target_type` (`post`/`user`), `target_id`, `reason`, `details`, `status` (`open`/`resolved`), `created_at`

Indexes are created on startup (`app/db.py`).

## App structure

```
frontend/src/
  app/
    _layout.tsx            auth gate (Stack.Protected) + root stack
    (auth)/welcome.tsx     Signed-out landing: "How it works" in three steps
    (auth)/login.tsx, register.tsx, forgot.tsx
    reset-password.tsx     Opened from the reset email; works signed in or out
    (tabs)/index.tsx       Home feed: search, category pills, needs/offers toggle
    (tabs)/post.tsx        "Ask or Offer" form (with optional photo)
    (tabs)/messages.tsx    Inbox
    (tabs)/profile.tsx     My profile, skills editor, my listings
    posts/[id].tsx         Listing detail; message author or manage your own listing
    chat/[userId].tsx      Direct chat (polls every 4s), optionally tied to a listing
    users/[id].tsx         Public neighbor profile
    help.tsx               Help & Safety: safety tips and FAQ (visible signed in or out)
    terms.tsx, privacy.tsx Plain-language Terms of Service and Privacy Policy
    admin.tsx              Moderation queue (only for ADMIN_EMAILS)
  components/              PostCard, CategoryPills, SkillsEditor, UI primitives
  lib/api.ts               Typed API client
  lib/auth.tsx             Auth context; token persisted in AsyncStorage
```

## Design for everyone

Many EasyHand members are older or less comfortable with technology. When changing the UI:

- Body text is at least 17–18px. Anything tappable is at least 56px tall (`TAP_TARGET` in `src/theme.ts`).
- Text colors meet WCAG AA contrast (4.5:1), including tag text on its tinted background.
- Use plain words ("Post it", "Someone is helping"), not jargon ("Submit", "Claimed").
- Don't rely on hidden gestures. Pull-to-refresh also has a visible **Refresh** button.
- Icon-only buttons need an `accessibilityLabel`.

## Email

`app/email.py` sends email through [Resend](https://resend.com) when `RESEND_API_KEY` is set. Without it,
emails are printed in the server log instead. Handy locally, and the browser test reads the reset link from there.
Emails go out for password resets and new messages. Members can turn off message emails in their profile.

## Moderation

Put your moderators' emails in the backend's `ADMIN_EMAILS` (comma-separated). They get a **Moderation**
button on their Profile tab showing reports to review, where they can hide a listing or ban an account.
Login, sign-up and report endpoints are rate-limited per IP (`app/ratelimit.py`, in-memory, so one server instance).

## Testing

```bash
cd backend && pytest -q                            # API tests incl. the end-to-end community loop
cd frontend && npm run typecheck && npm run build:web
```

Browser test of the full loop (register → post a lawncare listing → second user edits profile,
filters the feed, messages the author → author replies from the inbox → the listing is reported
and a moderator hides it → the author resets a forgotten password):

```bash
# terminal 1: MONGO_URL=mongomock:// ADMIN_EMAILS=admin@example.com uvicorn app.main:app --port 8000   (in backend/)
# terminal 2: npm run build:web && npx serve -s dist -l 8081           (in frontend/)
cd e2e && npm install && npx playwright install chromium
SHOTS=./shots EMAIL_LOG=/path/to/api-server.log npm test   # EMAIL_LOG is optional; enables the password-reset steps
```

CI (`.github/workflows/ci.yml`) runs the backend tests, the frontend typecheck, and the web build.

## Deployment

**Follow [`docs/LAUNCH_CHECKLIST.md`](docs/LAUNCH_CHECKLIST.md)**, a step-by-step guide covering MongoDB Atlas,
Resend, Cloudinary, Render (backend, from `render.yaml`) and Vercel (website, from `frontend/vercel.json`),
plus costs and a pre-launch test list.

Once it's live, check it with the read-only smoke test (creates nothing):

```bash
cd e2e && WEB_URL=https://yourdomain.com API_URL=https://your-api.onrender.com npm run smoke
```

To put a few clearly-labelled example listings on an empty board: `python -m scripts.seed_examples team@yourdomain.com`
(from `backend/`, with `MONGO_URL` set).

## Not yet built

Deliberately left out of the Memphis pilot:

- Phone apps in the App Store / Google Play (the same code can build them later with EAS)
- In-app payments (members pay each other directly)
- Text-message alerts, push notifications, unread counts
- Real-time chat (an open chat checks for new messages every 4 seconds)
- Ratings and reviews, background checks, email verification
