import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import { db } from '../config/database.js';
import { redis } from '../config/redis.js';
import { minio } from '../config/minio.js';
import { authenticate, AuthenticatedRequest, requireRole } from '../middleware/auth.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';

export const tasksRouter = Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF and DOC/DOCX are allowed.'));
    }
  },
});

tasksRouter.use(authenticate);

interface TaskRow {
  id: string;
  candidate_id: string;
  job_id: string;
  ats_score: number;
  status: string;
  assigned_to: string | null;
  assigned_at: Date | null;
  due_at: Date | null;
  started_at: Date | null;
  completed_at: Date | null;
  old_resume_url: string | null;
  new_resume_url: string | null;
  missing_keywords: any;
  suggestions: any;
  notes: string | null;
  retry_count: number;
  created_at: Date;
  candidate_name?: string;
  candidate_email?: string;
  job_title?: string;
  job_company?: string;
  assignee_name?: string;
}

// GET /api/tasks - List all tasks (admin/manager only for all, employees see only their own)
tasksRouter.get('/', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { page = '1', limit = '20', status, assignedTo } = req.query;
  const user = req.user!;

  const pageNum = Math.max(1, parseInt(page as string));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));
  const offset = (pageNum - 1) * limitNum;

  let whereClause = 'WHERE 1=1';
  const params: any[] = [];
  let paramIndex = 1;

  // Filter by status
  if (status && status !== 'all') {
    whereClause += ` AND t.status = $${paramIndex++}`;
    params.push(status);
  }

  // Filter by assigned employee
  if (assignedTo) {
    whereClause += ` AND t.assigned_to = $${paramIndex++}`;
    params.push(assignedTo);
  } else if (user.role === 'employee') {
    // Employees can only see tasks assigned to them or queued
    whereClause += ` AND (t.assigned_to = $${paramIndex++} OR t.status = 'queued')`;
    params.push(user.userId);
  }

  // Get total count
  const countResult = await db.query(
    `SELECT COUNT(*) as total FROM ats_tasks t ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].total);

  // Get tasks with related data
  const result = await db.query<TaskRow>(
    `SELECT t.*,
            c.name as candidate_name, c.email as candidate_email,
            j.title as job_title, j.company as job_company,
            e.name as assignee_name
     FROM ats_tasks t
     JOIN candidates c ON t.candidate_id = c.id
     JOIN jobs j ON t.job_id = j.id
     LEFT JOIN employees e ON t.assigned_to = e.id
     ${whereClause}
     ORDER BY
       CASE t.status
         WHEN 'assigned' THEN 1
         WHEN 'in_progress' THEN 2
         WHEN 'queued' THEN 3
         WHEN 'pending' THEN 4
         ELSE 5
       END,
       t.created_at DESC
     LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
    [...params, limitNum, offset]
  );

  res.json({
    tasks: result.rows.map(t => ({
      id: t.id,
      candidateId: t.candidate_id,
      candidateName: t.candidate_name,
      candidateEmail: t.candidate_email,
      jobId: t.job_id,
      jobTitle: t.job_title,
      jobCompany: t.job_company,
      atsScore: parseFloat(t.ats_score.toString()),
      status: t.status,
      assignedTo: t.assigned_to,
      assigneeName: t.assignee_name,
      assignedAt: t.assigned_at,
      dueAt: t.due_at,
      startedAt: t.started_at,
      completedAt: t.completed_at,
      oldResumeUrl: t.old_resume_url,
      newResumeUrl: t.new_resume_url,
      missingKeywords: t.missing_keywords,
      suggestions: t.suggestions,
      notes: t.notes,
      retryCount: t.retry_count,
      createdAt: t.created_at,
    })),
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    },
  });
}));

