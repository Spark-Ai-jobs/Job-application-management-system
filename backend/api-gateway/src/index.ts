import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import dotenv from 'dotenv';

import { db } from './config/database.js';
import { redis } from './config/redis.js';
import { initMinio } from './config/minio.js';
import { errorHandler } from './middleware/errorHandler.js';
import { authRouter } from './routes/auth.routes.js';
import { jobsRouter } from './routes/jobs.routes.js';
import { candidatesRouter } from './routes/candidates.routes.js';
import { tasksRouter } from './routes/tasks.routes.js';
import { employeesRouter } from './routes/employees.routes.js';
import { analyticsRouter } from './routes/analytics.routes.js';
import { setupWebSocket } from './websocket/server.js';
import { startTaskAssigner } from './workers/taskAssigner.js';
import { startTimeoutChecker } from './workers/timeoutChecker.js';

dotenv.config();

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: { error: 'Too many requests, please try again later.' },
});
app.use(limiter);

// Request parsing & logging
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('combined'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'spark-ai-api-gateway',
    version: '1.0.0'
  });
});

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/jobs', jobsRouter);
app.use('/api/candidates', candidatesRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/employees', employeesRouter);
app.use('/api/analytics', analyticsRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use(errorHandler);

// Initialize services and start server
async function startServer() {
  try {
    // Test database connection
    const dbResult = await db.query('SELECT NOW()');
    console.log('✅ PostgreSQL connected:', dbResult.rows[0].now);

    // Test Redis connection
    await redis.ping();
    console.log('✅ Redis connected');

    // Initialize MinIO
    await initMinio();
    console.log('✅ MinIO initialized');

    // Setup WebSocket server
    const wss = new WebSocketServer({ server, path: '/ws' });
    setupWebSocket(wss);
    console.log('✅ WebSocket server ready');

    // Start background workers
    startTaskAssigner();
    console.log('✅ Task assigner worker started');

    startTimeoutChecker();
    console.log('✅ Timeout checker worker started');

    // Start HTTP server
    server.listen(PORT, () => {
      console.log(`
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║   ⚡ SPARK.AI API Gateway                             ║
║                                                       ║
║   Server running on port ${PORT}                        ║
║   Environment: ${process.env.NODE_ENV || 'development'}                       ║
║                                                       ║
║   Endpoints:                                          ║
║   • REST API:    http://localhost:${PORT}/api          ║
║   • WebSocket:   ws://localhost:${PORT}/ws             ║
║   • Health:      http://localhost:${PORT}/health       ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

startServer();
