# EasyHand launch checklist (Memphis pilot)

A step-by-step guide to putting EasyHand online. Plan on **an afternoon**. Work top to bottom:
later steps use values from earlier ones. Keep a private note (a password manager is best) for
everything marked 📝.

> Websites change their buttons from time to time. If a label below doesn't match exactly, look for
> the closest equivalent. The idea of each step stays the same.

## What it costs

| Service | What it does | Cost |
| --- | --- | --- |
| Domain name (e.g. from Cloudflare, Namecheap or Vercel) | Your web address, and needed to send email to members | ~$10–15 / year |
| MongoDB Atlas (M0) | Database | Free |
| Render (Starter) | Runs the backend API | $7 / month (see note) |
| Vercel (Hobby) | Hosts the website | Free |
| Resend | Sends email | Free up to 3,000 emails / month |
| Cloudinary | Stores listing photos (optional) | Free tier |

**About Render:** the free plan "falls asleep" after 15 minutes without visitors, and the next person
waits about a minute for the page to work. That will look broken to members, especially older ones,
so `render.yaml` asks for the $7 Starter plan. To try things out for free first, change `plan: starter`
to `plan: free` in `render.yaml`.

**About Vercel:** the free Hobby plan is meant for personal, non-commercial projects. It's fine
for a free pilot. Move to Pro ($20/month) once EasyHand makes money.

---

## 0. Decide a few things first

- [ ] **Domain name** 📝, e.g. `easyhandmemphis.com`. Buy it now. Email to members won't work without one.
- [ ] **Support email** 📝 that members can write to (it's shown on the Help & Safety page), e.g. `help@yourdomain.com`,
      or a Gmail address you check.
- [ ] **Moderator emails** 📝: the addresses you and Kyle will sign up with. These people get the Moderation screen.

## 1. Database: MongoDB Atlas

1. Sign up at **mongodb.com/atlas** and create a **free (M0)** cluster. Pick a US region close to
   Memphis (e.g. AWS `us-east-1`, N. Virginia).
2. **Database Access** → add a database user with a long random password 📝.
3. **Network Access** → *Add IP Address* → **Allow access from anywhere** (`0.0.0.0/0`).
   Render doesn't have a fixed address, so this is needed. The strong password is what protects the database.
4. **Connect** → *Drivers* → copy the connection string 📝. It looks like
   `mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority`.
   Replace `<password>` with the real password. This is your **`MONGO_URL`**.

## 2. Email: Resend

1. Sign up at **resend.com**.
2. **Domains** → *Add domain* → enter your domain. Resend shows a few DNS records.
   Add them where you bought the domain (its "DNS" settings page), then click *Verify* in Resend.
   It can take from minutes to a few hours.
3. **API Keys** → create a key with *Sending access* 📝. This is your **`RESEND_API_KEY`**.
4. Decide the sender 📝, e.g. `EasyHand <hello@yourdomain.com>`. This is your **`EMAIL_FROM`**.

## 3. Photos: Cloudinary (optional, can do later)

1. Sign up at **cloudinary.com**.
2. On the dashboard, copy the **Cloud name**, **API Key** and **API Secret** 📝.

Without these, everything works except adding a photo to a listing.

## 4. Backend: Render

1. Sign up at **render.com** with your GitHub account.
2. **New** → **Blueprint** → pick the `EasyHand-Claude` repository. Render reads `render.yaml`.
3. Fill in the values it asks for:

   | Setting | Value |
   | --- | --- |
   | `MONGO_URL` | from step 1 |
   | `ADMIN_EMAILS` | your and Kyle's emails, comma-separated |
   | `APP_URL` | `https://yourdomain.com` (your website address, no slash at the end) |
   | `CORS_ORIGINS` | the same as `APP_URL` for now (step 6 adds the Vercel address) |
   | `RESEND_API_KEY`, `EMAIL_FROM` | from step 2 |
   | `CLOUDINARY_*` | from step 3, or leave empty |

   `SECRET_KEY` is created automatically. Don't share it.
4. Create it and wait for the deploy to finish (a few minutes). Copy the service address 📝,
   e.g. `https://easyhand-api.onrender.com`. This is your **API URL**.
5. Check it: open `<API URL>/health` in your browser. You should see `{"status":"ok"}`.

## 5. Website: Vercel

1. Sign up at **vercel.com** with your GitHub account.
2. **Add New** → **Project** → import `EasyHand-Claude`.
3. Set **Root Directory** to `frontend`. Framework preset: *Other*. The build settings come from `frontend/vercel.json`.
4. **Environment Variables:**

   | Name | Value |
   | --- | --- |
   | `EXPO_PUBLIC_API_URL` | your API URL from step 4 |
   | `EXPO_PUBLIC_SUPPORT_EMAIL` | your support email |

5. **Deploy.** Copy the address Vercel gives you 📝, e.g. `https://easyhand-claude.vercel.app`.

> These two values are baked into the website when it's built. If you change them later,
> redeploy in Vercel (Deployments → ⋯ → *Redeploy*).

## 6. Connect your domain

1. In Vercel: **Project → Settings → Domains** → add your domain and follow its DNS instructions.
2. Back in Render, set **`CORS_ORIGINS`** to both website addresses, comma-separated:
   `https://yourdomain.com,https://easyhand-claude.vercel.app`. Render redeploys by itself.

## 7. Check that it all works

On your computer, from the `e2e/` folder (one time: `npm install && npx playwright install chromium`):

```bash
WEB_URL=https://yourdomain.com API_URL=https://easyhand-api.onrender.com npm run smoke
```

Every line should say **PASS**. This test only looks; it doesn't create anything. If a line fails:

- **API is up** fails: check the Render deploy log (Render → your service → *Logs*).
- **CORS** fails: `CORS_ORIGINS` on Render doesn't exactly match the website address (check `https://`
  and no trailing `/`), or `EXPO_PUBLIC_API_URL` on Vercel is wrong (redeploy after fixing).

