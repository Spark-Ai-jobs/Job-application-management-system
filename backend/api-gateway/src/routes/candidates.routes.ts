import { Router, Response } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../config/database.js';
import { minio } from '../config/minio.js';
import { authenticate, AuthenticatedRequest, requireRole } from '../middleware/auth.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';

export const candidatesRouter = Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF and DOC/DOCX are allowed.'));
    }
  },
});

// All routes require authentication
candidatesRouter.use(authenticate);

interface CandidateRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  resume_url: string | null;
  resume_text: string | null;
  skills: any;
  experience_years: number | null;
  education: any;
  total_applications: number;
  successful_applications: number;
  uploaded_by: string | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

// GET /api/candidates - List all candidates
candidatesRouter.get('/', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { page = '1', limit = '20', search, sortBy = 'created_at', sortOrder = 'desc' } = req.query;

  const pageNum = Math.max(1, parseInt(page as string));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));
  const offset = (pageNum - 1) * limitNum;

  let whereClause = 'WHERE 1=1';
  const params: any[] = [];
  let paramIndex = 1;

  if (search) {
    whereClause += ` AND (name ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`;
    params.push(`%${search}%`);
    paramIndex++;
  }

  // Get total count
  const countResult = await db.query(
    `SELECT COUNT(*) as total FROM candidates ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].total);

  // Get candidates with uploader info
  const result = await db.query<CandidateRow & { uploader_name: string | null }>(
    `SELECT c.*, e.name as uploader_name
     FROM candidates c
     LEFT JOIN employees e ON c.uploaded_by = e.id
     ${whereClause}
     ORDER BY c.${sortBy === 'name' ? 'name' : 'created_at'} ${sortOrder === 'asc' ? 'ASC' : 'DESC'}
     LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
    [...params, limitNum, offset]
  );

  res.json({
    candidates: result.rows.map(c => ({
      id: c.id,
      name: c.name,
      email: c.email,
      phone: c.phone,
      resumeUrl: c.resume_url,
      skills: c.skills,
      experienceYears: c.experience_years,
      education: c.education,
      totalApplications: c.total_applications,
      successfulApplications: c.successful_applications,
      uploadedBy: c.uploaded_by,
      uploaderName: c.uploader_name,
      notes: c.notes,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
    })),
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    },
  });
}));

// GET /api/candidates/:id - Get candidate details
candidatesRouter.get('/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;

  const result = await db.query<CandidateRow & { uploader_name: string | null }>(
    `SELECT c.*, e.name as uploader_name
     FROM candidates c
     LEFT JOIN employees e ON c.uploaded_by = e.id
     WHERE c.id = $1`,
    [id]
  );

  if (result.rows.length === 0) {
    throw new AppError('Candidate not found', 404);
  }

  const c = result.rows[0];

  // Get recent applications
  const appsResult = await db.query(`
    SELECT a.*, j.title as job_title, j.company as job_company
    FROM applications a
    JOIN jobs j ON a.job_id = j.id
    WHERE a.candidate_id = $1
    ORDER BY a.created_at DESC
    LIMIT 10
  `, [id]);

  res.json({
    id: c.id,
    name: c.name,
    email: c.email,
    phone: c.phone,
    resumeUrl: c.resume_url,
    resumeText: c.resume_text,
    skills: c.skills,
    experienceYears: c.experience_years,
    education: c.education,
    totalApplications: c.total_applications,
    successfulApplications: c.successful_applications,
    uploadedBy: c.uploaded_by,
    uploaderName: c.uploader_name,
    notes: c.notes,
    createdAt: c.created_at,
    updatedAt: c.updated_at,
    recentApplications: appsResult.rows.map((a: any) => ({
      id: a.id,
      jobId: a.job_id,
      jobTitle: a.job_title,
      jobCompany: a.job_company,
      status: a.status,
      atsScore: a.ats_score_at_submission,
      submittedAt: a.submitted_at,
      createdAt: a.created_at,
    })),
  });
}));

