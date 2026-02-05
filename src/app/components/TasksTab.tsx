import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Alert, AlertDescription } from './ui/alert';
import { Clock, Upload, AlertTriangle, CheckCircle, Timer, FileText, XCircle } from 'lucide-react';
import { ATSTask, Employee } from '../types';
import { toast } from 'sonner';

interface TasksTabProps {
  tasks: ATSTask[];
  currentEmployee: Employee;
  onCompleteTask: (taskId: string, newResumeUrl: string) => void;
  onTaskTimeout: (taskId: string) => void;
}

export function TasksTab({ tasks, currentEmployee, onCompleteTask, onTaskTimeout }: TasksTabProps) {
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [updatedResumeFile, setUpdatedResumeFile] = useState<File | null>(null);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);

  const myTasks = tasks.filter(t => t.assignedTo === currentEmployee.id);
  const currentTask = myTasks.find(t => t.status === 'assigned' || t.status === 'in-progress');

  useEffect(() => {
    if (currentTask && currentTask.dueAt) {
      const interval = setInterval(() => {
        const now = new Date().getTime();
        const due = new Date(currentTask.dueAt!).getTime();
        const remaining = Math.max(0, Math.floor((due - now) / 1000));
        setTimeRemaining(remaining);

        if (remaining === 0) {
          onTaskTimeout(currentTask.id);
          toast.error('Task timeout! You have received a warning.');
          clearInterval(interval);
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [currentTask, onTaskTimeout]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUpdatedResumeFile(e.target.files[0]);
    }
  };

  const handleCompleteTask = () => {
    if (!updatedResumeFile) {
      toast.error('Please upload the updated resume');
      return;
    }

    if (currentTask) {
      const mockUrl = `/mock/updated-resume-${Date.now()}.pdf`;
      onCompleteTask(currentTask.id, mockUrl);
      toast.success('Resume updated and submitted to all jobs!');
      setUpdatedResumeFile(null);
      setIsUploadDialogOpen(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">My Workspace</h1>
        <p className="text-slate-500">Manage your active assignments and queue.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Work Area - Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Current Task Hero Card */}
          {currentTask ? (
            <Card className="border-orange-200 shadow-lg shadow-orange-100/50 bg-gradient-to-br from-white to-orange-50/30 overflow-hidden">
              <div className="h-1.5 w-full bg-orange-500" />
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-orange-600">
                    <Timer className="h-5 w-5 animate-pulse" />
                    <span className="font-semibold tracking-tight">IN PROGRESS</span>
                  </div>
                  <div className="text-2xl font-mono font-bold text-slate-900 bg-white px-3 py-1 rounded border border-slate-200 shadow-sm">
                    {formatTime(timeRemaining)}
                  </div>
                </div>
                <CardTitle className="text-2xl mt-2">{currentTask.candidateName}</CardTitle>
                <CardDescription className="text-base">
                  Applying for <span className="font-medium text-slate-900">{currentTask.jobTitle}</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-slate-600">
                    <span>SLA Timer</span>
                    <span>20:00 limit</span>
                  </div>
                  <Progress 
                    value={((1200 - timeRemaining) / 1200) * 100} 
                    className="h-2 bg-orange-100"
                    // indicatorClassName="bg-orange-500" // Note: Tailwind class for indicator would need separate component or custom CSS, default is primary
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 p-4 bg-white rounded-lg border border-orange-100 shadow-sm">
                  <div>
                    <Label className="text-xs text-slate-500 uppercase tracking-wider">Current Score</Label>
                    <p className="text-3xl font-bold text-slate-900">{currentTask.atsScore}%</p>
                    <p className="text-xs text-red-500 mt-1 font-medium">Below Threshold</p>
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500 uppercase tracking-wider">Target Score</Label>
                    <p className="text-3xl font-bold text-green-600">90%+</p>
                    <p className="text-xs text-slate-400 mt-1">Required to Apply</p>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button variant="outline" className="flex-1 bg-white" asChild>
                    <a href={currentTask.oldResumeUrl} target="_blank" rel="noopener noreferrer">
                      <FileText className="mr-2 h-4 w-4" />
                      View Resume
                    </a>
                  </Button>
                  <Button 
                    className="flex-1 bg-slate-900 hover:bg-slate-800 text-white shadow-md shadow-slate-900/20" 
                    onClick={() => setIsUploadDialogOpen(true)}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Submit Fix
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed border-2 border-slate-200 bg-slate-50/50">
              <CardContent className="flex flex-col items-center justify-center h-[400px] text-center">
                <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle className="h-8 w-8 text-green-500" />
                </div>
                <h3 className="text-xl font-medium text-slate-900">No Active Tasks</h3>
                <p className="text-slate-500 mt-2 max-w-sm">
                  You are currently available. New tasks will be assigned to you automatically when resumes fail the ATS check.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Queue Section */}
          <div className="space-y-4">
            <h3 className="font-medium text-slate-900 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Up Next
            </h3>
            {myTasks.filter(t => t.status === 'pending').length > 0 ? (
               myTasks.filter(t => t.status === 'pending').map(task => (
                <Card key={task.id} className="bg-slate-50 border-slate-200 opacity-75">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-900">{task.candidateName}</p>
                      <p className="text-sm text-slate-500">{task.jobTitle}</p>
                    </div>
                    <Badge variant="outline">Pending</Badge>
                  </CardContent>
                </Card>
              ))
            ) : (
              <p className="text-sm text-slate-500 italic">Your queue is empty.</p>
            )}
          </div>
        </div>

        {/* Sidebar - Right Column */}
        <div className="space-y-6">
          {/* Employee Status */}
          <Card className="border-border shadow-sm">
            <CardHeader className="pb-3 border-b border-border bg-slate-50/50">
              <CardTitle className="text-base font-medium">Performance Metrics</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-6">
              <div className="flex items-center gap-3">
                <div className={`h-3 w-3 rounded-full shadow-sm ring-2 ring-white ${
                  currentEmployee.status === 'available' ? 'bg-green-500' : 
                  currentEmployee.status === 'busy' ? 'bg-amber-500' : 'bg-slate-300'
                }`} />
                <span className="font-medium text-slate-700 capitalize">{currentEmployee.status}</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-slate-500 uppercase">Completed</p>
                  <p className="text-2xl font-bold text-slate-900">{currentEmployee.tasksCompleted}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-slate-500 uppercase">Avg Time</p>
                  <p className="text-2xl font-bold text-slate-900">{currentEmployee.averageCompletionTime}m</p>
                </div>
              </div>

              <div className="pt-4 border-t border-border">
                <div className="flex justify-between items-center mb-2">
                  <p className="text-sm font-medium text-slate-700">Strikes</p>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${currentEmployee.warnings > 0 ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-600'}`}>
                    {currentEmployee.warnings} / 3
                  </span>
                </div>
                <div className="flex gap-1">
                  {[1, 2, 3].map((i) => (
                    <div 
                      key={i} 
                      className={`h-2 flex-1 rounded-full ${
                        i <= currentEmployee.warnings ? 'bg-red-500' : 'bg-slate-100'
                      }`} 
                    />
                  ))}
                </div>
                {currentEmployee.warnings >= 2 && (
                   <p className="text-xs text-red-600 mt-2 flex items-center gap-1">
                     <AlertTriangle className="h-3 w-3" />
                     Approaching violation limit
                   </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Upload Dialog */}
      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Task</DialogTitle>
            <DialogDescription>
              Upload the tailored resume for {currentTask?.candidateName} to submit.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="border-2 border-dashed border-slate-200 rounded-lg p-8 flex flex-col items-center justify-center text-center hover:bg-slate-50 transition-colors cursor-pointer relative">
              <Input
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="h-10 w-10 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                <Upload className="h-5 w-5 text-slate-500" />
              </div>
              <p className="font-medium text-slate-900">Click to upload or drag and drop</p>
              <p className="text-sm text-slate-500 mt-1">PDF or DOCX (Max 5MB)</p>
            </div>
            
            {updatedResumeFile && (
              <div className="flex items-center gap-3 p-3 bg-green-50 text-green-700 rounded-md border border-green-200">
                <CheckCircle className="h-5 w-5 flex-shrink-0" />
                <span className="font-medium text-sm truncate">{updatedResumeFile.name}</span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsUploadDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCompleteTask} disabled={!updatedResumeFile}>
              Submit & Complete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
