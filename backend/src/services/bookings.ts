import type Database from 'better-sqlite3';
import { getDb } from '../db/connection.js';
import {
  BlacklistError,
  ConflictError,
  ValidationError,
  runImmediate,
} from '../db/transaction.js';
import { daysBetween } from '../lib/dates.js';
import type { Appointment } from '../types.js';
import { findUnavailableDays, getAreaOrThrow } from './availability.js';

export interface CreateBookingInput {
  testAreaId: number;
  projectName: string;
  projectOwner?: string | null;
  startDate: string;
  endDate: string;
  notes?: string | null;
  createdByUserId?: number | null;
}

export interface CreateBookingResult {
  appointment: Appointment;
}

function upsertProject(
  db: Database.Database,
  name: string,
  owner: string | null,
): number {
  const existing = db
    .prepare('SELECT id FROM projects WHERE name = ?')
    .get(name) as { id: number } | undefined;
  if (existing) return existing.id;
  const info = db
    .prepare('INSERT INTO projects (name, owner) VALUES (?, ?)')
    .run(name, owner);
  return Number(info.lastInsertRowid);
}

/**
 * Atomically books a project into a test area.  The capacity check and the
 * insert run in the same BEGIN IMMEDIATE transaction — concurrent callers
 * serialize on the write lock so no two can both observe "1 slot free".
 */
export async function createBooking(
  input: CreateBookingInput,
): Promise<CreateBookingResult> {
  const db = getDb();

  if (!input.projectName?.trim()) {
    throw new ValidationError('projectName is required');
  }
  if (!input.startDate || !input.endDate) {
    throw new ValidationError('startDate and endDate are required');
  }
  if (input.startDate > input.endDate) {
    throw new ValidationError('startDate must be <= endDate');
  }

  return runImmediate(db, (txDb) => {
    const area = getAreaOrThrow(txDb, input.testAreaId);

    const durationDays = daysBetween(input.startDate, input.endDate);
    if (durationDays < area.min_days) {
      throw new ValidationError(
        `Duration ${durationDays} day(s) is below minimum ${area.min_days}`,
      );
    }
    if (durationDays > area.max_days) {
      throw new ValidationError(
        `Duration ${durationDays} day(s) exceeds maximum ${area.max_days}`,
      );
    }

    const unavailable = findUnavailableDays(
      txDb,
      area,
      input.startDate,
      input.endDate,
    );
    if (unavailable.length > 0) {
      const blacklisted = unavailable.filter((r) => r.blacklisted === 1);
      const full = unavailable.filter(
        (r) => r.blacklisted === 0 && r.booked >= area.daily_capacity,
      );
      if (blacklisted.length > 0) {
        throw new BlacklistError('Requested range includes blacklisted date(s)', {
          dates: blacklisted.map((r) => r.date),
        });
      }
      throw new ConflictError('Requested range has no capacity on some days', {
        dates: full.map((r) => ({ date: r.date, booked: r.booked })),
        capacity: area.daily_capacity,
      });
    }

    const projectId = upsertProject(
      txDb,
      input.projectName.trim(),
      input.projectOwner?.trim() || null,
    );

    const info = txDb
      .prepare(
        `INSERT INTO appointments
          (test_area_id, project_id, start_date, end_date, status, notes, created_by_user_id)
         VALUES (?, ?, ?, ?, 'confirmed', ?, ?)`,
      )
      .run(
        area.id,
        projectId,
        input.startDate,
        input.endDate,
        input.notes ?? null,
        input.createdByUserId ?? null,
      );

    const appointment = txDb
      .prepare('SELECT * FROM appointments WHERE id = ?')
      .get(Number(info.lastInsertRowid)) as Appointment;

    return { appointment };
  });
}

export function listBookings(
  testAreaId: number,
  from?: string,
  to?: string,
): Appointment[] {
  const db = getDb();
  const filters: string[] = ['test_area_id = ?'];
  const params: (string | number)[] = [testAreaId];
  if (from) {
    filters.push('end_date >= ?');
    params.push(from);
  }
  if (to) {
    filters.push('start_date <= ?');
    params.push(to);
  }
  const sql = `SELECT * FROM appointments
                WHERE ${filters.join(' AND ')}
                ORDER BY start_date`;
  return db.prepare(sql).all(...params) as Appointment[];
}
