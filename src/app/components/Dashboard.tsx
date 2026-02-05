import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Users, Briefcase, CheckCircle, TrendingUp, Clock } from 'lucide-react';
import { DashboardStats, Employee, ATSTask } from '../types';
import { SystemDocumentation } from './SystemDocumentation';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from './ui/sheet';
import { Button } from './ui/button';
import { BookOpen } from 'lucide-react';

interface DashboardProps {
  stats: DashboardStats;
  currentEmployee: Employee;
  tasks: ATSTask[];
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export function Dashboard({ stats, currentEmployee, tasks }: DashboardProps) {
  const categoryData = Object.entries(stats.jobsByCategory).map(([name, value]) => ({
    name,
    value
  }));
  const today = new Date().toISOString().split('T')[0];
  const assignedToEmployee = tasks.filter(task => task.assignedTo === currentEmployee.id);
  const assignedToday = assignedToEmployee.filter(task => task.assignedAt?.startsWith(today)).length;
  const submittedToday = assignedToEmployee.filter(task => task.completedAt?.startsWith(today)).length;
  const pendingAssigned = assignedToEmployee.filter(task => task.status === 'assigned' || task.status === 'in-progress').length;
  const isEmployeeView = currentEmployee.role === 'employee';

  const kpis = isEmployeeView
    ? [
        {
          title: 'Assigned Today',
          value: assignedToday,
          icon: Briefcase,
          description: 'Jobs routed to you today'
        },
        {
          title: 'Submissions Today',
          value: submittedToday,
          icon: CheckCircle,
          description: 'Applications sent by you'
        },
        {
          title: 'In Progress',
          value: pendingAssigned,
          icon: Clock,
          description: 'Active tasks in your queue'
        },
        {
          title: 'Avg Completion Time',
          value: `${currentEmployee.averageCompletionTime}m`,
          icon: TrendingUp,
          description: 'Your SLA performance'
        }
      ]
    : [
        {
          title: 'Total Candidates',
          value: stats.totalCandidates,
          icon: Users,
          description: 'Active resumes in pool',
          trend: '+12%'
        },
        {
          title: 'Jobs Found Today',
          value: stats.jobsFoundToday,
          icon: Briefcase,
          description: 'Scraped from 4 portals',
          trend: '+5%'
        },
        {
          title: 'Applications Sent',
          value: stats.applicationsToday,
          icon: CheckCircle,
          description: 'Successfully applied',
          trend: '+8%'
        },
        {
          title: 'Avg. ATS Score',
          value: `${stats.averageATSScore}%`,
          icon: TrendingUp,
          description: 'Resume quality index',
          trend: '+2%'
        }
      ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Dashboard</h1>
        <p className="text-slate-500">
          {isEmployeeView
            ? `Welcome back, ${currentEmployee.name}. Here is your performance today.`
            : 'Real-time overview of the system performance.'}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(kpi => (
          <KPICard
            key={kpi.title}
            title={kpi.title}
            value={kpi.value}
            icon={kpi.icon}
            description={kpi.description}
            trend={kpi.trend}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart */}
        <Card className="lg:col-span-2 border-border shadow-sm">
          <CardHeader>
            <CardTitle>Job Category Distribution</CardTitle>
            <CardDescription>Breakdown of jobs found across market segments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-col gap-2 ml-8">
                {categoryData.map((entry, index) => (
                  <div key={entry.name} className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <span className="text-sm text-slate-600">{entry.name}</span>
                    <span className="text-sm font-medium text-slate-900">({entry.value})</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Task Status */}
        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle>{isEmployeeView ? 'Your Queue' : 'Operational Health'}</CardTitle>
            <CardDescription>
              {isEmployeeView ? 'Assigned tasks and submissions' : 'System queues & status'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                    <Clock className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {isEmployeeView ? 'Assigned to You' : 'Pending Tasks'}
                    </p>
                    <p className="text-xs text-slate-500">
                      {isEmployeeView ? 'Active tasks in your queue' : 'Queue depth'}
                    </p>
                  </div>
                </div>
                <span className="text-xl font-bold text-slate-900">
                  {isEmployeeView ? pendingAssigned : stats.pendingTasks}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                 <div className="flex items-center gap-3">
                  <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                    <CheckCircle className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {isEmployeeView ? 'Submissions Today' : 'Completed'}
                    </p>
                    <p className="text-xs text-slate-500">
                      {isEmployeeView ? 'Applications you submitted' : 'Tasks finished today'}
                    </p>
                  </div>
                </div>
                <span className="text-xl font-bold text-slate-900">
                  {isEmployeeView ? submittedToday : stats.completedTasks}
                </span>
              </div>
            </div>

            <div className="pt-4 border-t border-border">
               <div className={`flex items-center gap-2 p-3 rounded-md text-sm ${isEmployeeView ? 'text-blue-600 bg-blue-50' : 'text-green-600 bg-green-50'}`}>
                <div className={`h-2 w-2 rounded-full animate-pulse ${isEmployeeView ? 'bg-blue-600' : 'bg-green-600'}`}></div>
                <span className="font-medium">
                  {isEmployeeView ? 'You are on track today' : 'All Systems Operational'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-4">
        {/* System Documentation Dialog */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" className="flex-1">
              <BookOpen className="h-4 w-4 mr-2" />
              User Guide & Documentation
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-full sm:max-w-4xl overflow-y-auto">
            <SheetHeader>
              <SheetTitle>System Documentation</SheetTitle>
              <SheetDescription>User guide and system features</SheetDescription>
            </SheetHeader>
            <div className="mt-6">
              <SystemDocumentation />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}

function KPICard({ title, value, icon: Icon, description, trend }: { title: string, value: string | number, icon: any, description: string, trend?: string }) {
  return (
    <Card className="border-border shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline justify-between">
          <div className="text-2xl font-bold tracking-tight">{value}</div>
          {trend && (
            <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
              {trend}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </CardContent>
    </Card>
  )
}
