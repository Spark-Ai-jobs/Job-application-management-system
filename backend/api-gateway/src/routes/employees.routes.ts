import { Router, Response } from 'express';
import { db } from '../config/database.js';
import { redis } from '../config/redis.js';
import { authenticate, AuthenticatedRequest, requireRole } from '../middleware/auth.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';

export const employeesRouter = Router();

employeesRouter.use(authenticate);

interface EmployeeRow {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  avatar_url: string | null;
  current_task_id: string | null;
  tasks_completed: number;
  warnings: number;
  violations: number;
  average_completion_time_seconds: number;
  last_heartbeat: Date | null;
  created_at: Date;
  updated_at: Date;
  current_task_job?: string;
  current_task_candidate?: string;
}

// GET /api/employees - List all employees (managers/admins only)
employeesRouter.get('/', requireRole('admin', 'manager'), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { status, role, search } = req.query;

  let whereClause = 'WHERE 1=1';
  const params: any[] = [];
  let paramIndex = 1;

  if (status && status !== 'all') {
    whereClause += ` AND e.status = $${paramIndex++}`;
    params.push(status);
  }

  if (role && role !== 'all') {
    whereClause += ` AND e.role = $${paramIndex++}`;
    params.push(role);
  }

  if (search) {
    whereClause += ` AND (e.name ILIKE $${paramIndex} OR e.email ILIKE $${paramIndex})`;
    params.push(`%${search}%`);
    paramIndex++;
  }

  const result = await db.query<EmployeeRow & { current_task_job: string | null; current_task_candidate: string | null }>(
    `SELECT e.*,
            j.title as current_task_job,
            c.name as current_task_candidate
     FROM employees e
     LEFT JOIN ats_tasks t ON e.current_task_id = t.id
     LEFT JOIN jobs j ON t.job_id = j.id
     LEFT JOIN candidates c ON t.candidate_id = c.id
     ${whereClause}
     ORDER BY
       CASE e.status
         WHEN 'busy' THEN 1
         WHEN 'available' THEN 2
         ELSE 3
       END,
       e.name ASC`,
    params
  );

  res.json({
    employees: result.rows.map(e => ({
      id: e.id,
      email: e.email,
      name: e.name,
      role: e.role,
      status: e.status,
      avatarUrl: e.avatar_url,
      currentTaskId: e.current_task_id,
      currentTaskJob: e.current_task_job,
      currentTaskCandidate: e.current_task_candidate,
      tasksCompleted: e.tasks_completed,
      warnings: e.warnings,
      violations: e.violations,
      averageCompletionTime: e.average_completion_time_seconds,
      lastHeartbeat: e.last_heartbeat,
      createdAt: e.created_at,
    })),
  });
}));

// GET /api/employees/stats - Team statistics
employeesRouter.get('/stats', requireRole('admin', 'manager'), asyncHandler(async (req: AuthenticatedRequest, res) => {
  // Status counts
  const statusResult = await db.query(`
    SELECT status, COUNT(*) as count
    FROM employees
    GROUP BY status
  `);

  const statusCounts: Record<string, number> = {
    available: 0,
    busy: 0,
    offline: 0,
  };
  statusResult.rows.forEach((row: any) => {
    statusCounts[row.status] = parseInt(row.count);
  });

  // Task queue count
  const queueResult = await db.query(`
    SELECT COUNT(*) as count
    FROM ats_tasks
    WHERE status IN ('pending', 'queued')
  `);
  const taskQueueCount = parseInt(queueResult.rows[0].count);

  // Today's performance
  const todayResult = await db.query(`
    SELECT
      COUNT(*) FILTER (WHERE completed_at IS NOT NULL) as completed,
      COUNT(*) FILTER (WHERE status = 'timeout') as timeouts,
      AVG(EXTRACT(EPOCH FROM (completed_at - assigned_at))) FILTER (WHERE completed_at IS NOT NULL) as avg_time
    FROM ats_tasks
    WHERE DATE(created_at) = CURRENT_DATE
  `);

  // Top performers
  const topPerformersResult = await db.query(`
    SELECT name, tasks_completed, average_completion_time_seconds, warnings, violations
    FROM employees
    WHERE role = 'employee'
    ORDER BY tasks_completed DESC
    LIMIT 5
  `);

  // Employees with warnings
  const warningsResult = await db.query(`
    SELECT name, warnings, violations
    FROM employees
    WHERE warnings > 0 OR violations > 0
    ORDER BY violations DESC, warnings DESC
  `);

  res.json({
    statusCounts,
    taskQueueCount,
    today: {
      completed: parseInt(todayResult.rows[0].completed) || 0,
      timeouts: parseInt(todayResult.rows[0].timeouts) || 0,
      averageTime: Math.round(parseFloat(todayResult.rows[0].avg_time) || 0),
    },
    topPerformers: topPerformersResult.rows.map((e: any) => ({
      name: e.name,
      tasksCompleted: e.tasks_completed,
      averageTime: e.average_completion_time_seconds,
      warnings: e.warnings,
      violations: e.violations,
    })),
    employeesWithIssues: warningsResult.rows.map((e: any) => ({
      name: e.name,
      warnings: e.warnings,
      violations: e.violations,
    })),
  });
}));

