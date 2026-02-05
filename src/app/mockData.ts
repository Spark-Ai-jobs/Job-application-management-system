// Mock data for demonstration

import { Job, Candidate, ATSTask, Employee, DashboardStats } from './types';

export const mockJobs: Job[] = [
  {
    id: 'job-1',
    title: 'Senior Machine Learning Engineer',
    company: 'TechCorp AI',
    location: 'San Francisco, CA',
    source: 'LinkedIn',
    category: 'AI/ML',
    postedDate: '2026-02-04',
    description: 'Looking for an experienced ML engineer to build next-gen AI models...',
    url: '#'
  },
  {
    id: 'job-2',
    title: 'Data Scientist',
    company: 'DataMetrics Inc',
    location: 'New York, NY',
    source: 'Indeed',
    category: 'Data Science',
    postedDate: '2026-02-04',
    description: 'Join our data science team to extract insights from big data...',
    url: '#'
  },
  {
    id: 'job-3',
    title: 'AI Research Scientist',
    company: 'Innovation Labs',
    location: 'Boston, MA',
    source: 'Glassdoor',
    category: 'AI/ML',
    postedDate: '2026-02-04',
    description: 'Research and develop cutting-edge AI algorithms...',
    url: '#'
  },
  {
    id: 'job-4',
    title: 'Machine Learning Engineer',
    company: 'CloudTech Solutions',
    location: 'Seattle, WA',
    source: 'LinkedIn',
    category: 'AI/ML',
    postedDate: '2026-02-04',
    description: 'Build scalable ML pipelines for production systems...',
    url: '#'
  },
  {
    id: 'job-5',
    title: 'Senior Data Analyst',
    company: 'Finance Plus',
    location: 'Chicago, IL',
    source: 'Indeed',
    category: 'Data Analysis',
    postedDate: '2026-02-04',
    description: 'Analyze financial data to drive business decisions...',
    url: '#'
  },
  {
    id: 'job-6',
    title: 'Deep Learning Engineer',
    company: 'NeuralNet Corp',
    location: 'Austin, TX',
    source: 'LinkedIn',
    category: 'AI/ML',
    postedDate: '2026-02-04',
    description: 'Work on state-of-the-art deep learning models...',
    url: '#'
  },
  {
    id: 'job-7',
    title: 'Data Scientist - Healthcare',
    company: 'MedData Solutions',
    location: 'Remote',
    source: 'Glassdoor',
    category: 'Data Science',
    postedDate: '2026-02-04',
    description: 'Apply data science to improve healthcare outcomes...',
    url: '#'
  },
  {
    id: 'job-8',
    title: 'Business Intelligence Developer',
    company: 'RetailTech',
    location: 'Los Angeles, CA',
    source: 'Indeed',
    category: 'BI/Analytics',
    postedDate: '2026-02-04',
    description: 'Build dashboards and analytics tools for business insights...',
    url: '#'
  }
];

export const mockCandidates: Candidate[] = [
  {
    id: 'candidate-1',
    name: 'John Smith',
    email: 'john.smith@email.com',
    resumeUrl: '/mock/resume-john-smith.pdf',
    uploadedDate: '2026-02-01',
    totalApplications: 45
  },
  {
    id: 'candidate-2',
    name: 'Sarah Johnson',
    email: 'sarah.j@email.com',
    resumeUrl: '/mock/resume-sarah-johnson.pdf',
    uploadedDate: '2026-02-01',
    totalApplications: 38
  },
  {
    id: 'candidate-3',
    name: 'Michael Chen',
    email: 'mchen@email.com',
    resumeUrl: '/mock/resume-michael-chen.pdf',
    uploadedDate: '2026-02-02',
    totalApplications: 52
  },
  {
    id: 'candidate-4',
    name: 'Emily Rodriguez',
    email: 'emily.r@email.com',
    resumeUrl: '/mock/resume-emily-rodriguez.pdf',
    uploadedDate: '2026-02-03',
    totalApplications: 41
  },
  {
    id: 'candidate-5',
    name: 'David Kim',
    email: 'david.kim@email.com',
    resumeUrl: '/mock/resume-david-kim.pdf',
    uploadedDate: '2026-02-03',
    totalApplications: 29
  }
];

