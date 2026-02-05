import { db } from '../config/database.js';
import { redis } from '../config/redis.js';

const SLA_MINUTES = 20;
const WARNING_MINUTES = 5; // Warn when 5 minutes remaining
const WARNINGS_PER_VIOLATION = 3;
const MAX_VIOLATIONS = 4; // 4th violation = serious action
const CHECK_INTERVAL_MS = 60000; // Check every minute

interface OverdueTask {
  id: string;
  candidate_id: string;
  job_id: string;
  assigned_to: string;
  due_at: Date;
  employee_name: string;
  employee_email: string;
  employee_warnings: number;
  employee_violations: number;
}

export function startTimeoutChecker() {
  console.log('Timeout Checker Worker started');

  // Run immediately, then on interval
  checkTimeouts();
  checkWarnings();

  setInterval(checkTimeouts, CHECK_INTERVAL_MS);
  setInterval(checkWarnings, CHECK_INTERVAL_MS);
}

async function checkTimeouts() {
  try {
    const now = new Date();

    // Find overdue tasks
    const result = await db.query<OverdueTask>(`
      SELECT t.id, t.candidate_id, t.job_id, t.assigned_to, t.due_at,
             e.name as employee_name, e.email as employee_email, e.warnings as employee_warnings, e.violations as employee_violations
      FROM ats_tasks t
      JOIN employees e ON t.assigned_to = e.id
      WHERE t.status IN ('assigned', 'in_progress')
        AND t.due_at < $1
    `, [now]);

    for (const task of result.rows) {
      await handleTimeout(task);
    }
  } catch (error) {
    console.error('Timeout checker error:', error);
  }
}

async function handleTimeout(task: OverdueTask) {
  try {
    await db.transaction(async (client) => {
      // 1. Update task status to timeout and re-queue
      await client.query(`
        UPDATE ats_tasks
        SET status = 'queued',
            assigned_to = NULL,
            assigned_at = NULL,
            due_at = NULL,
            started_at = NULL,
            retry_count = retry_count + 1
        WHERE id = $1
      `, [task.id]);

      // 2. Calculate new warnings/violations
      let newWarnings = task.employee_warnings + 1;
      let newViolations = task.employee_violations;
      let newStatus = 'available';
      let incidentType = 'warning';
      let message = 'Task timeout - 1 warning added';

      // Check if warnings reached threshold
      if (newWarnings >= WARNINGS_PER_VIOLATION) {
        newViolations += 1;
        newWarnings = 0;
        incidentType = 'violation';
        message = `Task timeout - 3 warnings converted to 1 violation. Total violations: ${newViolations}`;

        // Check for serious action (4th violation)
        if (newViolations >= MAX_VIOLATIONS) {
          newStatus = 'offline'; // Lock account
          message = `SERIOUS: 4th violation reached. Account locked pending review.`;

          console.log(`SERIOUS ACTION: Employee ${task.employee_email} has ${newViolations} violations - account locked`);
        }
      }

      // 3. Update employee
      await client.query(`
        UPDATE employees
        SET warnings = $1,
            violations = $2,
            status = $3,
            current_task_id = NULL
        WHERE id = $4
      `, [newWarnings, newViolations, newStatus, task.assigned_to]);

      // 4. Create incident record
      await client.query(`
        INSERT INTO employee_incidents (employee_id, type, reason, task_id)
        VALUES ($1, $2, $3, $4)
      `, [task.assigned_to, incidentType, `Task timeout - exceeded ${SLA_MINUTES} minute SLA`, task.id]);

      console.log(`Task ${task.id} timed out for ${task.employee_name}. ${message}`);

      // 5. Notify via Redis
      await redis.publish('task_updates', JSON.stringify({
        type: incidentType === 'violation' ? 'VIOLATION_ADDED' : 'WARNING_ADDED',
        employeeId: task.assigned_to,
        warnings: newWarnings,
        violations: newViolations,
        message,
        taskId: task.id,
        timestamp: new Date().toISOString(),
      }));

      // Notify managers if violation or serious action
      if (incidentType === 'violation') {
        await redis.publish('task_updates', JSON.stringify({
          type: 'MANAGER_ALERT',
          alertType: newViolations >= MAX_VIOLATIONS ? 'serious_action' : 'violation',
          employeeId: task.assigned_to,
          employeeName: task.employee_name,
          violations: newViolations,
          message,
          timestamp: new Date().toISOString(),
        }));
      }
    });
  } catch (error) {
    console.error(`Error handling timeout for task ${task.id}:`, error);
  }
}

async function checkWarnings() {
  try {
    const now = new Date();
    const warningThreshold = new Date(now.getTime() + WARNING_MINUTES * 60 * 1000);

    // Find tasks that are about to be due (within WARNING_MINUTES)
    const result = await db.query(`
      SELECT t.id, t.assigned_to, t.due_at,
             EXTRACT(EPOCH FROM (t.due_at - $1)) / 60 as minutes_remaining
      FROM ats_tasks t
      WHERE t.status IN ('assigned', 'in_progress')
        AND t.due_at > $1
        AND t.due_at <= $2
    `, [now, warningThreshold]);

    for (const task of result.rows) {
      const minutesRemaining = Math.round(task.minutes_remaining);

      // Only warn at specific intervals (5, 3, 1 minutes)
      if (minutesRemaining === 5 || minutesRemaining === 3 || minutesRemaining === 1) {
        // Check if we already warned for this minute (use Redis to prevent duplicate warnings)
        const warnKey = `task_warning:${task.id}:${minutesRemaining}`;
        const alreadyWarned = await redis.exists(warnKey);

        if (!alreadyWarned) {
          await redis.set(warnKey, '1', { EX: 120 }); // Expire after 2 minutes

          // Send warning
          await redis.publish('task_updates', JSON.stringify({
            type: 'TASK_WARNING',
            employeeId: task.assigned_to,
            taskId: task.id,
            minutesRemaining,
            timestamp: now.toISOString(),
          }));

          console.log(`Task ${task.id} warning sent: ${minutesRemaining} minutes remaining`);
        }
      }
    }
  } catch (error) {
    console.error('Warning checker error:', error);
  }
}

// Manual function to add warning (for admin use)
export async function addWarning(employeeId: string, reason: string, taskId?: string) {
  const result = await db.query(
    'SELECT warnings, violations FROM employees WHERE id = $1',
    [employeeId]
  );

  if (result.rows.length === 0) {
    throw new Error('Employee not found');
  }

  let newWarnings = result.rows[0].warnings + 1;
  let newViolations = result.rows[0].violations;

  if (newWarnings >= WARNINGS_PER_VIOLATION) {
    newViolations += 1;
    newWarnings = 0;
  }

  await db.query(
    `UPDATE employees SET warnings = $1, violations = $2 WHERE id = $3`,
    [newWarnings, newViolations, employeeId]
  );

  await db.query(`
    INSERT INTO employee_incidents (employee_id, type, reason, task_id)
    VALUES ($1, $2, $3, $4)
  `, [employeeId, newWarnings === 0 ? 'violation' : 'warning', reason, taskId]);

  return { warnings: newWarnings, violations: newViolations };
}
