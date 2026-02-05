import { Router, Response } from 'express';
import { db } from '../config/database.js';
import { redis } from '../config/redis.js';
import { authenticate, AuthenticatedRequest, requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';

export const analyticsRouter = Router();

analyticsRouter.use(authenticate);

// GET /api/analytics/dashboard - Dashboard KPIs
analyticsRouter.get('/dashboard', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const isManager = ['admin', 'manager'].includes(user.role);

  // Total candidates
  const candidatesResult = await db.query(`
    SELECT COUNT(*) as total,
           COUNT(*) FILTER (WHERE DATE(created_at) = CURRENT_DATE) as today
    FROM candidates
  `);

  // Jobs found today
  const jobsResult = await db.query(`
    SELECT COUNT(*) as total,
           COUNT(*) FILTER (WHERE DATE(scraped_at) = CURRENT_DATE) as today
    FROM jobs WHERE is_active = true
  `);

  // Applications
  const applicationsResult = await db.query(`
    SELECT COUNT(*) as total,
           COUNT(*) FILTER (WHERE DATE(submitted_at) = CURRENT_DATE) as today,
           COUNT(*) FILTER (WHERE auto_submitted = true AND DATE(submitted_at) = CURRENT_DATE) as auto_today
    FROM applications WHERE status = 'submitted'
  `);

  // Average ATS score
  const atsResult = await db.query(`
    SELECT AVG(ats_score) as avg_score
    FROM ats_tasks
    WHERE DATE(created_at) = CURRENT_DATE
  `);

  // Job categories distribution (today)
  const categoriesResult = await db.query(`
    SELECT category, COUNT(*) as count
    FROM jobs
    WHERE DATE(scraped_at) = CURRENT_DATE AND is_active = true
    GROUP BY category
  `);

  // Task queue status
  const taskQueueResult = await db.query(`
    SELECT
      COUNT(*) FILTER (WHERE status IN ('pending', 'queued')) as pending,
      COUNT(*) FILTER (WHERE status = 'assigned') as assigned,
      COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
      COUNT(*) FILTER (WHERE status = 'completed' AND DATE(completed_at) = CURRENT_DATE) as completed_today
    FROM ats_tasks
  `);

  // Employee stats
  const employeeStatsResult = await db.query(`
    SELECT
      COUNT(*) FILTER (WHERE status = 'available') as available,
      COUNT(*) FILTER (WHERE status = 'busy') as busy,
      COUNT(*) FILTER (WHERE status = 'offline') as offline
    FROM employees
  `);

  const jobsByCategory: Record<string, number> = {};
  categoriesResult.rows.forEach((row: any) => {
    jobsByCategory[row.category] = parseInt(row.count);
  });

  // Build response based on role
  const response: any = {
    candidates: {
      total: parseInt(candidatesResult.rows[0].total),
      addedToday: parseInt(candidatesResult.rows[0].today),
    },
    jobs: {
      total: parseInt(jobsResult.rows[0].total),
      foundToday: parseInt(jobsResult.rows[0].today),
    },
    applications: {
      total: parseInt(applicationsResult.rows[0].total),
      submittedToday: parseInt(applicationsResult.rows[0].today),
      autoSubmittedToday: parseInt(applicationsResult.rows[0].auto_today),
    },
    averageAtsScore: parseFloat(atsResult.rows[0].avg_score) || 0,
    jobsByCategory,
    taskQueue: {
      pending: parseInt(taskQueueResult.rows[0].pending),
      assigned: parseInt(taskQueueResult.rows[0].assigned),
      inProgress: parseInt(taskQueueResult.rows[0].in_progress),
      completedToday: parseInt(taskQueueResult.rows[0].completed_today),
    },
  };

  // Add team stats for managers
  if (isManager) {
    response.team = {
      available: parseInt(employeeStatsResult.rows[0].available),
      busy: parseInt(employeeStatsResult.rows[0].busy),
      offline: parseInt(employeeStatsResult.rows[0].offline),
      total: parseInt(employeeStatsResult.rows[0].available) +
             parseInt(employeeStatsResult.rows[0].busy) +
             parseInt(employeeStatsResult.rows[0].offline),
    };
  }

  // Add employee-specific stats
  if (!isManager) {
    const myStatsResult = await db.query(`
      SELECT
        COUNT(*) FILTER (WHERE DATE(completed_at) = CURRENT_DATE) as completed_today,
        COUNT(*) FILTER (WHERE status = 'assigned') as assigned,
        AVG(EXTRACT(EPOCH FROM (completed_at - assigned_at))) FILTER (WHERE completed_at IS NOT NULL AND DATE(completed_at) = CURRENT_DATE) as avg_time_today
      FROM ats_tasks
      WHERE assigned_to = $1
    `, [user.userId]);

    response.myStats = {
      completedToday: parseInt(myStatsResult.rows[0].completed_today) || 0,
      currentlyAssigned: parseInt(myStatsResult.rows[0].assigned) || 0,
      averageTimeToday: Math.round(parseFloat(myStatsResult.rows[0].avg_time_today) || 0),
    };
  }

  res.json(response);
}));

