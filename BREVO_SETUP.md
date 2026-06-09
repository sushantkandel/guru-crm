# Brevo email setup (password reset)

Use [Brevo](https://www.brevo.com) (free ~300 emails/day) to send reset links to **any email**.

> **Render free tier blocks SMTP ports 587/465.** Use the **Brevo HTTP API** (`BREVO_API_KEY`), not SMTP.

---

## 1. Create Brevo account

1. Sign up at [brevo.com](https://www.brevo.com)
2. Confirm your email

---

## 2. Verify sender (your Gmail)

1. Brevo → **Senders, domains and dedicated IPs** → **Senders**
2. **Add a sender** → e.g. `peaceandray@gmail.com`
3. Click the verification link in your inbox

---

## 3. Create API key (not SMTP key)

1. Brevo → **SMTP & API** → **API keys** tab
2. **Generate a new API key** → copy it (starts with `xkeysib-...`)

---

## 4. Render environment variables

Open **Render** → **guru-crm-api** → **Environment**.

**Remove** (if present):

- `RESEND_API_KEY`, `RESEND_FROM`
- `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` (SMTP does not work on Render free tier)

**Add:**

| Key | Value |
|-----|--------|
| `BREVO_API_KEY` | `xkeysib-...` from step 3 |
| `BREVO_FROM` | `Guru CRM <peaceandray@gmail.com>` (verified sender) |
| `FRONTEND_URL` | `https://sushantkandel.github.io/guru-crm` |

**Save** → **Manual Deploy** → **Deploy latest commit**

---

## 5. Verify

1. `https://guru-crm.onrender.com/api/health` → `"emailProvider":"brevo"`

2. Test locally (add same vars to `crm-app/backend/.env`):

```bash
cd crm-app/backend
npm run test-email -- admin@crm.com
```

3. App → **Forgot password** → any registered user email

---

## Local development

SMTP works on localhost if you prefer:

```env
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=your-brevo-login@email.com
SMTP_PASS=your-brevo-smtp-key
SMTP_FROM="Guru CRM <peaceandray@gmail.com>"
```

On Render, always use `BREVO_API_KEY` instead.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `Connection timeout` | You are using SMTP on Render free — switch to `BREVO_API_KEY` |
| `emailProvider: brevo-smtp` | Remove SMTP vars; set `BREVO_API_KEY` only |
| Invalid API key | Use **API keys** tab key (`xkeysib-`), not SMTP key |
| Sender not verified | Complete Brevo sender verification |

**No email:** `npm run reset-password -- user@email.com NewPass123`
