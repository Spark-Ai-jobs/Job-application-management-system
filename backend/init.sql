-- Spark.AI Database Schema
-- Enterprise Job Application Management System

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- EMPLOYEES (Users/Staff)
-- ============================================
CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    avatar_url VARCHAR(500),
    role VARCHAR(20) DEFAULT 'employee' CHECK (role IN ('admin', 'manager', 'employee')),
    status VARCHAR(20) DEFAULT 'offline' CHECK (status IN ('available', 'busy', 'offline')),
    current_task_id UUID,
    tasks_completed INTEGER DEFAULT 0,
    warnings INTEGER DEFAULT 0,
    violations INTEGER DEFAULT 0,
    average_completion_time_seconds INTEGER DEFAULT 0,
    last_heartbeat TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- JOBS (Scraped from job portals)
-- ============================================
CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    external_id VARCHAR(255),
    title VARCHAR(500) NOT NULL,
    company VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    source VARCHAR(20) NOT NULL CHECK (source IN ('linkedin', 'indeed', 'glassdoor', 'other')),
    category VARCHAR(30) NOT NULL CHECK (category IN ('ai_ml', 'data_science', 'data_analysis', 'bi_analytics', 'software_engineering', 'other')),
    description TEXT,
    url VARCHAR(2000),
    salary_range VARCHAR(100),
    requirements JSONB DEFAULT '[]'::jsonb,
    skills JSONB DEFAULT '[]'::jsonb,
    experience_level VARCHAR(50),
    job_type VARCHAR(50) DEFAULT 'full_time',
    remote_type VARCHAR(50) DEFAULT 'on_site',
    posted_date TIMESTAMP WITH TIME ZONE,
    scraped_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    application_count INTEGER DEFAULT 0,
    UNIQUE(external_id, source)
);

-- ============================================
-- CANDIDATES (Job seekers/resumes)
-- ============================================
CREATE TABLE candidates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),
    resume_url VARCHAR(2000),
    resume_text TEXT,
    skills JSONB DEFAULT '[]'::jsonb,
    experience_years INTEGER,
    education JSONB DEFAULT '[]'::jsonb,
    total_applications INTEGER DEFAULT 0,
    successful_applications INTEGER DEFAULT 0,
    uploaded_by UUID REFERENCES employees(id),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- ATS TASKS (Human-in-the-loop queue)
-- ============================================
CREATE TABLE ats_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE NOT NULL,
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE NOT NULL,
    ats_score DECIMAL(5,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'queued', 'assigned', 'in_progress', 'completed', 'failed', 'timeout')),
    assigned_to UUID REFERENCES employees(id),
    assigned_at TIMESTAMP WITH TIME ZONE,
    due_at TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    old_resume_url VARCHAR(2000),
    new_resume_url VARCHAR(2000),
    missing_keywords JSONB DEFAULT '[]'::jsonb,
    suggestions JSONB DEFAULT '[]'::jsonb,
    notes TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- APPLICATIONS (Submitted to portals)
-- ============================================
CREATE TABLE applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE NOT NULL,
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE NOT NULL,
    task_id UUID REFERENCES ats_tasks(id) ON DELETE SET NULL,
    resume_used_url VARCHAR(2000),
    ats_score_at_submission DECIMAL(5,2),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'failed', 'withdrawn', 'interview', 'rejected', 'accepted')),
    auto_submitted BOOLEAN DEFAULT FALSE,
    submitted_at TIMESTAMP WITH TIME ZONE,
    submission_response JSONB,
    portal_application_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(candidate_id, job_id)
);

