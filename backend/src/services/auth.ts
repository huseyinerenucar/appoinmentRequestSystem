import { randomBytes } from 'node:crypto';
import { getDb } from '../db/connection.js';
import { ValidationError } from '../db/transaction.js';
import type { User } from '../types.js';
import { authenticateCorporate } from './corporateAuth.js';

export class AuthError extends Error {
  readonly code = 'AUTH';
  constructor(
    message: string,
    readonly status = 401,
  ) {
    super(message);
  }
}

const SESSION_TTL_MS =
  Number(process.env.SESSION_TTL_HOURS ?? '12') * 60 * 60 * 1000;

function newToken(): string {
  return randomBytes(32).toString('hex');
}

function upsertUser(username: string, fullName?: string): User {
  const db = getDb();
  const existing = db
    .prepare('SELECT * FROM users WHERE username = ?')
    .get(username) as User | undefined;

  if (existing) {
    if (!existing.is_active) {
      throw new AuthError('Hesap devre dışı', 403);
    }
    if (fullName && fullName !== existing.full_name) {
      db.prepare('UPDATE users SET full_name = ? WHERE id = ?').run(
        fullName,
        existing.id,
      );
      existing.full_name = fullName;
    }
    return existing;
  }

  // First login for an unknown user → create with default role 'user'.
  const info = db
    .prepare(
      `INSERT INTO users (username, full_name, role) VALUES (?, ?, 'user')`,
    )
    .run(username, fullName ?? null);
  return db
    .prepare('SELECT * FROM users WHERE id = ?')
    .get(Number(info.lastInsertRowid)) as User;
}

export interface LoginResult {
  token: string;
  expiresAt: number;
  user: User;
}

export async function login(
  username: string,
  password: string,
): Promise<LoginResult> {
  if (!username?.trim() || !password) {
    throw new ValidationError('Kullanıcı adı ve şifre zorunludur');
  }

  const corp = await authenticateCorporate(username.trim(), password);
  if (!corp.ok) throw new AuthError('Kullanıcı adı veya şifre hatalı');

  const user = upsertUser(username.trim(), corp.fullName);

  const now = Date.now();
  const expiresAt = now + SESSION_TTL_MS;
  const token = newToken();

  const db = getDb();
  db.prepare(
    `INSERT INTO sessions (token, user_id, created_at, expires_at)
     VALUES (?, ?, ?, ?)`,
  ).run(token, user.id, now, expiresAt);
  db.prepare('UPDATE users SET last_login_at = ? WHERE id = ?').run(
    now,
    user.id,
  );
  // Opportunistic cleanup of expired sessions.
  db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(now);

  return { token, expiresAt, user };
}

export function resolveSession(
  token: string,
): { user: User; expiresAt: number } | null {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT s.token, s.expires_at, u.*
         FROM sessions s
         JOIN users u ON u.id = s.user_id
        WHERE s.token = ?`,
    )
    .get(token) as
    | (User & { token: string; expires_at: number })
    | undefined;

  if (!row) return null;
  if (row.expires_at < Date.now() || !row.is_active) {
    db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
    return null;
  }
  const { token: _t, expires_at, ...user } = row;
  void _t;
  return { user: user as User, expiresAt: expires_at };
}

export function logout(token: string): void {
  getDb().prepare('DELETE FROM sessions WHERE token = ?').run(token);
}
