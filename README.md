# Scheme Sync — Welfare Scheme Management Portal

Full-stack web app where **citizens** register with an **Aadhaar number** (or Voter ID / PAN /
Driving Licence), apply for welfare schemes and track status — while **officers** review every
application in a secure **admin panel at `/admin`** and Approve / Reject with a full audit log.

No AI/ML. Solid auth, application submission, and admin verification workflow only.

## Tech stack

| Layer    | Technology |
|----------|------------|
| Frontend | Next.js 14 (App Router) + TypeScript + Tailwind CSS + shadcn-style UI + React Hook Form + Zod |
| Backend  | FastAPI + Python 3.11+ + SQLAlchemy 2.0 + Alembic + Pydantic v2 |
| Database | MySQL 8 (SQLite usable for quick local dev) |
| Auth     | JWT (`python-jose`) + bcrypt (`passlib`) |
| Uploads  | FastAPI `UploadFile` → local `backend/uploads/` |

## Repository layout

```
.
├── backend/
│   ├── app/
│   │   ├── main.py            # app factory: CORS, rate limiting, routers, /uploads, errors
│   │   ├── core/              # config (.env), security (JWT/bcrypt), deps (RBAC), exceptions
│   │   ├── db/                # engine/session, Base
│   │   ├── models/            # users, schemes, applications, documents, admin_logs
│   │   ├── schemas/           # Pydantic v2 request/response models
│   │   ├── crud/              # DB queries (incl. filtered/searchable admin listing)
│   │   ├── routers/           # auth, schemes, applications (citizen), admin, users
│   │   └── utils/             # aadhaar hash/mask/validate, file uploads
│   ├── alembic/               # env.py + versions/0001_initial.py
│   ├── alembic.ini
│   ├── requirements.txt
│   ├── .env.example
│   └── seed.py                # 5 schemes + default admin (idempotent)
└── frontend/
    ├── app/
    │   ├── page.tsx           # landing page (citizen portal is on /)
    │   ├── login/ register/ dashboard/ schemes/ apply/[schemeId]/ applications/ profile/
    │   └── admin/             # /admin → admin panel (login, dashboard, applications, logs)
    ├── components/ui/         # shadcn-style Button, Card, Input, Badge, …
    └── lib/                   # api client, auth-context (citizen+admin sessions), zod schemas
```

> Note: the legacy `manage.py` / `welfare/` Django scaffold at the repo root is unused and kept
> only for history. The application lives in `backend/` + `frontend/`.

## 1. Backend setup

### 1a. MySQL 8 (required for production)

```sql
CREATE DATABASE scheme_sync CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'scheme'@'localhost' IDENTIFIED BY 'strong-password';
GRANT ALL ON scheme_sync.* TO 'scheme'@'localhost';
```

### 1b. Install + configure

```powershell
cd backend
python -m venv .venv; .\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
# Edit .env:
#   DATABASE_URL=mysql+pymysql://scheme:strong-password@127.0.0.1:3306/scheme_sync
#   SECRET_KEY=<long random string, min 32 chars>
#   BACKEND_CORS_ORIGINS=http://localhost:3000
```

> Quick dev without MySQL: `DATABASE_URL=sqlite:///./scheme_sync.db` works out of the box.

### 1c. Migrate + seed + run

```powershell
alembic upgrade head      # creates users, schemes, applications, documents, admin_logs
python seed.py            # 5 schemes + default admin (safe to re-run)
python -m uvicorn app.main:app --reload --port 8000
```

- API: http://127.0.0.1:8000 · OpenAPI docs: http://127.0.0.1:8000/docs · health: `/health`
- Default admin: `admin@gov.in` / `Admin@123` (override via `SEED_ADMIN_*` in `.env`, change after first login)

## 2. Frontend setup

```powershell
cd frontend
npm install
Copy-Item .env.local.example .env.local
# NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
npm run dev
```

- Citizen portal: http://localhost:3000 (landing, register, login, schemes, apply, tracking, profile)
- Admin panel: http://localhost:3000/admin (login → dashboard → applications → audit log)

