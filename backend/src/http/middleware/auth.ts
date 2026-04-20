import type { NextFunction, Request, Response } from 'express';
import { AuthError, resolveSession } from '../../services/auth.js';
import type { User, UserRole } from '../../types.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: User;
      sessionToken?: string;
    }
  }
}

function extractToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7).trim();
  return null;
}

export function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const token = extractToken(req);
  if (!token) return next(new AuthError('Oturum bulunamadı'));

  const resolved = resolveSession(token);
  if (!resolved) return next(new AuthError('Oturum geçersiz veya süresi dolmuş'));

  req.user = resolved.user;
  req.sessionToken = token;
  next();
}

export function requireRole(role: UserRole) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) return next(new AuthError('Oturum bulunamadı'));
    if (req.user.role !== role) {
      return next(new AuthError('Bu işlem için yetkiniz yok', 403));
    }
    next();
  };
}
