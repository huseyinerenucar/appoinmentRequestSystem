import cors from 'cors';
import express from 'express';
import { getDb } from './db/connection.js';
import { errorHandler, notFound } from './http/errors.js';
import { router } from './http/routes.js';

export function buildApp() {
  const app = express();
  app.use(
    cors({
      origin: process.env.CORS_ORIGIN ?? '*',
      allowedHeaders: ['Content-Type', 'Authorization'],
    }),
  );
  app.use(express.json({ limit: '256kb' }));

  app.get('/health', (_req, res) => res.json({ ok: true }));
  app.use('/api', router);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}

function main(): void {
  getDb(); // eager initialize + WAL pragmas
  const port = Number(process.env.PORT ?? 4000);
  const app = buildApp();
  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`[server] listening on http://localhost:${port}`);
  });
}

// Only auto-start if invoked directly (not when imported by tests).
const entry = process.argv[1] ?? '';
if (entry.endsWith('server.ts') || entry.endsWith('server.js')) {
  main();
}
