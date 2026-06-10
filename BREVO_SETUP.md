# Brevo email setup (password reset)

Use [Brevo](https://www.brevo.com) (free ~300 emails/day) to send reset links to **any email**.

> **Render free tier blocks SMTP ports 587/465.** Use the **Brevo HTTP API** (`BREVO_API_KEY`), not SMTP.

---

## 1. Create Brevo account

1. Sign up at [brevo.com](https://www.brevo.com)
2. Confirm your email

---

## 1b. Activate transactional sending (required)

New Brevo accounts cannot send email until Brevo manually activates **transactional** sending. Until then you will see:

> *Your SMTP account is not yet activated. Please contact us at contact@brevo.com*

**Email [contact@brevo.com](mailto:contact@brevo.com)** (or use Brevo chat in the dashboard). Example message:

```
Subject: Request transactional email activation

Hello,

Please activate transactional email on my Brevo account.

Account email: peaceandray@gmail.com
Website: https://sushantkandel.github.io/guru-crm/
Use case: Password reset emails for a small business CRM (~10 emails/month)
Sender: peaceandray@gmail.com (verified)

Thank you.
```

Activation usually takes **1–2 business days**. Forgot-password will work automatically once Brevo confirms.

**Until activation:** reset a password from your Mac (uses Neon DB, no email):

```bash
cd crm-app/backend
npm run reset-password -- admin@crm.com Andray@36616
```

---

## 2. Verify sender (your Gmail)

1. Brevo → **Senders, domains and dedicated IPs** → **Senders**
2. **Add a sender** → e.g. `peaceandray@gmail.com`
3. Click the verification link in your inbox

---

## 3. Create API key (not SMTP key)

1. Brevo → **SMTP & API** → **API keys** tab (**not** the SMTP tab)
2. **Generate a new API key** → copy it (must start with `xkeysib-...`)

| Wrong | Right |
|-------|--------|
| SMTP tab → SMTP key | **API keys** tab → `xkeysib-...` |
| `SMTP_PASS` on Render | `BREVO_API_KEY` on Render |

---

## 3b. Authorize Render IP (fixes “invalid API key” / 401)

New Brevo accounts block API calls from unknown IPs. The app may show **invalid API key** even when the key is correct.

**Fastest fix:** Check the Brevo account owner’s inbox (and spam) for **“Validate your IP address”** from Brevo → click the link after you try forgot-password once.

**Permanent fix:**

1. Render → **guru-crm-api** → **Connect** → **Outbound** tab → copy the CIDR ranges
2. Brevo → **Security** → **Authorized IPs** → paste those ranges → save

**Alternative:** Brevo → **Security** → turn off **Block unknown IP addresses** (less secure).

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
| `BREVO_FROM` | `Sales Guru <peaceandray@gmail.com>` (verified sender) |
| `FRONTEND_URL` | `https://sushantkandel.github.io/guru-crm` (must include `/guru-crm`) |

**Save** → **Manual Deploy** → **Deploy latest commit**

---

## 5. Verify

1. `https://guru-crm.onrender.com/api/health` → `"emailProvider":"brevo"` and `"brevoKeyFormat":"ok"`
   - If `brevoKeyFormat` is `invalid-use-xkeysib-api-key`, you pasted the SMTP key — repeat step 3

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
SMTP_FROM="Sales Guru <peaceandray@gmail.com>"
```

On Render, always use `BREVO_API_KEY` instead.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `Connection timeout` | You are using SMTP on Render free — switch to `BREVO_API_KEY` |
| `emailProvider: brevo-smtp` | Remove SMTP vars; set `BREVO_API_KEY` only |
| Invalid API key / 401 | Wrong key type (`xkeysib-` from **API keys** tab), or **authorize Render IP** (step 3b) |
| `brevoKeyFormat: invalid-use-xkeysib-api-key` | `BREVO_API_KEY` is not an API key — regenerate on **API keys** tab |
| Sender not verified | Complete Brevo sender verification |
| SMTP account not activated | Email **contact@brevo.com** — see step **1b** (wait 1–2 days) |
| Reset link → GitHub 404 | Set `FRONTEND_URL` to `https://sushantkandel.github.io/guru-crm` on Render (include `/guru-crm`) |

**No email yet:** `npm run reset-password -- user@email.com NewPass123`
