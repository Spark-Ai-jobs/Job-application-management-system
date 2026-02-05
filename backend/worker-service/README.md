# Workflow & Task Engine

## Overview
This service manages the "Human-in-the-Loop" process, similar to a ride-sharing dispatch system. It ensures that resumes needing manual tailoring are assigned to available employees efficiently.

## Features
- **Real-time Availability:** Tracks employee status (Green/Available, Busy, Offline) via WebSockets.
- **Smart Assignment:** Pushes tasks to available agents. Queues tasks if no agents are available.
- **SLA Timer:** Enforces a 15-20 minute window for resume updates.
- **Performance Monitoring:**
    - Tracks "Strikes" (missed deadlines).
    - Enforces the **3-Strike Rule** (4th violation triggers administrative action).

## Tech Stack
- Node.js / TypeScript
- Redis (for Queues and Pub/Sub)
- Socket.io (Real-time communication)
