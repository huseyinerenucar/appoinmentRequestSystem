import { Router } from 'express';
import { z } from 'zod';
import { getDb } from '../../db/connection.js';
import { ValidationError } from '../../db/transaction.js';
import type {
  BlacklistDate,
  Location,
  TestArea,
  TestCategory,
} from '../../types.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

export const adminRouter = Router();
adminRouter.use(requireAuth, requireRole('admin'));

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD bekleniyor');

// ---------- Locations ----------
const locationBody = z.object({
  name: z.string().min(1).max(120),
  timezone: z.string().min(1).max(60),
});

adminRouter.get('/locations', (_req, res) => {
  const rows = getDb().prepare('SELECT * FROM locations ORDER BY name').all();
  res.json(rows as Location[]);
});

adminRouter.post('/locations', (req, res, next) => {
  try {
    const p = locationBody.safeParse(req.body);
    if (!p.success) throw new ValidationError(p.error.issues[0]!.message);
    const info = getDb()
      .prepare('INSERT INTO locations (name, timezone) VALUES (?, ?)')
      .run(p.data.name, p.data.timezone);
    const row = getDb()
      .prepare('SELECT * FROM locations WHERE id = ?')
      .get(Number(info.lastInsertRowid));
    res.status(201).json(row);
  } catch (err) {
    next(err);
  }
});

adminRouter.put('/locations/:id', (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const p = locationBody.safeParse(req.body);
    if (!p.success) throw new ValidationError(p.error.issues[0]!.message);
    getDb()
      .prepare('UPDATE locations SET name = ?, timezone = ? WHERE id = ?')
      .run(p.data.name, p.data.timezone, id);
    const row = getDb().prepare('SELECT * FROM locations WHERE id = ?').get(id);
    if (!row) throw new ValidationError('Lokasyon bulunamadı');
    res.json(row);
  } catch (err) {
    next(err);
  }
});

