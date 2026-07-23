-- Migration 003: drop locations from the hierarchy.
-- Hierarchy becomes: Categories -> Test Areas.
-- Blacklist scope becomes: single area OR global (all areas).
--
-- The migrate runner wraps each file in BEGIN/COMMIT, and
-- PRAGMA foreign_keys cannot change inside a transaction. We use
-- PRAGMA defer_foreign_keys = ON (transaction-scoped) so we can rebuild
-- tables that have constraints pointing at columns we're dropping.

PRAGMA defer_foreign_keys = ON;

-- Rebuild test_areas without location_id.
CREATE TABLE test_areas_new (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id     INTEGER NOT NULL,
  name            TEXT    NOT NULL,
  daily_capacity  INTEGER NOT NULL DEFAULT 1 CHECK (daily_capacity >= 1),
  min_days        INTEGER NOT NULL DEFAULT 1 CHECK (min_days >= 1),
  max_days        INTEGER NOT NULL DEFAULT 30 CHECK (max_days >= min_days),
  is_active       INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
  created_at      INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),
  FOREIGN KEY (category_id) REFERENCES test_categories(id) ON DELETE CASCADE,
  UNIQUE(category_id, name)
);

INSERT INTO test_areas_new
  (id, category_id, name, daily_capacity, min_days, max_days, is_active, created_at)
SELECT
   id, category_id, name, daily_capacity, min_days, max_days, is_active, created_at
FROM test_areas;

DROP TABLE test_areas;
ALTER TABLE test_areas_new RENAME TO test_areas;

CREATE INDEX IF NOT EXISTS idx_test_areas_category ON test_areas(category_id);

-- Rebuild blacklist_dates without location_id.
-- Rows scoped only to a location (test_area_id IS NULL AND location_id IS NOT NULL)
-- lose their meaning; keep area-scoped and fully-global rows.
CREATE TABLE blacklist_dates_new (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  test_area_id  INTEGER,                          -- NULL = applies globally
  date          TEXT    NOT NULL,                 -- 'YYYY-MM-DD'
  reason        TEXT,
  created_at    INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),
  FOREIGN KEY (test_area_id) REFERENCES test_areas(id) ON DELETE CASCADE
);

INSERT INTO blacklist_dates_new (id, test_area_id, date, reason, created_at)
SELECT id, test_area_id, date, reason, created_at
  FROM blacklist_dates
 WHERE test_area_id IS NOT NULL
    OR (test_area_id IS NULL AND location_id IS NULL);

DROP TABLE blacklist_dates;
ALTER TABLE blacklist_dates_new RENAME TO blacklist_dates;

CREATE INDEX IF NOT EXISTS idx_blacklist_area_date
  ON blacklist_dates(test_area_id, date);

-- Finally drop locations.
DROP TABLE IF EXISTS locations;
