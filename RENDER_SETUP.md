# Render API setup (step-by-step)

Use **Web Service** (manual). Blueprint often confuses first-time setup.

Your Neon database is **already migrated and seeded** — Render only needs to run the API.

---

## Step 1 — Create account

1. Go to [render.com](https://render.com) and sign up (GitHub login is easiest).
2. Verify your email if Render asks.

---

## Step 2 — New Web Service (not Blueprint)

1. Dashboard → **New +** → **Web Service**
2. **Connect a repository** → GitHub → authorize → select **`sushantkandel/guru-crm`**
3. If the repo is missing, click **Configure account** and grant access to `guru-crm`.

---

## Step 3 — Service settings

Fill in exactly:

| Field | Value |
|-------|--------|
| **Name** | `guru-crm-api` |
| **Region** | Oregon (US West) or closest to you |
| **Branch** | `main` |
| **Root Directory** | `crm-app/backend` |
| **Runtime** | `Node` |
| **Build Command** | `npm install && npm run db:migrate:deploy` |
| **Start Command** | `npm start` |
| **Instance type** | **Free** |

---

## Step 4 — Environment variables

Click **Advanced** → **Add Environment Variable**:

| Key | Value |
|-----|--------|
| `DATABASE_URL` | Your Neon string (`postgresql://...?sslmode=require`) |
| `JWT_SECRET` | Any long random string (e.g. 32+ chars) |
| `FRONTEND_URL` | `https://sushantkandel.github.io/guru-crm` |
| `NODE_ENV` | `production` |
| `NOMINATIM_USER_AGENT` | `GuruCRM/1.0 (admin@crm.com)` |

### Password reset email — required for forgot-password

**Recommended: [Brevo](https://www.brevo.com)** HTTP API (Render free tier blocks SMTP). Full steps: **[BREVO_SETUP.md](BREVO_SETUP.md)**

| Key | Value |
|-----|--------|
| `BREVO_API_KEY` | `xkeysib-...` from Brevo → SMTP & API → **API keys** |
| `BREVO_FROM` | `Guru CRM <your-verified@gmail.com>` |

Do **not** use SMTP on Render free tier (connection timeout).

After adding vars, **Manual Deploy** the service. Check: `/api/health` → `"emailProvider":"brevo"`.

Do **not** commit `DATABASE_URL` or `SMTP_PASS` to GitHub — paste only in Render.

---

## Step 5 — Deploy

1. Click **Create Web Service**
2. Wait for the build log (5–10 min first time)
3. When status is **Live**, open:  
   `https://guru-crm-api.onrender.com/api/health`  
   You should see: `{"status":"ok"}`

---

## If build fails

### `prisma: command not found` or migrate errors

- Ensure **Root Directory** is `crm-app/backend` (not empty, not repo root).
- Build command must be: `npm install && npm run db:migrate:deploy`

### `Can't reach database` / connection timeout

- Neon connection string must end with `?sslmode=require`
- In Neon dashboard → **Project settings** → allow connections (default allows all).

### `Migration failed` / tables already exist

- Normal if you already ran migrate from your Mac. Change build to:  
  `npm install && npm run db:migrate:deploy || true`  
  Or use: `npm install` only (DB already set up).

### Build timeout (large repo)

- Root Directory **must** be `crm-app/backend` so Render does not upload the whole monorepo unnecessarily.

### Free tier suspended

- Render requires a **verified card** on some accounts even for free tier (not charged if you stay on Free).

---

## Step 6 — Connect frontend

1. GitHub repo → **Settings → Secrets and variables → Actions**
2. New secret: `VITE_API_URL` = `https://guru-crm-api.onrender.com` (your Render URL)
3. **Settings → Pages → Source: GitHub Actions**
4. Run workflow **Deploy frontend (GitHub Pages)** from the Actions tab

Site: **https://sushantkandel.github.io/guru-crm/**

Login: `admin@crm.com` / `admin123`

---

## Skip Render?

Run API on your Mac temporarily with [ngrok](https://ngrok.com) or use **Railway** / **Fly.io** with the same env vars and `crm-app/backend` as root.
