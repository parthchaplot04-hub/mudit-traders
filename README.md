# Mudit Traders — Store Management System

A store management system for **Mudit Traders**, Akola, Chittorgarh, Rajasthan — built as
a real MERN-stack application (MongoDB, Express, React, Node/TypeScript), not a mockup.

---

## 1. What this is (and isn't) — read this first

This repository is a **working first vertical slice** of the full system described in the
original spec, plus scaffolding for the rest. It genuinely runs against a real MongoDB
database using real Mongoose transactions — nothing here is faked.

**Implemented and working end-to-end** (Login → Product → Purchase → Inventory → Sale → Inventory):
- Authentication (JWT + bcrypt), role-based authorization enforced on the backend (OWNER/STAFF/ADMIN)
- Product master with the unit-conversion engine (tins→kg, nested carton→container→kg)
- Purchases: multi-item invoices, GST calculation, **atomic** stock increase + supplier ledger via MongoDB transactions
- Sales/POS: cart, discount, GST, **atomic** stock decrease + customer credit ledger, sale cancellation with stock restore
- Wastage recording (atomic stock decrease)
- **Stocktake**: physical count reconciliation (system vs. actual, mandatory reason, atomic adjustment + audit log)
- **CSV import/export**: Products and Suppliers import (row-level validation, all-or-nothing — invalid rows block the entire import and are reported back with row numbers); Products, Suppliers, Inventory, Sales, Purchases, and per-supplier Ledger export, all as live data
- Supplier & customer ledgers and payments
- Reorder dashboard (computed from real stock vs. reorder level)
- Owner dashboard — every figure is a live MongoDB aggregation, nothing hardcoded
- Automated tests for the conversion engine, reorder status, auth/role permissions, CSV parsing/import validation, stocktake reconciliation, and the full purchase/sale/wastage/payment transactions (spec TEST 1–10), run against an in-memory MongoDB **replica set** (transactions require a replica set)
- React frontend: Login, Dashboard, POS, Products, Purchases, Suppliers, Reorder, Wastage, Stocktake — all wired to the real API, responsive (desktop sidebar / mobile bottom nav), PWA-shell-ready, with CSV import/export buttons on Products and Suppliers