adminRouter.delete('/locations/:id', (req, res, next) => {
  try {
    getDb().prepare('DELETE FROM locations WHERE id = ?').run(Number(req.params.id));
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// ---------- Categories ----------
const categoryBody = z.object({
  name: z.string().min(1).max(120),
  sort_order: z.number().int().optional(),
});

adminRouter.get('/categories', (_req, res) => {
  const rows = getDb()
    .prepare('SELECT * FROM test_categories ORDER BY sort_order, name')
    .all();
  res.json(rows as TestCategory[]);
});

adminRouter.post('/categories', (req, res, next) => {
  try {
    const p = categoryBody.safeParse(req.body);
    if (!p.success) throw new ValidationError(p.error.issues[0]!.message);
    const info = getDb()
      .prepare('INSERT INTO test_categories (name, sort_order) VALUES (?, ?)')
      .run(p.data.name, p.data.sort_order ?? 0);
    const row = getDb()
      .prepare('SELECT * FROM test_categories WHERE id = ?')
      .get(Number(info.lastInsertRowid));
    res.status(201).json(row);
  } catch (err) {
    next(err);
  }
});

adminRouter.put('/categories/:id', (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const p = categoryBody.safeParse(req.body);
    if (!p.success) throw new ValidationError(p.error.issues[0]!.message);
    getDb()
      .prepare(
        'UPDATE test_categories SET name = ?, sort_order = ? WHERE id = ?',
      )
      .run(p.data.name, p.data.sort_order ?? 0, id);
    const row = getDb()
      .prepare('SELECT * FROM test_categories WHERE id = ?')
      .get(id);
    if (!row) throw new ValidationError('Kategori bulunamadı');
    res.json(row);
  } catch (err) {
    next(err);
  }
});

adminRouter.delete('/categories/:id', (req, res, next) => {
  try {
    getDb()
      .prepare('DELETE FROM test_categories WHERE id = ?')
      .run(Number(req.params.id));
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// ---------- Test Areas (incl. capacity) ----------
const areaBody = z.object({
  category_id: z.number().int().positive(),
  location_id: z.number().int().positive(),
  name: z.string().min(1).max(120),
  daily_capacity: z.number().int().min(1).max(100),
  min_days: z.number().int().min(1).max(365),
  max_days: z.number().int().min(1).max(365),
  is_active: z.number().int().min(0).max(1).optional(),
});

adminRouter.get('/areas', (_req, res) => {
  const rows = getDb().prepare('SELECT * FROM test_areas ORDER BY name').all();
  res.json(rows as TestArea[]);
});

adminRouter.post('/areas', (req, res, next) => {
  try {
    const p = areaBody.safeParse(req.body);
    if (!p.success) throw new ValidationError(p.error.issues[0]!.message);
    if (p.data.min_days > p.data.max_days) {
      throw new ValidationError('min_days max_days değerinden büyük olamaz');
    }
    const info = getDb()
      .prepare(
        `INSERT INTO test_areas
          (category_id, location_id, name, daily_capacity, min_days, max_days, is_active)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        p.data.category_id,
        p.data.location_id,
        p.data.name,
        p.data.daily_capacity,
        p.data.min_days,
        p.data.max_days,
        p.data.is_active ?? 1,
      );
    const row = getDb()
      .prepare('SELECT * FROM test_areas WHERE id = ?')
      .get(Number(info.lastInsertRowid));
    res.status(201).json(row);
  } catch (err) {
    next(err);
  }
});

adminRouter.put('/areas/:id', (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const p = areaBody.safeParse(req.body);
    if (!p.success) throw new ValidationError(p.error.issues[0]!.message);
    if (p.data.min_days > p.data.max_days) {
      throw new ValidationError('min_days max_days değerinden büyük olamaz');
    }
    getDb()
      .prepare(
        `UPDATE test_areas SET
            category_id = ?, location_id = ?, name = ?,
            daily_capacity = ?, min_days = ?, max_days = ?, is_active = ?
          WHERE id = ?`,
      )
      .run(
        p.data.category_id,
        p.data.location_id,
        p.data.name,
        p.data.daily_capacity,
        p.data.min_days,
        p.data.max_days,
        p.data.is_active ?? 1,
        id,
      );
    const row = getDb().prepare('SELECT * FROM test_areas WHERE id = ?').get(id);
    if (!row) throw new ValidationError('Test alanı bulunamadı');
    res.json(row);
  } catch (err) {
    next(err);
  }
});

adminRouter.delete('/areas/:id', (req, res, next) => {
  try {
    getDb()
      .prepare('DELETE FROM test_areas WHERE id = ?')
      .run(Number(req.params.id));
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// ---------- Blacklist ----------
const blacklistBody = z.object({
  test_area_id: z.number().int().positive().nullable(),
  location_id: z.number().int().positive().nullable(),
  date: isoDate,
  reason: z.string().max(400).optional().nullable(),
});

adminRouter.get('/blacklist', (_req, res) => {
  const rows = getDb()
    .prepare('SELECT * FROM blacklist_dates ORDER BY date DESC, id DESC')
    .all();
  res.json(rows as BlacklistDate[]);
});

adminRouter.post('/blacklist', (req, res, next) => {
  try {
    const p = blacklistBody.safeParse(req.body);
    if (!p.success) throw new ValidationError(p.error.issues[0]!.message);
    const info = getDb()
      .prepare(
        `INSERT INTO blacklist_dates (test_area_id, location_id, date, reason)
         VALUES (?, ?, ?, ?)`,
      )
      .run(
        p.data.test_area_id,
        p.data.location_id,
        p.data.date,
        p.data.reason ?? null,
      );
    const row = getDb()
      .prepare('SELECT * FROM blacklist_dates WHERE id = ?')
      .get(Number(info.lastInsertRowid));
    res.status(201).json(row);
  } catch (err) {
    next(err);
  }
});

adminRouter.delete('/blacklist/:id', (req, res, next) => {
  try {
    getDb()
      .prepare('DELETE FROM blacklist_dates WHERE id = ?')
      .run(Number(req.params.id));
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// ---------- Users ----------
const userPatch = z.object({
  role: z.enum(['admin', 'user']).optional(),
  is_active: z.number().int().min(0).max(1).optional(),
});

adminRouter.get('/users', (_req, res) => {
  const rows = getDb()
    .prepare('SELECT * FROM users ORDER BY username')
    .all();
  res.json(rows);
});

adminRouter.patch('/users/:id', (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const p = userPatch.safeParse(req.body);
    if (!p.success) throw new ValidationError(p.error.issues[0]!.message);
    const sets: string[] = [];
    const params: (string | number)[] = [];
    if (p.data.role !== undefined) {
      sets.push('role = ?');
      params.push(p.data.role);
    }
    if (p.data.is_active !== undefined) {
      sets.push('is_active = ?');
      params.push(p.data.is_active);
    }
    if (sets.length === 0) throw new ValidationError('Güncellenecek alan yok');
    params.push(id);
    getDb()
      .prepare(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`)
      .run(...params);
    const row = getDb().prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!row) throw new ValidationError('Kullanıcı bulunamadı');
    res.json(row);
  } catch (err) {
    next(err);
  }
});
