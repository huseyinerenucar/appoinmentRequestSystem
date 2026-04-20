# Randevu Talep Sistemi (Appointment Request System)

Full-stack appointment booking system (Turkish UI) with role-based authorization, corporate authentication, hierarchical resource management (Locations → Test Categories → Test Areas), and concurrency-safe date-range reservations backed by SQLite.

## Architecture

```
appoinmentRequestSystem/
├── backend/     Node.js + Express + better-sqlite3 (TypeScript)
└── frontend/    Vite + React + TypeScript + Tailwind + TanStack Query + Zustand
```

## Roles

| Role  | Scope                                                                  |
|-------|------------------------------------------------------------------------|
| user  | Browse hierarchy, view availability, create bookings                   |
| admin | All of the above **plus** CRUD on locations, categories, test areas (incl. `daily_capacity`, `min/max_days`, active flag), blacklist dates, and user role/status |

Roles are stored locally in the `users` table. The corporate server is authoritative only for **authentication** (password verification).

## Authentication

The backend calls a configurable corporate auth endpoint:

- `CORPORATE_AUTH_URL` — POST endpoint receiving `{username, password}` JSON. Any 2xx response is treated as a successful credential check. The server may return `{fullName}`/`{displayName}`/`{name}` to populate the local user record.
- `CORPORATE_AUTH_HEADERS` — optional extra headers (e.g. `X-App-Id: appointments`), `\n` or `;` separated.
- `SESSION_TTL_HOURS` — session lifetime (default 12).

When `CORPORATE_AUTH_URL` is unset a **dev mock** is used that accepts any non-empty password. Seeded local users: `admin` (admin role), `eren`, `mert` (user role).

On successful login the backend issues an opaque session token persisted in the `sessions` table. The frontend stores it in `localStorage` and sends it as `Authorization: Bearer <token>`.

## Concurrency Guarantees

- **Atomic check-and-insert** inside `BEGIN IMMEDIATE` — write lock held before the capacity check, eliminating TOCTOU races.
- **SQLITE_BUSY retry** — up to 8 attempts with exponential backoff (10–500 ms + jitter).
- **WAL journaling** — concurrent readers never block on the writer.
- **Per-day capacity** — every day in `[start, end]` must have `confirmed_count < daily_capacity`.
- **Blacklist enforcement** — any overlap with a blacklisted date rejects with `409`.

## Getting Started

```bash
# Backend
cd backend
cp .env.example .env
npm install
npm run migrate        # creates data/app.db + seeds data + default users
npm run dev            # http://localhost:4000

# Frontend (separate terminal)
cd frontend
npm install
npm run dev            # http://localhost:5173
```

Dev login (while `CORPORATE_AUTH_URL` is unset): `admin` / anything for the admin panel, or `eren` / anything for a standard user.

## API

### Public
| Method | Path              | Purpose                              |
|--------|-------------------|--------------------------------------|
| POST   | `/api/auth/login` | Validate credentials, return session |

### Authenticated (Bearer token)
| Method | Path                    | Purpose                               |
|--------|-------------------------|---------------------------------------|
| GET    | `/api/auth/me`          | Current user                          |
| POST   | `/api/auth/logout`      | Revoke current session                |
| GET    | `/api/hierarchy`        | Nested Locations → Categories → Areas |
| GET    | `/api/availability`     | Daily slot availability for a range   |
| POST   | `/api/bookings`         | Atomic booking (`409` on clash)       |
| GET    | `/api/bookings`         | List bookings by area                 |

### Admin-only
| Method            | Path                         | Purpose                       |
|-------------------|------------------------------|-------------------------------|
| GET/POST/PUT/DEL  | `/api/admin/locations`       | Manage locations              |
| GET/POST/PUT/DEL  | `/api/admin/categories`      | Manage test categories        |
| GET/POST/PUT/DEL  | `/api/admin/areas`           | Manage test areas + capacity  |
| GET/POST/DEL      | `/api/admin/blacklist`       | Manage blacklisted dates      |
| GET/PATCH         | `/api/admin/users`           | Manage user role / active flag|

## Race Condition Test

```bash
cd backend
npm run test:race      # 5 concurrent requests for a capacity=1 slot
```

Expected: exactly one success, four `ConflictError` rejections.
