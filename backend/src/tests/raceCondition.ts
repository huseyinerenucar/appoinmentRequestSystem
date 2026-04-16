/**
 * Race-condition test: fires N concurrent createBooking calls against an area
 * whose daily_capacity is 1 and a single contested day. Asserts that exactly
 * one call succeeds and the rest are rejected with ConflictError.
 *
 * Run with: npm run test:race
 */
import { closeDb, getDb } from '../db/connection.js';
import { ConflictError } from '../db/transaction.js';
import { createBooking } from '../services/bookings.js';

const CONCURRENCY = 5;
const AREA_ID = 1;                   // capacity = 1 in seed
const TEST_DATE = '2099-06-15';      // far future, unlikely to clash with seed

function cleanup(): void {
  const db = getDb();
  db.prepare(
    `DELETE FROM appointments
      WHERE test_area_id = ? AND start_date = ? AND end_date = ?`,
  ).run(AREA_ID, TEST_DATE, TEST_DATE);
  db.prepare(`DELETE FROM projects WHERE name LIKE 'race-test-%'`).run();
}

async function runOne(i: number): Promise<'ok' | 'conflict' | 'error'> {
  try {
    await createBooking({
      testAreaId: AREA_ID,
      projectName: `race-test-${i}`,
      startDate: TEST_DATE,
      endDate: TEST_DATE,
    });
    return 'ok';
  } catch (err) {
    if (err instanceof ConflictError) return 'conflict';
    // eslint-disable-next-line no-console
    console.error(`[race] unexpected error for attempt ${i}:`, err);
    return 'error';
  }
}

async function main(): Promise<void> {
  getDb();
  cleanup();

  const results = await Promise.all(
    Array.from({ length: CONCURRENCY }, (_, i) => runOne(i)),
  );

  const ok = results.filter((r) => r === 'ok').length;
  const conflicts = results.filter((r) => r === 'conflict').length;
  const errors = results.filter((r) => r === 'error').length;

  // eslint-disable-next-line no-console
  console.log(
    `[race] concurrency=${CONCURRENCY}  ok=${ok}  conflict=${conflicts}  error=${errors}`,
  );

  const pass = ok === 1 && conflicts === CONCURRENCY - 1 && errors === 0;
  if (!pass) {
    cleanup();
    closeDb();
    console.error('[race] FAIL — expected exactly 1 ok and N-1 conflicts');
    process.exit(1);
  }

  cleanup();
  closeDb();
  console.log('[race] PASS');
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
