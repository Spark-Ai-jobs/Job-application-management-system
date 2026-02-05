import React, { useState, useEffect } from 'react';
import { Toaster } from './components/ui/sonner';
import { LoginPage } from './components/LoginPage';
import { Dashboard } from './components/Dashboard';
import { JobsTab } from './components/JobsTab';
import { CandidatesTab } from './components/CandidatesTab';
import { TasksTab } from './components/TasksTab';
import { EmployeesTab } from './components/EmployeesTab';
import { Layout } from './components/Layout';
import { 
  mockJobs, 
  mockCandidates, 
  mockATSTasks, 
  mockEmployees, 
  mockDashboardStats 
} from './mockData';
import { Job, Candidate, ATSTask, Employee, DashboardStats } from './types';
import { toast } from 'sonner';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);
  const [jobs, setJobs] = useState<Job[]>(mockJobs);
  const [candidates, setCandidates] = useState<Candidate[]>(mockCandidates);
  const [tasks, setTasks] = useState<ATSTask[]>(mockATSTasks);
  const [employees, setEmployees] = useState<Employee[]>(mockEmployees);
  const [stats, setStats] = useState<DashboardStats>(mockDashboardStats);
  const [activeTab, setActiveTab] = useState('dashboard');

  // Simulate job scraping every 30 seconds (in a real app, this would be backend service)
  useEffect(() => {
    if (!isLoggedIn) return;

    const interval = setInterval(() => {
      // Simulate new job being scraped
      const categories = ['AI/ML', 'Data Science', 'Data Analysis', 'BI/Analytics'];
      const sources: Array<'LinkedIn' | 'Indeed' | 'Glassdoor' | 'Other'> = ['LinkedIn', 'Indeed', 'Glassdoor', 'Other'];
      
      // Randomly decide if a new job is found
      if (Math.random() > 0.7) {
        const newJob: Job = {
          id: `job-${Date.now()}`,
          title: `New ${categories[Math.floor(Math.random() * categories.length)]} Position`,
          company: `Company ${Math.floor(Math.random() * 100)}`,
          location: 'Remote',
          source: sources[Math.floor(Math.random() * sources.length)],
          category: categories[Math.floor(Math.random() * categories.length)],
          postedDate: new Date().toISOString().split('T')[0],
          description: 'Exciting opportunity to join our team...',
          url: '#'
        };

        setJobs(prev => [newJob, ...prev]);
        
        // Update stats
        setStats(prev => ({
          ...prev,
          jobsFoundToday: prev.jobsFoundToday + 1,
          jobsByCategory: {
            ...prev.jobsByCategory,
            [newJob.category]: (prev.jobsByCategory[newJob.category] || 0) + 1
          }
        }));

        toast.info(`New job found: ${newJob.title} at ${newJob.company}`);

        // Auto-process ATS for all candidates
        processATSForNewJob(newJob);
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [isLoggedIn, candidates]);

  const processATSForNewJob = (job: Job) => {
    // Simulate ATS scoring for all candidates
    candidates.forEach(candidate => {
      const atsScore = Math.floor(Math.random() * 30) + 70; // Random score between 70-100
      
      if (atsScore < 90) {
        // Create a task for human review
        const newTask: ATSTask = {
          id: `task-${Date.now()}-${candidate.id}`,
          candidateId: candidate.id,
          candidateName: candidate.name,
          jobId: job.id,
          jobTitle: job.title,
          atsScore,
          status: 'pending',
          oldResumeUrl: candidate.resumeUrl
        };

        setTasks(prev => [...prev, newTask]);
        
        // Try to assign to available employee
        assignTaskToAvailableEmployee(newTask);
      } else {
        // Auto-apply if score >= 90%
        toast.success(`Auto-applied: ${candidate.name} to ${job.title} (ATS: ${atsScore}%)`);
        
        // Update candidate applications count
        setCandidates(prev => prev.map(c => 
          c.id === candidate.id 
            ? { ...c, totalApplications: c.totalApplications + 1 }
            : c
        ));

        // Update stats
        setStats(prev => ({
          ...prev,
          applicationsToday: prev.applicationsToday + 1
        }));
      }
    });
  };

  const assignTaskToAvailableEmployee = (task: ATSTask) => {
    const availableEmployee = employees.find(e => e.status === 'available');
    
    if (availableEmployee) {
      const now = new Date();
      const dueAt = new Date(now.getTime() + 20 * 60 * 1000); // 20 minutes from now

      setTasks(prev => prev.map(t => 
        t.id === task.id 
          ? { 
              ...t, 
              status: 'assigned', 
              assignedTo: availableEmployee.id,
              assignedAt: now.toISOString(),
              dueAt: dueAt.toISOString()
            }
          : t
      ));

      setEmployees(prev => prev.map(e => 
        e.id === availableEmployee.id 
          ? { ...e, status: 'busy', currentTask: task.id }
          : e
      ));

      setStats(prev => ({
        ...prev,
        pendingTasks: prev.pendingTasks + 1
      }));

      toast.info(`Task assigned to ${availableEmployee.name}: ${task.candidateName} for ${task.jobTitle}`);
      
      // Play notification sound if this is the current employee
      if (currentEmployee && availableEmployee.id === currentEmployee.id) {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'); // Professional "Ping" sound
        audio.play().catch(e => console.log('Audio play failed', e));
      }
    } else {
      // Add to queue
      setStats(prev => ({
        ...prev,
        pendingTasks: prev.pendingTasks + 1
      }));
      toast.warning('All employees busy. Task added to queue.');
    }
  };

  const handleLogin = (email: string, password: string) => {
    // Simple demo authentication
    const employee = mockEmployees.find(e => e.email === email);
    
    if (employee) {
      setCurrentEmployee(employee);
      setIsLoggedIn(true);
      
      // Update employee status to available
      setEmployees(prev => prev.map(e => 
        e.id === employee.id ? { ...e, status: 'available' } : e
      ));

      toast.success(`Welcome back, ${employee.name}!`);
    } else {
      toast.error('Invalid credentials');
    }
  };

  const handleLogout = () => {
    if (currentEmployee) {
      // Set employee to offline
      setEmployees(prev => prev.map(e => 
        e.id === currentEmployee.id ? { ...e, status: 'offline' } : e
      ));
    }
    
    setIsLoggedIn(false);
    setCurrentEmployee(null);
    toast.info('Logged out successfully');
  };

  const handleAddCandidate = (candidate: Omit<Candidate, 'id' | 'uploadedDate' | 'totalApplications'>) => {
    const newCandidate: Candidate = {
      ...candidate,
      id: `candidate-${Date.now()}`,
      uploadedDate: new Date().toISOString().split('T')[0],
      totalApplications: 0
    };

    setCandidates(prev => [...prev, newCandidate]);
    setStats(prev => ({
      ...prev,
      totalCandidates: prev.totalCandidates + 1
    }));

    // Start processing existing jobs for this candidate
    jobs.forEach(job => {
      const atsScore = Math.floor(Math.random() * 30) + 70;
      if (atsScore < 90) {
        const newTask: ATSTask = {
          id: `task-${Date.now()}-${newCandidate.id}`,
          candidateId: newCandidate.id,
          candidateName: newCandidate.name,
          jobId: job.id,
          jobTitle: job.title,
          atsScore,
          status: 'pending',
          oldResumeUrl: newCandidate.resumeUrl
        };
        setTasks(prev => [...prev, newTask]);
        assignTaskToAvailableEmployee(newTask);
      }
    });
  };

  const handleDeleteCandidate = (id: string) => {
    setCandidates(prev => prev.filter(c => c.id !== id));
    setStats(prev => ({
      ...prev,
      totalCandidates: prev.totalCandidates - 1
    }));
    // Also remove related tasks
    setTasks(prev => prev.filter(t => t.candidateId !== id));
  };

  const handleCompleteTask = (taskId: string, newResumeUrl: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    // Mark task as completed
    setTasks(prev => prev.map(t => 
      t.id === taskId 
        ? { 
            ...t, 
            status: 'completed', 
            completedAt: new Date().toISOString(),
            newResumeUrl 
          }
        : t
    ));

    // Update employee status
    if (currentEmployee) {
      setEmployees(prev => prev.map(e => 
        e.id === currentEmployee.id 
          ? { 
              ...e, 
              status: 'available', 
              currentTask: undefined,
              tasksCompleted: e.tasksCompleted + 1
            }
          : e
      ));

      // Check if there are pending tasks to assign
      const pendingTask = tasks.find(t => t.status === 'pending');
      if (pendingTask) {
        setTimeout(() => assignTaskToAvailableEmployee(pendingTask), 1000);
      }
    }

    // Update candidate's resume URL and application count
    setCandidates(prev => prev.map(c => 
      c.id === task.candidateId 
        ? { 
            ...c, 
            resumeUrl: newResumeUrl,
            totalApplications: c.totalApplications + 1
          }
        : c
    ));

    // Update stats
    setStats(prev => ({
      ...prev,
      completedTasks: prev.completedTasks + 1,
      pendingTasks: Math.max(0, prev.pendingTasks - 1),
      applicationsToday: prev.applicationsToday + 1
    }));
  };

  const handleTaskTimeout = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task || !currentEmployee) return;

    // Add warning to employee
    setEmployees(prev => prev.map(e => {
      if (e.id === currentEmployee.id) {
        const newWarnings = e.warnings + 1;
        const newViolations = newWarnings > 3 ? e.violations + 1 : e.violations;
        
        return {
          ...e,
          warnings: newWarnings,
          violations: newViolations
        };
      }
      return e;
    }));

    // Reassign task to another available employee or back to queue
    setTasks(prev => prev.map(t => 
      t.id === taskId 
        ? { ...t, status: 'pending', assignedTo: undefined }
        : t
    ));

    setEmployees(prev => prev.map(e => 
      e.id === currentEmployee.id 
        ? { ...e, status: 'available', currentTask: undefined }
        : e
    ));

    // Try to reassign
    const updatedTask = { ...task, status: 'pending' as const };
    setTimeout(() => assignTaskToAvailableEmployee(updatedTask), 1000);
  };

  if (!isLoggedIn || !currentEmployee) {
    return (
      <>
        <LoginPage onLogin={handleLogin} />
        <Toaster />
      </>
    );
  }

  return (
    <>
      <Layout 
        activeTab={activeTab} 
        onTabChange={setActiveTab}
        currentEmployee={currentEmployee}
        onLogout={handleLogout}
      >
        {activeTab === 'dashboard' && (
          <Dashboard stats={stats} currentEmployee={currentEmployee} tasks={tasks} />
        )}
        {activeTab === 'jobs' && <JobsTab jobs={jobs} />}
        {activeTab === 'candidates' && (
          <CandidatesTab 
            candidates={candidates}
            onAddCandidate={handleAddCandidate}
            onDeleteCandidate={handleDeleteCandidate}
          />
        )}
        {activeTab === 'tasks' && (
          <TasksTab 
            tasks={tasks}
            currentEmployee={currentEmployee}
            onCompleteTask={handleCompleteTask}
            onTaskTimeout={handleTaskTimeout}
          />
        )}
        {activeTab === 'team' && (currentEmployee.role === 'manager' || currentEmployee.role === 'admin') && <EmployeesTab employees={employees} tasks={tasks} />}
        {activeTab === 'settings' && (
          <div className="space-y-6 animate-in fade-in duration-500 p-6">
             <div className="flex flex-col gap-1">
                <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Settings</h1>
                <p className="text-slate-500">Manage your account preferences and application settings.</p>
              </div>
              
              <div className="grid gap-6 max-w-2xl">
                 <div className="p-6 bg-white rounded-lg border border-border shadow-sm">
                    <h3 className="text-lg font-medium mb-4">Account</h3>
                    <div className="space-y-4">
                       <div className="grid gap-2">
                          <label className="text-sm font-medium">Name</label>
                          <input type="text" disabled value={currentEmployee.name} className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm cursor-not-allowed opacity-50" />
                       </div>
                       <div className="grid gap-2">
                          <label className="text-sm font-medium">Email</label>
                          <input type="email" disabled value={currentEmployee.email} className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm cursor-not-allowed opacity-50" />
                       </div>
                       <div className="grid gap-2">
                          <label className="text-sm font-medium">Role</label>
                          <input type="text" disabled value={currentEmployee.role} className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm cursor-not-allowed opacity-50 uppercase" />
                       </div>
                    </div>
                 </div>

                 <div className="p-6 bg-white rounded-lg border border-border shadow-sm">
                    <h3 className="text-lg font-medium mb-4 text-red-600">Danger Zone</h3>
                    <button 
                      onClick={handleLogout}
                      className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-red-600 text-white hover:bg-red-700 h-10 px-4 py-2 w-full sm:w-auto"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign out of {currentEmployee.email}
                    </button>
                 </div>
              </div>
          </div>
        )}
      </Layout>
      <Toaster />
    </>
  );
}

export default App;