// GET /api/employees/:id - Get employee details
employeesRouter.get('/:id', requireRole('admin', 'manager'), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;

  const result = await db.query<EmployeeRow>(
    `SELECT * FROM employees WHERE id = $1`,
    [id]
  );

  if (result.rows.length === 0) {
    throw new AppError('Employee not found', 404);
  }

  const e = result.rows[0];

  // Get recent tasks
  const tasksResult = await db.query(`
    SELECT t.id, t.status, t.ats_score, t.created_at, t.completed_at,
           j.title as job_title, c.name as candidate_name
    FROM ats_tasks t
    JOIN jobs j ON t.job_id = j.id
    JOIN candidates c ON t.candidate_id = c.id
    WHERE t.assigned_to = $1
    ORDER BY t.created_at DESC
    LIMIT 10
  `, [id]);

  // Get incidents
  const incidentsResult = await db.query(`
    SELECT * FROM employee_incidents
    WHERE employee_id = $1
    ORDER BY created_at DESC
    LIMIT 20
  `, [id]);

  res.json({
    id: e.id,
    email: e.email,
    name: e.name,
    role: e.role,
    status: e.status,
    avatarUrl: e.avatar_url,
    currentTaskId: e.current_task_id,
    tasksCompleted: e.tasks_completed,
    warnings: e.warnings,
    violations: e.violations,
    averageCompletionTime: e.average_completion_time_seconds,
    lastHeartbeat: e.last_heartbeat,
    createdAt: e.created_at,
    recentTasks: tasksResult.rows.map((t: any) => ({
      id: t.id,
      status: t.status,
      atsScore: parseFloat(t.ats_score),
      jobTitle: t.job_title,
      candidateName: t.candidate_name,
      createdAt: t.created_at,
      completedAt: t.completed_at,
    })),
    incidents: incidentsResult.rows.map((i: any) => ({
      id: i.id,
      type: i.type,
      reason: i.reason,
      taskId: i.task_id,
      acknowledged: i.acknowledged,
      createdAt: i.created_at,
    })),
  });
}));

