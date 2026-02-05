import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../config/database.js';
import { redis } from '../config/redis.js';
import {
  authenticate,
  generateToken,
  AuthenticatedRequest,
  JwtPayload,
} from '../middleware/auth.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';

export const authRouter = Router();

interface Employee {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  role: 'admin' | 'manager' | 'employee';
  status: string;
  avatar_url: string | null;
  tasks_completed: number;
  warnings: number;
  violations: number;
  average_completion_time_seconds: number | null;
  current_task_id: string | null;
}

// POST /api/auth/login
authRouter.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new AppError('Email and password are required', 400);
  }

  // Find employee by email
  const result = await db.query<Employee>(
    'SELECT * FROM employees WHERE email = $1',
    [email.toLowerCase()]
  );

  const employee = result.rows[0];

  if (!employee) {
    throw new AppError('Invalid credentials', 401);
  }

  // Verify password
  const isValidPassword = await bcrypt.compare(password, employee.password_hash);

  if (!isValidPassword) {
    throw new AppError('Invalid credentials', 401);
  }

  // Generate JWT token
  const payload: JwtPayload = {
    userId: employee.id,
    email: employee.email,
    role: employee.role,
  };

  const token = generateToken(payload);

  // Update last heartbeat and set status to available
  await db.query(
    `UPDATE employees
     SET last_heartbeat = NOW(), status = 'available'
     WHERE id = $1`,
    [employee.id]
  );

  // Store session in Redis (for tracking active users)
  await redis.setJSON(`session:${employee.id}`, {
    token,
    loginAt: new Date().toISOString(),
    userAgent: req.headers['user-agent'],
  }, 7 * 24 * 60 * 60); // 7 days

  // Add to online users set
  await redis.sadd('online_users', employee.id);

  res.json({
    token,
    user: {
      id: employee.id,
      email: employee.email,
      name: employee.name,
      role: employee.role,
      status: 'available',
      avatarUrl: employee.avatar_url,
      tasksCompleted: employee.tasks_completed,
      warnings: employee.warnings,
      violations: employee.violations,
    },
  });
}));

// POST /api/auth/logout
authRouter.post('/logout', authenticate, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.user!.userId;

  // Update status to offline
  await db.query(
    `UPDATE employees SET status = 'offline' WHERE id = $1`,
    [userId]
  );

  // Remove from online users
  await redis.srem('online_users', userId);

  // Delete session
  await redis.del(`session:${userId}`);

  res.json({ message: 'Logged out successfully' });
}));

// GET /api/auth/me
authRouter.get('/me', authenticate, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.user!.userId;

  const result = await db.query<Employee>(
    `SELECT id, email, name, role, status, avatar_url, tasks_completed,
            warnings, violations, average_completion_time_seconds, current_task_id
     FROM employees WHERE id = $1`,
    [userId]
  );

  const employee = result.rows[0];

  if (!employee) {
    throw new AppError('User not found', 404);
  }

  // Update heartbeat
  await db.query(
    'UPDATE employees SET last_heartbeat = NOW() WHERE id = $1',
    [userId]
  );

  res.json({
    id: employee.id,
    email: employee.email,
    name: employee.name,
    role: employee.role,
    status: employee.status,
    avatarUrl: employee.avatar_url,
    tasksCompleted: employee.tasks_completed,
    warnings: employee.warnings,
    violations: employee.violations,
    averageCompletionTime: employee.average_completion_time_seconds,
    currentTaskId: employee.current_task_id,
  });
}));

// PUT /api/auth/presence
authRouter.put('/presence', authenticate, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.user!.userId;
  const { status } = req.body;

  if (!['available', 'busy', 'offline'].includes(status)) {
    throw new AppError('Invalid status. Must be: available, busy, or offline', 400);
  }

  // Don't allow setting to available if employee has current task
  if (status === 'available') {
    const taskCheck = await db.query(
      'SELECT current_task_id FROM employees WHERE id = $1',
      [userId]
    );
    if (taskCheck.rows[0]?.current_task_id) {
      throw new AppError('Cannot set status to available while task is assigned', 400);
    }
  }

  await db.query(
    `UPDATE employees SET status = $1, last_heartbeat = NOW() WHERE id = $2`,
    [status, userId]
  );

  // Update Redis for real-time tracking
  if (status === 'offline') {
    await redis.srem('online_users', userId);
  } else {
    await redis.sadd('online_users', userId);
  }

  // Publish presence update for WebSocket
  await redis.publish('presence_updates', JSON.stringify({
    userId,
    status,
    timestamp: new Date().toISOString(),
  }));

  res.json({ status });
}));

// POST /api/auth/refresh
authRouter.post('/refresh', authenticate, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const user = req.user!;

  // Generate new token
  const newToken = generateToken({
    userId: user.userId,
    email: user.email,
    role: user.role,
  });

  // Update session in Redis
  await redis.setJSON(`session:${user.userId}`, {
    token: newToken,
    refreshedAt: new Date().toISOString(),
    userAgent: req.headers['user-agent'],
  }, 7 * 24 * 60 * 60);

  res.json({ token: newToken });
}));
