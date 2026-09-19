import express from 'express';
import cors from 'cors';
import { API_PREFIX } from '../config/constants';
import { env } from '../config/env';
import healthRoutes from '../routes/health.routes';
import { errorHandler } from '../middleware/error.middleware';

export function createApp(): express.Application {
  const app = express();

  const allowedOrigins = [
    env.frontendUrl,
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
  ].filter(Boolean);

  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like health-checks, curl, mobile apps)
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) !== -1 || env.nodeEnv === 'development') {
        return callback(null, true);
      }
      return callback(new Error('Blocked by CORS policy'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  }));
  app.use(express.json({ limit: '15mb' }));
  app.use(express.urlencoded({ extended: true, limit: '15mb' }));

  // Routes
  app.use(API_PREFIX, healthRoutes);

  // Fallback 404
  app.use((_req: express.Request, res: express.Response) => {
    res.status(404).json({ success: false, error: 'Endpoint not found' });
  });

  // Global Error Handler
  app.use(errorHandler);

  return app;
}
