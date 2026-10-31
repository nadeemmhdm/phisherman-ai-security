import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDatabase } from './db/database.js';
import { ollamaRouter } from './routes/ollamaRoutes.js';
import { chatRouter } from './routes/chatRoutes.js';
import { analysisRouter } from './routes/analysisRoutes.js';
import { emailRouter } from './routes/emailRoutes.js';
import { settingsRouter } from './routes/settingsRoutes.js';
import { exportRouter } from './routes/exportRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 5000;
const HOST = process.env.HOST || '127.0.0.1'; // Localhost-only binding by default for security

// Middleware
app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    app: 'PhisherMan - Local AI Email Security Assistant',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Modular Routes
app.use('/api/ollama', ollamaRouter);
app.use('/api', chatRouter);
app.use('/api/analyses', analysisRouter);
app.use('/api/email', emailRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/export', exportRouter);

// Global Error Handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({
    error: err.message || 'Internal server error',
  });
});

async function startServer() {
  try {
    await initDatabase();
    app.listen(PORT, HOST, () => {
      console.log(`[PhisherMan Server] Running at http://${HOST}:${PORT}`);
      console.log(`[PhisherMan Server] Connected to SQLite database.`);
    });
  } catch (err: any) {
    console.error('Failed to initialize database or start server:', err);
    process.exit(1);
  }
}

startServer();
