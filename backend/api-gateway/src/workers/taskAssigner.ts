import { db } from '../config/database.js';
import { redis } from '../config/redis.js';

const SLA_MINUTES = 20;
const ASSIGNMENT_INTERVAL_MS = 5000; // Check every 5 seconds

interface Task {
  id: string;
  candidate_id: string;
  job_id: string;
  ats_score: number;
  candidate_name: string;
  job_title: string;
  missing_keywords: any;
  suggestions: any;
  old_resume_url: string | null;
}

interface Employee {
  id: string;
  name: string;
  email: string;
  tasks_completed: number;
}

export function startTaskAssigner() {
  console.log('Task Assigner Worker started');

  // Run immediately, then on interval
  assignNextTask();
  setInterval(assignNextTask, ASSIGNMENT_INTERVAL_MS);
}

async function assignNextTask() {
  try {
    // Use transaction to ensure atomic assignment
    await db.transaction(async (client) => {
      // 1. Get next queued task (FIFO)
      const taskResult = await client.query<Task>(`
        SELECT t.id, t.candidate_id, t.job_id, t.ats_score, t.missing_keywords, t.suggestions, t.old_resume_url,
               c.name as candidate_name, j.title as job_title
        FROM ats_tasks t
        JOIN candidates c ON t.candidate_id = c.id
        JOIN jobs j ON t.job_id = j.id
        WHERE t.status = 'queued'
        ORDER BY t.created_at ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      `);

      if (taskResult.rows.length === 0) {
        return; // No tasks in queue
      }

      const task = taskResult.rows[0];

      // 2. Find available employee (round-robin with load balancing)
      const employeeResult = await client.query<Employee>(`
        SELECT id, name, email, tasks_completed
        FROM employees
        WHERE status = 'available'
          AND violations < 4
          AND current_task_id IS NULL
          AND last_heartbeat > NOW() - INTERVAL '5 minutes'
        ORDER BY tasks_completed ASC, last_heartbeat DESC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      `);

      if (employeeResult.rows.length === 0) {
        return; // No available employees
      }

      const employee = employeeResult.rows[0];

      const now = new Date();
      const dueAt = new Date(now.getTime() + SLA_MINUTES * 60 * 1000);

      // 3. Assign task to employee
      await client.query(`
        UPDATE ats_tasks
        SET status = 'assigned',
            assigned_to = $1,
            assigned_at = $2,
            due_at = $3
        WHERE id = $4
      `, [employee.id, now, dueAt, task.id]);

      // 4. Update employee status
      await client.query(`
        UPDATE employees
        SET status = 'busy', current_task_id = $1
        WHERE id = $2
      `, [task.id, employee.id]);

      console.log(`Task ${task.id} assigned to ${employee.name} (${employee.email})`);

      // 5. Notify employee via Redis (WebSocket will pick this up)
      await redis.publish('task_updates', JSON.stringify({
        type: 'TASK_ASSIGNED',
        employeeId: employee.id,
        task: {
          id: task.id,
          candidateName: task.candidate_name,
          jobTitle: task.job_title,
          atsScore: parseFloat(task.ats_score.toString()),
          dueAt: dueAt.toISOString(),
          missingKeywords: task.missing_keywords,
          suggestions: task.suggestions,
          oldResumeUrl: task.old_resume_url,
        },
        timestamp: now.toISOString(),
      }));
    });
  } catch (error) {
    console.error('Task assignment error:', error);
  }
}

// Function to queue a new task (called by ATS service)
export async function queueTask(candidateId: string, jobId: string, atsScore: number, missingKeywords: string[], suggestions: string[]) {
  // Get candidate's current resume
  const candidateResult = await db.query(
    'SELECT resume_url FROM candidates WHERE id = $1',
    [candidateId]
  );

  const resumeUrl = candidateResult.rows[0]?.resume_url;

  // Create task
  const result = await db.query(`
    INSERT INTO ats_tasks (candidate_id, job_id, ats_score, status, old_resume_url, missing_keywords, suggestions)
    VALUES ($1, $2, $3, 'queued', $4, $5, $6)
    RETURNING id
  `, [candidateId, jobId, atsScore, resumeUrl, JSON.stringify(missingKeywords), JSON.stringify(suggestions)]);

  console.log(`New task queued: ${result.rows[0].id} (ATS: ${atsScore}%)`);

  return result.rows[0].id;
}

// Function to auto-submit application (ATS >= 90%)
export async function autoSubmitApplication(candidateId: string, jobId: string, atsScore: number) {
  // Get candidate's current resume
  const candidateResult = await db.query(
    'SELECT resume_url FROM candidates WHERE id = $1',
    [candidateId]
  );

  const resumeUrl = candidateResult.rows[0]?.resume_url;

  // Create application record
  await db.query(`
    INSERT INTO applications (candidate_id, job_id, resume_used_url, ats_score_at_submission, status, auto_submitted, submitted_at)
    VALUES ($1, $2, $3, $4, 'submitted', TRUE, NOW())
    ON CONFLICT (candidate_id, job_id) DO NOTHING
  `, [candidateId, jobId, resumeUrl, atsScore]);

  // Update candidate stats
  await db.query(`
    UPDATE candidates SET total_applications = total_applications + 1 WHERE id = $1
  `, [candidateId]);

  // Update job application count
  await db.query(`
    UPDATE jobs SET application_count = application_count + 1 WHERE id = $1
  `, [jobId]);

  console.log(`Auto-submitted application: Candidate ${candidateId} -> Job ${jobId} (ATS: ${atsScore}%)`);
}
