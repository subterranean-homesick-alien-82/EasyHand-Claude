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
| POST | `/auth/register` | | Create account → `{access_token, user}` |
| POST | `/auth/login` | | Log in → `{access_token, user}` |
| GET | `/auth/me` | ✓ | Current user (includes email) |
| GET | `/users/{id}` | | Public profile |
| PUT | `/users/profile` | ✓ | Update name, neighborhood, bio, skills |
| GET | `/posts` | | Feed. Filters: `category`, `kind`, `status`, `neighborhood`, `author_id`, `q`, `limit`, `skip` |
| POST | `/posts` | ✓ | Create listing |
| GET | `/posts/{id}` | | Listing detail |
| PATCH | `/posts/{id}/status` | ✓ author | `active` / `claimed` / `completed` |
| DELETE | `/posts/{id}` | ✓ author | Delete listing |
| POST | `/messages` | ✓ | Send `{recipient_id, content, post_id?}` |
| GET | `/messages` | ✓ | Inbox: latest message per conversation |
| GET | `/messages/{user_id}` | ✓ | Thread with a user, oldest first (optional `post_id`) |
| POST | `/uploads/signature` | ✓ | Cloudinary upload signature (503 if not configured) |
| GET | `/health` | | Health check |

### Data model

- **users** — `email` (unique, lowercased), `hashed_password`, `name`, `neighborhood`, `bio`, `skills[]`, `created_at`
- **posts** — `author_id`, `kind` (`request`/`offer`), `title`, `description`, `category`
  (`tech`/`cleaning`/`lawncare`/`other`), `compensation`, `neighborhood`, `image_url?`,
  `status` (`active`/`claimed`/`completed`), `created_at`
- **messages** — `post_id?`, `sender_id`, `recipient_id`, `content`, `timestamp`

Indexes are created on startup (`app/db.py`).

## App structure

```
frontend/src/
  app/
    _layout.tsx            auth gate (Stack.Protected) + root stack
    (auth)/welcome.tsx     Signed-out landing: "How it works" in three steps
    (auth)/login.tsx, register.tsx
    (tabs)/index.tsx       Home feed: search, category pills, needs/offers toggle
    (tabs)/post.tsx        "Ask or Offer" form (with optional photo)
    (tabs)/messages.tsx    Inbox
    (tabs)/profile.tsx     My profile, skills editor, my listings
    posts/[id].tsx         Listing detail; message author or manage your own listing
    chat/[userId].tsx      Direct chat (polls every 4s), optionally tied to a listing
    users/[id].tsx         Public neighbor profile
    help.tsx               Help & Safety: safety tips and FAQ (visible signed in or out)
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

## Testing

```bash
cd backend && pytest -q                            # API tests incl. the end-to-end community loop
cd frontend && npm run typecheck && npm run build:web
```

Browser test of the full loop (register → post a lawncare listing → second user edits profile,
filters the feed, messages the author → author replies from the inbox):

```bash
# terminal 1: MONGO_URL=mongomock:// uvicorn app.main:app --port 8000   (in backend/)
# terminal 2: npm run build:web && npx serve -s dist -l 8081           (in frontend/)
cd e2e && npm install && npx playwright install chromium
SHOTS=./shots npm test
```

CI (`.github/workflows/ci.yml`) runs the backend tests, the frontend typecheck, and the web build.

## Deployment

**Backend → Render.** Create a Blueprint from this repo; `render.yaml` defines the service.
Set `MONGO_URL` (Atlas connection string), `CORS_ORIGINS` (your Vercel URL), and optionally the
Cloudinary variables. `SECRET_KEY` is generated automatically. For Railway, use the same start command:
`uvicorn app.main:app --host 0.0.0.0 --port $PORT` with root directory `backend`.

**Frontend → Vercel.** Import the repo with root directory `frontend` and set
`EXPO_PUBLIC_API_URL` to the Render URL. `vercel.json` builds the static web export and rewrites
all routes to the SPA.

**Photos (optional).** Set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
on the backend. The app requests a signed upload from `/uploads/signature` and uploads directly to
Cloudinary, so the secret never reaches the client. Without these, posting a listing with a photo
shows an "Image uploads are not configured" error; text-only listings work normally.

## Not yet built

- Real-time chat (currently 4-second polling while a chat is open) and push notifications
- Unread counts, reporting/blocking, ratings/reviews
- Password reset and email verification
- Rate limiting on auth endpoints