Production: `npm run build; npm start`. Typecheck: `npm run typecheck`.

## 3. Key flows

**Citizen** — Register (Aadhaar 12-digit *or* Voter/PAN/DL + phone/email/address/DOB/password) →
Login with gov ID → browse `/schemes` → Apply (reason + optional PDF/image docs) → track
Pending / Approved / Rejected at `/applications` → edit profile at `/profile`.

**Officer** — Login at `/admin/login` (admin role only) → `/admin/dashboard` counts
(Total / Pending / Approved / Rejected) → `/admin/applications` with status / scheme / search
(name, masked Aadhaar, gov ID, email, phone) filters + CSV export → detail page shows full
citizen record (Aadhaar **always masked** `XXXX-XXXX-1234`), scheme, reason, documents →
**Approve** (optional benefit amount + remarks) or **Reject** (mandatory reason). Every decision
is written to `admin_logs` and visible at `/admin/logs`.

## 4. API reference (prefix `/api`)

| Method | Path | Access |
|--------|------|--------|
| POST | `/auth/register` | public (citizen) |
| POST | `/auth/login` | public (citizen, gov ID + password) |
| POST | `/auth/admin/login` | public (admin email + password) |
| GET | `/auth/me`, `/auth/admin/me` | user / admin |
| GET | `/schemes`, `/schemes/{id}` | public (active only) |
| POST/PATCH | `/schemes` | admin |
| POST | `/applications` (multipart: `scheme_id`, `reason`, `files[]`) | citizen |
| GET | `/applications/me`, `/applications/{id}` | citizen (own only) |
| GET/PATCH | `/users/me` | citizen |
| GET | `/admin/stats` | admin |
| GET | `/admin/applications` (`status`, `scheme_id`, `date_from`, `date_to`, `search`, `page`, `page_size`) | admin |
| GET | `/admin/applications/export` (CSV) | admin |
| GET | `/admin/applications/{id}` | admin |
| POST | `/admin/applications/{id}/approve` (`benefit_amount?`, `remarks?`) | admin |
| POST | `/admin/applications/{id}/reject` (`rejection_reason!`, `remarks?`) | admin |
| GET | `/admin/logs` | admin |

Full interactive docs with schemas at `/docs` (OpenAPI).

## 5. Security design

- Raw Aadhaar is **never stored** — only SHA-256 hash (+ secret pepper) for uniqueness/login and
  masked `XXXX-XXXX-1234` for display. All UI paths render the masked form.
- Passwords hashed with bcrypt; JWT (`HS256`) with expiry; `Authorization: Bearer` scheme.
- Role-based dependencies: `get_current_user` / `get_current_admin` — citizens get **403** on
  every `/api/admin/*` route; frontend also guards `/admin/*` client-side.
- Validation on both sides: Pydantic v2 (backend, 422 with readable messages) + Zod + React Hook
  Form (frontend); global JSON exception handlers never leak internals.
- CORS allowlist via env, per-IP rate limiting (`slowapi`), upload allowlist
  (pdf/jpg/png/webp/doc/docx/txt, 10 MB cap), indexed FKs, unique constraints on email/phone/IDs.

## 6. Seed data

- Schemes: PM Awas Yojana, National Pension Scheme, Merit Scholarship, Ration Subsidy (PDS),
  Direct Benefit Transfer (DBT).
- Admin: `admin@gov.in` / `Admin@123`, phone `9000000001`.

## 7. Troubleshooting

| Symptom | Fix |
|---------|-----|
| `Can't connect to MySQL` | Create DB/user per §1a; check `DATABASE_URL`; or use SQLite URL for dev |
| `SECRET_KEY must be at least 16 characters` | Set a long random `SECRET_KEY` in `backend/.env` |
| Frontend `Failed to fetch` | Backend must run on the exact `NEXT_PUBLIC_API_URL` origin; check CORS |
| `409 already registered / already pending` | Expected guards: duplicate ID or second pending application for same scheme |
| `403 Admin access required` | Citizen tokens can't call admin APIs — login at `/admin/login` |
