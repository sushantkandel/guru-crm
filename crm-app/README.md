# Guru CRM

Multi-company field-sales CRM for managing customer contacts, shop addresses, orders (packet/bundle/bag units), payments (cash/credit/cheque/QR), product catalogs, and map-based shop locations with city/ward/place filtering.

Each company has isolated data. Owners manage staff, approve delete requests, and configure company settings. Staff can create and edit data but must request deletion for owner approval.

## Stack

- **Frontend:** React (Vite), React Router, TanStack Query, Tailwind CSS, Google Maps
- **Backend:** Node.js, Express, Prisma, JWT auth with tenant scoping
- **Database:** SQLite (local dev) — PostgreSQL supported for production via `docker-compose.yml`

## Quick Start

### 1. Backend

```bash
cd backend
npm install
npx prisma db push
npm run db:seed
npm run dev
```

API runs at `http://localhost:5001`

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

App runs at `http://localhost:5173`

### Demo Login (Demo Company)

| Role  | Email           | Password  |
|-------|-----------------|-----------|
| Owner | admin@crm.com   | admin123  |
| Staff | sales@crm.com   | sales123  |

### New Company Signup

Visit `/register-company` to create a new company and owner account. Default Nepal locations are seeded automatically.

## Roles

| Role   | Permissions |
|--------|-------------|
| Owner  | Full access, direct delete, approve delete requests, manage users & settings |
| Staff  | Create/edit customers, orders, payments, products; request delete (no direct delete) |
| Viewer | Read-only access |

## Maps (OpenStreetMap — free, no API key)

The map view and customer location picker use **Leaflet** + **OpenStreetMap** tiles. Shop pins are loaded from your private CRM database (login required).

Address geocoding uses the free [Nominatim](https://nominatim.org/) service. Optionally set in `backend/.env`:

```
NOMINATIM_USER_AGENT=GuruCRM/1.0 (your-contact@email.com)
```

## SMTP (for password reset)

Add to `backend/.env`:

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM="Guru CRM <noreply@yourdomain.com>"
FRONTEND_URL=http://localhost:5173
```

For Gmail, use an [App Password](https://support.google.com/accounts/answer/185833).

## Google Sign-In (Login with Gmail)

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials
2. Create an **OAuth 2.0 Client ID** (Web application)
3. Add **Authorized JavaScript origins:** `http://localhost:5173` (and your production URL)
4. Copy the Client ID to both env files:

**backend/.env**
```
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

**frontend/.env**
```
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

**How it works:**
- Google sign-in only works for existing users (register your company first)
- Google-only accounts cannot use email/password login until they set a password via Forgot Password

## PostgreSQL (production)

```bash
docker compose up -d
```

Update `backend/prisma/schema.prisma` provider to `postgresql`, set `DATABASE_URL` in `.env`, then run `npx prisma db push`.

## Features

- **Multi-tenant:** Shared database with `companyId` row-level isolation on every query
- **Company signup:** Self-service owner registration at `/register-company`
- **Products:** Company-scoped product catalog with order form integration
- **Delete requests:** Staff submit deletion requests; owners approve or reject
- **Customers:** Full CRUD with city → ward → place cascading dropdowns (per-company locations)
- **Orders:** Line items with product picker, units: packet, bundle, bag
- **Payments:** Cash, credit, cheque, QR — partial payments supported
- **Customer filters:** Text search, remaining payment, pending orders, not-ordered date range, location
- **Map:** Pin shops, filter by city/ward/place, get directions
- **Settings:** Owner can update company info and manage operating locations

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register-company` | Create company + owner (public) |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/register` | Create staff user (owner) |
| GET | `/api/company` | Company settings |
| PUT | `/api/company` | Update company (owner) |
| GET | `/api/products` | Product catalog |
| POST | `/api/delete-requests` | Submit delete request (staff/owner) |
| PATCH | `/api/delete-requests/:id` | Approve/reject (owner) |
| GET | `/api/customers` | List with filters |
| POST | `/api/customers` | Create customer |
| GET | `/api/customers/:id` | Customer detail + balance |
| POST | `/api/orders` | Create order |
| POST | `/api/payments` | Record payment |
| GET | `/api/map/shops` | Map markers |
| GET | `/api/dashboard/stats` | Dashboard KPIs |
