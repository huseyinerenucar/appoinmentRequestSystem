import Database from 'better-sqlite3';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const DB_FILE = resolve(process.env.DB_FILE ?? './data/app.db');

let instance: Database.Database | null = null;

export function getDb(): Database.Database {
  if (instance) return instance;

  const dir = dirname(DB_FILE);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  const db = new Database(DB_FILE);

  // WAL lets readers proceed while a writer holds the lock.
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('foreign_keys = ON');
  // busy_timeout is a safety net; our retry wrapper handles most contention.
  db.pragma('busy_timeout = 5000');

  instance = db;
  return db;
}

export function closeDb(): void {
  if (instance) {
    instance.close();
    instance = null;
  }
}
