# Deploy Guru CRM (GitHub Pages + Render + Neon)

Public URLs after setup:

| Service | URL |
|---------|-----|
| Web app | `https://YOUR_GITHUB_USER.github.io/guru-crm/` |
| API | `https://guru-crm-api.onrender.com` (or your Render name) |
| Database | Neon (private — only Render connects) |

Works from **any network** (home, office, mobile data). No Mac or LAN IP required.

---

## 1. Push code to GitHub

```bash
cd "/path/to/Cursor Project"
git init
git add .
git commit -m "Guru CRM: web, mobile, deploy config"
git branch -M main
gh repo create guru-crm --public --source=. --remote=origin --push
```

Use a **public** repo for free GitHub Pages (or enable Pages on a private repo if you have GitHub Pro).

---

## 2. Neon PostgreSQL (free)

1. Sign up at [neon.tech](https://neon.tech)
2. Create a project → copy the **connection string** (`postgresql://...?sslmode=require`)
3. Keep it for Render (step 3)

---

## 3. Render API (free)

**Use the manual guide:** **[RENDER_SETUP.md](RENDER_SETUP.md)** (recommended — easier than Blueprint).

Short version:

1. [render.com](https://render.com) → **New + → Web Service** (not Blueprint)
2. Repo `sushantkandel/guru-crm`, **Root Directory** `crm-app/backend`
3. Build: `npm install && npm run db:migrate:deploy` · Start: `npm start` · Plan: **Free**
4. Env: `DATABASE_URL` (Neon), `JWT_SECRET`, `FRONTEND_URL=https://sushantkandel.github.io/guru-crm`, plus SMTP vars (see below)
5. Test: `https://guru-crm-api.onrender.com/api/health` → `{"status":"ok"}`

**Demo login** (created by seed): `admin@crm.com` / `admin123`

> Free Render services sleep after ~15 min idle; first request may take 30–60 seconds.

---

## 4. GitHub Pages (frontend)

1. Repo **Settings → Pages → Build and deployment → Source: GitHub Actions**
2. Repo **Settings → Secrets and variables → Actions**:

| Secret | Example |
|--------|---------|
| `VITE_API_URL` | `https://guru-crm-api.onrender.com` |
| `VITE_GOOGLE_CLIENT_ID` | Same as backend `GOOGLE_CLIENT_ID` (OAuth Web client ID) |

Optional variable (`Settings → Variables`):

| Variable | Default |
|----------|---------|
| `VITE_BASE_PATH` | `/guru-crm/` (must match repo name) |

3. Push to `main` or run workflow **Deploy frontend** manually
4. Site: `https://YOUR_USER.github.io/guru-crm/`

5. Update Render `FRONTEND_URL` to `https://YOUR_USER.github.io/guru-crm` (include repo path) and redeploy API (for password-reset links / CORS).

### Password reset email (Brevo on Render)

Forgot-password uses **Brevo SMTP** on the API service. See **[BREVO_SETUP.md](BREVO_SETUP.md)** for full steps.

| Key | Value |
|-----|--------|
| `SMTP_HOST` | `smtp-relay.brevo.com` |
| `SMTP_PORT` | `587` |
| `SMTP_USER` | Brevo account email |
| `SMTP_PASS` | Brevo SMTP key |
| `SMTP_FROM` | `Guru CRM <verified-sender@gmail.com>` |
| `FRONTEND_URL` | `https://sushantkandel.github.io/guru-crm` |

Remove `RESEND_API_KEY` on Render if switching from Resend. **Manual Deploy** after saving.

**Without email:** `npm run reset-password -- admin@crm.com NewPass123`

### Google sign-in (production)

1. [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services → Credentials** → your **OAuth 2.0 Web client**
2. **Authorized JavaScript origins** — add:
   - `https://sushantkandel.github.io`
   - `http://localhost:5173` (local dev)
3. **Render** → service **Environment** → set `GOOGLE_CLIENT_ID` to the same Web client ID
4. **GitHub** → repo **Secrets** → `VITE_GOOGLE_CLIENT_ID` = same client ID
5. Re-run **Deploy frontend (GitHub Pages)** workflow so the ID is baked into the build

---

## 5. Mobile app (optional)

In `crm-mobile/local.properties`:

```properties
api.base.url=https://guru-crm-api.onrender.com
```

Rebuild: `./gradlew :androidApp:assembleDebug`

---

## Local development

**Backend** — use Neon URL or a local Postgres in `crm-app/backend/.env`:

```env
DATABASE_URL="postgresql://..."
JWT_SECRET="dev-secret"
FRONTEND_URL="http://localhost:5173"
```

```bash
cd crm-app/backend
npm install
npm run db:migrate:deploy
npm run db:seed
npm run dev
```

**Frontend:**

```bash
cd crm-app/frontend
npm install
npm run dev
```

Open http://localhost:5173 — Vite proxies `/api` to port 5001.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Login fails on Pages | Check `VITE_API_URL` secret; rebuild frontend workflow |
| CORS error | Set `FRONTEND_URL` on Render; redeploy API |
| API 503 / slow | Render cold start — wait and retry |
| 404 on refresh | Ensure workflow copies `index.html` → `404.html` |
| Wrong asset paths | `VITE_BASE_PATH` must be `/REPO_NAME/` |
