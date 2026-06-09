# Brevo email setup (password reset)

Use [Brevo](https://www.brevo.com) (free ~300 emails/day) to send reset links to **any Gmail address**. Works on Render.

---

## 1. Create Brevo account

1. Sign up at [brevo.com](https://www.brevo.com)
2. Confirm your email

---

## 2. Verify sender (your Gmail)

1. Brevo → **Senders, domains and dedicated IPs** → **Senders**
2. **Add a sender** → enter e.g. `peaceandray@gmail.com`
3. Open the verification email from Brevo and click the link

`SMTP_FROM` must use this **verified** address.

---

## 3. Create SMTP key

1. Brevo → **SMTP & API** → **SMTP**
2. Click **Generate a new SMTP key**
3. Copy the key (shown once)

| Brevo field | Use as Render env |
|-------------|-------------------|
| Login / SMTP user | `SMTP_USER` (your Brevo account email) |
| SMTP key | `SMTP_PASS` (not your Gmail password) |
| Server | `smtp-relay.brevo.com` → `SMTP_HOST` |
| Port | `587` → `SMTP_PORT` |

---

## 4. Render environment variables

Open **Render** → **guru-crm-api** → **Environment**.

**Remove** (if present):

- `RESEND_API_KEY`
- `RESEND_FROM`

**Add / update:**

| Key | Value |
|-----|--------|
| `SMTP_HOST` | `smtp-relay.brevo.com` |
| `SMTP_PORT` | `587` |
| `SMTP_USER` | Your Brevo login email |
| `SMTP_PASS` | Brevo SMTP key |
| `SMTP_FROM` | `Guru CRM <peaceandray@gmail.com>` (must match verified sender) |
| `FRONTEND_URL` | `https://sushantkandel.github.io/guru-crm` |

**Save** → **Manual Deploy** → **Deploy latest commit**

---

## 5. Verify

1. Open: `https://guru-crm.onrender.com/api/health`  
   Expect: `"emailProvider":"brevo"`

2. Test from your Mac (optional — add same vars to `crm-app/backend/.env`):

```bash
cd crm-app/backend
npm run test-email -- admin@crm.com
```

3. In the app: **Forgot password** → any registered user email

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `emailProvider` is `resend` | Delete `RESEND_API_KEY` on Render, redeploy |
| Sender not verified | Complete Brevo sender verification email |
| SMTP auth failed | Use SMTP **key**, not Brevo account password |
| Reset link wrong page | Set `FRONTEND_URL` with `/guru-crm` path |

**No email:** `npm run reset-password -- user@email.com NewPass123`