// POST /api/candidates - Create new candidate
candidatesRouter.post('/', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { name, email, phone, skills, experienceYears, education, notes } = req.body;
  const userId = req.user!.userId;

  if (!name || !email) {
    throw new AppError('Name and email are required', 400);
  }

  // Check for duplicate email
  const existing = await db.query('SELECT id FROM candidates WHERE email = $1', [email.toLowerCase()]);
  if (existing.rows.length > 0) {
    throw new AppError('Candidate with this email already exists', 409);
  }

  const result = await db.query<CandidateRow>(
    `INSERT INTO candidates (name, email, phone, skills, experience_years, education, notes, uploaded_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [name, email.toLowerCase(), phone, JSON.stringify(skills || []), experienceYears, JSON.stringify(education || []), notes, userId]
  );

  const c = result.rows[0];

  res.status(201).json({
    id: c.id,
    name: c.name,
    email: c.email,
    phone: c.phone,
    resumeUrl: c.resume_url,
    skills: c.skills,
    experienceYears: c.experience_years,
    education: c.education,
    totalApplications: c.total_applications,
    createdAt: c.created_at,
  });
}));

// PUT /api/candidates/:id - Update candidate
candidatesRouter.put('/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const { name, email, phone, skills, experienceYears, education, notes } = req.body;

  // Check if candidate exists
  const existing = await db.query('SELECT id FROM candidates WHERE id = $1', [id]);
  if (existing.rows.length === 0) {
    throw new AppError('Candidate not found', 404);
  }

  // Check for duplicate email (excluding current candidate)
  if (email) {
    const duplicate = await db.query(
      'SELECT id FROM candidates WHERE email = $1 AND id != $2',
      [email.toLowerCase(), id]
    );
    if (duplicate.rows.length > 0) {
      throw new AppError('Another candidate with this email already exists', 409);
    }
  }

  const result = await db.query<CandidateRow>(
    `UPDATE candidates
     SET name = COALESCE($1, name),
         email = COALESCE($2, email),
         phone = COALESCE($3, phone),
         skills = COALESCE($4, skills),
         experience_years = COALESCE($5, experience_years),
         education = COALESCE($6, education),
         notes = COALESCE($7, notes)
     WHERE id = $8
     RETURNING *`,
    [name, email?.toLowerCase(), phone, skills ? JSON.stringify(skills) : null, experienceYears, education ? JSON.stringify(education) : null, notes, id]
  );

  const c = result.rows[0];

  res.json({
    id: c.id,
    name: c.name,
    email: c.email,
    phone: c.phone,
    resumeUrl: c.resume_url,
    skills: c.skills,
    experienceYears: c.experience_years,
    education: c.education,
    notes: c.notes,
    updatedAt: c.updated_at,
  });
}));

// DELETE /api/candidates/:id - Delete candidate
candidatesRouter.delete('/:id', requireRole('admin', 'manager'), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;

  // Check if candidate exists
  const existing = await db.query<{ resume_url: string | null }>('SELECT resume_url FROM candidates WHERE id = $1', [id]);
  if (existing.rows.length === 0) {
    throw new AppError('Candidate not found', 404);
  }

  // Delete resume from MinIO if exists
  const resumeUrl = existing.rows[0].resume_url;
  if (resumeUrl) {
    try {
      const objectName = resumeUrl.split('/').pop();
      if (objectName) {
        await minio.delete(minio.BUCKETS.RESUMES, objectName);
      }
    } catch (error) {
      console.error('Failed to delete resume file:', error);
    }
  }

  // Delete candidate (cascades to applications and tasks)
  await db.query('DELETE FROM candidates WHERE id = $1', [id]);

  res.json({ message: 'Candidate deleted successfully' });
}));

// POST /api/candidates/:id/resume - Upload resume for existing candidate
candidatesRouter.post('/:id/resume', upload.single('resume'), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const file = req.file;

  if (!file) {
    throw new AppError('No file uploaded', 400);
  }

  // Check if candidate exists
  const existing = await db.query<{ resume_url: string | null }>('SELECT resume_url FROM candidates WHERE id = $1', [id]);
  if (existing.rows.length === 0) {
    throw new AppError('Candidate not found', 404);
  }

  // Delete old resume if exists
  const oldResumeUrl = existing.rows[0].resume_url;
  if (oldResumeUrl) {
    try {
      const oldObjectName = oldResumeUrl.split('/').pop();
      if (oldObjectName) {
        await minio.delete(minio.BUCKETS.RESUMES, oldObjectName);
      }
    } catch (error) {
      console.error('Failed to delete old resume:', error);
    }
  }

  // Generate unique filename
  const ext = file.originalname.split('.').pop();
  const objectName = `${id}_${uuidv4()}.${ext}`;

  // Upload to MinIO
  const resumeUrl = await minio.upload(
    minio.BUCKETS.RESUMES,
    objectName,
    file.buffer,
    file.mimetype
  );

  // Update candidate
  await db.query(
    'UPDATE candidates SET resume_url = $1 WHERE id = $2',
    [resumeUrl, id]
  );

  res.json({
    resumeUrl,
    message: 'Resume uploaded successfully',
  });
}));

// POST /api/candidates/upload - Create candidate with resume upload
candidatesRouter.post('/upload', upload.single('resume'), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { name, email, phone, skills, experienceYears } = req.body;
  const file = req.file;
  const userId = req.user!.userId;

  if (!name || !email) {
    throw new AppError('Name and email are required', 400);
  }

  // Check for duplicate email
  const existing = await db.query('SELECT id FROM candidates WHERE email = $1', [email.toLowerCase()]);
  if (existing.rows.length > 0) {
    throw new AppError('Candidate with this email already exists', 409);
  }

  // Create candidate first
  const candidateResult = await db.query<CandidateRow>(
    `INSERT INTO candidates (name, email, phone, skills, experience_years, uploaded_by)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [name, email.toLowerCase(), phone, JSON.stringify(skills ? JSON.parse(skills) : []), experienceYears ? parseInt(experienceYears) : null, userId]
  );

  const candidate = candidateResult.rows[0];
  let resumeUrl = null;

  // Upload resume if provided
  if (file) {
    const ext = file.originalname.split('.').pop();
    const objectName = `${candidate.id}_${uuidv4()}.${ext}`;

    resumeUrl = await minio.upload(
      minio.BUCKETS.RESUMES,
      objectName,
      file.buffer,
      file.mimetype
    );

    await db.query(
      'UPDATE candidates SET resume_url = $1 WHERE id = $2',
      [resumeUrl, candidate.id]
    );
  }

  res.status(201).json({
    id: candidate.id,
    name: candidate.name,
    email: candidate.email,
    phone: candidate.phone,
    resumeUrl,
    skills: candidate.skills,
    experienceYears: candidate.experience_years,
    createdAt: candidate.created_at,
  });
}));