// GET /api/employees/:id/incidents - Get employee incidents
employeesRouter.get('/:id/incidents', requireRole('admin', 'manager'), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const { page = '1', limit = '20' } = req.query;

  const pageNum = Math.max(1, parseInt(page as string));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));
  const offset = (pageNum - 1) * limitNum;

  const countResult = await db.query(
    `SELECT COUNT(*) as total FROM employee_incidents WHERE employee_id = $1`,
    [id]
  );
  const total = parseInt(countResult.rows[0].total);

  const result = await db.query(`
    SELECT i.*, t.ats_score as task_score, j.title as job_title, c.name as candidate_name
    FROM employee_incidents i
    LEFT JOIN ats_tasks t ON i.task_id = t.id
    LEFT JOIN jobs j ON t.job_id = j.id
    LEFT JOIN candidates c ON t.candidate_id = c.id
    WHERE i.employee_id = $1
    ORDER BY i.created_at DESC
    LIMIT $2 OFFSET $3
  `, [id, limitNum, offset]);

  res.json({
    incidents: result.rows.map((i: any) => ({
      id: i.id,
      type: i.type,
      reason: i.reason,
      taskId: i.task_id,
      taskScore: i.task_score ? parseFloat(i.task_score) : null,
      jobTitle: i.job_title,
      candidateName: i.candidate_name,
      acknowledged: i.acknowledged,
      acknowledgedAt: i.acknowledged_at,
      createdAt: i.created_at,
    })),
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    },
  });
}));

// PUT /api/employees/:id - Update employee (admin only)
employeesRouter.put('/:id', requireRole('admin'), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const { name, role, status } = req.body;

  // Verify employee exists
  const existing = await db.query('SELECT id FROM employees WHERE id = $1', [id]);
  if (existing.rows.length === 0) {
    throw new AppError('Employee not found', 404);
  }

  // Validate role
  if (role && !['admin', 'manager', 'employee'].includes(role)) {
    throw new AppError('Invalid role', 400);
  }

  // Validate status
  if (status && !['available', 'busy', 'offline'].includes(status)) {
    throw new AppError('Invalid status', 400);
  }

  const result = await db.query<EmployeeRow>(
    `UPDATE employees
     SET name = COALESCE($1, name),
         role = COALESCE($2, role),
         status = COALESCE($3, status)
     WHERE id = $4
     RETURNING *`,
    [name, role, status, id]
  );

  const e = result.rows[0];

  // Publish presence update if status changed
  if (status) {
    await redis.publish('presence_updates', JSON.stringify({
      userId: id,
      status,
      timestamp: new Date().toISOString(),
    }));
  }

  res.json({
    id: e.id,
    email: e.email,
    name: e.name,
    role: e.role,
    status: e.status,
    updatedAt: e.updated_at,
  });
}));

// POST /api/employees/:id/reset-warnings - Reset warnings (admin only)
employeesRouter.post('/:id/reset-warnings', requireRole('admin'), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const adminId = req.user!.userId;

  // Verify employee exists
  const existing = await db.query('SELECT id, warnings, violations FROM employees WHERE id = $1', [id]);
  if (existing.rows.length === 0) {
    throw new AppError('Employee not found', 404);
  }

  // Reset warnings
  await db.query(
    `UPDATE employees SET warnings = 0 WHERE id = $1`,
    [id]
  );

  // Create audit log
  await db.query(
    `INSERT INTO activity_log (actor_id, action, entity_type, entity_id, details)
     VALUES ($1, 'reset_warnings', 'employee', $2, $3)`,
    [adminId, id, JSON.stringify({ previousWarnings: existing.rows[0].warnings })]
  );

  res.json({ message: 'Warnings reset successfully' });
}));

// POST /api/employees/:id/reset-violations - Reset violations (admin only)
employeesRouter.post('/:id/reset-violations', requireRole('admin'), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const adminId = req.user!.userId;

  // Verify employee exists
  const existing = await db.query('SELECT id, warnings, violations FROM employees WHERE id = $1', [id]);
  if (existing.rows.length === 0) {
    throw new AppError('Employee not found', 404);
  }

  // Reset violations and unlock account if needed
  await db.query(
    `UPDATE employees SET violations = 0, status = 'available' WHERE id = $1`,
    [id]
  );

  // Create audit log
  await db.query(
    `INSERT INTO activity_log (actor_id, action, entity_type, entity_id, details)
     VALUES ($1, 'reset_violations', 'employee', $2, $3)`,
    [adminId, id, JSON.stringify({ previousViolations: existing.rows[0].violations })]
  );

  res.json({ message: 'Violations reset and account unlocked' });
}));
