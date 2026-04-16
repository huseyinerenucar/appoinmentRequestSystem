-- Migration 001: initial schema
-- Dates are stored as TEXT in ISO8601 'YYYY-MM-DD' so lexicographic comparison
-- matches chronological comparison. Timestamps use INTEGER (Unix ms).

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS schema_version (
  version     INTEGER PRIMARY KEY,
  applied_at  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS locations (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT    NOT NULL UNIQUE,
  timezone    TEXT    NOT NULL DEFAULT 'UTC',
  created_at  INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000)
);

CREATE TABLE IF NOT EXISTS test_categories (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT    NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),
  UNIQUE(name)
);

CREATE TABLE IF NOT EXISTS test_areas (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id     INTEGER NOT NULL,
  location_id     INTEGER NOT NULL,
  name            TEXT    NOT NULL,
  daily_capacity  INTEGER NOT NULL DEFAULT 1 CHECK (daily_capacity >= 1),
  min_days        INTEGER NOT NULL DEFAULT 1 CHECK (min_days >= 1),
  max_days        INTEGER NOT NULL DEFAULT 30 CHECK (max_days >= min_days),
  is_active       INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
  created_at      INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),
  FOREIGN KEY (category_id) REFERENCES test_categories(id) ON DELETE CASCADE,
  FOREIGN KEY (location_id) REFERENCES locations(id)        ON DELETE RESTRICT,
  UNIQUE(category_id, location_id, name)
);

CREATE TABLE IF NOT EXISTS projects (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT    NOT NULL UNIQUE,
  owner       TEXT,
  created_at  INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000)
);

CREATE TABLE IF NOT EXISTS appointments (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  test_area_id  INTEGER NOT NULL,
  project_id    INTEGER NOT NULL,
  start_date    TEXT    NOT NULL,            -- 'YYYY-MM-DD'
  end_date      TEXT    NOT NULL,            -- inclusive 'YYYY-MM-DD'
  status        TEXT    NOT NULL DEFAULT 'confirmed'
                CHECK (status IN ('pending','confirmed','cancelled')),
  notes         TEXT,
  created_at    INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),
  CHECK (start_date <= end_date),
  FOREIGN KEY (test_area_id) REFERENCES test_areas(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id)   REFERENCES projects(id)   ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS blacklist_dates (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  test_area_id  INTEGER,                     -- NULL = applies to all areas at the location
  location_id   INTEGER,                     -- NULL = applies globally
  date          TEXT    NOT NULL,            -- 'YYYY-MM-DD'
  reason        TEXT,
  created_at    INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),
  FOREIGN KEY (test_area_id) REFERENCES test_areas(id) ON DELETE CASCADE,
  FOREIGN KEY (location_id)  REFERENCES locations(id)  ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_appointments_area_dates
  ON appointments(test_area_id, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_appointments_status
  ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_blacklist_area_date
  ON blacklist_dates(test_area_id, date);
CREATE INDEX IF NOT EXISTS idx_blacklist_location_date
  ON blacklist_dates(location_id, date);
CREATE INDEX IF NOT EXISTS idx_test_areas_location
  ON test_areas(location_id);
CREATE INDEX IF NOT EXISTS idx_test_areas_category
  ON test_areas(category_id);