Then try it by hand **on a real phone**, ideally with someone who isn't technical:

- [ ] Sign up with your moderator email. You should see **Moderation** on your Profile tab.
- [ ] Post a listing (with a photo if Cloudinary is set up).
- [ ] From a second account (e.g. Kyle's), message about that listing. **The first account should get an email.**
- [ ] Log out, tap *Forgot your password?*, and check the reset email arrives and works.
      If it's in spam, mark it "not spam".
- [ ] Report a listing from one account, then hide it from Moderation on the other.
- [ ] Open the Help & Safety page and check the support email is right.

## 8. Put a few examples on the board (optional)

So the first visitors don't see an empty board, add four listings clearly titled "Example: …" from an
"EasyHand Team" account. On your computer, in the `backend/` folder, with `MONGO_URL` set to your Atlas
connection string:

```bash
MONGO_URL="mongodb+srv://..." python -m scripts.seed_examples team@yourdomain.com
```

When real listings arrive, log in as the EasyHand Team account (use *Forgot your password?* to set a
password) and tap **Delete listing** on each example.

## 9. Before you invite people

- [ ] Have a lawyer read the Terms of Service and Privacy Policy (`frontend/src/app/terms.tsx` and
      `privacy.tsx`). They are a plain-language starting point, not legal advice.
- [ ] Decide who checks the Moderation screen, and how often (at least daily during the pilot).
- [ ] Set a monthly spending alert in Render (and anywhere else you add a card).
- [ ] Atlas: the free tier has no automatic backups you can restore. Once real people are using it,
      consider moving to a paid tier with backups, or at least exporting data regularly.

## Launch week

- Check **Moderation** every day, and read the Render logs for errors.
- Ask your first members what confused them. Small wording fixes help older users most.
- Keep a list of requests (payments in the app, text alerts, ratings). These are the next features.
