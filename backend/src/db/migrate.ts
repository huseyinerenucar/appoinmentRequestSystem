import { readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDb, closeDb } from './connection.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function appliedVersions(db: ReturnType<typeof getDb>): Set<number> {
  db.exec(`CREATE TABLE IF NOT EXISTS schema_version (
    version INTEGER PRIMARY KEY,
    applied_at INTEGER NOT NULL
  )`);
  const rows = db.prepare('SELECT version FROM schema_version').all() as { version: number }[];
  return new Set(rows.map((r) => r.version));
}

function run(): void {
  const db = getDb();
  const applied = appliedVersions(db);

  const migrationsDir = resolve(__dirname, 'migrations');
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const version = Number(file.split('_', 1)[0]);
    if (Number.isNaN(version)) continue;
    if (applied.has(version)) {
      console.log(`[migrate] skip ${file} (already applied)`);
      continue;
    }
    const sql = readFileSync(join(migrationsDir, file), 'utf8');
    console.log(`[migrate] applying ${file}`);
    db.exec('BEGIN');
    try {
      db.exec(sql);
      db.prepare('INSERT INTO schema_version (version, applied_at) VALUES (?, ?)').run(
        version,
        Date.now(),
      );
      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  }

  // Seed is idempotent (INSERT OR IGNORE).
  const seedPath = resolve(__dirname, 'seed.sql');
  const seed = readFileSync(seedPath, 'utf8');
  db.exec(seed);
  console.log('[migrate] seed applied');

  closeDb();
}

run();