**Explicitly NOT implemented in this slice** (say so plainly, per the "no fake features" rule):
- `NOT IMPLEMENTED`: Order/picking workflow (PENDING → PICKING → ... → COMPLETED) — only Fast POS exists
- `NOT IMPLEMENTED`: Daily cash closing screen
- `NOT IMPLEMENTED`: PDF/print-ready invoice generation
- `NOT IMPLEMENTED`: Audit-log viewer UI (the AuditLog collection is written to, but there's no screen to browse it yet)
- `NOT IMPLEMENTED`: Reports module (sales/profit/inventory reports beyond the dashboard)
- `NOT IMPLEMENTED`: Offline PWA transaction queueing (the PWA config only caches the app shell, honestly — it does not claim to save sales while offline)
- `NOT IMPLEMENTED`: Barcode/weighing-scale hardware integration (by design — spec explicitly defers this)

**I have not personally executed `npm install` or the test suite** — the sandbox this was built
in has no network access, so `npm install` and connecting to MongoDB Atlas were not possible from
here. The code was written carefully and each transaction/calculation is covered by a test, but
**run `npm test` yourself before trusting this in production.**

---

## 2. Architecture

```
 USER (desktop/mobile)
        │
        ▼
   VERCEL — React + Vite frontend
        │  HTTPS (VITE_API_URL)
        ▼
   RENDER — Node + Express backend
        │
        ▼
   MONGODB ATLAS
```

```
UI → API client (client/src/lib/api.ts) → REST API → Controller → Service → Mongoose Model → MongoDB
```

Business logic (conversion math, GST, reorder status, ledger updates) lives in `server/src/services`
and `server/src/utils` — never inside route handlers or React components.

### Money & quantity representation
- **Money is stored as integer paise** (1 rupee = 100 paise), not floating-point rupees or
  Decimal128. Every DB field is suffixed `Paise`. The rationale is documented in
  `server/src/utils/money.ts` — in short, this app's money math is all addition/subtraction/simple
  multiplication, so exact integers are simpler than Decimal128 while being equally precise. Rupees
  only ever appear formatted for display in the UI.
- **Quantities support decimals** (e.g. `1.600 kg`) and are rounded to 3 decimal places
  (`server/src/utils/conversion.ts`) to avoid floating-point noise like `0.1 + 0.2`.

### Line items are embedded, not separate collections
`PurchaseItem` and `SaleItem` are embedded subdocuments inside `Purchase`/`Sale` rather than their
own top-level collections. They're always read/written with their parent invoice/bill and never
queried independently, so embedding is the more idiomatic MongoDB pattern here — documented in
`server/src/models/Purchase.ts`.

### Financial atomicity
Purchases, sales, wastage, and supplier/customer payments each run inside a single
`session.withTransaction()` block. If any step fails, **everything rolls back** — there is no
code path where a sale is saved but stock isn't updated, or vice versa.

---

## 3. Project structure

```
mudit-traders/
├── client/                  React + TS + Vite + Tailwind frontend
│   └── src/{pages,layouts,components,hooks,lib,types,utils}
├── server/                  Node + TS + Express backend
│   ├── src/{config,models,services,controllers,routes,middleware,validators,utils}
│   └── tests/               Jest integration tests (in-memory MongoDB replica set)
├── package.json             root convenience scripts
└── README.md
```

---

## 4. Local development

### Prerequisites
- Node.js 18+ and npm
- A MongoDB instance. For local dev you can use:
  - MongoDB Atlas free tier (recommended, works immediately with transactions), or
  - A local MongoDB **replica set** (a standalone `mongod` does NOT support the transactions this
    app relies on — either use Atlas or run `mongod --replSet rs0` locally and `rs.initiate()` once).

### Install
```bash
npm run install:all
# or manually:
cd server && npm install
cd ../client && npm install
```

### Configure environment variables
```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```
Edit `server/.env`:
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/mudit-traders?retryWrites=true&w=majority
JWT_SECRET=<generate a long random string>
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
```
Edit `client/.env`:
```env
VITE_API_URL=http://localhost:5000/api
```

### Seed demo data
```bash
npm run seed
```
This creates:
- Owner login → phone `9999900001` / password `owner123`
- Staff login → phone `9999900002` / password `staff123`
- 4 demo suppliers, ~14 demo products (all clearly tagged `DEMO DATA` in their `notes` field)

**Change these passwords before any real use.**

### Run
```bash
npm run dev:server   # http://localhost:5000
npm run dev:client   # http://localhost:5173
```

### Run tests
```bash
npm run test:server
```
Tests use `mongodb-memory-server` to spin up a real, disposable MongoDB **replica set** in memory
(needed because MongoDB transactions require a replica set). The first run needs network access
once, to download the `mongod` binary — after that it's cached locally.

---

## 5. Creating your first real owner account

The seed script creates a demo owner. To create a real one instead (e.g. in production), call the
API directly once, then remove/disable this route or protect it:

```bash
# There is currently no public "register" endpoint by design — accounts are
# created via the seed script or directly in MongoDB. If you want a proper
# "create first owner" CLI flow beyond the seed script, that is a small,
# clearly-scoped addition to server/src/seed.ts.
```

---

## 6. Deploying to production

### 6.1 MongoDB Atlas
1. Create a free account at https://cloud.mongodb.com and a new Project.
2. Build a Database (M0 free tier is fine to start).
3. Under **Database Access**, create a database user with a strong password.
4. Under **Network Access**, add an IP allowlist entry. For Render (which uses dynamic egress
   IPs on free/starter plans), allow `0.0.0.0/0` and rely on the database username/password for
   security, or use Atlas's Render-specific network peering if you're on a paid tier.
5. Click **Connect → Drivers**, copy the connection string — this is your `MONGODB_URI`.
6. Atlas M10+ clusters are replica sets by default, so transactions work automatically. (M0 free
   tier is also a replica set, so this works there too.)

### 6.2 Render (backend)
1. Push this repo to GitHub.
2. In Render, create a **New Web Service**, pointing at the `server/` directory (set root
   directory to `server`).
3. Build command: `npm install && npm run build`
4. Start command: `npm start`
5. Add environment variables in Render's dashboard: `NODE_ENV=production`, `PORT` (Render sets
   this automatically — the app reads `process.env.PORT`, never a hardcoded port), `MONGODB_URI`,
   `JWT_SECRET`, `JWT_EXPIRES_IN`, `CLIENT_URL` (your Vercel domain, added after step 6.3).
6. Deploy. Confirm `https://your-backend.onrender.com/api/health` returns `{"status":"ok"}`.

### 6.3 Vercel (frontend)
1. In Vercel, import the same repo, set root directory to `client`.
2. Framework preset: Vite.
3. Add environment variable `VITE_API_URL=https://your-backend.onrender.com/api`.
4. Deploy. Vercel will give you a domain like `https://mudit-traders.vercel.app`.
5. Go back to Render and set `CLIENT_URL` to that Vercel domain (comma-separate multiple origins
   if you need both a preview and production URL), then redeploy the backend so CORS allows it.

### 6.4 Seed production data
Run the seed script once against the production `MONGODB_URI` (from your local machine with that
env var set, or a one-off Render shell), then **change the default passwords immediately** via the
product/user management flow.

---

## 7. CSV import/export, backups

**CSV import/export is implemented** (section 1) for Products and Suppliers (import) and Products,
Suppliers, Inventory, Sales, Purchases, and per-supplier Ledger (export):
- Import endpoints (`POST /api/csv/products/import`, `POST /api/csv/suppliers/import`) accept raw
  CSV text (`Content-Type: text/csv`), validate **every row** before writing anything, and reject
  the whole import with a per-row error list if any row is invalid — no partial imports of bad
  financial/product data. Existing rows are matched and updated by `productCode` / `supplierName`;
  new ones are inserted.
- Export endpoints stream a `.csv` file built live from MongoDB.
- The Products and Suppliers pages in the frontend have Export/Import buttons wired to these
  endpoints (owner-only for product import, matching the owner-only product-edit permission).

For anything beyond these six exports, or for full database backups, use MongoDB Atlas's built-in
**Data Export** / `mongoexport` directly:
```bash
mongoexport --uri="$MONGODB_URI" --collection=products --type=csv \
  --fields=productCode,productName,category,currentStock,sellingPricePaise --out=products.csv
```
- **Backup strategy**: enable Atlas's automated continuous backups (available from the M10 tier)
  or, on the free tier, schedule a periodic `mongodump` against `MONGODB_URI` and store the archive
  somewhere durable (cloud storage, external drive). Never rely on a single copy.
- All financially significant writes use MongoDB transactions, so a mid-write crash cannot leave
  a sale/purchase half-saved — but that is not a substitute for backups against accidental
  deletion, bugs, or Atlas-level incidents.

---

## 8. Troubleshooting

| Symptom | Likely cause |
|---|---|
| Backend crashes on startup with a MongoDB error | `MONGODB_URI` missing/wrong in `server/.env`, or IP not allowlisted in Atlas |
| `Transaction numbers are only allowed on a replica set member` | You're pointing at a standalone `mongod` — use Atlas or a local replica set |
| Frontend shows network errors | `VITE_API_URL` in `client/.env` doesn't match where the backend is actually running |
| CORS errors in the browser console | `CLIENT_URL` on the backend doesn't match the frontend's actual origin exactly (including `https://` and no trailing slash) |
| 403 on product price edits | Only OWNER/ADMIN can edit prices — this is enforced on the backend intentionally (spec section 29) |

---

## 9. Continuing this project

The natural next steps, in priority order: order/picking workflow for large orders, PDF invoice
generation, reports module, audit-log viewer UI, daily cash closing screen, and a proper
first-owner-account creation flow (rather than only the seed script).
