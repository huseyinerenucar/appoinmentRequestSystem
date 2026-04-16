import type Database from 'better-sqlite3';

export class ConflictError extends Error {
  readonly code = 'CONFLICT';
  constructor(
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
  }
}

export class BlacklistError extends Error {
  readonly code = 'BLACKLISTED';
  constructor(
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
  }
}

export class ValidationError extends Error {
  readonly code = 'VALIDATION';
  constructor(message: string) {
    super(message);
  }
}

type SqliteError = Error & { code?: string };

const BUSY_CODES = new Set(['SQLITE_BUSY', 'SQLITE_BUSY_SNAPSHOT', 'SQLITE_LOCKED']);

function isBusy(err: unknown): err is SqliteError {
  return !!err && typeof err === 'object' && BUSY_CODES.has((err as SqliteError).code ?? '');
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export interface ImmediateTxOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
}

/**
 * Runs `fn` inside a BEGIN IMMEDIATE transaction so the write lock is acquired
 * before any capacity check, closing the TOCTOU window.  SQLITE_BUSY errors
 * are retried with exponential backoff + jitter.
 */
export async function runImmediate<T>(
  db: Database.Database,
  fn: (db: Database.Database) => T,
  opts: ImmediateTxOptions = {},
): Promise<T> {
  const maxAttempts = opts.maxAttempts ?? 8;
  const baseDelay = opts.baseDelayMs ?? 10;
  const maxDelay = opts.maxDelayMs ?? 500;

  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    attempt++;
    try {
      db.exec('BEGIN IMMEDIATE');
      try {
        const result = fn(db);
        db.exec('COMMIT');
        return result;
      } catch (inner) {
        try {
          db.exec('ROLLBACK');
        } catch {
          /* ignore rollback failure */
        }
        throw inner;
      }
    } catch (err) {
      if (isBusy(err) && attempt < maxAttempts) {
        const delay = Math.min(maxDelay, baseDelay * 2 ** (attempt - 1));
        const jitter = Math.floor(Math.random() * (delay / 2));
        await sleep(delay + jitter);
        continue;
      }
      throw err;
    }
  }
}