export const mockATSTasks: ATSTask[] = [
  {
    id: 'task-1',
    candidateId: 'candidate-1',
    candidateName: 'John Smith',
    jobId: 'job-1',
    jobTitle: 'Senior Machine Learning Engineer',
    atsScore: 87,
    status: 'assigned',
    assignedTo: 'emp-1',
    assignedAt: '2026-02-04T10:30:00Z',
    dueAt: '2026-02-04T10:50:00Z',
    oldResumeUrl: '/mock/resume-john-smith.pdf'
  },
  {
    id: 'task-2',
    candidateId: 'candidate-3',
    candidateName: 'Michael Chen',
    jobId: 'job-3',
    jobTitle: 'AI Research Scientist',
    atsScore: 85,
    status: 'pending',
    oldResumeUrl: '/mock/resume-michael-chen.pdf'
  },
  {
    id: 'task-3',
    candidateId: 'candidate-4',
    candidateName: 'Emily Rodriguez',
    jobId: 'job-2',
    jobTitle: 'Data Scientist',
    atsScore: 88,
    status: 'pending',
    oldResumeUrl: '/mock/resume-emily-rodriguez.pdf'
  },
  {
    id: 'task-4',
    candidateId: 'candidate-2',
    candidateName: 'Sarah Johnson',
    jobId: 'job-4',
    jobTitle: 'Machine Learning Engineer',
    atsScore: 89,
    status: 'completed',
    assignedTo: 'emp-2',
    assignedAt: '2026-02-04T09:00:00Z',
    completedAt: '2026-02-04T09:12:00Z',
    oldResumeUrl: '/mock/resume-sarah-johnson.pdf',
    newResumeUrl: '/mock/updated-resume-sarah-johnson.pdf'
  },
  {
    id: 'task-5',
    candidateId: 'candidate-5',
    candidateName: 'David Kim',
    jobId: 'job-5',
    jobTitle: 'Senior Data Analyst',
    atsScore: 84,
    status: 'assigned',
    assignedTo: 'emp-3',
    assignedAt: '2026-02-04T11:10:00Z',
    dueAt: '2026-02-04T11:30:00Z',
    oldResumeUrl: '/mock/resume-david-kim.pdf'
  }
];

export const mockEmployees: Employee[] = [
  {
    id: 'emp-1',
    name: 'Alice Thompson',
    email: 'alice.t@company.com',
    status: 'busy',
    currentTask: 'task-1',
    tasksCompleted: 34,
    warnings: 1,
    violations: 0,
    averageCompletionTime: 16,
    role: 'employee'
  },
  {
    id: 'emp-2',
    name: 'Bob Martinez',
    email: 'bob.m@company.com',
    status: 'available',
    tasksCompleted: 28,
    warnings: 0,
    violations: 0,
    averageCompletionTime: 14,
    role: 'manager'
  },
  {
    id: 'emp-3',
    name: 'Carol White',
    email: 'carol.w@company.com',
    status: 'available',
    tasksCompleted: 42,
    warnings: 2,
    violations: 0,
    averageCompletionTime: 18,
    role: 'employee'
  },
  {
    id: 'emp-4',
    name: 'Daniel Brown',
    email: 'daniel.b@company.com',
    status: 'offline',
    tasksCompleted: 31,
    warnings: 3,
    violations: 1,
    averageCompletionTime: 22,
    role: 'employee'
  },
  {
    id: 'emp-5',
    name: 'Emma Davis',
    email: 'emma.d@company.com',
    status: 'available',
    tasksCompleted: 39,
    warnings: 0,
    violations: 0,
    averageCompletionTime: 13,
    role: 'manager'
  }
];

export const mockDashboardStats: DashboardStats = {
  totalCandidates: 5,
  jobsFoundToday: 8,
  jobsByCategory: {
    'AI/ML': 4,
    'Data Science': 2,
    'Data Analysis': 1,
    'BI/Analytics': 1
  },
  applicationsToday: 32,
  pendingTasks: 2,
  completedTasks: 15,
  averageATSScore: 92.5
};