// GET /api/tasks/my - Get current employee's assigned task
tasksRouter.get('/my', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.user!.userId;

  const result = await db.query<TaskRow>(
    `SELECT t.*,
            c.name as candidate_name, c.email as candidate_email, c.resume_url as current_resume_url,
            j.title as job_title, j.company as job_company, j.description as job_description,
            j.requirements as job_requirements
     FROM ats_tasks t
     JOIN candidates c ON t.candidate_id = c.id
     JOIN jobs j ON t.job_id = j.id
     WHERE t.assigned_to = $1 AND t.status IN ('assigned', 'in_progress')
     LIMIT 1`,
    [userId]
  );

  if (result.rows.length === 0) {
    return res.json({ task: null });
  }

  const t = result.rows[0];

  res.json({
    task: {
      id: t.id,
      candidateId: t.candidate_id,
      candidateName: t.candidate_name,
      candidateEmail: t.candidate_email,
      currentResumeUrl: (t as any).current_resume_url,
      jobId: t.job_id,
      jobTitle: t.job_title,
      jobCompany: t.job_company,
      jobDescription: (t as any).job_description,
      jobRequirements: (t as any).job_requirements,
      atsScore: parseFloat(t.ats_score.toString()),
      status: t.status,
      assignedAt: t.assigned_at,
      dueAt: t.due_at,
      startedAt: t.started_at,
      oldResumeUrl: t.old_resume_url,
      missingKeywords: t.missing_keywords,
      suggestions: t.suggestions,
    },
  });
}));

// GET /api/tasks/queue - View task queue (managers/admins)
tasksRouter.get('/queue', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const result = await db.query<TaskRow>(
    `SELECT t.*,
            c.name as candidate_name,
            j.title as job_title, j.company as job_company
     FROM ats_tasks t
     JOIN candidates c ON t.candidate_id = c.id
     JOIN jobs j ON t.job_id = j.id
     WHERE t.status IN ('pending', 'queued')
     ORDER BY t.created_at ASC
     LIMIT 50`
  );

  res.json({
    queue: result.rows.map(t => ({
      id: t.id,
      candidateName: t.candidate_name,
      jobTitle: t.job_title,
      jobCompany: t.job_company,
      atsScore: parseFloat(t.ats_score.toString()),
      status: t.status,
      createdAt: t.created_at,
    })),
    count: result.rows.length,
  });
}));

// GET /api/tasks/:id - Get task details
tasksRouter.get('/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;

  const result = await db.query<TaskRow>(
    `SELECT t.*,
            c.name as candidate_name, c.email as candidate_email, c.resume_url as current_resume_url, c.skills as candidate_skills,
            j.title as job_title, j.company as job_company, j.description as job_description, j.requirements as job_requirements, j.skills as job_skills,
            e.name as assignee_name
     FROM ats_tasks t
     JOIN candidates c ON t.candidate_id = c.id
     JOIN jobs j ON t.job_id = j.id
     LEFT JOIN employees e ON t.assigned_to = e.id
     WHERE t.id = $1`,
    [id]
  );

  if (result.rows.length === 0) {
    throw new AppError('Task not found', 404);
  }

  const t = result.rows[0];

  res.json({
    id: t.id,
    candidateId: t.candidate_id,
    candidateName: t.candidate_name,
    candidateEmail: t.candidate_email,
    candidateSkills: (t as any).candidate_skills,
    currentResumeUrl: (t as any).current_resume_url,
    jobId: t.job_id,
    jobTitle: t.job_title,
    jobCompany: t.job_company,
    jobDescription: (t as any).job_description,
    jobRequirements: (t as any).job_requirements,
    jobSkills: (t as any).job_skills,
    atsScore: parseFloat(t.ats_score.toString()),
    status: t.status,
    assignedTo: t.assigned_to,
    assigneeName: t.assignee_name,
    assignedAt: t.assigned_at,
    dueAt: t.due_at,
    startedAt: t.started_at,
    completedAt: t.completed_at,
    oldResumeUrl: t.old_resume_url,
    newResumeUrl: t.new_resume_url,
    missingKeywords: t.missing_keywords,
    suggestions: t.suggestions,
    notes: t.notes,
    retryCount: t.retry_count,
    createdAt: t.created_at,
  });
}));

// POST /api/tasks/:id/start - Start working on a task
tasksRouter.post('/:id/start', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const userId = req.user!.userId;

  // Verify task is assigned to this user
  const task = await db.query(
    `SELECT * FROM ats_tasks WHERE id = $1 AND assigned_to = $2 AND status = 'assigned'`,
    [id, userId]
  );

  if (task.rows.length === 0) {
    throw new AppError('Task not found or not assigned to you', 404);
  }

  // Update task status
  await db.query(
    `UPDATE ats_tasks SET status = 'in_progress', started_at = NOW() WHERE id = $1`,
    [id]
  );

  // Publish update for WebSocket
  await redis.publish('task_updates', JSON.stringify({
    type: 'TASK_STARTED',
    taskId: id,
    employeeId: userId,
    timestamp: new Date().toISOString(),
  }));

  res.json({ message: 'Task started', status: 'in_progress' });
}));

