/**
 * Worker Service
 *
 * Handles:
 * 1. Task Assignment - Assigns queued tasks to available employees
 * 2. Timeout Checking - Checks for overdue tasks and applies warnings/violations
 * 3. Warning/Violation System - 3 warnings = 1 violation, 4 violations = account suspension
 */

import { Pool } from 'pg';
import { createClient, RedisClientType } from 'redis';
import { WebSocket, WebSocketServer } from 'ws';
import { addMinutes, differenceInMinutes, differenceInSeconds } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';

// Configuration
const config = {
  database: {
    connectionString: process.env.DATABASE_URL || 'postgresql://spark:sparkpass@postgres:5432/sparkdb',
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://redis:6379',
  },
  sla: {
    timeoutMinutes: parseInt(process.env.SLA_TIMEOUT_MINUTES || '20', 10),
    warningsPerViolation: 3,
    violationsForSuspension: 4,
  },
  intervals: {
    taskAssignment: 5000, // 5 seconds
    timeoutCheck: 60000, // 1 minute
    healthCheck: 30000, // 30 seconds
  },
};

// Database pool
const pool = new Pool({
  connectionString: config.database.connectionString,
});

// Redis client
let redis: RedisClientType;
let redisSub: RedisClientType;

// WebSocket server for internal communication
const wss = new WebSocketServer({ port: 8003 });

// Logging utility
function log(level: 'info' | 'warn' | 'error', message: string, data?: any) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  if (data) {
    console.log(logMessage, JSON.stringify(data));
  } else {
    console.log(logMessage);
  }
}

/**
 * Task Assignment Worker
 *
 * Runs every 5 seconds to assign queued tasks to available employees.
 * Uses database-level locking to prevent race conditions.
 */
async function assignTasks() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Find available employees (status = 'available', not currently working on a task)
    const availableResult = await client.query(`
      SELECT e.id, e.name, e.email
      FROM employees e
      WHERE e.status = 'available'
        AND e.is_active = true
        AND NOT EXISTS (
          SELECT 1 FROM ats_tasks t
          WHERE t.assigned_to = e.id
          AND t.status IN ('assigned', 'in_progress')
        )
      ORDER BY e.tasks_completed ASC, e.last_active DESC
      LIMIT 10
    `);

    const availableEmployees = availableResult.rows;

    if (availableEmployees.length === 0) {
      await client.query('COMMIT');
      return;
    }

    // Find queued tasks
    const queuedResult = await client.query(`
      SELECT id, job_id, candidate_id
      FROM ats_tasks
      WHERE status = 'queued'
      ORDER BY created_at ASC
      LIMIT $1
      FOR UPDATE SKIP LOCKED
    `, [availableEmployees.length]);

    const queuedTasks = queuedResult.rows;

    if (queuedTasks.length === 0) {
      await client.query('COMMIT');
      return;
    }

    // Assign tasks to employees
    for (let i = 0; i < Math.min(queuedTasks.length, availableEmployees.length); i++) {
      const task = queuedTasks[i];
      const employee = availableEmployees[i];
      const deadline = addMinutes(new Date(), config.sla.timeoutMinutes);

      await client.query(`
        UPDATE ats_tasks
        SET
          status = 'assigned',
          assigned_to = $1,
          assigned_at = NOW(),
          deadline = $2,
          updated_at = NOW()
        WHERE id = $3
      `, [employee.id, deadline, task.id]);

      // Update employee status to busy
      await client.query(`
        UPDATE employees
        SET status = 'busy', updated_at = NOW()
        WHERE id = $1
      `, [employee.id]);

      // Log activity
      await client.query(`
        INSERT INTO activity_log (employee_id, action, entity_type, entity_id, details)
        VALUES ($1, 'task_assigned', 'ats_task', $2, $3)
      `, [employee.id, task.id, JSON.stringify({ deadline: deadline.toISOString() })]);

      log('info', `Task assigned`, {
        taskId: task.id,
        employeeId: employee.id,
        employeeName: employee.name,
        deadline: deadline.toISOString(),
      });

      // Publish notification via Redis
      await redis.publish('task:assigned', JSON.stringify({
        taskId: task.id,
        employeeId: employee.id,
        employeeName: employee.name,
        deadline: deadline.toISOString(),
        slaMinutes: config.sla.timeoutMinutes,
      }));
    }

    await client.query('COMMIT');

    log('info', `Assigned ${Math.min(queuedTasks.length, availableEmployees.length)} tasks`);

  } catch (error) {
    await client.query('ROLLBACK');
    log('error', 'Task assignment failed', { error: (error as Error).message });
  } finally {
    client.release();
  }
}

