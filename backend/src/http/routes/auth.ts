import { Router } from 'express';
import { z } from 'zod';
import { ValidationError } from '../../db/transaction.js';
import { login, logout } from '../../services/auth.js';
import { requireAuth } from '../middleware/auth.js';

export const authRouter = Router();

const loginBody = z.object({
  username: z.string().min(1).max(120),
  password: z.string().min(1).max(200),
});

authRouter.post('/login', async (req, res, next) => {
  try {
    const parsed = loginBody.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]!.message);
    }
    const result = await login(parsed.data.username, parsed.data.password);
    res.json({
      token: result.token,
      expiresAt: result.expiresAt,
      user: result.user,
    });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/logout', requireAuth, (req, res) => {
  if (req.sessionToken) logout(req.sessionToken);
  res.json({ ok: true });
});

authRouter.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});
