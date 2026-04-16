-- Idempotent seed data.
INSERT OR IGNORE INTO locations (id, name, timezone) VALUES
  (1, 'Istanbul Lab',  'Europe/Istanbul'),
  (2, 'Munich Lab',    'Europe/Berlin'),
  (3, 'Detroit Lab',   'America/Detroit');

INSERT OR IGNORE INTO test_categories (id, name, sort_order) VALUES
  (1, 'Environmental',  10),
  (2, 'Mechanical',     20),
  (3, 'Electrical',     30);

-- (id, category_id, location_id, name, daily_capacity, min_days, max_days)
INSERT OR IGNORE INTO test_areas
  (id, category_id, location_id, name, daily_capacity, min_days, max_days)
VALUES
  (1, 1, 1, 'Climatic Chamber A', 1, 1, 14),
  (2, 1, 1, 'Climatic Chamber B', 3, 1, 21),  -- multi-booking area
  (3, 2, 2, 'Vibration Rig 1',    1, 1, 10),
  (4, 2, 2, 'Drop Tower',         2, 1, 7),
  (5, 3, 3, 'EMC Chamber',        1, 1, 30),
  (6, 3, 3, 'HV Bench',           4, 1, 14);  -- multi-booking area

INSERT OR IGNORE INTO projects (id, name, owner) VALUES
  (1, 'Alpha Powertrain', 'eren'),
  (2, 'Beta Battery',     'mert'),
  (3, 'Gamma Harness',    'ayse');

-- Blacklist: New Year across all locations/areas
INSERT OR IGNORE INTO blacklist_dates (test_area_id, location_id, date, reason) VALUES
  (NULL, NULL, '2026-01-01', 'New Year'),
  (NULL, 2,    '2026-10-03', 'German Unity Day'),
  (1,    NULL, '2026-05-01', 'Chamber A maintenance');