/**
 * Timeout Checker Worker
 *
 * Runs every minute to check for tasks that have exceeded their SLA deadline.
 * Applies warnings to employees and converts warnings to violations.
 */
async function checkTimeouts() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Find overdue tasks
    const overdueResult = await client.query(`
      SELECT t.id, t.assigned_to, t.deadline, t.job_id, t.candidate_id,
             e.name as employee_name, e.warnings, e.violations
      FROM ats_tasks t
      JOIN employees e ON t.assigned_to = e.id
      WHERE t.status IN ('assigned', 'in_progress')
        AND t.deadline < NOW()
      FOR UPDATE OF t SKIP LOCKED
    `);

    const overdueTasks = overdueResult.rows;

    for (const task of overdueTasks) {
      const minutesOverdue = differenceInMinutes(new Date(), new Date(task.deadline));

      log('warn', `Task timeout detected`, {
        taskId: task.id,
        employeeId: task.assigned_to,
        employeeName: task.employee_name,
        minutesOverdue,
      });

      // Mark task as timeout
      await client.query(`
        UPDATE ats_tasks
        SET status = 'timeout', updated_at = NOW()
        WHERE id = $1
      `, [task.id]);

      // Add warning to employee
      let newWarnings = task.warnings + 1;
      let newViolations = task.violations;
      let incidentType = 'warning';

      // Check if warnings convert to violation
      if (newWarnings >= config.sla.warningsPerViolation) {
        newWarnings = 0;
        newViolations += 1;
        incidentType = 'violation';

        log('warn', `Employee received violation`, {
          employeeId: task.assigned_to,
          employeeName: task.employee_name,
          violations: newViolations,
        });
      }

      // Check for suspension
      let isActive = true;
      if (newViolations >= config.sla.violationsForSuspension) {
        isActive = false;
        log('error', `Employee suspended`, {
          employeeId: task.assigned_to,
          employeeName: task.employee_name,
          violations: newViolations,
        });
      }

      // Update employee
      await client.query(`
        UPDATE employees
        SET
          warnings = $1,
          violations = $2,
          is_active = $3,
          status = 'available',
          updated_at = NOW()
        WHERE id = $4
      `, [newWarnings, newViolations, isActive, task.assigned_to]);

      // Record incident
      await client.query(`
        INSERT INTO employee_incidents (employee_id, type, reason, task_id)
        VALUES ($1, $2, $3, $4)
      `, [
        task.assigned_to,
        incidentType,
        `SLA timeout - Task exceeded ${config.sla.timeoutMinutes} minute deadline by ${minutesOverdue} minutes`,
        task.id,
      ]);

      // Log activity
      await client.query(`
        INSERT INTO activity_log (employee_id, action, entity_type, entity_id, details)
        VALUES ($1, $2, 'ats_task', $3, $4)
      `, [
        task.assigned_to,
        incidentType === 'violation' ? 'violation_received' : 'warning_received',
        task.id,
        JSON.stringify({
          minutesOverdue,
          warnings: newWarnings,
          violations: newViolations,
          suspended: !isActive,
        }),
      ]);

      // Requeue the task
      await client.query(`
        INSERT INTO ats_tasks (job_id, candidate_id, original_ats_score, status)
        SELECT job_id, candidate_id, original_ats_score, 'queued'
        FROM ats_tasks WHERE id = $1
      `, [task.id]);

      // Publish notification
      await redis.publish('task:timeout', JSON.stringify({
        taskId: task.id,
        employeeId: task.assigned_to,
        employeeName: task.employee_name,
        incidentType,
        warnings: newWarnings,
        violations: newViolations,
        suspended: !isActive,
      }));
    }

    await client.query('COMMIT');

    if (overdueTasks.length > 0) {
      log('info', `Processed ${overdueTasks.length} timeout(s)`);
    }

  } catch (error) {
    await client.query('ROLLBACK');
    log('error', 'Timeout check failed', { error: (error as Error).message });
  } finally {
    client.release();
  }
}

