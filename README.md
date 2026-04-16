# Appointment Request System

Full-stack appointment booking system with hierarchical resource management (Locations → Test Categories → Test Areas) and concurrency-safe date-range reservations backed by SQLite.

## Architecture

```
appoinmentRequestSystem/
├── backend/     Node.js + Express + better-sqlite3 (TypeScript)
└── frontend/    Vite + React + TypeScript + Tailwind + TanStack Query + Zustand
```

## Core Guarantees

- **Atomic check-and-insert**: every booking runs inside `BEGIN IMMEDIATE` so the write lock is acquired before the capacity check, eliminating TOCTOU races.
- **SQLITE_BUSY retry**: busy errors are retried with exponential backoff (8 attempts, 10–500 ms).
- **WAL journaling**: concurrent readers never block on the single writer.
- **Capacity-per-day validation**: every day in the requested `[start, end]` range must have `confirmed_count < daily_capacity`; otherwise the request is rejected with `409 Conflict`.
- **Blacklist enforcement**: any overlap with a blacklisted date rejects the booking.

## Getting Started

```bash
# Backend
cd backend
npm install
npm run migrate        # creates data/app.db + seed data
npm run dev            # http://localhost:4000

# Frontend (separate terminal)
cd frontend
npm install
npm run dev            # http://localhost:5173
```

## API

| Method | Path                              | Purpose                                |
|--------|-----------------------------------|----------------------------------------|
| GET    | `/api/hierarchy`                  | Nested Locations → Categories → Areas  |
| GET    | `/api/availability`               | Daily slot availability for a range    |
| POST   | `/api/bookings`                   | Atomic booking (returns 409 on clash)  |
| GET    | `/api/bookings`                   | List bookings by area                  |

## Race Condition Test

```bash
cd backend
npm run test:race      # fires 5 concurrent requests for a capacity=1 slot
```

Expected output: exactly one `201`, four `409`s.