// GET /api/analytics/jobs - Job analytics
analyticsRouter.get('/jobs', asyncHandler(async (req: AuthenticatedRequest, res) => {
  // Jobs by source
  const sourceResult = await db.query(`
    SELECT source, COUNT(*) as count
    FROM jobs WHERE is_active = true
    GROUP BY source
  `);

  // Jobs by category
  const categoryResult = await db.query(`
    SELECT category, COUNT(*) as count
    FROM jobs WHERE is_active = true
    GROUP BY category
  `);

  // Jobs trend (last 7 days)
  const trendResult = await db.query(`
    SELECT DATE(scraped_at) as date, COUNT(*) as count
    FROM jobs
    WHERE scraped_at >= CURRENT_DATE - INTERVAL '7 days'
    GROUP BY DATE(scraped_at)
    ORDER BY date
  `);

  // Top companies
  const companiesResult = await db.query(`
    SELECT company, COUNT(*) as count
    FROM jobs WHERE is_active = true
    GROUP BY company
    ORDER BY count DESC
    LIMIT 10
  `);

  const jobsBySource: Record<string, number> = {};
  sourceResult.rows.forEach((row: any) => {
    jobsBySource[row.source] = parseInt(row.count);
  });

  const jobsByCategory: Record<string, number> = {};
  categoryResult.rows.forEach((row: any) => {
    jobsByCategory[row.category] = parseInt(row.count);
  });

  res.json({
    bySource: jobsBySource,
    byCategory: jobsByCategory,
    trend: trendResult.rows.map((row: any) => ({
      date: row.date,
      count: parseInt(row.count),
    })),
    topCompanies: companiesResult.rows.map((row: any) => ({
      company: row.company,
      count: parseInt(row.count),
    })),
  });
}));

// GET /api/analytics/team - Team performance (managers/admins only)
analyticsRouter.get('/team', requireRole('admin', 'manager'), asyncHandler(async (req: AuthenticatedRequest, res) => {
  // Employee performance
  const performanceResult = await db.query(`
    SELECT
      e.id, e.name, e.tasks_completed, e.warnings, e.violations,
      e.average_completion_time_seconds,
      COUNT(t.id) FILTER (WHERE DATE(t.completed_at) = CURRENT_DATE) as completed_today,
      AVG(EXTRACT(EPOCH FROM (t.completed_at - t.assigned_at))) FILTER (WHERE t.completed_at IS NOT NULL AND DATE(t.completed_at) >= CURRENT_DATE - INTERVAL '7 days') as avg_time_week
    FROM employees e
    LEFT JOIN ats_tasks t ON e.id = t.assigned_to
    WHERE e.role = 'employee'
    GROUP BY e.id, e.name, e.tasks_completed, e.warnings, e.violations, e.average_completion_time_seconds
    ORDER BY e.tasks_completed DESC
  `);

  // Tasks completed trend (last 7 days)
  const taskTrendResult = await db.query(`
    SELECT DATE(completed_at) as date, COUNT(*) as count
    FROM ats_tasks
    WHERE completed_at >= CURRENT_DATE - INTERVAL '7 days'
      AND status = 'completed'
    GROUP BY DATE(completed_at)
    ORDER BY date
  `);

  // Timeout trend
  const timeoutTrendResult = await db.query(`
    SELECT DATE(created_at) as date, COUNT(*) as count
    FROM employee_incidents
    WHERE type = 'warning'
      AND created_at >= CURRENT_DATE - INTERVAL '7 days'
    GROUP BY DATE(created_at)
    ORDER BY date
  `);

  res.json({
    employees: performanceResult.rows.map((e: any) => ({
      id: e.id,
      name: e.name,
      tasksCompleted: e.tasks_completed,
      completedToday: parseInt(e.completed_today) || 0,
      warnings: e.warnings,
      violations: e.violations,
      averageCompletionTime: e.average_completion_time_seconds,
      averageTimeThisWeek: Math.round(parseFloat(e.avg_time_week) || 0),
    })),
    tasksTrend: taskTrendResult.rows.map((row: any) => ({
      date: row.date,
      count: parseInt(row.count),
    })),
    timeoutsTrend: timeoutTrendResult.rows.map((row: any) => ({
      date: row.date,
      count: parseInt(row.count),
    })),
  });
}));

// GET /api/analytics/trends - Historical trends
analyticsRouter.get('/trends', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { days = '30' } = req.query;
  const daysNum = Math.min(90, Math.max(7, parseInt(days as string)));

  // Applications trend
  const applicationsResult = await db.query(`
    SELECT DATE(submitted_at) as date, COUNT(*) as count
    FROM applications
    WHERE submitted_at >= CURRENT_DATE - INTERVAL '${daysNum} days'
      AND status = 'submitted'
    GROUP BY DATE(submitted_at)
    ORDER BY date
  `);

  // Jobs trend
  const jobsResult = await db.query(`
    SELECT DATE(scraped_at) as date, COUNT(*) as count
    FROM jobs
    WHERE scraped_at >= CURRENT_DATE - INTERVAL '${daysNum} days'
    GROUP BY DATE(scraped_at)
    ORDER BY date
  `);

  // Tasks completed trend
  const tasksResult = await db.query(`
    SELECT DATE(completed_at) as date, COUNT(*) as count
    FROM ats_tasks
    WHERE completed_at >= CURRENT_DATE - INTERVAL '${daysNum} days'
      AND status = 'completed'
    GROUP BY DATE(completed_at)
    ORDER BY date
  `);

  // ATS score trend
  const atsResult = await db.query(`
    SELECT DATE(created_at) as date, AVG(ats_score) as avg_score
    FROM ats_tasks
    WHERE created_at >= CURRENT_DATE - INTERVAL '${daysNum} days'
    GROUP BY DATE(created_at)
    ORDER BY date
  `);

  res.json({
    applications: applicationsResult.rows.map((row: any) => ({
      date: row.date,
      count: parseInt(row.count),
    })),
    jobs: jobsResult.rows.map((row: any) => ({
      date: row.date,
      count: parseInt(row.count),
    })),
    tasksCompleted: tasksResult.rows.map((row: any) => ({
      date: row.date,
      count: parseInt(row.count),
    })),
    atsScores: atsResult.rows.map((row: any) => ({
      date: row.date,
      averageScore: parseFloat(row.avg_score).toFixed(2),
    })),
  });
}));
