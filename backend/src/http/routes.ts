import { Router } from 'express';
import { z } from 'zod';
import { getDb } from '../db/connection.js';
import { ValidationError } from '../db/transaction.js';
import { fetchAvailability, getAreaOrThrow } from '../services/availability.js';
import { createBooking, listBookings } from '../services/bookings.js';
import { getHierarchy } from '../services/hierarchy.js';

export const router = Router();

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'must be YYYY-MM-DD');

router.get('/hierarchy', (_req, res) => {
  res.json(getHierarchy());
});

const availabilityQuery = z.object({
  testAreaId: z.coerce.number().int().positive(),
  start: isoDate,
  end: isoDate,
});

router.get('/availability', (req, res, next) => {
  try {
    const parsed = availabilityQuery.safeParse(req.query);
    if (!parsed.success) throw new ValidationError(parsed.error.issues[0]!.message);
    const { testAreaId, start, end } = parsed.data;
    const db = getDb();
    const area = getAreaOrThrow(db, testAreaId);
    const days = fetchAvailability(db, area, start, end);
    res.json({ area, days });
  } catch (err) {
    next(err);
  }
});

const bookingBody = z.object({
  testAreaId: z.number().int().positive(),
  projectName: z.string().min(1).max(200),
  projectOwner: z.string().max(200).nullish(),
  startDate: isoDate,
  endDate: isoDate,
  notes: z.string().max(2000).nullish(),
});

router.post('/bookings', async (req, res, next) => {
  try {
    const parsed = bookingBody.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.issues[0]!.message);
    const result = await createBooking(parsed.data);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

const listQuery = z.object({
  testAreaId: z.coerce.number().int().positive(),
  from: isoDate.optional(),
  to: isoDate.optional(),
});

router.get('/bookings', (req, res, next) => {
  try {
    const parsed = listQuery.safeParse(req.query);
    if (!parsed.success) throw new ValidationError(parsed.error.issues[0]!.message);
    const { testAreaId, from, to } = parsed.data;
    res.json({ bookings: listBookings(testAreaId, from, to) });
  } catch (err) {
    next(err);
  }
});