-- ============================================
-- EMPLOYEE INCIDENTS (Warnings & Violations)
-- ============================================
CREATE TABLE employee_incidents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('warning', 'violation')),
    reason TEXT NOT NULL,
    task_id UUID REFERENCES ats_tasks(id) ON DELETE SET NULL,
    acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES employees(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- ANALYTICS SNAPSHOTS (Daily aggregations)
-- ============================================
CREATE TABLE analytics_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    snapshot_date DATE UNIQUE NOT NULL,
    total_candidates INTEGER DEFAULT 0,
    total_jobs INTEGER DEFAULT 0,
    jobs_by_category JSONB DEFAULT '{}'::jsonb,
    jobs_by_source JSONB DEFAULT '{}'::jsonb,
    applications_submitted INTEGER DEFAULT 0,
    applications_successful INTEGER DEFAULT 0,
    average_ats_score DECIMAL(5,2),
    tasks_completed INTEGER DEFAULT 0,
    tasks_timeout INTEGER DEFAULT 0,
    average_completion_time INTEGER,
    employee_performance JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- ACTIVITY LOG (Audit trail)
-- ============================================
CREATE TABLE activity_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id UUID REFERENCES employees(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID,
    details JSONB DEFAULT '{}'::jsonb,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

-- Jobs indexes
CREATE INDEX idx_jobs_source ON jobs(source);
CREATE INDEX idx_jobs_category ON jobs(category);
CREATE INDEX idx_jobs_scraped ON jobs(scraped_at DESC);
CREATE INDEX idx_jobs_posted ON jobs(posted_date DESC);
CREATE INDEX idx_jobs_active ON jobs(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_jobs_company ON jobs(company);

-- Tasks indexes
CREATE INDEX idx_tasks_status ON ats_tasks(status);
CREATE INDEX idx_tasks_assigned ON ats_tasks(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX idx_tasks_created ON ats_tasks(created_at DESC);
CREATE INDEX idx_tasks_due ON ats_tasks(due_at) WHERE status IN ('assigned', 'in_progress');

-- Employees indexes
CREATE INDEX idx_employees_status ON employees(status);
CREATE INDEX idx_employees_role ON employees(role);
CREATE INDEX idx_employees_email ON employees(email);

-- Applications indexes
CREATE INDEX idx_applications_status ON applications(status);
CREATE INDEX idx_applications_candidate ON applications(candidate_id);
CREATE INDEX idx_applications_job ON applications(job_id);
CREATE INDEX idx_applications_submitted ON applications(submitted_at DESC);

-- Candidates indexes
CREATE INDEX idx_candidates_email ON candidates(email);
CREATE INDEX idx_candidates_created ON candidates(created_at DESC);

-- Activity log indexes
CREATE INDEX idx_activity_actor ON activity_log(actor_id);
CREATE INDEX idx_activity_entity ON activity_log(entity_type, entity_id);
CREATE INDEX idx_activity_created ON activity_log(created_at DESC);

-- Incidents indexes
CREATE INDEX idx_incidents_employee ON employee_incidents(employee_id);
CREATE INDEX idx_incidents_created ON employee_incidents(created_at DESC);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_employees_updated_at
    BEFORE UPDATE ON employees
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_candidates_updated_at
    BEFORE UPDATE ON candidates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_applications_updated_at
    BEFORE UPDATE ON applications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SEED DATA: Demo Employees
-- ============================================

-- Password: 'password' (bcrypt hash)
INSERT INTO employees (id, email, password_hash, name, role, status, tasks_completed, warnings, violations, average_completion_time_seconds) VALUES
    ('a1111111-1111-1111-1111-111111111111', 'alice.t@company.com', '$2b$10$rIC/M.3C1s9RBW1QJ.VKa.KXW4XA6GYxGIB8h5r5pQ8A0UE5V5Ife', 'Alice Thompson', 'employee', 'available', 45, 0, 0, 480),
    ('b2222222-2222-2222-2222-222222222222', 'bob.m@company.com', '$2b$10$rIC/M.3C1s9RBW1QJ.VKa.KXW4XA6GYxGIB8h5r5pQ8A0UE5V5Ife', 'Bob Martinez', 'manager', 'available', 38, 1, 0, 720),
    ('c3333333-3333-3333-3333-333333333333', 'carol.c@company.com', '$2b$10$rIC/M.3C1s9RBW1QJ.VKa.KXW4XA6GYxGIB8h5r5pQ8A0UE5V5Ife', 'Carol Chen', 'employee', 'available', 52, 0, 0, 420),
    ('d4444444-4444-4444-4444-444444444444', 'david.k@company.com', '$2b$10$rIC/M.3C1s9RBW1QJ.VKa.KXW4XA6GYxGIB8h5r5pQ8A0UE5V5Ife', 'David Kim', 'employee', 'offline', 29, 2, 1, 900),
    ('e5555555-5555-5555-5555-555555555555', 'eva.w@company.com', '$2b$10$rIC/M.3C1s9RBW1QJ.VKa.KXW4XA6GYxGIB8h5r5pQ8A0UE5V5Ife', 'Eva Wilson', 'employee', 'available', 41, 0, 0, 540),
    ('f6666666-6666-6666-6666-666666666666', 'frank.l@company.com', '$2b$10$rIC/M.3C1s9RBW1QJ.VKa.KXW4XA6GYxGIB8h5r5pQ8A0UE5V5Ife', 'Frank Lee', 'employee', 'available', 67, 0, 0, 360),
    ('a7777777-7777-7777-7777-777777777777', 'admin@company.com', '$2b$10$rIC/M.3C1s9RBW1QJ.VKa.KXW4XA6GYxGIB8h5r5pQ8A0UE5V5Ife', 'System Admin', 'admin', 'available', 0, 0, 0, 0);

-- ============================================
-- SEED DATA: Sample Jobs
-- ============================================

INSERT INTO jobs (id, external_id, title, company, location, source, category, description, url, salary_range, posted_date, experience_level, remote_type) VALUES
    ('01111111-1111-1111-1111-111111111111', 'LI-123456', 'Senior Machine Learning Engineer', 'Google', 'Mountain View, CA', 'linkedin', 'ai_ml', 'We are looking for a Senior ML Engineer to join our AI team. You will work on cutting-edge ML models for search and recommendations.', 'https://linkedin.com/jobs/123456', '$180,000 - $250,000', NOW() - INTERVAL '2 days', 'senior', 'hybrid'),
    ('02222222-2222-2222-2222-222222222222', 'IN-789012', 'Data Scientist', 'Meta', 'New York, NY', 'indeed', 'data_science', 'Join our data science team to analyze user behavior and build predictive models. Strong Python and SQL skills required.', 'https://indeed.com/jobs/789012', '$150,000 - $200,000', NOW() - INTERVAL '1 day', 'mid', 'on_site'),
    ('03333333-3333-3333-3333-333333333333', 'GD-345678', 'ML Platform Lead', 'OpenAI', 'San Francisco, CA', 'glassdoor', 'ai_ml', 'Lead our ML infrastructure team. Build scalable systems for training and deploying large language models.', 'https://glassdoor.com/jobs/345678', '$250,000 - $350,000', NOW() - INTERVAL '3 days', 'lead', 'remote'),
    ('04444444-4444-4444-4444-444444444444', 'LI-901234', 'Data Analyst', 'Stripe', 'Remote', 'linkedin', 'data_analysis', 'Analyze payment data to identify trends and optimize business metrics. Experience with SQL and visualization tools required.', 'https://linkedin.com/jobs/901234', '$120,000 - $160,000', NOW() - INTERVAL '1 day', 'mid', 'remote'),
    ('05555555-5555-5555-5555-555555555555', 'IN-567890', 'AI Research Scientist', 'DeepMind', 'London, UK', 'indeed', 'ai_ml', 'Conduct cutting-edge research in reinforcement learning and neural networks. PhD required.', 'https://indeed.com/jobs/567890', '£150,000 - £220,000', NOW() - INTERVAL '4 days', 'senior', 'on_site'),
    ('06666666-6666-6666-6666-666666666666', 'GD-123789', 'BI Developer', 'Snowflake', 'Remote', 'glassdoor', 'bi_analytics', 'Build and maintain business intelligence dashboards. Experience with Tableau or Power BI required.', 'https://glassdoor.com/jobs/123789', '$130,000 - $170,000', NOW() - INTERVAL '2 days', 'mid', 'remote'),
    ('07777777-7777-7777-7777-777777777777', 'LI-456123', 'MLOps Engineer', 'Databricks', 'San Francisco, CA', 'linkedin', 'ai_ml', 'Build and maintain ML pipelines at scale. Experience with Kubernetes, Docker, and MLflow required.', 'https://linkedin.com/jobs/456123', '$170,000 - $220,000', NOW() - INTERVAL '1 day', 'senior', 'hybrid'),
    ('08888888-8888-8888-8888-888888888888', 'IN-789456', 'Data Engineer', 'Airbnb', 'Remote', 'indeed', 'data_analysis', 'Design and build data pipelines for our analytics platform. Strong experience with Spark and Airflow required.', 'https://indeed.com/jobs/789456', '$160,000 - $200,000', NOW() - INTERVAL '3 days', 'senior', 'remote');

-- ============================================
-- SEED DATA: Sample Candidates
-- ============================================

INSERT INTO candidates (id, name, email, phone, resume_url, skills, experience_years, total_applications, successful_applications, uploaded_by) VALUES
    ('c1111111-1111-1111-1111-111111111111', 'John Smith', 'john.smith@email.com', '+1-555-0101', 'https://minio.local:9000/resumes/john_smith_resume.pdf', '["Python", "TensorFlow", "PyTorch", "SQL", "Machine Learning"]'::jsonb, 5, 45, 12, 'a1111111-1111-1111-1111-111111111111'),
    ('c2222222-2222-2222-2222-222222222222', 'Sarah Johnson', 'sarah.j@email.com', '+1-555-0102', 'https://minio.local:9000/resumes/sarah_johnson_cv.pdf', '["R", "Python", "Statistics", "Tableau", "Machine Learning"]'::jsonb, 3, 32, 8, 'a1111111-1111-1111-1111-111111111111'),
    ('c3333333-3333-3333-3333-333333333333', 'Mike Chen', 'mike.chen@email.com', '+1-555-0103', 'https://minio.local:9000/resumes/mike_chen_resume.pdf', '["Python", "Kubernetes", "Docker", "MLOps", "AWS"]'::jsonb, 7, 28, 15, 'b2222222-2222-2222-2222-222222222222'),
    ('c4444444-4444-4444-4444-444444444444', 'Lisa Park', 'lisa.park@email.com', '+1-555-0104', 'https://minio.local:9000/resumes/lisa_park_cv.pdf', '["Deep Learning", "NLP", "PyTorch", "Research", "Python"]'::jsonb, 4, 22, 6, 'c3333333-3333-3333-3333-333333333333'),
    ('c5555555-5555-5555-5555-555555555555', 'Alex Rivera', 'alex.r@email.com', '+1-555-0105', 'https://minio.local:9000/resumes/alex_rivera_resume.pdf', '["SQL", "Power BI", "Tableau", "Data Analysis", "Excel"]'::jsonb, 2, 18, 4, 'e5555555-5555-5555-5555-555555555555');

-- ============================================
-- SEED DATA: Sample ATS Tasks
-- ============================================

INSERT INTO ats_tasks (id, candidate_id, job_id, ats_score, status, assigned_to, assigned_at, due_at, old_resume_url, missing_keywords, suggestions) VALUES
    ('11111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111', '01111111-1111-1111-1111-111111111111', 82.50, 'queued', NULL, NULL, NULL, 'https://minio.local:9000/resumes/john_smith_resume.pdf', '["Kubernetes", "MLOps", "CI/CD"]'::jsonb, '["Add cloud ML deployment experience", "Quantify model performance improvements"]'::jsonb),
    ('22222222-2222-2222-2222-222222222222', 'c2222222-2222-2222-2222-222222222222', '02222222-2222-2222-2222-222222222222', 85.00, 'queued', NULL, NULL, NULL, 'https://minio.local:9000/resumes/sarah_johnson_cv.pdf', '["A/B Testing", "Product Analytics"]'::jsonb, '["Add more specific data science project outcomes"]'::jsonb),
    ('33333333-3333-3333-3333-333333333333', 'c4444444-4444-4444-4444-444444444444', '05555555-5555-5555-5555-555555555555', 78.00, 'queued', NULL, NULL, NULL, 'https://minio.local:9000/resumes/lisa_park_cv.pdf', '["Reinforcement Learning", "Publications"]'::jsonb, '["Highlight research publications", "Add RL project experience"]'::jsonb),
    ('44444444-4444-4444-4444-444444444444', 'c5555555-5555-5555-5555-555555555555', '04444444-4444-4444-4444-444444444444', 88.00, 'completed', 'f6666666-6666-6666-6666-666666666666', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '1 hour 40 minutes', 'https://minio.local:9000/resumes/alex_rivera_resume.pdf', '["Financial Analysis"]'::jsonb, '["Add payment industry experience"]'::jsonb);

-- Update completed task
UPDATE ats_tasks SET completed_at = NOW() - INTERVAL '1 hour 50 minutes', new_resume_url = 'https://minio.local:9000/resumes/alex_rivera_resume_v2.pdf' WHERE id = '44444444-4444-4444-4444-444444444444';

-- ============================================
-- SEED DATA: Sample Applications (Auto-submitted high ATS scores)
-- ============================================

INSERT INTO applications (candidate_id, job_id, resume_used_url, ats_score_at_submission, status, auto_submitted, submitted_at) VALUES
    ('c3333333-3333-3333-3333-333333333333', '07777777-7777-7777-7777-777777777777', 'https://minio.local:9000/resumes/mike_chen_resume.pdf', 95.50, 'submitted', TRUE, NOW() - INTERVAL '1 day'),
    ('c3333333-3333-3333-3333-333333333333', '01111111-1111-1111-1111-111111111111', 'https://minio.local:9000/resumes/mike_chen_resume.pdf', 92.00, 'submitted', TRUE, NOW() - INTERVAL '2 days'),
    ('c1111111-1111-1111-1111-111111111111', '07777777-7777-7777-7777-777777777777', 'https://minio.local:9000/resumes/john_smith_resume.pdf', 91.00, 'submitted', TRUE, NOW() - INTERVAL '1 day');

-- ============================================
-- SEED DATA: Analytics Snapshot
-- ============================================

INSERT INTO analytics_snapshots (snapshot_date, total_candidates, total_jobs, jobs_by_category, jobs_by_source, applications_submitted, applications_successful, average_ats_score, tasks_completed, tasks_timeout, average_completion_time) VALUES
    (CURRENT_DATE - INTERVAL '1 day', 5, 8, '{"ai_ml": 4, "data_science": 1, "data_analysis": 2, "bi_analytics": 1}'::jsonb, '{"linkedin": 3, "indeed": 3, "glassdoor": 2}'::jsonb, 45, 12, 86.50, 23, 2, 540),
    (CURRENT_DATE, 5, 8, '{"ai_ml": 4, "data_science": 1, "data_analysis": 2, "bi_analytics": 1}'::jsonb, '{"linkedin": 3, "indeed": 3, "glassdoor": 2}'::jsonb, 52, 15, 87.25, 28, 1, 510);

-- ============================================
-- SEED DATA: Employee Incidents
-- ============================================

INSERT INTO employee_incidents (employee_id, type, reason, acknowledged) VALUES
    ('d4444444-4444-4444-4444-444444444444', 'warning', 'Task timeout - exceeded 20 minute SLA', TRUE),
    ('d4444444-4444-4444-4444-444444444444', 'warning', 'Task timeout - exceeded 20 minute SLA', TRUE),
    ('d4444444-4444-4444-4444-444444444444', 'violation', 'Third warning reached - violation recorded', FALSE),
    ('b2222222-2222-2222-2222-222222222222', 'warning', 'Task timeout - exceeded 20 minute SLA', TRUE);

-- ============================================
-- Grant permissions (for production, adjust as needed)
-- ============================================

-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO spark;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO spark;