/**
 * Health Check Worker
 *
 * Publishes worker health status to Redis.
 */
async function publishHealthStatus() {
  try {
    const healthData = {
      service: 'worker-service',
      status: 'healthy',
      timestamp: new Date().toISOString(),
      config: {
        slaTimeoutMinutes: config.sla.timeoutMinutes,
        warningsPerViolation: config.sla.warningsPerViolation,
        violationsForSuspension: config.sla.violationsForSuspension,
      },
    };

    await redis.set('worker:health', JSON.stringify(healthData), { EX: 60 });
    await redis.publish('worker:heartbeat', JSON.stringify(healthData));

  } catch (error) {
    log('error', 'Health check publish failed', { error: (error as Error).message });
  }
}

/**
 * Subscribe to Redis events
 */
async function subscribeToEvents() {
  redisSub = createClient({ url: config.redis.url });
  await redisSub.connect();

  // Subscribe to manual task assignment requests
  await redisSub.subscribe('worker:assign', async (message) => {
    try {
      const data = JSON.parse(message);
      log('info', 'Manual assignment request received', data);
      await assignTasks();
    } catch (error) {
      log('error', 'Failed to process manual assignment', { error: (error as Error).message });
    }
  });

  // Subscribe to employee status changes
  await redisSub.subscribe('employee:status', async (message) => {
    try {
      const data = JSON.parse(message);
      log('info', 'Employee status change', data);

      // If employee became available, try to assign a task
      if (data.status === 'available') {
        await assignTasks();
      }
    } catch (error) {
      log('error', 'Failed to process status change', { error: (error as Error).message });
    }
  });

  log('info', 'Subscribed to Redis events');
}

/**
 * WebSocket connection handler
 */
wss.on('connection', (ws: WebSocket) => {
  log('info', 'WebSocket client connected');

  ws.on('message', async (message: string) => {
    try {
      const data = JSON.parse(message.toString());

      switch (data.type) {
        case 'ping':
          ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
          break;

        case 'trigger_assignment':
          await assignTasks();
          ws.send(JSON.stringify({ type: 'assignment_triggered' }));
          break;

        case 'get_status':
          const health = await redis.get('worker:health');
          ws.send(JSON.stringify({ type: 'status', data: JSON.parse(health || '{}') }));
          break;
      }
    } catch (error) {
      log('error', 'WebSocket message error', { error: (error as Error).message });
    }
  });

  ws.on('close', () => {
    log('info', 'WebSocket client disconnected');
  });
});

/**
 * Main entry point
 */
async function main() {
  log('info', 'Starting Worker Service...');

  try {
    // Connect to Redis
    redis = createClient({ url: config.redis.url });
    await redis.connect();
    log('info', 'Connected to Redis');

    // Test database connection
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    log('info', 'Connected to PostgreSQL');

    // Subscribe to events
    await subscribeToEvents();

    // Start workers
    setInterval(assignTasks, config.intervals.taskAssignment);
    setInterval(checkTimeouts, config.intervals.timeoutCheck);
    setInterval(publishHealthStatus, config.intervals.healthCheck);

    // Initial health publish
    await publishHealthStatus();

    log('info', 'Worker Service started successfully', {
      slaTimeout: `${config.sla.timeoutMinutes} minutes`,
      warningsPerViolation: config.sla.warningsPerViolation,
      violationsForSuspension: config.sla.violationsForSuspension,
      wsPort: 8003,
    });

    // Run initial assignment check
    await assignTasks();

  } catch (error) {
    log('error', 'Failed to start Worker Service', { error: (error as Error).message });
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  log('info', 'Received SIGTERM, shutting down...');
  await redis.quit();
  await redisSub.quit();
  await pool.end();
  wss.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  log('info', 'Received SIGINT, shutting down...');
  await redis.quit();
  await redisSub.quit();
  await pool.end();
  wss.close();
  process.exit(0);
});

// Start the service
main();