// POST /api/tasks/:id/complete - Complete a task with updated resume
tasksRouter.post('/:id/complete', upload.single('resume'), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const userId = req.user!.userId;
  const file = req.file;
  const { notes } = req.body;

  if (!file) {
    throw new AppError('Updated resume is required', 400);
  }

  // Verify task is assigned to this user and in progress
  const taskResult = await db.query<TaskRow>(
    `SELECT t.*, c.id as cand_id FROM ats_tasks t
     JOIN candidates c ON t.candidate_id = c.id
     WHERE t.id = $1 AND t.assigned_to = $2 AND t.status IN ('assigned', 'in_progress')`,
    [id, userId]
  );

  if (taskResult.rows.length === 0) {
    throw new AppError('Task not found or not assigned to you', 404);
  }

  const task = taskResult.rows[0];

  // Upload new resume
  const ext = file.originalname.split('.').pop();
  const objectName = `${task.candidate_id}_${uuidv4()}_updated.${ext}`;

  const newResumeUrl = await minio.upload(
    minio.BUCKETS.RESUMES,
    objectName,
    file.buffer,
    file.mimetype
  );

  // Calculate completion time
  const assignedAt = task.assigned_at || task.created_at;
  const completionTimeSeconds = Math.floor((Date.now() - new Date(assignedAt).getTime()) / 1000);

  // Update task
  await db.query(
    `UPDATE ats_tasks
     SET status = 'completed',
         completed_at = NOW(),
         new_resume_url = $1,
         notes = $2
     WHERE id = $3`,
    [newResumeUrl, notes, id]
  );

  // Update candidate's resume
  await db.query(
    `UPDATE candidates SET resume_url = $1 WHERE id = $2`,
    [newResumeUrl, task.candidate_id]
  );

  // Update employee stats
  await db.query(
    `UPDATE employees
     SET status = 'available',
         current_task_id = NULL,
         tasks_completed = tasks_completed + 1,
         average_completion_time_seconds = CASE
           WHEN tasks_completed = 0 THEN $1
           ELSE (average_completion_time_seconds * tasks_completed + $1) / (tasks_completed + 1)
         END
     WHERE id = $2`,
    [completionTimeSeconds, userId]
  );

  // Create application record for auto-submit
  const jobResult = await db.query('SELECT id FROM jobs WHERE id = $1', [task.job_id]);
  if (jobResult.rows.length > 0) {
    await db.query(
      `INSERT INTO applications (candidate_id, job_id, task_id, resume_used_url, ats_score_at_submission, status, auto_submitted, submitted_at)
       VALUES ($1, $2, $3, $4, $5, 'submitted', FALSE, NOW())
       ON CONFLICT (candidate_id, job_id) DO UPDATE SET
         resume_used_url = $4,
         status = 'submitted',
         submitted_at = NOW()`,
      [task.candidate_id, task.job_id, id, newResumeUrl, task.ats_score]
    );
  }

  // Publish update for WebSocket
  await redis.publish('task_updates', JSON.stringify({
    type: 'TASK_COMPLETED',
    taskId: id,
    employeeId: userId,
    completionTimeSeconds,
    timestamp: new Date().toISOString(),
  }));

  res.json({
    message: 'Task completed successfully',
    newResumeUrl,
    completionTimeSeconds,
  });
}));

// POST /api/tasks/:id/fail - Mark task as failed
tasksRouter.post('/:id/fail', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const userId = req.user!.userId;
  const { reason } = req.body;

  // Verify task is assigned to this user
  const task = await db.query(
    `SELECT * FROM ats_tasks WHERE id = $1 AND assigned_to = $2 AND status IN ('assigned', 'in_progress')`,
    [id, userId]
  );

  if (task.rows.length === 0) {
    throw new AppError('Task not found or not assigned to you', 404);
  }

  // Update task status to queued for reassignment
  await db.query(
    `UPDATE ats_tasks
     SET status = 'queued',
         assigned_to = NULL,
         assigned_at = NULL,
         due_at = NULL,
         started_at = NULL,
         notes = COALESCE(notes, '') || E'\n[FAILED] ' || $1,
         retry_count = retry_count + 1
     WHERE id = $2`,
    [reason || 'No reason provided', id]
  );

  // Update employee status
  await db.query(
    `UPDATE employees SET status = 'available', current_task_id = NULL WHERE id = $1`,
    [userId]
  );

  res.json({ message: 'Task marked as failed and re-queued' });
}));
