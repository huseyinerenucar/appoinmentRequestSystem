-- Migration 002: authentication & authorization
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  username       TEXT    NOT NULL UNIQUE,
  full_name      TEXT,
  role           TEXT    NOT NULL DEFAULT 'user'
                 CHECK (role IN ('admin', 'user')),
  is_active      INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
  created_at     INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),
  last_login_at  INTEGER
);

CREATE TABLE IF NOT EXISTS sessions (
  token       TEXT    PRIMARY KEY,
  user_id     INTEGER NOT NULL,
  created_at  INTEGER NOT NULL,
  expires_at  INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

-- Track who created a booking (nullable for legacy rows).
ALTER TABLE appointments ADD COLUMN created_by_user_id INTEGER
  REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_appointments_user ON appointments(created_by_user_id);
