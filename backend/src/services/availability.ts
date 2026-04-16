import type Database from 'better-sqlite3';
import { assertIsoDate } from '../lib/dates.js';
import type { DayAvailability, TestArea } from '../types.js';

/**
 * Builds the daily occupancy map for an area over [start, end] using a
 * recursive date-series CTE and a LEFT JOIN to appointments. Counting is done
 * in SQL with GROUP BY so we never load individual bookings into memory.
 */
const AVAILABILITY_SQL = `
  WITH RECURSIVE days(d) AS (
    SELECT @start
    UNION ALL
    SELECT date(d, '+1 day') FROM days WHERE d < @end
  ),
  occupancy AS (
    SELECT days.d AS date,
           COUNT(a.id) AS booked
      FROM days
      LEFT JOIN appointments a
        ON a.test_area_id = @area_id
       AND a.status = 'confirmed'
       AND a.start_date <= days.d
       AND a.end_date   >= days.d
     GROUP BY days.d
  ),
  bl AS (
    SELECT date FROM blacklist_dates
     WHERE date BETWEEN @start AND @end
       AND (
            test_area_id = @area_id
         OR (test_area_id IS NULL AND location_id = @location_id)
         OR (test_area_id IS NULL AND location_id IS NULL)
       )
  )
  SELECT o.date,
         o.booked,
         CASE WHEN bl.date IS NULL THEN 0 ELSE 1 END AS blacklisted
    FROM occupancy o
    LEFT JOIN bl ON bl.date = o.date
   ORDER BY o.date
`;

/**
 * Finds days in the range where booked >= capacity OR the date is blacklisted.
 * Returned inside a transaction this locks the capacity check against concurrent
 * writers (BEGIN IMMEDIATE already held).
 */
const UNAVAILABLE_DAYS_SQL = `
  WITH RECURSIVE days(d) AS (
    SELECT @start
    UNION ALL
    SELECT date(d, '+1 day') FROM days WHERE d < @end
  ),
  occupancy AS (
    SELECT days.d AS date,
           COUNT(a.id) AS booked
      FROM days
      LEFT JOIN appointments a
        ON a.test_area_id = @area_id
       AND a.status = 'confirmed'
       AND a.start_date <= days.d
       AND a.end_date   >= days.d
     GROUP BY days.d
  ),
  bl AS (
    SELECT date FROM blacklist_dates
     WHERE date BETWEEN @start AND @end
       AND (
            test_area_id = @area_id
         OR (test_area_id IS NULL AND location_id = @location_id)
         OR (test_area_id IS NULL AND location_id IS NULL)
       )
  )
  SELECT o.date, o.booked,
         CASE WHEN bl.date IS NULL THEN 0 ELSE 1 END AS blacklisted
    FROM occupancy o
    LEFT JOIN bl ON bl.date = o.date
   WHERE o.booked >= @capacity OR bl.date IS NOT NULL
   ORDER BY o.date
`;

export interface AvailabilityRow {
  date: string;
  booked: number;
  blacklisted: number;
}

export function getAreaOrThrow(db: Database.Database, id: number): TestArea {
  const row = db
    .prepare('SELECT * FROM test_areas WHERE id = ? AND is_active = 1')
    .get(id) as TestArea | undefined;
  if (!row) throw new Error(`test area ${id} not found`);
  return row;
}

export function fetchAvailability(
  db: Database.Database,
  area: TestArea,
  start: string,
  end: string,
): DayAvailability[] {
  assertIsoDate(start, 'start');
  assertIsoDate(end, 'end');
  if (start > end) throw new Error('start must be <= end');

  const rows = db.prepare(AVAILABILITY_SQL).all({
    start,
    end,
    area_id: area.id,
    location_id: area.location_id,
  }) as AvailabilityRow[];

  return rows.map((r) => ({
    date: r.date,
    capacity: area.daily_capacity,
    booked: r.booked,
    available: Math.max(0, area.daily_capacity - r.booked),
    blacklisted: r.blacklisted === 1,
  }));
}

export interface UnavailableRow {
  date: string;
  booked: number;
  blacklisted: number;
}

/** Used inside the booking transaction. */
export function findUnavailableDays(
  db: Database.Database,
  area: TestArea,
  start: string,
  end: string,
): UnavailableRow[] {
  return db.prepare(UNAVAILABLE_DAYS_SQL).all({
    start,
    end,
    area_id: area.id,
    location_id: area.location_id,
    capacity: area.daily_capacity,
  }) as UnavailableRow[];
}
