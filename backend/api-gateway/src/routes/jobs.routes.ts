import { Router, Response } from 'express';
import { db } from '../config/database.js';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';

export const jobsRouter = Router();

// All routes require authentication
jobsRouter.use(authenticate);

interface JobRow {
  id: string;
  external_id: string | null;
  title: string;
  company: string;
  location: string | null;
  source: string;
  category: string;
  description: string | null;
  url: string | null;
  salary_range: string | null;
  requirements: any;
  skills: any;
  experience_level: string | null;
  job_type: string;
  remote_type: string;
  posted_date: Date | null;
  scraped_at: Date;
  is_active: boolean;
  application_count: number;
}

// GET /api/jobs - List jobs with pagination and filters
jobsRouter.get('/', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const {
    page = '1',
    limit = '20',
    source,
    category,
    search,
    sortBy = 'scraped_at',
    sortOrder = 'desc',
    isActive = 'true',
  } = req.query;

  const pageNum = Math.max(1, parseInt(page as string));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));
  const offset = (pageNum - 1) * limitNum;

  // Build query
  let whereClause = 'WHERE 1=1';
  const params: any[] = [];
  let paramIndex = 1;

  if (isActive === 'true') {
    whereClause += ` AND is_active = true`;
  }

  if (source && source !== 'all') {
    whereClause += ` AND source = $${paramIndex++}`;
    params.push(source);
  }

  if (category && category !== 'all') {
    whereClause += ` AND category = $${paramIndex++}`;
    params.push(category);
  }

  if (search) {
    whereClause += ` AND (title ILIKE $${paramIndex} OR company ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
    params.push(`%${search}%`);
    paramIndex++;
  }

  // Validate sort
  const validSortFields = ['title', 'company', 'posted_date', 'scraped_at', 'source', 'category'];
  const sortField = validSortFields.includes(sortBy as string) ? sortBy : 'scraped_at';
  const sortDir = sortOrder === 'asc' ? 'ASC' : 'DESC';

  // Get total count
  const countResult = await db.query(
    `SELECT COUNT(*) as total FROM jobs ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].total);

  // Get jobs
  const jobsResult = await db.query<JobRow>(
    `SELECT * FROM jobs ${whereClause}
     ORDER BY ${sortField} ${sortDir}
     LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
    [...params, limitNum, offset]
  );

  res.json({
    jobs: jobsResult.rows.map(job => ({
      id: job.id,
      externalId: job.external_id,
      title: job.title,
      company: job.company,
      location: job.location,
      source: job.source,
      category: job.category,
      description: job.description,
      url: job.url,
      salaryRange: job.salary_range,
      requirements: job.requirements,
      skills: job.skills,
      experienceLevel: job.experience_level,
      jobType: job.job_type,
      remoteType: job.remote_type,
      postedDate: job.posted_date,
      scrapedAt: job.scraped_at,
      isActive: job.is_active,
      applicationCount: job.application_count,
    })),
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    },
  });
}));

// GET /api/jobs/stats - Job statistics for dashboard
jobsRouter.get('/stats', asyncHandler(async (req: AuthenticatedRequest, res) => {
  // Jobs found today
  const todayResult = await db.query(`
    SELECT COUNT(*) as count
    FROM jobs
    WHERE DATE(scraped_at) = CURRENT_DATE AND is_active = true
  `);

  // Jobs by category
  const categoryResult = await db.query(`
    SELECT category, COUNT(*) as count
    FROM jobs
    WHERE is_active = true
    GROUP BY category
  `);

  // Jobs by source
  const sourceResult = await db.query(`
    SELECT source, COUNT(*) as count
    FROM jobs
    WHERE is_active = true
    GROUP BY source
  `);

  // Recent jobs (last 7 days trend)
  const trendResult = await db.query(`
    SELECT DATE(scraped_at) as date, COUNT(*) as count
    FROM jobs
    WHERE scraped_at >= CURRENT_DATE - INTERVAL '7 days'
    GROUP BY DATE(scraped_at)
    ORDER BY date
  `);

  const jobsByCategory: Record<string, number> = {};
  categoryResult.rows.forEach((row: any) => {
    jobsByCategory[row.category] = parseInt(row.count);
  });

  const jobsBySource: Record<string, number> = {};
  sourceResult.rows.forEach((row: any) => {
    jobsBySource[row.source] = parseInt(row.count);
  });

  res.json({
    jobsFoundToday: parseInt(todayResult.rows[0].count),
    jobsByCategory,
    jobsBySource,
    trend: trendResult.rows.map((row: any) => ({
      date: row.date,
      count: parseInt(row.count),
    })),
  });
}));

// GET /api/jobs/:id - Get job details
jobsRouter.get('/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;

  const result = await db.query<JobRow>(
    'SELECT * FROM jobs WHERE id = $1',
    [id]
  );

  if (result.rows.length === 0) {
    throw new AppError('Job not found', 404);
  }

  const job = result.rows[0];

  res.json({
    id: job.id,
    externalId: job.external_id,
    title: job.title,
    company: job.company,
    location: job.location,
    source: job.source,
    category: job.category,
    description: job.description,
    url: job.url,
    salaryRange: job.salary_range,
    requirements: job.requirements,
    skills: job.skills,
    experienceLevel: job.experience_level,
    jobType: job.job_type,
    remoteType: job.remote_type,
    postedDate: job.posted_date,
    scrapedAt: job.scraped_at,
    isActive: job.is_active,
    applicationCount: job.application_count,
  });
}));

// GET /api/jobs/export - Export jobs to CSV
jobsRouter.get('/export/csv', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { source, category } = req.query;

  let whereClause = 'WHERE is_active = true';
  const params: any[] = [];
  let paramIndex = 1;

  if (source && source !== 'all') {
    whereClause += ` AND source = $${paramIndex++}`;
    params.push(source);
  }

  if (category && category !== 'all') {
    whereClause += ` AND category = $${paramIndex++}`;
    params.push(category);
  }

  const result = await db.query<JobRow>(
    `SELECT title, company, location, source, category, salary_range, url, posted_date
     FROM jobs ${whereClause}
     ORDER BY scraped_at DESC
     LIMIT 1000`,
    params
  );

  // Generate CSV
  const headers = ['Title', 'Company', 'Location', 'Source', 'Category', 'Salary Range', 'URL', 'Posted Date'];
  const rows = result.rows.map(job => [
    `"${job.title.replace(/"/g, '""')}"`,
    `"${job.company.replace(/"/g, '""')}"`,
    `"${(job.location || '').replace(/"/g, '""')}"`,
    job.source,
    job.category,
    `"${(job.salary_range || '').replace(/"/g, '""')}"`,
    job.url || '',
    job.posted_date ? new Date(job.posted_date).toISOString().split('T')[0] : '',
  ]);

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="jobs-export-${new Date().toISOString().split('T')[0]}.csv"`);
  res.send(csv);
}));
