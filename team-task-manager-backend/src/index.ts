import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import { connectDb } from './lib/db.js';
import authRoutes from './routes/auth.js';
import projectRoutes from './routes/projects.js';
import taskRoutes from './routes/tasks.js';


dotenv.config();

const app = express();

const defaultCorsOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173'];
const corsOrigins = (process.env.CORS_ORIGIN ?? defaultCorsOrigins.join(','))
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin || corsOrigins.includes('*') || corsOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error(`CORS origin not allowed: ${origin}`));
  },
  credentials: true
}));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/', (_req, res) => {
  res.json({
    name: 'Team Task Manager API',
    ok: true,
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      projects: '/api/projects',
      tasks: '/api/tasks',
    },
  });
});

let dbReady = false;

// Basic db-aware middleware so API stays alive for demo even if Mongo is down
app.use((req, res, next) => {
  if (req.path.startsWith('/api/') && !dbReady) {
    return res.status(503).json({ message: 'Database unavailable' });
  }
  return next();
});

app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  // eslint-disable-next-line no-console
  console.error('Unhandled API error', err);
  return res.status(500).json({ message: 'Internal server error' });
});


const port = Number(process.env.PORT ?? 5000);

connectDb()
  .then(() => {
    dbReady = true;
    app.listen(port, '0.0.0.0', () => {
      // eslint-disable-next-line no-console
      console.log(`API listening on port ${port}`);
    });
  })
  .catch((err: unknown) => {
    // eslint-disable-next-line no-console
    console.error('DB connection failed', err);

    app.listen(port, '0.0.0.0', () => {
      // eslint-disable-next-line no-console
      console.log(`API listening on port ${port} (DB not ready)`);
    });
  });


