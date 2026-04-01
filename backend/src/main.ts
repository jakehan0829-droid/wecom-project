import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from './infra/config/env.js';
import { db } from './infra/db/pg.js';
import { router } from './routes.js';
import { errorHandler } from './shared/middleware/error-handler.js';
import { notFoundHandler } from './shared/middleware/not-found.js';

async function bootstrap() {
  const app = express();
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const frontendDist = path.resolve(__dirname, '../../frontend/dist');
  app.use(['/api/v1/wecom/webhook', '/api/wecom/callback'], express.text({ type: '*/*' }));
  app.use(express.json());
  app.use((req, _res, next) => {
    if ((req.path === '/api/v1/wecom/webhook' || req.path === '/api/wecom/callback') && typeof req.body === 'string') {
      req.body = { body: req.body };
    }
    next();
  });
  app.use(router);
  app.use(express.static(frontendDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    return res.sendFile(path.join(frontendDist, 'index.html'));
  });
  app.use(notFoundHandler);
  app.use(errorHandler);

  try {
    await db.query('select 1');
    console.log('[db] connected');
  } catch (err) {
    console.error('[db] connection failed', err);
  }

  app.listen(env.appPort, env.appHost, () => {
    console.log(`[bootstrap] ${env.appName} listening on ${env.appHost}:${env.appPort}`);
  });
}

bootstrap();
