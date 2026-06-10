# Company backup & restore

Per-company backup exports business data as a ZIP of CSV files. Restore replaces all business records for the logged-in company (customers, orders, payments, products, addresses). User accounts are merged by email; passwords are not included in backups.

**Owner-only** — staff and viewers cannot export or restore.

## ZIP contents

| File | Description |
|------|-------------|
| `manifest.json` | Format version, company id/name, export time, row counts |
| `company.csv` | Company profile |
| `users.csv` | id, email, name, role (no password hashes) |
| `products.csv` | Product catalog |
| `customers.csv` | Customers |
| `addresses.csv` | Customer addresses |
| `orders.csv` | Orders |
| `order_items.csv` | Line items |
| `payments.csv` | Payments |

## API (Bearer token, owner role)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/backup/export` | Download backup ZIP |
| POST | `/api/backup/pre-restore-export` | Safety backup before restore |
| POST | `/api/backup/validate` | Multipart `file` — validate ZIP |
| POST | `/api/backup/restore` | Multipart `file` + field `confirm=RESTORE` |

Restore rejects backups where `manifest.companyId` does not match the current company.

## Web

**Settings → Backup & Restore**

1. Download backup
2. Choose ZIP → Validate
3. Download safety backup (required)
4. Type `RESTORE` → confirm restore

## Mobile (Android)

**Settings (gear icon, owner only) → Backup & Restore**

Same flow as web. Files are saved via the system save dialog (or Downloads fallback). Pick uses the system file picker.

iOS file save/pick is not implemented yet; the UI shows an error if save/pick fails.

## Safety

- A **pre-restore safety backup** is offered (and required in the UI) before restore.
- Restore runs in a transaction: delete business data, then re-insert with preserved UUIDs.
- 5-minute cooldown between restore operations per company (server-side).
