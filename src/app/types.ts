// Types for the Job Application Management System

export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  source: 'LinkedIn' | 'Indeed' | 'Glassdoor' | 'Other';
  category: string;
  postedDate: string;
  description: string;
  url: string;
}

export interface Candidate {
  id: string;
  name: string;
  email: string;
  resumeUrl: string;
  uploadedDate: string;
  totalApplications: number;
}

export interface ATSTask {
  id: string;
  candidateId: string;
  candidateName: string;
  jobId: string;
  jobTitle: string;
  atsScore: number;
  status: 'pending' | 'assigned' | 'in-progress' | 'completed' | 'failed';
  assignedTo?: string;
  assignedAt?: string;
  dueAt?: string;
  completedAt?: string;
  oldResumeUrl: string;
  newResumeUrl?: string;
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  status: 'available' | 'busy' | 'offline';
  currentTask?: string;
  tasksCompleted: number;
  warnings: number;
  violations: number;
  averageCompletionTime: number; // in minutes
  role: 'admin' | 'employee' | 'manager';
}

export interface DashboardStats {
  totalCandidates: number;
  jobsFoundToday: number;
  jobsByCategory: { [key: string]: number };
  applicationsToday: number;
  pendingTasks: number;
  completedTasks: number;
  averageATSScore: number;
}
