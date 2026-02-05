import { WebSocketServer, WebSocket } from 'ws';
import { verifyToken, JwtPayload, updateHeartbeat } from '../middleware/auth.js';
import { redis } from '../config/redis.js';
import { db } from '../config/database.js';

interface AuthenticatedWebSocket extends WebSocket {
  userId?: string;
  isAlive?: boolean;
}

// Store connected clients
const clients = new Map<string, AuthenticatedWebSocket>();

export function setupWebSocket(wss: WebSocketServer) {
  // Heartbeat interval
  const heartbeatInterval = setInterval(() => {
    wss.clients.forEach((ws: AuthenticatedWebSocket) => {
      if (ws.isAlive === false) {
        // Client didn't respond to ping, terminate
        if (ws.userId) {
          handleDisconnect(ws.userId);
        }
        return ws.terminate();
      }

      ws.isAlive = false;
      ws.ping();
    });
  }, 30000); // 30 seconds

  wss.on('close', () => {
    clearInterval(heartbeatInterval);
  });

  wss.on('connection', async (ws: AuthenticatedWebSocket, req) => {
    // Extract token from query string
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const token = url.searchParams.get('token');

    if (!token) {
      ws.send(JSON.stringify({ type: 'ERROR', message: 'Authentication required' }));
      ws.close(1008, 'Authentication required');
      return;
    }

    // Verify token
    const payload = verifyToken(token);
    if (!payload) {
      ws.send(JSON.stringify({ type: 'ERROR', message: 'Invalid token' }));
      ws.close(1008, 'Invalid token');
      return;
    }

    // Store client
    ws.userId = payload.userId;
    ws.isAlive = true;
    clients.set(payload.userId, ws);

    console.log(`WebSocket connected: ${payload.email} (${payload.userId})`);

    // Send welcome message
    ws.send(JSON.stringify({
      type: 'CONNECTED',
      userId: payload.userId,
      timestamp: new Date().toISOString(),
    }));

    // Update presence
    await updatePresence(payload.userId, 'available');

    // Handle pong (heartbeat response)
    ws.on('pong', () => {
      ws.isAlive = true;
      updateHeartbeat(payload.userId);
    });

    // Handle messages
    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        await handleMessage(ws, payload, message);
      } catch (error) {
        console.error('WebSocket message error:', error);
        ws.send(JSON.stringify({ type: 'ERROR', message: 'Invalid message format' }));
      }
    });

    // Handle close
    ws.on('close', () => {
      console.log(`WebSocket disconnected: ${payload.email}`);
      handleDisconnect(payload.userId);
    });

    // Handle error
    ws.on('error', (error) => {
      console.error(`WebSocket error for ${payload.email}:`, error);
      handleDisconnect(payload.userId);
    });
  });

  // Subscribe to Redis channels for inter-service communication
  subscribeToRedisChannels();
}

async function handleMessage(
  ws: AuthenticatedWebSocket,
  user: JwtPayload,
  message: { type: string; [key: string]: any }
) {
  switch (message.type) {
    case 'HEARTBEAT':
      await updateHeartbeat(user.userId);
      ws.send(JSON.stringify({ type: 'HEARTBEAT_ACK', timestamp: new Date().toISOString() }));
      break;

    case 'PRESENCE_UPDATE':
      if (message.status && ['available', 'busy', 'offline'].includes(message.status)) {
        await updatePresence(user.userId, message.status);
        ws.send(JSON.stringify({ type: 'PRESENCE_UPDATED', status: message.status }));
      }
      break;

    case 'TASK_STARTED':
      if (message.taskId) {
        // Update task in database
        await db.query(
          `UPDATE ats_tasks SET status = 'in_progress', started_at = NOW() WHERE id = $1 AND assigned_to = $2`,
          [message.taskId, user.userId]
        );

        // Broadcast to managers
        broadcastToRole(['admin', 'manager'], {
          type: 'TASK_STATUS_CHANGED',
          taskId: message.taskId,
          employeeId: user.userId,
          newStatus: 'in_progress',
          timestamp: new Date().toISOString(),
        });
      }
      break;

    case 'REQUEST_TASK_INFO':
      // Get current task for user
      const taskResult = await db.query(`
        SELECT t.*, c.name as candidate_name, j.title as job_title
        FROM ats_tasks t
        JOIN candidates c ON t.candidate_id = c.id
        JOIN jobs j ON t.job_id = j.id
        WHERE t.assigned_to = $1 AND t.status IN ('assigned', 'in_progress')
        LIMIT 1
      `, [user.userId]);

      if (taskResult.rows.length > 0) {
        const task = taskResult.rows[0];
        ws.send(JSON.stringify({
          type: 'CURRENT_TASK',
          task: {
            id: task.id,
            candidateName: task.candidate_name,
            jobTitle: task.job_title,
            atsScore: parseFloat(task.ats_score),
            status: task.status,
            dueAt: task.due_at,
            missingKeywords: task.missing_keywords,
            suggestions: task.suggestions,
          },
        }));
      } else {
        ws.send(JSON.stringify({ type: 'CURRENT_TASK', task: null }));
      }
      break;

    default:
      console.log(`Unknown message type: ${message.type}`);
  }
}

