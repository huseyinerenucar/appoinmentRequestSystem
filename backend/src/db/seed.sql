-- Idempotent seed data.
INSERT OR IGNORE INTO test_categories (id, name, sort_order) VALUES
  (1, 'Environmental',  10),
  (2, 'Mechanical',     20),
  (3, 'Electrical',     30);

-- (id, category_id, name, daily_capacity, min_days, max_days)
INSERT OR IGNORE INTO test_areas
  (id, category_id, name, daily_capacity, min_days, max_days)
VALUES
  (1, 1, 'Climatic Chamber A', 1, 1, 14),
  (2, 1, 'Climatic Chamber B', 3, 1, 21),  -- multi-booking area
  (3, 2, 'Vibration Rig 1',    1, 1, 10),
  (4, 2, 'Drop Tower',         2, 1, 7),
  (5, 3, 'EMC Chamber',        1, 1, 30),
  (6, 3, 'HV Bench',           4, 1, 14);  -- multi-booking area

INSERT OR IGNORE INTO projects (id, name, owner) VALUES
  (1, 'Alpha Powertrain', 'eren'),
  (2, 'Beta Battery',     'mert'),
  (3, 'Gamma Harness',    'ayse');

-- Default users: corporate auth verifies the password, local role decides authz.
INSERT OR IGNORE INTO users (id, username, full_name, role) VALUES
  (1, 'admin',  'Sistem Yöneticisi', 'admin'),
  (2, 'eren',   'Eren Ucar',         'user'),
  (3, 'mert',   'Mert Test',         'user');

-- Blacklist: global holiday + one area-specific maintenance day.
INSERT OR IGNORE INTO blacklist_dates (test_area_id, date, reason) VALUES
  (NULL, '2026-01-01', 'New Year'),
  (1,    '2026-05-01', 'Chamber A maintenance');
