import type { NextFunction, Request, Response } from 'express';
import {
  BlacklistError,
  ConflictError,
  ValidationError,
} from '../db/transaction.js';

export function notFound(_req: Request, res: Response): void {
  res.status(404).json({ error: 'not_found' });
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ConflictError) {
    res.status(409).json({ error: 'conflict', message: err.message, details: err.details });
    return;
  }
  if (err instanceof BlacklistError) {
    res.status(409).json({ error: 'blacklisted', message: err.message, details: err.details });
    return;
  }
  if (err instanceof ValidationError) {
    res.status(400).json({ error: 'validation', message: err.message });
    return;
  }
  if (err instanceof Error) {
    // eslint-disable-next-line no-console
    console.error('[error]', err);
    res.status(500).json({ error: 'internal', message: err.message });
    return;
  }
  res.status(500).json({ error: 'internal', message: 'unknown error' });
}