async function updatePresence(userId: string, status: string) {
  await db.query(
    `UPDATE employees SET status = $1, last_heartbeat = NOW() WHERE id = $2`,
    [status, userId]
  );

  if (status === 'offline') {
    await redis.srem('online_users', userId);
  } else {
    await redis.sadd('online_users', userId);
  }

  // Broadcast to all connected clients
  broadcast({
    type: 'PRESENCE_UPDATE',
    userId,
    status,
    timestamp: new Date().toISOString(),
  });
}

async function handleDisconnect(userId: string) {
  clients.delete(userId);

  // Update status to offline
  await db.query(
    `UPDATE employees SET status = 'offline' WHERE id = $1`,
    [userId]
  );

  await redis.srem('online_users', userId);
  await redis.del(`session:${userId}`);

  // Broadcast disconnect
  broadcast({
    type: 'PRESENCE_UPDATE',
    userId,
    status: 'offline',
    timestamp: new Date().toISOString(),
  });
}

function subscribeToRedisChannels() {
  // Subscribe to task updates
  redis.subscribe('task_updates', (message) => {
    const data = JSON.parse(message);

    switch (data.type) {
      case 'TASK_ASSIGNED':
        // Notify assigned employee
        sendToUser(data.employeeId, {
          type: 'TASK_ASSIGNED',
          task: data.task,
          timestamp: data.timestamp,
        });
        break;

      case 'TASK_COMPLETED':
        // Broadcast to managers
        broadcastToRole(['admin', 'manager'], {
          type: 'TASK_COMPLETED',
          taskId: data.taskId,
          employeeId: data.employeeId,
          completionTime: data.completionTimeSeconds,
          timestamp: data.timestamp,
        });
        break;

      case 'TASK_WARNING':
        // Notify employee
        sendToUser(data.employeeId, {
          type: 'TASK_WARNING',
          taskId: data.taskId,
          minutesRemaining: data.minutesRemaining,
          timestamp: data.timestamp,
        });
        break;

      case 'WARNING_ADDED':
      case 'VIOLATION_ADDED':
        // Notify employee and managers
        sendToUser(data.employeeId, {
          type: data.type,
          warnings: data.warnings,
          violations: data.violations,
          message: data.message,
          timestamp: data.timestamp,
        });
        broadcastToRole(['admin', 'manager'], {
          type: data.type,
          employeeId: data.employeeId,
          warnings: data.warnings,
          violations: data.violations,
          timestamp: data.timestamp,
        });
        break;
    }
  });

  // Subscribe to presence updates
  redis.subscribe('presence_updates', (message) => {
    const data = JSON.parse(message);
    broadcast({
      type: 'PRESENCE_UPDATE',
      userId: data.userId,
      status: data.status,
      timestamp: data.timestamp,
    });
  });

  // Subscribe to new jobs
  redis.subscribe('new_jobs', (message) => {
    const data = JSON.parse(message);
    broadcast({
      type: 'NEW_JOBS',
      count: data.count,
      jobs: data.jobs,
      timestamp: new Date().toISOString(),
    });
  });
}

// Utility functions for sending messages
export function sendToUser(userId: string, message: object) {
  const client = clients.get(userId);
  if (client && client.readyState === WebSocket.OPEN) {
    client.send(JSON.stringify(message));
  }
}

export function broadcast(message: object) {
  const data = JSON.stringify(message);
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

export async function broadcastToRole(roles: string[], message: object) {
  const data = JSON.stringify(message);

  // Get all users with specified roles
  const result = await db.query(
    `SELECT id FROM employees WHERE role = ANY($1)`,
    [roles]
  );

  result.rows.forEach((row) => {
    const client = clients.get(row.id);
    if (client && client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

export function getConnectedClients(): string[] {
  return Array.from(clients.keys());
}

export function isUserOnline(userId: string): boolean {
  const client = clients.get(userId);
  return client !== undefined && client.readyState === WebSocket.OPEN;
}
